import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import React, { useRef, useCallback, useMemo, useState, useEffect } from "react";
import {
  MapPin,
  Phone,
  Zap,
  Navigation,
  Maximize2,
  Plus,
  Minus,
  Crosshair,
  X,
  Route,
} from "lucide-react";
import FlyToLocation from "./FlyToLocation";
import RouteLayer from "./RouteLayer";
import PlugBadge from "./PlugBadge";
import type { LatLng, Station } from "../lib/stations";
import { formatLocationLine, stationSlug } from "../lib/stations";

const PIN_URL = "/assets/ev_pin.svg";

const chargerIcon = new L.Icon({
  iconUrl: PIN_URL,
  iconSize: [44, 56],
  iconAnchor: [22, 56],
  popupAnchor: [0, -48],
});

const activeChargerIcon = new L.Icon({
  iconUrl: PIN_URL,
  iconSize: [58, 74],
  iconAnchor: [29, 74],
  popupAnchor: [0, -64],
});

const controlBtn =
  "inline-flex h-10 w-10 items-center justify-center rounded-full border border-line bg-panel text-paper shadow-md transition-colors hover:border-charge/40 hover:text-charge disabled:opacity-50";

type Props = {
  height?: string;
  stations: Station[];
  selectedStation: Station | null;
  onSelectStation: (station: Station) => void;
  mapStationsLimit?: number;
  routePath?: LatLng[];
  tripMode?: boolean;
  tripPlanner?: React.ReactNode;
  onRequestTripPlanner?: () => void;
  onFullscreenChange?: (fullscreen: boolean) => void;
};

function MapBridge({
  fullscreen,
  onReady,
}: {
  fullscreen: boolean;
  onReady: (map: L.Map) => void;
}) {
  const map = useMap();

  useEffect(() => {
    onReady(map);
  }, [map, onReady]);

  useEffect(() => {
    const id = window.setTimeout(() => {
      map.invalidateSize({ animate: false });
    }, 60);
    return () => window.clearTimeout(id);
  }, [fullscreen, map]);

  return null;
}

