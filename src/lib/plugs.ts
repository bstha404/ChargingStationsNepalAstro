import type { Plug } from "./stations";

export type PlugKind = "ccs2" | "gbt" | "other";

export function normalizePlugKind(value?: string | null): PlugKind {
  const raw = (value || "").toLowerCase().replace(/[\s/_-]+/g, "");
  if (raw.includes("ccs2") || raw === "ccs") return "ccs2";
  // "gpt" is a common misspelling/search variant of GB/T
  if (raw.includes("gbt") || raw.includes("gpt") || raw.includes("guobiao")) return "gbt";
  return "other";
}

export function plugDisplayLabel(plug: Pick<Plug, "plug" | "icon">): string {
  const kind = normalizePlugKind(plug.plug || plug.icon);
  if (kind === "ccs2") return "CCS2";
  if (kind === "gbt") return "GB/T";
  return (plug.plug || "Plug").toUpperCase();
}

export function plugIconSrc(value?: string | null): string | null {
  const kind = normalizePlugKind(value);
  if (kind === "ccs2") return "/assets/plugs/ccs2.svg";
  if (kind === "gbt") return "/assets/plugs/gbt.svg";
  return null;
}
