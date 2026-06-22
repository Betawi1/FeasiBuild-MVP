"use client";

import type { FeasibilitySlide } from "@/types/feasibility";
import {
  AiContentWarningBanner,
  aiParagraphClassName,
} from "@/components/feasibility/AiContentWarning";
import { cleanParagraphsForDisplay } from "@/lib/feasibility/clean-ai-content";
import SlideContainer from "../SlideContainer";
import SlideHeader from "../SlideHeader";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

interface Props {
  slide: FeasibilitySlide;
  isEditing?: boolean;
  onParagraphChange?: (index: number, text: string) => void;
}

const COLORS = ["#10b981", "#3b82f6", "#f59e0b", "#ef4444", "#8b5cf6"];

function ParagraphBlock({
  slide,
  isEditing,
  onParagraphChange,
  className = "",
}: {
  slide: FeasibilitySlide;
  isEditing?: boolean;
  onParagraphChange?: (index: number, text: string) => void;
  className?: string;
}) {
  const displayParagraphs = cleanParagraphsForDisplay(slide.paragraphs);

  return (
    <div className={className}>
      <AiContentWarningBanner paragraphs={slide.paragraphs} />
      <div className="space-y-3">
        {displayParagraphs.map((p, i) =>
          isEditing && onParagraphChange ? (
            <textarea
              key={i}
              value={p}
              onChange={(e) => onParagraphChange(i, e.target.value)}
              className="w-full p-2 border border-slate-300 rounded text-sm text-slate-700 h-20 resize-y mb-2"
            />
          ) : (
            <p
              key={i}
              className={`${aiParagraphClassName(p)} mb-2 last:mb-0`}
            >
              {p}
            </p>
          )
        )}
      </div>
      {slide.bulletPoints ? (
        <ul className="list-disc pl-5 space-y-1 mt-2">
          {slide.bulletPoints.map((bp, i) => (
            <li key={i} className="text-sm text-slate-700">
              {bp}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

function ChartBlock({ chart }: { chart: NonNullable<FeasibilitySlide["charts"]>[number] }) {
  const heightClass = chart.height ?? "flex-1";
  const widthClass = chart.width ?? "w-full";

  return (
    <div className={`flex ${heightClass} ${widthClass} min-h-[200px] flex-col`}>
      <h4 className="mb-2 shrink-0 text-center text-xs font-semibold text-slate-500">
        {chart.title}
      </h4>
      <div className="min-h-0 flex-1">
        <ResponsiveContainer width="100%" height="100%">
          {chart.type === "pie" ? (
            <PieChart>
              <Pie
                data={chart.data}
                dataKey={chart.yKeys[0] ?? "value"}
                nameKey={chart.xKey}
                cx="50%"
                cy="50%"
                outerRadius={70}
              >
                {chart.data.map((_, j) => (
                  <Cell
                    key={j}
                    fill={chart.colors?.[j] ?? COLORS[j % COLORS.length]}
                  />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          ) : chart.type === "line" ? (
            <LineChart data={chart.data}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey={chart.xKey} fontSize={10} />
              <YAxis fontSize={10} />
              <Tooltip />
              <Legend />
              {chart.yKeys.map((key, j) => (
                <Line
                  key={key}
                  type="monotone"
                  dataKey={key}
                  stroke={chart.colors?.[j] ?? COLORS[j % COLORS.length]}
                  strokeWidth={2}
                />
              ))}
            </LineChart>
          ) : (
            <BarChart data={chart.data}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey={chart.xKey} fontSize={10} />
              <YAxis fontSize={10} />
              <Tooltip />
              <Legend />
              {chart.yKeys.map((key, j) => (
                <Bar
                  key={key}
                  dataKey={key}
                  fill={chart.colors?.[j] ?? COLORS[j % COLORS.length]}
                />
              ))}
            </BarChart>
          )}
        </ResponsiveContainer>
      </div>
    </div>
  );
}

export default function MarketReview({
  slide,
  isEditing = false,
  onParagraphChange,
}: Props) {
  const isFullWidth = slide.layout === "full-width";
  const hasCharts = (slide.charts?.length ?? 0) > 0;

  return (
    <SlideContainer>
      <SlideHeader title={slide.title} subtitle={slide.subtitle} />

      {isFullWidth ? (
        <div className="flex-1 min-h-0 overflow-y-auto w-full space-y-4">
          <ParagraphBlock
            slide={slide}
            isEditing={isEditing}
            onParagraphChange={onParagraphChange}
            className="w-full space-y-2"
          />
          {slide.charts?.map((chart, i) => (
            <ChartBlock key={i} chart={chart} />
          ))}
          {slide.tables?.map((table, i) => (
            <div key={i} className="w-full shrink-0">
              {table.title ? (
                <h4 className="text-xs font-semibold text-slate-600 mb-1">
                  {table.title}
                </h4>
              ) : null}
              <table className="feasibility-table w-full text-xs text-slate-900 border-collapse border border-slate-300">
                <thead>
                  <tr className="bg-slate-100">
                    {table.headers.map((h, j) => (
                      <th
                        key={j}
                        className="border border-slate-300 p-2 text-left font-bold text-slate-900"
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {table.rows.map((row, j) => (
                    <tr key={j} className={j % 2 === 1 ? "bg-slate-50" : ""}>
                      {row.map((cell, k) => (
                        <td
                          key={k}
                          className={`border border-slate-300 p-2 text-slate-900 ${
                            k === 0 ? "font-medium" : ""
                          }`}
                        >
                          {cell}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
              {table.footer ? (
                <p className="text-[10px] text-slate-500 mt-1">{table.footer}</p>
              ) : null}
            </div>
          ))}
        </div>
      ) : (
        <div
          className={`flex-1 min-h-0 overflow-hidden ${
            hasCharts
              ? "grid grid-cols-2 gap-8"
              : "grid grid-cols-2 gap-8"
          }`}
        >
          <div className="space-y-2 overflow-y-auto pr-2 min-h-0">
            <ParagraphBlock
              slide={slide}
              isEditing={isEditing}
              onParagraphChange={onParagraphChange}
            />
          </div>

          <div className="flex flex-col gap-4 min-h-0 overflow-hidden">
            {slide.charts?.map((chart, i) => (
              <ChartBlock key={i} chart={chart} />
            ))}

            {slide.tables?.map((table, i) => (
              <div key={i} className="shrink-0">
                {table.title ? (
                  <h4 className="text-xs font-semibold text-slate-600 mb-1">
                    {table.title}
                  </h4>
                ) : null}
                <table className="feasibility-table w-full text-xs text-slate-900 border-collapse border border-slate-300">
                  <thead>
                    <tr className="bg-slate-100">
                      {table.headers.map((h, j) => (
                        <th
                          key={j}
                          className="border border-slate-300 p-2 text-left font-bold text-slate-900"
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {table.rows.map((row, j) => (
                      <tr key={j} className={j % 2 === 1 ? "bg-slate-50" : ""}>
                        {row.map((cell, k) => (
                          <td
                            key={k}
                            className={`border border-slate-300 p-2 text-slate-900 ${
                              k === 0 ? "font-medium" : ""
                            }`}
                          >
                            {cell}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
                {table.footer ? (
                  <p className="text-[10px] text-slate-500 mt-1">{table.footer}</p>
                ) : null}
              </div>
            ))}
          </div>
        </div>
      )}
    </SlideContainer>
  );
}
