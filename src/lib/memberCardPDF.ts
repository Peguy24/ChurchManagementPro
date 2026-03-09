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
  ministry: string | null;
}

export interface CardCustomization {
  primaryColor: string;
  secondaryColor: string;
  textColor: string;
  showLogo: boolean;
  churchNameOnCard: boolean;
  churchName: string;
  logoUrl: string;
  language?: string;
}

// ASCII-safe text for jsPDF default fonts
function sanitize(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\x20-\x7E]/g, "");
}

const cardTranslations = {
  fr: {
    memberCard: "CARTE DE MEMBRE",
    ministry: "Ministere:",
    memberSince: "Membre depuis:",
    phone: "Tel:",
    notDefined: "Non defini",
    activeMember: "Membre Actif",
    baptized: "Baptise",
  },
  en: {
    memberCard: "MEMBER CARD",
    ministry: "Ministry:",
    memberSince: "Member since:",
    phone: "Phone:",
    notDefined: "Not defined",
    activeMember: "Active Member",
    baptized: "Baptized",
  },
  ht: {
    memberCard: "KAT MANM",
    ministry: "Ministè:",
    memberSince: "Manm depi:",
    phone: "Tel:",
    notDefined: "Pa defini",
    activeMember: "Manm Aktif",
    baptized: "Batize",
  },
};

type Lang = "fr" | "en" | "ht";

const getT = (language?: string) => {
  const lang = (language || "en") as Lang;
  return cardTranslations[lang] || cardTranslations.en;
};

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

