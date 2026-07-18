"use client";

import dynamic from "next/dynamic";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useRouter, useSearchParams } from "next/navigation";
import SearchParamsBoundary from "@/components/SearchParamsBoundary";
import { getCurrencyForCountry } from "@/lib/constants/countryCurrencies";
import useFinModelStore from "@/store/useFinModelStore";
import useSaleModelStore, {
  type CashOutflows,
  type ProjectInfo,
} from "@/store/useSaleModelStore";
import AIRecommendationBox from "@/components/AIRecommendationBox";
import PreviewFloatingBar from "@/components/PreviewFloatingBar";
import {
  DEFAULT_POWC_ALLOCATION,
  DEFAULT_SOFT_COST_ALLOCATION,
} from "@/lib/cash-outflow-default-allocations";
import {
  POWC_STEP13_TIMING_NOTES,
  SOFT_COSTS_TIMING_NOTES,
} from "@/lib/cash-outflow-powc-timing";
import {
  getStreamPrefix,
  useStreamPrefix,
  withStreamPrefix,
} from "@/lib/stream-path";
import { buildRecommendationQuery } from "@/app/sale/utils/db-mapping";
import {
  getCityLandRate,
  getRecommendations,
  type SaleRecommendationBuildingType,
} from "@/app/sale/data/recommendations";
import type { StageAllocation, AiResearchData } from "@/store/useFinModelStore";
import { useAiResearch } from "@/hooks/useAiResearch";
import type { AiAssetType } from "@/lib/constants/aiPrompts";
import { normalizeAiResearchData } from "@/lib/constants/aiPrompts";
import { AiInput } from "@/components/ui/AiInput";
import { AiHintBox } from "@/components/ui/AiHintBox";
import { AiGuardrailBox } from "@/components/ui/AiGuardrailBox";
import {
  logSaleCashOutflow,
  SALE_CASH_OUTFLOW_AUDIT_FIELDS,
  SALE_CASH_OUTFLOW_STAGE_ALLOCATION_FIELDS,
} from "@/lib/sale-audit-fields";

const LocationMapPicker = dynamic(() => import("@/components/LocationMapPicker"), {
  ssr: false,
});

/** Bump only when AI research output schema changes (not model name). */
const AI_CACHE_VERSION = "v1.0";

type Errors = Record<string, string>;

/** Pre–Phase-2 wizard defaults; treat as “not yet building-profiled” for Step 12 auto-fill. */
const SALE_LEGACY_WIZARD_STAGE_ALLOCATION: StageAllocation = {
  stage1Label: "M0 + Enabling",
  stage1Percent: 20,
  stage2Label: "Sub-Structure",
  stage2Percent: 30,
  stage3Label: "Super + Finishes",
  stage3Percent: 50,
  stage4Label: "",
  stage4Percent: 0,
};

function saleStageAllocEquals(a: StageAllocation, b: StageAllocation): boolean {
  return (
    a.stage1Label === b.stage1Label &&
    a.stage2Label === b.stage2Label &&
    a.stage3Label === b.stage3Label &&
    a.stage4Label === b.stage4Label &&
    a.stage1Percent === b.stage1Percent &&
    a.stage2Percent === b.stage2Percent &&
    a.stage3Percent === b.stage3Percent &&
    a.stage4Percent === b.stage4Percent
  );
}

/** Hover tooltip above children; avoids native `title` + `cursor-help` (? cursor) issues. */
function HoverTipAbove({ tip, children }: { tip: string; children: ReactNode }) {
  return (
    <div className="group relative w-full">
      {children}
      <div
        role="tooltip"
        className="pointer-events-none absolute bottom-full left-0 right-0 z-[100] mb-2 whitespace-pre-line rounded-lg border border-slate-600 bg-slate-900 px-3 py-2 text-left text-xs leading-relaxed text-slate-200 opacity-0 shadow-lg transition-opacity duration-150 group-hover:opacity-100 group-focus-within:opacity-100"
      >
        {tip}
      </div>
    </div>
  );
}

function HoverTipInline({
  tip,
  children,
  className = "",
}: {
  tip: string;
  children: ReactNode;
  className?: string;
}) {
  if (!tip.trim()) return <>{children}</>;
  return (
    <span className={`group relative inline-flex max-w-full items-center gap-1 ${className}`}>
      {children}
      <span
        role="tooltip"
        className="pointer-events-none invisible absolute bottom-full left-0 z-[100] mb-1 min-w-[12rem] max-w-[22rem] rounded-lg border border-slate-600 bg-slate-900 px-3 py-2 text-left text-xs leading-relaxed text-slate-200 opacity-0 shadow-lg transition-opacity duration-150 group-hover:visible group-hover:opacity-100 group-focus-within:visible group-focus-within:opacity-100 whitespace-pre-line"
      >
        {tip}
      </span>
    </span>
  );
}

const COUNTRIES = [
  { code: "AE", name: "United Arab Emirates", currency: "AED" as const, cities: ["Dubai", "Abu Dhabi", "Sharjah", "Ajman", "Ras Al Khaimah"] },
  { code: "SA", name: "Saudi Arabia", currency: "SAR" as const, cities: ["Riyadh", "Jeddah", "Dammam", "Makkah", "Madinah"] },
  { code: "MY", name: "Malaysia", currency: "MYR" as const, cities: ["Kuala Lumpur", "Penang", "Johor Bahru", "Kota Kinabalu"] },
  { code: "VN", name: "Vietnam", currency: "VND" as const, cities: ["Ho Chi Minh City", "Hanoi", "Da Nang"] },
  { code: "TH", name: "Thailand", currency: "THB" as const, cities: ["Bangkok", "Phuket", "Chiang Mai"] },
  { code: "AU", name: "Australia", currency: "AUD" as const, cities: ["Sydney", "Melbourne", "Brisbane"] },
] as const;

function getCurrencyName(code: string): string {
  const names: Record<string, string> = {
    AED: "UAE Dirham",
    SAR: "Saudi Riyal",
    MYR: "Malaysian Ringgit",
    VND: "Vietnamese Dong",
    THB: "Thai Baht",
    AUD: "Australian Dollar",
    USD: "US Dollar",
  };
  return names[code] || code;
}

/** Sale stream: Step 3 — development product sub-types (more specific than `buildingType`). */
const SALE_BUILDING_SUBTYPES: Array<{
  id: NonNullable<ProjectInfo["buildingSubType"]>;
  baseType: ProjectInfo["buildingType"];
  subType: string;
  examples: string;
  keyCharacteristics: string;
}> = [
  {
    id: "residential_landed",
    baseType: "residential",
    subType: "Residential - Landed",
    examples: "Terrace, Semi-D, Bungalow",
    keyCharacteristics: "Individual titles, GDV per unit, buyer financing",
  },
  {
    id: "residential_high_rise",
    baseType: "residential",
    subType: "Residential - High-Rise",
    examples: "Condo (high-end), Apartment (low-mid), Serviced Apartment",
    keyCharacteristics: "Strata titles, progressive payments, absorption curve",
  },
  {
    id: "commercial_landed",
    baseType: "retail",
    subType: "Commercial - Landed",
    examples: "Terrace shop-offices (G+4 max)",
    keyCharacteristics: "Ground floor retail + upper floor offices, mixed-use",
  },
  {
    id: "commercial_strata_office",
    baseType: "office",
    subType: "Commercial - Strata Office",
    examples: "Office building (G+4+) with strata titles",
    keyCharacteristics: "Individual office units for sale, investor buyers",
  },
];

function getBenchmarkSource(country: string, city: string): string {
  if (!country) return "Industry benchmarks";
  const c = country.toLowerCase();
  if (c.includes("emirates") || c.includes("uae") || c.includes("dubai") || c.includes("abu dhabi")) return "ADCB Project Database";
  if (c.includes("saudi") || c.includes("riyadh") || c.includes("jeddah")) return "SAMA / GCC Cost Indices";
  if (c.includes("kuwait") || c.includes("qatar") || c.includes("bahrain") || c.includes("oman")) return "GCC Cost Database";
  if (c.includes("kingdom") || c.includes("london")) return "RICS Cost Database";
  if (c.includes("malaysia") || c.includes("kuala")) return "JKR / Malaysia Cost Data";
  if (c.includes("vietnam") || c.includes("ho chi minh") || c.includes("hanoi")) return "Industry benchmarks";
  if (c.includes("thailand") || c.includes("bangkok")) return "Industry benchmarks";
  if (c.includes("australia") || c.includes("sydney") || c.includes("melbourne")) return "Industry benchmarks";
  if (c.includes("united states") || c.includes("new york")) return "RSMeans / US Benchmarks";
  return "Industry benchmarks";
}

const STREAM = "sale" as const;

const SALE_SUBTYPE_TO_AI_ASSET: Record<
  NonNullable<ProjectInfo["buildingSubType"]>,
  AiAssetType
> = {
  residential_landed: "sale-residential-landed",
  residential_high_rise: "sale-residential-highrise",
  commercial_landed: "sale-commercial-landed",
  commercial_strata_office: "sale-commercial-strata",
};

function CashOutflowsPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const streamPrefix = useStreamPrefix();
  const projectInfo = useSaleModelStore((s) => s.projectInfo);
  const cashOutflows = useSaleModelStore((s) => s.cashOutflows);
  const [isMapGeocoding, setIsMapGeocoding] = useState(false);
  const updateProjectInfoForStream = useSaleModelStore((s) => s.updateProjectInfo);
  const updateCashOutflowsForStream = useSaleModelStore((s) => s.updateCashOutflows);
  const updateCashInflowsForStream = useSaleModelStore((s) => s.updateCashInflows);
  const readSaleCashOutflows = useSaleModelStore((s) => s.readSaleCashOutflows);

  const [currentStep, setCurrentStep] = useState(0);
  const [errors, setErrors] = useState<Errors>({});
  const cashOutflowStepVisitLogged = useRef<Set<number>>(new Set());
  const hasResearchedForSalesRef = useRef<string | null>(null);
  const [isAiResearching, setIsAiResearching] = useState(false);

  const { performResearch } = useAiResearch();

  /** Avoid clobbering edits; `type="number"` + `Number(x) || 0` was persisting 0 mid-typing. */
  const constructionPeriodFocusedRef = useRef(false);
  const [constructionPeriodDraft, setConstructionPeriodDraft] = useState(() =>
    String(cashOutflows.constructionPeriod)
  );

  const isSaleLandedProduct = useMemo(
    () => Boolean(projectInfo.buildingSubType?.includes("landed")),
    [projectInfo.buildingSubType]
  );

  // High-Rise Auto-Calcs
  const salesHighRiseTotalFloors = useMemo(() => {
    return (
      (projectInfo.salesHighRiseBasements || 0) +
      (projectInfo.salesHighRisePodiums || 0) +
      (projectInfo.salesHighRiseGroundFloors || 0) +
      (projectInfo.salesHighRiseUpperFloors || 0)
    );
  }, [
    projectInfo.salesHighRiseBasements,
    projectInfo.salesHighRisePodiums,
    projectInfo.salesHighRiseGroundFloors,
    projectInfo.salesHighRiseUpperFloors,
  ]);

  const salesHighRiseSaleableBUA = useMemo(() => {
    const bua = projectInfo.salesHighRiseTotalBUA || 0;
    const ratio = projectInfo.salesHighRiseSaleableRatio || 0;
    return Math.round(bua * (ratio / 100));
  }, [projectInfo.salesHighRiseTotalBUA, projectInfo.salesHighRiseSaleableRatio]);

  // Landed Auto-Calcs
  const salesLandedTotalFloors = useMemo(() => {
    return 1 + (projectInfo.salesLandedUpperFloors || 0);
  }, [projectInfo.salesLandedUpperFloors]);

  const salesLandedTotalBUA = useMemo(() => {
    return (projectInfo.salesLandedNumUnits || 0) * (projectInfo.salesLandedBUAperUnit || 0);
  }, [projectInfo.salesLandedNumUnits, projectInfo.salesLandedBUAperUnit]);

  const salesLandedTotalSaleableBUA = useMemo(() => {
    const bua = salesLandedTotalBUA;
    const ratio = projectInfo.salesLandedSaleableRatio || 0;
    return Math.round(bua * (ratio / 100));
  }, [salesLandedTotalBUA, projectInfo.salesLandedSaleableRatio]);

  const salesLandedTotalSaleableLandArea = useMemo(() => {
    return (projectInfo.salesLandedNumUnits || 0) * (projectInfo.salesLandedLandAreaPerUnit || 0);
  }, [projectInfo.salesLandedNumUnits, projectInfo.salesLandedLandAreaPerUnit]);

  const salesLandedTotalLandArea = useMemo(() => {
    const saleableLand = salesLandedTotalSaleableLandArea;
    const commonPct = projectInfo.salesLandedCommonAreaPct || 0;
    if (commonPct >= 100) return 0;
    return Math.round(saleableLand / (1 - commonPct / 100));
  }, [salesLandedTotalSaleableLandArea, projectInfo.salesLandedCommonAreaPct]);

  // Sync High-Rise Step 5 BUA data to Cash Outflows state when entering Step 6
  useEffect(() => {
    if (!isSaleLandedProduct && currentStep === 5) {
      const updates: Partial<CashOutflows> = {};
      if (projectInfo.salesHighRiseTotalBUA) {
        updates.buildingBUA = projectInfo.salesHighRiseTotalBUA;
      }
      if (projectInfo.salesHighRiseBasementBUA) {
        updates.basementBUA = projectInfo.salesHighRiseBasementBUA;
      }
      if (projectInfo.salesHighRisePodiumBUA) {
        updates.parkingBUA = projectInfo.salesHighRisePodiumBUA;
      }

      if (Object.keys(updates).length > 0) {
        updateCashOutflowsForStream(updates);
        console.log("🔗 Synced High-Rise Step 5 BUA to Cash Outflows:", updates);
      }
    }
  }, [
    isSaleLandedProduct,
    currentStep,
    projectInfo.salesHighRiseTotalBUA,
    projectInfo.salesHighRiseBasementBUA,
    projectInfo.salesHighRisePodiumBUA,
    updateCashOutflowsForStream,
  ]);

  // Sync Landed Step 5 BUA data to Cash Outflows state when entering Step 6
  useEffect(() => {
    if (isSaleLandedProduct && currentStep === 5) {
      const updates: Partial<CashOutflows> = {
        basementBUA: 0,
        parkingBUA: 0,
      };
      if (salesLandedTotalBUA) {
        updates.buildingBUA = salesLandedTotalBUA;
      }

      updateCashOutflowsForStream(updates);
      console.log("🔗 Synced Landed Step 5 BUA to Cash Outflows:", updates);
    }
  }, [
    isSaleLandedProduct,
    currentStep,
    salesLandedTotalBUA,
    updateCashOutflowsForStream,
  ]);

  // Sync High-Rise Step 5 Land Area to Cash Outflows state when entering Step 9
  useEffect(() => {
    if (!isSaleLandedProduct && currentStep === 8) {
      if (projectInfo.salesHighRiseLandArea) {
        updateCashOutflowsForStream({ landArea: projectInfo.salesHighRiseLandArea });
        console.log(
          "🔗 Synced High-Rise Step 5 Land Area to Cash Outflows:",
          projectInfo.salesHighRiseLandArea
        );
      }
    }
  }, [
    isSaleLandedProduct,
    currentStep,
    projectInfo.salesHighRiseLandArea,
    updateCashOutflowsForStream,
  ]);

  // Sync Landed Step 5 Total Land Area to Cash Outflows state when entering Step 9
  useEffect(() => {
    if (isSaleLandedProduct && currentStep === 8) {
      if (salesLandedTotalLandArea) {
        updateCashOutflowsForStream({ landArea: salesLandedTotalLandArea });
        console.log(
          "🔗 Synced Landed Step 5 Total Land Area to Cash Outflows:",
          salesLandedTotalLandArea
        );
      }
    }
  }, [
    isSaleLandedProduct,
    currentStep,
    salesLandedTotalLandArea,
    updateCashOutflowsForStream,
  ]);

  // Sales AI Research Trigger (Step 6 — currentStep 5)
  useEffect(() => {
    if (currentStep !== 5) return;
    if (!projectInfo.country || !projectInfo.city) return;
    if (!projectInfo.buildingSubType) return;

    const saleAiAssetType = SALE_SUBTYPE_TO_AI_ASSET[projectInfo.buildingSubType];
    if (!saleAiAssetType) return;

    // SAFEGUARD: Do not trigger AI if map is still geocoding
    if (projectInfo.coordinates && !projectInfo.subMarket) {
      console.log(
        "⏳ Sales AI Research paused: Waiting for map neighborhood lookup..."
      );
      return;
    }

    // Create the unique fingerprint with version prefix
    const researchKey = `${AI_CACHE_VERSION}:${projectInfo.country}-${projectInfo.city}-${projectInfo.subMarket || "general"}-${projectInfo.buildingSubType}-${projectInfo.salesMarketPositioning || "unspecified"}-${projectInfo.salesFinishingStandard || "unspecified"}-${
      isSaleLandedProduct
        ? `${projectInfo.salesLandedNumUnits}-${projectInfo.salesLandedBUAperUnit}-${salesLandedTotalLandArea}-${projectInfo.salesLandedSaleableRatio}`
        : `${projectInfo.salesHighRiseTotalBUA}-${projectInfo.salesHighRiseBasementBUA}-${projectInfo.salesHighRiseLandArea}-${projectInfo.salesHighRiseSaleableRatio}`
    }`;

    const savedFingerprint = cashOutflows?.aiResearchData?._researchKey;

    // 1. Perfect Match: Skip research
    if (savedFingerprint === researchKey) {
      console.log(
        "✅ Sales AI Research skipped: Parameters match saved fingerprint."
      );
      return;
    }

    // 2. Legacy Project Handler: AI data exists but fingerprint doesn't match
    if (cashOutflows?.aiResearchData && savedFingerprint !== researchKey) {
      const savedVersion = savedFingerprint?.split(":")[0] || "v0.0";
      const currentVersion = AI_CACHE_VERSION;

      if (savedVersion === currentVersion) {
        console.log("✅ Same cache version, updating fingerprint silently...");
        const dataWithFingerprint = {
          ...cashOutflows.aiResearchData,
          _researchKey: researchKey,
        };
        updateCashOutflowsForStream({ aiResearchData: dataWithFingerprint });
        return;
      }

      console.log(
        `⚠️ Cache version changed from ${savedVersion} to ${currentVersion}. Checking if regeneration needed...`
      );
      // For now, just update the fingerprint and keep old data
      // Only regenerate if user explicitly changes parameters
      const dataWithFingerprint = {
        ...cashOutflows.aiResearchData,
        _researchKey: researchKey,
      };
      updateCashOutflowsForStream({ aiResearchData: dataWithFingerprint });
      return;
    }

    const researchParams = {
      assetType: saleAiAssetType,
      location: {
        country: projectInfo.country,
        city: projectInfo.city,
        currency: projectInfo.currency,
        subMarket: projectInfo.subMarket,
        coordinates: projectInfo.coordinates,
      },
      buildingConfig: isSaleLandedProduct
        ? {
            numUnits: projectInfo.salesLandedNumUnits,
            buaPerUnit: projectInfo.salesLandedBUAperUnit,
            landAreaPerUnit: projectInfo.salesLandedLandAreaPerUnit,
            commonAreaPct: projectInfo.salesLandedCommonAreaPct,
            totalLandArea: salesLandedTotalLandArea,
            totalBUA: salesLandedTotalBUA,
            positioning: projectInfo.salesMarketPositioning,
            furnishingLevel: projectInfo.salesFinishingStandard,
          }
        : {
            basements: projectInfo.salesHighRiseBasements,
            podiums: projectInfo.salesHighRisePodiums,
            upperFloors: projectInfo.salesHighRiseUpperFloors,
            totalBUA: projectInfo.salesHighRiseTotalBUA,
            basementBUA: projectInfo.salesHighRiseBasementBUA,
            podiumBUA: projectInfo.salesHighRisePodiumBUA,
            landArea: projectInfo.salesHighRiseLandArea,
            positioning: projectInfo.salesMarketPositioning,
            furnishingLevel: projectInfo.salesFinishingStandard,
          },
    };

    const triggerResearch = async () => {
      try {
        setIsAiResearching(true);
        console.log("🤖 Triggering Sales AI research...");
        console.log("📍 Location & Building Payload:", researchParams);
        const rawAiData = await performResearch(researchParams);
        if (rawAiData) {
          const researchData = rawAiData as unknown as AiResearchData;
          console.log(
            "🤖 Sales AI Research Data:",
            JSON.stringify(researchData, null, 2)
          );
          const dataWithFingerprint = {
            ...researchData,
            _researchKey: researchKey,
          };
          const c1 = researchData.c1_development;
          const rates = c1?.construction_rates;
          const soft = c1?.soft_costs;
          const patch: Partial<CashOutflows> = {
            aiResearchData: dataWithFingerprint,
          };
          if (rates?.building_rate_psf) patch.buildingRate = rates.building_rate_psf;
          if (rates?.parking_rate_psf) patch.parkingRate = rates.parking_rate_psf;
          if (rates?.basement_rate_psf) patch.basementRate = rates.basement_rate_psf;
          if (isSaleLandedProduct && rates?.infrastructure_rate_psf) {
            patch.infrastructureRate = rates.infrastructure_rate_psf;
          }
          if (soft?.sc_percentage != null)
            patch.softCostPercent = soft.sc_percentage;
          if (soft?.powc_percentage != null)
            patch.powcPercent = soft.powc_percentage;
          if (c1?.land_rate_psf) patch.landRate = c1.land_rate_psf;
          if (c1?.construction_period?.months) {
            patch.constructionPeriod = c1.construction_period.months;
          }
          if (c1?.s_curve) {
            patch.stageAllocation = {
              stage1Label:
                cashOutflows.stageAllocation.stage1Label || "Enabling",
              stage1Percent: c1.s_curve.stage_1_pct || 10,
              stage2Label:
                cashOutflows.stageAllocation.stage2Label || "Sub-Structure",
              stage2Percent: c1.s_curve.stage_2_pct || 20,
              stage3Label:
                cashOutflows.stageAllocation.stage3Label || "Super Structure",
              stage3Percent: c1.s_curve.stage_3_pct || 40,
              stage4Label:
                cashOutflows.stageAllocation.stage4Label || "Finishes",
              stage4Percent: c1.s_curve.stage_4_pct || 30,
            };
          }
          if (c1?.powc_breakdown) {
            patch.powcAllocation = {
              siteEstablishment: c1.powc_breakdown.site_establishment_pct,
              overhead: c1.powc_breakdown.overhead_pct,
              authorityFees: c1.powc_breakdown.authority_fees_pct,
            };
          }
          if (c1?.sc_breakdown) {
            patch.softCostAllocation = {
              architect: c1.sc_breakdown.architect_pct,
              projectManagement: c1.sc_breakdown.pm_pct,
              engineering: c1.sc_breakdown.engineering_pct,
              geotechnical: c1.sc_breakdown.geotech_pct,
              otherFees: c1.sc_breakdown.other_pct,
            };
          }
          updateCashOutflowsForStream(patch);
          const c2 = researchData.c2_sales;
          if (c2?.avg_sales_price_psf || c2?.deductions) {
            const existingInflows =
              useFinModelStore.getState().sale.cashInflows;
            updateCashInflowsForStream({
              ...(c2.avg_sales_price_psf
                ? { salesPrice: c2.avg_sales_price_psf }
                : {}),
              ...(c2.deductions
                ? {
                    buyerMix: {
                      ...existingInflows.buyerMix,
                      ...(c2.deductions.agent_commission_pct != null
                        ? {
                            brokerCommissionPercent:
                              c2.deductions.agent_commission_pct,
                          }
                        : {}),
                      ...(c2.deductions.vat_pct != null
                        ? { vatPercent: c2.deductions.vat_pct }
                        : {}),
                      ...(c2.deductions.escrow_fees_pct != null
                        ? { escrowFeePercent: c2.deductions.escrow_fees_pct }
                        : {}),
                      ...(c2.deductions.avg_sales_discount_pct != null
                        ? {
                            salesDiscountPercent:
                              c2.deductions.avg_sales_discount_pct,
                          }
                        : {}),
                    },
                  }
                : {}),
            });
          }
          console.log(
            "📊 Auto-populated fields from Sales AI research:",
            patch
          );
          hasResearchedForSalesRef.current = researchKey;
        }
      } catch (error) {
        console.error("❌ Sales AI research failed:", error);
      } finally {
        setIsAiResearching(false);
      }
    };
    void triggerResearch();
  }, [
    currentStep,
    isSaleLandedProduct,
    projectInfo.country,
    projectInfo.city,
    projectInfo.subMarket,
    projectInfo.coordinates,
    projectInfo.currency,
    projectInfo.buildingSubType,
    projectInfo.salesMarketPositioning,
    projectInfo.salesFinishingStandard,
    projectInfo.salesHighRiseBasements,
    projectInfo.salesHighRisePodiums,
    projectInfo.salesHighRiseUpperFloors,
    projectInfo.salesHighRiseTotalBUA,
    projectInfo.salesHighRiseBasementBUA,
    projectInfo.salesHighRisePodiumBUA,
    projectInfo.salesHighRiseLandArea,
    projectInfo.salesHighRiseSaleableRatio,
    projectInfo.salesLandedNumUnits,
    projectInfo.salesLandedBUAperUnit,
    projectInfo.salesLandedLandAreaPerUnit,
    projectInfo.salesLandedCommonAreaPct,
    projectInfo.salesLandedSaleableRatio,
    salesLandedTotalLandArea,
    salesLandedTotalBUA,
    cashOutflows?.aiResearchData,
    performResearch,
    updateCashOutflowsForStream,
    updateCashInflowsForStream,
  ]);

  const totalSteps = 13; // 0-12

  useEffect(() => {
    console.log("💰 [Sale C1] Cash Outflows Component Mounted");
  }, []);

  useEffect(() => {
    console.log("🔍 [Sale C1] Store Isolation Check:", {
      hasSaleStore: typeof useSaleModelStore !== "undefined",
      cashOutflowsLoaded: !!cashOutflows,
      streamPrefix: STREAM,
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps -- mount-only isolation log
  }, []);

  /** Persist sale stream + business model for financing engine hard routing. */
  useEffect(() => {
    const sub = (projectInfo.buildingSubType ?? "").toLowerCase();
    const isCommercialProduct =
      sub.startsWith("commercial_") || sub.includes("commercial");
    updateProjectInfoForStream({
      stream: "sale",
      businessModel: "DEV_FOR_SALE",
      projectType: isCommercialProduct ? "COMMERCIAL" : "RESIDENTIAL",
    });
  }, [
    projectInfo.buildingSubType,
    updateProjectInfoForStream,
  ]);

  useEffect(() => {
    if (constructionPeriodFocusedRef.current) return;
    setConstructionPeriodDraft(String(cashOutflows.constructionPeriod));
  }, [cashOutflows.constructionPeriod]);

  useEffect(() => {
    const raw = searchParams?.get("step");
    if (!raw) return;

    const parsed = Number(raw);
    if (!Number.isFinite(parsed)) return;

    // If user navigated here from "Back" in Component 2 (Cash Inflows),
    // it may deep-link to the last Step (step=13). For UX, force them
    // back to the preview screen instead. When the user intentionally
    // deep-links (e.g. from `/preview/cash-outflows`), we should not
    // override that navigation.
    if (parsed === totalSteps) {
      const ref = typeof document !== "undefined" ? document.referrer || "" : "";
      if (ref.includes("/cash-inflows")) {
        const p = getStreamPrefix(
          typeof window !== "undefined" ? window.location.pathname : ""
        );
        router.replace(withStreamPrefix(p, "/preview/cash-outflows"));
        return;
      }
    }

    // UI shows "Step 1..13"; internal state is 0..12
    const desired = Math.min(totalSteps - 1, Math.max(0, Math.round(parsed) - 1));
    setCurrentStep(desired);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Log current values on first visit to each audited wizard step
  useEffect(() => {
    const uiStep = currentStep + 1;

    if (uiStep === 1 && !cashOutflowStepVisitLogged.current.has(1)) {
      cashOutflowStepVisitLogged.current.add(1);
      if (projectInfo.country) {
        logSaleCashOutflow("country", projectInfo.country, 1);
      }
      if (projectInfo.city) {
        logSaleCashOutflow("city", projectInfo.city, 1);
      }
    }

    if (uiStep === 2 && !cashOutflowStepVisitLogged.current.has(2)) {
      cashOutflowStepVisitLogged.current.add(2);
      if (projectInfo.currency) {
        logSaleCashOutflow("currency", projectInfo.currency, 2);
      }
    }

    if (uiStep === 3 && !cashOutflowStepVisitLogged.current.has(3)) {
      cashOutflowStepVisitLogged.current.add(3);
      if (projectInfo.buildingSubType) {
        logSaleCashOutflow("buildingSubType", projectInfo.buildingSubType, 3);
      }
    }

    if (uiStep === 4 && !cashOutflowStepVisitLogged.current.has(4)) {
      cashOutflowStepVisitLogged.current.add(4);
      if (projectInfo.salesMarketPositioning) {
        logSaleCashOutflow(
          "salesMarketPositioning",
          projectInfo.salesMarketPositioning,
          4
        );
      }
      if (projectInfo.salesFinishingStandard) {
        logSaleCashOutflow(
          "salesFinishingStandard",
          projectInfo.salesFinishingStandard,
          4
        );
      }
    }

    if (uiStep === 5 && !cashOutflowStepVisitLogged.current.has(5)) {
      cashOutflowStepVisitLogged.current.add(5);
      logSaleCashOutflow("basements", projectInfo.buildingConfig.basements ?? 0, 5);
      logSaleCashOutflow(
        "podiumFloors",
        projectInfo.buildingConfig.podiumFloors ?? 0,
        5
      );
      logSaleCashOutflow(
        "towerFloors",
        projectInfo.buildingConfig.towerFloors ?? 0,
        5
      );
      logSaleCashOutflow(
        "landedUnits",
        projectInfo.buildingConfig.landedUnits ?? 0,
        5
      );
      logSaleCashOutflow(
        "landedLandAreaPerUnit",
        projectInfo.buildingConfig.landedLandAreaPerUnit ?? 0,
        5
      );
      logSaleCashOutflow(
        "landedBUAPerUnit",
        projectInfo.buildingConfig.landedBUAPerUnit ?? 0,
        5
      );
    }

    if (uiStep === 6 && !cashOutflowStepVisitLogged.current.has(6)) {
      cashOutflowStepVisitLogged.current.add(6);
      logSaleCashOutflow("buildingBUA", cashOutflows.buildingBUA, 6);
      logSaleCashOutflow("buildingRate", cashOutflows.buildingRate, 6);
      logSaleCashOutflow("parkingBUA", cashOutflows.parkingBUA, 6);
      logSaleCashOutflow("parkingRate", cashOutflows.parkingRate, 6);
      logSaleCashOutflow("basementBUA", cashOutflows.basementBUA, 6);
      logSaleCashOutflow("basementRate", cashOutflows.basementRate, 6);
      logSaleCashOutflow(
        "infrastructureRate",
        cashOutflows.infrastructureRate ?? 0,
        6
      );
    }

    if (uiStep === 7 && !cashOutflowStepVisitLogged.current.has(7)) {
      cashOutflowStepVisitLogged.current.add(7);
      logSaleCashOutflow(
        "contingencyPercent",
        cashOutflows.contingencyPercent,
        7
      );
    }

    if (uiStep === 8 && !cashOutflowStepVisitLogged.current.has(8)) {
      cashOutflowStepVisitLogged.current.add(8);
      logSaleCashOutflow("softCostPercent", cashOutflows.softCostPercent, 8);
      logSaleCashOutflow("powcPercent", cashOutflows.powcPercent, 8);
    }

    if (uiStep === 9 && !cashOutflowStepVisitLogged.current.has(9)) {
      cashOutflowStepVisitLogged.current.add(9);
      logSaleCashOutflow("landArea", cashOutflows.landArea, 9);
      logSaleCashOutflow("landRate", cashOutflows.landRate, 9);
    }

    if (uiStep === 11) {
      const months = cashOutflows.constructionPeriod;
      if (months >= 6 && months <= 84) {
        if (!cashOutflowStepVisitLogged.current.has(11)) {
          cashOutflowStepVisitLogged.current.add(11);
          logSaleCashOutflow("constructionPeriod", months, 11);
        }
      }
    }
  }, [
    currentStep,
    cashOutflows.basementBUA,
    cashOutflows.basementRate,
    cashOutflows.buildingBUA,
    cashOutflows.buildingRate,
    cashOutflows.contingencyPercent,
    cashOutflows.constructionPeriod,
    cashOutflows.infrastructureRate,
    cashOutflows.landArea,
    cashOutflows.landRate,
    cashOutflows.parkingBUA,
    cashOutflows.parkingRate,
    cashOutflows.powcPercent,
    cashOutflows.softCostPercent,
    projectInfo.buildingConfig.basements,
    projectInfo.buildingConfig.hasRetailComponent,
    projectInfo.buildingConfig.landedBUAPerUnit,
    projectInfo.buildingConfig.landedLandAreaPerUnit,
    projectInfo.buildingConfig.landedUnits,
    projectInfo.buildingConfig.podiumFloors,
    projectInfo.buildingConfig.retailPercentage,
    projectInfo.buildingConfig.towerFloors,
    projectInfo.buildingSubType,
    projectInfo.city,
    projectInfo.country,
    projectInfo.currency,
    projectInfo.salesFinishingStandard,
    projectInfo.salesMarketPositioning,
  ]);

  // Auto-zero basement rate when basement BUA is 0
  useEffect(() => {
    const basementBua = isSaleLandedProduct
      ? 0 // Landed products don't have basements
      : projectInfo.salesHighRiseBasementBUA || 0;

    if (basementBua === 0 && cashOutflows.basementRate !== 0) {
      updateCashOutflowsForStream({ basementRate: 0 });
      console.log("🔧 [Sale] Auto-zeroed basement rate (BUA is 0)");
    }
  }, [
    isSaleLandedProduct,
    projectInfo.salesHighRiseBasementBUA,
    cashOutflows.basementRate,
    updateCashOutflowsForStream,
  ]);

  // Auto-zero parking rate when parking BUA is 0
  useEffect(() => {
    const parkingBua = isSaleLandedProduct
      ? 0 // Landed products don't have parking podiums
      : projectInfo.salesHighRisePodiumBUA || 0;

    if (parkingBua === 0 && cashOutflows.parkingRate !== 0) {
      updateCashOutflowsForStream({ parkingRate: 0 });
      console.log("🔧 [Sale] Auto-zeroed parking rate (BUA is 0)");
    }
  }, [
    isSaleLandedProduct,
    projectInfo.salesHighRisePodiumBUA,
    cashOutflows.parkingRate,
    updateCashOutflowsForStream,
  ]);

  const updateFormData = (field: string, value: unknown) => {
    const projectFields = new Set([
      "country",
      "city",
      "currency",
      "buildingType",
      "basements",
      "podiumFloors",
      "towerFloors",
      "hasRetailComponent",
      "retailPercentage",
      "hotelOperatingType",
      "hotelStarRating",
    ]);
    if (projectFields.has(field)) {
      if (
        field === "country" ||
        field === "city" ||
        field === "currency" ||
        field === "buildingType" ||
        field === "hotelOperatingType" ||
        field === "hotelStarRating"
      ) {
        updateProjectInfoForStream({ [field]: value });
      } else {
        updateProjectInfoForStream({
          buildingConfig: { ...projectInfo.buildingConfig, [field]: value },
        });
      }
    } else {
      if (
        field === "stage1Label" ||
        field === "stage1Percent" ||
        field === "stage2Label" ||
        field === "stage2Percent" ||
        field === "stage3Label" ||
        field === "stage3Percent" ||
        field === "stage4Label" ||
        field === "stage4Percent"
      ) {
        updateCashOutflowsForStream({
          stageAllocation: { ...cashOutflows.stageAllocation, [field]: value },
        });
      } else {
        updateCashOutflowsForStream({ [field]: value });
      }
    }

    if (
      !SALE_CASH_OUTFLOW_STAGE_ALLOCATION_FIELDS.has(field) &&
      field in SALE_CASH_OUTFLOW_AUDIT_FIELDS &&
      (typeof value === "string" ||
        typeof value === "number" ||
        typeof value === "boolean")
    ) {
      logSaleCashOutflow(field, value);
    }
  };

  const logConstructionPeriodMonths = useCallback((months: number) => {
    if (!Number.isFinite(months) || months < 6 || months > 84) return;
    logSaleCashOutflow("constructionPeriod", months, 11);
  }, []);

  // Derived calculations (from store state)
  const buildingCost = cashOutflows.buildingBUA * cashOutflows.buildingRate;
  const parkingCost = cashOutflows.parkingBUA * cashOutflows.parkingRate;
  const basementCost = cashOutflows.basementBUA * cashOutflows.basementRate;

  const infrastructureRate = cashOutflows.infrastructureRate ?? 0;
  const infrastructureCosts =
    streamPrefix === "/sale" && isSaleLandedProduct
      ? infrastructureRate * salesLandedTotalLandArea
      : 0;

  // Base construction cost (CC before contingency) — not the same as store `constructionCost`
  // after “Generate”, which is CC including contingency.
  const baseCC = buildingCost + parkingCost + basementCost + infrastructureCosts;
  const contingencyAmount =
    baseCC * (cashOutflows.contingencyPercent / 100);
  const ccWithContingency = baseCC + contingencyAmount; // CC incl. contingency (CC%)

  // SC and POWC % inputs apply to CC including contingency (CC%), not base CC alone.
  const softCosts =
    ccWithContingency * (cashOutflows.softCostPercent / 100);
  const powc =
    ccWithContingency * (cashOutflows.powcPercent / 100);

  const developmentCost = ccWithContingency + softCosts + powc; // DC (no FFE in Sale stream)
  const landCost = cashOutflows.landArea * cashOutflows.landRate; // LC
  const totalDevelopmentCost = developmentCost + landCost; // TDC

  const landToTdcRatio =
    totalDevelopmentCost > 0 ? (landCost / totalDevelopmentCost) * 100 : 0;
  const dcToTdcRatio =
    totalDevelopmentCost > 0 ? (developmentCost / totalDevelopmentCost) * 100 : 0;

  // --- STEP 6 (currentStep 5): RECOMMENDATION ENGINE — construction rates ---

  const saleRecommendations = useMemo(() => {
    const params = buildRecommendationQuery(
      projectInfo.countryCode,
      projectInfo.buildingSubType,
      projectInfo.buildingConfig.towerFloors
    );
    if (!params) return null;

    const bt = params.buildingTypeDB as SaleRecommendationBuildingType;
    const floorsForLookup =
      bt === "residential-hi-rise" || bt === "commercial-strata-office"
        ? projectInfo.buildingConfig.towerFloors
        : undefined;

    return getRecommendations(params.countryCode, bt, floorsForLookup);
  }, [
    projectInfo.countryCode,
    projectInfo.buildingSubType,
    projectInfo.buildingConfig.towerFloors,
  ]);

  // --- STEP 5 LOGIC (reconnect DB by profile) ---
  const step6Recommendations = useMemo(() => {
    const params = buildRecommendationQuery(
      projectInfo.countryCode,
      projectInfo.buildingSubType,
      projectInfo.buildingConfig.towerFloors
    );

    console.log("🔍 [Step 6 Debug] Query Params:", params);
    if (!params) return null;

    const bt = params.buildingTypeDB as SaleRecommendationBuildingType;
    const floorsForLookup =
      bt === "residential-hi-rise" || bt === "commercial-strata-office"
        ? projectInfo.buildingConfig.towerFloors
        : undefined;

    const recs = getRecommendations(params.countryCode, bt, floorsForLookup);
    console.log("🔍 [Step 6 Debug] Recommendations:", recs);
    return recs;
  }, [
    projectInfo.countryCode,
    projectInfo.buildingSubType,
    projectInfo.buildingConfig.towerFloors,
  ]);

  const lastAppliedStep6RatesRef = useRef<{
    buildingRate: number;
    parkingRate: number;
    basementRate: number;
    infrastructureRate: number;
  } | null>(null);

  const aiDataRaw = cashOutflows.aiResearchData;
  const aiData = useMemo(() => {
    if (!aiDataRaw) return undefined;
    if (
      aiDataRaw.c1_development &&
      !(aiDataRaw.c1_development as { construction_rates?: unknown }).construction_rates
    ) {
      return normalizeAiResearchData(aiDataRaw) as unknown as AiResearchData;
    }
    return aiDataRaw;
  }, [aiDataRaw]);
  const aiC1 = aiData?.c1_development;
  const aiRates = aiC1?.construction_rates;

  const aiBuildingRate = aiRates?.building_rate_psf;
  const aiParkingRate = aiRates?.parking_rate_psf;
  const aiBasementRate = aiRates?.basement_rate_psf;
  const aiInfraRate = aiRates?.infrastructure_rate_psf;
  const aiLandRate = aiC1?.land_rate_psf;
  const aiScPct = aiC1?.soft_costs?.sc_percentage;
  const aiPowcPct = aiC1?.soft_costs?.powc_percentage;
  const aiScurve = aiC1?.s_curve;
  const aiPowcBreakdown = aiC1?.powc_breakdown;
  const aiScBreakdown = aiC1?.sc_breakdown;

  const mvpBuildingRate = step6Recommendations?.constructionCosts.buildingRate;
  const mvpParkingRate = step6Recommendations?.constructionCosts.parkingRate;
  const mvpBasementRate = step6Recommendations?.constructionCosts.basementRate;
  const mvpInfraRate = step6Recommendations?.constructionCosts.infrastructureRate ?? 0;
  const mvpScPct = saleRecommendations?.softCosts.scPercent;
  const mvpPowcPct = saleRecommendations?.softCosts.powcPercent;
  const mvpStage1 = saleRecommendations?.constructionStages?.allocation.stage1Percent;
  const mvpStage2 = saleRecommendations?.constructionStages?.allocation.stage2Percent;
  const mvpStage3 = saleRecommendations?.constructionStages?.allocation.stage3Percent;
  const mvpStage4 = saleRecommendations?.constructionStages?.allocation.stage4Percent;

  const benchBuildingRate = aiBuildingRate ?? mvpBuildingRate;
  const benchParkingRate = aiParkingRate ?? mvpParkingRate;
  const benchBasementRate = aiBasementRate ?? mvpBasementRate;
  const benchInfraRate = aiInfraRate ?? mvpInfraRate;
  const benchScPct = aiScPct ?? mvpScPct;
  const benchPowcPct = aiPowcPct ?? mvpPowcPct;
  const benchStage1 = aiScurve?.stage_1_pct ?? mvpStage1;
  const benchStage2 = aiScurve?.stage_2_pct ?? mvpStage2;
  const benchStage3 = aiScurve?.stage_3_pct ?? mvpStage3;
  const benchStage4 = aiScurve?.stage_4_pct ?? mvpStage4;

  const isRateOverride = (current: number, bench?: number) =>
    bench != null && Math.abs(current - bench) > 0.001;

  useEffect(() => {
    if (currentStep !== 5 || !step6Recommendations?.constructionCosts) return;
    if (aiRates?.building_rate_psf) return;

    const rates = step6Recommendations.constructionCosts;
    const updates: Partial<CashOutflows> = {};
    const prev = lastAppliedStep6RatesRef.current;

    const shouldUpdateIfNotManual = (
      currentValue: number | null | undefined,
      prevRecommended: number | undefined,
      nextRecommended: number
    ) => {
      const cur = currentValue ?? 0;
      if (cur === 0) return true;
      if (prevRecommended === undefined) return false;
      return cur === prevRecommended;
    };

    if (
      shouldUpdateIfNotManual(
        cashOutflows.buildingRate,
        prev?.buildingRate,
        rates.buildingRate
      )
    ) {
      updates.buildingRate = rates.buildingRate;
    }
    if (
      shouldUpdateIfNotManual(
        cashOutflows.parkingRate,
        prev?.parkingRate,
        rates.parkingRate
      )
    ) {
      updates.parkingRate = rates.parkingRate;
    }
    if (
      shouldUpdateIfNotManual(
        cashOutflows.basementRate,
        prev?.basementRate,
        rates.basementRate
      )
    ) {
      updates.basementRate = rates.basementRate;
    }
    if (
      projectInfo.buildingSubType?.includes("landed") &&
      shouldUpdateIfNotManual(
        cashOutflows.infrastructureRate,
        prev?.infrastructureRate,
        rates.infrastructureRate
      )
    ) {
      updates.infrastructureRate = rates.infrastructureRate;
    }

    if (Object.keys(updates).length > 0) {
      updateCashOutflowsForStream(updates);
    }

    lastAppliedStep6RatesRef.current = {
      buildingRate: rates.buildingRate,
      parkingRate: rates.parkingRate,
      basementRate: rates.basementRate,
      infrastructureRate: rates.infrastructureRate,
    };
  }, [
    currentStep,
    step6Recommendations,
    cashOutflows.buildingRate,
    cashOutflows.parkingRate,
    cashOutflows.basementRate,
    cashOutflows.infrastructureRate,
    projectInfo.buildingSubType,
    updateCashOutflowsForStream,
  ]);

  const isBuildingManual = isRateOverride(cashOutflows.buildingRate, benchBuildingRate);
  const isParkingManual = isRateOverride(cashOutflows.parkingRate, benchParkingRate);
  const isBasementManual = isRateOverride(cashOutflows.basementRate, benchBasementRate);
  const isInfraManual = isRateOverride(cashOutflows.infrastructureRate ?? 0, benchInfraRate);

  const isAnyRateManual =
    isBuildingManual || isParkingManual || isBasementManual || isInfraManual;

  const isStep6Manual = isAnyRateManual;

  const resetStep6ToBenchmark = () => {
    updateCashOutflowsForStream({
      ...(benchBuildingRate != null ? { buildingRate: benchBuildingRate } : {}),
      ...(benchParkingRate != null ? { parkingRate: benchParkingRate } : {}),
      ...(benchBasementRate != null ? { basementRate: benchBasementRate } : {}),
      ...(benchInfraRate != null ? { infrastructureRate: benchInfraRate } : {}),
    });
  };

  const getPrettySubTypeName = () => {
    const sub = projectInfo.buildingSubType;
    const found = SALE_BUILDING_SUBTYPES.find((s) => s.id === sub);
    return found ? found.subType : sub || "—";
  };

  // --- STEP 7 (currentStep 6): RECOMMENDATION ENGINE — SC & POWC ---

  useEffect(() => {
    if (currentStep !== 7 || !saleRecommendations?.softCosts) return;
    if (aiScPct != null || aiPowcPct != null) return;

    const rates = saleRecommendations.softCosts;
    const updates: Partial<CashOutflows> = {};

    if (!cashOutflows.softCostPercent)
      updates.softCostPercent = rates.scPercent;
    if (!cashOutflows.powcPercent) updates.powcPercent = rates.powcPercent;

    if (Object.keys(updates).length > 0) {
      updateCashOutflowsForStream(updates);
    }
  }, [
    currentStep,
    saleRecommendations,
    cashOutflows.softCostPercent,
    cashOutflows.powcPercent,
    updateCashOutflowsForStream,
  ]);

  const isSCManual = isRateOverride(cashOutflows.softCostPercent, benchScPct);
  const isPOWCManual = isRateOverride(cashOutflows.powcPercent, benchPowcPct);
  const isAnySCPOWCManual = isSCManual || isPOWCManual;

  const resetScPowcToBenchmark = () => {
    updateCashOutflowsForStream({
      ...(benchScPct != null ? { softCostPercent: benchScPct } : {}),
      ...(benchPowcPct != null ? { powcPercent: benchPowcPct } : {}),
    });
  };

  // --- STEP 11 (currentStep 10): CONSTRUCTION STAGES — profile benchmarks ---

  useEffect(() => {
    if (currentStep !== 11 || !saleRecommendations?.constructionStages) return;
    if (aiScurve?.stage_1_pct != null) return;

    const stages = saleRecommendations.constructionStages;
    const curr = cashOutflows.stageAllocation;
    const stagePatches: Partial<StageAllocation> = {};

    const totalCurrent =
      (curr.stage1Percent || 0) +
      (curr.stage2Percent || 0) +
      (curr.stage3Percent || 0) +
      (curr.stage4Percent || 0);

    const stillLegacyWizard = saleStageAllocEquals(
      curr,
      SALE_LEGACY_WIZARD_STAGE_ALLOCATION
    );

    if (!curr.stage1Label?.trim())
      stagePatches.stage1Label = stages.labels.stage1;
    if (!curr.stage2Label?.trim())
      stagePatches.stage2Label = stages.labels.stage2;
    if (!curr.stage3Label?.trim())
      stagePatches.stage3Label = stages.labels.stage3;
    if (!curr.stage4Label?.trim())
      stagePatches.stage4Label = stages.labels.stage4 ?? "Finishes";

    if (totalCurrent === 0 || stillLegacyWizard) {
      stagePatches.stage1Percent = stages.allocation.stage1Percent;
      stagePatches.stage2Percent = stages.allocation.stage2Percent;
      stagePatches.stage3Percent = stages.allocation.stage3Percent;
      stagePatches.stage4Percent = stages.allocation.stage4Percent;
      if (stillLegacyWizard || totalCurrent === 0) {
        stagePatches.stage1Label = stages.labels.stage1;
        stagePatches.stage2Label = stages.labels.stage2;
        stagePatches.stage3Label = stages.labels.stage3;
        stagePatches.stage4Label = stages.labels.stage4 ?? "Finishes";
      }
    }

    if (Object.keys(stagePatches).length > 0) {
      updateCashOutflowsForStream({
        stageAllocation: { ...curr, ...stagePatches },
      });
    }
  }, [
    currentStep,
    saleRecommendations,
    cashOutflows.stageAllocation,
    updateCashOutflowsForStream,
  ]);

  const isStageAllocationManual =
    isRateOverride(cashOutflows.stageAllocation.stage1Percent, benchStage1) ||
    isRateOverride(cashOutflows.stageAllocation.stage2Percent, benchStage2) ||
    isRateOverride(cashOutflows.stageAllocation.stage3Percent, benchStage3) ||
    isRateOverride(cashOutflows.stageAllocation.stage4Percent, benchStage4);

  const resetStagesToBenchmark = () => {
    const stages = saleRecommendations?.constructionStages;
    updateCashOutflowsForStream({
      stageAllocation: {
        ...cashOutflows.stageAllocation,
        ...(stages
          ? {
              stage1Label: stages.labels.stage1,
              stage2Label: stages.labels.stage2,
              stage3Label: stages.labels.stage3,
              stage4Label: stages.labels.stage4 ?? "Finishes",
            }
          : {}),
        ...(benchStage1 != null ? { stage1Percent: benchStage1 } : {}),
        ...(benchStage2 != null ? { stage2Percent: benchStage2 } : {}),
        ...(benchStage3 != null ? { stage3Percent: benchStage3 } : {}),
        ...(benchStage4 != null ? { stage4Percent: benchStage4 } : {}),
      },
    });
  };

  // --- STEP 8 (currentStep 7): LAND COST — city-level benchmarks ---

  const cityLandRate = useMemo(() => {
    if (!projectInfo.countryCode || !projectInfo.city?.trim()) return null;
    const params = buildRecommendationQuery(
      projectInfo.countryCode,
      projectInfo.buildingSubType,
      projectInfo.buildingConfig.towerFloors
    );
    if (!params) return null;
    const bt = params.buildingTypeDB as SaleRecommendationBuildingType;
    const floorsForLookup =
      bt === "residential-hi-rise" || bt === "commercial-strata-office"
        ? projectInfo.buildingConfig.towerFloors
        : undefined;
    return getCityLandRate(
      projectInfo.countryCode,
      projectInfo.city,
      bt,
      floorsForLookup
    );
  }, [
    projectInfo.countryCode,
    projectInfo.city,
    projectInfo.buildingSubType,
    projectInfo.buildingConfig.towerFloors,
  ]);

  useEffect(() => {
    if (currentStep !== 8 || !cityLandRate) return;
    if (aiLandRate) return;

    if (!cashOutflows.landRate) {
      updateCashOutflowsForStream({ landRate: cityLandRate.ratePerSqft });
    }
  }, [
    currentStep,
    cityLandRate,
    cashOutflows.landRate,
    aiLandRate,
    updateCashOutflowsForStream,
  ]);

  const mvpLandRate = cityLandRate?.ratePerSqft;
  const benchLandRate = aiLandRate ?? mvpLandRate;

  const isLandRateManual = isRateOverride(cashOutflows.landRate, benchLandRate);

  const resetLandRateToBenchmark = () => {
    if (benchLandRate == null) return;
    updateCashOutflowsForStream({ landRate: benchLandRate });
  };

  const resetAllocationsToBenchmark = () => {
    updateCashOutflowsForStream({
      ...(aiPowcBreakdown
        ? {
            powcAllocation: {
              siteEstablishment: aiPowcBreakdown.site_establishment_pct,
              overhead: aiPowcBreakdown.overhead_pct,
              authorityFees: aiPowcBreakdown.authority_fees_pct,
            },
          }
        : {}),
      ...(aiScBreakdown
        ? {
            softCostAllocation: {
              architect: aiScBreakdown.architect_pct,
              projectManagement: aiScBreakdown.pm_pct,
              engineering: aiScBreakdown.engineering_pct,
              geotechnical: aiScBreakdown.geotech_pct,
              otherFees: aiScBreakdown.other_pct,
            },
          }
        : {}),
    });
  };

  const powcAllocCurrent =
    cashOutflows.powcAllocation ?? { ...DEFAULT_POWC_ALLOCATION };
  const softAllocCurrent =
    cashOutflows.softCostAllocation ?? { ...DEFAULT_SOFT_COST_ALLOCATION };

  const isPowcAllocationManual =
    (aiPowcBreakdown?.site_establishment_pct != null &&
      isRateOverride(
        powcAllocCurrent.siteEstablishment,
        aiPowcBreakdown.site_establishment_pct
      )) ||
    (aiPowcBreakdown?.overhead_pct != null &&
      isRateOverride(powcAllocCurrent.overhead, aiPowcBreakdown.overhead_pct)) ||
    (aiPowcBreakdown?.authority_fees_pct != null &&
      isRateOverride(
        powcAllocCurrent.authorityFees,
        aiPowcBreakdown.authority_fees_pct
      ));

  const isScAllocationManual =
    (aiScBreakdown?.architect_pct != null &&
      isRateOverride(softAllocCurrent.architect, aiScBreakdown.architect_pct)) ||
    (aiScBreakdown?.pm_pct != null &&
      isRateOverride(softAllocCurrent.projectManagement, aiScBreakdown.pm_pct)) ||
    (aiScBreakdown?.engineering_pct != null &&
      isRateOverride(
        softAllocCurrent.engineering,
        aiScBreakdown.engineering_pct
      )) ||
    (aiScBreakdown?.geotech_pct != null &&
      isRateOverride(softAllocCurrent.geotechnical, aiScBreakdown.geotech_pct)) ||
    (aiScBreakdown?.other_pct != null &&
      isRateOverride(softAllocCurrent.otherFees, aiScBreakdown.other_pct));

  const isStep13Manual = isPowcAllocationManual || isScAllocationManual;

  // --- PROFILE BENCHMARK (step aliases for UI) ---
  const currentRecommendations = saleRecommendations;
  const isStep8Manual = isAnySCPOWCManual;
  const isStep9Manual = isLandRateManual;
  const isStep12Manual = isStageAllocationManual;

  const handleResetStep6 = resetStep6ToBenchmark;
  const handleResetStep8 = resetScPowcToBenchmark;
  const handleResetStep9 = resetLandRateToBenchmark;
  const handleResetStep12 = resetStagesToBenchmark;

  useEffect(() => {
    if (currentStep !== 7) return;
    console.log("[Step 7 Debug]", {
      hasRecommendations: !!currentRecommendations,
      isManual: isStep8Manual,
      scPercent: cashOutflows.softCostPercent,
      recommendedSC: currentRecommendations?.softCosts.scPercent,
      powcPercent: cashOutflows.powcPercent,
      recommendedPOWC: currentRecommendations?.softCosts.powcPercent,
    });
  }, [currentStep, currentRecommendations, isStep8Manual]);

  const validateStep = (step: number): boolean => {
    const newErrors: Errors = {};
    const bc = projectInfo.buildingConfig;

    if (step === 0) {
      if (!projectInfo.country.trim()) newErrors.country = "Country is required.";
      if (!projectInfo.city.trim()) newErrors.city = "City is required.";
    }

    if (step === 1) {
      if (!projectInfo.currency) newErrors.currency = "Currency selection is required.";
    }

    if (step === 2) {
      if (!projectInfo.buildingType)
        newErrors.buildingType = "Building type is required.";
    }

    if (step === 3) {
      if (!projectInfo.salesMarketPositioning?.trim()) {
        newErrors.salesMarketPositioning = "Market positioning is required.";
      }
      if (!projectInfo.salesFinishingStandard?.trim()) {
        newErrors.salesFinishingStandard = "Finishing standard is required.";
      }
    }

    if (step === 4) {
      if (bc.basements < 0)
        newErrors.basements = "Basements cannot be negative.";
      if (bc.podiumFloors < 0)
        newErrors.podiumFloors = "Podium/parking floors cannot be negative.";
      if (bc.towerFloors <= 0)
        newErrors.towerFloors = "Tower floors must be greater than 0.";
    }

    if (step === 5) {
      if (cashOutflows.buildingBUA <= 0)
        newErrors.buildingBUA = "Building BUA must be greater than 0.";
      if (cashOutflows.buildingRate <= 0)
        newErrors.buildingRate = "Building rate must be greater than 0.";
      if (cashOutflows.parkingBUA < 0)
        newErrors.parkingBUA = "Parking BUA cannot be negative.";
      if (cashOutflows.parkingRate < 0)
        newErrors.parkingRate = "Parking rate cannot be negative.";
      if (cashOutflows.basementBUA < 0)
        newErrors.basementBUA = "Basement BUA cannot be negative.";
      if (cashOutflows.basementRate < 0)
        newErrors.basementRate = "Basement rate cannot be negative.";
    }

    if (step === 6) {
      if (cashOutflows.contingencyPercent < 0 || cashOutflows.contingencyPercent > 20) {
        newErrors.contingencyPercent =
          "Contingency is typically between 5% and 10% of CC.";
      }
    }

    if (step === 7) {
      if (cashOutflows.softCostPercent < 0 || cashOutflows.softCostPercent > 30) {
        newErrors.softCostPercent =
          "Soft cost % should be between 0% and 30% of CC incl. contingency.";
      }
      if (cashOutflows.powcPercent < 0 || cashOutflows.powcPercent > 20) {
        newErrors.powcPercent =
          "POWC % should be between 0% and 20% of CC incl. contingency.";
      }
    }

    if (step === 8) {
      if (cashOutflows.landArea <= 0)
        newErrors.landArea = "Land area must be greater than 0.";
      if (cashOutflows.landRate <= 0)
        newErrors.landRate = "Land rate must be greater than 0.";
    }

    // Step 9 (TDC ratios): AI Land/TDC and DC/TDC guardrails are informational only.

    if (step === 10) {
      const co = readSaleCashOutflows();
      if (co.constructionPeriod < 6 || co.constructionPeriod > 84) {
        newErrors.constructionPeriod =
          "Construction period should be between 6 and 84 months.";
      }
    }

    if (step === 11) {
      const sa = cashOutflows.stageAllocation;
      const totalStagePercent =
        (sa.stage1Percent || 0) +
        (sa.stage2Percent || 0) +
        (sa.stage3Percent || 0) +
        (sa.stage4Percent || 0);
      if (totalStagePercent !== 100) {
        newErrors.stages = "Stage allocation must sum to 100% of CC%.";
      }
      if (
        (sa.stage1Percent || 0) <= 0 ||
        (sa.stage2Percent || 0) <= 0 ||
        (sa.stage3Percent || 0) <= 0 ||
        (sa.stage4Percent || 0) <= 0
      ) {
        newErrors.stages = "Each stage must have a positive percentage.";
      }
    }

    if (step === 12) {
      const powcAlloc =
        cashOutflows.powcAllocation ?? { ...DEFAULT_POWC_ALLOCATION };
      const powcTotal = powcAlloc.siteEstablishment + powcAlloc.overhead + powcAlloc.authorityFees;
      if (Math.abs(powcTotal - 100) > 0.01) {
        newErrors.powcAllocation = "POWC allocation (Site + Overhead + Authority) must equal 100%.";
      }
      const softAlloc =
        cashOutflows.softCostAllocation ?? { ...DEFAULT_SOFT_COST_ALLOCATION };
      const softTotal = softAlloc.architect + softAlloc.projectManagement + softAlloc.engineering + softAlloc.geotechnical + softAlloc.otherFees;
      if (Math.abs(softTotal - 100) > 0.01) {
        newErrors.softCostAllocation = "Soft costs allocation must equal 100%.";
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const flushConstructionPeriodDraftToStore = () => {
    const raw = constructionPeriodDraft.trim();
    if (raw === "") return;
    const n = Number.parseInt(raw, 10);
    if (!Number.isFinite(n) || n < 6 || n > 84) return;
    updateCashOutflowsForStream({ constructionPeriod: n });
    setConstructionPeriodDraft(String(n));
    logConstructionPeriodMonths(n);
  };

  const handleNext = () => {
    if (currentStep === 10) {
      flushConstructionPeriodDraftToStore();
    }
    const isValid = validateStep(currentStep);
    if (!isValid) return;

    if (currentStep === totalSteps - 1) {
      const buildingCost =
        cashOutflows.buildingBUA * cashOutflows.buildingRate;
      const parkingCost =
        cashOutflows.parkingBUA * cashOutflows.parkingRate;
      const basementCost =
        cashOutflows.basementBUA * cashOutflows.basementRate;
      const baseConstructionCost = buildingCost + parkingCost + basementCost;
      const contingencyAmount =
        baseConstructionCost * (cashOutflows.contingencyPercent / 100);
      const constructionCost = baseConstructionCost + contingencyAmount;
      // SC and POWC $ use the same CC% (base + contingency) as the live wizard Step 8.
      const softCosts =
        constructionCost * (cashOutflows.softCostPercent / 100);
      const powc =
        constructionCost * (cashOutflows.powcPercent / 100);
      const developmentCost = constructionCost + softCosts + powc;
      const landCost =
        cashOutflows.landArea * cashOutflows.landRate;
      const tdc = developmentCost + landCost;

      updateCashOutflowsForStream({
        baseConstructionCost,
        constructionCost,
        landCost,
        softCosts,
        powc,
        ffe: 0,
        softCostsTotal: softCosts,
        powcTotal: powc,
        tdc,
      });

      console.log("💾 [Component 1] Derived values saved:", {
        constructionCost,
        landCost,
        tdc,
      });
      router.push(withStreamPrefix(streamPrefix, "/preview/cash-outflows"));
      return;
    }

    if (currentStep < totalSteps - 1) {
      setCurrentStep((prev) => prev + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep((prev) => prev - 1);
      setErrors({});
    }
  };

  const fieldError = (name: string) => errors[name];

  const testRecommendationMapping = () => {
    const params = buildRecommendationQuery(
      projectInfo.countryCode,
      projectInfo.buildingSubType,
      projectInfo.buildingConfig.towerFloors
    );

    console.log("🔗 [Sale Mapping Test]:", {
      input: {
        countryCode: projectInfo.countryCode,
        buildingSubType: projectInfo.buildingSubType,
        towerFloors: projectInfo.buildingConfig.towerFloors,
      },
      output: params,
      canQueryDB: !!params,
    });

    return params;
  };

  useEffect(() => {
    if (process.env.NODE_ENV === "development") {
      testRecommendationMapping();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- mapping smoke check on key fields
  }, [
    projectInfo.countryCode,
    projectInfo.buildingSubType,
    projectInfo.buildingConfig.towerFloors,
  ]);

  const renderSaleBenchmarkBar = ({
    hasManualOverride,
    onReset,
  }: {
    hasManualOverride?: boolean;
    onReset?: () => void;
  }) => (
    <div className="mb-6 flex flex-wrap items-center justify-between gap-x-3 gap-y-2 border-b border-slate-700 pb-4">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <span className="text-xs font-medium uppercase tracking-wide text-slate-500">
          Benchmark
        </span>
        <span className="rounded-md border border-slate-700 bg-slate-800 px-3 py-1 text-sm font-medium text-slate-200">
          {getPrettySubTypeName()} • {projectInfo.city} • {projectInfo.country}
        </span>
        {hasManualOverride && (
          <span className="inline-flex items-center rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1 text-xs font-medium text-amber-400">
            Manual overrides
          </span>
        )}
      </div>
      {hasManualOverride && onReset && (
        <button
          type="button"
          onClick={onReset}
          className="text-sm font-medium text-emerald-400 transition-colors hover:text-emerald-300"
        >
          Reset to benchmark
        </button>
      )}
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-950 px-4 py-12 pb-32">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">
            FinModel App — Component 1
          </h1>
          <p className="text-slate-400">
            Development Financials
          </p>
        </div>

        {/* Progress Bar */}
        <div className="mb-8">
          <div className="flex justify-between text-sm text-slate-400 mb-2">
            <span>
              Step {currentStep + 1} of {totalSteps}
            </span>
            <span>
              {Math.round(((currentStep + 1) / totalSteps) * 100)}% Complete
            </span>
          </div>
          <div className="w-full bg-slate-800 rounded-full h-2">
            <div
              className="bg-emerald-600 h-2 rounded-full transition-all"
              style={{ width: `${((currentStep + 1) / totalSteps) * 100}%` }}
            />
          </div>
        </div>

        {isAiResearching && (
          <div className="mb-6 flex items-center gap-3 rounded-lg border border-blue-500/30 bg-blue-500/10 p-4">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-blue-400 border-t-transparent" />
            <div>
              <p className="font-medium text-blue-400">AI Research in Progress...</p>
              <p className="text-sm text-slate-400">
                Fetching market benchmarks for your project
              </p>
            </div>
          </div>
        )}

        {/* Step Content */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-8 space-y-8">
          {/* Step 0: Location */}
          {currentStep === 0 && (
            <div>
              <h2 className="text-xl font-semibold text-white mb-6">
                Project Location
              </h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Country
                  </label>
                  <input
                    type="text"
                    value={projectInfo.country}
                    onChange={(e) => {
                      const countryName = e.target.value;
                      const detectedCurrency = getCurrencyForCountry(countryName);
                      const matchedCountry = COUNTRIES.find(
                        (c) =>
                          c.name.toLowerCase() === countryName.trim().toLowerCase()
                      );

                      updateProjectInfoForStream({
                        country: countryName,
                        countryCode: matchedCountry?.code ?? "",
                        city: "",
                        currency: detectedCurrency as ProjectInfo["currency"],
                        coordinates: null,
                        subMarket: undefined,
                      });
                      if (countryName) logSaleCashOutflow("country", countryName, 1);
                    }}
                    placeholder="Enter any country (e.g., United States, Japan, Germany)"
                    className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                  {fieldError("country") && (
                    <p className="mt-1 text-sm text-red-400">
                      {fieldError("country")}
                    </p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    City
                  </label>
                  <input
                    type="text"
                    value={projectInfo.city}
                    onChange={(e) =>
                      updateProjectInfoForStream({ city: e.target.value })
                    }
                    placeholder="Enter any city (e.g., New York, Tokyo, London)"
                    className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                  {fieldError("city") && (
                    <p className="mt-1 text-sm text-red-400">
                      {fieldError("city")}
                    </p>
                  )}
                </div>
                {projectInfo.country && projectInfo.city && (
                  <LocationMapPicker
                    country={projectInfo.country}
                    city={projectInfo.city}
                    savedPin={projectInfo.coordinates}
                    onGeocodingChange={setIsMapGeocoding}
                    onPinDrop={async (lat, lng, subMarket) => {
                      updateProjectInfoForStream({
                        coordinates: { lat, lng },
                        subMarket: subMarket || undefined,
                      });
                    }}
                  />
                )}
              </div>
            </div>
          )}

          {/* Step 0a: Currency */}
          {currentStep === 1 && (
            <div>
              <h2 className="text-xl font-semibold text-white mb-6">
                Currency Selection
              </h2>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Currency
                </label>
                <select
                  value={projectInfo.currency}
                  onChange={(e) => {
                    const curr = e.target.value as ProjectInfo["currency"];
                    updateProjectInfoForStream({ currency: curr });
                    logSaleCashOutflow("currency", curr, 2);
                  }}
                  className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <option value={getCurrencyForCountry(projectInfo.country)}>
                    {getCurrencyForCountry(projectInfo.country)}{" "}
                    {projectInfo.country
                      ? `(${projectInfo.country} Local)`
                      : "(Default)"}
                  </option>
                  {getCurrencyForCountry(projectInfo.country) !== "USD" && (
                    <option value="USD">USD (US Dollar)</option>
                  )}
                </select>
                <p className="mt-1 text-xs text-slate-500">
                  Auto-detected based on country. You can change this if needed.
                </p>
                {fieldError("currency") && (
                  <p className="mt-1 text-sm text-red-400">
                    {fieldError("currency")}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Building type — Sale stream Step 3 of 13 */}
          {currentStep === 2 && (
            <div>
              <p className="mb-1 text-xs font-medium uppercase tracking-wide text-slate-500">
                Step {currentStep + 1} of {totalSteps}
              </p>
              <h2 className="mb-6 text-xl font-semibold text-white">Building type</h2>
              <div className="space-y-4">
                <p className="text-sm text-slate-400">
                  Select the primary product sub-type for this for-sale development. Each card
                  includes examples and key characteristics.
                </p>
                <div className="grid grid-cols-2 gap-4">
                  {SALE_BUILDING_SUBTYPES.map((s) => {
                    const selected = projectInfo.buildingSubType === s.id;
                    const card = (
                      <button
                        type="button"
                        onClick={() => {
                          console.log("💾 [Sale Step 3] Saving:", {
                            buildingType: s.baseType,
                            buildingSubType: s.id,
                            storePath: "sale.projectInfo",
                          });
                          updateProjectInfoForStream({
                            buildingType: s.baseType,
                            buildingSubType: s.id,
                          });
                          logSaleCashOutflow("buildingSubType", s.id, 3);
                        }}
                        className={`relative w-full rounded-xl border-2 p-5 text-left transition-all ${
                          selected
                            ? "border-emerald-500 bg-emerald-500/10"
                            : "border-slate-700 bg-slate-800/50 hover:border-slate-600"
                        }`}
                      >
                        <div className="text-base font-semibold text-white">
                          {s.subType}
                        </div>
                        <div className="mt-2 text-sm text-slate-400">
                          {s.examples}
                        </div>

                        <div className="mt-3">
                          <HoverTipInline tip={s.keyCharacteristics} className="text-slate-400">
                            <span className="text-xs text-slate-500">Key characteristics</span>
                            <span className="text-xs text-slate-400">ⓘ</span>
                          </HoverTipInline>
                        </div>

                        {selected ? (
                          <div className="absolute right-3 top-3 text-emerald-400">
                            <svg
                              className="h-5 w-5"
                              fill="currentColor"
                              viewBox="0 0 20 20"
                            >
                              <path
                                fillRule="evenodd"
                                d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                                clipRule="evenodd"
                              />
                            </svg>
                          </div>
                        ) : null}
                      </button>
                    );

                    return <div key={s.id} className="min-w-0">{card}</div>;
                  })}
                </div>
                {fieldError("buildingType") && (
                  <p className="mt-1 text-sm text-red-400">
                    {fieldError("buildingType")}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Step 4: Market Segmentation & Positioning */}
          {currentStep === 3 && (
            <div className="space-y-8">
              <h2 className="text-xl font-bold text-white border-b border-slate-700 pb-4">
                Market Segmentation & Positioning
              </h2>

              {/* Market Positioning */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-white">Market positioning</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {[
                    {
                      value: "Affordable",
                      label: "Affordable",
                      desc: "Bottom 25% market prices",
                      icon: (
                        <svg className="w-6 h-6 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      ),
                    },
                    {
                      value: "Mid-Market",
                      label: "Mid-Market",
                      desc: "Market average ±10%",
                      icon: (
                        <svg className="w-6 h-6 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                        </svg>
                      ),
                    },
                    {
                      value: "Upper-Mid Market",
                      label: "Upper-Mid",
                      desc: "Top 25% market prices",
                      icon: (
                        <svg className="w-6 h-6 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                        </svg>
                      ),
                    },
                    {
                      value: "Prime / Luxury",
                      label: "Luxury",
                      desc: "Top 10% market prices",
                      icon: (
                        <svg className="w-6 h-6 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7" />
                        </svg>
                      ),
                    },
                  ].map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => {
                        updateProjectInfoForStream({
                          salesMarketPositioning: option.value,
                        });
                        console.log(
                          "🛒 Store Update - Market Positioning:",
                          option.value
                        );
                      }}
                      className={`relative flex flex-col p-4 rounded-xl border-2 text-left cursor-pointer transition-all ${
                        projectInfo.salesMarketPositioning === option.value
                          ? "border-emerald-500 bg-emerald-500/10"
                          : "border-slate-700 bg-slate-800 hover:border-slate-600"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        {option.icon}
                        <svg
                          className="w-4 h-4 text-slate-500"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                          />
                        </svg>
                      </div>
                      <h4 className="font-semibold text-white">{option.label}</h4>
                      <p className="text-xs text-slate-400 mt-1">{option.desc}</p>
                      <div
                        className={`mt-3 h-4 w-4 rounded-full border-2 flex items-center justify-center ${
                          projectInfo.salesMarketPositioning === option.value
                            ? "border-emerald-500"
                            : "border-slate-600"
                        }`}
                      >
                        {projectInfo.salesMarketPositioning === option.value && (
                          <div className="h-2 w-2 rounded-full bg-emerald-500" />
                        )}
                      </div>
                    </button>
                  ))}
                </div>
                {fieldError("salesMarketPositioning") && (
                  <p className="text-sm text-red-400">
                    {fieldError("salesMarketPositioning")}
                  </p>
                )}
              </div>

              {/* Finishing Standard */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-white">Finishing standard</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {[
                    {
                      value: "Core & Shell",
                      label: "Core & Shell",
                      desc: "Shell + basic finishes, M&E rough-ins",
                      icon: (
                        <svg className="w-6 h-6 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                        </svg>
                      ),
                    },
                    {
                      value: "Standard Finish",
                      label: "Standard",
                      desc: "Standard finishes, basic appliances & fixtures",
                      icon: (
                        <svg className="w-6 h-6 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
                        </svg>
                      ),
                    },
                    {
                      value: "Premium Finish",
                      label: "Premium",
                      desc: "High-end finishes, premium appliances & smart home",
                      icon: (
                        <svg className="w-6 h-6 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                        </svg>
                      ),
                    },
                    {
                      value: "Fully Furnished",
                      label: "Fully Furnished",
                      desc: "Premium finish + furniture, decor, linens",
                      icon: (
                        <svg className="w-6 h-6 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                        </svg>
                      ),
                    },
                  ].map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => {
                        updateProjectInfoForStream({
                          salesFinishingStandard: option.value,
                        });
                        console.log(
                          "🛒 Store Update - Finishing Standard:",
                          option.value
                        );
                      }}
                      className={`relative flex flex-col p-4 rounded-xl border-2 text-left cursor-pointer transition-all ${
                        projectInfo.salesFinishingStandard === option.value
                          ? "border-emerald-500 bg-emerald-500/10"
                          : "border-slate-700 bg-slate-800 hover:border-slate-600"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        {option.icon}
                        <svg
                          className="w-4 h-4 text-slate-500"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                          />
                        </svg>
                      </div>
                      <h4 className="font-semibold text-white">{option.label}</h4>
                      <p className="text-xs text-slate-400 mt-1">{option.desc}</p>
                      <div
                        className={`mt-3 h-4 w-4 rounded-full border-2 flex items-center justify-center ${
                          projectInfo.salesFinishingStandard === option.value
                            ? "border-emerald-500"
                            : "border-slate-600"
                        }`}
                      >
                        {projectInfo.salesFinishingStandard === option.value && (
                          <div className="h-2 w-2 rounded-full bg-emerald-500" />
                        )}
                      </div>
                    </button>
                  ))}
                </div>
                {fieldError("salesFinishingStandard") && (
                  <p className="text-sm text-red-400">
                    {fieldError("salesFinishingStandard")}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Step 5: Building Configuration */}
          {currentStep === 4 && (
            <div className="space-y-6">
              {streamPrefix === "/sale" ? (
                <>
                  <h2 className="border-b border-slate-700 pb-4 text-xl font-bold capitalize text-white">
                    {isSaleLandedProduct ? "Landed" : "High-Rise"} Configuration
                  </h2>

                  <div className="rounded-lg border border-slate-700 bg-slate-800/50 p-3">
                    <p className="text-sm text-slate-400">
                      Configuration form auto-selected from Building Type in Step 3.
                      To change, go back to Step 3 and select a different product type.
                    </p>
                  </div>

                  {!isSaleLandedProduct && (
                    <div className="space-y-6">
                      <h3 className="text-lg font-semibold text-slate-200">
                        High-Rise Configuration
                      </h3>

                      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
                        <div>
                          <label className="mb-2 block text-sm font-medium text-slate-300">
                            Basements (B)
                          </label>
                          <input
                            type="number"
                            min={0}
                            max={5}
                            value={projectInfo.salesHighRiseBasements || 0}
                            onChange={(e) => {
                              const val = Number(e.target.value);
                              updateProjectInfoForStream({ salesHighRiseBasements: val });
                              console.log("🛒 Store Update - HighRise Basements:", val);
                            }}
                            className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-white"
                          />
                        </div>
                        <div>
                          <label className="mb-2 block text-sm font-medium text-slate-300">
                            Podium / Parking (P)
                          </label>
                          <input
                            type="number"
                            min={0}
                            max={8}
                            value={projectInfo.salesHighRisePodiums || 0}
                            onChange={(e) => {
                              const val = Number(e.target.value);
                              updateProjectInfoForStream({ salesHighRisePodiums: val });
                              console.log("🛒 Store Update - HighRise Podiums:", val);
                            }}
                            className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-white"
                          />
                        </div>
                        <div>
                          <label className="mb-2 block text-sm font-medium text-slate-300">
                            Ground Floor (G)
                          </label>
                          <input
                            type="number"
                            min={0}
                            max={1}
                            value={projectInfo.salesHighRiseGroundFloors || 0}
                            onChange={(e) => {
                              const val = Number(e.target.value);
                              updateProjectInfoForStream({ salesHighRiseGroundFloors: val });
                              console.log("🛒 Store Update - HighRise Ground:", val);
                            }}
                            className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-white"
                          />
                        </div>
                        <div>
                          <label className="mb-2 block text-sm font-medium text-slate-300">
                            Upper Floors (Storeys)
                          </label>
                          <input
                            type="number"
                            min={1}
                            max={80}
                            value={projectInfo.salesHighRiseUpperFloors || 0}
                            onChange={(e) => {
                              const val = Number(e.target.value);
                              updateProjectInfoForStream({ salesHighRiseUpperFloors: val });
                              console.log("🛒 Store Update - HighRise Upper Floors:", val);
                            }}
                            className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-white"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                        <div>
                          <label className="mb-2 block text-sm font-medium text-slate-300">
                            Total Floors (Auto)
                          </label>
                          <input
                            type="number"
                            value={salesHighRiseTotalFloors}
                            readOnly
                            className="w-full cursor-not-allowed rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-slate-400"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                        <div>
                          <label className="mb-2 block text-sm font-medium text-slate-300">
                            Total Building BUA (sqft)
                          </label>
                          <input
                            type="number"
                            value={projectInfo.salesHighRiseTotalBUA || 0}
                            onChange={(e) => {
                              const val = Number(e.target.value);
                              updateProjectInfoForStream({ salesHighRiseTotalBUA: val });
                              console.log("🛒 Store Update - HighRise BUA:", val);
                            }}
                            className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-white"
                          />
                        </div>
                        <div>
                          <label className="mb-2 block text-sm font-medium text-slate-300">
                            Basement BUA (sqft)
                          </label>
                          <input
                            type="number"
                            value={projectInfo.salesHighRiseBasementBUA || 0}
                            onChange={(e) => {
                              const val = Number(e.target.value);
                              updateProjectInfoForStream({ salesHighRiseBasementBUA: val });
                              console.log("🛒 Store Update - HighRise Basement BUA:", val);
                            }}
                            className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-white"
                          />
                        </div>
                        <div>
                          <label className="mb-2 block text-sm font-medium text-slate-300">
                            Podium / Parking BUA (sqft)
                          </label>
                          <input
                            type="number"
                            value={projectInfo.salesHighRisePodiumBUA || 0}
                            onChange={(e) => {
                              const val = Number(e.target.value);
                              updateProjectInfoForStream({ salesHighRisePodiumBUA: val });
                              console.log("🛒 Store Update - HighRise Podium BUA:", val);
                            }}
                            className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-white"
                          />
                        </div>
                        <div>
                          <label className="mb-2 block text-sm font-medium text-slate-300">
                            Saleable BUA Ratio (%)
                          </label>
                          <input
                            type="number"
                            min={0}
                            max={100}
                            value={projectInfo.salesHighRiseSaleableRatio || 0}
                            onChange={(e) => {
                              const val = Number(e.target.value);
                              updateProjectInfoForStream({ salesHighRiseSaleableRatio: val });
                              console.log("🛒 Store Update - HighRise Ratio:", val);
                            }}
                            className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-white"
                          />
                        </div>
                        <div>
                          <label className="mb-2 block text-sm font-medium text-slate-300">
                            Saleable BUA (sqft) (Auto)
                          </label>
                          <input
                            type="number"
                            value={salesHighRiseSaleableBUA}
                            readOnly
                            className="w-full cursor-not-allowed rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-slate-400"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 gap-4 md:grid-cols-1">
                        <div>
                          <label className="mb-2 block text-sm font-medium text-slate-300">
                            Land Area (sqft)
                          </label>
                          <input
                            type="number"
                            value={projectInfo.salesHighRiseLandArea || 0}
                            onChange={(e) => {
                              const val = Number(e.target.value);
                              updateProjectInfoForStream({ salesHighRiseLandArea: val });
                              console.log("🛒 Store Update - HighRise Land Area:", val);
                            }}
                            className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-white"
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {isSaleLandedProduct && (
                    <div className="space-y-6">
                      <h3 className="text-lg font-semibold text-slate-200">
                        Landed Configuration
                      </h3>

                      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                        <div>
                          <label className="mb-2 block text-sm font-medium text-slate-300">
                            Ground Floor (G)
                          </label>
                          <input
                            type="number"
                            value={1}
                            readOnly
                            className="w-full cursor-not-allowed rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-slate-400"
                          />
                          <p className="mt-1 text-xs text-slate-500">Fixed</p>
                        </div>
                        <div>
                          <label className="mb-2 block text-sm font-medium text-slate-300">
                            Upper Floors (Storeys)
                          </label>
                          <input
                            type="number"
                            min={1}
                            max={4}
                            value={projectInfo.salesLandedUpperFloors || 1}
                            onChange={(e) => {
                              const val = Number(e.target.value);
                              updateProjectInfoForStream({ salesLandedUpperFloors: val });
                              console.log("🛒 Store Update - Landed Upper Floors:", val);
                            }}
                            className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-white"
                          />
                        </div>
                        <div>
                          <label className="mb-2 block text-sm font-medium text-slate-300">
                            Total Floors (Auto)
                          </label>
                          <input
                            type="number"
                            value={salesLandedTotalFloors}
                            readOnly
                            className="w-full cursor-not-allowed rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-slate-400"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                        <div>
                          <label className="mb-2 block text-sm font-medium text-slate-300">
                            Number of Units
                          </label>
                          <input
                            type="number"
                            value={projectInfo.salesLandedNumUnits || 0}
                            onChange={(e) => {
                              const val = Number(e.target.value);
                              updateProjectInfoForStream({ salesLandedNumUnits: val });
                              console.log("🛒 Store Update - Landed Units:", val);
                            }}
                            className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-white"
                          />
                        </div>
                        <div>
                          <label className="mb-2 block text-sm font-medium text-slate-300">
                            BUA per Unit (sqft)
                          </label>
                          <input
                            type="number"
                            value={projectInfo.salesLandedBUAperUnit || 0}
                            onChange={(e) => {
                              const val = Number(e.target.value);
                              updateProjectInfoForStream({ salesLandedBUAperUnit: val });
                              console.log("🛒 Store Update - Landed BUA/Unit:", val);
                            }}
                            className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-white"
                          />
                        </div>
                        <div>
                          <label className="mb-2 block text-sm font-medium text-slate-300">
                            Total BUA (sqft) (Auto)
                          </label>
                          <input
                            type="number"
                            value={salesLandedTotalBUA}
                            readOnly
                            className="w-full cursor-not-allowed rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-slate-400"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                        <div>
                          <label className="mb-2 block text-sm font-medium text-slate-300">
                            Saleable BUA Ratio (%)
                          </label>
                          <input
                            type="number"
                            min={0}
                            max={100}
                            value={projectInfo.salesLandedSaleableRatio ?? 100}
                            onChange={(e) => {
                              const val = Number(e.target.value);
                              updateProjectInfoForStream({ salesLandedSaleableRatio: val });
                              console.log("🛒 Store Update - Landed Ratio:", val);
                            }}
                            className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-white"
                          />
                        </div>
                        <div>
                          <label className="mb-2 block text-sm font-medium text-slate-300">
                            Total Saleable BUA (sqft) (Auto)
                          </label>
                          <input
                            type="number"
                            value={salesLandedTotalSaleableBUA}
                            readOnly
                            className="w-full cursor-not-allowed rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-slate-400"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                        <div>
                          <label className="mb-2 block text-sm font-medium text-slate-300">
                            Land Area per Unit (sqft)
                          </label>
                          <input
                            type="number"
                            value={projectInfo.salesLandedLandAreaPerUnit || 0}
                            onChange={(e) => {
                              const val = Number(e.target.value);
                              updateProjectInfoForStream({
                                salesLandedLandAreaPerUnit: val,
                              });
                              console.log("🛒 Store Update - Landed Land/Unit:", val);
                            }}
                            className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-white"
                          />
                        </div>
                        <div>
                          <label className="mb-2 block text-sm font-medium text-slate-300">
                            Total Saleable Land Area (sqft) (Auto)
                          </label>
                          <input
                            type="number"
                            value={salesLandedTotalSaleableLandArea}
                            readOnly
                            className="w-full cursor-not-allowed rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-slate-400"
                          />
                        </div>
                        <div>
                          <label className="mb-2 block text-sm font-medium text-slate-300">
                            Common Area (%)
                          </label>
                          <input
                            type="number"
                            min={0}
                            max={99}
                            value={projectInfo.salesLandedCommonAreaPct || 0}
                            onChange={(e) => {
                              const val = Number(e.target.value);
                              updateProjectInfoForStream({ salesLandedCommonAreaPct: val });
                              console.log("🛒 Store Update - Landed Common Area:", val);
                            }}
                            className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-white"
                          />
                        </div>
                        <div>
                          <label className="mb-2 block text-sm font-medium text-slate-300">
                            Total Land Area (sqft) (Auto)
                          </label>
                          <input
                            type="number"
                            value={salesLandedTotalLandArea}
                            readOnly
                            className="w-full cursor-not-allowed rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-slate-400"
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                  <div>
                    <label className="mb-2 block text-sm font-medium text-slate-300">
                      Basements (No. of levels)
                    </label>
                    <input
                      type="number"
                      value={projectInfo.buildingConfig.basements}
                      min={0}
                      onChange={(e) =>
                        updateFormData("basements", Number(e.target.value) || 0)
                      }
                      className="w-full rounded-lg border border-slate-700 bg-slate-800 px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                    {fieldError("basements") && (
                      <p className="mt-1 text-sm text-red-400">
                        {fieldError("basements")}
                      </p>
                    )}
                  </div>
                  <div>
                    <label className="mb-2 block text-sm font-medium text-slate-300">
                      Podium / Parking Floors
                    </label>
                    <input
                      type="number"
                      value={projectInfo.buildingConfig.podiumFloors}
                      min={0}
                      onChange={(e) =>
                        updateFormData("podiumFloors", Number(e.target.value) || 0)
                      }
                      className="w-full rounded-lg border border-slate-700 bg-slate-800 px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                    {fieldError("podiumFloors") && (
                      <p className="mt-1 text-sm text-red-400">
                        {fieldError("podiumFloors")}
                      </p>
                    )}
                  </div>
                  <div>
                    <label className="mb-2 block text-sm font-medium text-slate-300">
                      Tower Floors
                    </label>
                    <input
                      type="number"
                      value={projectInfo.buildingConfig.towerFloors}
                      min={1}
                      onChange={(e) =>
                        updateFormData("towerFloors", Number(e.target.value) || 0)
                      }
                      className="w-full rounded-lg border border-slate-700 bg-slate-800 px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                    {fieldError("towerFloors") && (
                      <p className="mt-1 text-sm text-red-400">
                        {fieldError("towerFloors")}
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Step 6: Construction Costs */}
          {currentStep === 5 && (
            <div>
              {renderSaleBenchmarkBar({
                hasManualOverride: isStep6Manual,
                onReset:
                  benchBuildingRate != null ||
                  benchParkingRate != null ||
                  benchBasementRate != null ||
                  benchInfraRate != null
                    ? handleResetStep6
                    : undefined,
              })}

              <h2 className="text-xl font-semibold text-white mb-6">
                Construction Costs (CC)
              </h2>
              <p className="text-sm text-slate-400 mb-4">
                Enter built-up areas (BUA) and benchmark construction rates for each
                component.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-3">
                  <h3 className="text-sm font-semibold text-slate-200">
                    Superstructure / Main Building
                  </h3>
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                      Building BUA (sqft)
                    </label>
                    <input
                      type="number"
                      value={
                        isSaleLandedProduct
                          ? salesLandedTotalBUA || 0
                          : projectInfo.salesHighRiseTotalBUA || 0
                      }
                      readOnly
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-slate-400 cursor-not-allowed"
                    />
                    <p className="mt-1 text-xs text-amber-400">
                      🔒 Locked: To change, go back to Step 5
                    </p>
                    {fieldError("buildingBUA") && (
                      <p className="mt-1 text-sm text-red-400">
                        {fieldError("buildingBUA")}
                      </p>
                    )}
                  </div>
                  <AiInput
                    label={`Building Rate (${projectInfo.currency}/sqft)`}
                    value={cashOutflows.buildingRate || benchBuildingRate || 0}
                    onChange={(v) =>
                      updateFormData("buildingRate", Number(v) || 0)
                    }
                    isAiGenerated={!!aiBuildingRate}
                    isManualOverride={isBuildingManual}
                  />
                  {fieldError("buildingRate") && (
                    <p className="mt-1 text-sm text-red-400">
                      {fieldError("buildingRate")}
                    </p>
                  )}
                  <p className="text-sm text-slate-300">
                    Building Cost (CC):{" "}
                    <span className="font-semibold text-emerald-400">
                      {buildingCost.toLocaleString(undefined, {
                        maximumFractionDigits: 0,
                      })}{" "}
                      {projectInfo.currency}
                    </span>
                  </p>
                </div>

                {!isSaleLandedProduct && (
                <div className="space-y-3">
                  <h3 className="text-sm font-semibold text-slate-200">
                    Parking & Basements
                  </h3>
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                      Parking / Podium BUA (sqft)
                    </label>
                    <input
                      type="number"
                      value={projectInfo.salesHighRisePodiumBUA || 0}
                      readOnly
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-slate-400 cursor-not-allowed"
                    />
                    <p className="mt-1 text-xs text-amber-400">
                      🔒 Locked: To change, go back to Step 5
                    </p>
                  </div>
                  <AiInput
                    label={`Parking Rate (${projectInfo.currency}/sqft)`}
                    value={
                      isSaleLandedProduct ||
                      (projectInfo.salesHighRisePodiumBUA || 0) === 0
                        ? 0
                        : cashOutflows.parkingRate || benchParkingRate || 0
                    }
                    onChange={(v) => {
                      if (
                        isSaleLandedProduct ||
                        (projectInfo.salesHighRisePodiumBUA || 0) === 0
                      ) {
                        return; // Don't allow changes when BUA is 0
                      }
                      updateFormData("parkingRate", Number(v) || 0);
                    }}
                    disabled={
                      isSaleLandedProduct ||
                      (projectInfo.salesHighRisePodiumBUA || 0) === 0
                    }
                    helperText={
                      isSaleLandedProduct ||
                      (projectInfo.salesHighRisePodiumBUA || 0) === 0
                        ? "Rate is 0 because Parking/Podium BUA is 0"
                        : undefined
                    }
                    isAiGenerated={
                      !!aiParkingRate &&
                      !isSaleLandedProduct &&
                      (projectInfo.salesHighRisePodiumBUA || 0) > 0
                    }
                    isManualOverride={
                      isParkingManual &&
                      (projectInfo.salesHighRisePodiumBUA || 0) > 0
                    }
                  />
                  {fieldError("parkingRate") && (
                    <p className="mt-1 text-sm text-red-400">
                      {fieldError("parkingRate")}
                    </p>
                  )}
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                      Basement BUA (sqft)
                    </label>
                    <input
                      type="number"
                      value={projectInfo.salesHighRiseBasementBUA || 0}
                      readOnly
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-slate-400 cursor-not-allowed"
                    />
                    <p className="mt-1 text-xs text-amber-400">
                      🔒 Locked: To change, go back to Step 5
                    </p>
                  </div>
                  <AiInput
                    label={`Basement Rate (${projectInfo.currency}/sqft)`}
                    value={
                      isSaleLandedProduct ||
                      (projectInfo.salesHighRiseBasementBUA || 0) === 0
                        ? 0
                        : cashOutflows.basementRate || benchBasementRate || 0
                    }
                    onChange={(v) => {
                      if (
                        isSaleLandedProduct ||
                        (projectInfo.salesHighRiseBasementBUA || 0) === 0
                      ) {
                        return; // Don't allow changes when BUA is 0
                      }
                      updateFormData("basementRate", Number(v) || 0);
                    }}
                    disabled={
                      isSaleLandedProduct ||
                      (projectInfo.salesHighRiseBasementBUA || 0) === 0
                    }
                    helperText={
                      isSaleLandedProduct ||
                      (projectInfo.salesHighRiseBasementBUA || 0) === 0
                        ? "Rate is 0 because Basement BUA is 0"
                        : undefined
                    }
                    isAiGenerated={
                      !!aiBasementRate &&
                      !isSaleLandedProduct &&
                      (projectInfo.salesHighRiseBasementBUA || 0) > 0
                    }
                    isManualOverride={
                      isBasementManual &&
                      (projectInfo.salesHighRiseBasementBUA || 0) > 0
                    }
                  />
                  {fieldError("basementRate") && (
                    <p className="mt-1 text-sm text-red-400">
                      {fieldError("basementRate")}
                    </p>
                  )}
                  <div className="space-y-1 text-sm">
                    <p className="text-slate-300">
                      Parking Cost (CC):{" "}
                      <span className="font-semibold text-emerald-400">
                        {parkingCost.toLocaleString(undefined, {
                          maximumFractionDigits: 0,
                        })}{" "}
                        {projectInfo.currency}
                        {(projectInfo.salesHighRisePodiumBUA || 0) === 0 && (
                          <span className="ml-1 text-slate-500">(BUA is 0)</span>
                        )}
                      </span>
                    </p>
                    <p className="text-slate-300">
                      Basement Cost (CC):{" "}
                      <span className="font-semibold text-emerald-400">
                        {basementCost.toLocaleString(undefined, {
                          maximumFractionDigits: 0,
                        })}{" "}
                        {projectInfo.currency}
                        {(projectInfo.salesHighRiseBasementBUA || 0) === 0 && (
                          <span className="ml-1 text-slate-500">(BUA is 0)</span>
                        )}
                      </span>
                    </p>
                    <p className="mt-1 border-t border-slate-700 pt-1 text-slate-400">
                      Combined:{" "}
                      <span className="font-semibold text-emerald-400">
                        {(parkingCost + basementCost).toLocaleString(undefined, {
                          maximumFractionDigits: 0,
                        })}{" "}
                        {projectInfo.currency}
                      </span>
                    </p>
                  </div>
                  {streamPrefix === "/sale" && infrastructureCosts > 0 ? (
                    <p className="text-sm text-slate-300">
                      Infrastructure Costs (CC):{" "}
                      <span className="font-semibold text-emerald-400">
                        {infrastructureCosts.toLocaleString(undefined, {
                          maximumFractionDigits: 0,
                        })}{" "}
                        {projectInfo.currency}
                      </span>
                    </p>
                  ) : null}
                </div>
                )}
              </div>

              {/* Infrastructure Costs - Landed Developments (Sale stream) */}
              {streamPrefix === "/sale" ? (
                <div className="mt-6 pt-6 border-t border-slate-700">
                  <div className="mb-6 p-3 bg-slate-800/50 rounded-lg border border-slate-700">
                    <p className="text-sm text-slate-400">
                      ℹ️ <span className="font-semibold text-slate-200">Infrastructure Costs</span>{" "}
                      apply to <span className="font-semibold text-slate-200">Landed Developments</span>{" "}
                      (roads, drainage, utilities, landscaping). For{" "}
                      <span className="font-semibold text-slate-200">
                        Hi-Rise Residential &amp; Strata Office
                      </span>
                      , leave Infrastructure Rate as 0.
                    </p>
                  </div>

                  <h4 className="text-sm font-semibold text-white mb-4">
                    Infrastructure Costs (Landed Developments)
                  </h4>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <AiInput
                      label={`Infrastructure Rate (${projectInfo.currency}/sqft)`}
                      value={cashOutflows.infrastructureRate ?? benchInfraRate ?? 0}
                      onChange={(v) =>
                        updateFormData("infrastructureRate", Number(v) || 0)
                      }
                      isAiGenerated={!!aiInfraRate}
                      isManualOverride={isInfraManual}
                      helperText="For landed developments only (Hi-Rise: leave as 0)"
                    />

                    <div>
                      <label className="block text-sm text-slate-400 mb-2">
                        Total Land Area (sqft)
                        <span className="text-xs text-slate-500 ml-2">
                          (from Step 5)
                        </span>
                      </label>
                      <input
                        type="number"
                        value={salesLandedTotalLandArea}
                        readOnly
                        disabled
                        className="w-full px-4 py-2 bg-slate-800/50 border border-slate-700 rounded-lg text-slate-400"
                      />
                      <p className="text-xs text-slate-500 mt-1">
                        Auto-populated from Step 5
                      </p>
                    </div>

                    <div>
                      <label className="block text-sm text-slate-400 mb-2">
                        Infrastructure Costs
                      </label>
                      <div className="px-4 py-2 bg-emerald-500/10 border border-emerald-500/30 rounded-lg text-emerald-400 font-semibold">
                        {infrastructureCosts.toLocaleString(undefined, {
                          maximumFractionDigits: 0,
                        })}{" "}
                        {projectInfo.currency}
                      </div>
                      <p className="text-xs text-slate-500 mt-1">
                        Rate × Total Land Area
                      </p>
                    </div>
                  </div>
                </div>
              ) : null}

              <div className="mt-6 border-t border-slate-800 pt-4">
                <p className="text-sm text-slate-300">
                  Total Construction Cost (CC) before contingency:{" "}
                  <span className="font-semibold text-emerald-400">
                    {baseCC.toLocaleString(undefined, {
                      maximumFractionDigits: 0,
                    })}{" "}
                    {projectInfo.currency}
                  </span>
                </p>
              </div>
            </div>
          )}


          {/* Step 7: Contingency */}
          {currentStep === 6 && (
            <div>
              {/* BENCHMARK PROFILE BAR */}
              <div className="mb-6 flex flex-wrap items-center gap-x-3 gap-y-2 border-b border-slate-700 pb-4">
                <span className="text-xs font-medium uppercase tracking-wide text-slate-500">
                  Benchmark
                </span>
                <span className="rounded-md bg-slate-800 px-3 py-1 text-sm font-medium text-slate-200 border border-slate-700">
                  {getPrettySubTypeName()} • {projectInfo.city} •{" "}
                  {projectInfo.country}
                </span>
              </div>
              <h2 className="text-xl font-semibold text-white mb-4">
                Contingency on CC
              </h2>
              <p className="text-sm text-slate-400 mb-4">
                Apply a contingency allowance on construction costs to cover unknowns
                and escalation.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Contingency (% of CC)
                  </label>
                  <input
                    type="number"
                    value={cashOutflows.contingencyPercent}
                    min={0}
                    max={20}
                    onChange={(e) =>
                      updateFormData(
                        "contingencyPercent",
                        Number(e.target.value) || 0
                      )
                    }
                    className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                  {fieldError("contingencyPercent") && (
                    <p className="mt-1 text-sm text-red-400">
                      {fieldError("contingencyPercent")}
                    </p>
                  )}
                  <AiHintBox
                    title="AI Contingency Recommendation"
                    className="mt-2"
                  >
                    {aiData?.hints?.contingency_text ||
                      `For a ${isSaleLandedProduct ? "landed" : "high-rise"} project in ${projectInfo.city}, a contingency of 5-10% is recommended.`}
                  </AiHintBox>
                </div>
                <div>
                  <p className="text-xs font-medium text-slate-400 mb-1">
                    Contingency Amount
                  </p>
                  <p className="text-lg font-semibold text-emerald-400">
                    {contingencyAmount.toLocaleString(undefined, {
                      maximumFractionDigits: 0,
                    })}{" "}
                    {projectInfo.currency}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-medium text-slate-400 mb-1">
                    CC incl. Contingency (CC%)
                  </p>
                  <p className="text-lg font-semibold text-emerald-400">
                    {ccWithContingency.toLocaleString(undefined, {
                      maximumFractionDigits: 0,
                    })}{" "}
                    {projectInfo.currency}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Step 8: SC, POWC & DC */}
          {currentStep === 7 && (
            <div>
              {renderSaleBenchmarkBar({
                hasManualOverride: isStep8Manual,
                onReset:
                  benchScPct != null || benchPowcPct != null
                    ? handleResetStep8
                    : undefined,
              })}

              <h2 className="text-xl font-semibold text-white mb-4">
                SC, POWC & DC
              </h2>

              <p className="text-sm text-slate-400 mb-6">
                SC and POWC percentages apply to CC including contingency.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div>
                  <AiInput
                    label="Soft Costs % of CC incl. contingency (SC%)"
                    type="percentage"
                    value={cashOutflows.softCostPercent || benchScPct || 0}
                    onChange={(v) => updateFormData("softCostPercent", Number(v) || 0)}
                    isAiGenerated={!!aiScPct}
                    isManualOverride={isSCManual}
                    helperText="SC amount = CC incl. contingency × SC% ÷ 100"
                  />
                  {fieldError("softCostPercent") && (
                    <p className="mt-1 text-sm text-red-400">
                      {fieldError("softCostPercent")}
                    </p>
                  )}
                </div>

                <div>
                  <AiInput
                    label="POWC % of CC incl. contingency (POWC%)"
                    type="percentage"
                    value={cashOutflows.powcPercent || benchPowcPct || 0}
                    onChange={(v) => updateFormData("powcPercent", Number(v) || 0)}
                    isAiGenerated={!!aiPowcPct}
                    isManualOverride={isPOWCManual}
                    helperText="POWC = Pre-Operating Expenses & Working Capital"
                  />
                  {fieldError("powcPercent") && (
                    <p className="mt-1 text-sm text-red-400">
                      {fieldError("powcPercent")}
                    </p>
                  )}
                </div>
              </div>

              <div className="mt-6 border-t border-slate-800 pt-4 space-y-1 text-sm text-slate-300">
                <p>
                  Soft Costs (SC):{" "}
                  <span className="font-semibold text-emerald-400">
                    {softCosts.toLocaleString(undefined, {
                      maximumFractionDigits: 0,
                    })}{" "}
                    {projectInfo.currency}
                  </span>
                </p>
                <p>
                  POWC:{" "}
                  <span className="font-semibold text-emerald-400">
                    {powc.toLocaleString(undefined, {
                      maximumFractionDigits: 0,
                    })}{" "}
                    {projectInfo.currency}
                  </span>
                </p>
                <p>
                  Development Cost (DC = CC% + SC + POWC):{" "}
                  <span className="font-semibold text-emerald-400">
                    {developmentCost.toLocaleString(undefined, {
                      maximumFractionDigits: 0,
                    })}{" "}
                    {projectInfo.currency}
                  </span>
                </p>
              </div>
            </div>
          )}

          {/* Step 9: Land Costs */}
          {currentStep === 8 && (
            <div>
              {renderSaleBenchmarkBar({
                hasManualOverride: isStep9Manual,
                onReset: benchLandRate != null ? handleResetStep9 : undefined,
              })}

              <h2 className="text-xl font-semibold text-white mb-4">
                Land Costs (LC)
              </h2>

              <p className="text-sm text-slate-400 mb-6">
                Land costs vary by city and asset type. Rates use city-level
                benchmarks from the recommendation database.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-300">
                    Land Area (sqft)
                  </label>
                  <input
                    type="number"
                    value={
                      isSaleLandedProduct
                        ? salesLandedTotalLandArea || 0
                        : projectInfo.salesHighRiseLandArea || 0
                    }
                    readOnly
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-slate-400 cursor-not-allowed"
                  />
                  <p className="mt-1 text-xs text-amber-400">
                    🔒 Locked: To change, go back to Step 5
                  </p>
                  {fieldError("landArea") && (
                    <p className="mt-1 text-sm text-red-400">
                      {fieldError("landArea")}
                    </p>
                  )}
                </div>

                <AiInput
                  label={`Land Rate (${projectInfo.currency}/sqft)`}
                  value={cashOutflows.landRate || benchLandRate || 0}
                  onChange={(v) => updateFormData("landRate", Number(v) || 0)}
                  isAiGenerated={!!aiLandRate}
                  isManualOverride={isLandRateManual}
                  helperText={
                    cityLandRate && !aiLandRate
                      ? `Recommended for ${projectInfo.city}: ${cityLandRate.ratePerSqft.toLocaleString()} ${projectInfo.currency}/sqft`
                      : undefined
                  }
                />
                {fieldError("landRate") && (
                  <p className="mt-1 text-sm text-red-400">
                    {fieldError("landRate")}
                  </p>
                )}

                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-300">
                    Land Cost (LC)
                  </label>
                  <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-2 font-semibold text-emerald-400">
                    {landCost.toLocaleString(undefined, {
                      maximumFractionDigits: 0,
                    })}{" "}
                    {projectInfo.currency}
                  </div>
                  <p className="mt-1 text-xs text-slate-500">
                    Land Area × Land Rate
                  </p>
                </div>
              </div>

              <div className="mt-6 rounded-lg border border-slate-700 bg-slate-800/50 p-4">
                <p className="text-sm text-slate-300">
                  <span className="font-semibold text-white">
                    Market insight:
                  </span>{" "}
                  Benchmark land rate for{" "}
                  {projectInfo.subMarket || projectInfo.city} is{" "}
                  <span className="font-bold text-emerald-400">
                    {aiLandRate != null
                      ? `${Number(aiLandRate).toLocaleString()} ${projectInfo.currency}/sqft`
                      : cityLandRate
                        ? `${cityLandRate.ratePerSqft.toLocaleString()} ${projectInfo.currency}/sqft`
                        : "—"}
                  </span>
                  . At these inputs, land is about{" "}
                  <span className="font-bold text-emerald-400">
                    {totalDevelopmentCost > 0
                      ? `${landToTdcRatio.toFixed(0)}%`
                      : "—"}
                  </span>{" "}
                  of total development cost (TDC) for{" "}
                  {getPrettySubTypeName()}.
                </p>
              </div>
            </div>
          )}

          {/* Step 10: TDC & Ratio Checks */}
          {currentStep === 9 && (
            <div>
              {/* BENCHMARK PROFILE BAR */}
              <div className="mb-6 flex flex-wrap items-center gap-x-3 gap-y-2 border-b border-slate-700 pb-4">
                <span className="text-xs font-medium uppercase tracking-wide text-slate-500">
                  Benchmark
                </span>
                <span className="rounded-md bg-slate-800 px-3 py-1 text-sm font-medium text-slate-200 border border-slate-700">
                  {getPrettySubTypeName()} • {projectInfo.city} •{" "}
                  {projectInfo.country}
                </span>
              </div>
              <h2 className="text-xl font-semibold text-white mb-4">
                TDC & Ratio Checks
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <p className="text-sm text-slate-300">
                    Development Costs (DC)
                  </p>
                  <p className="text-lg font-semibold text-emerald-400">
                    {developmentCost.toLocaleString(undefined, {
                      maximumFractionDigits: 0,
                    })}{" "}
                    {projectInfo.currency}
                  </p>
                  <p className="mt-4 text-sm text-slate-300">Land Cost (LC)</p>
                  <p className="text-lg font-semibold text-emerald-400">
                    {landCost.toLocaleString(undefined, {
                      maximumFractionDigits: 0,
                    })}{" "}
                    {projectInfo.currency}
                  </p>
                </div>
                <div className="space-y-3">
                  <p className="text-sm text-slate-300">
                    Total Development Cost (TDC = DC + LC)
                  </p>
                  <p className="text-2xl font-bold text-emerald-400">
                    {totalDevelopmentCost.toLocaleString(undefined, {
                      maximumFractionDigits: 0,
                    })}{" "}
                    {projectInfo.currency}
                  </p>
                  <div className="mt-4 space-y-2 text-sm text-slate-300">
                    {(() => {
                      const landTarget = aiData?.guardrails?.land_tdc_target_pct;
                      const dcTarget = aiData?.guardrails?.dc_tdc_target_pct;

                      const landMin = landTarget?.min ?? 0;
                      const landMax = landTarget?.max ?? 51;
                      const dcMin = dcTarget?.min ?? 49;
                      const dcMax = dcTarget?.max ?? 100;

                      const landInRange =
                        landToTdcRatio >= landMin && landToTdcRatio <= landMax;
                      const dcInRange =
                        dcToTdcRatio >= dcMin && dcToTdcRatio <= dcMax;

                      return (
                        <>
                          <p>
                            Land / TDC:{" "}
                            <span
                              className={`font-semibold ${
                                landInRange
                                  ? "text-emerald-400"
                                  : "text-red-400"
                              }`}
                            >
                              {landToTdcRatio.toFixed(1)}% (target {landMin}–
                              {landMax}%)
                            </span>
                          </p>
                          <p>
                            Development (DC) / TDC:{" "}
                            <span
                              className={`font-semibold ${
                                dcInRange ? "text-emerald-400" : "text-red-400"
                              }`}
                            >
                              {dcToTdcRatio.toFixed(1)}% (target {dcMin}–{dcMax}
                              %)
                            </span>
                          </p>
                          {(!landInRange || !dcInRange) && (
                            <AiGuardrailBox
                              severity="error"
                              title="TDC Ratio Outside Institutional Range"
                              message={`Your Land/TDC ratio (${landToTdcRatio.toFixed(1)}%) or DC/TDC ratio (${dcToTdcRatio.toFixed(1)}%) is outside the target range for this market and asset type. You may adjust land/development costs or proceed anyway.`}
                              className="mt-2"
                            />
                          )}
                        </>
                      );
                    })()}
                  </div>
                  {(fieldError("landRatio") || fieldError("dcRatio")) && (
                    <p className="text-xs text-red-400">
                      {fieldError("landRatio") || fieldError("dcRatio")}
                    </p>
                  )}
                  <p className="mt-2 text-xs text-slate-500">
                    These ratios are simple guardrails. In many GCC projects,
                    land cost is kept below ~50% of total development cost.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Step 11: Construction Period */}
          {currentStep === 10 && (
            <div>
              {/* BENCHMARK PROFILE BAR */}
              <div className="mb-6 flex flex-wrap items-center gap-x-3 gap-y-2 border-b border-slate-700 pb-4">
                <span className="text-xs font-medium uppercase tracking-wide text-slate-500">
                  Benchmark
                </span>
                <span className="rounded-md bg-slate-800 px-3 py-1 text-sm font-medium text-slate-200 border border-slate-700">
                  {getPrettySubTypeName()} • {projectInfo.city} •{" "}
                  {projectInfo.country}
                </span>
              </div>
              <h2 className="text-xl font-semibold text-white mb-4">
                Construction Period (with AI Hint)
              </h2>
              <p className="text-sm text-slate-400 mb-4">
                Set the overall construction duration in months. This will drive the
                monthly phasing for CC, SC and POWC.
              </p>
              <div className="max-w-sm space-y-3">
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Construction Period (months)
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  autoComplete="off"
                  value={constructionPeriodDraft}
                  onFocus={() => {
                    constructionPeriodFocusedRef.current = true;
                  }}
                  onChange={(e) =>
                    setConstructionPeriodDraft(e.target.value.replace(/[^\d]/g, ""))
                  }
                  onBlur={() => {
                    constructionPeriodFocusedRef.current = false;
                    const raw = constructionPeriodDraft.trim();
                    if (raw === "") {
                      setConstructionPeriodDraft(
                        String(cashOutflows.constructionPeriod)
                      );
                      return;
                    }
                    const n = Number.parseInt(raw, 10);
                    if (!Number.isFinite(n) || n < 6 || n > 84) {
                      setConstructionPeriodDraft(
                        String(cashOutflows.constructionPeriod)
                      );
                      return;
                    }
                    updateCashOutflowsForStream({ constructionPeriod: n });
                    setConstructionPeriodDraft(String(n));
                    logConstructionPeriodMonths(n);
                  }}
                  className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
                {fieldError("constructionPeriod") && (
                  <p className="mt-1 text-sm text-red-400">
                    {fieldError("constructionPeriod")}
                  </p>
                )}
                <AiHintBox
                  className="mt-6"
                  title="AI Construction Period Recommendation"
                >
                  {aiData?.hints?.construction_period_text ||
                    aiC1?.construction_period?.justification ||
                    `For a ${isSaleLandedProduct ? "landed" : "high-rise"} with ${
                      isSaleLandedProduct
                        ? projectInfo.salesLandedUpperFloors ||
                          projectInfo.buildingConfig.towerFloors
                        : projectInfo.salesHighRiseUpperFloors ||
                          projectInfo.buildingConfig.towerFloors
                    } floors in ${projectInfo.city}, a reasonable range is ${
                      aiC1?.construction_period?.range || "18-24"
                    } months.`}
                </AiHintBox>
              </div>
            </div>
          )}

          {/* Step 12: Construction Stages */}
          {currentStep === 11 && (
            <div>
              {renderSaleBenchmarkBar({
                hasManualOverride: isStep12Manual,
                onReset:
                  isStep12Manual &&
                  (benchStage1 != null ||
                    benchStage2 != null ||
                    benchStage3 != null ||
                    benchStage4 != null)
                    ? handleResetStep12
                    : undefined,
              })}

              <h2 className="text-xl font-semibold text-white mb-4">
                Construction Stages (M0 to Finishes)
              </h2>
              <p className="text-sm text-slate-400 mb-6">
                Break down CC% (construction cost including contingency) into
                stages. Percentages must sum to 100%.
              </p>

              <div className="space-y-6">
                <div className="grid grid-cols-5 gap-2 text-xs text-slate-400 mb-4 text-center">
                  <div className="col-span-1">
                    <span className="block font-semibold text-slate-300">M0</span>
                    Design, authority, early enabling.
                  </div>
                  <div className="col-span-1">
                    <span className="block font-semibold text-slate-300">
                      Enabling
                    </span>
                    Shoring, piling, early works.
                  </div>
                  <div className="col-span-1">
                    <span className="block font-semibold text-slate-300">
                      Sub-Structure
                    </span>
                    Basements, foundations.
                  </div>
                  <div className="col-span-1">
                    <span className="block font-semibold text-slate-300">
                      Super Structure
                    </span>
                    Podium, typical floors.
                  </div>
                  <div className="col-span-1">
                    <span className="block font-semibold text-slate-300">
                      Finishes
                    </span>
                    Façade, MEP, fit-out.
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1">
                      Stage 1 Label
                    </label>
                    <input
                      type="text"
                      value={cashOutflows.stageAllocation.stage1Label}
                      onChange={(e) =>
                        updateFormData("stage1Label", e.target.value)
                      }
                      className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                    <div className="mt-2">
                      <AiInput
                        label="Stage 1 (% of CC%)"
                        type="percentage"
                        value={cashOutflows.stageAllocation.stage1Percent}
                        onChange={(v) =>
                          updateFormData("stage1Percent", Number(v) || 0)
                        }
                        isAiGenerated={!!aiScurve?.stage_1_pct}
                        isManualOverride={isRateOverride(
                          cashOutflows.stageAllocation.stage1Percent,
                          benchStage1
                        )}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1">
                      Stage 2 Label
                    </label>
                    <input
                      type="text"
                      value={cashOutflows.stageAllocation.stage2Label}
                      onChange={(e) =>
                        updateFormData("stage2Label", e.target.value)
                      }
                      className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                    <div className="mt-2">
                      <AiInput
                        label="Stage 2 (% of CC%)"
                        type="percentage"
                        value={cashOutflows.stageAllocation.stage2Percent}
                        onChange={(v) =>
                          updateFormData("stage2Percent", Number(v) || 0)
                        }
                        isAiGenerated={!!aiScurve?.stage_2_pct}
                        isManualOverride={isRateOverride(
                          cashOutflows.stageAllocation.stage2Percent,
                          benchStage2
                        )}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1">
                      Stage 3 Label
                    </label>
                    <input
                      type="text"
                      value={cashOutflows.stageAllocation.stage3Label}
                      onChange={(e) =>
                        updateFormData("stage3Label", e.target.value)
                      }
                      className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                    <div className="mt-2">
                      <AiInput
                        label="Stage 3 (% of CC%)"
                        type="percentage"
                        value={cashOutflows.stageAllocation.stage3Percent}
                        onChange={(v) =>
                          updateFormData("stage3Percent", Number(v) || 0)
                        }
                        isAiGenerated={!!aiScurve?.stage_3_pct}
                        isManualOverride={isRateOverride(
                          cashOutflows.stageAllocation.stage3Percent,
                          benchStage3
                        )}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1">
                      Stage 4 Label
                    </label>
                    <input
                      type="text"
                      value={cashOutflows.stageAllocation.stage4Label || ""}
                      onChange={(e) =>
                        updateFormData("stage4Label", e.target.value)
                      }
                      className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                    <div className="mt-2">
                      <AiInput
                        label="Stage 4 (% of CC%)"
                        type="percentage"
                        value={cashOutflows.stageAllocation.stage4Percent ?? 0}
                        onChange={(v) =>
                          updateFormData("stage4Percent", Number(v) || 0)
                        }
                        isAiGenerated={!!aiScurve?.stage_4_pct}
                        isManualOverride={isRateOverride(
                          cashOutflows.stageAllocation.stage4Percent ?? 0,
                          benchStage4
                        )}
                      />
                    </div>
                  </div>
                </div>

                <p className="text-sm text-slate-300 mt-4">
                  Total Allocation:{" "}
                  <span
                    className={`font-semibold ${
                      cashOutflows.stageAllocation.stage1Percent +
                        cashOutflows.stageAllocation.stage2Percent +
                        cashOutflows.stageAllocation.stage3Percent +
                        cashOutflows.stageAllocation.stage4Percent ===
                      100
                        ? "text-emerald-400"
                        : "text-red-400"
                    }`}
                  >
                    {(
                      cashOutflows.stageAllocation.stage1Percent +
                      cashOutflows.stageAllocation.stage2Percent +
                      cashOutflows.stageAllocation.stage3Percent +
                      cashOutflows.stageAllocation.stage4Percent
                    ).toFixed(1)}
                    %
                  </span>
                  {fieldError("stages") && (
                    <span className="text-red-400 ml-2">
                      {fieldError("stages")}
                    </span>
                  )}
                </p>
              </div>
            </div>
          )}

          {/* Step 13: POWC & SC Allocation + Summary */}
          {currentStep === 12 && (
            <div className="space-y-8">
              {renderSaleBenchmarkBar({
                hasManualOverride: isStep13Manual,
                onReset:
                  isStep13Manual && (aiPowcBreakdown || aiScBreakdown)
                    ? resetAllocationsToBenchmark
                    : undefined,
              })}
              <div>
                <h2 className="text-xl font-semibold text-white mb-4">
                  Detailed Allocation & Summary
                </h2>
                <p className="text-sm text-slate-400 mb-4">
                  Define how POWC is distributed over the programme, review standard SC
                  allocation, then confirm all inputs before generating the model.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <AIRecommendationBox
                    title="POWC Allocation"
                    source={`Based on 2024 ${projectInfo.city || "market"} ${projectInfo.buildingType || "residential"} data`}
                    sourceDetail={`Source: ${getBenchmarkSource(projectInfo.country, projectInfo.city)}`}
                    explanation={`Step 12 timing: ${POWC_STEP13_TIMING_NOTES}`}
                  >
                    <div className="space-y-4">
                      {(() => {
                        const powcAlloc =
                          cashOutflows.powcAllocation ?? {
                            ...DEFAULT_POWC_ALLOCATION,
                          };
                        const powcTotal =
                          powcAlloc.siteEstablishment +
                          powcAlloc.overhead +
                          powcAlloc.authorityFees;

                        const aiSite = aiPowcBreakdown?.site_establishment_pct;
                        const aiOverhead = aiPowcBreakdown?.overhead_pct;
                        const aiAuthority = aiPowcBreakdown?.authority_fees_pct;

                        const siteMatchesAi =
                          aiSite != null &&
                          !isRateOverride(powcAlloc.siteEstablishment, aiSite);
                        const overheadMatchesAi =
                          aiOverhead != null &&
                          !isRateOverride(powcAlloc.overhead, aiOverhead);
                        const authorityMatchesAi =
                          aiAuthority != null &&
                          !isRateOverride(powcAlloc.authorityFees, aiAuthority);

                        const allocInputClass = (matchesAi: boolean, hasAi: boolean) =>
                          `w-20 rounded bg-slate-800 px-3 py-2 text-right text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 ${
                            matchesAi
                              ? "border-2 border-blue-500"
                              : hasAi
                                ? "border-2 border-amber-500"
                                : "border border-slate-600"
                          }`;

                        return (
                          <>
                            <div className="flex items-center justify-between rounded-lg bg-slate-900/50 p-3">
                              <div>
                                <label className="text-sm font-medium text-slate-200">
                                  Site Establishment
                                </label>
                                <p className="mt-1 text-xs text-slate-500">
                                  Mobilization, temporary facilities, site prep
                                </p>
                              </div>
                              <div className="flex items-center gap-2">
                                <input
                                  type="number"
                                  min={0}
                                  max={100}
                                  value={powcAlloc.siteEstablishment}
                                  onChange={(e) => {
                                    const newValue =
                                      parseFloat(e.target.value) || 0;
                                    updateCashOutflowsForStream({
                                      powcAllocation: {
                                        ...powcAlloc,
                                        siteEstablishment: newValue,
                                      },
                                    });
                                  }}
                                  className={allocInputClass(
                                    siteMatchesAi,
                                    aiSite != null
                                  )}
                                />
                                {aiSite != null && (
                                  <span
                                    className={`rounded-full px-1.5 py-0.5 text-[10px] font-medium ${
                                      siteMatchesAi
                                        ? "bg-blue-500/20 text-blue-400"
                                        : "bg-amber-500/20 text-amber-400"
                                    }`}
                                  >
                                    {siteMatchesAi ? "AI" : "Override"}
                                  </span>
                                )}
                                <span className="text-slate-400">%</span>
                              </div>
                            </div>
                            <div className="flex items-center justify-between rounded-lg bg-slate-900/50 p-3">
                              <div>
                                <label className="text-sm font-medium text-slate-200">
                                  Overhead Costs
                                </label>
                                <p className="mt-1 text-xs text-slate-500">
                                  Admin, HSE, Management, site staff
                                </p>
                              </div>
                              <div className="flex items-center gap-2">
                                <input
                                  type="number"
                                  min={0}
                                  max={100}
                                  value={powcAlloc.overhead}
                                  onChange={(e) => {
                                    const newValue =
                                      parseFloat(e.target.value) || 0;
                                    updateCashOutflowsForStream({
                                      powcAllocation: {
                                        ...powcAlloc,
                                        overhead: newValue,
                                      },
                                    });
                                  }}
                                  className={allocInputClass(
                                    overheadMatchesAi,
                                    aiOverhead != null
                                  )}
                                />
                                {aiOverhead != null && (
                                  <span
                                    className={`rounded-full px-1.5 py-0.5 text-[10px] font-medium ${
                                      overheadMatchesAi
                                        ? "bg-blue-500/20 text-blue-400"
                                        : "bg-amber-500/20 text-amber-400"
                                    }`}
                                  >
                                    {overheadMatchesAi ? "AI" : "Override"}
                                  </span>
                                )}
                                <span className="text-slate-400">%</span>
                              </div>
                            </div>
                            <div className="flex items-center justify-between rounded-lg bg-slate-900/50 p-3">
                              <div>
                                <label className="text-sm font-medium text-slate-200">
                                  Authority Fees
                                </label>
                                <p className="mt-1 text-xs text-slate-500">
                                  Telco, power, water, drainage, permits
                                </p>
                              </div>
                              <div className="flex items-center gap-2">
                                <input
                                  type="number"
                                  min={0}
                                  max={100}
                                  value={powcAlloc.authorityFees}
                                  onChange={(e) => {
                                    const newValue =
                                      parseFloat(e.target.value) || 0;
                                    updateCashOutflowsForStream({
                                      powcAllocation: {
                                        ...powcAlloc,
                                        authorityFees: newValue,
                                      },
                                    });
                                  }}
                                  className={allocInputClass(
                                    authorityMatchesAi,
                                    aiAuthority != null
                                  )}
                                />
                                {aiAuthority != null && (
                                  <span
                                    className={`rounded-full px-1.5 py-0.5 text-[10px] font-medium ${
                                      authorityMatchesAi
                                        ? "bg-blue-500/20 text-blue-400"
                                        : "bg-amber-500/20 text-amber-400"
                                    }`}
                                  >
                                    {authorityMatchesAi ? "AI" : "Override"}
                                  </span>
                                )}
                                <span className="text-slate-400">%</span>
                              </div>
                            </div>
                            <div className="flex items-center justify-between border-t border-slate-700 pt-4">
                              <label className="text-sm font-semibold text-slate-200">
                                Total
                              </label>
                              <div className="flex items-center gap-2">
                                <span
                                  className={`font-semibold ${
                                    powcTotal === 100
                                      ? "text-emerald-400"
                                      : "text-amber-400"
                                  }`}
                                >
                                  {powcTotal.toFixed(1)}%
                                </span>
                                <span className="text-slate-400">%</span>
                                {powcTotal === 100 ? (
                                  <span className="text-sm text-emerald-400">
                                    ✅
                                  </span>
                                ) : (
                                  <span className="text-sm text-amber-400">
                                    ⚠️ Must equal 100%
                                  </span>
                                )}
                              </div>
                            </div>
                            {fieldError("powcAllocation") && (
                              <p className="text-sm text-red-400">
                                {fieldError("powcAllocation")}
                              </p>
                            )}
                          </>
                        );
                      })()}
                    </div>
                  </AIRecommendationBox>

                  <AIRecommendationBox
                    title="Soft Costs Allocation"
                    source={`Based on 2024 ${projectInfo.city || "market"} ${projectInfo.buildingType || "residential"} data`}
                    sourceDetail={`Source: ${getBenchmarkSource(projectInfo.country, projectInfo.city)}`}
                    explanation={`Percentages below are shares of total soft costs (Step 12). Aggregate cash timing: ${SOFT_COSTS_TIMING_NOTES}`}
                  >
                    <div className="space-y-4">
                      {(() => {
                        const softAlloc =
                          cashOutflows.softCostAllocation ?? {
                            ...DEFAULT_SOFT_COST_ALLOCATION,
                          };
                        const softCostsTotal =
                          softAlloc.architect +
                          softAlloc.projectManagement +
                          softAlloc.engineering +
                          softAlloc.geotechnical +
                          softAlloc.otherFees;

                        const aiArchitect = aiScBreakdown?.architect_pct;
                        const aiPm = aiScBreakdown?.pm_pct;
                        const aiEngineering = aiScBreakdown?.engineering_pct;
                        const aiGeotech = aiScBreakdown?.geotech_pct;
                        const aiOther = aiScBreakdown?.other_pct;

                        const architectMatchesAi =
                          aiArchitect != null &&
                          !isRateOverride(softAlloc.architect, aiArchitect);
                        const pmMatchesAi =
                          aiPm != null &&
                          !isRateOverride(softAlloc.projectManagement, aiPm);
                        const engineeringMatchesAi =
                          aiEngineering != null &&
                          !isRateOverride(softAlloc.engineering, aiEngineering);
                        const geotechMatchesAi =
                          aiGeotech != null &&
                          !isRateOverride(softAlloc.geotechnical, aiGeotech);
                        const otherMatchesAi =
                          aiOther != null &&
                          !isRateOverride(softAlloc.otherFees, aiOther);

                        const allocInputClass = (
                          matchesAi: boolean,
                          hasAi: boolean
                        ) =>
                          `w-20 rounded bg-slate-800 px-3 py-2 text-right text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 ${
                            matchesAi
                              ? "border-2 border-blue-500"
                              : hasAi
                                ? "border-2 border-amber-500"
                                : "border border-slate-600"
                          }`;

                        const renderBadge = (
                          matchesAi: boolean,
                          hasAi: boolean
                        ) =>
                          hasAi ? (
                            <span
                              className={`rounded-full px-1.5 py-0.5 text-[10px] font-medium ${
                                matchesAi
                                  ? "bg-blue-500/20 text-blue-400"
                                  : "bg-amber-500/20 text-amber-400"
                              }`}
                            >
                              {matchesAi ? "AI" : "Override"}
                            </span>
                          ) : null;

                        return (
                          <>
                            <div className="flex items-center justify-between rounded-lg bg-slate-900/50 p-3">
                              <div>
                                <label className="text-sm font-medium text-slate-200">
                                  Main Architect
                                </label>
                                <p className="mt-1 text-xs text-slate-500">
                                  Design, drawings, site supervision
                                </p>
                              </div>
                              <div className="flex items-center gap-2">
                                <input
                                  type="number"
                                  min={0}
                                  max={100}
                                  value={softAlloc.architect}
                                  onChange={(e) => {
                                    const newValue =
                                      parseFloat(e.target.value) || 0;
                                    updateCashOutflowsForStream({
                                      softCostAllocation: {
                                        ...softAlloc,
                                        architect: newValue,
                                      },
                                    });
                                  }}
                                  className={allocInputClass(
                                    architectMatchesAi,
                                    aiArchitect != null
                                  )}
                                />
                                {renderBadge(
                                  architectMatchesAi,
                                  aiArchitect != null
                                )}
                                <span className="text-slate-400">%</span>
                              </div>
                            </div>
                            <div className="flex items-center justify-between rounded-lg bg-slate-900/50 p-3">
                              <div>
                                <label className="text-sm font-medium text-slate-200">
                                  Project Management
                                </label>
                                <p className="mt-1 text-xs text-slate-500">
                                  Owner&apos;s rep, coordination, reporting
                                </p>
                              </div>
                              <div className="flex items-center gap-2">
                                <input
                                  type="number"
                                  min={0}
                                  max={100}
                                  value={softAlloc.projectManagement}
                                  onChange={(e) => {
                                    const newValue =
                                      parseFloat(e.target.value) || 0;
                                    updateCashOutflowsForStream({
                                      softCostAllocation: {
                                        ...softAlloc,
                                        projectManagement: newValue,
                                      },
                                    });
                                  }}
                                  className={allocInputClass(
                                    pmMatchesAi,
                                    aiPm != null
                                  )}
                                />
                                {renderBadge(pmMatchesAi, aiPm != null)}
                                <span className="text-slate-400">%</span>
                              </div>
                            </div>
                            <div className="flex items-center justify-between rounded-lg bg-slate-900/50 p-3">
                              <div>
                                <label className="text-sm font-medium text-slate-200">
                                  Engineering Consultant
                                </label>
                                <p className="mt-1 text-xs text-slate-500">
                                  Structural, MEP, civil engineering
                                </p>
                              </div>
                              <div className="flex items-center gap-2">
                                <input
                                  type="number"
                                  min={0}
                                  max={100}
                                  value={softAlloc.engineering}
                                  onChange={(e) => {
                                    const newValue =
                                      parseFloat(e.target.value) || 0;
                                    updateCashOutflowsForStream({
                                      softCostAllocation: {
                                        ...softAlloc,
                                        engineering: newValue,
                                      },
                                    });
                                  }}
                                  className={allocInputClass(
                                    engineeringMatchesAi,
                                    aiEngineering != null
                                  )}
                                />
                                {renderBadge(
                                  engineeringMatchesAi,
                                  aiEngineering != null
                                )}
                                <span className="text-slate-400">%</span>
                              </div>
                            </div>
                            <div className="flex items-center justify-between rounded-lg bg-slate-900/50 p-3">
                              <div>
                                <label className="text-sm font-medium text-slate-200">
                                  Geotechnical Consultant
                                </label>
                                <p className="mt-1 text-xs text-slate-500">
                                  Soil investigation, foundation recommendations
                                </p>
                              </div>
                              <div className="flex items-center gap-2">
                                <input
                                  type="number"
                                  min={0}
                                  max={100}
                                  value={softAlloc.geotechnical}
                                  onChange={(e) => {
                                    const newValue =
                                      parseFloat(e.target.value) || 0;
                                    updateCashOutflowsForStream({
                                      softCostAllocation: {
                                        ...softAlloc,
                                        geotechnical: newValue,
                                      },
                                    });
                                  }}
                                  className={allocInputClass(
                                    geotechMatchesAi,
                                    aiGeotech != null
                                  )}
                                />
                                {renderBadge(
                                  geotechMatchesAi,
                                  aiGeotech != null
                                )}
                                <span className="text-slate-400">%</span>
                              </div>
                            </div>
                            <div className="flex items-center justify-between rounded-lg bg-slate-900/50 p-3">
                              <div>
                                <label className="text-sm font-medium text-slate-200">
                                  Other Fees
                                </label>
                                <p className="mt-1 text-xs text-slate-500">
                                  Legal, insurance, marketing, miscellaneous
                                </p>
                              </div>
                              <div className="flex items-center gap-2">
                                <input
                                  type="number"
                                  min={0}
                                  max={100}
                                  value={softAlloc.otherFees}
                                  onChange={(e) => {
                                    const newValue =
                                      parseFloat(e.target.value) || 0;
                                    updateCashOutflowsForStream({
                                      softCostAllocation: {
                                        ...softAlloc,
                                        otherFees: newValue,
                                      },
                                    });
                                  }}
                                  className={allocInputClass(
                                    otherMatchesAi,
                                    aiOther != null
                                  )}
                                />
                                {renderBadge(otherMatchesAi, aiOther != null)}
                                <span className="text-slate-400">%</span>
                              </div>
                            </div>
                            <div className="flex items-center justify-between border-t border-slate-700 pt-4">
                              <label className="text-sm font-semibold text-slate-200">
                                Total
                              </label>
                              <div className="flex items-center gap-2">
                                <span
                                  className={`font-semibold ${
                                    softCostsTotal === 100
                                      ? "text-emerald-400"
                                      : "text-amber-400"
                                  }`}
                                >
                                  {softCostsTotal.toFixed(1)}%
                                </span>
                                <span className="text-slate-400">%</span>
                                {softCostsTotal === 100 ? (
                                  <span className="text-sm text-emerald-400">
                                    ✅
                                  </span>
                                ) : (
                                  <span className="text-sm text-amber-400">
                                    ⚠️ Must equal 100%
                                  </span>
                                )}
                              </div>
                            </div>
                            {fieldError("softCostAllocation") && (
                              <p className="text-sm text-red-400">
                                {fieldError("softCostAllocation")}
                              </p>
                            )}
                          </>
                        );
                      })()}
                    </div>
                  </AIRecommendationBox>
                </div>
              </div>

              {/* Summary */}
              <div className="border-t border-slate-800 pt-6">
                <h3 className="text-lg font-semibold text-white mb-4">
                  Summary: Cash Outflows Inputs
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div className="space-y-1">
                    <p className="text-slate-300">
                      <span className="text-slate-400">Location:</span>{" "}
                      {projectInfo.city || "—"},{" "}
                      {projectInfo.country || "—"}
                    </p>
                    <p className="text-slate-300">
                      <span className="text-slate-400">Currency:</span>{" "}
                      {projectInfo.currency}
                    </p>
                    <p className="text-slate-300">
                      <span className="text-slate-400">Building Type:</span>{" "}
                      {projectInfo.buildingType}
                    </p>
                    <p className="text-slate-300">
                      <span className="text-slate-400">Configuration:</span>{" "}
                      {projectInfo.buildingConfig.basements}B / {projectInfo.buildingConfig.podiumFloors}P /{" "}
                      {projectInfo.buildingConfig.towerFloors}T
                    </p>
                    {projectInfo.buildingConfig.hasRetailComponent && (
                      <p className="text-slate-300">
                        <span className="text-slate-400">
                          Retail Component:
                        </span>{" "}
                        {projectInfo.buildingConfig.retailPercentage}% of podium/ground BUA
                      </p>
                    )}
                    <p className="text-slate-300">
                      <span className="text-slate-400">Construction Period:</span>{" "}
                      {cashOutflows.constructionPeriod} months
                    </p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-slate-300">
                      <span className="text-slate-400">CC% (incl. contingency):</span>{" "}
                      {ccWithContingency.toLocaleString(undefined, {
                        maximumFractionDigits: 0,
                      })}{" "}
                      {projectInfo.currency}
                    </p>
                    <p className="text-slate-300">
                      <span className="text-slate-400">Soft Costs (SC):</span>{" "}
                      {softCosts.toLocaleString(undefined, {
                        maximumFractionDigits: 0,
                      })}{" "}
                      {projectInfo.currency} ({cashOutflows.softCostPercent}%)
                    </p>
                    <p className="text-slate-300">
                      <span className="text-slate-400">POWC:</span>{" "}
                      {powc.toLocaleString(undefined, {
                        maximumFractionDigits: 0,
                      })}{" "}
                      {projectInfo.currency} ({cashOutflows.powcPercent}%)
                    </p>
                    <p className="text-slate-300">
                      <span className="text-slate-400">Land Cost (LC):</span>{" "}
                      {landCost.toLocaleString(undefined, {
                        maximumFractionDigits: 0,
                      })}{" "}
                      {projectInfo.currency}
                    </p>
                    <p className="text-slate-300">
                      <span className="text-slate-400">TDC (DC + LC):</span>{" "}
                      <span className="font-semibold text-emerald-400">
                        {totalDevelopmentCost.toLocaleString(undefined, {
                          maximumFractionDigits: 0,
                        })}{" "}
                        {projectInfo.currency}
                      </span>
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

        </div>
      </div>

      <PreviewFloatingBar
        showDownload={false}
        previousDisabled={currentStep === 0}
        nextDisabled={isMapGeocoding}
        onPreviousClick={handleBack}
        onNextClick={handleNext}
        nextLabel={
          currentStep === totalSteps - 1 ? "Generate Model →" : "Next →"
        }
      />
    </div>
  );
}

export default function CashOutflowsPage() {
  return (
    <SearchParamsBoundary>
      <CashOutflowsPageContent />
    </SearchParamsBoundary>
  );
}
