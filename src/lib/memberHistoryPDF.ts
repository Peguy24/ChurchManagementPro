import jsPDF from "jspdf";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

export interface MemberHistoryData {
  member: {
    first_name: string;
    last_name: string;
    email: string | null;
    phone: string | null;
    address: string | null;
    photo_url: string | null;
    status: string | null;
    role: string | null;
    join_date: string | null;
    baptism_date: string | null;
    conversion_date: string | null;
  };
  attendance: Array<{
    event_type: string;
    event_date: string;
    scan_method: string | null;
  }>;
  arrivals: Array<{
    event_name: string;
    event_date: string;
    event_time: string | null;
    scan_time: string | null;
    arrival_status: string | null;
  }>;
  donations: Array<{
    amount: number;
    donation_type: string;
    donation_date: string;
    payment_method: string;
  }>;
  ministries: Array<{
    ministry_name: string;
    role: string | null;
    joined_date: string | null;
  }>;
  documents: Array<{
    document_name: string;
    document_type: string;
    document_date: string | null;
  }>;
}

type PDFLang = "fr" | "en" | "ht";

const pdfTranslations: Record<PDFLang, Record<string, string>> = {
  fr: {
    title: "Historique Complet du Membre",
    generatedOn: "Genere le",
    memberInfo: "Informations du Membre",
    email: "Email",
    phone: "Telephone",
    address: "Adresse",
    status: "Statut",
    role: "Role",
    joinDate: "Date d'adhesion",
    baptismDate: "Date de bapteme",
    conversionDate: "Date de conversion",
    attendance: "Presences",
    arrivals: "Arrivees",
    donations: "Cotisations",
    ministries: "Ministeres",
    documents: "Documents",
    noRecords: "Aucun enregistrement",
    event: "Evenement",
    details: "Details",
    date: "Date",
    amount: "Montant",
    manual: "Manuel",
    member: "Membre",
    andMore: "et {count} autres enregistrements",
    footer: "ChurchCRM - Historique Membre",
    page: "Page",
    scheduledTime: "Heure prevue",
    arrivalTime: "Heure d'arrivee",
    arrivalStatus: "Statut",
    early: "En avance",
    onTime: "A l'heure",
    late: "En retard",
    totalScans: "Total Scans",
    earlyCount: "En avance",
    onTimeCount: "A l'heure",
    lateCount: "En retard",
  },
  en: {
    title: "Complete Member History",
    generatedOn: "Generated on",
    memberInfo: "Member Information",
    email: "Email",
    phone: "Phone",
    address: "Address",
    status: "Status",
    role: "Role",
    joinDate: "Join date",
    baptismDate: "Baptism date",
    conversionDate: "Conversion date",
    attendance: "Attendance",
    arrivals: "Arrivals",
    donations: "Donations",
    ministries: "Ministries",
    documents: "Documents",
    noRecords: "No records",
    event: "Event",
    details: "Details",
    date: "Date",
    amount: "Amount",
    manual: "Manual",
    member: "Member",
    andMore: "and {count} more records",
    footer: "ChurchCRM - Member History",
    page: "Page",
    scheduledTime: "Scheduled time",
    arrivalTime: "Arrival time",
    arrivalStatus: "Status",
    early: "Early",
    onTime: "On Time",
    late: "Late",
    totalScans: "Total Scans",
    earlyCount: "Early",
    onTimeCount: "On Time",
    lateCount: "Late",
  },
  ht: {
    title: "Istwa Konple Manm nan",
    generatedOn: "Jenere le",
    memberInfo: "Enfomasyon Manm",
    email: "Imel",
    phone: "Telefon",
    address: "Adres",
    status: "Estati",
    role: "Wol",
    joinDate: "Dat enskripsyon",
    baptismDate: "Dat batem",
    conversionDate: "Dat konvesyon",
    attendance: "Prezans",
    arrivals: "Arive",
    donations: "Kotizasyon",
    ministries: "Ministe",
    documents: "Dokiman",
    noRecords: "Pa gen anrejistreman",
    event: "Evenman",
    details: "Detay",
    date: "Dat",
    amount: "Montan",
    manual: "Manyel",
    member: "Manm",
    andMore: "ak {count} lot anrejistreman",
    footer: "ChurchCRM - Istwa Manm",
    page: "Paj",
    scheduledTime: "Le prevwa",
    arrivalTime: "Le arive",
    arrivalStatus: "Estati",
    early: "Bone",
    onTime: "Ale",
    late: "An reta",
    totalScans: "Total Eskanaj",
    earlyCount: "Bone",
    onTimeCount: "Ale",
    lateCount: "An reta",
  },
};

// Sanitize text for jsPDF (remove accents/emojis)
const sanitize = (text: string): string => {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\x00-\x7F]/g, "");
};

const formatDate = (dateStr: string | null): string => {
  if (!dateStr) return "-";
  try {
    return format(new Date(dateStr), "dd/MM/yyyy");
  } catch {
    return dateStr;
  }
};

