import * as XLSX from "xlsx";
import { saveAs } from "file-saver";

export type ExcelCell = string | number | boolean | Date | null | undefined;

export interface ExportData {
  fileName: string;
  sheets: {
    sheetName: string;
    data: any[][];
    formulas?: { [cell: string]: string }; // Excel formulas (e.g., { 'D2': 'SUM(B2:C2)' })
  }[];
}

type LegacyOpts = {
  filename: string;
  sheetName?: string;
  rows: ExcelCell[][];
};

export const exportToExcel = (exportData: ExportData | LegacyOpts) => {
  // Backward compatibility with earlier calls: exportToExcel({ filename, sheetName, rows })
  const normalized: ExportData =
    "sheets" in exportData
      ? exportData
      : {
          fileName: exportData.filename.replace(/\.xlsx$/i, ""),
          sheets: [
            {
              sheetName: exportData.sheetName ?? "Sheet1",
              data: exportData.rows,
            },
          ],
        };

  const wb = XLSX.utils.book_new();

  // Create sheets
  normalized.sheets.forEach((sheet) => {
    const ws = XLSX.utils.aoa_to_sheet(sheet.data);

    // Set column widths
    const maxWidth = 25;
    ws["!cols"] = sheet.data[0]?.map(() => ({ wch: maxWidth }));

    // Style header row (bold, dark background)
    // Note: styling support depends on the xlsx build; harmless if ignored.
    const range = XLSX.utils.decode_range(ws["!ref"] || "A1");
    for (let C = range.s.c; C <= range.e.c; ++C) {
      const address = XLSX.utils.encode_col(C) + "1";
      if (!ws[address]) continue;
      (ws[address] as any).s = {
        font: { bold: true, color: { rgb: "FFFFFF" } },
        fill: { fgColor: { rgb: "1E293B" } },
        alignment: { horizontal: "center", vertical: "center" },
      };
    }

    // ADD FORMULAS if provided
    if (sheet.formulas) {
      Object.entries(sheet.formulas).forEach(([cell, formula]) => {
        if (!ws[cell]) {
          ws[cell] = { t: "s", v: "" } as any;
        }
        // Set formula (Excel formula syntax)
        (ws[cell] as any).f = formula;
        // Also set the calculated value type (Excel will recalc when opened)
        (ws[cell] as any).t = "n";
      });
    }

    XLSX.utils.book_append_sheet(wb, ws, sheet.sheetName);
  });

  // Generate and download
  const wbout = XLSX.write(wb, { bookType: "xlsx", type: "array" });
  const blob = new Blob([wbout], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  saveAs(blob, `${normalized.fileName}.xlsx`);
};

