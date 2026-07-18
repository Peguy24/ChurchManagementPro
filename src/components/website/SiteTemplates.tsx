import { Facebook, Instagram, Youtube, MessageCircle, MapPin, Phone, Mail, Calendar } from "lucide-react";

export interface SiteContent {
  tagline?: string;
  about?: string;
  address?: string;
  phone?: string;
  email?: string;
  hero_image_url?: string;
  service_times?: Array<{ day: string; time: string; title?: string }>;
  social?: { facebook?: string; instagram?: string; youtube?: string; whatsapp?: string };
}

export interface TemplateProps {
  name: string;
  logoUrl?: string | null;
  primaryColor?: string | null;
  content: SiteContent;
}

function Socials({ social }: { social?: SiteContent["social"] }) {
  if (!social) return null;
  const items = [
    { url: social.facebook, Icon: Facebook },
    { url: social.instagram, Icon: Instagram },
    { url: social.youtube, Icon: Youtube },
    { url: social.whatsapp, Icon: MessageCircle },
  ].filter((i) => i.url);
  if (!items.length) return null;
  return (
    <div className="flex gap-3 justify-center">
      {items.map(({ url, Icon }, i) => (
        <a key={i} href={url} target="_blank" rel="noreferrer" className="p-2 rounded-full bg-background/80 hover:bg-background border">
          <Icon className="w-5 h-5" />
        </a>
      ))}
    </div>
  );
}

function ServiceTimes({ times }: { times?: SiteContent["service_times"] }) {
  if (!times?.length) return null;
  return (
    <ul className="space-y-2">
      {times.map((s, i) => (
        <li key={i} className="flex items-center gap-3">
          <Calendar className="w-4 h-4 text-primary" />
          <span><strong>{s.day}</strong> · {s.time}{s.title ? ` — ${s.title}` : ""}</span>
        </li>
      ))}
    </ul>
  );
}

export function TemplateClassic({ name, logoUrl, primaryColor, content }: TemplateProps) {
  const color = primaryColor || "hsl(var(--primary))";
  return (
    <div className="min-h-screen bg-background text-foreground" style={{ ["--tpl" as any]: color }}>
      <header className="text-center py-16 px-6 border-b" style={{ borderColor: color }}>
        {logoUrl && <img src={logoUrl} alt={name} className="w-24 h-24 rounded-full object-cover mx-auto mb-4" />}
        <h1 className="text-4xl font-serif font-bold" style={{ color }}>{name}</h1>
        {content.tagline && <p className="mt-3 text-lg text-muted-foreground italic">{content.tagline}</p>}
      </header>
      <main className="max-w-3xl mx-auto px-6 py-12 space-y-12">
        {content.about && <section><h2 className="text-2xl font-serif mb-4" style={{ color }}>About Us</h2><p className="whitespace-pre-line leading-relaxed">{content.about}</p></section>}
        {content.service_times?.length ? <section><h2 className="text-2xl font-serif mb-4" style={{ color }}>Service Times</h2><ServiceTimes times={content.service_times} /></section> : null}
        <section className="space-y-2 text-sm">
          {content.address && <p className="flex gap-2"><MapPin className="w-4 h-4 mt-1" style={{ color }} />{content.address}</p>}
          {content.phone && <p className="flex gap-2"><Phone className="w-4 h-4 mt-1" style={{ color }} />{content.phone}</p>}
          {content.email && <p className="flex gap-2"><Mail className="w-4 h-4 mt-1" style={{ color }} />{content.email}</p>}
        </section>
        <Socials social={content.social} />
      </main>
    </div>
  );
}

