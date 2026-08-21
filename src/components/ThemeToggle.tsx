import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";

type Theme = "light" | "dark";

function getPreferredTheme(): Theme {
  try {
    const stored = localStorage.getItem("theme");
    if (stored === "light" || stored === "dark") return stored;
  } catch {
    /* ignore */
  }
  return "light";
}

function applyTheme(theme: Theme) {
  document.documentElement.setAttribute("data-theme", theme);
  document.documentElement.style.colorScheme = theme;
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) {
    meta.setAttribute("content", theme === "light" ? "#F2F5F2" : "#0B0D0C");
  }
}

export default function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>("light");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const next = getPreferredTheme();
    setTheme(next);
    applyTheme(next);
    setReady(true);
  }, []);

  const toggle = () => {
    const next: Theme = theme === "dark" ? "light" : "dark";
    setTheme(next);
    applyTheme(next);
    try {
      localStorage.setItem("theme", next);
    } catch {
      /* ignore */
    }
  };

  const isDark = theme === "dark";

  return (
    <button
      type="button"
      role="switch"
      aria-checked={isDark}
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      title={isDark ? "Light mode" : "Dark mode"}
      onClick={toggle}
      className={`relative inline-flex h-9 w-[3.75rem] shrink-0 items-center justify-center rounded-full border border-line bg-panel p-1 transition-colors ${
        ready ? "opacity-100" : "opacity-0"
      }`}
    >
      <span
        className={`absolute top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full bg-charge text-ink shadow-sm transition-[left] duration-200 ${
          isDark ? "left-[calc(100%-1.95rem)]" : "left-1"
        }`}
      >
        {isDark ? <Moon size={14} strokeWidth={2.5} /> : <Sun size={14} strokeWidth={2.5} />}
      </span>
      <span className="flex w-full items-center justify-between px-1.5 text-muted" aria-hidden="true">
        <Sun size={12} className="block" />
        <Moon size={12} className="block" />
      </span>
    </button>
  );
}