function EVMap({
  height = "600px",
  stations,
  selectedStation,
  onSelectStation,
  mapStationsLimit = 120,
  routePath = [],
  tripMode = false,
  tripPlanner = null,
  onRequestTripPlanner,
  onFullscreenChange,
}: Props) {
  const markerRefs = useRef<Record<string | number, any>>({});
  const mapRef = useRef<L.Map | null>(null);
  const [mounted, setMounted] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const [locating, setLocating] = useState(false);
  const [tripSheetOpen, setTripSheetOpen] = useState(false);
  const [tripSheetVisible, setTripSheetVisible] = useState(false);

  const displayStations = useMemo(
    () => (Array.isArray(stations) ? stations : []),
    [stations],
  );

  const visibleStations = useMemo(
    () => displayStations.slice(0, mapStationsLimit),
    [displayStations, mapStationsLimit],
  );

  const handleSelect = useCallback(
    (station: Station) => {
      onSelectStation(station);
    },
    [onSelectStation],
  );

  const onMapReady = useCallback((map: L.Map) => {
    mapRef.current = map;
  }, []);

  const setFullscreenSafe = useCallback(
    (next: boolean | ((prev: boolean) => boolean)) => {
      setFullscreen((prev) => {
        const value = typeof next === "function" ? next(prev) : next;
        onFullscreenChange?.(value);
        if (!value) {
          setTripSheetOpen(false);
          setTripSheetVisible(false);
        }
        return value;
      });
    },
    [onFullscreenChange],
  );

  const toggleFullscreen = useCallback(() => {
    setFullscreenSafe((v) => !v);
  }, [setFullscreenSafe]);

  const openTripSheet = useCallback(() => {
    onRequestTripPlanner?.();
    setTripSheetOpen(true);
    requestAnimationFrame(() => setTripSheetVisible(true));
  }, [onRequestTripPlanner]);

  const closeTripSheet = useCallback(() => {
    setTripSheetVisible(false);
    window.setTimeout(() => setTripSheetOpen(false), 220);
  }, []);

  const zoomIn = () => mapRef.current?.zoomIn();
  const zoomOut = () => mapRef.current?.zoomOut();

  const locateMe = () => {
    if (!navigator.geolocation || !mapRef.current) return;
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        mapRef.current?.flyTo([pos.coords.latitude, pos.coords.longitude], 14, {
          animate: true,
          duration: 1,
        });
        setLocating(false);
      },
      () => setLocating(false),
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 60_000 },
    );
  };

  useEffect(() => {
    requestAnimationFrame(() => setMounted(true));
  }, []);

  useEffect(() => {
    if (!fullscreen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      if (tripSheetOpen) {
        closeTripSheet();
        return;
      }
      setFullscreenSafe(false);
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      document.removeEventListener("keydown", onKey);
    };
  }, [fullscreen, tripSheetOpen, closeTripSheet, setFullscreenSafe]);

  if (!mounted) {
    return (
      <div className="grid place-items-center bg-panel text-muted" style={{ height }}>
        Loading map...
      </div>
    );
  }

  return (
    <div
      className={
        fullscreen
          ? "fixed inset-0 z-[200] overflow-hidden bg-ink"
          : "relative z-0 w-full overflow-hidden rounded-3xl border border-line shadow-2xl"
      }
      style={{ height: fullscreen ? "100dvh" : height }}
    >
      <MapContainer
        center={[28.3949, 84.124]}
        zoom={7}
        scrollWheelZoom
        zoomControl={false}
        className="z-0 h-full w-full"
      >
        <MapBridge fullscreen={fullscreen} onReady={onMapReady} />
        <FlyToLocation station={selectedStation} markerRefs={markerRefs} />
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {routePath.length >= 2 && <RouteLayer path={routePath} />}

        {visibleStations.map((station) => {
          const isSelected =
            selectedStation &&
            (selectedStation.uuid === station.uuid || selectedStation.id === station.id);
          const stationKey = station.uuid || station.id;

          return (
            <Marker
              ref={(ref) => {
                if (ref) markerRefs.current[stationKey] = ref;
              }}
              key={stationKey}
              position={[Number(station.latitude), Number(station.longitude)]}
              icon={isSelected ? activeChargerIcon : chargerIcon}
              zIndexOffset={isSelected ? 1000 : 0}
              eventHandlers={{
                click: () => handleSelect(station),
              }}
            >
              <StationPopup station={station} />
            </Marker>
          );
        })}
      </MapContainer>

      <div className="pointer-events-none absolute inset-0 z-[1000]">
        {fullscreen && (
          <div className="pointer-events-none absolute top-[max(0.75rem,env(safe-area-inset-top))] left-3 rounded-full border border-line bg-panel/95 px-3 py-1.5 text-xs font-semibold text-paper shadow-md">
            Map · tap a station for details
          </div>
        )}

        <div className="pointer-events-auto absolute top-[max(0.75rem,env(safe-area-inset-top))] right-3 flex flex-col gap-2">
          <button
            type="button"
            className={controlBtn}
            aria-label={fullscreen ? "Exit fullscreen map" : "Expand map"}
            title={fullscreen ? "Exit fullscreen" : "Fullscreen"}
            onClick={toggleFullscreen}
          >
            {fullscreen ? <X size={18} /> : <Maximize2 size={18} />}
          </button>
          <button type="button" className={controlBtn} aria-label="Zoom in" title="Zoom in" onClick={zoomIn}>
            <Plus size={18} />
          </button>
          <button type="button" className={controlBtn} aria-label="Zoom out" title="Zoom out" onClick={zoomOut}>
            <Minus size={18} />
          </button>
        </div>

        <div className="pointer-events-auto absolute right-3 bottom-[max(0.75rem,env(safe-area-inset-bottom))] flex flex-col gap-2 sm:bottom-6">
          {fullscreen && (
            <button
              type="button"
              className={`${controlBtn} ${tripMode ? "border-charge text-charge" : ""}`}
              aria-label="Plan a trip"
              title="Plan a trip"
              onClick={openTripSheet}
            >
              <Route size={18} className="text-charge" />
            </button>
          )}
          <button
            type="button"
            className={controlBtn}
            aria-label="Go to my location"
            title="My location"
            disabled={locating}
            onClick={locateMe}
          >
            <Crosshair size={18} className={locating ? "animate-pulse text-charge" : ""} />
          </button>
        </div>
      </div>

      {fullscreen && tripSheetOpen && (
        <div className="absolute inset-0 z-[1100] flex flex-col justify-end">
          <button
            type="button"
            className={`absolute inset-0 border-0 bg-ink/50 transition-opacity duration-200 ${
              tripSheetVisible ? "opacity-100" : "opacity-0"
            }`}
            aria-label="Close trip planner"
            onClick={closeTripSheet}
          />
          <div
            className={`relative mx-auto w-full max-w-[1280px] max-h-[min(85dvh,640px)] overflow-y-auto rounded-t-3xl border border-line border-b-0 bg-panel p-4 shadow-2xl transition-transform duration-200 ease-out sm:p-5 ${
              tripSheetVisible ? "translate-y-0" : "translate-y-full"
            }`}
            role="dialog"
            aria-modal="true"
            aria-label="Trip planner"
          >
            <div className="mb-3 flex items-center justify-between gap-2">
              <div className="h-1 w-10 rounded-full bg-line" aria-hidden="true" />
              <button
                type="button"
                className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-line text-muted hover:text-charge"
                aria-label="Close trip planner"
                onClick={closeTripSheet}
              >
                <X size={16} />
              </button>
            </div>
            {tripPlanner}
          </div>
        </div>
      )}
    </div>
  );
}

