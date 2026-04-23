import { saveAs } from "file-saver";

export type CsvCell = string | number | null | undefined;

function escapeCsvCell(v: CsvCell): string {
  if (v == null) return "";
  const s = typeof v === "number" ? String(v) : String(v);
  const needsQuotes = /[",\n\r]/.test(s);
  const escaped = s.replace(/"/g, '""');
  return needsQuotes ? `"${escaped}"` : escaped;
}

export function exportToCSV(opts: {
  filename: string;
  rows: CsvCell[][];
}): void {
  const csv = opts.rows.map((r) => r.map(escapeCsvCell).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  saveAs(blob, opts.filename.endsWith(".csv") ? opts.filename : `${opts.filename}.csv`);
}

