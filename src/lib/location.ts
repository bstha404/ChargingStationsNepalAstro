export type UserCoords = { lat: number; lng: number };

export type LocationRequestResult =
  | { ok: true; coords: UserCoords }
  | {
      ok: false;
      reason: "unsupported" | "denied" | "location_off" | "timeout" | "unknown";
      message: string;
    };

/** Browser GeolocationPositionError codes */
const PERMISSION_DENIED = 1;
const POSITION_UNAVAILABLE = 2;
const TIMEOUT = 3;

/**
 * Request the user's current position. Distinguishes permission denial from
 * device location/GPS being off (common on mobile after tapping Allow).
 */
export function requestUserPosition(
  options?: PositionOptions
): Promise<LocationRequestResult> {
  if (!("geolocation" in navigator)) {
    return Promise.resolve({
      ok: false,
      reason: "unsupported",
      message: "Geolocation is not supported in this browser.",
    });
  }

  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        resolve({
          ok: true,
          coords: {
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
          },
        });
      },
      (err) => {
        if (err.code === PERMISSION_DENIED) {
          resolve({
            ok: false,
            reason: "denied",
            message: "Location permission was denied. Enable it in browser settings to find nearby chargers.",
          });
          return;
        }
        if (err.code === POSITION_UNAVAILABLE) {
          resolve({
            ok: false,
            reason: "location_off",
            message:
              "Your device location appears to be off. Turn on Location / GPS in system settings, then try again.",
          });
          return;
        }
        if (err.code === TIMEOUT) {
          resolve({
            ok: false,
            reason: "location_off",
            message:
              "We could not get a GPS fix in time. On mobile, turn on Location / GPS (and High accuracy if available), then try again.",
          });
          return;
        }
        resolve({
          ok: false,
          reason: "unknown",
          message: err.message || "Unable to get your location.",
        });
      },
      {
        enableHighAccuracy: true,
        timeout: 20000,
        maximumAge: 60_000,
        ...options,
      }
    );
  });
}

type NominatimAddress = {
  suburb?: string;
  neighbourhood?: string;
  village?: string;
  town?: string;
  city?: string;
  municipality?: string;
  county?: string;
  state_district?: string;
  state?: string;
  country?: string;
};

/**
 * Reverse-geocode coordinates to a short place label via Nominatim.
 */
export async function reverseGeocodeLabel(
  coords: UserCoords,
  signal?: AbortSignal
): Promise<string | null> {
  const url =
    `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${coords.lat}&lon=${coords.lng}` +
    `&zoom=14&addressdetails=1`;

  try {
    const res = await fetch(url, {
      signal,
      headers: {
        Accept: "application/json",
      },
    });
    if (!res.ok) return null;
    const data = (await res.json()) as {
      name?: string;
      display_name?: string;
      address?: NominatimAddress;
    };
    const a = data.address;
    if (!a) {
      return data.name || truncateLabel(data.display_name) || null;
    }

    const locality =
      a.suburb ||
      a.neighbourhood ||
      a.village ||
      a.town ||
      a.city ||
      a.municipality ||
      a.county ||
      a.state_district;

    const region = a.state || a.country;
    if (locality && region && locality !== region) {
      return `${locality}, ${region}`;
    }
    return locality || region || data.name || truncateLabel(data.display_name) || null;
  } catch {
    return null;
  }
}

function truncateLabel(value?: string, max = 42): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (trimmed.length <= max) return trimmed;
  return `${trimmed.slice(0, max - 1).trimEnd()}…`;
}
