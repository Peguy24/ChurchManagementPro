import { Facebook, Instagram, Youtube, MessageCircle, MapPin, Phone, Mail, Clock, ArrowRight, Church } from "lucide-react";

export interface SiteContent {
  tagline?: string;
  about?: string;
  address?: string;
  phone?: string;
  email?: string;
  hero_image_url?: string;
  service_times?: Array<{ day: string; time: string; title?: string }>;
  social?: { facebook?: string; instagram?: string; youtube?: string; whatsapp?: string };
  gallery?: Array<{ url: string; caption?: string }>;
  footer_text?: string;
}

function footerLine(content: SiteContent, fallback: string) {
  const t = (content.footer_text || "").trim();
  return t.length > 0 ? t : fallback;
}

function GallerySection({ gallery, primaryColor }: { gallery?: SiteContent["gallery"]; primaryColor?: string | null }) {
  if (!gallery || gallery.length === 0) return null;
  return (
    <section className="py-16 bg-background">
      <div className="max-w-6xl mx-auto px-6">
        <div className="mb-8 text-center">
          <div
            className="inline-block w-12 h-0.5 mb-3"
            style={{ background: primaryColor || "hsl(var(--primary))" }}
          />
          <h2 className="text-3xl md:text-4xl font-semibold">Gallery</h2>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-4">
          {gallery.map((img, i) => (
            <figure
              key={i}
              className="relative aspect-square overflow-hidden rounded-lg group bg-muted"
            >
              <img
                src={img.url}
                alt={img.caption || `Gallery image ${i + 1}`}
                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                loading="lazy"
              />
              {img.caption && (
                <figcaption className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-3 text-xs md:text-sm text-white opacity-0 group-hover:opacity-100 transition-opacity">
                  {img.caption}
                </figcaption>
              )}
            </figure>
          ))}
        </div>
      </div>
    </section>
  );
}

export interface TemplateProps {
  name: string;
  logoUrl?: string | null;
  primaryColor?: string | null;
  content: SiteContent;
}

/* ------------------------------ shared bits ------------------------------ */

function Socials({ social, tone = "light" }: { social?: SiteContent["social"]; tone?: "light" | "dark" }) {
  if (!social) return null;
  const items = [
    { url: social.facebook, Icon: Facebook, label: "Facebook" },
    { url: social.instagram, Icon: Instagram, label: "Instagram" },
    { url: social.youtube, Icon: Youtube, label: "YouTube" },
    { url: social.whatsapp, Icon: MessageCircle, label: "WhatsApp" },
  ].filter((i) => i.url);
  if (!items.length) return null;
  const base =
    tone === "dark"
      ? "bg-white/10 hover:bg-white/20 text-white border-white/20"
      : "bg-white hover:bg-neutral-50 text-neutral-800 border-neutral-200";
  return (
    <div className="flex gap-3 flex-wrap">
      {items.map(({ url, Icon, label }, i) => (
        <a
          key={i}
          href={url!}
          target="_blank"
          rel="noreferrer"
          aria-label={label}
          className={`w-11 h-11 grid place-items-center rounded-full border transition-all ${base} hover:scale-105 hover:shadow-md`}
        >
          <Icon className="w-[18px] h-[18px]" />
        </a>
      ))}
    </div>
  );
}

