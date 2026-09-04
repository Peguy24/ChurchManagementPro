import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { AlertTriangle, Loader2, ShieldCheck, RefreshCw } from "lucide-react";

interface Alert {
  id: string;
  tenant_id: string | null;
  code: string | null;
  alert_type: string;
  severity: string;
  status: string;
  details: Record<string, any>;
  detected_at: string;
  tenant_name?: string;
}

const TYPE_LABEL: Record<string, string> = {
  high_clicks_no_conversion: "Many clicks, no sign-ups",
  repeated_visitor_clicks: "Same visitor clicking repeatedly",
  click_spike: "Sudden click spike",
};

export default function ReferralAnomalyPanel() {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await (supabase as any)
        .from("referral_anomaly_alerts")
        .select("*")
        .order("detected_at", { ascending: false })
        .limit(100);
      const rows = (data || []) as Alert[];
      const ids = Array.from(new Set(rows.map((r) => r.tenant_id).filter(Boolean)));
      if (ids.length) {
        const { data: tenants } = await (supabase as any).from("tenants").select("id, name").in("id", ids);
        const map = new Map<string, string>((tenants || []).map((t: any) => [t.id as string, t.name as string]));
        rows.forEach((r) => (r.tenant_name = (r.tenant_id ? map.get(r.tenant_id) : undefined) || "—"));
      }
      setAlerts(rows);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const scan = async () => {
    setScanning(true);
    try {
      const { data, error } = await (supabase as any).rpc("detect_referral_anomalies", { _days: 7 });
      if (error) throw error;
      const created = Number(data) || 0;
      toast.success(created ? `${created} new alert(s) detected` : "No new suspicious activity found");
      await load();
    } catch (e: any) {
      toast.error(e?.message || "Scan failed");
    } finally {
      setScanning(false);
    }
  };

  const setStatus = async (id: string, status: "acknowledged" | "dismissed") => {
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await (supabase as any)
      .from("referral_anomaly_alerts")
      .update({ status, acknowledged_by: user?.id ?? null, acknowledged_at: new Date().toISOString() })
      .eq("id", id);
    if (error) return toast.error(error.message);
    await load();
  };

  const openCount = alerts.filter((a) => a.status === "open").length;

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" /> Suspicious referral activity
              {openCount > 0 && <Badge variant="destructive">{openCount} open</Badge>}
            </CardTitle>
            <CardDescription>
              Flags unusual patterns such as many clicks with no sign-ups, repeated clicks from one visitor, or sudden spikes.
            </CardDescription>
          </div>
          <Button size="sm" variant="outline" onClick={scan} disabled={scanning}>
            {scanning ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-2" />}
            Run scan
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <Loader2 className="h-5 w-5 animate-spin" />
        ) : alerts.length === 0 ? (
          <p className="flex items-center gap-2 text-sm text-muted-foreground">
            <ShieldCheck className="h-4 w-4 text-emerald-500" /> No suspicious activity recorded.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Church</TableHead>
                  <TableHead>Code</TableHead>
                  <TableHead>Issue</TableHead>
                  <TableHead>Details</TableHead>
                  <TableHead>Detected</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {alerts.map((a) => (
                  <TableRow key={a.id}>
                    <TableCell className="font-medium">{a.tenant_name || "—"}</TableCell>
                    <TableCell className="font-mono text-xs">{a.code || "—"}</TableCell>
                    <TableCell>
                      <Badge variant={a.severity === "high" ? "destructive" : "secondary"}>
                        {TYPE_LABEL[a.alert_type] || a.alert_type}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {Object.entries(a.details || {})
                        .map(([k, v]) => `${k.replace(/_/g, " ")}: ${v}`)
                        .join(", ")}
                    </TableCell>
                    <TableCell>{new Date(a.detected_at).toLocaleString()}</TableCell>
                    <TableCell>
                      <Badge variant={a.status === "open" ? "outline" : "secondary"}>{a.status}</Badge>
                    </TableCell>
                    <TableCell className="text-right space-x-2">
                      {a.status === "open" && (
                        <>
                          <Button size="sm" variant="outline" onClick={() => setStatus(a.id, "acknowledged")}>
                            Acknowledge
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => setStatus(a.id, "dismissed")}>
                            Dismiss
                          </Button>
                        </>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
