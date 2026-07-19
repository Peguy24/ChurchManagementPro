import { Link, useLocation } from "react-router-dom";
import { Church, Menu, X } from "lucide-react";
import { useState } from "react";
import type { SiteContent, SiteTheme } from "./SiteTemplates";

export interface SiteMeta {
  name: string;
  logoUrl?: string | null;
  primaryColor?: string | null;
  content: SiteContent;
  basePath: string;   // "" on tenant host, "/site/<slug>" on platform
  giveHref?: string | null;
}

export const FONT_STACKS: Record<NonNullable<SiteTheme["font"]>, string> = {
  serif: "'Cormorant Garamond', 'Playfair Display', Georgia, serif",
  sans: "'Inter', system-ui, -apple-system, sans-serif",
  display: "'Playfair Display', 'Cormorant Garamond', Georgia, serif",
  modern: "'Space Grotesk', 'Inter', system-ui, sans-serif",
};

export function fontFor(theme?: SiteTheme) {
  return FONT_STACKS[theme?.font || "sans"];
}

export function subpageEnabled(content: SiteContent, page: "about" | "sermons" | "visit" | "contact") {
  const cfg = content.subpages;
  if (!cfg?.enabled) return false;
  if (!cfg.pages || cfg.pages.length === 0) return true;
  return cfg.pages.includes(page);
}

export function anySubpageEnabled(content: SiteContent) {
  return ["about", "sermons", "visit", "contact"].some((p) => subpageEnabled(content, p as any));
}

export function SiteTopNav({ meta }: { meta: SiteMeta }) {
  const [open, setOpen] = useState(false);
  const { pathname } = useLocation();
  const color = meta.primaryColor || "#0F2A44";
  const base = meta.basePath;
  const links: Array<{ to: string; label: string; show: boolean }> = [
    { to: `${base}/`, label: "Home", show: true },
    { to: `${base}/about`, label: "About", show: subpageEnabled(meta.content, "about") },
    { to: `${base}/sermons`, label: "Sermons", show: subpageEnabled(meta.content, "sermons") },
    { to: `${base}/visit`, label: "Plan Your Visit", show: subpageEnabled(meta.content, "visit") },
    { to: `${base}/contact`, label: "Contact", show: subpageEnabled(meta.content, "contact") },
  ];
  const shown = links.filter((l) => l.show);
  if (shown.length <= 1) return null;

  const isActive = (to: string) => {
    const clean = (p: string) => (p === "" ? "/" : p.replace(/\/+$/, "") || "/");
    return clean(pathname) === clean(to) || (to.endsWith("/") && clean(pathname) === clean(to));
  };

  return (
    <div
      className="sticky top-0 z-50 backdrop-blur bg-white/85 border-b"
      style={{ borderColor: `${color}22`, fontFamily: FONT_STACKS.sans }}
    >
      <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
        <Link to={`${base}/`} className="flex items-center gap-2">
          {meta.logoUrl ? (
            <img src={meta.logoUrl} alt="" className="w-8 h-8 rounded-full object-cover" />
          ) : (
            <Church className="w-5 h-5" style={{ color }} />
          )}
          <span className="text-sm font-semibold tracking-wide" style={{ color }}>{meta.name}</span>
        </Link>
        <nav className="hidden md:flex items-center gap-6 text-sm">
          {shown.map((l) => (
            <Link
              key={l.to}
              to={l.to}
              className="relative py-1 transition-colors hover:opacity-70"
              style={{
                color: isActive(l.to) ? color : "#333",
                fontWeight: isActive(l.to) ? 600 : 400,
              }}
            >
              {l.label}
              {isActive(l.to) && (
                <span className="absolute -bottom-1 left-0 right-0 h-0.5 rounded" style={{ background: color }} />
              )}
            </Link>
          ))}
          {meta.giveHref && (
            <Link
              to={meta.giveHref}
              className="ml-2 px-4 py-1.5 rounded-full text-white text-xs font-semibold hover:opacity-90"
              style={{ background: color }}
            >
              Give
            </Link>
          )}
        </nav>
        <button
          className="md:hidden p-2 rounded hover:bg-black/5"
          onClick={() => setOpen((v) => !v)}
          aria-label="Toggle menu"
        >
          {open ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>
      {open && (
        <div className="md:hidden border-t bg-white" style={{ borderColor: `${color}22` }}>
          <div className="max-w-6xl mx-auto px-6 py-3 flex flex-col gap-2">
            {shown.map((l) => (
              <Link
                key={l.to}
                to={l.to}
                onClick={() => setOpen(false)}
                className="py-2 text-sm border-b last:border-0"
                style={{ borderColor: `${color}11`, color: isActive(l.to) ? color : "#333" }}
              >
                {l.label}
              </Link>
            ))}
            {meta.giveHref && (
              <Link
                to={meta.giveHref}
                onClick={() => setOpen(false)}
                className="mt-2 text-center py-2 rounded-full text-white text-sm font-semibold"
                style={{ background: color }}
              >
                Give
              </Link>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export function SubpageContainer({
  meta,
  eyebrow,
  title,
  children,
}: {
  meta: SiteMeta;
  eyebrow?: string;
  title: string;
  children: React.ReactNode;
}) {
  const color = meta.primaryColor || "#0F2A44";
  return (
    <div className="min-h-screen bg-[#faf8f5]" style={{ fontFamily: fontFor(meta.content.theme) }}>
      <header className="border-b" style={{ borderColor: `${color}22`, background: `linear-gradient(180deg, ${color}0d, transparent)` }}>
        <div className="max-w-4xl mx-auto px-6 py-16 md:py-20 text-center">
          {eyebrow && (
            <div className="text-xs tracking-[0.35em] uppercase mb-4" style={{ color, fontFamily: FONT_STACKS.sans }}>
              {eyebrow}
            </div>
          )}
          <h1 className="text-4xl md:text-6xl leading-tight" style={{ color }}>{title}</h1>
        </div>
      </header>
      <main className="max-w-4xl mx-auto px-6 py-12 md:py-16">{children}</main>
      <footer className="border-t mt-8" style={{ borderColor: `${color}22` }}>
        <div className="max-w-4xl mx-auto px-6 py-8 text-center text-sm text-neutral-600" style={{ fontFamily: FONT_STACKS.sans }}>
          © {new Date().getFullYear()} {meta.name}
        </div>
      </footer>
    </div>
  );
}
