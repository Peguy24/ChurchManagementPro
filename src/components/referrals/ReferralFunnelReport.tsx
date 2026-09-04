import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2, Download, FileText, Filter } from "lucide-react";
import { toast } from "sonner";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";
import {
  byChurch,
  byDay,
  computeTotals,
  exportFunnelCsv,
  exportFunnelPdf,
  fetchReferralFunnel,
  rangeToDates,
  type FunnelRow,
  type RangeKey,
  type ReportLang,
} from "@/lib/referralReports";

interface Props {
  /** null = all churches (super admin), otherwise a single church */
  tenantId?: string | null;
  showChurchBreakdown?: boolean;
  attribution?: string;
  lang?: ReportLang;
  tt?: (en: string, fr: string, ht: string) => string;
}

const RANGES: { key: RangeKey; en: string; fr: string; ht: string }[] = [
  { key: "7d", en: "Last 7 days", fr: "7 derniers jours", ht: "7 dènye jou" },
  { key: "30d", en: "Last 30 days", fr: "30 derniers jours", ht: "30 dènye jou" },
  { key: "90d", en: "Last 90 days", fr: "90 derniers jours", ht: "90 dènye jou" },
  { key: "12m", en: "Last 12 months", fr: "12 derniers mois", ht: "12 dènye mwa" },
];

