"use client";

import SlideContainer from "@/components/feasibility/SlideContainer";
import SlideHeader from "@/components/feasibility/SlideHeader";
import EditableSlideParagraphs from "@/components/feasibility/EditableSlideParagraphs";
import type { SlideEditingProps } from "@/components/feasibility/slide-editing";
import type {
  OperationalExpenseRow,
  OperationalExpensesData,
} from "@/types/feasibility";

interface Props extends SlideEditingProps {
  data: OperationalExpensesData;
  paragraphs?: string[];
}

function ExpenseTable({
  rows,
  compact = false,
}: {
  rows: OperationalExpenseRow[];
  compact?: boolean;
}) {
  const cell = compact ? "px-1.5 py-0" : "px-2 py-0.5";
  return (
    <table className="feasibility-table w-full text-[10px] text-slate-900">
      <thead>
        <tr className="bg-slate-100">
          <th className={`border-b border-slate-300 ${cell} text-left font-bold text-slate-900`}>Item</th>
          <th className={`border-b border-slate-300 ${cell} text-left font-bold text-slate-900`}>Index</th>
          <th className={`border-b border-slate-300 ${cell} text-right w-[14%] font-bold text-slate-900`}>
            %
          </th>
        </tr>
      </thead>
      <tbody>
        {rows.map((item, i) => (
          <tr key={i}>
            <td className={`border-b border-slate-300 ${cell} font-medium text-slate-900`}>{item.item}</td>
            <td className={`border-b border-slate-300 ${cell} text-[9px] text-slate-900`}>
              {item.index}
            </td>
            <td className={`border-b border-slate-300 ${cell} text-right font-mono`}>
              {item.percentage}%
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export default function OperationalExpensesSlide({
  data,
  paragraphs = [],
  isEditing = false,
  onParagraphChange,
}: Props) {
  return (
    <SlideContainer className="[&>div]:p-4">
      <SlideHeader title={data.title} subtitle={data.subtitle} className="!mb-2" />

      <div className="flex-1 min-h-0 flex flex-col gap-1 overflow-hidden">
        <div className="grid grid-cols-2 gap-2 shrink-0">
          <div className="border border-slate-300 rounded overflow-hidden">
            <div className="bg-slate-800 text-white px-2 py-0.5 text-[10px] font-bold">
              Working Capital Assumptions
            </div>
            <table className="feasibility-table w-full text-[10px] text-slate-900">
              <tbody>
                <tr>
                  <td className="border-b border-slate-300 px-1.5 py-0.5 font-medium text-slate-900">
                    Accounts Receivable
                  </td>
                  <td className="border-b border-slate-300 px-1.5 py-0.5 text-right text-slate-900">
                    # months of sales
                  </td>
                  <td className="border-b border-slate-300 px-1.5 py-0.5 text-right font-bold font-mono w-[12%]">
                    {data.workingCapital.accountsReceivable}
                  </td>
                </tr>
                <tr>
                  <td className="px-1.5 py-0.5 font-medium text-slate-900">Accounts Payable</td>
                  <td className="px-1.5 py-0.5 text-right text-slate-900">
                    # months of operating expenses
                  </td>
                  <td className="px-1.5 py-0.5 text-right font-bold font-mono">
                    {data.workingCapital.accountsPayable}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="border border-slate-300 rounded overflow-hidden">
            <div className="bg-slate-800 text-white px-2 py-0.5 text-[10px] font-bold">
              Depreciation
            </div>
            <table className="feasibility-table w-full text-[10px] text-slate-900">
              <thead>
                <tr className="bg-slate-100">
                  <th className="border-b border-slate-300 px-1.5 py-0.5 text-left font-bold text-slate-900">
                    Item
                  </th>
                  <th className="border-b border-slate-300 px-1.5 py-0.5 text-right font-bold text-slate-900">
                    Useful Life (yrs)
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="border-b border-slate-300 px-1.5 py-0.5">
                    Construction
                  </td>
                  <td className="border-b border-slate-300 px-1.5 py-0.5 text-right font-mono">
                    {data.depreciation.construction}
                  </td>
                </tr>
                <tr>
                  <td className="px-1.5 py-0.5">Furniture and Equipment</td>
                  <td className="px-1.5 py-0.5 text-right font-mono">
                    {data.depreciation.furnitureAndEquipment}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 shrink-0">
          <div className="border border-slate-300 rounded overflow-hidden">
            <div className="bg-slate-800 text-white px-2 py-0.5 text-[10px] font-bold">
              Fixed Expenses Hotel
            </div>
            <ExpenseTable rows={data.fixedExpenses} compact />
          </div>

          <div className="border border-slate-300 rounded overflow-hidden">
            <div className="bg-slate-800 text-white px-2 py-0.5 text-[10px] font-bold">
              Undistributed Expenses
            </div>
            <ExpenseTable rows={data.undistributedExpenses} compact />
          </div>
        </div>

        <div className="border border-slate-300 rounded overflow-hidden flex-1 min-h-0">
          <div className="bg-slate-800 text-white px-2 py-0.5 text-[10px] font-bold">
            Direct Cost
          </div>
          <table className="feasibility-table w-full text-[9px] text-slate-900">
            <thead>
              <tr className="bg-slate-100">
                <th className="border-b border-slate-300 px-1.5 py-0 text-left font-bold text-slate-900">
                  Category
                </th>
                <th className="border-b border-slate-300 px-1.5 py-0 text-left font-bold text-slate-900">
                  Index of Variability
                </th>
                <th className="border-b border-slate-300 px-1.5 py-0 text-right w-[12%] font-bold text-slate-900">
                  Percentage
                </th>
              </tr>
            </thead>
            <tbody>
              <tr className="bg-slate-50 font-bold">
                <td className="border-b border-slate-300 px-1.5 py-0" colSpan={3}>
                  Rooms
                </td>
              </tr>
              {data.directCosts.rooms.map((item, i) => (
                <tr key={`rooms-${i}`}>
                  <td className="border-b border-slate-300 px-1.5 py-0 pl-3">
                    {item.item}
                  </td>
                  <td className="border-b border-slate-300 px-1.5 py-0 text-[8px] text-slate-900">
                    {item.index}
                  </td>
                  <td className="border-b border-slate-300 px-1.5 py-0 text-right font-mono">
                    {item.percentage}%
                  </td>
                </tr>
              ))}

              <tr className="bg-slate-50 font-bold">
                <td className="border-b border-slate-300 px-1.5 py-0" colSpan={3}>
                  F&amp;B
                </td>
              </tr>
              {data.directCosts.fAndB.map((item, i) => (
                <tr key={`fnb-${i}`}>
                  <td className="border-b border-slate-300 px-1.5 py-0 pl-3">
                    {item.item}
                  </td>
                  <td className="border-b border-slate-300 px-1.5 py-0 text-[8px] text-slate-900">
                    {item.index}
                  </td>
                  <td className="border-b border-slate-300 px-1.5 py-0 text-right font-mono">
                    {item.percentage}%
                  </td>
                </tr>
              ))}

              <tr className="bg-slate-50 font-bold">
                <td className="border-b border-slate-300 px-1.5 py-0" colSpan={3}>
                  Other Operating Departments
                </td>
              </tr>
              {data.directCosts.otherDepartments.map((item, i) => (
                <tr key={`other-${i}`}>
                  <td className="border-b border-slate-300 px-1.5 py-0 pl-3">
                    {item.item}
                  </td>
                  <td className="border-b border-slate-300 px-1.5 py-0 text-[8px] text-slate-900">
                    {item.index}
                  </td>
                  <td className="border-b border-slate-300 px-1.5 py-0 text-right font-mono">
                    {item.percentage}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <p className="text-[9px] text-slate-500 shrink-0">
          Source: HotelBenchmark 2007, Deloitte analysis, Component 2 Operational
          Assumptions
        </p>

        <EditableSlideParagraphs
          paragraphs={paragraphs}
          isEditing={isEditing}
          onParagraphChange={onParagraphChange}
          className="shrink-0"
          itemClassName="text-sm text-slate-700 leading-relaxed"
        />
      </div>
    </SlideContainer>
  );
}
