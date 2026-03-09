import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { formatCurrency as formatCurrencyLib } from "./currency";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

export interface BankTransaction {
  transaction_date: string;
  transaction_type: "income" | "expense";
  description: string | null;
  reference_number: string | null;
  amount: number;
  is_reconciled: boolean;
  reconciled_at: string | null;
}

export interface BankReconciliationReportData {
  account: {
    name: string;
    account_number: string | null;
    bank_name: string | null;
    current_balance: number;
  };
  churchInfo: {
    name: string;
    logoUrl?: string;
  };
  period: {
    month: number;
    year: number;
  };
  transactions: BankTransaction[];
}

const MONTH_NAMES_FR = [
  "Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
  "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"
];

const MONTH_NAMES_EN = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

function maskAccountNumber(accountNumber: string | null): string {
  if (!accountNumber) return "N/A";
  if (accountNumber.length <= 4) return accountNumber;
  return "****" + accountNumber.slice(-4);
}

export async function generateBankReconciliationPDF(
  data: BankReconciliationReportData,
  language: string = "fr",
  currencyCode: string = "USD"
): Promise<void> {
  const formatCurrency = (amount: number) => formatCurrencyLib(amount, currencyCode);
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 20;
  let yPos = margin;

  const monthNames = language === "fr" ? MONTH_NAMES_FR : MONTH_NAMES_EN;
  const monthName = monthNames[data.period.month - 1];
  const periodLabel = `${monthName} ${data.period.year}`;

  // Calculate statistics
  const totalIncome = data.transactions
    .filter((t) => t.transaction_type === "income")
    .reduce((sum, t) => sum + Number(t.amount), 0);

  const totalExpense = data.transactions
    .filter((t) => t.transaction_type === "expense")
    .reduce((sum, t) => sum + Number(t.amount), 0);

  const reconciledCount = data.transactions.filter((t) => t.is_reconciled).length;
  const pendingCount = data.transactions.filter((t) => !t.is_reconciled).length;
  const totalCount = data.transactions.length;
  const reconciliationRate = totalCount > 0 ? Math.round((reconciledCount / totalCount) * 100) : 0;

  // Try to load logo
  let logoLoaded = false;
  if (data.churchInfo.logoUrl) {
    try {
      const img = new Image();
      img.crossOrigin = "anonymous";
      await new Promise<void>((resolve, reject) => {
        img.onload = () => {
          try {
            const canvas = document.createElement("canvas");
            canvas.width = img.width;
            canvas.height = img.height;
            const ctx = canvas.getContext("2d");
            if (ctx) {
              ctx.drawImage(img, 0, 0);
              const imgData = canvas.toDataURL("image/png");
              doc.addImage(imgData, "PNG", margin, yPos, 30, 30);
              logoLoaded = true;
            }
            resolve();
          } catch {
            resolve();
          }
        };
        img.onerror = () => resolve();
        img.src = data.churchInfo.logoUrl!;
      });
    } catch {
      // Logo loading failed, continue without it
    }
  }

  // Header
  const headerX = logoLoaded ? margin + 35 : margin;
  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.text(data.churchInfo.name, headerX, yPos + 10);

  doc.setFontSize(14);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(100);
  doc.text(
    language === "fr" ? "Rapport de Rapprochement Bancaire" : "Bank Reconciliation Report",
    headerX,
    yPos + 18
  );

  doc.setFontSize(12);
  doc.text(periodLabel, headerX, yPos + 26);

  doc.setTextColor(0);
  yPos += logoLoaded ? 40 : 35;

  // Horizontal line
  doc.setDrawColor(200);
  doc.setLineWidth(0.5);
  doc.line(margin, yPos, pageWidth - margin, yPos);
  yPos += 10;

  // Account Information Section
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text(language === "fr" ? "COMPTE BANCAIRE" : "BANK ACCOUNT", margin, yPos);
  yPos += 8;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);

  doc.text(`${language === "fr" ? "Nom" : "Name"}: ${data.account.name}`, margin, yPos);
  yPos += 6;

  const bankInfo = [
    data.account.bank_name || (language === "fr" ? "Non spécifié" : "Not specified"),
    `N°: ${maskAccountNumber(data.account.account_number)}`,
  ].join(" | ");
  doc.text(`${language === "fr" ? "Banque" : "Bank"}: ${bankInfo}`, margin, yPos);
  yPos += 6;

  doc.setFont("helvetica", "bold");
  doc.text(
    `${language === "fr" ? "Solde actuel" : "Current Balance"}: ${formatCurrency(data.account.current_balance)}`,
    margin,
    yPos
  );
  doc.setFont("helvetica", "normal");
  yPos += 12;

  // Summary Section
  doc.setDrawColor(200);
  doc.line(margin, yPos, pageWidth - margin, yPos);
  yPos += 8;

  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text(language === "fr" ? "RÉSUMÉ DU MOIS" : "MONTHLY SUMMARY", margin, yPos);
  yPos += 10;

  // Summary boxes
  const boxWidth = (pageWidth - 2 * margin - 15) / 4;
  const boxHeight = 25;
  const summaryData = [
    {
      label: language === "fr" ? "Revenus" : "Income",
      value: formatCurrency(totalIncome),
      color: [34, 197, 94] as [number, number, number], // green
    },
    {
      label: language === "fr" ? "Dépenses" : "Expenses",
      value: formatCurrency(totalExpense),
      color: [239, 68, 68] as [number, number, number], // red
    },
    {
      label: language === "fr" ? "Rapprochés" : "Reconciled",
      value: `${reconciledCount} (${reconciliationRate}%)`,
      color: [59, 130, 246] as [number, number, number], // blue
    },
    {
      label: language === "fr" ? "En attente" : "Pending",
      value: `${pendingCount}`,
      color: [234, 179, 8] as [number, number, number], // yellow
    },
  ];

  summaryData.forEach((item, index) => {
    const x = margin + index * (boxWidth + 5);
    doc.setFillColor(245, 245, 245);
    doc.roundedRect(x, yPos, boxWidth, boxHeight, 3, 3, "F");

    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(100);
    doc.text(item.label, x + 5, yPos + 8);

    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(item.color[0], item.color[1], item.color[2]);
    doc.text(item.value, x + 5, yPos + 18);
  });

  doc.setTextColor(0);
  yPos += boxHeight + 12;

  // Transactions Table
  doc.setDrawColor(200);
  doc.line(margin, yPos, pageWidth - margin, yPos);
  yPos += 8;

  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text(language === "fr" ? "DÉTAIL DES TRANSACTIONS" : "TRANSACTION DETAILS", margin, yPos);
  yPos += 8;

  if (data.transactions.length === 0) {
    doc.setFontSize(10);
    doc.setFont("helvetica", "italic");
    doc.setTextColor(100);
    doc.text(
      language === "fr" ? "Aucune transaction pour cette période" : "No transactions for this period",
      margin,
      yPos + 10
    );
    yPos += 20;
  } else {
    const tableData = data.transactions.map((tx) => {
      const dateFormatted = format(
        new Date(tx.transaction_date),
        "dd MMM yyyy",
        { locale: language === "fr" ? fr : undefined }
      );
      const typeLabel = tx.transaction_type === "income"
        ? (language === "fr" ? "Revenu" : "Income")
        : (language === "fr" ? "Dépense" : "Expense");
      const amount = tx.transaction_type === "income"
        ? `+${formatCurrency(tx.amount)}`
        : `-${formatCurrency(tx.amount)}`;
      const status = tx.is_reconciled
        ? (language === "fr" ? "✓ Rapproché" : "✓ Reconciled")
        : (language === "fr" ? "○ En attente" : "○ Pending");

      return [
        dateFormatted,
        typeLabel,
        tx.description || "-",
        tx.reference_number || "-",
        amount,
        status,
      ];
    });

    autoTable(doc, {
      startY: yPos,
      head: [[
        language === "fr" ? "Date" : "Date",
        language === "fr" ? "Type" : "Type",
        language === "fr" ? "Description" : "Description",
        language === "fr" ? "Référence" : "Reference",
        language === "fr" ? "Montant" : "Amount",
        language === "fr" ? "Statut" : "Status",
      ]],
      body: tableData,
      theme: "striped",
      headStyles: {
        fillColor: [59, 130, 246],
        textColor: [255, 255, 255],
        fontStyle: "bold",
        fontSize: 9,
      },
      bodyStyles: {
        fontSize: 8,
      },
      columnStyles: {
        0: { cellWidth: 25 },
        1: { cellWidth: 20 },
        2: { cellWidth: 50 },
        3: { cellWidth: 25 },
        4: { cellWidth: 25, halign: "right" },
        5: { cellWidth: 25 },
      },
      didParseCell: (hookData) => {
        // Color amounts based on type
        if (hookData.section === "body" && hookData.column.index === 4) {
          const value = hookData.cell.raw as string;
          if (value.startsWith("+")) {
            hookData.cell.styles.textColor = [34, 197, 94];
            hookData.cell.styles.fontStyle = "bold";
          } else if (value.startsWith("-")) {
            hookData.cell.styles.textColor = [239, 68, 68];
            hookData.cell.styles.fontStyle = "bold";
          }
        }
        // Color status
        if (hookData.section === "body" && hookData.column.index === 5) {
          const value = hookData.cell.raw as string;
          if (value.includes("✓")) {
            hookData.cell.styles.textColor = [34, 197, 94];
          } else {
            hookData.cell.styles.textColor = [234, 179, 8];
          }
        }
      },
      margin: { left: margin, right: margin },
    });

    yPos = (doc as any).lastAutoTable.finalY + 15;
  }

  // Certification Section
  if (yPos > pageHeight - 80) {
    doc.addPage();
    yPos = margin;
  }

  doc.setDrawColor(200);
  doc.line(margin, yPos, pageWidth - margin, yPos);
  yPos += 8;

  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text("CERTIFICATION", margin, yPos);
  yPos += 10;

  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(80);

  const certText = language === "fr"
    ? "Je certifie que ce rapport reflète fidèlement les transactions bancaires enregistrées pour la période indiquée et que le rapprochement a été effectué conformément aux procédures établies."
    : "I certify that this report accurately reflects the bank transactions recorded for the indicated period and that the reconciliation was performed in accordance with established procedures.";

  const certLines = doc.splitTextToSize(certText, pageWidth - 2 * margin);
  doc.text(certLines, margin, yPos);
  yPos += certLines.length * 5 + 15;

  doc.setTextColor(0);
  doc.setFontSize(10);

  // Signature lines
  const signatureWidth = 70;
  doc.text(`${language === "fr" ? "Signature" : "Signature"}: `, margin, yPos);
  doc.line(margin + 25, yPos, margin + 25 + signatureWidth, yPos);

  doc.text(`${language === "fr" ? "Date" : "Date"}: `, margin + 110, yPos);
  doc.line(margin + 125, yPos, margin + 125 + 40, yPos);

  // Footer
  const footerY = pageHeight - 10;
  doc.setFontSize(8);
  doc.setTextColor(120);

  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    const generatedAt = format(new Date(), "dd/MM/yyyy 'à' HH:mm", { locale: fr });
    const footerText = `Page ${i}/${totalPages} | ${language === "fr" ? "Généré le" : "Generated on"} ${generatedAt} | Church Manager Pro`;
    const footerWidth = doc.getTextWidth(footerText);
    doc.text(footerText, (pageWidth - footerWidth) / 2, footerY);
  }

  // Generate filename
  const fileName = `rapport-rapprochement-${data.account.name.toLowerCase().replace(/\s+/g, "-")}-${monthName.toLowerCase()}-${data.period.year}.pdf`;

  // Save the PDF
  doc.save(fileName);
}