function tint(hex: string, alpha: number) {
  const h = hex.replace("#", "");
  const n = h.length === 3 ? h.split("").map((c) => c + c).join("") : h;
  const r = parseInt(n.slice(0, 2), 16);
  const g = parseInt(n.slice(2, 4), 16);
  const b = parseInt(n.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

/* ============================ 1. SANCTUARY (Classic — Editorial) ============================ */

export function TemplateClassic({ name, logoUrl, primaryColor, content }: TemplateProps) {
  const color = primaryColor || "#0F2A44";
  const soft = tint(color, 0.06);

  return (
    <div className="min-h-screen bg-[#F8F5EE] text-[#1a1a1a]" style={{ fontFamily: "'Cormorant Garamond', 'Playfair Display', Georgia, serif" }}>
      {/* Nav strip */}
      <nav className="border-b border-[#1a1a1a]/10 bg-[#F8F5EE]/90 backdrop-blur sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {logoUrl ? (
              <img src={logoUrl} alt="" className="w-9 h-9 rounded-full object-cover" />
            ) : (
              <Church className="w-6 h-6" style={{ color }} />
            )}
            <span className="text-lg tracking-wide" style={{ color }}>{name}</span>
          </div>
          <div className="hidden md:flex items-center gap-8 text-sm" style={{ fontFamily: "'Inter', system-ui, sans-serif" }}>
            <a href="#about" className="hover:opacity-70">About</a>
            <a href="#services" className="hover:opacity-70">Services</a>
            <a href="#visit" className="hover:opacity-70">Visit</a>
          </div>
        </div>
      </nav>

      {/* Hero — editorial split */}
      <header className="relative overflow-hidden">
        <div className="max-w-6xl mx-auto px-6 pt-20 pb-24 grid md:grid-cols-12 gap-10 items-center">
          <div className="md:col-span-7">
            <div className="text-xs tracking-[0.4em] uppercase mb-6" style={{ color, fontFamily: "'Inter', sans-serif" }}>
              — Est. Community of Faith
            </div>
            <h1 className="text-5xl md:text-7xl leading-[1.02] font-normal" style={{ color }}>
              {name}
            </h1>
            {content.tagline && (
              <p className="mt-8 text-2xl md:text-3xl italic text-[#1a1a1a]/70 max-w-xl leading-snug">
                “{content.tagline}”
              </p>
            )}
            <div className="mt-10 flex flex-wrap gap-4">
              <a href="#visit" className="inline-flex items-center gap-2 px-7 py-3.5 text-sm tracking-widest uppercase text-white transition-transform hover:-translate-y-0.5"
                style={{ backgroundColor: color, fontFamily: "'Inter', sans-serif" }}>
                Plan a Visit <ArrowRight className="w-4 h-4" />
              </a>
              <a href="#services" className="inline-flex items-center gap-2 px-7 py-3.5 text-sm tracking-widest uppercase border transition-colors hover:bg-black/5"
                style={{ borderColor: color, color, fontFamily: "'Inter', sans-serif" }}>
                Service Times
              </a>
            </div>
          </div>
          <div className="md:col-span-5">
            <div className="relative aspect-[3/4] w-full overflow-hidden">
              {content.hero_image_url ? (
                <img src={content.hero_image_url} alt="" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full grid place-items-center" style={{ background: `linear-gradient(160deg, ${color}, ${tint(color, 0.65)})` }}>
                  <Church className="w-24 h-24 text-white/40" strokeWidth={1} />
                </div>
              )}
              <div className="absolute -bottom-3 -left-3 w-24 h-24 border-2" style={{ borderColor: color }} />
            </div>
          </div>
        </div>
        {/* decorative rule */}
        <div className="max-w-6xl mx-auto px-6"><div className="h-px" style={{ background: color, opacity: 0.15 }} /></div>
      </header>

      <main className="max-w-6xl mx-auto px-6">
        {/* About */}
        {content.about && (
          <section id="about" className="py-24 grid md:grid-cols-12 gap-10">
            <div className="md:col-span-4">
              <div className="text-xs tracking-[0.4em] uppercase" style={{ color, fontFamily: "'Inter', sans-serif" }}>Chapter I</div>
              <h2 className="text-4xl md:text-5xl mt-3" style={{ color }}>Our Story</h2>
            </div>
            <div className="md:col-span-8">
              <p className="text-xl leading-relaxed whitespace-pre-line first-letter:text-6xl first-letter:font-normal first-letter:mr-2 first-letter:float-left first-letter:leading-none"
                style={{ color: "#2a2a2a" }}>
                {content.about}
              </p>
            </div>
          </section>
        )}

        {/* Services */}
        {content.service_times?.length ? (
          <section id="services" className="py-24 border-t" style={{ borderColor: tint(color, 0.15) }}>
            <div className="text-xs tracking-[0.4em] uppercase text-center" style={{ color, fontFamily: "'Inter', sans-serif" }}>Weekly</div>
            <h2 className="text-4xl md:text-5xl text-center mt-3 mb-14" style={{ color }}>Gather With Us</h2>
            <div className="grid md:grid-cols-3 gap-6">
              {content.service_times.map((s, i) => (
                <div key={i} className="p-8 text-center border transition-all hover:-translate-y-1" style={{ borderColor: tint(color, 0.2), background: soft }}>
                  <Clock className="w-6 h-6 mx-auto mb-4" style={{ color }} />
                  <div className="text-2xl mb-2" style={{ color }}>{s.day}</div>
                  <div className="text-lg text-[#1a1a1a]/70">{s.time}</div>
                  {s.title && <div className="mt-3 pt-3 border-t text-sm italic" style={{ borderColor: tint(color, 0.15) }}>{s.title}</div>}
                </div>
              ))}
            </div>
          </section>
        ) : null}

        {/* Visit */}
        <section id="visit" className="py-24 border-t grid md:grid-cols-2 gap-12" style={{ borderColor: tint(color, 0.15) }}>
          <div>
            <div className="text-xs tracking-[0.4em] uppercase" style={{ color, fontFamily: "'Inter', sans-serif" }}>Come as you are</div>
            <h2 className="text-4xl md:text-5xl mt-3 mb-8" style={{ color }}>Visit Us</h2>
            <div className="space-y-4 text-lg">
              {content.address && (
                <div className="flex gap-4"><MapPin className="w-5 h-5 mt-1.5 shrink-0" style={{ color }} /><span>{content.address}</span></div>
              )}
              {content.phone && (
                <div className="flex gap-4"><Phone className="w-5 h-5 mt-1.5 shrink-0" style={{ color }} /><a href={`tel:${content.phone}`} className="hover:underline">{content.phone}</a></div>
              )}
              {content.email && (
                <div className="flex gap-4"><Mail className="w-5 h-5 mt-1.5 shrink-0" style={{ color }} /><a href={`mailto:${content.email}`} className="hover:underline">{content.email}</a></div>
              )}
            </div>
            <div className="mt-10"><Socials social={content.social} /></div>
          </div>
          <div className="hidden md:block relative">
            <div className="absolute inset-0 border-2" style={{ borderColor: color }} />
            <div className="absolute inset-4 grid place-items-center text-center p-8" style={{ background: soft }}>
              <div>
                <div className="text-6xl mb-4" style={{ color }}>✦</div>
                <p className="text-2xl italic max-w-xs mx-auto" style={{ color }}>
                  “All are welcome. Every soul, every story.”
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t mt-8" style={{ borderColor: tint(color, 0.15), background: soft }}>
        <div className="max-w-6xl mx-auto px-6 py-10 flex flex-col md:flex-row items-center justify-between gap-4 text-sm" style={{ fontFamily: "'Inter', sans-serif" }}>
          <div style={{ color }}>© {new Date().getFullYear()} {name}</div>
          <div className="opacity-60">{footerLine(content, "Built with care ✦")}</div>
        </div>
      </footer>
    </div>
  );
}

