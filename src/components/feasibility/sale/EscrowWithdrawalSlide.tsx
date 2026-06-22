"use client";

import SlideContainer from "@/components/feasibility/SlideContainer";
import SlideHeader from "@/components/feasibility/SlideHeader";
import type { SaleEscrowWithdrawalData } from "@/types/feasibility";

interface Props {
  data: SaleEscrowWithdrawalData;
  paragraphs?: string[];
}

export default function EscrowWithdrawalSlide({ data, paragraphs = [] }: Props) {
  const c = data.currency;

  return (
    <SlideContainer>
      <SlideHeader
        title="Financial Analysis"
        subtitle="Escrow Withdrawal Configuration"
        className="mb-4"
      />
      {paragraphs.length > 0 && (
        <div className="mb-4 bg-blue-50 border-l-4 border-blue-500 p-3 rounded shrink-0">
          <p className="text-sm text-slate-700 leading-relaxed">{paragraphs[0]}</p>
        </div>
      )}
      <div className="flex-1 overflow-auto min-h-0">
        {data.jurisdiction === "UAE" && (
          <div>
            <h3 className="text-sm font-bold text-slate-800 mb-2">
              UAE — RERA Escrow Configuration
            </h3>
            <table className="feasibility-table w-full text-xs border border-slate-300 mb-3">
              <tbody>
                <tr>
                  <td className="border border-slate-300 p-2 font-medium">Certification Interval</td>
                  <td className="border border-slate-300 p-2">{data.uaeConfig.certificationInterval}</td>
                </tr>
                <tr>
                  <td className="border border-slate-300 p-2 font-medium">Retention Percentage</td>
                  <td className="border border-slate-300 p-2">{data.uaeConfig.retentionPercentage}%</td>
                </tr>
                <tr>
                  <td className="border border-slate-300 p-2 font-medium">Release Timing</td>
                  <td className="border border-slate-300 p-2">{data.uaeConfig.releaseTiming}</td>
                </tr>
                <tr>
                  <td className="border border-slate-300 p-2 font-medium">Illustrative Retention</td>
                  <td className="border border-slate-300 p-2">{data.uaeConfig.illustrativeRetention}</td>
                </tr>
                <tr>
                  <td className="border border-slate-300 p-2 font-medium">Escrow Setup Fee</td>
                  <td className="border border-slate-300 p-2">
                    {c} {Number(data.uaeConfig.setupFee).toLocaleString()}
                  </td>
                </tr>
                <tr>
                  <td className="border border-slate-300 p-2 font-medium">Management Fee</td>
                  <td className="border border-slate-300 p-2">{data.uaeConfig.managementFee}% p.a.</td>
                </tr>
              </tbody>
            </table>
            <div className="mt-2 bg-slate-50 border-l-4 border-blue-500 p-3 rounded">
              <h4 className="text-xs font-bold text-slate-800 mb-2">
                UAE RERA Escrow Framework — Detailed Explanation
              </h4>
              <p className="text-xs text-slate-700 leading-relaxed mb-2">
                Under the UAE Real Estate Regulatory Agency (RERA) escrow regulations, all buyer
                payments for off-plan properties must be deposited into a designated escrow account
                managed by an approved bank or financial institution. This framework is designed to
                protect buyer interests and ensure that developer funds are used exclusively for the
                specific project for which they were collected.
              </p>
              <p className="text-xs text-slate-700 leading-relaxed mb-2">
                The developer may withdraw funds from the escrow account based on construction
                progress certifications issued by the project engineer or consultant. In this
                project, certifications occur every {data.uaeConfig.certificationInterval}, allowing
                periodic withdrawals aligned with actual construction milestones. A retention of{" "}
                {data.uaeConfig.retentionPercentage}% of the Gross Development Value (GDV) is held in
                escrow until {data.uaeConfig.releaseTiming}, serving as a defect liability reserve to
                address any post-completion issues.
              </p>
              <p className="text-xs text-slate-700 leading-relaxed">
                The escrow account incurs a one-time setup fee of {c}{" "}
                {Number(data.uaeConfig.setupFee).toLocaleString()} and an annual management fee of{" "}
                {data.uaeConfig.managementFee}% on the average balance. This structure ensures
                transparent fund management, reduces developer default risk, and provides buyers with
                confidence that their payments are secured until project completion and handover.
              </p>
            </div>
          </div>
        )}

        {data.jurisdiction === "Malaysia" && (
          <div>
            <h3 className="text-sm font-bold text-slate-800 mb-2">
              Malaysia — HDA Escrow Configuration (Schedule H)
            </h3>
            <table className="feasibility-table w-full text-[8px] border border-slate-300 mb-3">
              <thead>
                <tr className="bg-slate-800 text-white">
                  <th className="border border-slate-300 py-0.5 px-1">Stage</th>
                  <th className="border border-slate-300 py-0.5 px-1">Milestone</th>
                  <th className="border border-slate-300 py-0.5 px-1">Withdrawal %</th>
                  <th className="border border-slate-300 py-0.5 px-1">S-Curve Trigger</th>
                </tr>
              </thead>
              <tbody>
                {data.malaysiaConfig.withdrawalSchedule.map((item, i) => (
                  <tr key={i}>
                    <td className="border border-slate-300 py-0.5 px-1">{item.stage}</td>
                    <td className="border border-slate-300 py-0.5 px-1">{item.milestone}</td>
                    <td className="border border-slate-300 py-0.5 px-1 text-right">
                      {item.withdrawalPercent}
                    </td>
                    <td className="border border-slate-300 py-0.5 px-1 text-right">
                      {item.sCurveTrigger}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <table className="feasibility-table w-full text-xs border border-slate-300">
              <tbody>
                <tr>
                  <td className="border border-slate-300 p-2 font-medium">HDA Deposit</td>
                  <td className="border border-slate-300 p-2">{data.malaysiaConfig.hdaDeposit}</td>
                </tr>
                <tr>
                  <td className="border border-slate-300 p-2 font-medium">Property Type</td>
                  <td className="border border-slate-300 p-2">{data.malaysiaConfig.propertyType}</td>
                </tr>
                <tr>
                  <td className="border border-slate-300 p-2 font-medium">Retention Release (First 50%)</td>
                  <td className="border border-slate-300 p-2">
                    {data.malaysiaConfig.retentionRelease.firstRelease}
                  </td>
                </tr>
                <tr>
                  <td className="border border-slate-300 p-2 font-medium">Retention Release (Final 50%)</td>
                  <td className="border border-slate-300 p-2">
                    {data.malaysiaConfig.retentionRelease.finalRelease}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        )}

        {data.jurisdiction === "Australia" && (
          <div>
            <h3 className="text-sm font-bold text-slate-800 mb-2">
              Australia — 10/90 Withdrawal Rule
            </h3>
            <table className="feasibility-table w-full text-xs border border-slate-300">
              <tbody>
                <tr>
                  <td className="border border-slate-300 p-2 font-medium">Purchase Deposit</td>
                  <td className="border border-slate-300 p-2">
                    {data.australiaConfig.purchaseDeposit}% of Sales Proceeds
                  </td>
                </tr>
                <tr>
                  <td className="border border-slate-300 p-2 font-medium">Balance Payment</td>
                  <td className="border border-slate-300 p-2">
                    {data.australiaConfig.balancePayment}% of Sales Proceeds
                  </td>
                </tr>
                <tr>
                  <td className="border border-slate-300 p-2 font-medium">Illustrative Retention</td>
                  <td className="border border-slate-300 p-2">
                    {data.australiaConfig.illustrativeRetention}
                  </td>
                </tr>
                <tr>
                  <td className="border border-slate-300 p-2 font-medium">Release Timing</td>
                  <td className="border border-slate-300 p-2">{data.australiaConfig.releaseTiming}</td>
                </tr>
                <tr>
                  <td className="border border-slate-300 p-2 font-medium">Escrow Setup Fee</td>
                  <td className="border border-slate-300 p-2">
                    {c} {Number(data.australiaConfig.setupFee).toLocaleString()}
                  </td>
                </tr>
                <tr>
                  <td className="border border-slate-300 p-2 font-medium">Management Fee</td>
                  <td className="border border-slate-300 p-2">
                    {data.australiaConfig.managementFee}% p.a.
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        )}
      </div>
    </SlideContainer>
  );
}
