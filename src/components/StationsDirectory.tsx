import { useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import {
  Search,
  X,
  Compass,
  SlidersHorizontal,
  ArrowUpDown,
  ArrowLeftRight,
  MapPin,
  Navigation,
} from "lucide-react";
import type { Station } from "../lib/stations";
import {
  formatDistance,
  formatLocationLine,
  getDistanceKm,
  getRelevanceScore,
  stationSlug,
} from "../lib/stations";
import { normalizePlugKind, type PlugKind } from "../lib/plugs";
import PlugIcon from "./PlugIcon";
import { requestUserPosition, reverseGeocodeLabel } from "../lib/location";
import { useScrollChain } from "../lib/scrollChain";
import {
  STATION_BRANDS,
  detectStationBrand,
  normalizeProvince,
  type StationBrandId,
} from "../lib/brands";

type SortMode = "city" | "nearest" | "name" | "relevance" | "power";
type PlugFilter = "all" | "AC" | "DC" | "ccs2" | "gbt";
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
  plugKinds: Set<PlugKind>;
  maxPowerKw: number;
};

function parsePowerKw(value?: string | null): number {
  if (!value) return 0;
  const match = String(value).replace(",", ".").match(/(\d+(?:\.\d+)?)/);
  return match ? Number(match[1]) : 0;
}

function stationMaxPowerKw(station: Station): number {
  let max = 0;
  for (const plug of station.plugs || []) {
    max = Math.max(max, parsePowerKw(plug.power));
  }
  return max;
}

