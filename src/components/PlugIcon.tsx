import { plugIconSrc, normalizePlugKind, type PlugKind } from "../lib/plugs";

type Props = {
  plug?: string | null;
  kind?: PlugKind;
  size?: number;
  className?: string;
};

export default function PlugIcon({ plug, kind, size = 16, className = "" }: Props) {
  const resolved = kind || normalizePlugKind(plug);
  const src = plugIconSrc(resolved === "other" ? plug : resolved);

  if (src) {
    return (
      <img
        src={src}
        alt=""
        width={size}
        height={size}
        className={`shrink-0 object-contain ${className}`}
        aria-hidden="true"
      />
    );
  }

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      aria-hidden="true"
      className={`shrink-0 ${className}`}
    >
      <circle cx="16" cy="16" r="8" stroke="currentColor" strokeWidth="1.6" />
      <circle cx="16" cy="16" r="2.2" fill="currentColor" />
    </svg>
  );
}