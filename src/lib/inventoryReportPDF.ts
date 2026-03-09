import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { getSignedUrl } from "@/hooks/useSignedUrl";
import { formatCurrency as formatCurrencyLib } from "./currency";

interface InventoryItem {
  id: string;
  name: string;
  description: string | null;
  category: string;
  serial_number: string | null;
  barcode: string | null;
  purchase_date: string | null;
  purchase_price: number | null;
  current_value: number | null;
  location: string | null;
  status: string;
  condition: string | null;
  quantity: number;
  min_quantity: number;
  photo_url: string | null;
  notes: string | null;
}

interface MaintenanceRecord {
  id: string;
  item_id: string;
  maintenance_type: string;
  description: string;
  cost: number | null;
  maintenance_date: string;
  performed_by: string | null;
  status: string;
  inventory_items?: { name: string };
}

interface ReportOptions {
  includePhotos: boolean;
  includeStatistics: boolean;
  includeMaintenanceHistory: boolean;
  churchName?: string;
  logoUrl?: string;
  currencyCode?: string;
}

const categories: Record<string, string> = {
  general: "Général",
  audio_video: "Audio/Vidéo",
  furniture: "Mobilier",
  musical: "Instruments de musique",
  office: "Bureautique",
  kitchen: "Cuisine",
  cleaning: "Nettoyage",
  decoration: "Décoration",
  vehicle: "Véhicule",
  it_equipment: "Équipement informatique",
  other: "Autre",
};

const statusLabels: Record<string, string> = {
  available: "Disponible",
  in_use: "En utilisation",
  maintenance: "En maintenance",
  missing: "Manquant",
  disposed: "Retiré",
};

const conditionLabels: Record<string, string> = {
  excellent: "Excellent",
  good: "Bon",
  fair: "Acceptable",
  poor: "Mauvais",
  damaged: "Endommagé",
};

const formatDate = (dateStr: string | null): string => {
  if (!dateStr) return "-";
  try {
    return format(new Date(dateStr), "dd/MM/yyyy", { locale: fr });
  } catch {
    return "-";
  }
};

let _currencyCode = "USD";

