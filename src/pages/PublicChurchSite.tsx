import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { renderTemplate, SiteContent } from "@/components/website/SiteTemplates";
import { JsonLd } from "@/components/JsonLd";
import { currentHostname, isTenantHost } from "@/lib/tenantHost";

const DAY_MAP: Record<string, string> = {
  sunday: "Su", sun: "Su", dimanche: "Su", dimanch: "Su",
  monday: "Mo", mon: "Mo", lundi: "Mo", lendi: "Mo",
  tuesday: "Tu", tue: "Tu", mardi: "Tu", madi: "Tu",
  wednesday: "We", wed: "We", mercredi: "We", mekredi: "We",
  thursday: "Th", thu: "Th", jeudi: "Th", jedi: "Th",
  friday: "Fr", fri: "Fr", vendredi: "Fr", vandredi: "Fr",
  saturday: "Sa", sat: "Sa", samedi: "Sa", samdi: "Sa",
};
const DAY_FULL: Record<string, string> = {
  Su: "Sunday", Mo: "Monday", Tu: "Tuesday", We: "Wednesday",
  Th: "Thursday", Fr: "Friday", Sa: "Saturday",
};

function normalizeTime(t?: string): string | undefined {
  if (!t) return undefined;
  const m = t.trim().match(/^(\d{1,2}):(\d{2})/);
  if (!m) return undefined;
  return `${m[1].padStart(2, "0")}:${m[2]}`;
}

function toOpeningHours(services?: SiteContent["service_times"]) {
  if (!services?.length) return undefined;
  const specs: any[] = [];
  for (const s of services) {
    const day = DAY_MAP[(s.day || "").trim().toLowerCase()];
    const opens = normalizeTime(s.time);
    if (!day || !opens) continue;
    specs.push({ "@type": "OpeningHoursSpecification", dayOfWeek: day, opens });
  }
  return specs.length ? specs : undefined;
}

function toServiceEvents(services: SiteContent["service_times"] | undefined, churchName: string, url: string, address?: string) {
  if (!services?.length) return [];
  const dayIdx: Record<string, number> = { Su: 0, Mo: 1, Tu: 2, We: 3, Th: 4, Fr: 5, Sa: 6 };
  const today = new Date();
  return services.slice(0, 7).map((s) => {
    const dayKey = DAY_MAP[(s.day || "").trim().toLowerCase()];
    const opens = normalizeTime(s.time);
    if (!dayKey || !opens) return null;
    const diff = (dayIdx[dayKey] - today.getDay() + 7) % 7 || 7;
    const d = new Date(today);
    d.setDate(today.getDate() + diff);
    const startDate = `${d.toISOString().slice(0, 10)}T${opens}`;
    return {
      "@type": "Event",
      name: s.title || `${DAY_FULL[dayKey]} Service`,
      startDate,
      eventSchedule: {
        "@type": "Schedule",
        repeatFrequency: "P1W",
        byDay: `https://schema.org/${DAY_FULL[dayKey]}`,
        startTime: opens,
      },
      eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
      eventStatus: "https://schema.org/EventScheduled",
      location: address
        ? { "@type": "Place", name: churchName, address }
        : { "@type": "Place", name: churchName },
      organizer: { "@type": "Church", name: churchName, url },
      offers: { "@type": "Offer", price: "0", priceCurrency: "USD", availability: "https://schema.org/InStock", url },
    };
  }).filter(Boolean) as any[];
}

export default function PublicChurchSite() {
  const { slug } = useParams<{ slug: string }>();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<{
    name: string;
    logo_url: string | null;
    primary_color: string | null;
    template: string;
    content: SiteContent;
  } | null>(null);

  const [givingEnabled, setGivingEnabled] = useState(false);

  useEffect(() => {
    (async () => {
      const hostname = currentHostname();
      const useHost = isTenantHost(hostname);
      if (!useHost && !slug) { setLoading(false); return; }

      // Fetch site by hostname (custom domain / subdomain) or by /site/:slug path
      const sitePromise = useHost
        ? supabase.rpc("get_public_website_by_hostname", { _hostname: hostname })
        : supabase.rpc("get_public_website", { _slug: slug! });

      const { data: rows, error } = await sitePromise;

      if (!error && rows && rows.length > 0) {
        const r = rows[0];
        const baseContent = (r.content as SiteContent) || {};

        // Now that we have the tenant, fetch giving config + gallery in parallel
        const [{ data: giving }, { data: media }] = await Promise.all([
          supabase.rpc("get_public_giving_config", { _slug: r.slug }),
          supabase
            .from("tenant_media")
            .select("public_url,caption,sort_order,created_at")
            .eq("tenant_id", r.tenant_id)
            .eq("category", "gallery")
            .not("public_url", "is", null)
            .order("sort_order", { ascending: true })
            .order("created_at", { ascending: false }),
        ]);

        const gallery = (media || [])
          .filter((m: any) => m.public_url)
          .map((m: any) => ({ url: m.public_url as string, caption: m.caption || undefined }));

        setData({
          name: r.tenant_name,
          logo_url: r.logo_url,
          primary_color: r.primary_color,
          template: r.template,
          content: { ...baseContent, gallery: gallery.length ? gallery : baseContent.gallery },
          slug: r.slug,
        });
        setGivingEnabled(!!(giving && giving.length > 0));
        document.title = r.tenant_name;
      }
      setLoading(false);
    })();
  }, [slug]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }
  if (!data) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-2 p-6 text-center">
        <h1 className="text-2xl font-semibold">Site not available</h1>
        <p className="text-muted-foreground">This church has not published a website yet.</p>
      </div>
    );
  }
  const siteUrl = typeof window !== "undefined" ? `${window.location.origin}/site/${slug}` : `/site/${slug}`;
  const openingHours = useMemo(() => toOpeningHours(data.content.service_times), [data.content.service_times]);
  const serviceEvents = useMemo(
    () => toServiceEvents(data.content.service_times, data.name, siteUrl, data.content.address),
    [data.content.service_times, data.name, siteUrl, data.content.address],
  );

  const orgJsonLd: Record<string, any> = {
    "@context": "https://schema.org",
    "@type": "Church",
    name: data.name,
    url: siteUrl,
    logo: data.logo_url || undefined,
    image: data.content.hero_image_url || data.logo_url || undefined,
    description: data.content.about || data.content.tagline || undefined,
    email: data.content.email || undefined,
    telephone: data.content.phone || undefined,
    address: data.content.address
      ? { "@type": "PostalAddress", streetAddress: data.content.address }
      : undefined,
    openingHoursSpecification: openingHours,
    sameAs: [
      data.content.social?.facebook,
      data.content.social?.instagram,
      data.content.social?.youtube,
    ].filter(Boolean),
  };

  return (
    <div className="relative">
      <JsonLd id="church-org" data={orgJsonLd} />
      {serviceEvents.length > 0 && <JsonLd id="church-services" data={serviceEvents} />}
      {renderTemplate(data.template, {
        name: data.name,
        logoUrl: data.logo_url,
        primaryColor: data.primary_color,
        content: data.content,
      })}
      {givingEnabled && (
        <a
          href={`/site/${slug}/give`}
          className="fixed bottom-6 right-6 z-50 inline-flex items-center gap-2 px-5 py-3 rounded-full shadow-lg text-white font-semibold hover:scale-105 transition-transform"
          style={{ backgroundColor: data.primary_color || "hsl(var(--primary))" }}
        >
          ❤ Donate
        </a>
      )}
    </div>
  );
}
