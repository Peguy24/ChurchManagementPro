import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { renderTemplate, SiteContent } from "@/components/website/SiteTemplates";

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

  useEffect(() => {
    (async () => {
      if (!slug) { setLoading(false); return; }
      const { data: rows, error } = await supabase.rpc("get_public_website", { _slug: slug });
      if (!error && rows && rows.length > 0) {
        const r = rows[0];
        setData({
          name: r.tenant_name,
          logo_url: r.logo_url,
          primary_color: r.primary_color,
          template: r.template,
          content: (r.content as SiteContent) || {},
        });
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
  return renderTemplate(data.template, {
    name: data.name,
    logoUrl: data.logo_url,
    primaryColor: data.primary_color,
    content: data.content,
  });
}
