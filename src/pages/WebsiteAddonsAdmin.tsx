import { useEffect, useState } from "react";
import Layout from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, Search, Globe } from "lucide-react";

interface Row {
  id: string;
  tenant_id: string;
  status: string;
  managed_by_admin: boolean;
  current_period_end: string | null;
  stripe_subscription_id: string | null;
  updated_at: string;
  tenant?: { name: string; slug: string | null } | null;
}

export default function WebsiteAddonsAdmin() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("website_addon_subscriptions")
      .select("*, tenant:tenants(name, slug)")
      .order("updated_at", { ascending: false });
    if (error) toast.error(error.message);
    else setRows((data as any) || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const toggleManaged = async (row: Row, active: boolean) => {
    const { error } = await supabase
      .from("website_addon_subscriptions")
      .update({
        managed_by_admin: true,
        status: active ? "active" : "cancelled",
        current_period_end: active ? new Date(Date.now() + 365 * 86400 * 1000).toISOString() : null,
      })
      .eq("id", row.id);
    if (error) toast.error(error.message);
    else { toast.success(active ? "Granted free access" : "Revoked"); load(); }
  };

  const grantToTenant = async (tenantId: string) => {
    const { error } = await supabase.from("website_addon_subscriptions").upsert(
      {
        tenant_id: tenantId,
        managed_by_admin: true,
        status: "active",
        current_period_end: new Date(Date.now() + 365 * 86400 * 1000).toISOString(),
      },
      { onConflict: "tenant_id" },
    );
    if (error) toast.error(error.message);
    else { toast.success("Access granted"); load(); }
  };

  const [tenantSearch, setTenantSearch] = useState("");
  const [tenantResults, setTenantResults] = useState<{ id: string; name: string }[]>([]);
  useEffect(() => {
    if (tenantSearch.length < 2) { setTenantResults([]); return; }
    (async () => {
      const { data } = await supabase.from("tenants").select("id, name").ilike("name", `%${tenantSearch}%`).limit(10);
      setTenantResults(data || []);
    })();
  }, [tenantSearch]);

  const filtered = rows.filter((r) =>
    !search || r.tenant?.name?.toLowerCase().includes(search.toLowerCase()) || r.tenant?.slug?.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <Layout>
      <div className="max-w-6xl mx-auto py-6 space-y-6">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2"><Globe className="w-7 h-7 text-primary" /> Website Add-On Subscriptions</h1>
          <p className="text-muted-foreground">Manage $15/month church website subscriptions and grant complimentary access.</p>
        </div>

        <Card>
          <CardHeader><CardTitle>Grant free access</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <Input placeholder="Search tenant by name..." value={tenantSearch} onChange={(e) => setTenantSearch(e.target.value)} />
            {tenantResults.length > 0 && (
              <div className="border rounded divide-y">
                {tenantResults.map((t) => (
                  <div key={t.id} className="flex items-center justify-between p-2">
                    <span>{t.name}</span>
                    <Button size="sm" onClick={() => grantToTenant(t.id)}>Grant access</Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Active subscriptions</CardTitle>
            <div className="relative w-64">
              <Search className="w-4 h-4 absolute left-2 top-3 text-muted-foreground" />
              <Input className="pl-8" placeholder="Filter..." value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin" /></div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Church</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Source</TableHead>
                    <TableHead>Renews</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell>
                        <div className="font-medium">{r.tenant?.name || r.tenant_id}</div>
                        {r.tenant?.slug && <div className="text-xs text-muted-foreground">/site/{r.tenant.slug}</div>}
                      </TableCell>
                      <TableCell><Badge variant={r.status === "active" ? "default" : "secondary"}>{r.status}</Badge></TableCell>
                      <TableCell>{r.managed_by_admin ? <Badge variant="outline">Comp</Badge> : <Badge variant="outline">Stripe</Badge>}</TableCell>
                      <TableCell className="text-sm">{r.current_period_end ? new Date(r.current_period_end).toLocaleDateString() : "—"}</TableCell>
                      <TableCell className="text-right">
                        {r.managed_by_admin && r.status === "active" && (
                          <Button size="sm" variant="outline" onClick={() => toggleManaged(r, false)}>Revoke</Button>
                        )}
                        {r.managed_by_admin && r.status !== "active" && (
                          <Button size="sm" onClick={() => toggleManaged(r, true)}>Reactivate</Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                  {!filtered.length && (
                    <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">No subscriptions yet.</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