/* ============================ 2. MODERN (Cinematic) ============================ */

export function TemplateModern({ name, logoUrl, primaryColor, content }: TemplateProps) {
  const color = primaryColor || "#6D28D9";

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100" style={{ fontFamily: "'Inter', system-ui, sans-serif" }}>
      {/* Sticky glass nav */}
      <nav className="fixed top-0 inset-x-0 z-50 backdrop-blur-xl bg-neutral-950/60 border-b border-white/5">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {logoUrl ? (
              <img src={logoUrl} alt="" className="w-9 h-9 rounded-full object-cover ring-2 ring-white/10" />
            ) : (
              <div className="w-9 h-9 rounded-full grid place-items-center" style={{ background: color }}>
                <Church className="w-5 h-5 text-white" />
              </div>
            )}
            <span className="font-semibold tracking-tight">{name}</span>
          </div>
          <div className="hidden md:flex items-center gap-8 text-sm text-neutral-300">
            <a href="#welcome" className="hover:text-white">Welcome</a>
            <a href="#services" className="hover:text-white">Services</a>
            <a href="#connect" className="hover:text-white">Connect</a>
            <a href="#connect" className="px-4 py-2 rounded-full text-sm font-medium text-white transition-transform hover:scale-105"
              style={{ background: color }}>Plan a Visit</a>
          </div>
        </div>
      </nav>

      {/* Cinematic hero */}
      <header className="relative min-h-[100vh] flex items-center overflow-hidden pt-16">
        <div className="absolute inset-0">
          {content.hero_image_url ? (
            <img src={content.hero_image_url} alt="" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full" style={{ background: `radial-gradient(1200px 600px at 20% 30%, ${tint(color, 0.55)}, transparent 60%), radial-gradient(1000px 500px at 80% 70%, ${tint(color, 0.35)}, transparent 60%), #0a0a0a` }} />
          )}
          <div className="absolute inset-0" style={{ background: "linear-gradient(180deg, rgba(10,10,10,0.4) 0%, rgba(10,10,10,0.6) 55%, rgba(10,10,10,0.95) 100%)" }} />
          {/* grain */}
          <div className="absolute inset-0 opacity-[0.06] mix-blend-overlay pointer-events-none"
            style={{ backgroundImage: 'url("data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%22120%22 height=%22120%22><filter id=%22n%22><feTurbulence baseFrequency=%220.9%22/></filter><rect width=%22100%25%22 height=%22100%25%22 filter=%22url(%23n)%22/></svg>")' }} />
        </div>

        <div className="relative max-w-7xl mx-auto px-6 py-24 w-full">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-medium border border-white/15 bg-white/5 backdrop-blur mb-8">
              <span className="w-2 h-2 rounded-full animate-pulse" style={{ background: color }} />
              Live services every week
            </div>
            <h1 className="text-6xl md:text-8xl font-bold tracking-tight leading-[0.95]">
              {name}
            </h1>
            {content.tagline && (
              <p className="mt-8 text-xl md:text-2xl text-neutral-200/90 max-w-2xl leading-relaxed">
                {content.tagline}
              </p>
            )}
            <div className="mt-12 flex flex-wrap gap-4">
              <a href="#services" className="group inline-flex items-center gap-2 px-8 py-4 rounded-full font-medium text-white transition-all hover:scale-[1.02] hover:shadow-2xl"
                style={{ background: `linear-gradient(135deg, ${color}, ${tint(color, 0.7)})`, boxShadow: `0 20px 60px -20px ${tint(color, 0.6)}` }}>
                Join Us Sunday
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </a>
              <a href="#welcome" className="inline-flex items-center gap-2 px-8 py-4 rounded-full font-medium border border-white/20 hover:bg-white/10 transition-colors">
                Learn More
              </a>
            </div>
          </div>
        </div>

        {/* Scroll indicator */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 text-xs uppercase tracking-widest text-neutral-400 flex flex-col items-center gap-2">
          Scroll
          <div className="w-px h-10 bg-gradient-to-b from-neutral-400 to-transparent" />
        </div>
      </header>

      {/* Welcome */}
      {content.about && (
        <section id="welcome" className="py-32 relative">
          <div className="max-w-6xl mx-auto px-6 grid md:grid-cols-12 gap-12">
            <div className="md:col-span-5">
              <div className="text-sm font-medium uppercase tracking-widest mb-4" style={{ color: tint(color, 0.9).replace("rgba", "rgb").replace(/,\s*0?\.\d+\)/, ")") }}>
                Welcome Home
              </div>
              <h2 className="text-5xl md:text-6xl font-bold leading-tight">
                A place to<br />
                <span style={{ color }}>belong.</span>
              </h2>
            </div>
            <div className="md:col-span-7">
              <p className="text-xl leading-relaxed text-neutral-300 whitespace-pre-line">{content.about}</p>
            </div>
          </div>
        </section>
      )}

      {/* Services grid */}
      {content.service_times?.length ? (
        <section id="services" className="py-32 border-t border-white/5 relative overflow-hidden">
          <div className="absolute -top-40 -right-40 w-96 h-96 rounded-full blur-3xl opacity-30" style={{ background: color }} />
          <div className="max-w-7xl mx-auto px-6 relative">
            <div className="flex items-end justify-between mb-14 flex-wrap gap-6">
              <div>
                <div className="text-sm font-medium uppercase tracking-widest text-neutral-400 mb-3">Weekly Rhythm</div>
                <h2 className="text-5xl md:text-6xl font-bold">This Week</h2>
              </div>
              <p className="text-neutral-400 max-w-md">Join us for worship, teaching, and community. Everyone is welcome — first-time guests always.</p>
            </div>
            <div className="grid md:grid-cols-3 gap-4">
              {content.service_times.map((s, i) => (
                <div key={i}
                  className="group relative p-8 rounded-3xl bg-white/[0.03] border border-white/10 hover:border-white/20 transition-all hover:-translate-y-1 overflow-hidden">
                  <div className="absolute top-0 left-0 h-1 w-full transition-all group-hover:h-2" style={{ background: color }} />
                  <div className="text-sm text-neutral-400 mb-2">{s.day}</div>
                  <div className="text-4xl font-bold mb-4">{s.time}</div>
                  <div className="pt-4 border-t border-white/10 text-neutral-300">{s.title || "Worship service"}</div>
                </div>
              ))}
            </div>
          </div>
        </section>
      ) : null}

      {/* Connect */}
      <section id="connect" className="py-32 border-t border-white/5">
        <div className="max-w-6xl mx-auto px-6 grid md:grid-cols-2 gap-16">
          <div>
            <div className="text-sm font-medium uppercase tracking-widest text-neutral-400 mb-3">Connect</div>
            <h2 className="text-5xl md:text-6xl font-bold mb-8">Let's talk.</h2>
            <div className="space-y-5 text-lg">
              {content.address && (
                <div className="flex gap-4 group">
                  <div className="w-11 h-11 rounded-full grid place-items-center bg-white/5 border border-white/10 shrink-0 group-hover:border-white/30 transition-colors">
                    <MapPin className="w-4 h-4" style={{ color }} />
                  </div>
                  <div className="pt-2 text-neutral-200">{content.address}</div>
                </div>
              )}
              {content.phone && (
                <a href={`tel:${content.phone}`} className="flex gap-4 group">
                  <div className="w-11 h-11 rounded-full grid place-items-center bg-white/5 border border-white/10 shrink-0 group-hover:border-white/30 transition-colors">
                    <Phone className="w-4 h-4" style={{ color }} />
                  </div>
                  <div className="pt-2 text-neutral-200 group-hover:text-white">{content.phone}</div>
                </a>
              )}
              {content.email && (
                <a href={`mailto:${content.email}`} className="flex gap-4 group">
                  <div className="w-11 h-11 rounded-full grid place-items-center bg-white/5 border border-white/10 shrink-0 group-hover:border-white/30 transition-colors">
                    <Mail className="w-4 h-4" style={{ color }} />
                  </div>
                  <div className="pt-2 text-neutral-200 group-hover:text-white">{content.email}</div>
                </a>
              )}
            </div>
          </div>
          <div className="p-10 rounded-3xl relative overflow-hidden"
            style={{ background: `linear-gradient(135deg, ${tint(color, 0.15)}, ${tint(color, 0.03)})`, border: `1px solid ${tint(color, 0.25)}` }}>
            <div className="text-2xl md:text-3xl font-semibold leading-snug mb-8">
              Follow along and never miss a moment of community.
            </div>
            <Socials social={content.social} tone="dark" />
          </div>
        </div>
      </section>

      <footer className="border-t border-white/5 py-12">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-neutral-500">
          <div>© {new Date().getFullYear()} {name}. All rights reserved.</div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full" style={{ background: color }} />
            {footerLine(content, "Made with love")}
          </div>
        </div>
      </footer>
    </div>
  );
}

