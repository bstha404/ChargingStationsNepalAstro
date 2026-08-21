import type { Station } from "./stations";
import { detectStationBrand } from "./brands";

function parsePowerKw(value?: string | null): number {
  if (!value) return 0;
  const match = String(value).replace(",", ".").match(/(\d+(?:\.\d+)?)/);
  return match ? Number(match[1]) : 0;
}

/** Short human description for a station detail page. */
export function buildStationDescription(station: Station): string {
  const brand = detectStationBrand(station);
  const city = station.city || "Nepal";
  const province = station.province ? `, ${station.province}` : "";
  const plugs = station.plugs || [];
  const types = [...new Set(plugs.map((p) => (p.type || "").toUpperCase()).filter(Boolean))];
  const kinds = [
    ...new Set(
      plugs
        .map((p) => {
          const raw = `${p.plug || ""} ${p.icon || ""}`.toLowerCase();
          if (raw.includes("ccs2") || raw === "ccs") return "CCS2";
          if (raw.includes("gbt") || raw.includes("gpt") || raw.includes("guobiao")) return "GB/T";
          return null;
        })
        .filter(Boolean),
    ),
  ] as string[];
  const maxPower = plugs.reduce((max, p) => Math.max(max, parsePowerKw(p.power)), 0);
  const hasDc = types.includes("DC");
  const speedLabel = hasDc && maxPower >= 50 ? "high-speed" : hasDc ? "fast" : "reliable";

  const networkPhrase =
    brand.id !== "others"
      ? `part of the ${brand.label} network`
      : "designed for everyday EV drivers";

  const plugPhrase =
    kinds.length > 0
      ? `${kinds.join(" and ")} connectors`
      : types.length > 0
        ? `${types.join(" / ")} charging`
        : "EV charging";

  const powerPhrase = maxPower > 0 ? ` with up to ${maxPower} kW output` : "";
  const amenities = (station.amenities || []).slice(0, 3);
  const amenityPhrase =
    amenities.length > 0
      ? ` Nearby amenities include ${amenities.map((a) => a.replace(/_/g, " ")).join(", ")}.`
      : " It features practical on-site safety considerations for drivers.";

  return `This ${speedLabel} charging station is ${networkPhrase}, designed to provide reliable charging for compatible electric vehicles. Located in ${city}${province}, Nepal, it offers ${plugPhrase}${powerPhrase}.${amenityPhrase}`;
}
