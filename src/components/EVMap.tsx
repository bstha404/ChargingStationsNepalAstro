import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import React, { useRef, useCallback, useMemo, useState, useEffect } from "react";
import { MapPin, Phone, Zap, Navigation } from "lucide-react";
import FlyToLocation from "./FlyToLocation";
import type { Station } from "../lib/stations";
import { formatLocationLine } from "../lib/stations";

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
};

function EVMap({
  height = "600px",
  stations,
  selectedStation,
  onSelectStation,
  mapStationsLimit = 120,
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
      <div className="min-w-[220px] space-y-3 p-1">
        <div>
          <span className="mb-1 inline-block rounded-full border border-[#8EE36A]/20 bg-[#8EE36A]/10 px-2 py-0.5 text-[9px] font-bold tracking-wider text-[#8EE36A] uppercase">
            EV Station Details
          </span>
          <h3 className="text-base leading-tight font-bold text-[#F8FAF8]">{station.name}</h3>
          {station.vendor && (
            <div className="mt-1 text-[10px] font-semibold tracking-wide text-[#8EE36A]/80 uppercase">
              {station.vendor}
            </div>
          )}
        </div>

        <div className="space-y-1 text-xs text-[#B8C1BC]">
          {locationLine && (
            <div className="flex items-start gap-1.5">
              <MapPin size={13} className="mt-0.5 shrink-0 text-[#8EE36A]" />
              <span>{locationLine}</span>
            </div>
          )}
          {station.telephone && (
            <div className="flex items-center gap-1.5">
              <Phone size={13} className="shrink-0 text-[#8EE36A]" />
              <a href={`tel:${station.telephone}`} className="font-medium text-white hover:underline">
                {station.telephone}
              </a>
            </div>
          )}
        </div>

        {station.plugs?.length > 0 && (
          <div className="rounded-xl border border-neutral-800 bg-neutral-900/90 p-2.5">
            <div className="mb-1.5 flex items-center gap-1 text-[10px] font-semibold text-neutral-400">
              <Zap size={12} className="text-[#8EE36A]" />
              Available Plugs
            </div>
            <div className="space-y-1">
              {station.plugs.map((plug, idx) => (
                <div key={idx} className="flex items-center justify-between gap-2 text-xs">
                  <span className="text-[11px] font-semibold text-white uppercase">
                    {plug.plug}
                    {plug.type ? ` (${plug.type})` : ""}
                  </span>
                  <span className="rounded bg-[#8EE36A]/15 px-1.5 py-0.5 font-mono text-[10px] whitespace-nowrap text-[#8EE36A]">
                    {[plug.power, plug.count ? `${plug.count}x` : null].filter(Boolean).join(" · ")}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {station.amenities?.length > 0 && (
          <div>
            <div className="mb-1 text-[10px] font-medium text-neutral-400">Amenities</div>
            <div className="flex flex-wrap gap-1">
              {station.amenities.map((item) => (
                <span
                  key={item}
                  className="rounded-full border border-neutral-700/60 bg-neutral-800 px-2 py-0.5 text-[9px] text-neutral-300 capitalize"
                >
                  {item}
                </span>
              ))}
            </div>
          </div>
        )}

        <button
          onClick={() => {
            const name = (station.name || "EV Station").replace(/\s+/g, "+");
            window.open(
              `https://www.google.com/maps/dir/Current+Location/${name}/@${station.latitude},${station.longitude}`,
              "_blank"
            );
          }}
          className="flex w-full items-center justify-center gap-1.5 rounded-xl bg-[#8EE36A] px-3 py-2 text-xs font-semibold text-[#0B0D0C] shadow-md transition-all hover:bg-[#79D55A] active:scale-[0.98]"
        >
          <Navigation size={14} />
          Get Directions
        </button>
      </div>
    </Popup>
  );
});

export default React.memo(EVMap);