const formatDate = (dateStr: string | null, language?: string): string => {
  const t = getT(language);
  if (!dateStr) return t.notDefined;
  try {
    return format(new Date(dateStr), "dd/MM/yyyy", { locale: fr });
  } catch {
    return t.notDefined;
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
  const t = getT(customization?.language);
  const primaryColor = hexToRgb(customization?.primaryColor || "#3B82F6");
  const secondaryColor = hexToRgb(customization?.secondaryColor || "#1E40AF");
  const textColor = hexToRgb(customization?.textColor || "#FFFFFF");

  // ── Card outline with rounded corners ──
  pdf.setFillColor(255, 255, 255);
  pdf.roundedRect(x, y, CARD_WIDTH, CARD_HEIGHT, 3, 3, "F");

  // ── Gradient-style header (simulate gradient with two overlapping rects) ──
  const headerH = 13;
  // Main primary fill
  pdf.setFillColor(primaryColor.r, primaryColor.g, primaryColor.b);
  pdf.roundedRect(x, y, CARD_WIDTH, headerH, 3, 3, "F");
  // Square off bottom corners of header
  pdf.rect(x, y + headerH - 3, CARD_WIDTH, 3, "F");
  // Secondary overlay on right half to simulate gradient
  pdf.setGState(new (pdf as any).GState({ opacity: 0.35 }));
  pdf.setFillColor(secondaryColor.r, secondaryColor.g, secondaryColor.b);
  pdf.rect(x + CARD_WIDTH * 0.4, y, CARD_WIDTH * 0.6, headerH, "F");
  pdf.setGState(new (pdf as any).GState({ opacity: 1 }));

  // ── Logo in header ──
  let headerTextX = x + 3;
  if (customization?.showLogo && customization?.logoUrl) {
    try {
      const logoBase64 = await loadImageAsBase64(customization.logoUrl);
      if (logoBase64) {
        // White circle background for logo
        pdf.setFillColor(255, 255, 255);
        pdf.circle(x + 6.5, y + headerH / 2, 5, "F");
        pdf.addImage(logoBase64, "PNG", x + 2, y + 1.5, 9, 9);
        headerTextX = x + 13;
      }
    } catch (e) {
      console.error("Error loading logo:", e);
    }
  }

  // ── Header text (church name or "MEMBER CARD") ──
  pdf.setTextColor(textColor.r, textColor.g, textColor.b);
  pdf.setFontSize(7);
  pdf.setFont("helvetica", "bold");
  const headerTitle = customization?.churchNameOnCard && customization?.churchName
    ? sanitize(customization.churchName)
    : sanitize(t.memberCard);
  // Truncate long names
  const maxTitleLen = customization?.showLogo ? 28 : 35;
  const displayTitle = headerTitle.length > maxTitleLen ? headerTitle.slice(0, maxTitleLen) + "..." : headerTitle;
  pdf.text(displayTitle.toUpperCase(), headerTextX, y + 5.5);

  // Member number below church name
  const displayId = member.member_number || `#${String(memberIndex + 1).padStart(4, "0")}`;
  pdf.setFontSize(5);
  pdf.setFont("helvetica", "normal");
  pdf.setTextColor(255, 255, 255);
  pdf.text(`N° ${displayId}`, headerTextX, y + 9.5);

  // ── Photo with colored border (simulate gradient border) ──
  const photoX = x + 3;
  const photoY = y + headerH + 2;
  const photoSize = 20;

  // Gradient-style border around photo
  pdf.setFillColor(primaryColor.r, primaryColor.g, primaryColor.b);
  pdf.roundedRect(photoX - 0.8, photoY - 0.8, photoSize + 1.6, photoSize + 1.6, 2.5, 2.5, "F");
  pdf.setGState(new (pdf as any).GState({ opacity: 0.5 }));
  pdf.setFillColor(secondaryColor.r, secondaryColor.g, secondaryColor.b);
  pdf.roundedRect(photoX - 0.8, photoY - 0.8 + photoSize * 0.5, photoSize + 1.6, (photoSize + 1.6) * 0.5, 0, 0, "F");
  pdf.setGState(new (pdf as any).GState({ opacity: 1 }));

  // Photo background
  pdf.setFillColor(240, 240, 240);
  pdf.roundedRect(photoX, photoY, photoSize, photoSize, 2, 2, "F");

  if (member.photo_url) {
    try {
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
    // Placeholder icon
    pdf.setDrawColor(180, 180, 180);
    pdf.setLineWidth(0.3);
    pdf.circle(photoX + photoSize / 2, photoY + 6, 4, "S");
    pdf.line(photoX + 4, photoY + 16, photoX + 16, photoY + 16);
  }

  // ── Name and Role (right of photo) ──
  const nameX = x + 26;
  const nameY = photoY + 4;

  // First name
  pdf.setTextColor(40, 40, 40);
  pdf.setFontSize(10);
  pdf.setFont("helvetica", "bold");
  pdf.text(sanitize(member.first_name), nameX, nameY);

  // Last name in primary color
  pdf.setTextColor(primaryColor.r, primaryColor.g, primaryColor.b);
  pdf.setFontSize(10);
  pdf.text(sanitize(member.last_name.toUpperCase()), nameX, nameY + 5);

  // Role badge
  if (member.role) {
    const roleText = sanitize(member.role);
    const roleTextWidth = pdf.getStringUnitWidth(roleText) * 5 / pdf.internal.scaleFactor;
    pdf.setFillColor(primaryColor.r, primaryColor.g, primaryColor.b);
    pdf.roundedRect(nameX, nameY + 7, roleTextWidth + 4, 4, 2, 2, "F");
    pdf.setTextColor(255, 255, 255);
    pdf.setFontSize(5);
    pdf.setFont("helvetica", "bold");
    pdf.text(roleText, nameX + 2, nameY + 9.8);
  }

  // ── Info section with colored dot indicators ──
  const infoStartY = y + headerH + 24;
  pdf.setFontSize(5.5);

  // Ministry
  if (member.ministry) {
    // Colored dot
    pdf.setFillColor(primaryColor.r, primaryColor.g, primaryColor.b);
    pdf.setGState(new (pdf as any).GState({ opacity: 0.15 }));
    pdf.roundedRect(x + 3, infoStartY - 2.5, 5, 5, 1.5, 1.5, "F");
    pdf.setGState(new (pdf as any).GState({ opacity: 1 }));

    pdf.setTextColor(120, 120, 120);
    pdf.setFont("helvetica", "normal");
    pdf.text(sanitize(t.ministry.replace(":", "")), x + 10, infoStartY - 0.5);
    pdf.setTextColor(40, 40, 40);
    pdf.setFont("helvetica", "bold");
    const ministryName = sanitize(member.ministry);
    pdf.text(ministryName.length > 25 ? ministryName.slice(0, 25) + "..." : ministryName, x + 10, infoStartY + 2.5);
  }

  // Member since
  const sinceY = member.ministry ? infoStartY + 6 : infoStartY;
  pdf.setFillColor(primaryColor.r, primaryColor.g, primaryColor.b);
  pdf.setGState(new (pdf as any).GState({ opacity: 0.15 }));
  pdf.roundedRect(x + 3, sinceY - 2.5, 5, 5, 1.5, 1.5, "F");
  pdf.setGState(new (pdf as any).GState({ opacity: 1 }));

  pdf.setTextColor(120, 120, 120);
  pdf.setFont("helvetica", "normal");
  pdf.text(sanitize(t.memberSince.replace(":", "")), x + 10, sinceY - 0.5);
  pdf.setTextColor(40, 40, 40);
  pdf.setFont("helvetica", "bold");
  pdf.text(formatDate(member.join_date, customization?.language), x + 10, sinceY + 2.5);

  // ── Separator line ──
  const sepY = y + CARD_HEIGHT - 16;
  pdf.setDrawColor(primaryColor.r, primaryColor.g, primaryColor.b);
  pdf.setGState(new (pdf as any).GState({ opacity: 0.15 }));
  pdf.setLineWidth(0.2);
  pdf.line(x + 3, sepY, x + CARD_WIDTH - 3, sepY);
  pdf.setGState(new (pdf as any).GState({ opacity: 1 }));

  // ── QR Code with styled container ──
  const qrSize = 13;
  const qrX = x + 3;
  const qrY = sepY + 1;

  // QR container with subtle border
  pdf.setFillColor(250, 250, 252);
  pdf.setDrawColor(primaryColor.r, primaryColor.g, primaryColor.b);
  pdf.setGState(new (pdf as any).GState({ opacity: 0.2 }));
  pdf.roundedRect(qrX - 0.5, qrY - 0.5, qrSize + 1, qrSize + 1, 1.5, 1.5, "FD");
  pdf.setGState(new (pdf as any).GState({ opacity: 1 }));

  if (member.qr_code) {
    try {
      const qrCodeBase64 = await generateQRCodeBase64(member.qr_code);
      pdf.addImage(qrCodeBase64, "PNG", qrX, qrY, qrSize, qrSize);
    } catch (e) {
      console.error("Error generating QR code:", e);
    }
  }

  // QR label
  pdf.setFontSize(3.5);
  pdf.setTextColor(140, 140, 140);
  pdf.setFont("helvetica", "normal");
  const qrLabel = member.member_number || member.qr_code || `#${String(memberIndex + 1).padStart(4, "0")}`;
  pdf.text(qrLabel, qrX + qrSize / 2, qrY + qrSize + 2, { align: "center" });

  // ── Status badges (right side, bottom) ──
  const badgeX = x + CARD_WIDTH - 3;
  const badgeY = sepY + 3;

  // Active member badge with gradient-style fill
  const activeBadgeText = sanitize(t.activeMember);
  const activeBadgeW = pdf.getStringUnitWidth(activeBadgeText) * 5 / pdf.internal.scaleFactor + 7;
  pdf.setFillColor(primaryColor.r, primaryColor.g, primaryColor.b);
  pdf.roundedRect(badgeX - activeBadgeW, badgeY, activeBadgeW, 5, 2.5, 2.5, "F");
  // Green dot indicator
  pdf.setFillColor(74, 222, 128);
  pdf.circle(badgeX - activeBadgeW + 3, badgeY + 2.5, 1, "F");
  pdf.setTextColor(255, 255, 255);
  pdf.setFontSize(5);
  pdf.setFont("helvetica", "bold");
  pdf.text(activeBadgeText, badgeX - activeBadgeW + 5.5, badgeY + 3.5);

  // Baptism badge
  if (member.baptism_status === "baptise" || member.baptism_status === "Oui") {
    const baptBadgeText = sanitize("✓ " + t.baptized);
    const baptBadgeW = pdf.getStringUnitWidth(baptBadgeText) * 4.5 / pdf.internal.scaleFactor + 4;
    pdf.setFillColor(16, 185, 129);
    pdf.roundedRect(badgeX - baptBadgeW, badgeY + 6, baptBadgeW, 4, 2, 2, "F");
    pdf.setTextColor(255, 255, 255);
    pdf.setFontSize(4.5);
    pdf.setFont("helvetica", "bold");
    pdf.text(baptBadgeText, badgeX - baptBadgeW + 2, badgeY + 8.8);
  }

  // ── Bottom accent bar (gradient-style) ──
  const barH = 1.5;
  const barY = y + CARD_HEIGHT - barH;
  // Left secondary
  pdf.setFillColor(secondaryColor.r, secondaryColor.g, secondaryColor.b);
  pdf.rect(x, barY, CARD_WIDTH / 3, barH, "F");
  // Center primary
  pdf.setFillColor(primaryColor.r, primaryColor.g, primaryColor.b);
  pdf.rect(x + CARD_WIDTH / 3, barY, CARD_WIDTH / 3, barH, "F");
  // Right secondary
  pdf.setFillColor(secondaryColor.r, secondaryColor.g, secondaryColor.b);
  pdf.rect(x + (CARD_WIDTH * 2) / 3, barY, CARD_WIDTH / 3, barH, "F");

  // ── Card border ──
  pdf.setDrawColor(220, 220, 220);
  pdf.setLineWidth(0.3);
  pdf.roundedRect(x, y, CARD_WIDTH, CARD_HEIGHT, 3, 3, "S");
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
