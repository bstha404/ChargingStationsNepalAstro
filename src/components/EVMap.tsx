import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import React, { useRef, useCallback, useMemo, useState, useEffect } from "react";
import { MapPin, Phone, Zap, Navigation } from "lucide-react";
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

type Props = {
  height?: string;
  stations: Station[];
  selectedStation: Station | null;
  onSelectStation: (station: Station) => void;
  mapStationsLimit?: number;
  routePath?: LatLng[];
};

function EVMap({
  height = "600px",
  stations,
  selectedStation,
  onSelectStation,
  mapStationsLimit = 120,
  routePath = [],
}: Props) {
  const markerRefs = useRef<Record<string | number, any>>({});
  const [mounted, setMounted] = useState(false);

  const displayStations = useMemo(
    () => (Array.isArray(stations) ? stations : []),
    [stations]
  );

  const visibleStations = useMemo(
    () => displayStations.slice(0, mapStationsLimit),
    [displayStations, mapStationsLimit]
  );

  const handleSelect = useCallback(
    (station: Station) => {
      onSelectStation(station);
    },
    [onSelectStation]
  );

  useEffect(() => {
    requestAnimationFrame(() => setMounted(true));
  }, []);

  if (!mounted) {
    return (
      <div
        className="grid place-items-center bg-panel text-muted"
        style={{ height }}
      >
        Loading map...
      </div>
    );
  }

  return (
    <div className="relative w-full overflow-hidden rounded-3xl border border-line shadow-2xl" style={{ height }}>
      <MapContainer
        center={[28.3949, 84.124]}
        zoom={7}
        scrollWheelZoom
        className="z-0 h-full w-full"
      >
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
                "_blank"
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
