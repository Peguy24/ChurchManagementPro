import jsPDF from "jspdf";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { formatCurrency as formatCurrencyLib } from "./currency";
export interface FiscalReceiptData {
  member: {
    first_name: string;
    last_name: string;
    address: string | null;
    email: string | null;
    phone: string | null;
  };
  churchInfo: {
    name: string;
    address: string;
    phone: string;
    email: string;
    taxId?: string;
  };
  year: number;
  currencyCode?: string;
  donations: Array<{
    date: string;
    type: string;
    description: string | null;
    amount: number;
    payment_method: string;
  }>;
}

const formatDate = (dateStr: string): string => {
  try {
    return format(new Date(dateStr), "dd/MM/yyyy", { locale: fr });
  } catch {
    return dateStr;
  }
};

const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "HTG",
    minimumFractionDigits: 2,
  }).format(amount);
};

const getDonationTypeLabel = (type: string): string => {
  const labels: Record<string, string> = {
    tithe: "Dîme",
    offering: "Offrande",
    special: "Don spécial",
    activity: "Activité",
    other: "Autre",
  };
  return labels[type] || type;
};

const getPaymentMethodLabel = (method: string): string => {
  const labels: Record<string, string> = {
    cash: "Espèces",
    check: "Chèque",
    transfer: "Virement",
    mobile_money: "Mobile Money",
    card: "Carte",
  };
  return labels[method] || method;
};

