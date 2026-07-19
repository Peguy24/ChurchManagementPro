import { useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Play, Mail, Phone, MapPin, Heart, Send, Calendar, User } from "lucide-react";
import { SubpageContainer, SiteMeta, FONT_STACKS } from "./PublicSiteChrome";
import { z } from "zod";

/* ============ ABOUT + STAFF ============ */
export function AboutStaffPage({ meta }: { meta: SiteMeta }) {
  const color = meta.primaryColor || "#0F2A44";
  const c = meta.content;
  const staff = c.staff || [];
  return (
    <SubpageContainer meta={meta} eyebrow="Our Story" title={`About ${meta.name}`}>
      {c.about && (
        <div
          className="prose max-w-none text-lg leading-relaxed whitespace-pre-line mb-16"
          style={{ color: "#2a2a2a" }}
        >
          {c.about}
        </div>
      )}
      {staff.length > 0 && (
        <section>
          <div className="text-xs tracking-[0.35em] uppercase mb-3" style={{ color, fontFamily: FONT_STACKS.sans }}>
            Leadership
          </div>
          <h2 className="text-3xl md:text-4xl mb-10" style={{ color }}>
            Meet the Team
          </h2>
          <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-6">
            {staff.map((s, i) => (
              <Card key={i} className="overflow-hidden border-0 shadow-sm">
                <div className="aspect-square bg-neutral-100 overflow-hidden">
                  {s.photo_url ? (
                    <img src={s.photo_url} alt={s.name} className="w-full h-full object-cover" loading="lazy" />
                  ) : (
                    <div className="w-full h-full grid place-items-center">
                      <User className="w-16 h-16 text-neutral-300" />
                    </div>
                  )}
                </div>
                <div className="p-5">
                  <div className="text-lg font-semibold" style={{ color }}>{s.name}</div>
                  {s.role && (
                    <div className="text-sm uppercase tracking-wider mt-0.5" style={{ color: `${color}aa`, fontFamily: FONT_STACKS.sans }}>
                      {s.role}
                    </div>
                  )}
                  {s.bio && <p className="text-sm text-neutral-600 mt-3 leading-relaxed">{s.bio}</p>}
                  {s.email && (
                    <a href={`mailto:${s.email}`} className="mt-3 inline-flex items-center gap-1 text-xs" style={{ color }}>
                      <Mail className="w-3 h-3" /> {s.email}
                    </a>
                  )}
                </div>
              </Card>
            ))}
          </div>
        </section>
      )}
      {!c.about && staff.length === 0 && (
        <p className="text-center text-neutral-500 py-12">Content coming soon.</p>
      )}
    </SubpageContainer>
  );
}

/* ============ SERMONS ============ */
function detectEmbed(url?: string): { kind: "youtube" | "vimeo" | "spotify" | "audio" | "link"; src?: string } {
  if (!url) return { kind: "link" };
  const u = url.trim();
  const yt = u.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([A-Za-z0-9_-]{6,})/);
  if (yt) return { kind: "youtube", src: `https://www.youtube.com/embed/${yt[1]}` };
  const vm = u.match(/vimeo\.com\/(\d+)/);
  if (vm) return { kind: "vimeo", src: `https://player.vimeo.com/video/${vm[1]}` };
  if (u.includes("open.spotify.com/")) {
    return { kind: "spotify", src: u.replace("open.spotify.com/", "open.spotify.com/embed/") };
  }
  if (/\.(mp3|m4a|wav|ogg)(\?|$)/i.test(u)) return { kind: "audio", src: u };
  return { kind: "link" };
}

