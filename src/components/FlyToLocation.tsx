import { useEffect } from "react";
import { useMap } from "react-leaflet";
import type { Station } from "../lib/stations";

type Props = {
  station: Station | null;
  markerRefs: React.MutableRefObject<Record<string | number, any>>;
};

export default function FlyToLocation({ station, markerRefs }: Props) {
  const map = useMap();

  useEffect(() => {
    if (!station) return;

    const lat = Number(station.latitude);
    const lng = Number(station.longitude);
    if (Number.isNaN(lat) || Number.isNaN(lng)) return;

    const offsetLat = lat + 0.004;
    map.flyTo([offsetLat, lng], 15.5, {
      animate: true,
      duration: 1.2,
    });

    const timer = setTimeout(() => {
      const stationKey = station.uuid || station.id;
      const marker = markerRefs.current[stationKey];
      if (marker) marker.openPopup();
    }, 700);

    return () => clearTimeout(timer);
  }, [station, map, markerRefs]);

  return null;
}
