import { useEffect, useId, useState } from "react";
import { createPortal } from "react-dom";
import { Menu, X } from "lucide-react";

const links = [
  { href: "/stations/", label: "All Stations" },
//   { href: "/", label: "Map" },
  { href: "/cities/", label: "Cities" },
  { href: "/faq/", label: "FAQ" },
];

export default function MobileNav() {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const panelId = useId();

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open]);

  const menu =
    open && mounted
      ? createPortal(
          <div
            id={panelId}
            className="mobile-nav-overlay md:hidden"
            role="dialog"
            aria-modal="true"
            aria-label="Site menu"
          >
            <div className="flex h-full flex-col">
              <div className="flex items-center justify-between border-b border-line px-5 py-4">
                <p className="font-display text-base font-bold">Menu</p>
                <button
                  type="button"
                  className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-line text-muted hover:text-charge"
                  aria-label="Close menu"
                  onClick={() => setOpen(false)}
                >
                  <X size={18} />
                </button>
              </div>
              <nav className="flex flex-col gap-1 p-4" aria-label="Mobile">
                {links.map((item) => (
                  <a
                    key={item.href}
                    href={item.href}
                    className="rounded-xl px-4 py-3 text-base font-semibold transition-colors hover:bg-ink hover:text-charge"
                    onClick={() => setOpen(false)}
                  >
                    {item.label}
                  </a>
                ))}
              </nav>
            </div>
          </div>,
          document.body,
        )
      : null;

  return (
    <div className="md:hidden">
      <button
        type="button"
        className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-line bg-panel text-paper transition-colors hover:border-charge/40 hover:text-charge"
        aria-expanded={open}
        aria-controls={panelId}
        aria-label={open ? "Close menu" : "Open menu"}
        onClick={() => setOpen((v) => !v)}
      >
        {open ? <X size={20} /> : <Menu size={20} />}
      </button>
      {menu}
    </div>
  );
}
