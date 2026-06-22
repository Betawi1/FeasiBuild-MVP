import type { FeasibilityProjectBundle, FeasibilitySlide } from "@/types/feasibility";
import { buildDevelopmentScheduleFromBundle } from "@/lib/feasibility/build-development-schedule-data";
import { buildOperationalRevenuesFromBundle } from "@/lib/feasibility/build-operational-revenues-data";
import { buildOperationalExpensesFromBundle } from "@/lib/feasibility/build-operational-expenses-data";
import { buildOperationalPnlFromBundle } from "@/lib/feasibility/build-operational-pnl-data";
import { buildOperationalCashFlowFromBundle } from "@/lib/feasibility/build-operational-cash-flow-data";
import {
  buildTermLoanFinancingFromBundle,
} from "@/lib/feasibility/build-term-loan-data";
import {
  buildPreferenceSharesExitStrategyFromBundle,
} from "@/lib/feasibility/build-preference-shares-exit-data";
import {
  buildPostFinancingCashFlowFromBundle,
} from "@/lib/feasibility/build-post-financing-cash-flow-data";
import {
  buildIrrAndFinancingMetricsFromBundle,
} from "@/lib/feasibility/build-irr-financing-metrics-data";
import {
  buildScenarioComparisonFromBundle,
} from "@/lib/feasibility/build-scenario-comparison-data";
import {
  buildScenarioAnalysisResultsFromBundle,
} from "@/lib/feasibility/build-scenario-analysis-results-data";
import { generateFinancialCommentary } from "@/lib/feasibility/generate-financial-commentary";

export function generateFinancialSlides(
  project: FeasibilityProjectBundle
): FeasibilitySlide[] {
  const scheduleData =
    project.developmentSchedule ?? buildDevelopmentScheduleFromBundle(project);
  const operationalRevenuesData =
    project.operationalRevenues ?? buildOperationalRevenuesFromBundle(project);
  const operationalExpensesData =
    project.operationalExpenses ?? buildOperationalExpensesFromBundle(project);
  const operationalPnlData =
    project.operationalPnl ?? buildOperationalPnlFromBundle(project);
  const operationalCashFlowData =
    project.operationalCashFlow ?? buildOperationalCashFlowFromBundle(project);
  const termLoanData =
    project.termLoanFinancing ?? buildTermLoanFinancingFromBundle(project);
  const prefSharesExitData =
    project.preferenceSharesExitStrategy ??
    buildPreferenceSharesExitStrategyFromBundle(project);
  const postFinancingCashFlowData =
    project.postFinancingCashFlow ??
    buildPostFinancingCashFlowFromBundle(project);
  const irrAndFinancingMetricsData =
    project.irrAndFinancingMetrics ??
    buildIrrAndFinancingMetricsFromBundle(project);
  const scenarioComparisonData =
    project.scenarioComparison ?? buildScenarioComparisonFromBundle(project);
  const scenarioAnalysisResultsData =
    project.scenarioAnalysisResults ??
    buildScenarioAnalysisResultsFromBundle(project);

  return [
    {
      id: "fin-dev-assumptions",
      section: "financial",
      title: "Financial Analysis",
      subtitle: "Development Assumptions — General Hotel Assumptions",
      paragraphs: generateFinancialCommentary(project, "Development Assumptions"),
    },
    {
      id: "fin-dev-schedule",
      section: "financial",
      title: "Financial Analysis",
      subtitle: "Hotel Development Schedule",
      paragraphs: generateFinancialCommentary(project, "Hotel Development Schedule"),
      data: scheduleData,
    },
    {
      id: "operational-revenues",
      section: "financial",
      title: "Financial Analysis",
      subtitle: "Operational Assumptions - Revenues",
      paragraphs: operationalRevenuesData.notes,
      data: operationalRevenuesData,
    },
    {
      id: "operational-expenses",
      section: "financial",
      title: "Financial Analysis",
      subtitle: "Operational Assumptions - Expenses",
      paragraphs: [],
      data: operationalExpensesData,
    },
    {
      id: "operational-pnl",
      section: "financial",
      title: "Financial Analysis",
      subtitle: "Operational Profit & Loss",
      paragraphs: [],
      data: operationalPnlData,
    },
    {
      id: "operational-cash-flow",
      section: "financial",
      title: "Financial Analysis",
      subtitle: "Cash Flow Statement",
      paragraphs: [],
      data: operationalCashFlowData,
    },
    {
      id: "fin-term-loan",
      section: "financial",
      title: termLoanData.title,
      subtitle: termLoanData.subtitle,
      paragraphs: generateFinancialCommentary(project, "Term Loan"),
      data: termLoanData,
    },
    {
      id: "pref-shares-exit-strategy",
      section: "financial",
      title: "Financial Analysis",
      subtitle: "Preference Shares, Covenants & Exit Strategy",
      paragraphs: [],
      data: prefSharesExitData,
    },
    {
      id: "post-financing-cash-flow",
      section: "financial",
      title: "Financial Analysis",
      subtitle: "Post-Financing Annual Cash Flows",
      paragraphs: [],
      data: postFinancingCashFlowData,
    },
    {
      id: "irr-and-financing-metrics",
      section: "financial",
      title: "Financial Analysis",
      subtitle: "IRR and Key Financing Metrics",
      paragraphs: [irrAndFinancingMetricsData.commentary],
      data: irrAndFinancingMetricsData,
    },
    {
      id: "scenario-comparison",
      section: "financial",
      title: "Financial Analysis",
      subtitle: "Scenario Comparison & IRR Sensitivity",
      paragraphs: [],
      data: scenarioComparisonData,
    },
    {
      id: "scenario-analysis-results",
      section: "financial",
      title: "Financial Analysis",
      subtitle: "Scenario Analysis Results",
      paragraphs: scenarioAnalysisResultsData.fallbackCommentary
        ? [scenarioAnalysisResultsData.fallbackCommentary]
        : [],
      data: scenarioAnalysisResultsData,
    },
  ];
}
