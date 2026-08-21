import type { SVGProps } from "react";
import { normalizePlugKind, type PlugKind } from "../lib/plugs";

type Props = SVGProps<SVGSVGElement> & {
  plug?: string | null;
  kind?: PlugKind;
  size?: number;
};

export default function PlugIcon({ plug, kind, size = 16, className = "", ...rest }: Props) {
  const resolved = kind || normalizePlugKind(plug);
  const common = {
    width: size,
    height: size,
    viewBox: "0 0 32 32",
    fill: "none",
    xmlns: "http://www.w3.org/2000/svg",
    "aria-hidden": true as const,
    className: `shrink-0 ${className}`,
    ...rest,
  };

  if (resolved === "ccs2") {
    return (
      <svg {...common}>
        <circle cx="16" cy="12.5" r="7.5" stroke="currentColor" strokeWidth="1.6" />
        <circle cx="12.2" cy="10.8" r="1.45" fill="currentColor" />
        <circle cx="19.8" cy="10.8" r="1.45" fill="currentColor" />
        <circle cx="16" cy="14.8" r="1.45" fill="currentColor" />
        <circle cx="13.4" cy="16.6" r="0.95" fill="currentColor" opacity="0.75" />
        <circle cx="18.6" cy="16.6" r="0.95" fill="currentColor" opacity="0.75" />
        <circle cx="11.4" cy="13.6" r="0.8" fill="currentColor" opacity="0.55" />
        <circle cx="20.6" cy="13.6" r="0.8" fill="currentColor" opacity="0.55" />
        <rect x="9" y="20.8" width="5.5" height="6.6" rx="1.4" stroke="currentColor" strokeWidth="1.4" />
        <rect x="17.5" y="20.8" width="5.5" height="6.6" rx="1.4" stroke="currentColor" strokeWidth="1.4" />
      </svg>
    );
  }

  if (resolved === "gbt") {
    return (
      <svg {...common}>
        <circle cx="16" cy="16" r="10.5" stroke="currentColor" strokeWidth="1.6" />
        <circle cx="16" cy="16" r="2.2" fill="currentColor" />
        <circle cx="16" cy="8.5" r="1.5" fill="currentColor" />
        <circle cx="16" cy="23.5" r="1.5" fill="currentColor" />
        <circle cx="8.5" cy="16" r="1.5" fill="currentColor" />
        <circle cx="23.5" cy="16" r="1.5" fill="currentColor" />
        <circle cx="10.7" cy="10.7" r="1.2" fill="currentColor" opacity="0.8" />
        <circle cx="21.3" cy="10.7" r="1.2" fill="currentColor" opacity="0.8" />
        <circle cx="10.7" cy="21.3" r="1.2" fill="currentColor" opacity="0.8" />
        <circle cx="21.3" cy="21.3" r="1.2" fill="currentColor" opacity="0.8" />
      </svg>
    );
  }

  return (
    <svg {...common}>
      <circle cx="16" cy="16" r="8" stroke="currentColor" strokeWidth="1.6" />
      <circle cx="16" cy="16" r="2.2" fill="currentColor" />
    </svg>
  );
}
