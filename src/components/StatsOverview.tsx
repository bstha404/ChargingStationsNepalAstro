import { useState } from "react";
import { ChevronDown } from "lucide-react";

type Stat = {
  value: string | number;
  label: string;
};

type Props = {
  stats: Stat[];
};

export default function StatsOverview({ stats }: Props) {
  const [open, setOpen] = useState(false);

  return (
    <section className="mx-auto max-w-[1280px] px-6 pt-8">
      <button
        type="button"
        className="mb-3 flex w-full items-center justify-between rounded-2xl border border-line bg-panel/80 px-4 py-3 text-left md:hidden"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        <span>
          {/* <span className="block text-sm font-bold text-paper">Network snapshot</span> */}
          <span className="block text-xs text-muted">
            {stats[0]?.value} stations · {stats[1]?.value} cities
          </span>
        </span>
        <ChevronDown
          size={20}
          className={`shrink-0 text-charge transition-transform duration-200 ${open ? "rotate-180" : ""}`}
        />
      </button>

      <div
        className={`grid grid-cols-2 gap-3 sm:grid-cols-4 ${open ? "" : "max-md:hidden"}`}
      >
        {stats.map((stat) => (
          <div key={stat.label} className="rounded-2xl border border-line bg-panel/80 px-4 py-3">
            <div className="text-2xl font-extrabold text-charge">{stat.value}</div>
            <div className="text-xs text-muted">{stat.label}</div>
          </div>
        ))}
      </div>
    </section>
  );
}
