/** Known charging brands detected from vendor + station name. */
export const STATION_BRANDS = [
  { id: "maw", label: "MAW", patterns: ["maw", "mawvriddhi", "vriddhi"] },
  { id: "nea", label: "NEA", patterns: ["nea"] },
  { id: "ather", label: "Ather", patterns: ["ather"] },
  { id: "gadicharge", label: "Gadi Charge", patterns: ["gadicharge", "gadi charge", "gadi"] },
  { id: "sipradi", label: "Sipradi", patterns: ["sipradi"] },
  { id: "hyundai", label: "Hyundai", patterns: ["hyundai"] },
  { id: "gogoro", label: "Gogoro", patterns: ["gogoro"] },
  { id: "byd", label: "BYD", patterns: ["byd"] },
  { id: "tata", label: "Tata", patterns: ["tata"] },
  { id: "mg", label: "MG", patterns: ["mg motor", " mg", "mg-", "mg/"] },
  { id: "yatri", label: "Yatri", patterns: ["yatri"] },
  { id: "gwm", label: "GWM", patterns: ["gwm"] },
  { id: "cg", label: "CG", patterns: ["cg motors", " cg", "cg-", "cg/"] },
  { id: "electriva", label: "Electriva", patterns: ["electriva"] },
  { id: "theego", label: "The EGO", patterns: ["theego", "the ego"] },
  { id: "dfsk", label: "DFSK", patterns: ["dfsk"] },
  { id: "plugnsip", label: "Plug n Sip", patterns: ["plugnsip", "plug n sip", "plug & sip"] },
] as const;

export type StationBrandId = (typeof STATION_BRANDS)[number]["id"] | "others";

const PROVINCE_ALIASES: Record<string, string> = {
  "1": "Koshi",
  "province 1": "Koshi",
  koshi: "Koshi",
  "2": "Madhesh",
  "province 2": "Madhesh",
  madhesh: "Madhesh",
  "3": "Bagmati",
  bagmati: "Bagmati",
  "4": "Gandaki",
  gandaki: "Gandaki",
  "5": "Lumbini",
  lumbini: "Lumbini",
  "6": "Karnali",
  karnali: "Karnali",
  "7": "Sudurpashchim",
  sudurpaschim: "Sudurpashchim",
  "sudurpaschim province": "Sudurpashchim",
  sudurpashchim: "Sudurpashchim",
};

export function normalizeProvince(value: string | null | undefined): string {
  const raw = String(value || "").trim();
  if (!raw) return "Unknown";
  const key = raw.toLowerCase();
  return PROVINCE_ALIASES[key] || raw;
}

export function detectStationBrand(station: {
  name?: string | null;
  vendor?: string | null;
}): { id: StationBrandId; label: string } {
  const vendor = (station.vendor || "").toLowerCase().trim();
  const hay = ` ${vendor} ${station.name || ""} `.toLowerCase();

  const vendorMap: Record<string, { id: StationBrandId; label: string }> = {
    hyundai: { id: "hyundai", label: "Hyundai" },
    mg: { id: "mg", label: "MG" },
    byd: { id: "byd", label: "BYD" },
    nea: { id: "nea", label: "NEA" },
    yatri: { id: "yatri", label: "Yatri" },
    tata: { id: "tata", label: "Tata" },
    mawvriddhi: { id: "maw", label: "MAW" },
    gwm: { id: "gwm", label: "GWM" },
    cg: { id: "cg", label: "CG" },
    theego: { id: "theego", label: "The EGO" },
    electriva: { id: "electriva", label: "Electriva" },
    dfsk: { id: "dfsk", label: "DFSK" },
    plugnsip: { id: "plugnsip", label: "Plug n Sip" },
    gadicharge: { id: "gadicharge", label: "Gadi Charge" },
  };
  if (vendor && vendorMap[vendor]) return vendorMap[vendor];

  for (const brand of STATION_BRANDS) {
    if (brand.patterns.some((p) => hay.includes(p))) {
      return { id: brand.id, label: brand.label };
    }
  }

  // Word-boundary-ish MG / CG / EGO fallbacks
  if (/\bmg\b/.test(hay)) return { id: "mg", label: "MG" };
  if (/\bcg\b/.test(hay)) return { id: "cg", label: "CG" };
  if (/\bego\b/.test(hay)) return { id: "theego", label: "The EGO" };

  return { id: "others", label: "Others" };
}
