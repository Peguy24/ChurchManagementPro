import { useEffect, useState } from "react";
import Layout from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, Search, Globe, CalendarClock } from "lucide-react";

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

const DURATION_PRESETS = [
  { value: "30", label: "30 days" },
  { value: "60", label: "60 days" },
  { value: "90", label: "3 months" },
  { value: "180", label: "6 months" },
  { value: "365", label: "1 year" },
  { value: "730", label: "2 years" },
  { value: "unlimited", label: "Unlimited (no expiry)" },
  { value: "custom", label: "Custom date…" },
];

function computeEnd(duration: string, customDate?: string): string | null {
  if (duration === "unlimited") return null;
  if (duration === "custom") return customDate ? new Date(customDate).toISOString() : null;
  const days = parseInt(duration, 10);
  return new Date(Date.now() + days * 86400 * 1000).toISOString();
}

export default function WebsiteAddonsAdmin() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  // Grant dialog
  const [grantOpen, setGrantOpen] = useState(false);
  const [grantTarget, setGrantTarget] = useState<{ id: string; name: string } | null>(null);
  const [duration, setDuration] = useState("365");
  const [customDate, setCustomDate] = useState("");

  // Extend dialog
  const [extendOpen, setExtendOpen] = useState(false);
  const [extendRow, setExtendRow] = useState<Row | null>(null);

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

  const revoke = async (row: Row) => {
    const { error } = await supabase
      .from("website_addon_subscriptions")
      .update({ managed_by_admin: true, status: "cancelled", current_period_end: null })
      .eq("id", row.id);
    if (error) toast.error(error.message);
    else { toast.success("Revoked"); load(); }
  };

  const openGrant = (t: { id: string; name: string }) => {
    setGrantTarget(t);
    setDuration("365");
    setCustomDate("");
    setGrantOpen(true);
  };

  const confirmGrant = async () => {
    if (!grantTarget) return;
    if (duration === "custom" && !customDate) { toast.error("Pick a date"); return; }
    const end = computeEnd(duration, customDate);
    const { error } = await supabase.from("website_addon_subscriptions").upsert(
      {
        tenant_id: grantTarget.id,
        managed_by_admin: true,
        status: "active",
        current_period_end: end,
      },
      { onConflict: "tenant_id" },
    );
    if (error) toast.error(error.message);
    else {
      supabase.functions.invoke("notify-tenant-comp-action", {
        body: { tenantId: grantTarget.id, action: "addon_granted", expiresAt: end },
      }).catch((e) => console.error("notify addon_granted failed", e));
      toast.success(end ? `Access granted until ${new Date(end).toLocaleDateString()}` : "Unlimited access granted");
      setGrantOpen(false);
      load();
    }
  };

  const openExtend = (row: Row) => {
    setExtendRow(row);
    setDuration("30");
    setCustomDate("");
    setExtendOpen(true);
  };

  const confirmExtend = async () => {
    if (!extendRow) return;
    if (duration === "custom" && !customDate) { toast.error("Pick a date"); return; }
    const end = computeEnd(duration, customDate);
    const { error } = await supabase
      .from("website_addon_subscriptions")
      .update({
        managed_by_admin: true,
        status: "active",
        current_period_end: end,
      })
      .eq("id", extendRow.id);
    if (error) toast.error(error.message);
    else {
      toast.success(end ? `Extended to ${new Date(end).toLocaleDateString()}` : "Set to unlimited");
      setExtendOpen(false);
      load();
    }
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
          <p className="text-muted-foreground">Grant complimentary access with a custom duration — independent of the church's plan.</p>
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
                    <Button size="sm" onClick={() => openGrant(t)}>Grant access…</Button>
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
                    <TableHead>Expires</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((r) => {
                    const expired = r.current_period_end && new Date(r.current_period_end) < new Date();
                    return (
                      <TableRow key={r.id}>
                        <TableCell>
                          <div className="font-medium">{r.tenant?.name || r.tenant_id}</div>
                          {r.tenant?.slug && <div className="text-xs text-muted-foreground">/site/{r.tenant.slug}</div>}
                        </TableCell>
                        <TableCell>
                          <Badge variant={r.status === "active" ? "default" : "secondary"}>{r.status}</Badge>
                          {expired && r.status === "active" && <Badge variant="destructive" className="ml-2">expired</Badge>}
                        </TableCell>
                        <TableCell>{r.managed_by_admin ? <Badge variant="outline">Comp</Badge> : <Badge variant="outline">Stripe</Badge>}</TableCell>
                        <TableCell className="text-sm">
                          {r.current_period_end ? new Date(r.current_period_end).toLocaleDateString() : (r.managed_by_admin && r.status === "active" ? "Unlimited" : "—")}
                        </TableCell>
                        <TableCell className="text-right space-x-2">
                          {r.managed_by_admin && (
                            <Button size="sm" variant="outline" onClick={() => openExtend(r)}>
                              <CalendarClock className="w-3 h-3 mr-1" /> Change duration
                            </Button>
                          )}
                          {r.managed_by_admin && r.status === "active" && (
                            <Button size="sm" variant="outline" onClick={() => revoke(r)}>Revoke</Button>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {!filtered.length && (
                    <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">No subscriptions yet.</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Grant dialog */}
      <Dialog open={grantOpen} onOpenChange={setGrantOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Grant website add-on</DialogTitle>
            <DialogDescription>
              Give <b>{grantTarget?.name}</b> complimentary access. Works even if they have no active plan.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <Label>Duration</Label>
            <Select value={duration} onValueChange={setDuration}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {DURATION_PRESETS.map((p) => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}
              </SelectContent>
            </Select>
            {duration === "custom" && (
              <div>
                <Label>Expires on</Label>
                <Input type="date" value={customDate} onChange={(e) => setCustomDate(e.target.value)} />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setGrantOpen(false)}>Cancel</Button>
            <Button onClick={confirmGrant}>Grant access</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Extend dialog */}
      <Dialog open={extendOpen} onOpenChange={setExtendOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Change duration</DialogTitle>
            <DialogDescription>
              Update expiry for <b>{extendRow?.tenant?.name}</b>. Choosing a preset sets the new expiry from today.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <Label>New duration</Label>
            <Select value={duration} onValueChange={setDuration}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {DURATION_PRESETS.map((p) => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}
              </SelectContent>
            </Select>
            {duration === "custom" && (
              <div>
                <Label>Expires on</Label>
                <Input type="date" value={customDate} onChange={(e) => setCustomDate(e.target.value)} />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setExtendOpen(false)}>Cancel</Button>
            <Button onClick={confirmExtend}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Layout>
  );
}
