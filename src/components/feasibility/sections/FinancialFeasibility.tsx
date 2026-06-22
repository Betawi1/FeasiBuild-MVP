"use client";

import type { FeasibilityProjectBundle, FeasibilitySlide } from "@/types/feasibility";
import {
  buildDevelopmentScheduleFromBundle,
  isDevelopmentScheduleData,
} from "@/lib/feasibility/build-development-schedule-data";
import DevelopmentScheduleSlide from "../slides/DevelopmentScheduleSlide";
import OperationalRevenuesSlide from "../slides/OperationalRevenuesSlide";
import {
  buildOperationalRevenuesFromBundle,
  isOperationalRevenuesData,
} from "@/lib/feasibility/build-operational-revenues-data";
import OperationalExpensesSlide from "../slides/OperationalExpensesSlide";
import {
  buildOperationalExpensesFromBundle,
  isOperationalExpensesData,
} from "@/lib/feasibility/build-operational-expenses-data";
import OperationalPnLSlide from "../slides/OperationalPnLSlide";
import {
  buildOperationalPnlFromBundle,
  isOperationalPnLData,
} from "@/lib/feasibility/build-operational-pnl-data";
import OperationalCashFlowSlide from "../slides/OperationalCashFlowSlide";
import {
  buildOperationalCashFlowFromBundle,
  isOperationalCashFlowData,
} from "@/lib/feasibility/build-operational-cash-flow-data";
import TermLoanFinancingSlide from "../slides/TermLoanFinancingSlide";
import {
  buildTermLoanFinancingFromBundle,
  isTermLoanFinancingData,
} from "@/lib/feasibility/build-term-loan-data";
import PreferenceSharesExitStrategySlide from "../slides/PreferenceSharesExitStrategySlide";
import {
  buildPreferenceSharesExitStrategyFromBundle,
  isPreferenceSharesExitStrategyData,
} from "@/lib/feasibility/build-preference-shares-exit-data";
import PostFinancingCashFlowSlide from "../slides/PostFinancingCashFlowSlide";
import {
  buildPostFinancingCashFlowFromBundle,
  isPostFinancingCashFlowData,
} from "@/lib/feasibility/build-post-financing-cash-flow-data";
import IrrAndFinancingMetricsSlide from "../slides/IrrAndFinancingMetricsSlide";
import {
  buildIrrAndFinancingMetricsFromBundle,
  isIrrAndFinancingMetricsData,
} from "@/lib/feasibility/build-irr-financing-metrics-data";
import ScenarioComparisonSlide from "../slides/ScenarioComparisonSlide";
import {
  buildScenarioComparisonFromBundle,
  isScenarioComparisonData,
} from "@/lib/feasibility/build-scenario-comparison-data";
import ScenarioAnalysisResultsSlide from "../slides/ScenarioAnalysisResultsSlide";
import {
  buildScenarioAnalysisResultsFromBundle,
  isScenarioAnalysisResultsData,
} from "@/lib/feasibility/build-scenario-analysis-results-data";
import MallDevelopmentAssumptionsSlide from "../slides/MallDevelopmentAssumptionsSlide";
import MallOperationalRevenuesSlide from "../slides/MallOperationalRevenuesSlide";
import MallOperationalExpensesSlide from "../slides/MallOperationalExpensesSlide";
import MallOperationalPnLSlide from "../slides/MallOperationalPnLSlide";
import OfficeDevelopmentAssumptionsSlide from "../slides/OfficeDevelopmentAssumptionsSlide";
import OfficeOperationalRevenuesSlide from "../slides/OfficeOperationalRevenuesSlide";
import OfficeOperationalExpensesSlide from "../slides/OfficeOperationalExpensesSlide";
import OfficeOperationalPnLSlide from "../slides/OfficeOperationalPnLSlide";
import BTRDevelopmentAssumptionsSlide from "../slides/BTRDevelopmentAssumptionsSlide";
import BTROperationalRevenuesSlide from "../slides/BTROperationalRevenuesSlide";
import BTROperationalExpensesSlide from "../slides/BTROperationalExpensesSlide";
import BTROperationalPnLSlide from "../slides/BTROperationalPnLSlide";
import {
  buildMallDevelopmentAssumptionsData,
  buildMallOperationalExpensesData,
  buildMallOperationalPnlData,
  buildMallOperationalRevenuesData,
  isMallDevelopmentAssumptionsData,
  isMallOperationalExpensesData,
  isMallOperationalPnLData,
  isMallOperationalRevenuesData,
} from "@/lib/feasibility/build-retail-market-data";
import {
  buildOfficeDevelopmentAssumptionsData,
  buildOfficeOperationalExpensesData,
  buildOfficeOperationalPnlData,
  buildOfficeOperationalRevenuesData,
  isOfficeDevelopmentAssumptionsData,
  isOfficeOperationalExpensesData,
  isOfficeOperationalPnLData,
  isOfficeOperationalRevenuesData,
} from "@/lib/feasibility/build-office-market-data";
import {
  buildBTRDevelopmentAssumptionsData,
  buildBTROperationalExpensesData,
  buildBTROperationalPnlData,
  buildBTROperationalRevenuesData,
  isBTRDevelopmentAssumptionsData,
  isBTROperationalExpensesData,
  isBTROperationalPnLData,
  isBTROperationalRevenuesData,
} from "@/lib/feasibility/build-btr-market-data";
import SaleDevelopmentCostsSlide from "../sale/SaleDevelopmentCostsSlide";
import SaleDevelopmentScheduleSlide from "../sale/SaleDevelopmentScheduleSlide";
import SalesUptakeChartSlide from "../sale/SalesUptakeChartSlide";
import SalesSummaryTableSlide from "../sale/SalesSummaryTableSlide";
import ProjectCashFlowSlide from "../sale/ProjectCashFlowSlide";
import RevolvingCreditFacilitySlide from "../sale/RevolvingCreditFacilitySlide";
import EscrowWithdrawalSlide from "../sale/EscrowWithdrawalSlide";
import SalePostFinancingCashFlowSlide from "../sale/SalePostFinancingCashFlowSlide";
import SaleIrrMetricsSlide from "../sale/SaleIrrMetricsSlide";
import {
  buildSaleDevelopmentCostsData,
  buildSaleDevelopmentScheduleData,
  buildSaleEscrowWithdrawalData,
  buildSaleIrrMetricsData,
  buildSalePostFinancingCashFlowData,
  buildSaleProjectCashFlowData,
  buildSaleRevolvingCreditData,
  buildSaleSalesSummaryTableData,
  buildSaleSalesUptakeChartData,
  buildSaleScenarioComparisonData,
  buildSaleScenarioResultsData,
  isSaleDevelopmentCostsData,
  isSaleDevelopmentScheduleData,
  isSaleEscrowWithdrawalData,
  isSaleIrrMetricsData,
  isSalePostFinancingCashFlowData,
  isSaleProjectCashFlowData,
  isSaleRevolvingCreditData,
  isSaleSalesSummaryTableData,
  isSaleSalesUptakeChartData,
} from "@/lib/feasibility/sale/build-sale-financial-data";
import type { SaleFeasibilityBundle } from "@/types/feasibility";
import SlideContainer from "../SlideContainer";
import SlideHeader from "../SlideHeader";
import {
  formatThousands,
  pctOfTotal,
} from "@/lib/feasibility/utils";
import { cleanParagraphsForDisplay } from "@/lib/feasibility/clean-ai-content";

