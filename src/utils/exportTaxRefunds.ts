import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export interface RefundExportRow {
  created_at: string;
  stripe_invoice_id?: string | null;
  stripe_refund_id?: string | null;
  tax_amount_refunded: number | string;
  currency: string;
  status: string;
  failure_reason?: string | null;
}

export type RefundPeriod = "all" | "week" | "month" | "year";

export function filterRefundsByPeriod<T extends { created_at: string }>(rows: T[], period: RefundPeriod): T[] {
  if (period === "all") return rows;
  const now = Date.now();
  const ms =
    period === "week" ? 7 * 86400 * 1000 : period === "month" ? 30 * 86400 * 1000 : 365 * 86400 * 1000;
  const cutoff = now - ms;
  return rows.filter((r) => {
    const t = new Date(r.created_at).getTime();
    return !Number.isNaN(t) && t >= cutoff;
  });
}

const fmtDate = (s: string) => {
  try {
    return new Date(s).toLocaleDateString();
  } catch {
    return s;
  }
};

const csvEscape = (v: unknown) => {
  const s = v === null || v === undefined ? "" : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

export function exportRefundsCSV(churchName: string, rows: RefundExportRow[]) {
  const headers = ["Date", "Invoice ID", "Refund ID", "Amount", "Currency", "Status", "Failure Reason"];
  const lines = [headers.join(",")];
  let total = 0;
  for (const r of rows) {
    const amt = Number(r.tax_amount_refunded) || 0;
    if (r.status === "succeeded") total += amt;
    lines.push(
      [
        fmtDate(r.created_at),
        r.stripe_invoice_id ?? "",
        r.stripe_refund_id ?? "",
        amt.toFixed(2),
        (r.currency || "").toUpperCase(),
        r.status,
        r.failure_reason ?? "",
      ]
        .map(csvEscape)
        .join(",")
    );
  }
  lines.push("");
  lines.push(`Total Refunded (succeeded),,,${total.toFixed(2)},${(rows[0]?.currency || "USD").toUpperCase()},,`);

  const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `tax-refunds-${churchName.replace(/[^a-z0-9]+/gi, "_")}-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export function exportRefundsPDF(churchName: string, rows: RefundExportRow[]) {
  const doc = new jsPDF();
  const today = new Date().toLocaleDateString();

  doc.setFontSize(16);
  doc.text("Tax Refund History", 14, 18);
  doc.setFontSize(11);
  doc.text(`Church: ${churchName}`, 14, 26);
  doc.text(`Generated: ${today}`, 14, 32);

  let total = 0;
  const body = rows.map((r) => {
    const amt = Number(r.tax_amount_refunded) || 0;
    if (r.status === "succeeded") total += amt;
    return [
      fmtDate(r.created_at),
      r.stripe_invoice_id ?? "—",
      r.stripe_refund_id ?? "—",
      `${(r.currency || "").toUpperCase()} ${amt.toFixed(2)}`,
      r.status,
      r.failure_reason ?? "",
    ];
  });

  autoTable(doc, {
    startY: 38,
    head: [["Date", "Invoice", "Refund ID", "Amount", "Status", "Reason"]],
    body,
    styles: { fontSize: 8, cellPadding: 2 },
    headStyles: { fillColor: [60, 60, 60] },
    columnStyles: { 1: { cellWidth: 32 }, 2: { cellWidth: 32 } },
  });

  const finalY = (doc as any).lastAutoTable?.finalY ?? 40;
  const cur = (rows[0]?.currency || "USD").toUpperCase();
  doc.setFontSize(11);
  doc.text(`Total Refunded (succeeded): ${cur} ${total.toFixed(2)}`, 14, finalY + 10);

  doc.save(`tax-refunds-${churchName.replace(/[^a-z0-9]+/gi, "_")}-${new Date().toISOString().slice(0, 10)}.pdf`);
}
