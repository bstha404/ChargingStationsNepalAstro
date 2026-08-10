import { useEffect } from "react";
import { Polyline, useMap } from "react-leaflet";
import type { LatLng } from "../lib/stations";

type Props = {
  path: LatLng[];
};

export default function RouteLayer({ path }: Props) {
  const map = useMap();

  useEffect(() => {
    if (!path.length) return;

    const bounds = path.map((p) => [p.lat, p.lng] as [number, number]);
    map.fitBounds(bounds, {
      padding: [48, 48],
      maxZoom: 12,
      animate: true,
    });
  }, [path, map]);

  if (path.length < 2) return null;

  const positions = path.map((p) => [p.lat, p.lng] as [number, number]);

  return (
    <>
      {/* Soft outline so the route reads on light tiles */}
      <Polyline
        positions={positions}
        pathOptions={{
          color: "#0B0D0C",
          weight: 8,
          opacity: 0.35,
          lineCap: "round",
          lineJoin: "round",
        }}
      />
      <Polyline
        positions={positions}
        pathOptions={{
          color: "#8EE36A",
          weight: 5,
          opacity: 0.95,
          lineCap: "round",
          lineJoin: "round",
        }}
      />
    </>
  );
}