interface Props {
  slide: FeasibilitySlide;
  projectData: FeasibilityProjectBundle;
  isEditing?: boolean;
  onParagraphChange?: (index: number, text: string) => void;
}

export default function FinancialFeasibility({
  slide,
  projectData,
  isEditing = false,
  onParagraphChange,
}: Props) {
  const c = projectData.currency;
  const c1 = projectData.component1;
  const c2 = projectData.component2;
  const c4 = projectData.component4;
  const tdc = c4.tdc || 1;

  if (slide.id === "mall-dev-assumptions") {
    const mallData =
      isMallDevelopmentAssumptionsData(slide.data) &&
      (slide.data as { costBreakdown?: unknown }).costBreakdown
        ? slide.data
        : buildMallDevelopmentAssumptionsData(projectData);
    return (
      <MallDevelopmentAssumptionsSlide
        data={mallData}
        paragraphs={slide.paragraphs}
      />
    );
  }

  if (slide.id === "mall-operational-revenues") {
    const revData = isMallOperationalRevenuesData(slide.data)
      ? slide.data
      : buildMallOperationalRevenuesData(projectData);
    return (
      <MallOperationalRevenuesSlide
        data={revData}
        paragraphs={slide.paragraphs}
      />
    );
  }

  if (slide.id === "mall-operational-expenses") {
    const expData = isMallOperationalExpensesData(slide.data)
      ? slide.data
      : buildMallOperationalExpensesData(projectData);
    return (
      <MallOperationalExpensesSlide
        data={expData}
        paragraphs={slide.paragraphs}
      />
    );
  }

  if (slide.id === "mall-operational-pnl") {
    const pnlData = isMallOperationalPnLData(slide.data)
      ? slide.data
      : buildMallOperationalPnlData(projectData);
    return (
      <MallOperationalPnLSlide
        data={pnlData}
        commentary={slide.paragraphs[0]}
      />
    );
  }

  if (slide.id === "office-dev-assumptions") {
    const officeData =
      isOfficeDevelopmentAssumptionsData(slide.data) &&
      (slide.data as { costBreakdown?: unknown }).costBreakdown
        ? slide.data
        : buildOfficeDevelopmentAssumptionsData(projectData);
    return (
      <OfficeDevelopmentAssumptionsSlide
        data={officeData}
        paragraphs={slide.paragraphs}
      />
    );
  }

  if (slide.id === "office-operational-revenues") {
    const revData = isOfficeOperationalRevenuesData(slide.data)
      ? slide.data
      : buildOfficeOperationalRevenuesData(projectData);
    return (
      <OfficeOperationalRevenuesSlide
        data={revData}
        paragraphs={slide.paragraphs}
      />
    );
  }

  if (slide.id === "office-operational-expenses") {
    const expData = isOfficeOperationalExpensesData(slide.data)
      ? slide.data
      : buildOfficeOperationalExpensesData(projectData);
    return (
      <OfficeOperationalExpensesSlide
        data={expData}
        paragraphs={slide.paragraphs}
      />
    );
  }

  if (slide.id === "office-operational-pnl") {
    const pnlData = isOfficeOperationalPnLData(slide.data)
      ? slide.data
      : buildOfficeOperationalPnlData(projectData);
    return (
      <OfficeOperationalPnLSlide
        data={pnlData}
        commentary={slide.paragraphs[0]}
      />
    );
  }

  if (slide.id === "btr-dev-assumptions") {
    const btrData =
      isBTRDevelopmentAssumptionsData(slide.data) &&
      (slide.data as { costBreakdown?: unknown }).costBreakdown
        ? slide.data
        : buildBTRDevelopmentAssumptionsData(projectData);
    return (
      <BTRDevelopmentAssumptionsSlide
        data={btrData}
        paragraphs={slide.paragraphs}
      />
    );
  }

  if (
    slide.id === "btr-operational-revenues" ||
    slide.id === "btr-operational-assumptions"
  ) {
    const revenuesData = isBTROperationalRevenuesData(slide.data)
      ? slide.data
      : buildBTROperationalRevenuesData(projectData);
    return (
      <BTROperationalRevenuesSlide
        data={revenuesData}
        paragraphs={slide.paragraphs}
      />
    );
  }

  if (slide.id === "btr-operational-expenses") {
    const expensesData = isBTROperationalExpensesData(slide.data)
      ? slide.data
      : buildBTROperationalExpensesData(projectData);
    return (
      <BTROperationalExpensesSlide
        data={expensesData}
        paragraphs={slide.paragraphs}
      />
    );
  }

  if (slide.id === "btr-operational-pnl") {
    const pnlData = isBTROperationalPnLData(slide.data)
      ? slide.data
      : buildBTROperationalPnlData(projectData);
    return (
      <BTROperationalPnLSlide
        data={pnlData}
        commentary={slide.paragraphs[0]}
      />
    );
  }

  const saleBundle =
    projectData.stream === "sale"
      ? (projectData as SaleFeasibilityBundle)
      : null;

  if (slide.id === "sale-dev-assumptions" && saleBundle) {
    const devData = isSaleDevelopmentCostsData(slide.data)
      ? slide.data
      : buildSaleDevelopmentCostsData(saleBundle);
    return (
      <SaleDevelopmentCostsSlide data={devData} paragraphs={slide.paragraphs} />
    );
  }

  if (slide.id === "sale-development-schedule" && saleBundle) {
    const scheduleData = isSaleDevelopmentScheduleData(slide.data)
      ? slide.data
      : buildSaleDevelopmentScheduleData(saleBundle);
    return (
      <SaleDevelopmentScheduleSlide
        data={scheduleData}
        paragraphs={slide.paragraphs}
      />
    );
  }

  if (slide.id === "sale-sales-uptake-chart" && saleBundle) {
    const salesData = isSaleSalesUptakeChartData(slide.data)
      ? slide.data
      : buildSaleSalesUptakeChartData(saleBundle);
    return (
      <SalesUptakeChartSlide data={salesData} paragraphs={slide.paragraphs} />
    );
  }

  if (slide.id === "sale-sales-summary-table" && saleBundle) {
    const summaryData = isSaleSalesSummaryTableData(slide.data)
      ? slide.data
      : buildSaleSalesSummaryTableData(saleBundle);
    return <SalesSummaryTableSlide data={summaryData} />;
  }

  if (slide.id === "sale-project-cash-flow" && saleBundle) {
    const cfData = isSaleProjectCashFlowData(slide.data)
      ? slide.data
      : buildSaleProjectCashFlowData(saleBundle);
    return (
      <ProjectCashFlowSlide data={cfData} paragraphs={slide.paragraphs} />
    );
  }

  if (slide.id === "sale-rcf" && saleBundle) {
    const rcfData = isSaleRevolvingCreditData(slide.data)
      ? slide.data
      : buildSaleRevolvingCreditData(saleBundle);
    return (
      <RevolvingCreditFacilitySlide data={rcfData} paragraphs={slide.paragraphs} />
    );
  }

  if (slide.id === "sale-escrow" && saleBundle) {
    const escrowData = isSaleEscrowWithdrawalData(slide.data)
      ? slide.data
      : buildSaleEscrowWithdrawalData(saleBundle);
    return (
      <EscrowWithdrawalSlide data={escrowData} paragraphs={slide.paragraphs} />
    );
  }

  if (slide.id === "sale-post-financing" && saleBundle) {
    const postData = isSalePostFinancingCashFlowData(slide.data)
      ? slide.data
      : buildSalePostFinancingCashFlowData(saleBundle);
    return (
      <SalePostFinancingCashFlowSlide
        data={postData}
        paragraphs={slide.paragraphs}
      />
    );
  }

  if (slide.id === "sale-irr-metrics" && saleBundle) {
    const irrData = isSaleIrrMetricsData(slide.data)
      ? slide.data
      : buildSaleIrrMetricsData(saleBundle);
    return (
      <SaleIrrMetricsSlide data={irrData} paragraphs={slide.paragraphs} />
    );
  }

  if (slide.id === "sale-scenario-comparison" && saleBundle) {
    const scenarioData = isScenarioComparisonData(slide.data)
      ? slide.data
      : buildSaleScenarioComparisonData(saleBundle);
    return <ScenarioComparisonSlide data={scenarioData} />;
  }

  if (slide.id === "sale-scenario-results" && saleBundle) {
    const resultsData = isScenarioAnalysisResultsData(slide.data)
      ? slide.data
      : buildSaleScenarioResultsData(saleBundle);
    return <ScenarioAnalysisResultsSlide data={resultsData} />;
  }

  if (slide.id === "fin-dev-schedule") {
    const scheduleData = isDevelopmentScheduleData(slide.data)
      ? slide.data
      : projectData.developmentSchedule ?? buildDevelopmentScheduleFromBundle(projectData);
    return (
      <DevelopmentScheduleSlide
        data={scheduleData}
        paragraphs={slide.paragraphs}
      />
    );
  }

  if (slide.id === "operational-revenues") {
    const revenuesData = isOperationalRevenuesData(slide.data)
      ? slide.data
      : projectData.operationalRevenues ??
        buildOperationalRevenuesFromBundle(projectData);
    return (
      <OperationalRevenuesSlide
        data={revenuesData}
        paragraphs={slide.paragraphs}
      />
    );
  }

  if (slide.id === "operational-expenses") {
    const expensesData = isOperationalExpensesData(slide.data)
      ? slide.data
      : projectData.operationalExpenses ??
        buildOperationalExpensesFromBundle(projectData);
    return <OperationalExpensesSlide data={expensesData} />;
  }

  if (slide.id === "operational-pnl") {
    const pnlData = isOperationalPnLData(slide.data)
      ? slide.data
      : projectData.operationalPnl ?? buildOperationalPnlFromBundle(projectData);
    return <OperationalPnLSlide data={pnlData} />;
  }

  if (slide.id === "operational-cash-flow") {
    const cfData = isOperationalCashFlowData(slide.data)
      ? slide.data
      : projectData.operationalCashFlow ??
        buildOperationalCashFlowFromBundle(projectData);
    return <OperationalCashFlowSlide data={cfData} />;
  }

  if (slide.id === "fin-term-loan") {
    const termLoanData = isTermLoanFinancingData(slide.data)
      ? slide.data
      : projectData.termLoanFinancing ??
        buildTermLoanFinancingFromBundle(projectData);
    return (
      <TermLoanFinancingSlide
        data={termLoanData}
        paragraphs={slide.paragraphs}
        isEditing={isEditing}
        onParagraphChange={onParagraphChange}
      />
    );
  }

  if (slide.id === "pref-shares-exit-strategy") {
    const prefSharesExitData = isPreferenceSharesExitStrategyData(slide.data)
      ? slide.data
      : projectData.preferenceSharesExitStrategy ??
        buildPreferenceSharesExitStrategyFromBundle(projectData);
    return <PreferenceSharesExitStrategySlide data={prefSharesExitData} />;
  }

  if (slide.id === "post-financing-cash-flow") {
    const postFinancingData = isPostFinancingCashFlowData(slide.data)
      ? slide.data
      : projectData.postFinancingCashFlow ??
        buildPostFinancingCashFlowFromBundle(projectData);
    return <PostFinancingCashFlowSlide data={postFinancingData} />;
  }

  if (slide.id === "irr-and-financing-metrics") {
    const metricsData = isIrrAndFinancingMetricsData(slide.data)
      ? slide.data
      : projectData.irrAndFinancingMetrics ??
        buildIrrAndFinancingMetricsFromBundle(projectData);
    return <IrrAndFinancingMetricsSlide data={metricsData} />;
  }

  if (slide.id === "scenario-comparison") {
    const scenarioData = isScenarioComparisonData(slide.data)
      ? slide.data
      : projectData.scenarioComparison ??
        buildScenarioComparisonFromBundle(projectData);
    return <ScenarioComparisonSlide data={scenarioData} />;
  }

  if (slide.id === "scenario-analysis-results") {
    const resultsData = isScenarioAnalysisResultsData(slide.data)
      ? slide.data
      : projectData.scenarioAnalysisResults ??
        buildScenarioAnalysisResultsFromBundle(projectData);
    return <ScenarioAnalysisResultsSlide data={resultsData} />;
  }

  return (
    <SlideContainer>
      <SlideHeader title={slide.title} subtitle={slide.subtitle} />

      <div className="flex-1 overflow-y-auto min-h-0 space-y-4">
        {slide.id === "fin-dev-assumptions" && (
          <div className="grid grid-cols-2 gap-6">
            <div>
              <h3 className="font-bold text-slate-700 mb-2">
                General Hotel Assumptions
              </h3>
              <table className="feasibility-table w-full text-sm text-slate-900 border border-slate-300 border-collapse">
                <tbody>
                  <tr>
                    <td className="border border-slate-300 p-2">Number of keys</td>
                    <td className="border border-slate-300 p-2 text-right font-mono">
                      {c1.rooms.toLocaleString()}
                    </td>
                  </tr>
                  <tr>
                    <td className="border border-slate-300 p-2">
                      Operational period (yrs)
                    </td>
                    <td className="border border-slate-300 p-2 text-right font-mono">
                      {c2.operationalYears}
                    </td>
                  </tr>
                  <tr>
                    <td className="border border-slate-300 p-2">
                      Expected ADR inflation
                    </td>
                    <td className="border border-slate-300 p-2 text-right font-mono">
                      {c2.adrInflation}%
                    </td>
                  </tr>
                  <tr>
                    <td className="border border-slate-300 p-2">
                      Stabilized occupancy
                    </td>
                    <td className="border border-slate-300 p-2 text-right font-mono">
                      {c2.occupancyStabilized}%
                    </td>
                  </tr>
                  <tr>
                    <td className="border border-slate-300 p-2">
                      Building rate (/sqft)
                    </td>
                    <td className="border border-slate-300 p-2 text-right font-mono">
                      {c1.buildingRate.toLocaleString()}
                    </td>
                  </tr>
                  <tr>
                    <td className="border border-slate-300 p-2">
                      Parking rate (/sqft)
                    </td>
                    <td className="border border-slate-300 p-2 text-right font-mono">
                      {c1.parkingRate.toLocaleString()}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
            <div>
              <h3 className="font-bold text-slate-700 mb-2">
                Development Requirements
              </h3>
              <table className="feasibility-table w-full text-sm text-slate-900 border border-slate-300 border-collapse">
                <thead>
                  <tr className="bg-slate-100">
                    <th className="border border-slate-300 p-2 text-left font-bold text-slate-900">
                      Component
                    </th>
                    <th className="border border-slate-300 p-2 text-right font-bold text-slate-900">
                      {c} (&apos;000)
                    </th>
                    <th className="border border-slate-300 p-2 text-right font-bold text-slate-900">
                      % of Total
                    </th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="border border-slate-300 p-2">Land Acquisition</td>
                    <td className="border border-slate-300 p-2 text-right font-mono">
                      {formatThousands(c1.landCost)}
                    </td>
                    <td className="border border-slate-300 p-2 text-right">
                      {pctOfTotal(c1.landCost, tdc)}
                    </td>
                  </tr>
                  <tr>
                    <td className="border border-slate-300 p-2">Construction</td>
                    <td className="border border-slate-300 p-2 text-right font-mono">
                      {formatThousands(c1.constructionCost)}
                    </td>
                    <td className="border border-slate-300 p-2 text-right">
                      {pctOfTotal(c1.constructionCost, tdc)}
                    </td>
                  </tr>
                  <tr>
                    <td className="border border-slate-300 p-2">Soft Costs</td>
                    <td className="border border-slate-300 p-2 text-right font-mono">
                      {formatThousands(c1.softCosts)}
                    </td>
                    <td className="border border-slate-300 p-2 text-right">
                      {pctOfTotal(c1.softCosts, tdc)}
                    </td>
                  </tr>
                  <tr>
                    <td className="border border-slate-300 p-2">FF&E</td>
                    <td className="border border-slate-300 p-2 text-right font-mono">
                      {formatThousands(c1.ffe)}
                    </td>
                    <td className="border border-slate-300 p-2 text-right">
                      {pctOfTotal(c1.ffe, tdc)}
                    </td>
                  </tr>
                  <tr className="bg-slate-50 font-bold">
                    <td className="border border-slate-300 p-2">
                      Total Development Cost
                    </td>
                    <td className="border border-slate-300 p-2 text-right font-mono">
                      {formatThousands(tdc)}
                    </td>
                    <td className="border border-slate-300 p-2 text-right">
                      100%
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        )}

        <div className="space-y-3">
          {cleanParagraphsForDisplay(slide.paragraphs).map((p, i) =>
            isEditing && onParagraphChange ? (
              <textarea
                key={i}
                value={p}
                onChange={(e) => onParagraphChange(i, e.target.value)}
                className="w-full p-2 border border-slate-300 rounded text-sm text-slate-700 h-20 resize-y"
              />
            ) : (
              <p key={i} className="text-sm text-slate-700 mb-2 leading-relaxed">
                {p}
              </p>
            )
          )}
        </div>

        {slide.id !== "fin-dev-assumptions" &&
          slide.tables?.map((table, i) => (
            <div key={i}>
              <h4 className="text-xs font-semibold text-slate-600 mb-1">
                {table.title}
              </h4>
              <table className="feasibility-table w-full text-xs text-slate-900 border border-slate-300 border-collapse">
                <thead>
                  <tr className="bg-slate-100">
                    {table.headers.map((h, j) => (
                      <th key={j} className="border border-slate-300 p-2 text-left font-bold text-slate-900">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {table.rows.map((row, j) => (
                    <tr key={j}>
                      {row.map((cell, k) => (
                        <td
                          key={k}
                          className={`border border-slate-300 p-2 text-slate-900 ${
                            k > 0 ? "text-right font-mono" : "font-medium"
                          }`}
                        >
                          {cell}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}
      </div>
    </SlideContainer>
  );
}
