import { jsPDF } from "jspdf";
import * as XLSX from "xlsx";

/**
 * Exports a tabular dataset to Excel (.xlsx) matching the precise format in specification.
 */
export function exportToExcel(reportName: string, headers: string[], rows: any[][]) {
  const dateStr = new Date().toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });

  // Setup sheet data
  const data = [
    [`Uma Maheshwara Kirana & General Stores — ${reportName}`],
    [`Generated: ${dateStr}`],
    [], // Blank Row 3
    headers, // Row 4 (headers)
    ...rows // Row 5+ (data rows)
  ];

  /* Create workbook and worksheet */
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet(data);

  // Auto-fit column widths
  const maxCols = headers.length;
  const colWidths = Array(maxCols).fill({ wch: 15 });
  for (let c = 0; c < maxCols; c++) {
    let maxLen = headers[c]?.toString().length || 10;
    for (let r = 4; r < data.length; r++) {
      const val = data[r][c];
      if (val !== undefined && val !== null) {
        maxLen = Math.max(maxLen, val.toString().length);
      }
    }
    colWidths[c] = { wch: maxLen + 3 };
  }
  ws["!cols"] = colWidths;

  XLSX.utils.book_append_sheet(wb, ws, reportName.substring(0, 31));
  XLSX.writeFile(wb, `${reportName.replace(/\s+/g, "_")}_${Date.now()}.xlsx`);
}

/**
 * Exports a tabular dataset to PDF utilizing jsPDF matching the strict PDF export spec.
 */
export function exportToPDF(reportName: string, headers: string[], rows: any[][], totalRow?: string[]) {
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4"
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const dateStr = new Date().toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });

  let currentY = 15;

  // Header Box
  doc.setFont("Helvetica", "bold");
  doc.setFontSize(22);
  doc.setTextColor(15, 76, 129); // Primary color deep navy blue (#0F4C81)
  doc.text("Uma Maheshwara Kirana & General Stores", 15, currentY);
  
  doc.setFont("Helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(113, 128, 150);
  doc.text(`Generated: ${dateStr}`, pageWidth - 15, currentY, { align: "right" });

  currentY += 8;
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.5);
  doc.line(15, currentY, pageWidth - 15, currentY);

  currentY += 10;

  // Report Title
  doc.setFont("Helvetica", "bold");
  doc.setFontSize(14);
  doc.setTextColor(26, 32, 44);
  doc.text(reportName.toUpperCase(), 15, currentY);

  currentY += 8;

  // Table Setup
  const colCount = headers.length;
  const colWidth = (pageWidth - 30) / colCount;
  
  // Draw Headers
  doc.setFillColor(15, 76, 129); // Primary deep navy
  doc.rect(15, currentY, pageWidth - 30, 8, "F");

  doc.setFont("Helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(255, 255, 255);
  for (let i = 0; i < colCount; i++) {
    doc.text(headers[i], 17 + i * colWidth, currentY + 5.5);
  }

  currentY += 8;

  // Draw Data Rows
  doc.setFont("Helvetica", "normal");
  doc.setFontSize(8.5);
  
  rows.forEach((row, rowIndex) => {
    // Check page height space left
    if (currentY > pageHeight - 25) {
      drawFooter(doc, pageWidth, pageHeight);
      doc.addPage();
      currentY = 20;
      // Redraw Header inside new page
      doc.setFillColor(15, 76, 129);
      doc.rect(15, currentY, pageWidth - 30, 8, "F");
      doc.setFont("Helvetica", "bold");
      doc.setFontSize(9);
      doc.setTextColor(255, 255, 255);
      for (let i = 0; i < colCount; i++) {
        doc.text(headers[i], 17 + i * colWidth, currentY + 5.5);
      }
      currentY += 8;
      // Restore standard fonts
      doc.setFont("Helvetica", "normal");
      doc.setFontSize(8.5);
    }

    // Zebra striping
    if (rowIndex % 2 === 0) {
      doc.setFillColor(248, 250, 252);
      doc.rect(15, currentY, pageWidth - 30, 7, "F");
    }

    doc.setTextColor(74, 85, 104);
    for (let c = 0; c < colCount; c++) {
      const cellText = row[c] !== null && row[c] !== undefined ? row[c].toString() : "-";
      doc.text(cellText, 17 + c * colWidth, currentY + 5);
    }
    
    currentY += 7;
  });

  // Grand Total Row if specified
  if (totalRow) {
    if (currentY > pageHeight - 20) {
      drawFooter(doc, pageWidth, pageHeight);
      doc.addPage();
      currentY = 20;
    }
    doc.setFillColor(241, 245, 249);
    doc.rect(15, currentY, pageWidth - 30, 8, "F");
    doc.setFont("Helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(26, 32, 44);
    for (let c = 0; c < colCount; c++) {
      const text = totalRow[c] || "";
      doc.text(text, 17 + c * colWidth, currentY + 5.5);
    }
    currentY += 8;
  }

  // Draw final footer
  drawFooter(doc, pageWidth, pageHeight);

  // Trigger Save/Download
  doc.save(`${reportName.replace(/\s+/g, "_")}_${Date.now()}.pdf`);
}

function drawFooter(doc: jsPDF, pageWidth: number, pageHeight: number) {
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.3);
  doc.line(15, pageHeight - 15, pageWidth - 15, pageHeight - 15);

  doc.setFont("Helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(113, 128, 150);
  doc.text("Generated by Uma Maheshwara Kirana & General Stores | Stock Management System", 15, pageHeight - 10);
  doc.text(
    `Page ${doc.getNumberOfPages()} of ${doc.getNumberOfPages()}`,
    pageWidth - 15,
    pageHeight - 10,
    { align: "right" }
  );
}
