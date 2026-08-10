export type Plug = {
  id: number;
  station_id: number;
  plug: string;
  power: string | null;
  type: string | null;
  count: number;
  icon?: string;
};

export type Station = {
  id: number;
  uuid: string;
  name: string;
  city: string;
  province: string;
  address: string;
  telephone: string | null;
  type: string[];
  latitude: string;
  longitude: string;
  amenities: string[];
  vendor: string | null;
  plugs: Plug[];
};

export type StationWithDistance = Station & {
  distanceKm: number | null;
};

export function slugify(value: string): string {
  return String(value || "")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

export function stationSlug(station: Pick<Station, "id" | "name" | "city">): string {
  const base = slugify(`${station.name}-${station.city}`);
  return `${base || "station"}-${station.id}`;
}

export function citySlug(city: string): string {
  return slugify(city) || "unknown";
}

export function getDistanceKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export function formatDistance(km: number): string {
  if (km < 1) return `${Math.round(km * 1000)} m`;
  return `${km.toFixed(1)} km`;
}

export function getRelevanceScore(station: Station, query: string): number {
  if (!query) return 0;

  const q = query.toLowerCase();
  const name = (station.name || "").toLowerCase();
  const address = (station.address || "").toLowerCase();
  const city = (station.city || "").toLowerCase();
  const province = (station.province || "").toLowerCase();

  let score = 0;

  if (name === q) score += 1000;
  else if (name.startsWith(q)) score += 600;
  else if (name.split(/\s+/).some((word) => word.startsWith(q))) score += 400;
  else if (name.includes(q)) score += 200;

  if (address.startsWith(q)) score += 350;
  else if (address.split(/\s+/).some((word) => word.startsWith(q))) score += 250;
  else if (address.includes(q)) score += 120;

  if (city === q) score += 250;
  else if (city.startsWith(q)) score += 150;
  else if (city.includes(q)) score += 80;

  if (province.includes(q)) score += 30;
  if (station.telephone?.includes(q)) score += 100;
  if (station.amenities?.some((a) => a.toLowerCase().includes(q))) score += 50;
  if (
    station.plugs?.some(
      (p) =>
        p.plug?.toLowerCase().includes(q) ||
        p.type?.toLowerCase().includes(q) ||
        (p.power || "").toLowerCase().includes(q)
    )
  ) {
    score += 50;
  }

  return score;
}

export function formatLocationLine(station: Pick<Station, "address" | "city" | "province">): string {
  return [station.address, station.city, station.province]
    .filter((part) => part != null && String(part).trim() !== "")
    .join(", ");
}

export function uniqueCities(stations: Station[]): { city: string; count: number }[] {
  const counts = stations.reduce(
    (acc, station) => {
      if (!station.city) return acc;
      acc[station.city] = (acc[station.city] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );

  return Object.entries(counts)
    .map(([city, count]) => ({ city, count }))
    .sort((a, b) => b.count - a.count || a.city.localeCompare(b.city));
}

export type LatLng = { lat: number; lng: number };

export type StationAlongRoute = StationWithDistance & {
  distanceToRouteM: number;
};

/** Approximate meters per degree of latitude. */
const METERS_PER_DEG_LAT = 111_320;

function toLocalMeters(lat: number, lng: number, originLat: number, originLng: number) {
  const metersPerDegLng = METERS_PER_DEG_LAT * Math.cos((originLat * Math.PI) / 180);
  return {
    x: (lng - originLng) * metersPerDegLng,
    y: (lat - originLat) * METERS_PER_DEG_LAT,
  };
}

function distancePointToSegmentMeters(
  point: LatLng,
  a: LatLng,
  b: LatLng
): number {
  const p = toLocalMeters(point.lat, point.lng, a.lat, a.lng);
  const bLocal = toLocalMeters(b.lat, b.lng, a.lat, a.lng);
  const dx = bLocal.x;
  const dy = bLocal.y;
  const lenSq = dx * dx + dy * dy;

  if (lenSq === 0) {
    return Math.hypot(p.x, p.y);
  }

  let t = (p.x * dx + p.y * dy) / lenSq;
  t = Math.max(0, Math.min(1, t));
  const projX = t * dx;
  const projY = t * dy;
  return Math.hypot(p.x - projX, p.y - projY);
}

/** Minimum distance in meters from a point to a polyline (lat/lng pairs). */
export function distanceToRouteMeters(point: LatLng, route: LatLng[]): number {
  if (route.length === 0) return Infinity;
  if (route.length === 1) {
    return getDistanceKm(point.lat, point.lng, route[0].lat, route[0].lng) * 1000;
  }

  let min = Infinity;
  for (let i = 0; i < route.length - 1; i++) {
    const d = distancePointToSegmentMeters(point, route[i], route[i + 1]);
    if (d < min) min = d;
  }
  return min;
}

/** Stations within `radiusMeters` of the route, sorted by distance along the corridor. */
export function filterStationsNearRoute(
  stations: StationWithDistance[],
  route: LatLng[],
  radiusMeters: number
): StationAlongRoute[] {
  if (!route.length) return [];

  return stations
    .map((station) => {
      const lat = Number(station.latitude);
      const lng = Number(station.longitude);
      if (Number.isNaN(lat) || Number.isNaN(lng)) {
        return { ...station, distanceToRouteM: Infinity };
      }
      return {
        ...station,
        distanceToRouteM: distanceToRouteMeters({ lat, lng }, route),
      };
    })
    .filter((station) => station.distanceToRouteM <= radiusMeters)
    .sort((a, b) => a.distanceToRouteM - b.distanceToRouteM);
}

/** Average lat/lng of stations in a city (used as trip endpoints). */
export function cityCentroid(
  stations: Station[],
  city: string
): LatLng | null {
  const matches = stations.filter(
    (s) => s.city?.toLowerCase() === city.toLowerCase()
  );
  if (!matches.length) return null;

  let latSum = 0;
  let lngSum = 0;
  let count = 0;
  for (const station of matches) {
    const lat = Number(station.latitude);
    const lng = Number(station.longitude);
    if (Number.isNaN(lat) || Number.isNaN(lng)) continue;
    latSum += lat;
    lngSum += lng;
    count += 1;
  }
  if (!count) return null;
  return { lat: latSum / count, lng: lngSum / count };
}
