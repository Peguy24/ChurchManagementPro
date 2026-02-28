import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { format, parseISO, startOfMonth, endOfMonth, eachMonthOfInterval } from "date-fns";
import { fr, enUS, ht } from "date-fns/locale";

interface Event {
  id: string;
  name: string;
  description: string | null;
  event_date: string;
  end_date: string | null;
  event_time: string | null;
  end_time: string | null;
  location: string | null;
  status: string;
  expected_attendees: number;
  event_category?: string | null;
}

const categoryColors: Record<string, [number, number, number]> = {
  general: [100, 100, 100],
  worship: [59, 130, 246],
  fasting: [168, 85, 247],
  conference: [234, 179, 8],
  retreat: [16, 185, 129],
  celebration: [239, 68, 68],
  prayer: [99, 102, 241],
  youth: [249, 115, 22],
  community: [20, 184, 166],
  holiday: [236, 72, 153],
};

const categoryLabels: Record<string, Record<string, string>> = {
  fr: {
    general: "Général", worship: "Culte", fasting: "Jeûne", conference: "Conférence",
    retreat: "Retraite", celebration: "Célébration", prayer: "Prière", youth: "Jeunesse",
    community: "Communauté", holiday: "Fête",
  },
  en: {
    general: "General", worship: "Worship", fasting: "Fasting", conference: "Conference",
    retreat: "Retreat", celebration: "Celebration", prayer: "Prayer", youth: "Youth",
    community: "Community", holiday: "Holiday",
  },
  ht: {
    general: "Jeneral", worship: "Adorasyon", fasting: "Jèn", conference: "Konferans",
    retreat: "Retrèt", celebration: "Selebrasyon", prayer: "Lapriyè", youth: "Jèn",
    community: "Kominote", holiday: "Fèt",
  },
};