export function SermonsPage({ meta }: { meta: SiteMeta }) {
  const color = meta.primaryColor || "#0F2A44";
  const sermons = (meta.content.sermons || []).slice().sort((a, b) => (b.date || "").localeCompare(a.date || ""));
  const [query, setQuery] = useState("");
  const filtered = useMemo(
    () =>
      sermons.filter((s) => {
        const q = query.trim().toLowerCase();
        if (!q) return true;
        return [s.title, s.speaker, s.series, s.description]
          .filter(Boolean)
          .some((f) => (f as string).toLowerCase().includes(q));
      }),
    [sermons, query],
  );
  return (
    <SubpageContainer meta={meta} eyebrow="Messages" title="Sermon Library">
      {sermons.length > 0 && (
        <div className="mb-8">
          <Input
            placeholder="Search sermons, speakers, series..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="max-w-md mx-auto"
          />
        </div>
      )}
      {filtered.length === 0 ? (
        <p className="text-center text-neutral-500 py-12">
          {sermons.length === 0 ? "Sermons will appear here soon." : "No sermons match your search."}
        </p>
      ) : (
        <div className="space-y-8">
          {filtered.map((s, i) => {
            const embed = detectEmbed(s.media_url);
            return (
              <Card key={i} className="overflow-hidden border-0 shadow-sm">
                <div className="grid md:grid-cols-[300px_1fr]">
                  <div className="bg-black aspect-video md:aspect-auto relative">
                    {embed.kind === "youtube" || embed.kind === "vimeo" ? (
                      <iframe
                        src={embed.src}
                        className="w-full h-full min-h-[180px]"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                        title={s.title}
                        loading="lazy"
                      />
                    ) : embed.kind === "spotify" ? (
                      <iframe src={embed.src} className="w-full h-full min-h-[180px]" allow="encrypted-media" loading="lazy" title={s.title} />
                    ) : embed.kind === "audio" ? (
                      <div className="w-full h-full flex items-center justify-center p-4 bg-neutral-900">
                        <audio src={embed.src} controls className="w-full" />
                      </div>
                    ) : s.thumbnail ? (
                      <img src={s.thumbnail} alt={s.title} className="w-full h-full object-cover" loading="lazy" />
                    ) : (
                      <div className="w-full h-full grid place-items-center" style={{ background: `linear-gradient(135deg, ${color}, ${color}88)` }}>
                        <Play className="w-16 h-16 text-white/70" />
                      </div>
                    )}
                  </div>
                  <div className="p-6">
                    {s.series && (
                      <div className="text-xs tracking-widest uppercase mb-2" style={{ color, fontFamily: FONT_STACKS.sans }}>
                        {s.series}
                      </div>
                    )}
                    <h3 className="text-2xl leading-tight mb-2" style={{ color }}>{s.title}</h3>
                    <div className="flex flex-wrap items-center gap-3 text-sm text-neutral-600 mb-3" style={{ fontFamily: FONT_STACKS.sans }}>
                      {s.speaker && <span className="inline-flex items-center gap-1"><User className="w-3 h-3" /> {s.speaker}</span>}
                      {s.date && <span className="inline-flex items-center gap-1"><Calendar className="w-3 h-3" /> {new Date(s.date).toLocaleDateString()}</span>}
                    </div>
                    {s.description && <p className="text-sm text-neutral-700 leading-relaxed">{s.description}</p>}
                    {embed.kind === "link" && s.media_url && (
                      <a href={s.media_url} target="_blank" rel="noreferrer" className="mt-3 inline-flex items-center gap-1 text-sm font-semibold hover:underline" style={{ color }}>
                        Listen / Watch →
                      </a>
                    )}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </SubpageContainer>
  );
}

/* ============ VISIT ============ */
export function VisitPage({ meta }: { meta: SiteMeta }) {
  const color = meta.primaryColor || "#0F2A44";
  const c = meta.content;
  const v = c.visit || {};
  const sections = [
    { icon: "🙌", title: "First Time Here?", body: v.first_time_message },
    { icon: "✨", title: "What to Expect", body: v.what_to_expect },
    { icon: "🚗", title: "Parking", body: v.parking },
    { icon: "🧒", title: "Kids & Family", body: v.kids },
    { icon: "👕", title: "Dress Code", body: v.dress_code },
  ].filter((s) => s.body);
  return (
    <SubpageContainer meta={meta} eyebrow="We Can't Wait to Meet You" title="Plan Your Visit">
      {c.service_times?.length ? (
        <section className="mb-12">
          <h2 className="text-xl uppercase tracking-widest mb-4" style={{ color, fontFamily: FONT_STACKS.sans }}>Service Times</h2>
          <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-4">
            {c.service_times.map((s, i) => (
              <div key={i} className="p-5 rounded-lg border" style={{ borderColor: `${color}33`, background: `${color}08` }}>
                <div className="text-2xl" style={{ color }}>{s.day}</div>
                <div className="text-neutral-700 mt-1">{s.time}</div>
                {s.title && <div className="text-sm text-neutral-500 mt-2">{s.title}</div>}
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {sections.length > 0 && (
        <section className="space-y-8 mb-12">
          {sections.map((s, i) => (
            <div key={i} className="border-l-4 pl-6" style={{ borderColor: color }}>
              <div className="text-2xl mb-2">{s.icon} <span className="text-2xl md:text-3xl align-middle" style={{ color }}>{s.title}</span></div>
              <p className="text-neutral-700 leading-relaxed whitespace-pre-line">{s.body}</p>
            </div>
          ))}
        </section>
      )}

      {(c.address || c.phone || c.email) && (
        <section className="mt-12 pt-8 border-t" style={{ borderColor: `${color}22` }}>
          <h2 className="text-xl uppercase tracking-widest mb-4" style={{ color, fontFamily: FONT_STACKS.sans }}>Find Us</h2>
          <div className="space-y-3 text-lg">
            {c.address && <div className="flex gap-3"><MapPin className="w-5 h-5 mt-1 shrink-0" style={{ color }} /><span>{c.address}</span></div>}
            {c.phone && <div className="flex gap-3"><Phone className="w-5 h-5 mt-1 shrink-0" style={{ color }} /><a href={`tel:${c.phone}`} className="hover:underline">{c.phone}</a></div>}
            {c.email && <div className="flex gap-3"><Mail className="w-5 h-5 mt-1 shrink-0" style={{ color }} /><a href={`mailto:${c.email}`} className="hover:underline">{c.email}</a></div>}
          </div>
        </section>
      )}

      {v.map_embed && (
        <section className="mt-8 aspect-video w-full overflow-hidden rounded-lg border" style={{ borderColor: `${color}22` }}>
          <iframe src={v.map_embed} className="w-full h-full" loading="lazy" title="Map" />
        </section>
      )}

      {sections.length === 0 && !c.service_times?.length && !c.address && (
        <p className="text-center text-neutral-500 py-12">Visit info coming soon.</p>
      )}
    </SubpageContainer>
  );
}

/* ============ CONTACT + PRAYER + NEWSLETTER ============ */
const prayerSchema = z.object({
  name: z.string().trim().min(1).max(120),
  email: z.string().trim().email().max(255).optional().or(z.literal("")),
  phone: z.string().trim().max(40).optional().or(z.literal("")),
  message: z.string().trim().min(5).max(2000),
  is_private: z.boolean(),
});
const newsletterSchema = z.object({
  email: z.string().trim().email().max(255),
  name: z.string().trim().max(120).optional().or(z.literal("")),
});

export function ContactPage({ meta, tenantId }: { meta: SiteMeta; tenantId: string }) {
  const color = meta.primaryColor || "#0F2A44";
  const c = meta.content;
  const showPrayer = c.prayer_enabled !== false;
  const showNewsletter = c.newsletter_enabled !== false;

  const [prayer, setPrayer] = useState({ name: "", email: "", phone: "", message: "", is_private: true });
  const [nl, setNl] = useState({ email: "", name: "" });
  const [prayerSubmitting, setPrayerSubmitting] = useState(false);
  const [nlSubmitting, setNlSubmitting] = useState(false);
  const [prayerDone, setPrayerDone] = useState(false);
  const [nlDone, setNlDone] = useState(false);

  const submitPrayer = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = prayerSchema.safeParse(prayer);
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message || "Please check the form");
      return;
    }
    setPrayerSubmitting(true);
    const { error } = await supabase.from("prayer_requests").insert({
      tenant_id: tenantId,
      name: parsed.data.name,
      email: parsed.data.email || null,
      phone: parsed.data.phone || null,
      message: parsed.data.message,
      is_private: parsed.data.is_private,
      status: "new",
    });
    setPrayerSubmitting(false);
    if (error) {
      toast.error("Could not submit your request. Please try again.");
    } else {
      setPrayerDone(true);
      toast.success("Your prayer request has been received. We are praying with you.");
    }
  };

  const submitNewsletter = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = newsletterSchema.safeParse(nl);
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message || "Please enter a valid email");
      return;
    }
    setNlSubmitting(true);
    const { error } = await supabase.from("newsletter_subscribers").insert({
      tenant_id: tenantId,
      email: parsed.data.email,
      name: parsed.data.name || null,
      status: "active",
      source: "website",
    });
    setNlSubmitting(false);
    if (error) {
      if ((error as any).code === "23505") {
        toast.info("You're already subscribed. Thank you!");
        setNlDone(true);
      } else {
        toast.error("Could not subscribe. Please try again.");
      }
    } else {
      setNlDone(true);
      toast.success("You're subscribed! Watch your inbox for updates.");
    }
  };

  return (
    <SubpageContainer meta={meta} eyebrow="Get in Touch" title="Contact Us">
      <div className="grid md:grid-cols-2 gap-10">
        <section>
          <h2 className="text-2xl mb-4" style={{ color }}>Reach Out</h2>
          <div className="space-y-3 text-neutral-700">
            {c.address && <div className="flex gap-3"><MapPin className="w-5 h-5 mt-1 shrink-0" style={{ color }} /><span>{c.address}</span></div>}
            {c.phone && <div className="flex gap-3"><Phone className="w-5 h-5 mt-1 shrink-0" style={{ color }} /><a href={`tel:${c.phone}`} className="hover:underline">{c.phone}</a></div>}
            {c.email && <div className="flex gap-3"><Mail className="w-5 h-5 mt-1 shrink-0" style={{ color }} /><a href={`mailto:${c.email}`} className="hover:underline">{c.email}</a></div>}
          </div>

          {showNewsletter && (
            <div className="mt-10 p-6 rounded-lg border" style={{ borderColor: `${color}33`, background: `${color}05` }}>
              <div className="flex items-center gap-2 mb-2">
                <Send className="w-4 h-4" style={{ color }} />
                <h3 className="text-lg font-semibold" style={{ color }}>Stay Connected</h3>
              </div>
              <p className="text-sm text-neutral-600 mb-4">Get updates, encouragement, and event news in your inbox.</p>
              {nlDone ? (
                <p className="text-sm font-semibold" style={{ color }}>✓ Thank you for subscribing.</p>
              ) : (
                <form onSubmit={submitNewsletter} className="space-y-2">
                  <Input placeholder="Your name (optional)" value={nl.name} onChange={(e) => setNl({ ...nl, name: e.target.value })} maxLength={120} />
                  <Input type="email" placeholder="Email address" required value={nl.email} onChange={(e) => setNl({ ...nl, email: e.target.value })} maxLength={255} />
                  <Button type="submit" disabled={nlSubmitting} className="w-full text-white" style={{ background: color }}>
                    {nlSubmitting ? "Subscribing..." : "Subscribe"}
                  </Button>
                </form>
              )}
            </div>
          )}
        </section>

        {showPrayer && (
          <section>
            <div className="flex items-center gap-2 mb-2">
              <Heart className="w-5 h-5" style={{ color }} />
              <h2 className="text-2xl" style={{ color }}>Prayer Request</h2>
            </div>
            <p className="text-sm text-neutral-600 mb-4">Share what's on your heart. Our team will be praying with you.</p>
            {prayerDone ? (
              <div className="p-6 rounded-lg border text-center" style={{ borderColor: `${color}33`, background: `${color}08` }}>
                <p className="font-semibold" style={{ color }}>Thank you.</p>
                <p className="text-sm text-neutral-600 mt-1">Your request has been received.</p>
              </div>
            ) : (
              <form onSubmit={submitPrayer} className="space-y-3">
                <div>
                  <Label className="text-xs">Your name *</Label>
                  <Input required value={prayer.name} onChange={(e) => setPrayer({ ...prayer, name: e.target.value })} maxLength={120} />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-xs">Email (optional)</Label>
                    <Input type="email" value={prayer.email} onChange={(e) => setPrayer({ ...prayer, email: e.target.value })} maxLength={255} />
                  </div>
                  <div>
                    <Label className="text-xs">Phone (optional)</Label>
                    <Input value={prayer.phone} onChange={(e) => setPrayer({ ...prayer, phone: e.target.value })} maxLength={40} />
                  </div>
                </div>
                <div>
                  <Label className="text-xs">Your request *</Label>
                  <Textarea required rows={5} value={prayer.message} onChange={(e) => setPrayer({ ...prayer, message: e.target.value })} maxLength={2000} />
                </div>
                <div className="flex items-center justify-between gap-2 py-1">
                  <Label className="text-xs flex-1">Keep this private (only pastoral team sees it)</Label>
                  <Switch checked={prayer.is_private} onCheckedChange={(v) => setPrayer({ ...prayer, is_private: v })} />
                </div>
                <Button type="submit" disabled={prayerSubmitting} className="w-full text-white" style={{ background: color }}>
                  {prayerSubmitting ? "Sending..." : "Submit Prayer Request"}
                </Button>
              </form>
            )}
          </section>
        )}
      </div>
    </SubpageContainer>
  );
}
