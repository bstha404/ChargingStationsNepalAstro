import { useDeferredValue, useEffect, useMemo, useState } from "react";
import { Search, X, Compass, SlidersHorizontal, ArrowUpDown, MapPin, Navigation } from "lucide-react";
import type { Station } from "../lib/stations";
import {
  formatDistance,
  formatLocationLine,
  getDistanceKm,
  getRelevanceScore,
  stationSlug,
} from "../lib/stations";
import { normalizePlugKind } from "../lib/plugs";
import { requestUserPosition } from "../lib/location";
import {
  STATION_BRANDS,
  detectStationBrand,
  normalizeProvince,
  type StationBrandId,
} from "../lib/brands";

type SortMode = "city" | "nearest" | "name" | "relevance";
type ChargerFilter = "all" | "AC" | "DC";
type LocationStatus = "idle" | "loading" | "granted" | "denied" | "location_off";

type Props = {
  stations: Station[];
};

type StationRow = Station & {
  distanceKm: number | null;
  brandId: StationBrandId;
  brandLabel: string;
  provinceLabel: string;
  chargerTypes: Set<"AC" | "DC">;
};

function stationHasCharger(station: Station, type: "AC" | "DC"): boolean {
  return (station.plugs || []).some((p) => (p.type || "").toUpperCase() === type);
}