export function generateAnnualCalendarPDF(
  events: Event[],
  year: number,
  churchName: string,
  language: string = "fr"
) {
  const doc = new jsPDF("landscape", "mm", "a4");
  const locale = language === "fr" ? fr : language === "ht" ? fr : enUS;
  const catLabels = categoryLabels[language] || categoryLabels.en;

  const titleText = language === "fr" ? `Calendrier Annuel ${year}` :
    language === "ht" ? `Kalandriye Anyèl ${year}` : `Annual Calendar ${year}`;

  // Title page
  doc.setFontSize(28);
  doc.setTextColor(40, 40, 40);
  doc.text(churchName || (language === "fr" ? "Église" : "Church"), 148.5, 60, { align: "center" });
  
  doc.setFontSize(22);
  doc.setTextColor(80, 80, 80);
  doc.text(titleText, 148.5, 78, { align: "center" });

  doc.setFontSize(12);
  doc.setTextColor(120, 120, 120);
  const totalText = language === "fr" ? `${events.length} événement(s) planifié(s)` :
    language === "ht" ? `${events.length} evènman planifye` : `${events.length} event(s) planned`;
  doc.text(totalText, 148.5, 92, { align: "center" });

  // Legend
  const legendY = 110;
  doc.setFontSize(10);
  doc.setTextColor(80, 80, 80);
  const legendTitle = language === "fr" ? "Légende des catégories:" : 
    language === "ht" ? "Lejand kategori:" : "Category legend:";
  doc.text(legendTitle, 30, legendY);

  let legendX = 30;
  Object.entries(categoryColors).forEach(([key, color], idx) => {
    const row = Math.floor(idx / 5);
    const col = idx % 5;
    const x = 30 + col * 55;
    const y = legendY + 8 + row * 10;
    doc.setFillColor(color[0], color[1], color[2]);
    doc.circle(x, y - 1, 2, "F");
    doc.setTextColor(60, 60, 60);
    doc.setFontSize(9);
    doc.text(catLabels[key] || key, x + 5, y);
  });

  // Monthly pages
  const months = eachMonthOfInterval({
    start: new Date(year, 0, 1),
    end: new Date(year, 11, 31),
  });

  months.forEach((monthDate) => {
    const monthEvents = events.filter((e) => {
      const d = e.event_date.split("-");
      return parseInt(d[0]) === year && parseInt(d[1]) === monthDate.getMonth() + 1;
    });

    if (monthEvents.length === 0) return;

    doc.addPage();
    
    const monthName = format(monthDate, "MMMM yyyy", { locale });
    doc.setFontSize(18);
    doc.setTextColor(40, 40, 40);
    doc.text(monthName.charAt(0).toUpperCase() + monthName.slice(1), 14, 20);

    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    const countText = language === "fr" ? `${monthEvents.length} événement(s)` :
      language === "ht" ? `${monthEvents.length} evènman` : `${monthEvents.length} event(s)`;
    doc.text(countText, 14, 28);

    const dateHeader = language === "fr" ? "Date" : language === "ht" ? "Dat" : "Date";
    const nameHeader = language === "fr" ? "Événement" : language === "ht" ? "Evènman" : "Event";
    const catHeader = language === "fr" ? "Catégorie" : language === "ht" ? "Kategori" : "Category";
    const timeHeader = language === "fr" ? "Heure" : language === "ht" ? "Lè" : "Time";
    const locHeader = language === "fr" ? "Lieu" : language === "ht" ? "Kote" : "Location";
    const statusHeader = language === "fr" ? "Statut" : language === "ht" ? "Estati" : "Status";

    const sortedEvents = [...monthEvents].sort((a, b) => a.event_date.localeCompare(b.event_date));

    autoTable(doc, {
      startY: 34,
      head: [[dateHeader, nameHeader, catHeader, timeHeader, locHeader, statusHeader]],
      body: sortedEvents.map((e) => {
        const [y, m, d] = e.event_date.split("-").map(Number);
        const eventDate = new Date(y, m - 1, d);
        const time = e.event_time ? e.event_time.substring(0, 5) : "-";
        const endTime = e.end_time ? ` - ${e.end_time.substring(0, 5)}` : "";
        const cat = catLabels[e.event_category || "general"] || e.event_category || "-";
        const statusMap: Record<string, Record<string, string>> = {
          fr: { planned: "Planifié", confirmed: "Confirmé", cancelled: "Annulé", completed: "Terminé" },
          en: { planned: "Planned", confirmed: "Confirmed", cancelled: "Cancelled", completed: "Completed" },
          ht: { planned: "Planifye", confirmed: "Konfime", cancelled: "Anile", completed: "Fini" },
        };
        const dateDisplay = e.end_date 
          ? `${format(eventDate, "dd/MM", { locale })} → ${format(new Date(parseInt(e.end_date.split("-")[0]), parseInt(e.end_date.split("-")[1]) - 1, parseInt(e.end_date.split("-")[2])), "dd/MM", { locale })}`
          : format(eventDate, "dd/MM", { locale });
        return [
          dateDisplay,
          e.name,
          cat,
          time + endTime,
          e.location || "-",
          (statusMap[language] || statusMap.en)[e.status] || e.status,
        ];
      }),
      styles: { fontSize: 9, cellPadding: 3 },
      headStyles: { fillColor: [59, 130, 246], textColor: 255, fontStyle: "bold" },
      alternateRowStyles: { fillColor: [245, 247, 250] },
      columnStyles: {
        0: { cellWidth: 22 },
        1: { cellWidth: 70 },
        2: { cellWidth: 35 },
        3: { cellWidth: 35 },
        4: { cellWidth: 60 },
        5: { cellWidth: 30 },
      },
    });
  });

  // Summary page
  doc.addPage();
  doc.setFontSize(18);
  doc.setTextColor(40, 40, 40);
  const summaryTitle = language === "fr" ? "Résumé Annuel" : 
    language === "ht" ? "Rezime Anyèl" : "Annual Summary";
  doc.text(summaryTitle, 14, 20);

  const categoryCounts: Record<string, number> = {};
  const monthCounts: Record<number, number> = {};
  
  events.forEach((e) => {
    const cat = e.event_category || "general";
    categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;
    const month = parseInt(e.event_date.split("-")[1]);
    monthCounts[month] = (monthCounts[month] || 0) + 1;
  });

  const byCatHeader = language === "fr" ? "Par catégorie" : 
    language === "ht" ? "Pa kategori" : "By category";
  
  autoTable(doc, {
    startY: 30,
    head: [[byCatHeader, language === "fr" ? "Nombre" : language === "ht" ? "Kantite" : "Count"]],
    body: Object.entries(categoryCounts)
      .sort((a, b) => b[1] - a[1])
      .map(([cat, count]) => [catLabels[cat] || cat, count.toString()]),
    styles: { fontSize: 10 },
    headStyles: { fillColor: [59, 130, 246] },
    columnStyles: { 0: { cellWidth: 60 }, 1: { cellWidth: 30 } },
  });

  doc.save(`${language === "fr" ? "calendrier" : "calendar"}-${year}.pdf`);
}