export async function generateFiscalReceiptPDF(data: FiscalReceiptData): Promise<Blob> {
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

  const primaryColor = [37, 99, 235] as const; // Blue-600
  const textColor = [31, 41, 55] as const; // Gray-800
  const mutedColor = [107, 114, 128] as const; // Gray-500

  // ========== HEADER ==========
  pdf.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  pdf.rect(0, 0, pageWidth, 50, "F");

  // Church name
  pdf.setTextColor(255, 255, 255);
  pdf.setFontSize(20);
  pdf.setFont("helvetica", "bold");
  pdf.text(data.churchInfo.name, pageWidth / 2, 18, { align: "center" });

  // Church info
  pdf.setFontSize(9);
  pdf.setFont("helvetica", "normal");
  pdf.text(data.churchInfo.address, pageWidth / 2, 28, { align: "center" });
  pdf.text(`Tél: ${data.churchInfo.phone} | Email: ${data.churchInfo.email}`, pageWidth / 2, 35, { align: "center" });
  
  if (data.churchInfo.taxId) {
    pdf.text(`N° Fiscal: ${data.churchInfo.taxId}`, pageWidth / 2, 42, { align: "center" });
  }

  y = 60;

  // ========== TITLE ==========
  pdf.setTextColor(textColor[0], textColor[1], textColor[2]);
  pdf.setFontSize(16);
  pdf.setFont("helvetica", "bold");
  pdf.text("RELEVÉ FISCAL ANNUEL DES DONS", pageWidth / 2, y, { align: "center" });
  y += 8;

  pdf.setFontSize(12);
  pdf.setFont("helvetica", "normal");
  pdf.text(`Année fiscale: ${data.year}`, pageWidth / 2, y, { align: "center" });
  y += 15;

  // ========== DONOR INFO ==========
  pdf.setFillColor(249, 250, 251);
  pdf.roundedRect(margin, y, contentWidth, 35, 3, 3, "F");
  
  pdf.setFontSize(11);
  pdf.setFont("helvetica", "bold");
  pdf.setTextColor(textColor[0], textColor[1], textColor[2]);
  pdf.text("INFORMATIONS DU DONATEUR", margin + 5, y + 8);

  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(10);
  pdf.text(`Nom: ${data.member.first_name} ${data.member.last_name}`, margin + 5, y + 16);
  pdf.text(`Adresse: ${data.member.address || "Non renseignée"}`, margin + 5, y + 22);
  pdf.text(`Email: ${data.member.email || "Non renseigné"}`, margin + 5, y + 28);
  pdf.text(`Téléphone: ${data.member.phone || "Non renseigné"}`, margin + contentWidth / 2, y + 28);

  y += 45;

  // ========== SUMMARY ==========
  // Calculate totals by type
  const totalsByType: Record<string, number> = {};
  let grandTotal = 0;

  data.donations.forEach((d) => {
    totalsByType[d.type] = (totalsByType[d.type] || 0) + d.amount;
    grandTotal += d.amount;
  });

  // Tithe total (for tax purposes)
  const titheTotal = totalsByType["tithe"] || 0;

  // Summary boxes
  const boxWidth = (contentWidth - 10) / 3;
  
  // Total dîmes
  pdf.setFillColor(37, 99, 235);
  pdf.roundedRect(margin, y, boxWidth, 25, 3, 3, "F");
  pdf.setTextColor(255, 255, 255);
  pdf.setFontSize(9);
  pdf.text("TOTAL DÎMES", margin + boxWidth / 2, y + 8, { align: "center" });
  pdf.setFontSize(14);
  pdf.setFont("helvetica", "bold");
  pdf.text(formatCurrency(titheTotal), margin + boxWidth / 2, y + 18, { align: "center" });

  // Total autres dons
  pdf.setFillColor(16, 185, 129);
  pdf.roundedRect(margin + boxWidth + 5, y, boxWidth, 25, 3, 3, "F");
  pdf.setFontSize(9);
  pdf.setFont("helvetica", "normal");
  pdf.text("AUTRES DONS", margin + boxWidth + 5 + boxWidth / 2, y + 8, { align: "center" });
  pdf.setFontSize(14);
  pdf.setFont("helvetica", "bold");
  pdf.text(formatCurrency(grandTotal - titheTotal), margin + boxWidth + 5 + boxWidth / 2, y + 18, { align: "center" });

  // Total général
  pdf.setFillColor(107, 33, 168);
  pdf.roundedRect(margin + (boxWidth + 5) * 2, y, boxWidth, 25, 3, 3, "F");
  pdf.setFontSize(9);
  pdf.setFont("helvetica", "normal");
  pdf.text("TOTAL GÉNÉRAL", margin + (boxWidth + 5) * 2 + boxWidth / 2, y + 8, { align: "center" });
  pdf.setFontSize(14);
  pdf.setFont("helvetica", "bold");
  pdf.text(formatCurrency(grandTotal), margin + (boxWidth + 5) * 2 + boxWidth / 2, y + 18, { align: "center" });

  y += 35;

  // ========== DONATIONS TABLE ==========
  pdf.setTextColor(textColor[0], textColor[1], textColor[2]);
  pdf.setFontSize(11);
  pdf.setFont("helvetica", "bold");
  pdf.text("DÉTAIL DES CONTRIBUTIONS", margin, y);
  y += 8;

  // Table header
  const colWidths = [25, 35, 50, 30, 30];
  const headers = ["Date", "Type", "Description", "Mode", "Montant"];
  
  pdf.setFillColor(243, 244, 246);
  pdf.rect(margin, y, contentWidth, 8, "F");
  
  pdf.setFontSize(9);
  pdf.setFont("helvetica", "bold");
  let xPos = margin + 2;
  headers.forEach((header, i) => {
    pdf.text(header, xPos, y + 5.5);
    xPos += colWidths[i];
  });
  y += 10;

  // Table rows
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(8);

  const addNewPage = () => {
    pdf.addPage();
    y = margin;
    
    // Re-add table header
    pdf.setFillColor(243, 244, 246);
    pdf.rect(margin, y, contentWidth, 8, "F");
    pdf.setFontSize(9);
    pdf.setFont("helvetica", "bold");
    pdf.setTextColor(textColor[0], textColor[1], textColor[2]);
    let xPos = margin + 2;
    headers.forEach((header, i) => {
      pdf.text(header, xPos, y + 5.5);
      xPos += colWidths[i];
    });
    y += 10;
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(8);
  };

  // Sort donations by date
  const sortedDonations = [...data.donations].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );

  sortedDonations.forEach((donation, index) => {
    if (y > pageHeight - 40) {
      addNewPage();
    }

    // Alternate row colors
    if (index % 2 === 0) {
      pdf.setFillColor(249, 250, 251);
      pdf.rect(margin, y - 1, contentWidth, 6, "F");
    }

    pdf.setTextColor(textColor[0], textColor[1], textColor[2]);
    
    xPos = margin + 2;
    pdf.text(formatDate(donation.date), xPos, y + 3);
    xPos += colWidths[0];
    
    pdf.text(getDonationTypeLabel(donation.type), xPos, y + 3);
    xPos += colWidths[1];
    
    const desc = donation.description || "-";
    const truncatedDesc = desc.length > 25 ? desc.substring(0, 22) + "..." : desc;
    pdf.text(truncatedDesc, xPos, y + 3);
    xPos += colWidths[2];
    
    pdf.text(getPaymentMethodLabel(donation.payment_method), xPos, y + 3);
    xPos += colWidths[3];
    
    pdf.setFont("helvetica", "bold");
    pdf.text(formatCurrency(donation.amount), xPos, y + 3);
    pdf.setFont("helvetica", "normal");
    
    y += 6;
  });

  // ========== SUMMARY BY TYPE ==========
  y += 10;
  if (y > pageHeight - 60) {
    addNewPage();
  }

  pdf.setFontSize(11);
  pdf.setFont("helvetica", "bold");
  pdf.setTextColor(textColor[0], textColor[1], textColor[2]);
  pdf.text("RÉCAPITULATIF PAR TYPE", margin, y);
  y += 8;

  Object.entries(totalsByType).forEach(([type, total]) => {
    pdf.setFillColor(249, 250, 251);
    pdf.rect(margin, y - 1, contentWidth, 7, "F");
    
    pdf.setFontSize(9);
    pdf.setFont("helvetica", "normal");
    pdf.text(getDonationTypeLabel(type), margin + 5, y + 4);
    
    pdf.setFont("helvetica", "bold");
    pdf.text(formatCurrency(total), margin + contentWidth - 5, y + 4, { align: "right" });
    
    y += 8;
  });

  // Grand total line
  pdf.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  pdf.rect(margin, y, contentWidth, 8, "F");
  pdf.setTextColor(255, 255, 255);
  pdf.setFontSize(10);
  pdf.text("TOTAL ANNUEL", margin + 5, y + 5.5);
  pdf.text(formatCurrency(grandTotal), margin + contentWidth - 5, y + 5.5, { align: "right" });
  y += 15;

  // ========== CERTIFICATION ==========
  if (y > pageHeight - 50) {
    addNewPage();
  }

  pdf.setTextColor(textColor[0], textColor[1], textColor[2]);
  pdf.setFontSize(9);
  pdf.setFont("helvetica", "italic");
  
  const certText = `Ce relevé certifie que ${data.member.first_name} ${data.member.last_name} a effectué des contributions totalisant ${formatCurrency(grandTotal)} à ${data.churchInfo.name} durant l'année fiscale ${data.year}. Ce document peut être utilisé à des fins fiscales conformément aux lois en vigueur.`;
  
  const splitCert = pdf.splitTextToSize(certText, contentWidth - 10);
  
  pdf.setFillColor(254, 243, 199);
  pdf.roundedRect(margin, y, contentWidth, splitCert.length * 5 + 10, 3, 3, "F");
  
  pdf.setTextColor(146, 64, 14);
  pdf.text(splitCert, margin + 5, y + 8);
  y += splitCert.length * 5 + 20;

  // ========== SIGNATURE SECTION ==========
  if (y > pageHeight - 40) {
    addNewPage();
  }

  pdf.setTextColor(textColor[0], textColor[1], textColor[2]);
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(9);
  
  const signatureY = pageHeight - 35;
  
  // Date
  pdf.text(`Date d'émission: ${format(new Date(), "dd MMMM yyyy", { locale: fr })}`, margin, signatureY);
  
  // Signature line
  pdf.text("Signature autorisée: _____________________________", margin + contentWidth / 2, signatureY);
  
  // Footer
  pdf.setFontSize(8);
  pdf.setTextColor(mutedColor[0], mutedColor[1], mutedColor[2]);
  pdf.text(
    `Document généré par ChurchCRM - ${format(new Date(), "dd/MM/yyyy HH:mm")}`,
    pageWidth / 2,
    pageHeight - 10,
    { align: "center" }
  );

  // Add page numbers
  const totalPages = pdf.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    pdf.setPage(i);
    pdf.setFontSize(8);
    pdf.setTextColor(mutedColor[0], mutedColor[1], mutedColor[2]);
    pdf.text(`Page ${i} / ${totalPages}`, pageWidth - margin, pageHeight - 10, { align: "right" });
  }

  return pdf.output("blob");
}

export function downloadFiscalReceiptPDF(blob: Blob, memberName: string, year: number) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `releve_fiscal_${memberName.replace(/\s+/g, "_")}_${year}.pdf`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
