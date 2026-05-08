import { useEffect, useState } from "react";
import Layout from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, FileText, ShieldCheck, ShieldX, RotateCcw, Download } from "lucide-react";
import { exportRefundsCSV, exportRefundsPDF, filterRefundsByPeriod, type RefundPeriod } from "@/utils/exportTaxRefunds";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface Row {
  id: string;
  tenant_id: string;
  status: "none" | "pending" | "approved" | "rejected";
  certificate_url: string | null;
  state: string | null;
  ein_number: string | null;
  rejection_reason: string | null;
  submitted_at: string | null;
  reviewed_at: string | null;
  tenant?: { name: string; contact_email: string | null };
}

interface RefundTotal {
  tenant_id: string;
  total: number;
  count: number;
  currency: string;
}

export default function TaxExemptionReviews() {
  const [rows, setRows] = useState<Row[]>([]);
  const [refunds, setRefunds] = useState<Record<string, RefundTotal>>({});
  const [refundRowsByTenant, setRefundRowsByTenant] = useState<Record<string, any[]>>({});
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState<string | null>(null);
  const [rejectFor, setRejectFor] = useState<Row | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("tenant_tax_exemptions")
      .select("*, tenant:tenants(name, contact_email)")
      .order("submitted_at", { ascending: false });
    if (error) toast.error(error.message);
    else setRows((data ?? []) as any);

    const { data: refundRows } = await supabase
      .from("tax_exemption_refunds")
      .select("tenant_id, tax_amount_refunded, currency, status, created_at, stripe_invoice_id, stripe_refund_id, failure_reason")
      .order("created_at", { ascending: false });
    const totals: Record<string, RefundTotal> = {};
    const byTenant: Record<string, any[]> = {};
    (refundRows ?? []).forEach((r: any) => {
      (byTenant[r.tenant_id] ||= []).push(r);
      if (r.status !== "succeeded") return;
      const t = totals[r.tenant_id] ?? { tenant_id: r.tenant_id, total: 0, count: 0, currency: r.currency };
      t.total += Number(r.tax_amount_refunded);
      t.count += 1;
      totals[r.tenant_id] = t;
    });
    setRefunds(totals);
    setRefundRowsByTenant(byTenant);

    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const openCert = async (path: string) => {
    const { data } = await supabase.storage
      .from("tax-exemption-certificates")
      .createSignedUrl(path, 60 * 10);
    if (data?.signedUrl) window.open(data.signedUrl, "_blank");
  };

  const action = async (row: Row, act: "approve" | "reject" | "revoke", reason?: string) => {
    setWorking(row.id);
    const { data, error } = await supabase.functions.invoke("update-tax-exempt-status", {
      body: { tenant_id: row.tenant_id, action: act, rejection_reason: reason },
    });
    setWorking(null);
    if (error) {
      toast.error(error.message);
      return;
    }
    if (act === "approve") {
      const total = Number((data as any)?.refund_total ?? 0);
      const count = Number((data as any)?.refund_count ?? 0);
      const cur = String((data as any)?.currency ?? "usd").toUpperCase();
      if (count > 0) {
        toast.success(`Approved. Refunded ${cur} ${total.toFixed(2)} across ${count} invoice${count > 1 ? "s" : ""}.`);
      } else {
        toast.success("Approved. No tax to refund.");
      }
    } else {
      toast.success(`Exemption ${act}d`);
    }
    setRejectFor(null);
    setRejectReason("");
    load();
  };

  const badge = (s: Row["status"]) => {
    const v: any =
      s === "approved" ? "default" : s === "rejected" ? "destructive" : s === "pending" ? "secondary" : "outline";
    return <Badge variant={v}>{s}</Badge>;
  };

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <ShieldCheck className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold">Tax Exemption Reviews</h1>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Submitted Certificates</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : rows.length === 0 ? (
              <p className="text-muted-foreground text-sm">No exemption requests yet.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Church</TableHead>
                    <TableHead>State</TableHead>
                    <TableHead>EIN</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Submitted</TableHead>
                    <TableHead>Certificate</TableHead>
                    <TableHead>Tax Refunded</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell className="font-medium">
                        {r.tenant?.name}
                        <div className="text-xs text-muted-foreground">{r.tenant?.contact_email}</div>
                      </TableCell>
                      <TableCell>{r.state || "—"}</TableCell>
                      <TableCell>{r.ein_number || "—"}</TableCell>
                      <TableCell>{badge(r.status)}</TableCell>
                      <TableCell className="text-xs">
                        {r.submitted_at ? new Date(r.submitted_at).toLocaleDateString() : "—"}
                      </TableCell>
                      <TableCell>
                        {r.certificate_url ? (
                          <Button size="sm" variant="ghost" onClick={() => openCert(r.certificate_url!)}>
                            <FileText className="h-4 w-4 mr-1" />
                            View
                          </Button>
                        ) : (
                          "—"
                        )}
                      </TableCell>
                      <TableCell className="text-xs">
                        {refunds[r.tenant_id] ? (
                          <div className="space-y-1">
                            <span className="font-medium">
                              {refunds[r.tenant_id].currency.toUpperCase()} {refunds[r.tenant_id].total.toFixed(2)}
                              <span className="text-muted-foreground ml-1">({refunds[r.tenant_id].count})</span>
                            </span>
                            <div className="flex gap-1">
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-6 px-2 text-xs"
                                onClick={() => exportRefundsCSV(r.tenant?.name || "Church", refundRowsByTenant[r.tenant_id] || [])}
                              >
                                <Download className="h-3 w-3 mr-1" />CSV
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-6 px-2 text-xs"
                                onClick={() => exportRefundsPDF(r.tenant?.name || "Church", refundRowsByTenant[r.tenant_id] || [])}
                              >
                                <Download className="h-3 w-3 mr-1" />PDF
                              </Button>
                            </div>
                          </div>
                        ) : (
                          "—"
                        )}
                      </TableCell>
                      <TableCell className="text-right space-x-2">
                        {r.status === "approved" ? (
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={working === r.id}
                            onClick={() => action(r, "revoke")}
                          >
                            <RotateCcw className="h-4 w-4 mr-1" />
                            Revoke
                          </Button>
                        ) : (
                          <>
                            <Button
                              size="sm"
                              disabled={working === r.id}
                              onClick={() => action(r, "approve")}
                            >
                              <ShieldCheck className="h-4 w-4 mr-1" />
                              Approve
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              disabled={working === r.id}
                              onClick={() => setRejectFor(r)}
                            >
                              <ShieldX className="h-4 w-4 mr-1" />
                              Reject
                            </Button>
                          </>
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

      <Dialog open={!!rejectFor} onOpenChange={(o) => !o && setRejectFor(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Exemption</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <Label>Reason</Label>
            <Textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Provide a clear reason the church can act on…"
              rows={4}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectFor(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={!rejectReason.trim() || working === rejectFor?.id}
              onClick={() => rejectFor && action(rejectFor, "reject", rejectReason.trim())}
            >
              Reject
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Layout>
  );
}
