"use client";

export type PnlAssetType = "hotel" | "retail" | "office" | "residential";

export type PnlRowTone = "emerald" | "rose" | "sky" | "indigo" | "net" | "slate";

export interface PnlRow {
  group?: string;
  label?: string;
  values: (number | null)[];
  isGroupHeader?: boolean;
  isSectionHeader?: boolean;
  isSpacer?: boolean;
  isSubtotal?: boolean;
  isBold?: boolean;
  isHighlight?: boolean;
  isCalculated?: boolean;
  isPercent?: boolean;
  tone?: PnlRowTone;
  indent?: boolean;
  muted?: boolean;
  source?: string;
}

export interface PnlTableRendererProps {
  rows: PnlRow[];
  years: number;
  assetType: PnlAssetType;
  currencyCode?: string;
  title?: string;
}

function sumYearValues(values: (number | null)[], years: number) {
  return values
    .slice(0, years)
    .reduce<number>((a, b) => a + (b ?? 0), 0);
}

function fmtMoney(n: number, _assetType: PnlAssetType) {
  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 0,
  }).format(Math.round(n));
}

function fmtPct(v: number | null) {
  return v == null ? "—" : `${v >= 0 ? "+" : ""}${v.toFixed(1)}%`;
}

const cellFirst =
  "sticky left-0 z-10 border-r border-slate-700 bg-slate-800 px-4 py-3 text-sm font-medium text-slate-200";
const cellNum =
  "border-r border-slate-700/50 px-3 py-3 text-right text-sm tabular-nums text-slate-300";
const cellNumMuted =
  "border-r border-slate-700/50 px-3 py-3 text-right text-sm tabular-nums text-slate-400";
const cellTotal =
  "border-l border-r border-slate-700/50 px-3 py-3 text-right text-sm tabular-nums text-slate-300";
const cellTotalMuted =
  "border-l border-r border-slate-700/50 px-3 py-3 text-right text-sm tabular-nums text-slate-400";

function toneAccent(tone: PnlRowTone | undefined): string {
  switch (tone) {
    case "emerald":
      return "text-emerald-400";
    case "rose":
      return "text-rose-400";
    case "sky":
      return "text-sky-400";
    case "indigo":
      return "text-indigo-400";
    case "slate":
      return "text-slate-500";
    default:
      return "text-white";
  }
}

function groupHeaderClass(tone: PnlRowTone | undefined): string {
  switch (tone) {
    case "emerald":
      return "text-emerald-400";
    case "rose":
      return "text-rose-400";
    default:
      return "text-slate-400";
  }
}