export function TemplateModern({ name, logoUrl, primaryColor, content }: TemplateProps) {
  const color = primaryColor || "#111827";
  return (
    <div className="min-h-screen bg-white text-gray-900">
      <section
        className="relative min-h-[60vh] flex flex-col items-center justify-center text-center text-white px-6 py-24"
        style={{
          background: content.hero_image_url
            ? `linear-gradient(rgba(0,0,0,0.55), rgba(0,0,0,0.55)), url(${content.hero_image_url}) center/cover`
            : `linear-gradient(135deg, ${color}, #000)`,
        }}
      >
        {logoUrl && <img src={logoUrl} alt={name} className="w-20 h-20 rounded-full mb-6 border-2 border-white object-cover" />}
        <h1 className="text-5xl md:text-6xl font-bold tracking-tight">{name}</h1>
        {content.tagline && <p className="mt-4 text-xl opacity-90 max-w-2xl">{content.tagline}</p>}
      </section>
      <main className="max-w-5xl mx-auto px-6 py-16 grid md:grid-cols-2 gap-12">
        <div>
          <h2 className="text-3xl font-bold mb-4" style={{ color }}>Welcome</h2>
          {content.about && <p className="whitespace-pre-line leading-relaxed text-gray-700">{content.about}</p>}
        </div>
        <div className="space-y-8">
          {content.service_times?.length ? <div><h3 className="text-xl font-semibold mb-3" style={{ color }}>Join Us</h3><ServiceTimes times={content.service_times} /></div> : null}
          <div className="space-y-2 text-sm text-gray-700">
            {content.address && <p className="flex gap-2"><MapPin className="w-4 h-4 mt-1" />{content.address}</p>}
            {content.phone && <p className="flex gap-2"><Phone className="w-4 h-4 mt-1" />{content.phone}</p>}
            {content.email && <p className="flex gap-2"><Mail className="w-4 h-4 mt-1" />{content.email}</p>}
          </div>
          <Socials social={content.social} />
        </div>
      </main>
    </div>
  );
}

export function TemplateWarm({ name, logoUrl, primaryColor, content }: TemplateProps) {
  const color = primaryColor || "#B45309";
  return (
    <div className="min-h-screen" style={{ background: "linear-gradient(180deg, #FFFBEB, #FEF3C7)", color: "#3F2A14" }}>
      <header className="text-center py-14 px-6">
        {logoUrl && <img src={logoUrl} alt={name} className="w-28 h-28 rounded-full mx-auto mb-4 object-cover shadow-lg" />}
        <h1 className="text-4xl md:text-5xl font-bold" style={{ color }}>{name}</h1>
        {content.tagline && <p className="mt-3 text-lg">{content.tagline}</p>}
      </header>
      <main className="max-w-3xl mx-auto px-6 pb-16 space-y-10">
        {content.about && (
          <section className="bg-white/70 rounded-2xl p-6 shadow-sm">
            <h2 className="text-2xl font-semibold mb-3" style={{ color }}>Our Story</h2>
            <p className="whitespace-pre-line leading-relaxed">{content.about}</p>
          </section>
        )}
        {content.service_times?.length ? (
          <section className="bg-white/70 rounded-2xl p-6 shadow-sm">
            <h2 className="text-2xl font-semibold mb-3" style={{ color }}>Gatherings</h2>
            <ServiceTimes times={content.service_times} />
          </section>
        ) : null}
        <section className="bg-white/70 rounded-2xl p-6 shadow-sm space-y-2 text-sm">
          {content.address && <p className="flex gap-2"><MapPin className="w-4 h-4 mt-1" style={{ color }} />{content.address}</p>}
          {content.phone && <p className="flex gap-2"><Phone className="w-4 h-4 mt-1" style={{ color }} />{content.phone}</p>}
          {content.email && <p className="flex gap-2"><Mail className="w-4 h-4 mt-1" style={{ color }} />{content.email}</p>}
        </section>
        <Socials social={content.social} />
      </main>
    </div>
  );
}

export function renderTemplate(template: string, props: TemplateProps) {
  switch (template) {
    case "modern":
      return <TemplateModern {...props} />;
    case "warm":
      return <TemplateWarm {...props} />;
    case "classic":
    default:
      return <TemplateClassic {...props} />;
  }
}