export default function ReferralFunnelReport({
  tenantId = null,
  showChurchBreakdown = true,
  attribution,
  lang = "en",
  tt = (en) => en,
}: Props) {
  const [range, setRange] = useState<RangeKey>("30d");
  const [rows, setRows] = useState<FunnelRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    setLoading(true);
    fetchReferralFunnel(range, tenantId)
      .then((r) => active && setRows(r))
      .catch((e) => toast.error(e?.message || "Failed to load report"))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [range, tenantId]);

  const totals = useMemo(() => computeTotals(rows), [rows]);
  const daily = useMemo(() => byDay(rows), [rows]);
  const churches = useMemo(() => byChurch(rows), [rows]);

  const periodLabel = useMemo(() => {
    const { start, end } = rangeToDates(range);
    return `${start.toLocaleDateString()} – ${end.toLocaleDateString()}`;
  }, [range]);

  const stamp = new Date().toISOString().slice(0, 10);

  const onCsv = (mode: "day" | "church") => {
    if (!rows.length) return toast.error(tt("Nothing to export yet", "Rien à exporter", "Pa gen anyen pou ekspòte"));
    exportFunnelCsv(rows, lang, `referral-funnel-${mode}-${stamp}.csv`, mode);
  };

  const onPdf = () => {
    if (!rows.length) return toast.error(tt("Nothing to export yet", "Rien à exporter", "Pa gen anyen pou ekspòte"));
    exportFunnelPdf(rows, lang, {
      filename: `referral-funnel-${stamp}.pdf`,
      periodLabel,
      attribution,
    });
  };

  const steps = [
    { label: tt("Link clicks", "Clics sur le lien", "Klik sou lyen"), value: totals.clicks, pct: 100 },
    { label: tt("Sign-up starts", "Inscriptions commencées", "Enskripsyon kòmanse"), value: totals.signup_starts, pct: totals.start_rate },
    { label: tt("Completed sign-ups", "Inscriptions terminées", "Enskripsyon fini"), value: totals.signups, pct: totals.overall_rate },
    { label: tt("Qualified", "Qualifiées", "Kalifye"), value: totals.qualified, pct: totals.clicks ? Math.round((totals.qualified / totals.clicks) * 1000) / 10 : 0 },
  ];

  return (
    <Card>
      <CardHeader className="gap-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Filter className="h-5 w-5 text-primary" />
              {tt("Conversion funnel", "Entonnoir de conversion", "Antònwa konvèsyon")}
            </CardTitle>
            <CardDescription>
              {tt(
                "Link clicks, sign-up starts and completed sign-ups over time.",
                "Clics, inscriptions commencées et inscriptions terminées dans le temps.",
                "Klik, enskripsyon kòmanse ak enskripsyon fini nan tan an."
              )}
            </CardDescription>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="outline" onClick={() => onCsv("day")}>
              <Download className="h-4 w-4 mr-2" /> CSV ({tt("by day", "par jour", "pa jou")})
            </Button>
            {showChurchBreakdown && (
              <Button size="sm" variant="outline" onClick={() => onCsv("church")}>
                <Download className="h-4 w-4 mr-2" /> CSV ({tt("by church", "par église", "pa legliz")})
              </Button>
            )}
            <Button size="sm" variant="outline" onClick={onPdf}>
              <FileText className="h-4 w-4 mr-2" /> PDF
            </Button>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {RANGES.map((r) => (
            <Button
              key={r.key}
              size="sm"
              variant={range === r.key ? "default" : "outline"}
              onClick={() => setRange(r.key)}
            >
              {tt(r.en, r.fr, r.ht)}
            </Button>
          ))}
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {loading ? (
          <Loader2 className="h-5 w-5 animate-spin" />
        ) : (
          <>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {steps.map((s) => (
                <div key={s.label} className="rounded-xl border p-4">
                  <p className="text-xs text-muted-foreground">{s.label}</p>
                  <p className="text-2xl font-semibold">{s.value}</p>
                  <div className="mt-2 h-1.5 w-full rounded-full bg-muted">
                    <div className="h-1.5 rounded-full bg-primary" style={{ width: `${Math.min(s.pct, 100)}%` }} />
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">{s.pct}% {tt("of clicks", "des clics", "nan klik yo")}</p>
                </div>
              ))}
            </div>

            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={daily}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="bucket" fontSize={11} tickMargin={8} />
                  <YAxis fontSize={11} allowDecimals={false} />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="clicks" name={tt("Clicks", "Clics", "Klik")} stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="signup_starts" name={tt("Starts", "Commencées", "Kòmanse")} stroke="hsl(var(--chart-2, 200 80% 45%))" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="signups" name={tt("Sign-ups", "Inscriptions", "Enskripsyon")} stroke="hsl(var(--chart-3, 142 70% 40%))" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>

            {showChurchBreakdown && (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{tt("Referring church", "Église parrainante", "Legliz referan")}</TableHead>
                      <TableHead>{tt("Code", "Code", "Kòd")}</TableHead>
                      <TableHead className="text-right">{tt("Clicks", "Clics", "Klik")}</TableHead>
                      <TableHead className="text-right">{tt("Starts", "Commencées", "Kòmanse")}</TableHead>
                      <TableHead className="text-right">{tt("Sign-ups", "Inscriptions", "Enskripsyon")}</TableHead>
                      <TableHead className="text-right">{tt("Qualified", "Qualifiées", "Kalifye")}</TableHead>
                      <TableHead className="text-right">{tt("Conversion", "Conversion", "Konvèsyon")}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {churches.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-sm text-muted-foreground">
                          {tt("No referral activity in this period.", "Aucune activité de parrainage sur cette période.", "Pa gen aktivite referans nan peryòd sa a.")}
                        </TableCell>
                      </TableRow>
                    ) : (
                      churches.map((c) => (
                        <TableRow key={c.tenant_id}>
                          <TableCell className="font-medium">{c.tenant_name}</TableCell>
                          <TableCell className="font-mono text-xs">{c.code}</TableCell>
                          <TableCell className="text-right">{c.clicks}</TableCell>
                          <TableCell className="text-right">{c.signup_starts}</TableCell>
                          <TableCell className="text-right">{c.signups}</TableCell>
                          <TableCell className="text-right">{c.qualified}</TableCell>
                          <TableCell className="text-right">
                            {c.clicks === 0 ? "0%" : `${Math.round((c.signups / c.clicks) * 1000) / 10}%`}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
