"use client";

import SlideContainer from "@/components/feasibility/SlideContainer";
import SlideHeader from "@/components/feasibility/SlideHeader";
import EditableSlideParagraphs from "@/components/feasibility/EditableSlideParagraphs";
import type { SlideEditingProps } from "@/components/feasibility/slide-editing";
import type { SaleEscrowWithdrawalData } from "@/types/feasibility";
import {
  ESCROW_RULE_CONFIG_TITLE,
  ESCROW_RULE_DISPLAY_NAME,
  normalizeEscrowRuleId,
  type EscrowRuleId,
} from "@/lib/financing-engine/escrow-rules";

interface Props extends SlideEditingProps {
  data: SaleEscrowWithdrawalData;
  paragraphs?: string[];
}

function resolveSlideRule(data: SaleEscrowWithdrawalData): EscrowRuleId {
  if (data.ruleId) return normalizeEscrowRuleId(data.ruleId);
  const j = (data.jurisdiction ?? "").toLowerCase();
  if (j === "uae" || j.includes("rera") || j.includes("staged")) return "staged";
  if (j === "malaysia" || j.includes("hda") || j.includes("progress")) return "progress";
  if (j === "australia" || j.includes("10/90") || j.includes("ten_ninety")) return "ten_ninety";
  if (j.includes("no escrow") || j === "none") return "none";
  return normalizeEscrowRuleId(data.jurisdiction);
}