export default function StationsDirectory({ stations }: Props) {
  const [search, setSearch] = useState("");
  const deferredSearch = useDeferredValue(search);
  const [sortMode, setSortMode] = useState<SortMode>("city");
  const [sortReversed, setSortReversed] = useState(false);
  const [plugFilter, setPlugFilter] = useState<PlugFilter>("all");
  const [cityFilter, setCityFilter] = useState("all");
  const [provinceFilter, setProvinceFilter] = useState("all");
  const [brandFilter, setBrandFilter] = useState<StationBrandId | "all">("all");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [locationStatus, setLocationStatus] = useState<LocationStatus>("idle");
  const [locationName, setLocationName] = useState<string | null>(null);
  const geoAbortRef = useRef<AbortController | null>(null);
  const listScrollRef = useScrollChain<HTMLDivElement>();
  const [urlReady, setUrlReady] = useState(false);
  const [sortToast, setSortToast] = useState<string | null>(null);
  const sortToastTimer = useRef<number | null>(null);

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
      const plugKinds = new Set<PlugKind>();
      for (const plug of station.plugs || []) {
        const t = (plug.type || "").toUpperCase();
        if (t === "AC" || t === "DC") chargerTypes.add(t);
        const kind = normalizePlugKind(plug.plug || plug.icon);
        if (kind !== "other") plugKinds.add(kind);
      }
      return {
        ...station,
        distanceKm,
        brandId: brand.id,
        brandLabel: brand.label,
        provinceLabel: normalizeProvince(station.province),
        chargerTypes,
        plugKinds,
        maxPowerKw: stationMaxPowerKw(station),
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
      if (plugFilter === "AC" && !station.chargerTypes.has("AC")) return false;
      if (plugFilter === "DC" && !station.chargerTypes.has("DC")) return false;
      if (plugFilter === "ccs2" && !station.plugKinds.has("ccs2")) return false;
      if (plugFilter === "gbt" && !station.plugKinds.has("gbt")) return false;

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
      let cmp = 0;
      if (mode === "nearest") {
        const da = a.distanceKm ?? Number.POSITIVE_INFINITY;
        const db = b.distanceKm ?? Number.POSITIVE_INFINITY;
        cmp = da - db;
      } else if (mode === "power") {
        cmp = b.maxPowerKw - a.maxPowerKw;
      } else if (mode === "relevance" && q) {
        cmp = getRelevanceScore(b, q) - getRelevanceScore(a, q);
      } else if (mode === "name") {
        cmp = a.name.localeCompare(b.name) || a.city.localeCompare(b.city);
      } else {
        cmp = a.city.localeCompare(b.city) || a.name.localeCompare(b.name);
      }
      if (cmp === 0) cmp = a.name.localeCompare(b.name);
      return sortReversed ? -cmp : cmp;
    });

    return list;
  }, [
    enriched,
    deferredSearch,
    cityFilter,
    provinceFilter,
    brandFilter,
    plugFilter,
    sortMode,
    sortReversed,
    userLocation,
  ]);

  const activeFilterCount = [
    search.trim() !== "",
    cityFilter !== "all",
    provinceFilter !== "all",
    brandFilter !== "all",
    plugFilter !== "all",
    sortMode !== "city",
    sortReversed,
  ].filter(Boolean).length;

  const resolvePlaceName = async (coords: { lat: number; lng: number }) => {
    geoAbortRef.current?.abort();
    const controller = new AbortController();
    geoAbortRef.current = controller;
    const label = await reverseGeocodeLabel(coords, controller.signal);
    if (!controller.signal.aborted) setLocationName(label);
  };

  const showSortToast = (message: string) => {
    if (sortToastTimer.current) window.clearTimeout(sortToastTimer.current);
    setSortToast(message);
    sortToastTimer.current = window.setTimeout(() => {
      setSortToast(null);
      sortToastTimer.current = null;
    }, 7000);
  };

  const requestLocation = async () => {
    setLocationStatus("loading");
    setLocationName(null);
    const result = await requestUserPosition();
    if (result.ok) {
      setUserLocation(result.coords);
      setLocationStatus("granted");
      setSortMode("nearest");
      setSortReversed(false);
      void resolvePlaceName(result.coords);
      showSortToast("Sorted by Nearest Location");
      return;
    }
    setUserLocation(null);
    setLocationName(null);
    setLocationStatus(
      result.reason === "location_off" || result.reason === "timeout" ? "location_off" : "denied",
    );
    showSortToast(
      search.trim()
        ? "Sorted by Best Match"
        : sortMode === "power"
          ? "Sorted by Power"
          : sortMode === "name"
            ? "Sorted by Name"
            : "Sorted by City",
    );
  };

  useEffect(() => {
    if (deferredSearch.trim() && sortMode === "city") setSortMode("relevance");
  }, [deferredSearch, sortMode]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const q = params.get("q");
    if (q) setSearch(q);

    const city = params.get("city");
    if (city) setCityFilter(city);

    const province = params.get("province");
    if (province) setProvinceFilter(province);

    const brand = params.get("brand");
    const knownBrands = new Set<string>([...STATION_BRANDS.map((b) => b.id), "others"]);
    if (brand && knownBrands.has(brand)) setBrandFilter(brand as StationBrandId);

    const plug = params.get("plug");
    if (plug === "AC" || plug === "DC" || plug === "ccs2" || plug === "gbt") {
      setPlugFilter(plug);
    }

    const sort = params.get("sort");
    if (sort === "city" || sort === "name" || sort === "nearest" || sort === "power" || sort === "relevance") {
      setSortMode(sort);
    }
    if (params.get("reverse") === "1") setSortReversed(true);

    if (city || province || brand || plug) setFiltersOpen(true);
    setUrlReady(true);
  }, []);

  useEffect(() => {
    if (!urlReady) return;
    const params = new URLSearchParams();
    const q = search.trim();
    if (q) params.set("q", q);
    if (cityFilter !== "all") params.set("city", cityFilter);
    if (provinceFilter !== "all") params.set("province", provinceFilter);
    if (brandFilter !== "all") params.set("brand", brandFilter);
    if (plugFilter !== "all") params.set("plug", plugFilter);
    if (sortMode !== "city") params.set("sort", sortMode);
    if (sortReversed) params.set("reverse", "1");

    const qs = params.toString();
    const next = `${window.location.pathname}${qs ? `?${qs}` : ""}${window.location.hash}`;
    const current = `${window.location.pathname}${window.location.search}${window.location.hash}`;
    if (next !== current) window.history.replaceState(null, "", next);
  }, [urlReady, search, cityFilter, provinceFilter, brandFilter, plugFilter, sortMode, sortReversed]);

  useEffect(() => {
    return () => {
      geoAbortRef.current?.abort();
      if (sortToastTimer.current) window.clearTimeout(sortToastTimer.current);
    };
  }, []);

  const clearFilters = () => {
    setSearch("");
    setCityFilter("all");
    setProvinceFilter("all");
    setBrandFilter("all");
    setPlugFilter("all");
    setSortMode("city");
    setSortReversed(false);
  };

  const sortLabel =
    sortMode === "nearest" && userLocation
      ? sortReversed
        ? "Sorted by farthest"
        : "Sorted by nearest location"
      : sortMode === "power"
        ? sortReversed
          ? "Sorted by lowest power"
          : "Sorted by highest power"
        : sortMode === "relevance"
          ? "Sorted by best match"
          : sortMode === "name"
            ? sortReversed
              ? "Sorted by name (Z–A)"
              : "Sorted by name (A–Z)"
            : sortReversed
              ? "Sorted by city (Z–A)"
              : "Sorted by city (A–Z)";

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

        <div className="flex w-full flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setFiltersOpen((v) => !v)}
            className={`inline-flex items-center gap-1.5 rounded-full border px-3.5 py-2 text-[0.78rem] font-semibold transition-colors ${
              filtersOpen || cityFilter !== "all" || provinceFilter !== "all" || brandFilter !== "all" || plugFilter !== "all"
                ? "border-charge bg-charge/15 text-charge"
                : "border-line bg-panel text-muted hover:border-charge/40"
            }`}
          >
            <SlidersHorizontal size={14} />
            Filters
            {(cityFilter !== "all" || provinceFilter !== "all" || brandFilter !== "all" || plugFilter !== "all") && (
              <span className="rounded-full bg-charge px-1.5 py-0.5 text-[0.65rem] font-bold text-ink">
                {[cityFilter !== "all", provinceFilter !== "all", brandFilter !== "all", plugFilter !== "all"].filter(Boolean).length}
              </span>
            )}
          </button>

          <div className="inline-flex items-center gap-1 rounded-full border border-line bg-panel py-1 pr-1 pl-3 text-[0.78rem] text-muted">
            <ArrowUpDown size={14} className="text-charge" />
            <label className="sr-only" htmlFor="stations-sort">
              Sort stations
            </label>
            <select
              id="stations-sort"
              value={sortMode}
              onChange={(e) => {
                const next = e.target.value as SortMode;
                setSortReversed(false);
                if (next === "nearest" && !userLocation) {
                  void requestLocation();
                  return;
                }
                setSortMode(next);
                showSortToast(
                  next === "nearest"
                    ? "Sorted by Nearest Location"
                    : next === "power"
                      ? "Sorted by Power"
                      : next === "name"
                        ? "Sorted by Name"
                        : next === "relevance"
                          ? "Sorted by Best Match"
                          : "Sorted by City",
                );
              }}
              className="max-w-[11rem] cursor-pointer border-0 bg-transparent py-0.5 text-[0.78rem] font-semibold text-paper outline-none"
            >
              <option value="city">Sort by City</option>
              <option value="name">Sort by Name</option>
              <option value="nearest">Sort by Nearest</option>
              <option value="power">Sort by Power</option>
              {deferredSearch.trim() && <option value="relevance">Best Match</option>}
            </select>
            <button
              type="button"
              onClick={() => setSortReversed((v) => !v)}
              className={`inline-flex h-8 w-8 items-center justify-center rounded-full border transition-colors ${
                sortReversed
                  ? "border-charge bg-charge/15 text-charge"
                  : "border-transparent text-muted hover:border-line hover:text-charge"
              }`}
              aria-label={sortReversed ? "Use normal sort order" : "Reverse sort order"}
              title={sortReversed ? "Normal order" : "Reverse order"}
            >
              <ArrowLeftRight size={15} />
            </button>
          </div>

          {locationStatus === "granted" && userLocation ? (
            <div
              className="inline-flex max-w-full items-center gap-1.5 rounded-full border border-charge/30 bg-charge/15 px-3.5 py-2 text-[0.78rem] font-semibold text-charge"
              title={locationName || "Your location is active for nearby sorting"}
            >
              <MapPin size={14} className="shrink-0" />
              <span className="truncate">{locationName || "Locating area…"}</span>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => void requestLocation()}
              className="inline-flex items-center gap-1.5 rounded-full border border-line bg-panel px-3.5 py-2 text-[0.78rem] font-semibold text-muted transition-colors hover:border-charge/40"
            >
              <Compass
                size={14}
                className={locationStatus === "loading" ? "animate-spin text-charge" : "text-charge"}
              />
              {locationStatus === "loading" ? "Locating..." : "Use my location"}
            </button>
          )}

          {activeFilterCount > 0 && (
            <button
              type="button"
              onClick={clearFilters}
              className="ml-auto inline-flex items-center gap-1.5 rounded-full border border-line bg-panel px-3.5 py-2 text-[0.78rem] font-semibold text-muted transition-colors hover:border-charge/40 hover:text-charge"
            >
              <X size={14} />
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
              Plug type
            </span>
            <select
              value={plugFilter}
              onChange={(e) => setPlugFilter(e.target.value as PlugFilter)}
              className="trip-select rounded-[10px] border border-line bg-ink px-3 py-2 text-sm text-paper outline-none focus:border-charge/60"
            >
              <option value="all">All plug types</option>
              <option value="DC">DC chargers</option>
              <option value="AC">AC chargers</option>
              <option value="ccs2">CCS2</option>
              <option value="gbt">GB/T</option>
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
        <span className="text-xs text-subtle">{sortLabel}</span>
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-2xl border border-line bg-panel px-5 py-10 text-center text-muted">
          No stations match your search or filters.
        </div>
      ) : (
        <div
          ref={listScrollRef}
          className="max-h-[min(70vh,720px)] overflow-y-auto overscroll-y-auto rounded-2xl border border-line bg-ink/30 p-3 pr-2 sm:max-h-[min(75vh,820px)]"
        >
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((station) => {
            const kinds = [...station.plugKinds];

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
                  {station.maxPowerKw > 0 && (
                    <span className="rounded-md border border-line px-2 py-0.5 text-[0.68rem] font-semibold text-muted">
                      {station.maxPowerKw} kW
                    </span>
                  )}
                  {kinds.map((kind) => (
                    <span
                      key={kind}
                      className="inline-flex items-center gap-1 rounded-md border border-charge/20 bg-charge/10 px-2 py-0.5 text-[0.68rem] font-semibold text-charge uppercase"
                    >
                      <PlugIcon kind={kind} size={14} />
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
        </div>
      )}

      {sortToast && (
        <div
          className="pointer-events-none fixed inset-x-0 top-[max(4.75rem,calc(env(safe-area-inset-top)+3.5rem))] z-[80] flex justify-center px-4"
          role="status"
          aria-live="polite"
        >
          <div className="rounded-full border border-charge/30 bg-panel px-4 py-2.5 text-sm font-semibold text-charge shadow-lg">
            {sortToast}
          </div>
        </div>
      )}
    </div>
  );
}