export default function StationsDirectory({ stations }: Props) {
  const [search, setSearch] = useState("");
  const deferredSearch = useDeferredValue(search);
  const [sortMode, setSortMode] = useState<SortMode>("city");
  const [chargerFilter, setChargerFilter] = useState<ChargerFilter>("all");
  const [cityFilter, setCityFilter] = useState("all");
  const [provinceFilter, setProvinceFilter] = useState("all");
  const [brandFilter, setBrandFilter] = useState<StationBrandId | "all">("all");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [locationStatus, setLocationStatus] = useState<LocationStatus>("idle");

  const enriched = useMemo<StationRow[]>(() => {
    return stations.map((station) => {
      const brand = detectStationBrand(station);
      const lat = Number(station.latitude);
      const lng = Number(station.longitude);
      let distanceKm: number | null = null;
      if (userLocation && !Number.isNaN(lat) && !Number.isNaN(lng)) {
        distanceKm = getDistanceKm(userLocation.lat, userLocation.lng, lat, lng);
      }
      const chargerTypes = new Set<"AC" | "DC">();
      for (const plug of station.plugs || []) {
        const t = (plug.type || "").toUpperCase();
        if (t === "AC" || t === "DC") chargerTypes.add(t);
      }
      return {
        ...station,
        distanceKm,
        brandId: brand.id,
        brandLabel: brand.label,
        provinceLabel: normalizeProvince(station.province),
        chargerTypes,
      };
    });
  }, [stations, userLocation]);

  const cities = useMemo(
    () =>
      [...new Set(enriched.map((s) => s.city).filter(Boolean))].sort((a, b) =>
        a.localeCompare(b),
      ),
    [enriched],
  );

  const provinces = useMemo(
    () =>
      [...new Set(enriched.map((s) => s.provinceLabel).filter(Boolean))].sort((a, b) =>
        a.localeCompare(b),
      ),
    [enriched],
  );

  const brandOptions = useMemo(() => {
    const present = new Set(enriched.map((s) => s.brandId));
    const known = STATION_BRANDS.filter((b) => present.has(b.id)).map((b) => ({
      id: b.id as StationBrandId,
      label: b.label,
    }));
    if (present.has("others")) known.push({ id: "others", label: "Others" });
    return known;
  }, [enriched]);

  const filtered = useMemo(() => {
    const q = deferredSearch.trim().toLowerCase();
    let list = enriched.filter((station) => {
      if (cityFilter !== "all" && station.city !== cityFilter) return false;
      if (provinceFilter !== "all" && station.provinceLabel !== provinceFilter) return false;
      if (brandFilter !== "all" && station.brandId !== brandFilter) return false;
      if (chargerFilter === "AC" && !stationHasCharger(station, "AC")) return false;
      if (chargerFilter === "DC" && !stationHasCharger(station, "DC")) return false;

      if (!q) return true;
      const hay = [
        station.name,
        station.city,
        station.provinceLabel,
        station.address,
        station.vendor,
        station.brandLabel,
        ...(station.plugs || []).flatMap((p) => [p.plug, p.type, p.power]),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return hay.includes(q) || getRelevanceScore(station, q) > 0;
    });

    const mode: SortMode =
      sortMode === "nearest" && !userLocation
        ? q
          ? "relevance"
          : "city"
        : sortMode === "relevance" && !q
          ? "city"
          : sortMode;

    list = list.slice().sort((a, b) => {
      if (mode === "nearest") {
        const da = a.distanceKm ?? Number.POSITIVE_INFINITY;
        const db = b.distanceKm ?? Number.POSITIVE_INFINITY;
        if (da !== db) return da - db;
      }
      if (mode === "relevance" && q) {
        const sa = getRelevanceScore(a, q);
        const sb = getRelevanceScore(b, q);
        if (sa !== sb) return sb - sa;
      }
      if (mode === "name") return a.name.localeCompare(b.name) || a.city.localeCompare(b.city);
      return a.city.localeCompare(b.city) || a.name.localeCompare(b.name);
    });

    return list;
  }, [
    enriched,
    deferredSearch,
    cityFilter,
    provinceFilter,
    brandFilter,
    chargerFilter,
    sortMode,
    userLocation,
  ]);

  const activeFilterCount = [
    cityFilter !== "all",
    provinceFilter !== "all",
    brandFilter !== "all",
    chargerFilter !== "all",
  ].filter(Boolean).length;

  const requestLocation = async () => {
    setLocationStatus("loading");
    const result = await requestUserPosition();
    if (result.ok) {
      setUserLocation(result.coords);
      setLocationStatus("granted");
      setSortMode("nearest");
      return;
    }
    setUserLocation(null);
    setLocationStatus(
      result.reason === "location_off" || result.reason === "timeout" ? "location_off" : "denied",
    );
  };

  useEffect(() => {
    if (deferredSearch.trim() && sortMode === "city") setSortMode("relevance");
  }, [deferredSearch, sortMode]);

  const clearFilters = () => {
    setCityFilter("all");
    setProvinceFilter("all");
    setBrandFilter("all");
    setChargerFilter("all");
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3">
        <div className="relative">
          <Search
            size={18}
            className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-charge"
          />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search station, city, brand, plug type..."
            className="w-full rounded-[14px] border border-line bg-panel py-3 pr-10 pl-11 text-[0.9rem] text-paper outline-none transition-[border-color] focus:border-charge/60"
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch("")}
              className="absolute top-1/2 right-3 -translate-y-1/2 text-muted hover:text-charge"
              aria-label="Clear search"
            >
              <X size={16} />
            </button>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setFiltersOpen((v) => !v)}
            className={`inline-flex items-center gap-1.5 rounded-full border px-3.5 py-2 text-[0.78rem] font-semibold transition-colors ${
              filtersOpen || activeFilterCount > 0
                ? "border-charge bg-charge/15 text-charge"
                : "border-line bg-panel text-muted hover:border-charge/40"
            }`}
          >
            <SlidersHorizontal size={14} />
            Filters
            {activeFilterCount > 0 && (
              <span className="rounded-full bg-charge px-1.5 py-0.5 text-[0.65rem] font-bold text-ink">
                {activeFilterCount}
              </span>
            )}
          </button>

          <div className="inline-flex items-center gap-1.5 rounded-full border border-line bg-panel px-3 py-1.5 text-[0.78rem] text-muted">
            <ArrowUpDown size={14} className="text-charge" />
            <label className="sr-only" htmlFor="stations-sort">
              Sort stations
            </label>
            <select
              id="stations-sort"
              value={sortMode}
              onChange={(e) => {
                const next = e.target.value as SortMode;
                if (next === "nearest" && !userLocation) {
                  void requestLocation();
                  return;
                }
                setSortMode(next);
              }}
              className="max-w-[11rem] cursor-pointer border-0 bg-transparent py-0.5 text-[0.78rem] font-semibold text-paper outline-none"
            >
              <option value="city">Sort by City</option>
              <option value="name">Sort by Name</option>
              <option value="nearest">Sort by Nearest</option>
              {deferredSearch.trim() && <option value="relevance">Best Match</option>}
            </select>
          </div>

          <button
            type="button"
            onClick={() => void requestLocation()}
            className={`inline-flex items-center gap-1.5 rounded-full border px-3.5 py-2 text-[0.78rem] font-semibold transition-colors ${
              locationStatus === "granted"
                ? "border-charge/30 bg-charge/15 text-charge"
                : "border-line bg-panel text-muted hover:border-charge/40"
            }`}
          >
            <Compass
              size={14}
              className={locationStatus === "loading" ? "animate-spin text-charge" : "text-charge"}
            />
            {locationStatus === "loading"
              ? "Locating..."
              : locationStatus === "granted"
                ? "Nearby on"
                : "Use my location"}
          </button>

          {activeFilterCount > 0 && (
            <button
              type="button"
              onClick={clearFilters}
              className="text-[0.75rem] font-semibold text-muted underline-offset-2 hover:text-charge hover:underline"
            >
              Clear filters
            </button>
          )}
        </div>
      </div>

      {filtersOpen && (
        <div className="grid gap-3 rounded-2xl border border-line bg-panel p-4 sm:grid-cols-2 lg:grid-cols-4">
          <label className="flex flex-col gap-1.5">
            <span className="text-[0.7rem] font-semibold tracking-wide text-subtle uppercase">City</span>
            <select
              value={cityFilter}
              onChange={(e) => setCityFilter(e.target.value)}
              className="trip-select rounded-[10px] border border-line bg-ink px-3 py-2 text-sm text-paper outline-none focus:border-charge/60"
            >
              <option value="all">All cities</option>
              {cities.map((city) => (
                <option key={city} value={city}>
                  {city}
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="text-[0.7rem] font-semibold tracking-wide text-subtle uppercase">
              Province
            </span>
            <select
              value={provinceFilter}
              onChange={(e) => setProvinceFilter(e.target.value)}
              className="trip-select rounded-[10px] border border-line bg-ink px-3 py-2 text-sm text-paper outline-none focus:border-charge/60"
            >
              <option value="all">All provinces</option>
              {provinces.map((province) => (
                <option key={province} value={province}>
                  {province}
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="text-[0.7rem] font-semibold tracking-wide text-subtle uppercase">
              Charger type
            </span>
            <select
              value={chargerFilter}
              onChange={(e) => setChargerFilter(e.target.value as ChargerFilter)}
              className="trip-select rounded-[10px] border border-line bg-ink px-3 py-2 text-sm text-paper outline-none focus:border-charge/60"
            >
              <option value="all">All plug types</option>
              <option value="DC">DC chargers</option>
              <option value="AC">AC chargers</option>
            </select>
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="text-[0.7rem] font-semibold tracking-wide text-subtle uppercase">Brand</span>
            <select
              value={brandFilter}
              onChange={(e) => setBrandFilter(e.target.value as StationBrandId | "all")}
              className="trip-select rounded-[10px] border border-line bg-ink px-3 py-2 text-sm text-paper outline-none focus:border-charge/60"
            >
              <option value="all">All brands</option>
              {brandOptions.map((brand) => (
                <option key={brand.id} value={brand.id}>
                  {brand.label}
                </option>
              ))}
            </select>
          </label>
        </div>
      )}

      <div className="flex items-center justify-between gap-3 text-sm text-muted">
        <span>
          <strong className="text-charge">{filtered.length}</strong> station
          {filtered.length !== 1 ? "s" : ""} shown
        </span>
        <span className="text-xs text-subtle">
          {sortMode === "nearest" && userLocation
            ? "Sorted by nearest location"
            : sortMode === "relevance"
              ? "Sorted by best match"
              : sortMode === "name"
                ? "Sorted by name"
                : "Sorted by city"}
        </span>
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-2xl border border-line bg-panel px-5 py-10 text-center text-muted">
          No stations match your search or filters.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((station) => {
            const kinds = [
              ...new Set(
                (station.plugs || [])
                  .map((p) => normalizePlugKind(p.plug || p.icon))
                  .filter((k) => k !== "other"),
              ),
            ];

            return (
              <article
                key={station.uuid || station.id}
                className="flex flex-col rounded-2xl border border-line bg-panel px-4 py-4 transition-colors hover:border-charge/40"
              >
                <div className="mb-2 flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h2 className="text-[0.95rem] leading-snug font-bold text-paper">{station.name}</h2>
                    <div className="mt-1 flex items-start gap-1.5 text-[0.78rem] text-muted">
                      <MapPin size={12} className="mt-0.5 shrink-0 text-charge" />
                      <span>{formatLocationLine(station)}</span>
                    </div>
                  </div>
                  {station.distanceKm != null && (
                    <span className="shrink-0 rounded-full border border-charge/20 bg-charge/15 px-2 py-0.5 text-[0.68rem] font-bold text-charge">
                      {formatDistance(station.distanceKm)}
                    </span>
                  )}
                </div>

                <div className="mt-auto flex flex-wrap gap-1.5 pt-2">
                  <span className="rounded-md border border-line px-2 py-0.5 text-[0.68rem] font-semibold text-muted">
                    {station.brandLabel}
                  </span>
                  {kinds.map((kind) => (
                    <span
                      key={kind}
                      className="rounded-md border border-charge/20 bg-charge/10 px-2 py-0.5 text-[0.68rem] font-semibold text-charge uppercase"
                    >
                      {kind === "ccs2" ? "CCS2" : "GB/T"}
                    </span>
                  ))}
                  {[...station.chargerTypes].map((type) => (
                    <span
                      key={type}
                      className="rounded-md border border-line px-2 py-0.5 text-[0.68rem] font-semibold text-muted"
                    >
                      {type}
                    </span>
                  ))}
                </div>

                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <a
                    href={`https://www.google.com/maps/dir/Current+Location/${encodeURIComponent(
                      (station.name || "EV Station").replace(/\s+/g, "+"),
                    )}/@${station.latitude},${station.longitude}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 rounded-lg bg-charge px-2.5 py-1.5 text-[0.7rem] font-bold text-ink no-underline hover:brightness-110"
                  >
                    <Navigation size={12} />
                    Directions
                  </a>
                  <a
                    href={`/stations/${stationSlug(station)}/`}
                    className="inline-flex items-center rounded-lg border border-line px-2.5 py-1.5 text-[0.7rem] font-semibold text-charge no-underline hover:border-charge/40"
                  >
                    View page →
                  </a>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
