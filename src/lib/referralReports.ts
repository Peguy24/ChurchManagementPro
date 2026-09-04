import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { supabase } from "@/integrations/supabase/client";
import { arrayToCsv, downloadCsv, type CsvColumn } from "./csvExport";

export interface FunnelRow {
  bucket: string;
  tenant_id: string;
  tenant_name: string;
  code: string;
  clicks: number;
  signup_starts: number;
  signups: number;
  qualified: number;
}

export interface FunnelTotals {
  clicks: number;
  signup_starts: number;
  signups: number;
  qualified: number;
  start_rate: number;
  completion_rate: number;
  overall_rate: number;
}

export type RangeKey = "7d" | "30d" | "90d" | "12m";

export function rangeToDates(range: RangeKey): { start: Date; end: Date } {
  const end = new Date();
  const start = new Date();
  if (range === "7d") start.setDate(end.getDate() - 6);
  else if (range === "30d") start.setDate(end.getDate() - 29);
  else if (range === "90d") start.setDate(end.getDate() - 89);
  else start.setMonth(end.getMonth() - 12);
  start.setHours(0, 0, 0, 0);
  return { start, end };
}

export async function fetchReferralFunnel(
  range: RangeKey,
  tenantId?: string | null
): Promise<FunnelRow[]> {
  const { start, end } = rangeToDates(range);
  const { data, error } = await (supabase as any).rpc("get_referral_funnel", {
    _start: start.toISOString(),
    _end: end.toISOString(),
    _tenant_id: tenantId ?? null,
  });
  if (error) throw error;
  return ((data || []) as FunnelRow[]).map((r) => ({
    ...r,
    clicks: Number(r.clicks) || 0,
    signup_starts: Number(r.signup_starts) || 0,
    signups: Number(r.signups) || 0,
    qualified: Number(r.qualified) || 0,
  }));
}

export function computeTotals(rows: FunnelRow[]): FunnelTotals {
  const clicks = rows.reduce((s, r) => s + r.clicks, 0);
  const signup_starts = rows.reduce((s, r) => s + r.signup_starts, 0);
  const signups = rows.reduce((s, r) => s + r.signups, 0);
  const qualified = rows.reduce((s, r) => s + r.qualified, 0);
  const pct = (a: number, b: number) => (b === 0 ? 0 : Math.round((a / b) * 1000) / 10);
  return {
    clicks,
    signup_starts,
    signups,
    qualified,
    start_rate: pct(signup_starts, clicks),
    completion_rate: pct(signups, signup_starts),
    overall_rate: pct(signups, clicks),
  };
}

/** Aggregates the daily rows into one line per day (all churches combined). */
export function byDay(rows: FunnelRow[]): FunnelRow[] {
  const map = new Map<string, FunnelRow>();
  for (const r of rows) {
    const key = r.bucket;
    const cur = map.get(key) || { ...r, tenant_id: "", tenant_name: "", code: "", clicks: 0, signup_starts: 0, signups: 0, qualified: 0 };
    cur.clicks += r.clicks;
    cur.signup_starts += r.signup_starts;
    cur.signups += r.signups;
    cur.qualified += r.qualified;
    map.set(key, cur);
  }
  return Array.from(map.values()).sort((a, b) => a.bucket.localeCompare(b.bucket));
}

/** Aggregates the daily rows into one line per referring church. */
export function byChurch(rows: FunnelRow[]): FunnelRow[] {
  const map = new Map<string, FunnelRow>();
  for (const r of rows) {
    const key = r.tenant_id;
    const cur = map.get(key) || { ...r, bucket: "", clicks: 0, signup_starts: 0, signups: 0, qualified: 0 };
    cur.clicks += r.clicks;
    cur.signup_starts += r.signup_starts;
    cur.signups += r.signups;
    cur.qualified += r.qualified;
    map.set(key, cur);
  }
  return Array.from(map.values())
    .filter((r) => r.clicks > 0 || r.signups > 0 || r.signup_starts > 0)
    .sort((a, b) => b.signups - a.signups || b.clicks - a.clicks);
}

