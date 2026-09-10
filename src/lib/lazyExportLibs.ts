// The spreadsheet and PDF libraries are heavy (several hundred KB together).
// They are only needed the moment someone presses an export/print button, so we
// fetch them on demand instead of shipping them with every report screen.

export async function loadXlsx() {
  return await import("xlsx");
}

export async function loadJsPdf() {
  const [{ default: jsPDF }, { default: autoTable }] = await Promise.all([
    import("jspdf"),
    import("jspdf-autotable"),
  ]);
  return { jsPDF, autoTable };
}

export async function loadJsPdfOnly() {
  const { default: jsPDF } = await import("jspdf");
  return jsPDF;
}
