import { useState, useEffect } from "react";
import Layout from "@/components/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Palette, Search, ExternalLink } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/contexts/LanguageContext";
import { useNavigate } from "react-router-dom";
import { Skeleton } from "@/components/ui/skeleton";

interface TenantBranding {
  id: string;
  name: string;
  logo_url: string | null;
  primary_color: string | null;
  slug: string | null;
}

export default function SuperAdminWhiteLabel() {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [tenants, setTenants] = useState<TenantBranding[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    const fetchTenants = async () => {
      const { data } = await supabase
        .from("tenants")
        .select("id, name, logo_url, primary_color, slug")
        .order("name");
      setTenants(data || []);
      setLoading(false);
    };
    fetchTenants();
  }, []);

  const filtered = tenants.filter((t) =>
    t.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">{t("superAdmin.whiteLabel.title")}</h1>
          <p className="text-muted-foreground">{t("superAdmin.whiteLabel.subtitle")}</p>
        </div>

        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={t("common.search")}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        {loading ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <Card key={i}>
                <CardContent className="p-6 space-y-3">
                  <Skeleton className="h-6 w-3/4" />
                  <Skeleton className="h-4 w-1/2" />
                  <Skeleton className="h-8 w-full" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filtered.map((tenant) => (
              <Card key={tenant.id} className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg truncate">{tenant.name}</CardTitle>
                    {tenant.primary_color && (
                      <div
                        className="h-6 w-6 rounded-full border border-border shrink-0"
                        style={{ backgroundColor: tenant.primary_color }}
                        title={tenant.primary_color}
                      />
                    )}
                  </div>
                  <CardDescription className="truncate">
                    {tenant.slug ? `/${tenant.slug}` : "—"}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center gap-2 flex-wrap">
                    {tenant.logo_url ? (
                      <Badge variant="secondary" className="text-xs">Logo ✓</Badge>
                    ) : (
                      <Badge variant="outline" className="text-xs">Logo ✗</Badge>
                    )}
                    {tenant.primary_color ? (
                      <Badge variant="secondary" className="text-xs">{tenant.primary_color}</Badge>
                    ) : (
                      <Badge variant="outline" className="text-xs">Default</Badge>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
            {filtered.length === 0 && (
              <p className="text-muted-foreground col-span-full text-center py-8">
                {t("common.noResults")}
              </p>
            )}
          </div>
        )}
      </div>
    </Layout>
  );
}
