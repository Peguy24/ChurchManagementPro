import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, Upload, ShieldCheck, FileText, AlertCircle, Download } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentTenant } from "@/hooks/useCurrentTenant";
import { useLanguage } from "@/contexts/LanguageContext";
import { toast } from "sonner";
import { exportRefundsCSV, exportRefundsPDF, filterRefundsByPeriod, type RefundPeriod } from "@/utils/exportTaxRefunds";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type Status = "none" | "pending" | "approved" | "rejected";

interface Exemption {
  id: string;
  status: Status;
  certificate_url: string | null;
  state: string | null;
  ein_number: string | null;
  rejection_reason: string | null;
  expires_at: string | null;
  reviewed_at: string | null;
}

export default function TaxExemptionSection() {
  const { tenantId } = useCurrentTenant();
  const { t } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [exemption, setExemption] = useState<Exemption | null>(null);
  const [state, setState] = useState("");
  const [ein, setEin] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const [refunds, setRefunds] = useState<Array<{ id: string; tax_amount_refunded: number; currency: string; created_at: string; status: string; stripe_refund_id: string | null; stripe_invoice_id: string | null; failure_reason: string | null }>>([]);
  const [tenantName, setTenantName] = useState<string>("Church");

  const fetchData = async () => {
    if (!tenantId) return;
    setLoading(true);
    const { data } = await supabase
      .from("tenant_tax_exemptions")
      .select("*")
      .eq("tenant_id", tenantId)
      .maybeSingle();
    if (data) {
      setExemption(data as Exemption);
      setState(data.state ?? "");
      setEin(data.ein_number ?? "");
      if (data.certificate_url) {
        const { data: signed } = await supabase.storage
          .from("tax-exemption-certificates")
          .createSignedUrl(data.certificate_url, 60 * 60);
        setSignedUrl(signed?.signedUrl ?? null);
      }
    }
    const { data: refundData } = await supabase
      .from("tax_exemption_refunds")
      .select("id, tax_amount_refunded, currency, created_at, status, stripe_refund_id, stripe_invoice_id, failure_reason")
      .eq("tenant_id", tenantId)
      .order("created_at", { ascending: false });
    setRefunds((refundData ?? []) as any);
    const { data: tenantRow } = await supabase.from("tenants").select("name").eq("id", tenantId).maybeSingle();
    if (tenantRow?.name) setTenantName(tenantRow.name);
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, [tenantId]);

  const handleSubmit = async () => {
    if (!tenantId) return;
    if (!state.trim() || !ein.trim()) {
      toast.error(t("taxExemption.fillFields") || "Please fill state and EIN.");
      return;
    }
    if (!file && !exemption?.certificate_url) {
      toast.error(t("taxExemption.uploadRequired") || "Please upload a certificate.");
      return;
    }
    setSaving(true);
    try {
      let path = exemption?.certificate_url ?? null;
      if (file) {
        const ext = file.name.split(".").pop();
        path = `${tenantId}/cert-${Date.now()}.${ext}`;
        const { error: upErr } = await supabase.storage
          .from("tax-exemption-certificates")
          .upload(path, file, { upsert: true });
        if (upErr) throw upErr;
      }

      const payload = {
        tenant_id: tenantId,
        status: "pending" as Status,
        certificate_url: path,
        state: state.trim().toUpperCase(),
        ein_number: ein.trim(),
        submitted_at: new Date().toISOString(),
        rejection_reason: null,
      };
      const { error } = await supabase
        .from("tenant_tax_exemptions")
        .upsert(payload, { onConflict: "tenant_id" });
      if (error) throw error;

      toast.success(t("taxExemption.submitted") || "Submitted for review");
      setFile(null);
      await fetchData();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSaving(false);
    }
  };

  const statusBadge = (s: Status) => {
    const map: Record<Status, { label: string; variant: any }> = {
      none: { label: t("taxExemption.statusNone") || "Not submitted", variant: "secondary" },
      pending: { label: t("taxExemption.statusPending") || "Pending review", variant: "default" },
      approved: { label: t("taxExemption.statusApproved") || "Approved", variant: "default" },
      rejected: { label: t("taxExemption.statusRejected") || "Rejected", variant: "destructive" },
    };
    return <Badge variant={map[s].variant}>{map[s].label}</Badge>;
  };

  const status: Status = exemption?.status ?? "none";

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-primary" />
            <CardTitle>{t("taxExemption.title") || "Tax-Exempt Status"}</CardTitle>
          </div>
          {statusBadge(status)}
        </div>
        <CardDescription>
          {t("taxExemption.description") ||
            "Upload your 501(c)(3) or state tax-exemption certificate. Once approved by our team, sales tax will not be charged on your subscription."}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {loading ? (
          <Loader2 className="h-5 w-5 animate-spin" />
        ) : (
          <>
            {status === "approved" && (
              <Alert>
                <ShieldCheck className="h-4 w-4" />
                <AlertDescription>
                  {t("taxExemption.approvedNote") ||
                    "Your church is approved tax-exempt. Future invoices will not include sales tax."}
                </AlertDescription>
              </Alert>
            )}
            {refunds.length > 0 && (
              <div className="rounded-lg border bg-muted/30 p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="text-sm font-medium">
                    {t("taxExemption.refundsIssued") || "Refunds Issued"}
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => exportRefundsCSV(tenantName, refunds)}>
                      <Download className="h-3.5 w-3.5 mr-1" />
                      CSV
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => exportRefundsPDF(tenantName, refunds)}>
                      <Download className="h-3.5 w-3.5 mr-1" />
                      PDF
                    </Button>
                  </div>
                </div>
                <div className="text-xs text-muted-foreground">
                  {t("taxExemption.refundsNote") ||
                    "We automatically refunded sales tax charged before your exemption was approved."}
                </div>
                <ul className="space-y-1 text-sm">
                  {refunds.map((r) => (
                    <li key={r.id} className="flex items-center justify-between border-t pt-1">
                      <span className="text-muted-foreground">
                        {new Date(r.created_at).toLocaleDateString()}
                        {r.status === "failed" && (
                          <span className="ml-2 text-destructive">(failed)</span>
                        )}
                      </span>
                      <span className="font-medium">
                        {r.currency.toUpperCase()} {Number(r.tax_amount_refunded).toFixed(2)}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {status === "rejected" && exemption?.rejection_reason && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  {t("taxExemption.rejected") || "Rejected"}: {exemption.rejection_reason}
                </AlertDescription>
              </Alert>
            )}

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>{t("taxExemption.state") || "State (e.g. NJ)"}</Label>
                <Input
                  value={state}
                  onChange={(e) => setState(e.target.value)}
                  maxLength={2}
                  disabled={status === "approved"}
                  placeholder="NJ"
                />
              </div>
              <div className="space-y-2">
                <Label>{t("taxExemption.ein") || "EIN / Tax ID"}</Label>
                <Input
                  value={ein}
                  onChange={(e) => setEin(e.target.value)}
                  maxLength={32}
                  disabled={status === "approved"}
                  placeholder="XX-XXXXXXX"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>{t("taxExemption.certificate") || "Exemption certificate (PDF or image)"}</Label>
              <Input
                type="file"
                accept="application/pdf,image/*"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                disabled={status === "approved"}
              />
              {signedUrl && (
                <a
                  href={signedUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
                >
                  <FileText className="h-4 w-4" />
                  {t("taxExemption.viewCurrent") || "View current certificate"}
                </a>
              )}
            </div>

            {status !== "approved" && (
              <div className="flex justify-end">
                <Button onClick={handleSubmit} disabled={saving}>
                  {saving ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Upload className="mr-2 h-4 w-4" />
                  )}
                  {status === "rejected"
                    ? t("taxExemption.resubmit") || "Resubmit"
                    : t("taxExemption.submit") || "Submit for review"}
                </Button>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