const formatDateLong = (dateStr: string | null): string => {
  if (!dateStr) return "-";
  try {
    return format(new Date(dateStr), "dd/MM/yyyy");
  } catch {
    return dateStr;
  }
};

export async function generateMemberHistoryPDF(
  data: MemberHistoryData,
  currencyFormatter?: (amount: number) => string,
  lang: PDFLang = "fr"
): Promise<Blob> {
  const t = (key: string) => sanitize(pdfTranslations[lang]?.[key] || pdfTranslations.en[key] || key);
  const fmtCurrency = currencyFormatter || ((amount: number) => `${amount.toLocaleString("en-US")} $`);
  
  const pdf = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 20;
  const contentWidth = pageWidth - margin * 2;
  let y = margin;

  const primaryColor = [59, 130, 246] as const;
  const textColor = [55, 65, 81] as const;
  const mutedColor = [107, 114, 128] as const;

  const addNewPageIfNeeded = (requiredSpace: number) => {
    if (y + requiredSpace > pageHeight - margin) {
      pdf.addPage();
      y = margin;
      return true;
    }
    return false;
  };

  // Header
  pdf.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  pdf.rect(0, 0, pageWidth, 45, "F");

  pdf.setTextColor(255, 255, 255);
  pdf.setFontSize(22);
  pdf.setFont("helvetica", "bold");
  pdf.text(t("title"), margin, 20);

  pdf.setFontSize(16);
  pdf.setFont("helvetica", "normal");
  pdf.text(sanitize(`${data.member.first_name} ${data.member.last_name}`), margin, 32);

  pdf.setFontSize(10);
  pdf.text(`${t("generatedOn")} ${formatDateLong(new Date().toISOString())}`, pageWidth - margin - 50, 32);

  y = 55;

  // Member Info
  pdf.setTextColor(textColor[0], textColor[1], textColor[2]);
  pdf.setFontSize(14);
  pdf.setFont("helvetica", "bold");
  pdf.text(t("memberInfo"), margin, y);
  y += 8;

  pdf.setFontSize(10);
  pdf.setFont("helvetica", "normal");
  pdf.setTextColor(mutedColor[0], mutedColor[1], mutedColor[2]);

  const infoLines = [
    `${t("email")}: ${data.member.email || "-"}`,
    `${t("phone")}: ${data.member.phone || "-"}`,
    `${t("address")}: ${sanitize(data.member.address || "-")}`,
    `${t("status")}: ${data.member.status || "-"}`,
    `${t("role")}: ${sanitize(data.member.role || "-")}`,
    `${t("joinDate")}: ${formatDate(data.member.join_date)}`,
  ];

  if (data.member.baptism_date) {
    infoLines.push(`${t("baptismDate")}: ${formatDate(data.member.baptism_date)}`);
  }
  if (data.member.conversion_date) {
    infoLines.push(`${t("conversionDate")}: ${formatDate(data.member.conversion_date)}`);
  }

  infoLines.forEach((line) => {
    pdf.text(line, margin, y);
    y += 5;
  });

  y += 5;

  // Summary Stats
  const totalDonations = data.donations.reduce((sum, d) => sum + Number(d.amount), 0);

  pdf.setFillColor(249, 250, 251);
  pdf.roundedRect(margin, y, contentWidth, 20, 3, 3, "F");

  pdf.setTextColor(textColor[0], textColor[1], textColor[2]);
  pdf.setFontSize(11);
  pdf.setFont("helvetica", "bold");

  const statsY = y + 13;
  const statWidth = contentWidth / 5;

  pdf.text(`${data.attendance.length}`, margin + statWidth * 0.5, statsY - 3, { align: "center" });
  pdf.text(`${data.arrivals.length}`, margin + statWidth * 1.5, statsY - 3, { align: "center" });
  pdf.text(fmtCurrency(totalDonations), margin + statWidth * 2.5, statsY - 3, { align: "center" });
  pdf.text(`${data.ministries.length}`, margin + statWidth * 3.5, statsY - 3, { align: "center" });
  pdf.text(`${data.documents.length}`, margin + statWidth * 4.5, statsY - 3, { align: "center" });

  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(8);
  pdf.setTextColor(mutedColor[0], mutedColor[1], mutedColor[2]);

  pdf.text(t("attendance"), margin + statWidth * 0.5, statsY + 3, { align: "center" });
  pdf.text(t("arrivals"), margin + statWidth * 1.5, statsY + 3, { align: "center" });
  pdf.text(t("donations"), margin + statWidth * 2.5, statsY + 3, { align: "center" });
  pdf.text(t("ministries"), margin + statWidth * 3.5, statsY + 3, { align: "center" });
  pdf.text(t("documents"), margin + statWidth * 4.5, statsY + 3, { align: "center" });

  y += 30;

  // Generic section helper for attendance/donations/ministries/documents
  const addSection = (title: string, headers: string[], items: Array<string[]>, highlightCol?: number) => {
    addNewPageIfNeeded(30);

    // Section header
    pdf.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    pdf.roundedRect(margin, y, contentWidth, 8, 2, 2, "F");
    pdf.setTextColor(255, 255, 255);
    pdf.setFontSize(11);
    pdf.setFont("helvetica", "bold");
    pdf.text(sanitize(title), margin + 4, y + 5.5);
    y += 12;

    if (items.length === 0) {
      pdf.setTextColor(mutedColor[0], mutedColor[1], mutedColor[2]);
      pdf.setFontSize(10);
      pdf.setFont("helvetica", "italic");
      pdf.text(t("noRecords"), margin + 4, y);
      y += 8;
      return;
    }

    const colCount = headers.length;
    const colWidth = contentWidth / colCount;

    const drawHeaders = () => {
      pdf.setFillColor(243, 244, 246);
      pdf.rect(margin, y, contentWidth, 7, "F");
      pdf.setTextColor(textColor[0], textColor[1], textColor[2]);
      pdf.setFontSize(9);
      pdf.setFont("helvetica", "bold");
      headers.forEach((h, i) => {
        pdf.text(sanitize(h), margin + 4 + colWidth * i, y + 5);
      });
      y += 9;
      pdf.setFont("helvetica", "normal");
    };

    drawHeaders();

    const truncate = (text: string, maxLen: number) =>
      text.length > maxLen ? text.substring(0, maxLen - 2) + "..." : text;

    items.slice(0, 50).forEach((row, index) => {
      if (addNewPageIfNeeded(7)) {
        drawHeaders();
      }

      if (index % 2 === 0) {
        pdf.setFillColor(249, 250, 251);
        pdf.rect(margin, y - 1, contentWidth, 6, "F");
      }

      pdf.setFontSize(9);
      row.forEach((cell, i) => {
        if (highlightCol !== undefined && i === highlightCol) {
          pdf.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
          pdf.setFont("helvetica", "bold");
        } else {
          pdf.setTextColor(i === 0 ? textColor[0] : mutedColor[0], i === 0 ? textColor[1] : mutedColor[1], i === 0 ? textColor[2] : mutedColor[2]);
          pdf.setFont("helvetica", "normal");
        }
        pdf.text(truncate(sanitize(cell), 25), margin + 4 + colWidth * i, y + 3);
      });
      y += 6;
    });

    if (items.length > 50) {
      pdf.setTextColor(mutedColor[0], mutedColor[1], mutedColor[2]);
      pdf.setFontSize(8);
      pdf.setFont("helvetica", "italic");
      pdf.text(sanitize(t("andMore").replace("{count}", String(items.length - 50))), margin + 4, y + 2);
      y += 6;
    }

    y += 8;
  };

  // Attendance Section
  addSection(
    `${t("attendance")} (${data.attendance.length})`,
    [t("event"), t("details"), t("date")],
    data.attendance.map((a) => [
      a.event_type,
      a.scan_method || t("manual"),
      formatDate(a.event_date),
    ])
  );

  // Arrivals Section
  const getStatusLabel = (status: string | null): string => {
    if (!status) return "-";
    switch (status) {
      case "early": return t("early");
      case "onTime": return t("onTime");
      case "late": return t("late");
      default: return "-";
    }
  };

  addSection(
    `${t("arrivals")} (${data.arrivals.length})`,
    [t("event"), t("scheduledTime"), t("arrivalTime"), t("arrivalStatus")],
    data.arrivals.map((a) => [
      a.event_name,
      a.event_time ? a.event_time.substring(0, 5) : "-",
      a.scan_time || "-",
      getStatusLabel(a.arrival_status),
    ])
  );

  // Donations Section
  addSection(
    `${t("donations")} (${data.donations.length})`,
    [t("event"), t("details"), t("date"), t("amount")],
    data.donations.map((d) => [
      d.donation_type,
      d.payment_method,
      formatDate(d.donation_date),
      fmtCurrency(Number(d.amount)),
    ]),
    3 // highlight amount column
  );

  // Ministries Section
  addSection(
    `${t("ministries")} (${data.ministries.length})`,
    [t("event"), t("details"), t("date")],
    data.ministries.map((m) => [
      m.ministry_name,
      m.role || t("member"),
      formatDate(m.joined_date),
    ])
  );

  // Documents Section
  addSection(
    `${t("documents")} (${data.documents.length})`,
    [t("event"), t("details"), t("date")],
    data.documents.map((d) => [
      d.document_name,
      d.document_type,
      formatDate(d.document_date),
    ])
  );

  // Footer
  const totalPages = pdf.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    pdf.setPage(i);
    pdf.setFontSize(8);
    pdf.setTextColor(mutedColor[0], mutedColor[1], mutedColor[2]);
    pdf.text(
      `${t("page")} ${i} / ${totalPages}`,
      pageWidth / 2,
      pageHeight - 10,
      { align: "center" }
    );
    pdf.text(
      t("footer"),
      margin,
      pageHeight - 10
    );
  }

  return pdf.output("blob");
}

export function downloadMemberHistoryPDF(blob: Blob, memberName: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `history_${memberName.replace(/\s+/g, "_")}_${format(new Date(), "yyyy-MM-dd")}.pdf`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