const labels = {
  en: { date: "Date", church: "Church", code: "Code", clicks: "Link clicks", starts: "Sign-up starts", signups: "Completed sign-ups", qualified: "Qualified", rate: "Conversion %", title: "Referral conversion funnel", period: "Period", generated: "Generated", byDay: "By day", byChurch: "By referring church", attribution: "Attribution model" },
  fr: { date: "Date", church: "Église", code: "Code", clicks: "Clics sur le lien", starts: "Inscriptions commencées", signups: "Inscriptions terminées", qualified: "Qualifiées", rate: "Conversion %", title: "Entonnoir de conversion des parrainages", period: "Période", generated: "Généré le", byDay: "Par jour", byChurch: "Par église parrainante", attribution: "Modèle d'attribution" },
  ht: { date: "Dat", church: "Legliz", code: "Kòd", clicks: "Klik sou lyen", starts: "Enskripsyon kòmanse", signups: "Enskripsyon fini", qualified: "Kalifye", rate: "Konvèsyon %", title: "Antònwa konvèsyon referans", period: "Peryòd", generated: "Jenere", byDay: "Pa jou", byChurch: "Pa legliz referan", attribution: "Modèl atribisyon" },
};

export type ReportLang = keyof typeof labels;

function rate(row: FunnelRow) {
  return row.clicks === 0 ? "0%" : `${Math.round((row.signups / row.clicks) * 1000) / 10}%`;
}

export function exportFunnelCsv(rows: FunnelRow[], lang: ReportLang, filename: string, mode: "day" | "church") {
  const L = labels[lang] || labels.en;
  const data = mode === "day" ? byDay(rows) : byChurch(rows);
  const columns: CsvColumn<FunnelRow>[] =
    mode === "day"
      ? [
          { key: "bucket", header: L.date },
          { key: "clicks", header: L.clicks },
          { key: "signup_starts", header: L.starts },
          { key: "signups", header: L.signups },
          { key: "qualified", header: L.qualified },
          { key: "rate", header: L.rate, formatter: (_v, r) => rate(r) },
        ]
      : [
          { key: "tenant_name", header: L.church },
          { key: "code", header: L.code },
          { key: "clicks", header: L.clicks },
          { key: "signup_starts", header: L.starts },
          { key: "signups", header: L.signups },
          { key: "qualified", header: L.qualified },
          { key: "rate", header: L.rate, formatter: (_v, r) => rate(r) },
        ];
  downloadCsv(arrayToCsv(data, columns), filename);
}

export function exportFunnelPdf(
  rows: FunnelRow[],
  lang: ReportLang,
  opts: { filename: string; periodLabel: string; attribution?: string; subtitle?: string }
) {
  const L = labels[lang] || labels.en;
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  const totals = computeTotals(rows);

  doc.setFontSize(16);
  doc.text(L.title, 14, 16);
  doc.setFontSize(10);
  doc.setTextColor(110);
  const meta = [`${L.period}: ${opts.periodLabel}`, opts.subtitle, opts.attribution ? `${L.attribution}: ${opts.attribution}` : undefined]
    .filter(Boolean)
    .join("   |   ");
  doc.text(meta, 14, 23);
  doc.text(`${L.generated}: ${new Date().toLocaleString()}`, 14, 29);

  doc.setTextColor(20);
  doc.setFontSize(11);
  doc.text(
    `${L.clicks}: ${totals.clicks}    ${L.starts}: ${totals.signup_starts}    ${L.signups}: ${totals.signups}    ${L.qualified}: ${totals.qualified}    ${L.rate}: ${totals.overall_rate}%`,
    14,
    38
  );

  autoTable(doc, {
    startY: 44,
    head: [[L.church, L.code, L.clicks, L.starts, L.signups, L.qualified, L.rate]],
    body: byChurch(rows).map((r) => [r.tenant_name, r.code, r.clicks, r.signup_starts, r.signups, r.qualified, rate(r)]),
    styles: { fontSize: 9 },
    headStyles: { fillColor: [79, 70, 229] },
  });

  const afterFirst = (doc as any).lastAutoTable?.finalY || 44;
  autoTable(doc, {
    startY: afterFirst + 10,
    head: [[L.date, L.clicks, L.starts, L.signups, L.qualified, L.rate]],
    body: byDay(rows).map((r) => [r.bucket, r.clicks, r.signup_starts, r.signups, r.qualified, rate(r)]),
    styles: { fontSize: 9 },
    headStyles: { fillColor: [99, 102, 241] },
  });

  doc.save(opts.filename);
}
