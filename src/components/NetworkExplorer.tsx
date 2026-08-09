import React, { Suspense, useDeferredValue, useEffect, useMemo, useState } from "react";
import { Search, MapPin, Phone, X, Compass } from "lucide-react";
import type { Station, StationWithDistance } from "../lib/stations";
import {
  formatDistance,
  getDistanceKm,
  getRelevanceScore,
  stationSlug,
} from "../lib/stations";

const EVMap = React.lazy(() => import("./EVMap"));

type Props = {
  stations: Station[];
  initialCity?: string;
};

export default function NetworkExplorer({ stations, initialCity = "" }: Props) {
  const [search, setSearch] = useState(initialCity);
  const [filterPlugType, setFilterPlugType] = useState<"all" | "AC" | "DC">("all");
  const [selectedStation, setSelectedStation] = useState<Station | null>(null);
  const [displayCount, setDisplayCount] = useState(50);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [locationStatus, setLocationStatus] = useState<"prompt" | "granted" | "denied" | "loading">(
    "prompt"
  );

  const deferredSearch = useDeferredValue(search);

  useEffect(() => {
    const q = new URLSearchParams(window.location.search).get("q");
    if (q) setSearch(q);
  }, []);

  const requestLocation = () => {
    if (!("geolocation" in navigator)) {
      setLocationStatus("denied");
      return;
    }
    setLocationStatus("loading");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUserLocation({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        });
        setLocationStatus("granted");
      },
      () => setLocationStatus("denied"),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 300000 }
    );
  };

  useEffect(() => {
    requestLocation();
  }, []);

  const stationsWithMeta: StationWithDistance[] = useMemo(() => {
    return stations.map((station) => {
      const lat = Number(station.latitude);
      const lng = Number(station.longitude);
      let distanceKm: number | null = null;
      if (userLocation && !Number.isNaN(lat) && !Number.isNaN(lng)) {
        distanceKm = getDistanceKm(userLocation.lat, userLocation.lng, lat, lng);
      }
      return { ...station, distanceKm };
    });
  }, [stations, userLocation]);

  const filteredStations = useMemo(() => {
    const query = deferredSearch.trim().toLowerCase();
    let result = stationsWithMeta;

    if (filterPlugType !== "all") {
      result = result.filter((station) =>
        station.plugs?.some((p) => p.type?.toUpperCase() === filterPlugType)
      );
    }

    if (query) {
      const scored = result
        .map((station) => ({
          station,
          score: getRelevanceScore(station, query),
        }))
        .filter((item) => item.score > 0);

      scored.sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score;
        if (a.station.distanceKm !== null && b.station.distanceKm !== null) {
          return a.station.distanceKm - b.station.distanceKm;
        }
        return (
          a.station.city.localeCompare(b.station.city) ||
          a.station.name.localeCompare(b.station.name)
        );
      });

      return scored.map((item) => item.station);
    }

    return [...result].sort((a, b) => {
      if (a.distanceKm !== null && b.distanceKm !== null) {
        return a.distanceKm - b.distanceKm;
      }
      return a.city.localeCompare(b.city) || a.name.localeCompare(b.name);
    });
  }, [deferredSearch, filterPlugType, stationsWithMeta]);

  const visibleStations = useMemo(
    () => filteredStations.slice(0, displayCount),
    [filteredStations, displayCount]
  );

  return (
    <section className="mx-auto max-w-[1280px] px-6 pb-20 pt-8">
      <div className="mb-8">
        <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-[#8EE36A]/20 bg-[#8EE36A]/10 px-3.5 py-1.5">
          <span className="text-xs font-semibold tracking-[0.04em] text-[#8EE36A] uppercase">
            EV Charging Network
          </span>
        </div>
        <h1 className="font-display mb-3 text-[clamp(2rem,4vw,3.4rem)] font-extrabold tracking-[-0.04em] text-[#F8FAF8]">
          Find Your Nearest <span className="text-gradient-green">Charging Station</span>
        </h1>
        <p className="max-w-xl text-base leading-relaxed text-[#B8C1BC]">
          Browse and search EV charging stations across Nepal. Filter by plug type, sort by
          nearest location, and open directions instantly.
        </p>
      </div>

      <div className="mb-7 flex flex-wrap items-center gap-3">
        <div className="relative min-w-[260px] flex-1">
          <Search
            size={18}
            color="#8EE36A"
            className="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2"
          />
          <input
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setDisplayCount(50);
            }}
            placeholder="Search station name, city, address, plug type..."
            className="w-full rounded-[14px] border border-[#2A2F2D] bg-[#171A19] py-3 pr-11 pl-11 text-[0.9rem] text-[#F8FAF8] outline-none transition-[border-color] focus:border-[#8EE36A]/60"
          />
          {search && (
            <button
              onClick={() => {
                setSearch("");
                setDisplayCount(50);
              }}
              className="absolute top-1/2 right-3.5 flex -translate-y-1/2 items-center border-0 bg-transparent text-[#B8C1BC]"
              aria-label="Clear search"
            >
              <X size={16} />
            </button>
          )}
        </div>

        {locationStatus === "granted" && userLocation ? (
          <div className="flex items-center gap-1.5 rounded-full border border-[#8EE36A]/30 bg-[#8EE36A]/15 px-4 py-2.5 text-[0.8rem] font-semibold text-[#8EE36A]">
            <Compass size={14} />
            <span>Nearby Enabled</span>
          </div>
        ) : locationStatus === "loading" ? (
          <div className="flex items-center gap-1.5 rounded-full border border-[#2A2F2D] bg-[#2A2F2D]/60 px-4 py-2.5 text-[0.8rem] font-medium text-[#B8C1BC]">
            <Compass size={14} className="animate-spin" />
            <span>Locating...</span>
          </div>
        ) : (
          <button
            onClick={requestLocation}
            className="flex items-center gap-1.5 rounded-full border border-[#2A2F2D] bg-[#171A19] px-4 py-2.5 text-[0.8rem] font-semibold text-[#B8C1BC] transition-colors hover:border-[#8EE36A]/40"
          >
            <Compass size={14} color="#8EE36A" />
            <span>Use My Location</span>
          </button>
        )}

        <div className="flex gap-2">
          {(["all", "DC", "AC"] as const).map((type) => (
            <button
              key={type}
              onClick={() => {
                setFilterPlugType(type);
                setDisplayCount(50);
              }}
              className={`rounded-full px-5 py-2.5 text-[0.82rem] font-semibold transition-all ${
                filterPlugType === type
                  ? "border border-[#8EE36A] bg-[#8EE36A]/15 text-[#8EE36A]"
                  : "border border-[#2A2F2D] bg-[#171A19] text-[#B8C1BC]"
              }`}
            >
              {type === "all" ? "All Plug Types" : `${type} Chargers`}
            </button>
          ))}
        </div>
      </div>

      <div className="network-page-grid grid grid-cols-1 gap-6 lg:grid-cols-[1fr_380px]">
        <div className="sticky top-[90px] h-[350px] min-h-[350px] overflow-hidden rounded-3xl border border-[#2A2F2D] lg:h-[calc(100vh-160px)] lg:min-h-[480px]">
          <Suspense
            fallback={
              <div className="grid h-full place-items-center bg-[#171A19] text-[#B8C1BC]">
                Loading map...
              </div>
            }
          >
            <EVMap
              height="100%"
              stations={filteredStations.slice(0, 100)}
              selectedStation={selectedStation}
              onSelectStation={setSelectedStation}
            />
          </Suspense>
        </div>

        <div className="flex max-h-none flex-col gap-3 overflow-y-auto pr-1 lg:max-h-[calc(100vh-160px)]">
          <div className="mb-0.5 flex items-center justify-between text-[0.8rem] text-[#B8C1BC]">
            <span>
              <strong className="text-[#8EE36A]">{filteredStations.length}</strong> station
              {filteredStations.length !== 1 ? "s" : ""} found
            </span>
            <span className="text-[0.72rem] text-[#6E7672]">
              {search.trim()
                ? "Sorted by Best Match"
                : userLocation
                  ? "Sorted by Nearest Location"
                  : "Sorted by City"}
            </span>
          </div>

          {filteredStations.length === 0 ? (
            <div className="rounded-2xl border border-[#2A2F2D] bg-[#171A19] p-8 text-center text-[#B8C1BC]">
              No charging stations found matching your search.
            </div>
          ) : (
            visibleStations.map((station) => {
              const isSelected =
                selectedStation &&
                (selectedStation.uuid === station.uuid || selectedStation.id === station.id);

              return (
                <article
                  key={`${station.uuid}-${station.id}`}
                  onClick={() => setSelectedStation(station)}
                  className={`cursor-pointer rounded-2xl border-[1.5px] px-[18px] py-4 transition-all ${
                    isSelected
                      ? "border-[#8EE36A] bg-[#8EE36A]/10 shadow-[0_0_16px_rgba(142,227,106,0.15)]"
                      : "border-[#2A2F2D] bg-[#171A19]"
                  }`}
                >
                  <div className="mb-1.5 flex items-start justify-between gap-3">
                    <div>
                      <div className="mb-1 flex items-center gap-2">
                        <div
                          className={`h-2 w-2 shrink-0 rounded-full ${
                            isSelected ? "bg-[#8EE36A]" : "bg-[#58AE37]"
                          }`}
                        />
                        <h2
                          className={`text-[0.95rem] font-bold ${
                            isSelected ? "text-[#8EE36A]" : "text-[#F8FAF8]"
                          }`}
                        >
                          {station.name}
                        </h2>
                      </div>
                      <div className="flex items-center gap-1.5 text-[0.78rem] text-[#B8C1BC]">
                        <MapPin size={12} color="#8EE36A" />
                        <span>
                          {[station.address, station.city].filter(Boolean).join(", ")}
                        </span>
                      </div>
                    </div>

                    {station.distanceKm !== null && (
                      <span className="rounded-full border border-[#8EE36A]/20 bg-[#8EE36A]/15 px-2 py-0.5 text-[0.7rem] font-bold whitespace-nowrap text-[#8EE36A]">
                        {formatDistance(station.distanceKm)}
                      </span>
                    )}
                  </div>

                  {station.telephone && (
                    <div className="mt-1 flex items-center gap-1.5 text-[0.75rem] text-[#B8C1BC]">
                      <Phone size={11} color="#8EE36A" />
                      {station.telephone}
                    </div>
                  )}

                  {station.plugs?.length > 0 && (
                    <div className="mt-2.5 flex flex-wrap gap-1.5">
                      {station.plugs.map((plug, idx) => (
                        <span
                          key={idx}
                          className="rounded-md border border-[#8EE36A]/20 bg-[#8EE36A]/10 px-2 py-0.5 font-mono text-[0.68rem] font-semibold text-[#8EE36A] uppercase"
                        >
                          {plug.plug} · {plug.power} ({plug.type})
                        </span>
                      ))}
                    </div>
                  )}

                  {station.amenities?.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {station.amenities.slice(0, 4).map((amenity) => (
                        <span
                          key={amenity}
                          className="rounded-full bg-[#2A2F2D]/60 px-2 py-0.5 text-[0.64rem] text-[#B8C1BC] capitalize"
                        >
                          {amenity}
                        </span>
                      ))}
                      {station.amenities.length > 4 && (
                        <span className="px-1 py-0.5 text-[0.64rem] text-[#6E7672]">
                          +{station.amenities.length - 4} more
                        </span>
                      )}
                    </div>
                  )}

                  <a
                    href={`/stations/${stationSlug(station)}/`}
                    onClick={(e) => e.stopPropagation()}
                    className="mt-3 inline-block text-[0.72rem] font-semibold text-[#8EE36A] hover:underline"
                  >
                    View station page →
                  </a>
                </article>
              );
            })
          )}

          {filteredStations.length > displayCount && (
            <button
              onClick={() => setDisplayCount((prev) => prev + 50)}
              className="mt-2 w-full rounded-xl border border-[#2A2F2D] bg-[#171A19] py-3 text-[0.82rem] font-semibold text-[#8EE36A]"
            >
              Load More Stations ({filteredStations.length - displayCount} remaining)
            </button>
          )}
        </div>
      </div>
    </section>
  );
}
