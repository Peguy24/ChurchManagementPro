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

/** Truncate a string so it fits `maxW` mm at the current font settings. */
const fitText = (pdf: jsPDF, text: string, maxW: number): string => {
  let out = text;
  if (pdf.getTextWidth(out) <= maxW) return out;
  while (out.length > 1 && pdf.getTextWidth(out + "...") > maxW) {
    out = out.slice(0, -1);
  }
  return out.trimEnd() + "...";
};

/** Rounded pill badge with centered label. Returns its width. */
const drawBadge = (
  pdf: jsPDF,
  label: string,
  rightX: number,
  topY: number,
  fill: { r: number; g: number; b: number },
  fontSize: number,
  height: number,
  maxW: number
): number => {
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(fontSize);
  const text = fitText(pdf, label, maxW - 4);
  const w = Math.min(maxW, pdf.getTextWidth(text) + 4);
  pdf.setFillColor(fill.r, fill.g, fill.b);
  pdf.roundedRect(rightX - w, topY, w, height, height / 2, height / 2, "F");
  pdf.setTextColor(255, 255, 255);
  pdf.text(text, rightX - w / 2, topY + height / 2 + fontSize * 0.12, { align: "center" });
  return w;
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

  const RIGHT = x + CARD_WIDTH;
  const PAD = 4;

  // ── Card body ──
  pdf.setFillColor(255, 255, 255);
  pdf.roundedRect(x, y, CARD_WIDTH, CARD_HEIGHT, 3, 3, "F");

  // ── Header band ──
  const headerH = 12.5;
  pdf.setFillColor(primaryColor.r, primaryColor.g, primaryColor.b);
  pdf.roundedRect(x, y, CARD_WIDTH, headerH, 3, 3, "F");
  pdf.rect(x, y + headerH - 3, CARD_WIDTH, 3, "F");
  pdf.setGState(new (pdf as any).GState({ opacity: 0.3 }));
  pdf.setFillColor(secondaryColor.r, secondaryColor.g, secondaryColor.b);
  pdf.rect(x + CARD_WIDTH * 0.45, y, CARD_WIDTH * 0.55, headerH, "F");
  pdf.setGState(new (pdf as any).GState({ opacity: 1 }));

  // Logo
  let headerTextX = x + PAD;
  if (customization?.showLogo && customization?.logoUrl) {
    try {
      const logoBase64 = await loadImageAsBase64(customization.logoUrl);
      if (logoBase64) {
        pdf.setFillColor(255, 255, 255);
        pdf.circle(x + PAD + 4.25, y + headerH / 2, 4.5, "F");
        pdf.addImage(logoBase64, "PNG", x + PAD + 0.75, y + headerH / 2 - 3.5, 7, 7);
        headerTextX = x + PAD + 10.5;
      }
    } catch (e) {
      console.error("Error loading logo:", e);
    }
  }

  // Member number (right side of the header, reserved space)
  const displayId = member.member_number || `#${String(memberIndex + 1).padStart(4, "0")}`;
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(6);
  pdf.setTextColor(textColor.r, textColor.g, textColor.b);
  const idText = sanitize(`No ${displayId}`);
  const idW = pdf.getTextWidth(idText);
  pdf.text(idText, RIGHT - PAD, y + headerH / 2 + 1.9, { align: "right" });

  // Header title + subtitle
  const headerMaxW = RIGHT - PAD - 2 - idW - headerTextX;
  const usingChurchName = !!(customization?.churchNameOnCard && customization?.churchName);
  const headerTitle = sanitize(usingChurchName ? customization!.churchName : t.memberCard).toUpperCase();
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(7.5);
  pdf.text(fitText(pdf, headerTitle, headerMaxW), headerTextX, y + (usingChurchName ? 5.6 : 7.6));
  if (usingChurchName) {
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(5);
    pdf.setGState(new (pdf as any).GState({ opacity: 0.85 }));
    pdf.text(fitText(pdf, sanitize(t.memberCard).toUpperCase(), headerMaxW), headerTextX, y + 9.4);
    pdf.setGState(new (pdf as any).GState({ opacity: 1 }));
  }

  // ── Photo ──
  const photoSize = 18;
  const photoX = x + PAD;
  const photoY = y + headerH + 2.5;

  pdf.setFillColor(primaryColor.r, primaryColor.g, primaryColor.b);
  pdf.roundedRect(photoX - 0.7, photoY - 0.7, photoSize + 1.4, photoSize + 1.4, 2.4, 2.4, "F");
  pdf.setFillColor(242, 244, 248);
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
    pdf.setDrawColor(175, 180, 190);
    pdf.setLineWidth(0.35);
    pdf.circle(photoX + photoSize / 2, photoY + 6.5, 3.2, "S");
    pdf.line(photoX + 3.5, photoY + 14.5, photoX + photoSize - 3.5, photoY + 14.5);
  }

  // ── Identity block (right of photo) ──
  const nameX = photoX + photoSize + 3.5;
  const nameMaxW = RIGHT - PAD - nameX;

  pdf.setTextColor(35, 38, 45);
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(9);
  pdf.text(fitText(pdf, sanitize(member.first_name), nameMaxW), nameX, photoY + 4.6);

  pdf.setTextColor(primaryColor.r, primaryColor.g, primaryColor.b);
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(10);
  pdf.text(fitText(pdf, sanitize(member.last_name).toUpperCase(), nameMaxW), nameX, photoY + 10);

  // Role pill + status badges on one baseline (no overlap)
  const pillY = photoY + 12.6;
  let usedRight = 0;
  const baptized = member.baptism_status === "baptise" || member.baptism_status === "Oui";
  if (baptized) {
    usedRight += drawBadge(pdf, sanitize(t.baptized), RIGHT - PAD, pillY, { r: 16, g: 185, b: 129 }, 4.8, 4.4, 20) + 1.5;
  }
  usedRight += drawBadge(
    pdf,
    sanitize(t.activeMember),
    RIGHT - PAD - usedRight,
    pillY,
    { r: 71, g: 85, b: 105 },
    4.8,
    4.4,
    22
  );

  if (member.role) {
    const roleMaxW = Math.max(10, RIGHT - PAD - usedRight - 2 - nameX);
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(5);
    const roleText = fitText(pdf, sanitize(member.role).toUpperCase(), roleMaxW - 4);
    const roleW = pdf.getTextWidth(roleText) + 4;
    pdf.setFillColor(primaryColor.r, primaryColor.g, primaryColor.b);
    pdf.roundedRect(nameX, pillY, roleW, 4.4, 2.2, 2.2, "F");
    pdf.setTextColor(255, 255, 255);
    pdf.text(roleText, nameX + roleW / 2, pillY + 2.9, { align: "center" });
  }

  // ── Separator ──
  const sepY = photoY + photoSize + 2.6;
  pdf.setDrawColor(primaryColor.r, primaryColor.g, primaryColor.b);
  pdf.setGState(new (pdf as any).GState({ opacity: 0.25 }));
  pdf.setLineWidth(0.25);
  pdf.line(x + PAD, sepY, RIGHT - PAD, sepY);
  pdf.setGState(new (pdf as any).GState({ opacity: 1 }));

  // ── QR code (bottom-right) ──
  const qrSize = 13.5;
  const qrX = RIGHT - PAD - qrSize;
  const qrY = sepY + 1.6;
  pdf.setFillColor(252, 252, 253);
  pdf.setDrawColor(225, 228, 235);
  pdf.setLineWidth(0.2);
  pdf.roundedRect(qrX - 0.7, qrY - 0.7, qrSize + 1.4, qrSize + 1.4, 1.4, 1.4, "FD");
  if (member.qr_code) {
    try {
      const qrCodeBase64 = await generateQRCodeBase64(member.qr_code);
      pdf.addImage(qrCodeBase64, "PNG", qrX, qrY, qrSize, qrSize);
    } catch (e) {
      console.error("Error generating QR code:", e);
    }
  }

  // ── Info rows (bottom-left, clear of the QR block) ──
  const infoX = x + PAD;
  const infoMaxW = qrX - 2.5 - infoX;
  const rows: Array<[string, string]> = [];
  if (member.ministry) rows.push([t.ministry, sanitize(member.ministry)]);
  rows.push([t.memberSince, formatDate(member.join_date, customization?.language)]);
  if (member.phone && rows.length < 3) rows.push([t.phone, sanitize(member.phone)]);

  let rowY = sepY + 4.2;
  for (const [label, value] of rows.slice(0, 3)) {
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(4.6);
    pdf.setTextColor(135, 140, 150);
    pdf.text(sanitize(label.replace(":", "")).toUpperCase(), infoX, rowY);

    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(6.2);
    pdf.setTextColor(40, 44, 52);
    pdf.text(fitText(pdf, value, infoMaxW), infoX, rowY + 3.3);
    rowY += 7.2;
  }

  // ── Bottom accent bar ──
  const barH = 1.6;
  const barY = y + CARD_HEIGHT - barH;
  pdf.setFillColor(secondaryColor.r, secondaryColor.g, secondaryColor.b);
  pdf.rect(x, barY, CARD_WIDTH, barH, "F");
  pdf.setFillColor(primaryColor.r, primaryColor.g, primaryColor.b);
  pdf.rect(x + CARD_WIDTH / 3, barY, CARD_WIDTH / 3, barH, "F");

  // ── Outline ──
  pdf.setDrawColor(215, 219, 226);
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
