import type { LatLng } from "./stations";

export type RouteResult = {
  path: LatLng[];
  distanceMeters: number;
  durationSeconds: number;
};

const OSRM_BASE = "https://router.project-osrm.org/route/v1/driving";

/**
 * Fetch a driving route between two points via the public OSRM demo server.
 * Coordinates are [lat, lng] in our app; OSRM expects lon,lat.
 */
export async function fetchDrivingRoute(
  from: LatLng,
  to: LatLng,
  signal?: AbortSignal
): Promise<RouteResult> {
  const url =
    `${OSRM_BASE}/${from.lng},${from.lat};${to.lng},${to.lat}` +
    "?overview=full&geometries=geojson&steps=false";

  const res = await fetch(url, { signal });
  if (!res.ok) {
    throw new Error(`Route request failed (${res.status})`);
  }

  const data = await res.json();
  const route = data?.routes?.[0];
  if (!route?.geometry?.coordinates?.length) {
    throw new Error("No driving route found between these locations");
  }

  const path: LatLng[] = route.geometry.coordinates.map(
    ([lng, lat]: [number, number]) => ({ lat, lng })
  );

  return {
    path,
    distanceMeters: route.distance ?? 0,
    durationSeconds: route.duration ?? 0,
  };
}

export function formatRouteDistance(meters: number): string {
  if (meters < 1000) return `${Math.round(meters)} m`;
  return `${(meters / 1000).toFixed(1)} km`;
}

export function formatRouteDuration(seconds: number): string {
  const totalMin = Math.round(seconds / 60);
  if (totalMin < 60) return `${totalMin} min`;
  const hours = Math.floor(totalMin / 60);
  const mins = totalMin % 60;
  return mins ? `${hours} h ${mins} min` : `${hours} h`;
}