const formatCurrency = (value: number | null): string => {
  if (value === null || value === undefined) return "-";
  return formatCurrencyLib(value, _currencyCode);
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

export const generateInventoryReportPDF = async (
  items: InventoryItem[],
  maintenanceRecords: MaintenanceRecord[],
  options: ReportOptions,
  onProgress?: (progress: number) => void
): Promise<Blob> => {
  _currencyCode = options.currencyCode || "USD";
  const pdf = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 15;
  let currentY = margin;

  // Helper to add new page if needed
  const checkNewPage = (neededHeight: number) => {
    if (currentY + neededHeight > pageHeight - margin) {
      pdf.addPage();
      currentY = margin;
      return true;
    }
    return false;
  };

  // ========== HEADER ==========
  pdf.setFillColor(59, 130, 246);
  pdf.rect(0, 0, pageWidth, 35, "F");

  // Logo if available
  let headerTextX = margin;
  if (options.logoUrl) {
    try {
      const logoBase64 = await loadImageAsBase64(options.logoUrl);
      if (logoBase64) {
        pdf.addImage(logoBase64, "PNG", margin, 8, 20, 20);
        headerTextX = margin + 25;
      }
    } catch (e) {
      console.error("Error loading logo:", e);
    }
  }

  pdf.setTextColor(255, 255, 255);
  pdf.setFontSize(18);
  pdf.setFont("helvetica", "bold");
  pdf.text(options.churchName || "Rapport d'Inventaire", headerTextX, 18);

  pdf.setFontSize(10);
  pdf.setFont("helvetica", "normal");
  pdf.text(`Généré le ${format(new Date(), "dd MMMM yyyy 'à' HH:mm", { locale: fr })}`, headerTextX, 26);

  currentY = 45;

  // ========== STATISTICS ==========
  if (options.includeStatistics) {
    pdf.setTextColor(30, 30, 30);
    pdf.setFontSize(14);
    pdf.setFont("helvetica", "bold");
    pdf.text("Statistiques Générales", margin, currentY);
    currentY += 8;

    // Calculate stats
    const totalItems = items.length;
    const totalQuantity = items.reduce((sum, i) => sum + (i.quantity || 0), 0);
    const totalValue = items.reduce((sum, i) => sum + (i.current_value || 0), 0);
    const totalPurchaseValue = items.reduce((sum, i) => sum + (i.purchase_price || 0), 0);
    const depreciation = totalPurchaseValue - totalValue;
    const maintenanceCost = maintenanceRecords.reduce((sum, m) => sum + (m.cost || 0), 0);

    const statusCounts = {
      available: items.filter((i) => i.status === "available").length,
      in_use: items.filter((i) => i.status === "in_use").length,
      maintenance: items.filter((i) => i.status === "maintenance").length,
      missing: items.filter((i) => i.status === "missing").length,
      disposed: items.filter((i) => i.status === "disposed").length,
    };

    const lowStock = items.filter((i) => i.quantity <= i.min_quantity && i.min_quantity > 0).length;

    // Stats boxes
    const boxWidth = (pageWidth - 2 * margin - 10) / 3;
    const boxHeight = 22;

    const statsData = [
      { label: "Total Articles", value: totalItems.toString(), sublabel: `${totalQuantity} unités` },
      { label: "Valeur Totale", value: formatCurrency(totalValue), sublabel: `Achat: ${formatCurrency(totalPurchaseValue)}` },
      { label: "Dépréciation", value: formatCurrency(depreciation), sublabel: `Maintenance: ${formatCurrency(maintenanceCost)}` },
    ];

    statsData.forEach((stat, index) => {
      const boxX = margin + index * (boxWidth + 5);
      
      pdf.setFillColor(248, 250, 252);
      pdf.roundedRect(boxX, currentY, boxWidth, boxHeight, 2, 2, "F");
      
      pdf.setDrawColor(226, 232, 240);
      pdf.roundedRect(boxX, currentY, boxWidth, boxHeight, 2, 2, "S");

      pdf.setTextColor(100, 116, 139);
      pdf.setFontSize(8);
      pdf.setFont("helvetica", "normal");
      pdf.text(stat.label, boxX + 4, currentY + 6);

      pdf.setTextColor(30, 41, 59);
      pdf.setFontSize(12);
      pdf.setFont("helvetica", "bold");
      pdf.text(stat.value, boxX + 4, currentY + 14);

      pdf.setTextColor(148, 163, 184);
      pdf.setFontSize(7);
      pdf.setFont("helvetica", "normal");
      pdf.text(stat.sublabel, boxX + 4, currentY + 19);
    });

    currentY += boxHeight + 8;

    // Status distribution
    pdf.setTextColor(30, 30, 30);
    pdf.setFontSize(10);
    pdf.setFont("helvetica", "bold");
    pdf.text("Répartition par Statut", margin, currentY);
    currentY += 5;

    const statusColors: Record<string, [number, number, number]> = {
      available: [34, 197, 94],
      in_use: [59, 130, 246],
      maintenance: [234, 179, 8],
      missing: [239, 68, 68],
      disposed: [156, 163, 175],
    };

    Object.entries(statusCounts).forEach(([status, count]) => {
      if (count > 0) {
        const color = statusColors[status] || [156, 163, 175];
        pdf.setFillColor(color[0], color[1], color[2]);
        pdf.circle(margin + 3, currentY + 2, 2, "F");
        
        pdf.setTextColor(71, 85, 105);
        pdf.setFontSize(8);
        pdf.setFont("helvetica", "normal");
        pdf.text(`${statusLabels[status] || status}: ${count}`, margin + 8, currentY + 3);
        currentY += 5;
      }
    });

    if (lowStock > 0) {
      currentY += 2;
      pdf.setFillColor(251, 191, 36);
      pdf.roundedRect(margin, currentY, 60, 6, 1, 1, "F");
      pdf.setTextColor(146, 64, 14);
      pdf.setFontSize(7);
      pdf.setFont("helvetica", "bold");
      pdf.text(`⚠ ${lowStock} article(s) en stock faible`, margin + 2, currentY + 4);
    }

    currentY += 12;
  }

  // ========== ITEMS TABLE ==========
  checkNewPage(30);
  
  pdf.setTextColor(30, 30, 30);
  pdf.setFontSize(14);
  pdf.setFont("helvetica", "bold");
  pdf.text("Liste des Articles", margin, currentY);
  currentY += 8;

  // Group items by category
  const itemsByCategory = items.reduce((acc, item) => {
    const cat = item.category || "other";
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(item);
    return acc;
  }, {} as Record<string, InventoryItem[]>);

  let progressCount = 0;
  const totalSteps = items.length + (options.includePhotos ? items.filter(i => i.photo_url).length : 0);

  for (const [category, categoryItems] of Object.entries(itemsByCategory)) {
    checkNewPage(25);

    // Category header
    pdf.setFillColor(241, 245, 249);
    pdf.roundedRect(margin, currentY, pageWidth - 2 * margin, 7, 1, 1, "F");
    pdf.setTextColor(71, 85, 105);
    pdf.setFontSize(10);
    pdf.setFont("helvetica", "bold");
    pdf.text(`${categories[category] || category} (${categoryItems.length})`, margin + 3, currentY + 5);
    currentY += 10;

    // Table for this category
    const tableData = categoryItems.map((item) => [
      item.name,
      item.quantity.toString(),
      statusLabels[item.status] || item.status,
      conditionLabels[item.condition || ""] || item.condition || "-",
      formatCurrency(item.current_value),
      item.location || "-",
    ]);

    autoTable(pdf, {
      startY: currentY,
      head: [["Nom", "Qté", "Statut", "État", "Valeur", "Emplacement"]],
      body: tableData,
      margin: { left: margin, right: margin },
      styles: {
        fontSize: 8,
        cellPadding: 2,
      },
      headStyles: {
        fillColor: [59, 130, 246],
        textColor: [255, 255, 255],
        fontStyle: "bold",
      },
      alternateRowStyles: {
        fillColor: [248, 250, 252],
      },
      columnStyles: {
        0: { cellWidth: 45 },
        1: { cellWidth: 15, halign: "center" },
        2: { cellWidth: 25 },
        3: { cellWidth: 25 },
        4: { cellWidth: 30, halign: "right" },
        5: { cellWidth: 35 },
      },
    });

    currentY = (pdf as any).lastAutoTable.finalY + 8;
    progressCount += categoryItems.length;
    onProgress?.(Math.round((progressCount / totalSteps) * 50));
  }

  // ========== ITEMS WITH PHOTOS ==========
  if (options.includePhotos) {
    const itemsWithPhotos = items.filter((i) => i.photo_url);
    
    if (itemsWithPhotos.length > 0) {
      pdf.addPage();
      currentY = margin;

      pdf.setTextColor(30, 30, 30);
      pdf.setFontSize(14);
      pdf.setFont("helvetica", "bold");
      pdf.text("Catalogue Photos", margin, currentY);
      currentY += 10;

      const photoSize = 35;
      const itemCardWidth = (pageWidth - 2 * margin - 10) / 2;
      const itemCardHeight = photoSize + 20;

      for (let i = 0; i < itemsWithPhotos.length; i++) {
        const item = itemsWithPhotos[i];
        const col = i % 2;
        const isNewRow = col === 0;

        if (isNewRow) {
          checkNewPage(itemCardHeight + 5);
        }

        const cardX = margin + col * (itemCardWidth + 10);
        const cardY = currentY;

        // Card background
        pdf.setFillColor(255, 255, 255);
        pdf.setDrawColor(226, 232, 240);
        pdf.roundedRect(cardX, cardY, itemCardWidth, itemCardHeight, 2, 2, "FD");

        // Load and add photo (using signed URL for private bucket)
        if (item.photo_url) {
          try {
            const signedUrl = await getSignedUrl(item.photo_url, "inventory-photos");
            if (signedUrl) {
              const photoBase64 = await loadImageAsBase64(signedUrl);
              if (photoBase64) {
                pdf.addImage(photoBase64, "JPEG", cardX + 3, cardY + 3, photoSize, photoSize);
              }
            }
          } catch (e) {
            console.error("Error loading photo:", e);
            pdf.setFillColor(241, 245, 249);
            pdf.rect(cardX + 3, cardY + 3, photoSize, photoSize, "F");
          }
        }

        // Item info
        const infoX = cardX + photoSize + 8;
        let infoY = cardY + 10;

        pdf.setTextColor(30, 41, 59);
        pdf.setFontSize(9);
        pdf.setFont("helvetica", "bold");
        const itemName = item.name.length > 18 ? item.name.substring(0, 18) + "..." : item.name;
        pdf.text(itemName, infoX, infoY);

        infoY += 5;
        pdf.setTextColor(100, 116, 139);
        pdf.setFontSize(7);
        pdf.setFont("helvetica", "normal");
        pdf.text(`${categories[item.category] || item.category}`, infoX, infoY);

        infoY += 4;
        pdf.text(`Qté: ${item.quantity}`, infoX, infoY);

        infoY += 4;
        pdf.text(`${statusLabels[item.status] || item.status}`, infoX, infoY);

        infoY += 4;
        pdf.setFontSize(8);
        pdf.setFont("helvetica", "bold");
        pdf.setTextColor(59, 130, 246);
        pdf.text(formatCurrency(item.current_value), infoX, infoY);

        if (item.barcode) {
          infoY += 4;
          pdf.setFontSize(6);
          pdf.setFont("helvetica", "normal");
          pdf.setTextColor(148, 163, 184);
          pdf.text(item.barcode, infoX, infoY);
        }

        if (col === 1 || i === itemsWithPhotos.length - 1) {
          currentY += itemCardHeight + 5;
        }

        progressCount++;
        onProgress?.(50 + Math.round((progressCount / totalSteps) * 25));
      }
    }
  }

  // ========== MAINTENANCE HISTORY ==========
  if (options.includeMaintenanceHistory && maintenanceRecords.length > 0) {
    pdf.addPage();
    currentY = margin;

    pdf.setTextColor(30, 30, 30);
    pdf.setFontSize(14);
    pdf.setFont("helvetica", "bold");
    pdf.text("Historique de Maintenance", margin, currentY);
    currentY += 8;

    // Summary
    const totalMaintenanceCost = maintenanceRecords.reduce((sum, m) => sum + (m.cost || 0), 0);
    pdf.setTextColor(71, 85, 105);
    pdf.setFontSize(9);
    pdf.setFont("helvetica", "normal");
    pdf.text(`${maintenanceRecords.length} interventions - Coût total: ${formatCurrency(totalMaintenanceCost)}`, margin, currentY);
    currentY += 8;

    const maintenanceData = maintenanceRecords.slice(0, 50).map((record) => [
      formatDate(record.maintenance_date),
      record.inventory_items?.name || "-",
      record.maintenance_type,
      record.description.length > 30 ? record.description.substring(0, 30) + "..." : record.description,
      formatCurrency(record.cost),
      record.status,
    ]);

    autoTable(pdf, {
      startY: currentY,
      head: [["Date", "Article", "Type", "Description", "Coût", "Statut"]],
      body: maintenanceData,
      margin: { left: margin, right: margin },
      styles: {
        fontSize: 7,
        cellPadding: 2,
      },
      headStyles: {
        fillColor: [245, 158, 11],
        textColor: [255, 255, 255],
        fontStyle: "bold",
      },
      alternateRowStyles: {
        fillColor: [254, 252, 232],
      },
    });

    currentY = (pdf as any).lastAutoTable.finalY + 8;
  }

  // ========== FOOTER ==========
  const totalPages = pdf.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    pdf.setPage(i);
    pdf.setFontSize(8);
    pdf.setTextColor(148, 163, 184);
    pdf.text(
      `Page ${i} / ${totalPages}`,
      pageWidth / 2,
      pageHeight - 8,
      { align: "center" }
    );
    pdf.text(
      `Rapport d'inventaire - ${format(new Date(), "dd/MM/yyyy")}`,
      margin,
      pageHeight - 8
    );
  }

  onProgress?.(100);
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
