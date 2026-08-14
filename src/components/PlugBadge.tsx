import type { Plug } from "../lib/stations";
import { plugDisplayLabel } from "../lib/plugs";
import PlugIcon from "./PlugIcon";

type Props = {
  plug: Pick<Plug, "plug" | "type" | "power" | "count" | "icon">;
  className?: string;
  showMeta?: boolean;
  size?: number;
};

export default function PlugBadge({
  plug,
  className = "",
  showMeta = true,
  size = 16,
}: Props) {
  const label = plugDisplayLabel(plug);
  const meta = showMeta
    ? [plug.power, plug.type ? `(${plug.type})` : null, plug.count ? `${plug.count}x` : null]
        .filter(Boolean)
        .join(" · ")
    : "";

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-md border border-charge/20 bg-charge/10 px-2 py-0.5 font-mono text-[0.68rem] font-semibold text-charge uppercase ${className}`}
    >
      <PlugIcon plug={plug.plug || plug.icon} size={size} />
      <span>
        {label}
        {meta ? ` · ${meta}` : ""}
      </span>
    </span>
  );
}