export default function EscrowWithdrawalSlide({
  data,
  paragraphs = [],
  isEditing = false,
  onParagraphChange,
}: Props) {
  const c = data.currency;
  const rule = resolveSlideRule(data);
  const title =
    data.configTitle || ESCROW_RULE_CONFIG_TITLE[rule] || ESCROW_RULE_DISPLAY_NAME[rule];
  const showRera = rule === "staged" && data.localRegimeNote === "Dubai RERA";
  const showHda = rule === "progress" && Boolean(data.localRegimeNote?.includes("HDA"));
  const showAu1090 =
    rule === "ten_ninety" && Boolean(data.localRegimeNote?.toLowerCase().includes("10/90"));

  return (
    <SlideContainer>
      <SlideHeader
        title="Financial Analysis"
        subtitle="Escrow Withdrawal Configuration"
        className="mb-4"
      />
      {(paragraphs.length > 0 || isEditing) && (
        <div className="mb-4 bg-blue-50 border-l-4 border-blue-500 p-3 rounded shrink-0">
          <EditableSlideParagraphs
            paragraphs={paragraphs}
            isEditing={isEditing}
            onParagraphChange={onParagraphChange}
            itemClassName="text-sm text-slate-700 leading-relaxed"
          />
        </div>
      )}
      <div className="flex-1 overflow-auto min-h-0">
        {rule === "staged" && (
          <div>
            <h3 className="text-sm font-bold text-slate-800 mb-2">{title}</h3>
            <ul className="mb-3 list-disc pl-4 text-xs text-slate-700 space-y-1">
              <li>
                Buyer payments are lodged in a designated escrow account and withdrawn only after
                construction-progress certifications.
              </li>
              <li>
                Certifications occur every {data.uaeConfig.certificationInterval}, with a{" "}
                {data.uaeConfig.retentionPercentage}% retention held until{" "}
                {data.uaeConfig.releaseTiming}.
              </li>
              <li>
                Setup fee {c} {Number(data.uaeConfig.setupFee).toLocaleString()} and management fee{" "}
                {data.uaeConfig.managementFee}% p.a. on the average balance.
              </li>
            </ul>
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
                Staged Escrow Framework — Detailed Explanation
              </h4>
              <p className="text-xs text-slate-700 leading-relaxed mb-2">
                Under a certification-based staged withdrawal mechanism, all buyer payments for
                off-plan properties are deposited into a designated escrow account managed by an
                approved bank or financial institution. The framework protects buyer interests and
                ensures developer funds are used exclusively for the project for which they were
                collected.
              </p>
              <p className="text-xs text-slate-700 leading-relaxed mb-2">
                The developer may withdraw funds based on construction progress certifications
                issued by the project engineer or consultant. In this project, certifications occur
                every {data.uaeConfig.certificationInterval}, allowing periodic withdrawals aligned
                with actual construction milestones. A retention of{" "}
                {data.uaeConfig.retentionPercentage}% is held in escrow until{" "}
                {data.uaeConfig.releaseTiming}, serving as a defect-liability reserve to address
                post-completion issues.
              </p>
              {showRera && (
                <p className="text-xs text-slate-700 leading-relaxed mb-2">
                  For this Dubai project the local regime is the Real Estate Regulatory Agency
                  (RERA) escrow framework, which applies the same certification-and-retention
                  mechanism.
                </p>
              )}
              <p className="text-xs text-slate-700 leading-relaxed">
                The escrow account incurs a one-time setup fee of {c}{" "}
                {Number(data.uaeConfig.setupFee).toLocaleString()} and an annual management fee of{" "}
                {data.uaeConfig.managementFee}% on the average balance.
              </p>
            </div>
          </div>
        )}

        {rule === "progress" && (
          <div>
            <h3 className="text-sm font-bold text-slate-800 mb-2">{title}</h3>
            <ul className="mb-3 list-disc pl-4 text-xs text-slate-700 space-y-1">
              <li>
                Withdrawals follow construction-progress milestones (S-curve thresholds) against
                actual sales collected.
              </li>
              <li>
                A construction deposit is lodged at commencement and retained through the
                post-completion tail.
              </li>
              {showHda && (
                <li>
                  This project&apos;s location uses the Malaysia Housing Development Act (HDA)
                  progress-drawdown convention as the local regime.
                </li>
              )}
            </ul>
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
                  <td className="border border-slate-300 p-2 font-medium">Construction Deposit</td>
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
                <tr>
                  <td className="border border-slate-300 p-2 font-medium">Escrow Setup Fee</td>
                  <td className="border border-slate-300 p-2">
                    {c} {Number(data.malaysiaConfig.setupFee).toLocaleString()}
                  </td>
                </tr>
                <tr>
                  <td className="border border-slate-300 p-2 font-medium">Management Fee</td>
                  <td className="border border-slate-300 p-2">
                    {data.malaysiaConfig.managementFee}% p.a.
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        )}

        {rule === "ten_ninety" && (
          <div>
            <h3 className="text-sm font-bold text-slate-800 mb-2">{title}</h3>
            <ul className="mb-3 list-disc pl-4 text-xs text-slate-700 space-y-1">
              <li>
                A purchase deposit is held in trust during construction; the balance is paid at
                completion / settlement.
              </li>
              <li>
                Deposit {data.australiaConfig.purchaseDeposit}% and balance{" "}
                {data.australiaConfig.balancePayment}% of sales proceeds.
              </li>
              {showAu1090 && (
                <li>
                  This project&apos;s location follows Australian state 10/90 trust conventions as
                  the local regime.
                </li>
              )}
            </ul>
            <table className="feasibility-table w-full text-xs border border-slate-300">
              <tbody>
                <tr>
                  <td className="border border-slate-300 p-2 font-medium">Purchase Deposit %</td>
                  <td className="border border-slate-300 p-2">
                    {data.australiaConfig.purchaseDeposit}% of Sales Proceeds
                  </td>
                </tr>
                <tr>
                  <td className="border border-slate-300 p-2 font-medium">Balance Payment %</td>
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

        {rule === "none" && (
          <div>
            <h3 className="text-sm font-bold text-slate-800 mb-2">{title}</h3>
            <ul className="mb-3 list-disc pl-4 text-xs text-slate-700 space-y-1">
              <li>
                No statutory escrow or trust withdrawal mechanism is applied to this project.
              </li>
              <li>
                Sales proceeds sweep directly to debt service and equity distribution (standard
                commercial waterfall).
              </li>
            </ul>
          </div>
        )}
      </div>
    </SlideContainer>
  );
}