const StationPopup = React.memo(function StationPopup({ station }: { station: Station }) {
  const locationLine = formatLocationLine(station);

  return (
    <Popup>
      <div className="min-w-[180px] max-w-[220px] space-y-2.5 p-0.5">
        <div>
          <span className="mb-1 inline-block rounded-full border border-charge/20 bg-charge/10 px-2 py-0.5 text-[9px] font-bold tracking-wider text-charge uppercase">
            EV Station Details
          </span>
          <h3 className="text-sm leading-tight font-bold text-paper">{station.name}</h3>
          {station.vendor && (
            <div className="mt-1 text-[10px] font-semibold tracking-wide text-charge/80 uppercase">
              {station.vendor}
            </div>
          )}
        </div>

        <div className="space-y-1 text-xs text-muted">
          {locationLine && (
            <div className="flex items-start gap-1.5">
              <MapPin size={13} className="mt-0.5 shrink-0 text-charge" />
              <span>{locationLine}</span>
            </div>
          )}
          {station.telephone && (
            <div className="flex items-center gap-1.5">
              <Phone size={13} className="shrink-0 text-charge" />
              <a href={`tel:${station.telephone}`} className="font-medium text-paper hover:underline">
                {station.telephone}
              </a>
            </div>
          )}
        </div>

        {station.plugs?.length > 0 && (
          <div className="rounded-xl border border-line bg-ink/90 p-2.5">
            <div className="mb-1.5 flex items-center gap-1 text-[10px] font-semibold text-muted">
              <Zap size={12} className="text-charge" />
              Available Plugs
            </div>
            <div className="flex flex-wrap gap-1.5">
              {station.plugs.map((plug, idx) => (
                <PlugBadge key={idx} plug={plug} size={14} />
              ))}
            </div>
          </div>
        )}

        {station.amenities?.length > 0 && (
          <div>
            <div className="mb-1 text-[10px] font-medium text-muted">Amenities</div>
            <div className="flex flex-wrap gap-1">
              {station.amenities.map((item) => (
                <span
                  key={item}
                  className="rounded-full border border-line bg-panel px-2 py-0.5 text-[9px] text-muted capitalize"
                >
                  {item}
                </span>
              ))}
            </div>
          </div>
        )}

        <div className="flex flex-col gap-1">
          <button
            onClick={() => {
              const name = (station.name || "EV Station").replace(/\s+/g, "+");
              window.open(
                `https://www.google.com/maps/dir/Current+Location/${name}/@${station.latitude},${station.longitude}`,
                "_blank",
              );
            }}
            className="flex w-full items-center justify-center gap-1.5 rounded-xl bg-charge px-3 py-2 text-xs font-semibold text-ink shadow-md transition-all hover:brightness-110 active:scale-[0.98]"
          >
            <Navigation size={14} />
            Get Directions
          </button>
          <a
            href={`/stations/${stationSlug(station)}/`}
            className="flex w-full items-center justify-center px-2 py-1 text-xs font-semibold no-underline transition-opacity hover:opacity-80 hover:underline"
            style={{ color: "var(--theme-charge)" }}
          >
            View station page →
          </a>
        </div>
      </div>
    </Popup>
  );
});

export default React.memo(EVMap);
