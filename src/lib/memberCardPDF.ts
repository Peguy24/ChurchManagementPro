import jsPDF from "jspdf";
import QRCode from "qrcode";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { getSignedUrl } from "@/hooks/useSignedUrl";

interface MemberCardData {
  id: string;
  first_name: string;
  last_name: string;
  qr_code: string | null;
  photo_url: string | null;
  phone: string | null;
  date_of_birth: string | null;
  join_date: string | null;
  member_number: string | null;
  role: string | null;
  baptism_status: string | null;
}

export interface CardCustomization {
  primaryColor: string;
  secondaryColor: string;
  textColor: string;
  showLogo: boolean;
  churchNameOnCard: boolean;
  churchName: string;
  logoUrl: string;
}

const hexToRgb = (hex: string): { r: number; g: number; b: number } => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      }
    : { r: 59, g: 130, b: 246 }; // Default blue
};

const CARD_WIDTH = 85.6; // mm (credit card size)
const CARD_HEIGHT = 54; // mm
const CARDS_PER_ROW = 2;
const CARDS_PER_PAGE = 4;
const PAGE_MARGIN = 10; // mm
const CARD_MARGIN = 5; // mm

const formatDate = (dateStr: string | null): string => {
  if (!dateStr) return "Non défini";
  try {
    return format(new Date(dateStr), "dd/MM/yyyy", { locale: fr });
  } catch {
    return "Non défini";
  }
};