/* ============================ 3. WARM (Community) ============================ */

export function TemplateWarm({ name, logoUrl, primaryColor, content }: TemplateProps) {
  const color = primaryColor || "#B45309";

  return (
    <div className="min-h-screen text-[#3B2A1A]"
      style={{
        fontFamily: "'Nunito', 'DM Sans', system-ui, sans-serif",
        background: "linear-gradient(180deg, #FFF9F0 0%, #FDF4E4 100%)",
      }}>
      {/* Nav */}
      <nav className="sticky top-0 z-40 backdrop-blur-md bg-[#FFF9F0]/80 border-b border-[#3B2A1A]/10">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {logoUrl ? (
              <img src={logoUrl} alt="" className="w-10 h-10 rounded-full object-cover ring-2 ring-white shadow-md" />
            ) : (
              <div className="w-10 h-10 rounded-full grid place-items-center shadow-md" style={{ background: color }}>
                <Church className="w-5 h-5 text-white" />
              </div>
            )}
            <span className="font-bold text-lg" style={{ color }}>{name}</span>
          </div>
          <div className="hidden md:flex items-center gap-6 text-sm font-medium">
            <a href="#story" className="hover:opacity-70">Our Story</a>
            <a href="#gather" className="hover:opacity-70">Gatherings</a>
            <a href="#visit" className="px-5 py-2 rounded-full text-white shadow-md hover:shadow-lg transition-all hover:-translate-y-0.5"
              style={{ background: color }}>Visit Us</a>
          </div>
        </div>
      </nav>

      {/* Hero with organic shapes */}
      <header className="relative overflow-hidden">
        <div className="absolute top-20 -left-20 w-72 h-72 rounded-full opacity-30" style={{ background: `radial-gradient(circle, ${tint(color, 0.5)}, transparent 70%)` }} />
        <div className="absolute -bottom-32 -right-20 w-96 h-96 rounded-full opacity-30" style={{ background: `radial-gradient(circle, ${tint(color, 0.4)}, transparent 70%)` }} />

        <div className="relative max-w-6xl mx-auto px-6 pt-20 pb-24 grid md:grid-cols-2 gap-12 items-center">
          <div>
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/70 backdrop-blur border border-white shadow-sm text-sm font-medium mb-8" style={{ color }}>
              ✨ A warm welcome awaits
            </div>
            <h1 className="text-5xl md:text-7xl font-bold leading-[1.05]" style={{ color }}>
              Faith,<br />family,<br />home.
            </h1>
            {content.tagline && (
              <p className="mt-8 text-xl text-[#3B2A1A]/80 max-w-md leading-relaxed">
                {content.tagline}
              </p>
            )}
            <div className="mt-10 flex flex-wrap gap-4">
              <a href="#gather" className="inline-flex items-center gap-2 px-8 py-4 rounded-full font-semibold text-white shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all"
                style={{ background: color }}>
                Join This Sunday <ArrowRight className="w-4 h-4" />
              </a>
              <a href="#story" className="inline-flex items-center gap-2 px-8 py-4 rounded-full font-semibold bg-white shadow hover:shadow-md transition-all">
                Meet Us
              </a>
            </div>
          </div>

          <div className="relative">
            <div className="relative aspect-square rounded-[42%_58%_65%_35%/45%_50%_50%_55%] overflow-hidden shadow-2xl"
              style={{ background: `linear-gradient(135deg, ${color}, ${tint(color, 0.6)})` }}>
              {content.hero_image_url ? (
                <img src={content.hero_image_url} alt="" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full grid place-items-center">
                  <Church className="w-32 h-32 text-white/50" strokeWidth={1} />
                </div>
              )}
            </div>
            {/* floating card */}
            <div className="absolute -bottom-6 -left-6 bg-white rounded-2xl p-4 shadow-xl flex items-center gap-3 max-w-[220px]">
              <div className="w-11 h-11 rounded-full grid place-items-center shrink-0" style={{ background: tint(color, 0.15) }}>
                <Clock className="w-5 h-5" style={{ color }} />
              </div>
              <div className="min-w-0">
                <div className="text-xs text-[#3B2A1A]/60">Next Service</div>
                <div className="font-bold text-sm truncate">
                  {content.service_times?.[0] ? `${content.service_times[0].day} · ${content.service_times[0].time}` : "Every Sunday"}
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6">
        {/* Story */}
        {content.about && (
          <section id="story" className="py-20">
            <div className="bg-white/80 backdrop-blur rounded-3xl p-10 md:p-14 shadow-sm border border-white">
              <div className="max-w-2xl mx-auto text-center">
                <div className="text-sm font-semibold uppercase tracking-widest mb-3" style={{ color }}>Our Story</div>
                <h2 className="text-4xl md:text-5xl font-bold mb-8" style={{ color }}>Rooted in love, growing together</h2>
                <p className="text-lg leading-relaxed whitespace-pre-line text-[#3B2A1A]/85">{content.about}</p>
              </div>
            </div>
          </section>
        )}

        {/* Gatherings */}
        {content.service_times?.length ? (
          <section id="gather" className="py-20">
            <div className="text-center mb-12">
              <div className="text-sm font-semibold uppercase tracking-widest mb-3" style={{ color }}>Gatherings</div>
              <h2 className="text-4xl md:text-5xl font-bold" style={{ color }}>When we meet</h2>
            </div>
            <div className="grid md:grid-cols-3 gap-6">
              {content.service_times.map((s, i) => (
                <div key={i} className="bg-white rounded-3xl p-8 shadow-sm border border-white hover:shadow-lg transition-all hover:-translate-y-1">
                  <div className="w-14 h-14 rounded-2xl grid place-items-center mb-5" style={{ background: tint(color, 0.12) }}>
                    <Clock className="w-6 h-6" style={{ color }} />
                  </div>
                  <div className="text-2xl font-bold" style={{ color }}>{s.day}</div>
                  <div className="text-lg text-[#3B2A1A]/70 mt-1">{s.time}</div>
                  {s.title && <div className="mt-4 pt-4 border-t border-[#3B2A1A]/10 text-sm text-[#3B2A1A]/70">{s.title}</div>}
                </div>
              ))}
            </div>
          </section>
        ) : null}

        {/* Visit */}
        <section id="visit" className="py-20">
          <div className="rounded-3xl p-10 md:p-14 shadow-lg relative overflow-hidden"
            style={{ background: `linear-gradient(135deg, ${color} 0%, ${tint(color, 0.75)} 100%)` }}>
            <div className="absolute -top-20 -right-20 w-64 h-64 rounded-full bg-white/10" />
            <div className="absolute -bottom-16 -left-16 w-52 h-52 rounded-full bg-white/10" />
            <div className="relative grid md:grid-cols-2 gap-10 text-white">
              <div>
                <div className="text-sm font-semibold uppercase tracking-widest opacity-80 mb-3">Come visit</div>
                <h2 className="text-4xl md:text-5xl font-bold mb-6">We'd love to meet you</h2>
                <p className="text-white/85 text-lg leading-relaxed">Whether it's your first time or your hundredth, there's a seat with your name on it.</p>
              </div>
              <div className="space-y-4 text-white">
                {content.address && (
                  <div className="flex gap-3 items-start bg-white/10 backdrop-blur rounded-2xl p-4 border border-white/15">
                    <MapPin className="w-5 h-5 mt-0.5 shrink-0" />
                    <span>{content.address}</span>
                  </div>
                )}
                {content.phone && (
                  <a href={`tel:${content.phone}`} className="flex gap-3 items-start bg-white/10 backdrop-blur rounded-2xl p-4 border border-white/15 hover:bg-white/20 transition-colors">
                    <Phone className="w-5 h-5 mt-0.5 shrink-0" />
                    <span>{content.phone}</span>
                  </a>
                )}
                {content.email && (
                  <a href={`mailto:${content.email}`} className="flex gap-3 items-start bg-white/10 backdrop-blur rounded-2xl p-4 border border-white/15 hover:bg-white/20 transition-colors">
                    <Mail className="w-5 h-5 mt-0.5 shrink-0" />
                    <span>{content.email}</span>
                  </a>
                )}
                <div className="pt-2"><Socials social={content.social} tone="dark" /></div>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="py-10 border-t border-[#3B2A1A]/10">
        <div className="max-w-6xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-[#3B2A1A]/60">
          <div>© {new Date().getFullYear()} {name} · Made with care</div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full" style={{ background: color }} />
            All are welcome
          </div>
        </div>
      </footer>
    </div>
  );
}

/* ------------------------------ registry ------------------------------ */

export function renderTemplate(template: string, props: TemplateProps) {
  const inner = (() => {
    switch (template) {
      case "modern":
        return <TemplateModern {...props} />;
      case "warm":
        return <TemplateWarm {...props} />;
      case "classic":
      default:
        return <TemplateClassic {...props} />;
    }
  })();
  return (
    <>
      {inner}
      <GallerySection gallery={props.content.gallery} primaryColor={props.primaryColor} />
    </>
  );
}
