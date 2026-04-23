/**
 * Client-side exports for equity preview (no server; no xlsx binary dependency).
 */

export type EquityExportTableRow = {
  month: number;
  prefDraw: number;
  commonDraw: number;
  totalDraw: number;
  prefDist: number;
  commonDist: number;
  promoteDist: number;
  totalDist: number;
  netEquityCF: number;
  cumulativeEquity: number;
};

export type EquityIrrCheckRow = {
  month: number;
  discountFactor: number;
  discountedCF: number;
};

export type EquityExportKeyMetrics = {
  totalEquityInvested: number;
  totalDistributions: number;
  leveredEquityIRR: number;
  equityMultiple: number;
  equityPayback: number | null;
  sponsorPromote: number;
  peakEquity: number;
};

export type EquityExportPayload = {
  tableData: EquityExportTableRow[];
  irrCheckData: EquityIrrCheckRow[];
  keyMetrics: EquityExportKeyMetrics;
  projectName: string;
  currency: string;
};

function downloadBlob(content: Blob, filename: string) {
  const url = URL.createObjectURL(content);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function tableToCsv(rows: EquityExportTableRow[]): string {
  const headers = [
    "month",
    "prefDraw",
    "commonDraw",
    "totalDraw",
    "prefDist",
    "commonDist",
    "promoteDist",
    "totalDist",
    "netEquityCF",
    "cumulativeEquity",
  ];
  const lines = [headers.join(",")];
  for (const r of rows) {
    lines.push(
      [
        r.month,
        r.prefDraw,
        r.commonDraw,
        r.totalDraw,
        r.prefDist,
        r.commonDist,
        r.promoteDist,
        r.totalDist,
        r.netEquityCF,
        r.cumulativeEquity,
      ].join(",")
    );
  }
  return lines.join("\n");
}

/** Values-only CSV download. */
export function exportToCSV(data: EquityExportPayload): void {
  const csv = tableToCsv(data.tableData);
  const blob = new Blob([`\ufeff${csv}`], {
    type: "text/csv;charset=utf-8",
  });
  const safe = data.projectName.replace(/[^\w\-]+/g, "_").slice(0, 40);
  downloadBlob(blob, `equity-returns-${safe}.csv`);
}

/**
 * Opens in Excel as a worksheet (HTML table). Not a true .xlsx; no formulas embedded.
 */
export function exportToExcel(data: EquityExportPayload): void {
  const { tableData, keyMetrics, projectName, currency } = data;
  const esc = (s: string) =>
    s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  let html = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel"><head><meta charset="utf-8"></head><body><table border="1">`;
  html += `<tr><th colspan="10">${esc(projectName)} — Equity cash flows (${esc(currency)})</th></tr>`;
  html +=
    "<tr><th>Month</th><th>Pref draw</th><th>Common draw</th><th>Total draw</th><th>Pref dist</th><th>Common dist</th><th>Promote</th><th>Total dist</th><th>Net CF</th><th>Cumulative</th></tr>";
  for (const r of tableData) {
    html += `<tr><td>${r.month}</td><td>${r.prefDraw}</td><td>${r.commonDraw}</td><td>${r.totalDraw}</td><td>${r.prefDist}</td><td>${r.commonDist}</td><td>${r.promoteDist}</td><td>${r.totalDist}</td><td>${r.netEquityCF}</td><td>${r.cumulativeEquity}</td></tr>`;
  }
  html += `<tr><td colspan="10">IRR %: ${keyMetrics.leveredEquityIRR.toFixed(2)} | Multiple: ${keyMetrics.equityMultiple.toFixed(2)}x | Promote: ${keyMetrics.sponsorPromote}</td></tr>`;
  html += "</table></body></html>";
  const blob = new Blob([html], {
    type: "application/vnd.ms-excel",
  });
  const safe = projectName.replace(/[^\w\-]+/g, "_").slice(0, 40);
  downloadBlob(blob, `equity-returns-${safe}.xls`);
}

/** Copy CSV to clipboard and prompt user to paste into a new Google Sheet. */
export function exportToGoogleSheets(data: EquityExportPayload): void {
  const csv = tableToCsv(data.tableData);
  void navigator.clipboard.writeText(csv).then(
    () => {
      window.alert(
        "CSV copied to clipboard. Open Google Sheets → new spreadsheet → paste (Ctrl/Cmd+V), then use Data → Split text to columns if needed."
      );
      window.open("https://docs.google.com/spreadsheets/create", "_blank");
    },
    () => {
      exportToCSV(data);
      window.alert(
        "Clipboard unavailable; a CSV file was downloaded instead. Import that file into Google Sheets."
      );
    }
  );
}