export function PnlTableRenderer({
  rows,
  years,
  assetType,
  currencyCode = "AED",
  title,
}: PnlTableRendererProps) {
  const cols = 2 + years;
  const yearIndices = Array.from({ length: years }, (_, i) => i);

  const defaultTitle =
    assetType === "retail"
      ? `10-year retail operating P&L (${currencyCode})`
      : assetType === "office"
        ? `10-year office operating P&L (${currencyCode})`
        : assetType === "residential"
          ? `10-year residential operating P&L (${currencyCode})`
          : `10-year operating P&L (${currencyCode})`;

  return (
    <div className="mb-6 overflow-x-auto rounded-lg border border-slate-700 bg-slate-800/50 p-6">
      <h2 className="mb-4 text-lg font-semibold text-white">
        {title ?? defaultTitle}
      </h2>
      <table className="min-w-[1220px] w-full">
        <thead>
          <tr>
            <th className="sticky left-0 z-10 min-w-[180px] border-b border-slate-700 bg-slate-800 px-4 py-3 text-left text-sm font-medium text-slate-300">
              Line item
            </th>
            {yearIndices.map((i) => (
              <th
                key={i}
                className="min-w-[100px] border-b border-slate-700 px-3 py-3 text-right text-sm font-semibold text-slate-300 tabular-nums"
              >
                Y{i + 1}
              </th>
            ))}
            <th className="min-w-[100px] border-b border-l border-slate-700 px-3 py-3 text-right text-sm font-semibold text-slate-300 tabular-nums">
              Total
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, rowIndex) => {
            if (row.isSpacer) {
              return (
                <tr key={rowIndex} className="border-t border-slate-700">
                  <td colSpan={cols} className="h-2 bg-slate-950/40 p-0" />
                </tr>
              );
            }

            if (row.isGroupHeader && row.group) {
              return (
                <tr
                  key={rowIndex}
                  className="border-t border-slate-700 bg-slate-900/50"
                >
                  <td
                    colSpan={cols}
                    className={`px-4 py-3 text-sm font-semibold ${groupHeaderClass(row.tone)}`}
                  >
                    {row.group}
                  </td>
                </tr>
              );
            }

            if (row.isSectionHeader && row.group) {
              return (
                <tr
                  key={rowIndex}
                  className="border-t border-slate-700 bg-slate-900/40"
                >
                  <td
                    colSpan={cols}
                    className="px-4 py-2 text-xs font-semibold uppercase tracking-wide text-slate-500"
                  >
                    {row.group}
                  </td>
                </tr>
              );
            }

            if (row.isPercent) {
              return (
                <tr key={rowIndex} className="border-t border-slate-700">
                  <td className="sticky left-0 z-10 border-r border-slate-700 bg-slate-800 px-4 py-3 text-sm font-medium text-slate-400">
                    {row.label}
                  </td>
                  <td className="border-r border-slate-700/50 px-3 py-3 text-right text-sm text-slate-500 tabular-nums">
                    —
                  </td>
                  {row.values.slice(1, years).map((g, i) => (
                    <td
                      key={i}
                      className={`border-r border-slate-700/50 px-3 py-3 text-right text-sm tabular-nums ${
                        g == null
                          ? "text-slate-500"
                          : g >= 0
                            ? "text-emerald-400"
                            : "text-rose-400"
                      }`}
                    >
                      {fmtPct(g)}
                    </td>
                  ))}
                  <td className="border-l border-r border-slate-700/50 px-3 py-3 text-right text-sm text-slate-500 tabular-nums">
                    —
                  </td>
                </tr>
              );
            }

            const label = row.label ?? "";
            const yearSlice = row.values.slice(0, years);
            const isTotal = row.isBold || row.isHighlight;
            const isSubtotal = row.isSubtotal;
            const accent = toneAccent(row.tone);
            const totalSum = sumYearValues(row.values, years);
            const totalClass =
              row.tone === "net"
                ? totalSum >= 0
                  ? "text-emerald-400"
                  : "text-rose-400"
                : accent;

            if (isTotal) {
              return (
                <tr
                  key={rowIndex}
                  className="border-t-2 border-slate-600 bg-slate-900/50"
                >
                  <td className="sticky left-0 z-10 border-r border-slate-700 bg-slate-800 px-4 py-4 text-base font-bold text-white">
                    {label}
                  </td>
                  {yearSlice.map((v, i) => (
                    <td
                      key={i}
                      className={`border-r border-slate-700/50 bg-slate-900/50 px-3 py-4 text-right text-base font-bold tabular-nums ${
                        row.tone === "net"
                          ? (v ?? 0) >= 0
                            ? "text-emerald-400"
                            : "text-rose-400"
                          : accent
                      }`}
                    >
                      {fmtMoney(v ?? 0, assetType)}
                    </td>
                  ))}
                  <td
                    className={`border-l border-r border-slate-700/50 bg-slate-900/50 px-3 py-4 text-right text-base font-bold tabular-nums ${totalClass}`}
                  >
                    {fmtMoney(totalSum, assetType)}
                  </td>
                </tr>
              );
            }

            if (isSubtotal) {
              return (
                <tr
                  key={rowIndex}
                  className="border-t border-slate-700 bg-slate-800/40 font-semibold"
                >
                  <td className={`${cellFirst} font-semibold text-slate-200`}>
                    {label}
                  </td>
                  {yearSlice.map((v, i) => (
                    <td
                      key={i}
                      className="border-r border-slate-700/50 bg-slate-800/40 px-3 py-3 text-right text-sm font-semibold tabular-nums text-slate-200"
                    >
                      {fmtMoney(v ?? 0, assetType)}
                    </td>
                  ))}
                  <td className="border-l border-r border-slate-700/50 bg-slate-800/40 px-3 py-3 text-right text-sm font-semibold tabular-nums text-slate-200">
                    {fmtMoney(totalSum, assetType)}
                  </td>
                </tr>
              );
            }

            return (
              <tr
                key={rowIndex}
                className="border-t border-slate-700 transition-colors hover:bg-slate-800/30"
              >
                <td
                  className={`${cellFirst} ${row.indent ? "pl-8" : ""} ${row.muted ? "text-slate-400" : ""}`}
                >
                  {label}
                </td>
                {yearSlice.map((v, i) => (
                  <td
                    key={i}
                    className={row.muted ? cellNumMuted : cellNum}
                  >
                    {fmtMoney(v ?? 0, assetType)}
                  </td>
                ))}
                <td className={row.muted ? cellTotalMuted : cellTotal}>
                  {fmtMoney(totalSum, assetType)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