const loadImageAsBase64 = async (url: string): Promise<string | null> => {
  try {
    const response = await fetch(url);
    const blob = await response.blob();
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
};

const generateQRCodeBase64 = async (data: string): Promise<string> => {
  return QRCode.toDataURL(data, {
    width: 200,
    margin: 1,
    color: { dark: "#000000", light: "#FFFFFF" },
  });
};

const drawCard = async (
  pdf: jsPDF,
  member: MemberCardData,
  x: number,
  y: number,
  customization?: CardCustomization,
  memberIndex: number = 0
) => {
  const primaryColor = hexToRgb(customization?.primaryColor || "#3B82F6");
  const secondaryColor = hexToRgb(customization?.secondaryColor || "#1E40AF");
  const textColor = hexToRgb(customization?.textColor || "#FFFFFF");

  // Card background
  pdf.setFillColor(255, 255, 255);
  pdf.roundedRect(x, y, CARD_WIDTH, CARD_HEIGHT, 3, 3, "F");

  // Card border
  pdf.setDrawColor(primaryColor.r, primaryColor.g, primaryColor.b);
  pdf.setLineWidth(0.5);
  pdf.roundedRect(x, y, CARD_WIDTH, CARD_HEIGHT, 3, 3, "S");

  // Header bar
  pdf.setFillColor(primaryColor.r, primaryColor.g, primaryColor.b);
  pdf.roundedRect(x, y, CARD_WIDTH, 10, 3, 3, "F");
  pdf.setFillColor(primaryColor.r, primaryColor.g, primaryColor.b);
  pdf.rect(x, y + 5, CARD_WIDTH, 5, "F");

  // Logo in header
  let headerTextX = x + 3;
  if (customization?.showLogo && customization?.logoUrl) {
    try {
      const logoBase64 = await loadImageAsBase64(customization.logoUrl);
      if (logoBase64) {
        pdf.addImage(logoBase64, "PNG", x + 2, y + 1.5, 7, 7);
        headerTextX = x + 11;
      }
    } catch (e) {
      console.error("Error loading logo:", e);
    }
  }

  // Header text
  pdf.setTextColor(textColor.r, textColor.g, textColor.b);
  pdf.setFontSize(7);
  pdf.setFont("helvetica", "bold");
  
  const headerTitle = customization?.churchNameOnCard && customization?.churchName 
    ? customization.churchName 
    : "CARTE DE MEMBRE";
  pdf.text(headerTitle, headerTextX, y + 6);

  // Always show member ID in header
  const displayId = member.member_number || `#${String(memberIndex + 1).padStart(4, "0")}`;
  pdf.setFontSize(6);
  pdf.text(displayId, x + CARD_WIDTH - 3, y + 6, { align: "right" });

  // Photo placeholder or image
  const photoX = x + 3;
  const photoY = y + 13;
  const photoSize = 18;

  pdf.setFillColor(240, 240, 240);
  pdf.roundedRect(photoX, photoY, photoSize, photoSize, 2, 2, "F");

  if (member.photo_url) {
    try {
      // Get signed URL for private storage bucket
      const signedUrl = await getSignedUrl(member.photo_url, "member-photos");
      if (signedUrl) {
        const photoBase64 = await loadImageAsBase64(signedUrl);
        if (photoBase64) {
          pdf.addImage(photoBase64, "JPEG", photoX, photoY, photoSize, photoSize);
        }
      }
    } catch (e) {
      console.error("Error loading photo:", e);
    }
  } else {
    // Draw placeholder icon
    pdf.setDrawColor(180, 180, 180);
    pdf.setLineWidth(0.3);
    pdf.circle(photoX + photoSize / 2, photoY + 6, 4, "S");
    pdf.line(photoX + 4, photoY + 16, photoX + 14, photoY + 16);
  }

  // Name
  pdf.setTextColor(30, 30, 30);
  pdf.setFontSize(9);
  pdf.setFont("helvetica", "bold");
  pdf.text(member.first_name, x + 24, y + 16);
  
  pdf.setTextColor(primaryColor.r, primaryColor.g, primaryColor.b);
  pdf.text(member.last_name.toUpperCase(), x + 24, y + 21);

  // Role badge
  if (member.role) {
    pdf.setFillColor(239, 246, 255);
    pdf.roundedRect(x + 24, y + 23, 20, 4, 1, 1, "F");
    pdf.setTextColor(primaryColor.r, primaryColor.g, primaryColor.b);
    pdf.setFontSize(5);
    pdf.setFont("helvetica", "normal");
    pdf.text(member.role, x + 25, y + 26);
  }

  // Member info
  pdf.setTextColor(100, 100, 100);
  pdf.setFontSize(6);
  pdf.setFont("helvetica", "normal");

  const infoX = x + 3;
  let infoY = y + 35;

  // Date of birth
  pdf.setFont("helvetica", "bold");
  pdf.text("Né(e) le:", infoX, infoY);
  pdf.setFont("helvetica", "normal");
  pdf.text(formatDate(member.date_of_birth), infoX + 12, infoY);

  infoY += 4;

  // Join date
  pdf.setFont("helvetica", "bold");
  pdf.text("Membre depuis:", infoX, infoY);
  pdf.setFont("helvetica", "normal");
  pdf.text(formatDate(member.join_date), infoX + 18, infoY);

  infoY += 4;

  // Phone
  if (member.phone) {
    pdf.setFont("helvetica", "bold");
    pdf.text("Tél:", infoX, infoY);
    pdf.setFont("helvetica", "normal");
    pdf.text(member.phone, infoX + 6, infoY);
  }

  // QR Code
  const qrSize = 16;
  const qrX = x + CARD_WIDTH - qrSize - 5;
  const qrY = y + 14;

  if (member.qr_code) {
    try {
      const qrCodeBase64 = await generateQRCodeBase64(member.qr_code);
      pdf.addImage(qrCodeBase64, "PNG", qrX, qrY, qrSize, qrSize);
    } catch (e) {
      console.error("Error generating QR code:", e);
    }
  }

  // QR code label
  pdf.setFontSize(4);
  pdf.setTextColor(120, 120, 120);
  const qrLabel = member.member_number || member.qr_code || `#${String(memberIndex + 1).padStart(4, "0")}`;
  pdf.text(qrLabel, qrX + qrSize / 2, qrY + qrSize + 2, { align: "center" });

  // Footer branding
  pdf.setFontSize(6);
  pdf.setFont("helvetica", "bold");
  pdf.setTextColor(primaryColor.r, primaryColor.g, primaryColor.b);
  const footerName = customization?.churchNameOnCard 
    ? "Membre Actif" 
    : (customization?.churchName || "Church Manager Pro");
  pdf.text(footerName, x + CARD_WIDTH - 3, y + CARD_HEIGHT - 6, { align: "right" });

  pdf.setFontSize(4);
  pdf.setFont("helvetica", "normal");
  pdf.setTextColor(120, 120, 120);
  pdf.text("Membre Actif", x + CARD_WIDTH - 3, y + CARD_HEIGHT - 3, { align: "right" });

  // Baptism status badge
  if (member.baptism_status === "baptise" || member.baptism_status === "Oui") {
    pdf.setFillColor(220, 252, 231);
    pdf.roundedRect(x + CARD_WIDTH - 18, y + CARD_HEIGHT - 13, 12, 4, 1, 1, "F");
    pdf.setTextColor(22, 163, 74);
    pdf.setFontSize(4);
    pdf.text("Baptisé", x + CARD_WIDTH - 17, y + CARD_HEIGHT - 10);
  }
};

export const generateMemberCardsPDF = async (
  members: MemberCardData[],
  onProgress?: (progress: number) => void,
  customization?: CardCustomization
): Promise<Blob> => {
  const pdf = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  const pageWidth = pdf.internal.pageSize.getWidth();

  // Calculate starting positions for centering cards
  const totalCardsWidth = CARDS_PER_ROW * CARD_WIDTH + (CARDS_PER_ROW - 1) * CARD_MARGIN;
  const startX = (pageWidth - totalCardsWidth) / 2;

  let cardIndex = 0;
  const totalCards = members.length;

  for (let i = 0; i < members.length; i++) {
    const member = members[i];
    const positionOnPage = cardIndex % CARDS_PER_PAGE;

    // Add new page if needed (except for first card)
    if (positionOnPage === 0 && cardIndex > 0) {
      pdf.addPage();
    }

    // Calculate position
    const col = positionOnPage % CARDS_PER_ROW;
    const row = Math.floor(positionOnPage / CARDS_PER_ROW);

    const x = startX + col * (CARD_WIDTH + CARD_MARGIN);
    const y = PAGE_MARGIN + row * (CARD_HEIGHT + CARD_MARGIN);

    await drawCard(pdf, member, x, y, customization, i);

    cardIndex++;
    onProgress?.(Math.round((cardIndex / totalCards) * 100));
  }

  return pdf.output("blob");
};

export const generateSingleMemberCardPDF = async (
  member: MemberCardData,
  customization?: CardCustomization
): Promise<Blob> => {
  const pdf = new jsPDF({
    orientation: "landscape",
    unit: "mm",
    format: [CARD_WIDTH + 20, CARD_HEIGHT + 20],
  });

  await drawCard(pdf, member, 10, 10, customization);

  return pdf.output("blob");
};

export const downloadPDF = (blob: Blob, filename: string) => {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};
