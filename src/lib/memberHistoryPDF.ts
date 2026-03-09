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

const formatDate = (dateStr: string | null): string => {
  if (!dateStr) return "-";
  try {
    return format(new Date(dateStr), "dd/MM/yyyy", { locale: fr });
  } catch {
    return dateStr;
  }
};

const formatDateLong = (dateStr: string | null): string => {
  if (!dateStr) return "-";
  try {
    return format(new Date(dateStr), "dd MMMM yyyy", { locale: fr });
  } catch {
    return dateStr;
  }
};

export async function generateMemberHistoryPDF(data: MemberHistoryData, currencyFormatter?: (amount: number) => string): Promise<Blob> {
  const fmtCurrency = currencyFormatter || ((amount: number) => `${amount.toLocaleString("fr-FR")} €`);
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

  const primaryColor = [59, 130, 246] as const; // Blue
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

  // Header with background
  pdf.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  pdf.rect(0, 0, pageWidth, 45, "F");

  // Title
  pdf.setTextColor(255, 255, 255);
  pdf.setFontSize(22);
  pdf.setFont("helvetica", "bold");
  pdf.text("Historique Complet du Membre", margin, 20);

  // Member name
  pdf.setFontSize(16);
  pdf.setFont("helvetica", "normal");
  pdf.text(`${data.member.first_name} ${data.member.last_name}`, margin, 32);

  // Generation date
  pdf.setFontSize(10);
  pdf.text(`Généré le ${formatDateLong(new Date().toISOString())}`, pageWidth - margin - 50, 32);

  y = 55;

  // Member Info Section
  pdf.setTextColor(textColor[0], textColor[1], textColor[2]);
  pdf.setFontSize(14);
  pdf.setFont("helvetica", "bold");
  pdf.text("Informations du Membre", margin, y);
  y += 8;

  pdf.setFontSize(10);
  pdf.setFont("helvetica", "normal");
  pdf.setTextColor(mutedColor[0], mutedColor[1], mutedColor[2]);

  const infoLines = [
    `Email: ${data.member.email || "-"}`,
    `Téléphone: ${data.member.phone || "-"}`,
    `Adresse: ${data.member.address || "-"}`,
    `Statut: ${data.member.status || "-"}`,
    `Rôle: ${data.member.role || "-"}`,
    `Date d'adhésion: ${formatDate(data.member.join_date)}`,
  ];

  if (data.member.baptism_date) {
    infoLines.push(`Date de baptême: ${formatDate(data.member.baptism_date)}`);
  }
  if (data.member.conversion_date) {
    infoLines.push(`Date de conversion: ${formatDate(data.member.conversion_date)}`);
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
  const statWidth = contentWidth / 4;
  
  pdf.text(`${data.attendance.length}`, margin + statWidth * 0.5, statsY - 3, { align: "center" });
  pdf.text(`${totalDonations.toLocaleString("fr-FR")} €`, margin + statWidth * 1.5, statsY - 3, { align: "center" });
  pdf.text(`${data.ministries.length}`, margin + statWidth * 2.5, statsY - 3, { align: "center" });
  pdf.text(`${data.documents.length}`, margin + statWidth * 3.5, statsY - 3, { align: "center" });
  
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(8);
  pdf.setTextColor(mutedColor[0], mutedColor[1], mutedColor[2]);
  
  pdf.text("Présences", margin + statWidth * 0.5, statsY + 3, { align: "center" });
  pdf.text("Cotisations", margin + statWidth * 1.5, statsY + 3, { align: "center" });
  pdf.text("Ministères", margin + statWidth * 2.5, statsY + 3, { align: "center" });
  pdf.text("Documents", margin + statWidth * 3.5, statsY + 3, { align: "center" });
  
  y += 30;

  // Section helper
  const addSection = (title: string, items: Array<{ primary: string; secondary: string; date: string; amount?: string }>) => {
    addNewPageIfNeeded(30);
    
    // Section header
    pdf.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    pdf.roundedRect(margin, y, contentWidth, 8, 2, 2, "F");
    pdf.setTextColor(255, 255, 255);
    pdf.setFontSize(11);
    pdf.setFont("helvetica", "bold");
    pdf.text(title, margin + 4, y + 5.5);
    y += 12;

    if (items.length === 0) {
      pdf.setTextColor(mutedColor[0], mutedColor[1], mutedColor[2]);
      pdf.setFontSize(10);
      pdf.setFont("helvetica", "italic");
      pdf.text("Aucun enregistrement", margin + 4, y);
      y += 8;
      return;
    }

    // Table header
    pdf.setFillColor(243, 244, 246);
    pdf.rect(margin, y, contentWidth, 7, "F");
    pdf.setTextColor(textColor[0], textColor[1], textColor[2]);
    pdf.setFontSize(9);
    pdf.setFont("helvetica", "bold");
    
    const col1 = margin + 4;
    const col2 = margin + contentWidth * 0.4;
    const col3 = margin + contentWidth * 0.65;
    const col4 = margin + contentWidth * 0.85;
    
    pdf.text("Événement", col1, y + 5);
    pdf.text("Détails", col2, y + 5);
    pdf.text("Date", col3, y + 5);
    if (items.some(i => i.amount)) {
      pdf.text("Montant", col4, y + 5);
    }
    y += 9;

    // Table rows
    pdf.setFont("helvetica", "normal");
    items.slice(0, 50).forEach((item, index) => {
      if (addNewPageIfNeeded(7)) {
        // Re-add header on new page
        pdf.setFillColor(243, 244, 246);
        pdf.rect(margin, y, contentWidth, 7, "F");
        pdf.setTextColor(textColor[0], textColor[1], textColor[2]);
        pdf.setFontSize(9);
        pdf.setFont("helvetica", "bold");
        pdf.text("Événement", col1, y + 5);
        pdf.text("Détails", col2, y + 5);
        pdf.text("Date", col3, y + 5);
        if (items.some(i => i.amount)) {
          pdf.text("Montant", col4, y + 5);
        }
        y += 9;
        pdf.setFont("helvetica", "normal");
      }

      // Alternate row colors
      if (index % 2 === 0) {
        pdf.setFillColor(249, 250, 251);
        pdf.rect(margin, y - 1, contentWidth, 6, "F");
      }

      pdf.setTextColor(textColor[0], textColor[1], textColor[2]);
      pdf.setFontSize(9);
      
      // Truncate text if too long
      const truncate = (text: string, maxLen: number) => 
        text.length > maxLen ? text.substring(0, maxLen - 2) + "..." : text;
      
      pdf.text(truncate(item.primary, 30), col1, y + 3);
      pdf.setTextColor(mutedColor[0], mutedColor[1], mutedColor[2]);
      pdf.text(truncate(item.secondary, 20), col2, y + 3);
      pdf.text(item.date, col3, y + 3);
      if (item.amount) {
        pdf.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
        pdf.setFont("helvetica", "bold");
        pdf.text(item.amount, col4, y + 3);
        pdf.setFont("helvetica", "normal");
      }
      y += 6;
    });

    if (items.length > 50) {
      pdf.setTextColor(mutedColor[0], mutedColor[1], mutedColor[2]);
      pdf.setFontSize(8);
      pdf.setFont("helvetica", "italic");
      pdf.text(`... et ${items.length - 50} autres enregistrements`, margin + 4, y + 2);
      y += 6;
    }

    y += 8;
  };

  // Attendance Section
  addSection(
    `Présences (${data.attendance.length})`,
    data.attendance.map((a) => ({
      primary: a.event_type,
      secondary: a.scan_method || "Manuel",
      date: formatDate(a.event_date),
    }))
  );

  // Donations Section
  addSection(
    `Cotisations (${data.donations.length})`,
    data.donations.map((d) => ({
      primary: d.donation_type,
      secondary: d.payment_method,
      date: formatDate(d.donation_date),
      amount: `${Number(d.amount).toLocaleString("fr-FR")} €`,
    }))
  );

  // Ministries Section
  addSection(
    `Ministères (${data.ministries.length})`,
    data.ministries.map((m) => ({
      primary: m.ministry_name,
      secondary: m.role || "Membre",
      date: formatDate(m.joined_date),
    }))
  );

  // Documents Section
  addSection(
    `Documents (${data.documents.length})`,
    data.documents.map((d) => ({
      primary: d.document_name,
      secondary: d.document_type,
      date: formatDate(d.document_date),
    }))
  );

  // Footer on last page
  const totalPages = pdf.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    pdf.setPage(i);
    pdf.setFontSize(8);
    pdf.setTextColor(mutedColor[0], mutedColor[1], mutedColor[2]);
    pdf.text(
      `Page ${i} / ${totalPages}`,
      pageWidth / 2,
      pageHeight - 10,
      { align: "center" }
    );
    pdf.text(
      "ChurchCRM - Historique Membre",
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
  link.download = `historique_${memberName.replace(/\s+/g, "_")}_${format(new Date(), "yyyy-MM-dd")}.pdf`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
