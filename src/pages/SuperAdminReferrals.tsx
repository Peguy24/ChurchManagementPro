import { useEffect, useState } from "react";
import Layout from "@/components/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, Gift, RefreshCw } from "lucide-react";

interface Row {
  id: string;
  referrer_tenant_id: string;
  referred_tenant_id: string;
  status: string;
  created_at: string;
  qualified_at: string | null;
  rewarded_at: string | null;
  referrer_name?: string;
  referred_name?: string;
  referral_code: string;
}

export default function SuperAdminReferrals() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [actingId, setActingId] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const { data: refs } = await (supabase as any)
        .from("referrals")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(500);
      if (!refs) { setRows([]); return; }
      const ids = Array.from(new Set(refs.flatMap((r: any) => [r.referrer_tenant_id, r.referred_tenant_id])));
      const { data: tenants } = await (supabase as any).from("tenants").select("id, name").in("id", ids);
      const nameMap = new Map((tenants || []).map((t: any) => [t.id, t.name]));
      setRows(refs.map((r: any) => ({
        ...r,
        referrer_name: nameMap.get(r.referrer_tenant_id) || "—",
        referred_name: nameMap.get(r.referred_tenant_id) || "—",
      })));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const manualQualify = async (referralId: string, referredTenantId: string) => {
    setActingId(referralId);
    try {
      const { error } = await supabase.functions.invoke("qualify-referral", {
        body: { referredTenantId, source: "manual_super_admin" },
      });
      if (error) throw error;
      toast.success("Referral qualified and rewards triggered");
      await load();
    } catch (e: any) {
      toast.error(e?.message || "Failed to qualify");
    } finally {
      setActingId(null);
    }
  };

  const variantFor = (s: string) =>
    s === "rewarded" ? "default" : s === "qualified" ? "secondary" : s === "rejected" || s === "expired" ? "destructive" : "outline";

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2"><Gift className="h-7 w-7 text-primary" /> Referrals</h1>
            <p className="text-muted-foreground mt-1">Monitor and manage church-to-church referrals.</p>
          </div>
          <Button variant="outline" onClick={load}><RefreshCw className="h-4 w-4 mr-2" /> Refresh</Button>
        </div>

        <Card>
          <CardHeader><CardTitle>All referrals</CardTitle><CardDescription>Most recent 500</CardDescription></CardHeader>
          <CardContent>
            {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : rows.length === 0 ? (
              <p className="text-sm text-muted-foreground">No referrals yet.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Referrer</TableHead>
                    <TableHead>Referred</TableHead>
                    <TableHead>Code</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead>Rewarded</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell>{r.referrer_name}</TableCell>
                      <TableCell>{r.referred_name}</TableCell>
                      <TableCell className="font-mono text-xs">{r.referral_code}</TableCell>
                      <TableCell><Badge variant={variantFor(r.status)}>{r.status}</Badge></TableCell>
                      <TableCell>{new Date(r.created_at).toLocaleDateString()}</TableCell>
                      <TableCell>{r.rewarded_at ? new Date(r.rewarded_at).toLocaleDateString() : "—"}</TableCell>
                      <TableCell className="text-right">
                        {(r.status === "pending" || r.status === "qualified") && (
                          <Button size="sm" variant="outline" disabled={actingId === r.id} onClick={() => manualQualify(r.id, r.referred_tenant_id)}>
                            {actingId === r.id ? <Loader2 className="h-3 w-3 animate-spin" /> : "Force qualify"}
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
