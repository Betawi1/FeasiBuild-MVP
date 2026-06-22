"use client";

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
import type { HotelOperatingType } from "@/config/hotel-cost-profiles";
import {
  formatHotelProfileTooltip,
  inferHotelProfileRegion,
  isValidHotelCombo,
  resolveHotelProfile,
} from "@/config/hotel-cost-profiles";
import useFinModelStore, {
  type CashOutflows,
  type ProjectInfo,
} from "@/store/useFinModelStore";
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
  streamKeyFromPrefix,
  useStreamPrefix,
  withStreamPrefix,
} from "@/lib/stream-path";

type Errors = Record<string, string>;

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
  { code: "KW", name: "Kuwait", currency: "KWD" as const, cities: ["Kuwait City", "Hawalli", "Salmiya", "Ahmadi"] },
  { code: "QA", name: "Qatar", currency: "QAR" as const, cities: ["Doha", "Al Rayyan", "Al Wakrah", "Al Khor"] },
  { code: "BH", name: "Bahrain", currency: "BHD" as const, cities: ["Manama", "Riffa", "Muharraq", "Hamad Town"] },
  { code: "OM", name: "Oman", currency: "OMR" as const, cities: ["Muscat", "Salalah", "Sohar", "Nizwa"] },
  { code: "GB", name: "United Kingdom", currency: "GBP" as const, cities: ["London", "Manchester", "Birmingham", "Edinburgh"] },
  { code: "MY", name: "Malaysia", currency: "MYR" as const, cities: ["Kuala Lumpur", "Penang", "Johor Bahru", "Kota Kinabalu"] },
  { code: "US", name: "United States", currency: "USD" as const, cities: ["New York", "Los Angeles", "Miami", "San Francisco"] },
];

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

/** Operational / hold stream: Step 3 — income-producing asset archetypes (maps to same store keys). */
const OPERATIONAL_BUILDING_TYPES: {
  value: ProjectInfo["buildingType"];
  label: string;
  /** One-line blurb shown on the card; `title` is the longer native tooltip. */
  hint: string;
  title: string;
}[] = [
  {
    value: "hotel",
    label: "Hotel / Hospitality",
    hint: "Hotels, resorts, extended-stay — ops-led NOI.",
    title:
      "Income-producing hotel, resort, or extended-stay asset held on balance sheet (ops-driven cash flows).",
  },
  {
    value: "retail",
    label: "Shopping Mall / Retail",
    hint: "Malls, retail podiums — recurring retail rent.",
    title:
      "Mall, retail podium, or large-format retail held for recurring rental income.",
  },
  {
    value: "office",
    label: "Office (stabilized)",
    hint: "Grade-A or business-park office — lease income.",
    title:
      "Office tower or business park held for lease income after stabilization.",
  },
  {
    value: "residential",
    label: "Residential (BTR / multi-family)",
    hint: "BTR, multifamily hold — recurring residential rent.",
    title:
      "Build-to-rent, multi-family residential, or long-hold residential income (not for-sale inventory).",
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
  if (c.includes("united states") || c.includes("new york")) return "RSMeans / US Benchmarks";
  return "Industry benchmarks";
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

const HOTEL_OPERATING_TYPE_CARDS: {
  value: HotelOperatingType;
  icon: string;
  label: string;
  hint: string;
  title: string;
}[] = [
  {
    value: "business",
    icon: "💼",
    label: "Business / Upscale",
    hint: "Full-service, conference, corporate demand.",
    title: "Business and upscale full-service hotels (3–5★ in this model).",
  },
  {
    value: "resort",
    icon: "🏖️",
    label: "Resort / Leisure",
    hint: "Pool, F&B, destination leisure.",
    title: "Resort and leisure hotels (4–5★ in this model).",
  },
  {
    value: "boutique",
    icon: "✨",
    label: "Boutique / Lifestyle",
    hint: "Design-led, smaller key count.",
    title: "Boutique and lifestyle hotels (3–4★ in this model).",
  },
  {
    value: "budget",
    icon: "🏨",
    label: "Budget / Economy",
    hint: "Limited service, lean FF&E.",
    title: "Economy and limited-service hotels (1★ in this model).",
  },
];

const HOTEL_STARS_BY_TYPE: Record<HotelOperatingType, number[]> = {
  budget: [1],
  boutique: [3, 4],
  business: [3, 4, 5],
  resort: [4, 5],
};

function CashOutflowsPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const streamPrefix = useStreamPrefix();
  const finStream = streamKeyFromPrefix(streamPrefix);
  const isOperationalStream = streamPrefix === "/operational";
  const operationalHotelProfilePrevKeyRef = useRef<string | null>(null);
  const buildingTypeOptions = isOperationalStream
    ? OPERATIONAL_BUILDING_TYPES
    : SALE_BUILDING_SUBTYPES;
  const projectInfo = useFinModelStore((s) => s[finStream].projectInfo);
  const cashOutflows = useFinModelStore((s) => s[finStream].cashOutflows);
  const isOperationalHotel =
    isOperationalStream && projectInfo.buildingType === "hotel";
  const patchUpdateProjectInfo = useFinModelStore((s) => s.updateProjectInfo);
  const patchUpdateCashOutflows = useFinModelStore((s) => s.updateCashOutflows);
  const updateProjectInfoForStream = useCallback(
    (data: Partial<ProjectInfo>) => patchUpdateProjectInfo(data, finStream),
    [patchUpdateProjectInfo, finStream]
  );
  const updateCashOutflowsForStream = useCallback(
    (data: Partial<CashOutflows>) => patchUpdateCashOutflows(data, finStream),
    [patchUpdateCashOutflows, finStream]
  );

  const [currentStep, setCurrentStep] = useState(0);
  const [errors, setErrors] = useState<Errors>({});

  /** Avoid clobbering edits; `type="number"` + `Number(x) || 0` was persisting 0 mid-typing. */
  const constructionPeriodFocusedRef = useRef(false);
  const [constructionPeriodDraft, setConstructionPeriodDraft] = useState(() =>
    String(cashOutflows.constructionPeriod)
  );

  const totalSteps = 13; // 0-12

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

    // UI shows "Step 1..14"; internal state is 0..13
    const desired = Math.min(totalSteps - 1, Math.max(0, Math.round(parsed) - 1));
    setCurrentStep(desired);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
      if (field === "stage1Label" || field === "stage1Percent" || field === "stage2Label" || field === "stage2Percent" || field === "stage3Label" || field === "stage3Percent") {
        updateCashOutflowsForStream({
          stageAllocation: { ...cashOutflows.stageAllocation, [field]: value },
        });
      } else {
        updateCashOutflowsForStream({ [field]: value });
      }
    }
  };

  // Derived calculations (from store state)
  const buildingCost = cashOutflows.buildingBUA * cashOutflows.buildingRate;
  const parkingCost = cashOutflows.parkingBUA * cashOutflows.parkingRate;
  const basementCost = cashOutflows.basementBUA * cashOutflows.basementRate;

  const landedTotalSaleableLandArea =
    (projectInfo.buildingConfig.landedUnits ?? 0) *
    (projectInfo.buildingConfig.landedLandAreaPerUnit ?? 0);
  const landedTotalLandArea =
    landedTotalSaleableLandArea > 0 ? landedTotalSaleableLandArea / 0.7 : 0;
  const infrastructureRate = cashOutflows.infrastructureRate ?? 0;
  const infrastructureCosts =
    streamPrefix === "/sale" ? infrastructureRate * landedTotalLandArea : 0;

  // Base construction cost (CC before contingency) — not the same as store `constructionCost`
  // after “Generate”, which is CC including contingency.
  const baseCC = buildingCost + parkingCost + basementCost + infrastructureCosts;
  const contingencyAmount =
    baseCC * (cashOutflows.contingencyPercent / 100);
  const ccWithContingency = baseCC + contingencyAmount; // CC incl. contingency (CC%)

  // SC, POWC, and (hotel) FFE % inputs apply to CC including contingency (CC%), not base CC alone.
  const softCosts =
    ccWithContingency * (cashOutflows.softCostPercent / 100);
  const powc =
    ccWithContingency * (cashOutflows.powcPercent / 100);

  const ffe =
    projectInfo.buildingType === "hotel"
      ? ccWithContingency * (cashOutflows.ffePercent / 100)
      : 0;

  const developmentCost = ccWithContingency + softCosts + powc + ffe; // DC
  const landCost = cashOutflows.landArea * cashOutflows.landRate; // LC
  const totalDevelopmentCost = developmentCost + landCost; // TDC

  const landToTdcRatio =
    totalDevelopmentCost > 0 ? (landCost / totalDevelopmentCost) * 100 : 0;
  const dcToTdcRatio =
    totalDevelopmentCost > 0 ? (developmentCost / totalDevelopmentCost) * 100 : 0;

  const operationalHotelProfileUi = useMemo(() => {
    if (!isOperationalHotel) return null;
    const op = projectInfo.hotelOperatingType;
    if (!op) return null;
    const star = Number(projectInfo.hotelStarRating);
    if (!isValidHotelCombo(op, star).valid) return null;
    const { key, profile } = resolveHotelProfile(
      op as HotelOperatingType,
      star,
      projectInfo.country,
      projectInfo.city
    );
    const region = inferHotelProfileRegion(projectInfo.country, projectInfo.city);
    const tooltipBase = formatHotelProfileTooltip(key, profile);
    const tooltip = `${tooltipBase}\nRegion bucket: ${region}`;
    return { key, profile, region, tooltip };
  }, [
    isOperationalHotel,
    projectInfo.hotelOperatingType,
    projectInfo.hotelStarRating,
    projectInfo.country,
    projectInfo.city,
  ]);

  useEffect(() => {
    if (!isOperationalHotel || currentStep !== 7) return;
    const op = projectInfo.hotelOperatingType;
    if (!op) return;
    const star = Number(projectInfo.hotelStarRating);
    if (!isValidHotelCombo(op, star).valid) return;
    if (baseCC <= 0 || ccWithContingency <= 0) return;

    const { key, profile } = resolveHotelProfile(
      op as HotelOperatingType,
      star,
      projectInfo.country,
      projectInfo.city
    );
    const dcModel = ccWithContingency / profile.cc;
    const softPct = ((profile.sc * dcModel) / ccWithContingency) * 100;
    const powcPct = ((profile.powc * dcModel) / ccWithContingency) * 100;
    const ffePct = ((profile.ffe * dcModel) / ccWithContingency) * 100;

    const prev = operationalHotelProfilePrevKeyRef.current;
    const keyChanged = prev !== null && prev !== key;
    operationalHotelProfilePrevKeyRef.current = key;

    const st = useFinModelStore.getState()[finStream].cashOutflows;
    const patch: Partial<CashOutflows> = { operationalHotelProfileKey: key };

    if (keyChanged) {
      patch.operationalHotelScManual = false;
      patch.operationalHotelPowcManual = false;
      patch.operationalHotelFfeManual = false;
      patch.softCostPercent = round2(softPct);
      patch.powcPercent = round2(powcPct);
      patch.ffePercent = round2(ffePct);
    } else {
      if (!st.operationalHotelScManual) patch.softCostPercent = round2(softPct);
      if (!st.operationalHotelPowcManual) patch.powcPercent = round2(powcPct);
      if (!st.operationalHotelFfeManual) patch.ffePercent = round2(ffePct);
    }

    if (keyChanged) {
      updateCashOutflowsForStream(patch);
      return;
    }

    const pctDiff = (next: number | undefined, cur: number) =>
      next !== undefined && Math.abs(next - cur) > 0.004;

    if (
      pctDiff(patch.softCostPercent, st.softCostPercent) ||
      pctDiff(patch.powcPercent, st.powcPercent) ||
      pctDiff(patch.ffePercent, st.ffePercent) ||
      patch.operationalHotelProfileKey !== st.operationalHotelProfileKey
    ) {
      updateCashOutflowsForStream(patch);
    }
  }, [
    isOperationalHotel,
    currentStep,
    projectInfo.hotelOperatingType,
    projectInfo.hotelStarRating,
    projectInfo.country,
    projectInfo.city,
    baseCC,
    ccWithContingency,
    updateCashOutflowsForStream,
    finStream,
  ]);

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
      if (bc.basements < 0)
        newErrors.basements = "Basements cannot be negative.";
      if (bc.podiumFloors < 0)
        newErrors.podiumFloors = "Podium/parking floors cannot be negative.";
      if (bc.towerFloors <= 0)
        newErrors.towerFloors = "Tower floors must be greater than 0.";
    }

    if (step === 4 && isOperationalHotel) {
      const op = projectInfo.hotelOperatingType ?? "";
      if (!op) {
        newErrors.hotelOperatingType = "Select a hotel operating segment.";
      }
      const star = Number(projectInfo.hotelStarRating);
      if (!Number.isFinite(star) || star <= 0) {
        newErrors.hotelStarRating = "Select a star rating for this segment.";
      } else if (op) {
        const combo = isValidHotelCombo(op, star);
        if (!combo.valid && combo.message) {
          newErrors.hotelStarRating = combo.message;
        }
      }
    }

    if (
      step === 4 &&
      (projectInfo.buildingType === "residential" ||
        projectInfo.buildingType === "office")
    ) {
      if (bc.hasRetailComponent) {
        if (bc.retailPercentage <= 0 || bc.retailPercentage > 50) {
          newErrors.retailPercentage =
            "Retail percentage should be between 1% and 50%.";
        }
      }
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
      if (projectInfo.buildingType === "hotel") {
        const ffeMax = isOperationalHotel ? 45 : 20;
        if (cashOutflows.ffePercent < 5 || cashOutflows.ffePercent > ffeMax) {
          newErrors.ffePercent = isOperationalHotel
            ? `FFE % for operational hotels is typically between 5% and ${ffeMax}% of CC incl. contingency (profile-driven ranges can be higher).`
            : "FFE % for hotels is typically between 5% and 20% of CC.";
        }
      }
    }

    if (step === 8) {
      if (cashOutflows.landArea <= 0)
        newErrors.landArea = "Land area must be greater than 0.";
      if (cashOutflows.landRate <= 0)
        newErrors.landRate = "Land rate must be greater than 0.";
    }

    if (step === 9) {
      if (landToTdcRatio > 51) {
        newErrors.landRatio =
          "Land/TDC should be ≤ 51%. Adjust land or development costs.";
      }
      if (dcToTdcRatio < 49) {
        newErrors.dcRatio =
          "Development/TDC should be ≥ 49%. Current balance is land-heavy.";
      }
    }

    if (step === 10) {
      const co = useFinModelStore.getState()[finStream].cashOutflows;
      if (co.constructionPeriod < 6 || co.constructionPeriod > 84) {
        newErrors.constructionPeriod =
          "Construction period should be between 6 and 84 months.";
      }
    }

    if (step === 11) {
      const sa = cashOutflows.stageAllocation;
      const totalStagePercent =
        sa.stage1Percent + sa.stage2Percent + sa.stage3Percent;
      if (totalStagePercent !== 100) {
        newErrors.stages = "Stage allocation must sum to 100% of CC%.";
      }
      if (
        sa.stage1Percent <= 0 ||
        sa.stage2Percent <= 0 ||
        sa.stage3Percent <= 0
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
      const ffe =
        projectInfo.buildingType === "hotel"
          ? constructionCost * (cashOutflows.ffePercent / 100)
          : 0;
      const developmentCost =
        constructionCost + softCosts + powc + ffe;
      const landCost =
        cashOutflows.landArea * cashOutflows.landRate;
      const tdc = developmentCost + landCost;

      updateCashOutflowsForStream({
        baseConstructionCost,
        constructionCost,
        landCost,
        softCosts,
        powc,
        ffe,
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
                  <select
                    value={projectInfo.country}
                    onChange={(e) => {
                      const name = e.target.value;
                      const country = COUNTRIES.find((c) => c.name === name);
                      updateProjectInfoForStream({
                        country: name,
                        city: "",
                        ...(country && { currency: country.currency }),
                      });
                    }}
                    className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="">Select country</option>
                    {COUNTRIES.map((c) => (
                      <option key={c.code} value={c.name}>
                        {c.name}
                      </option>
                    ))}
                  </select>
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
                  <select
                    value={projectInfo.city}
                    onChange={(e) => updateFormData("city", e.target.value)}
                    disabled={!projectInfo.country}
                    className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <option value="">Select city</option>
                    {(COUNTRIES.find((c) => c.name === projectInfo.country)?.cities ?? []).map((city) => (
                      <option key={city} value={city}>
                        {city}
                      </option>
                    ))}
                  </select>
                  {fieldError("city") && (
                    <p className="mt-1 text-sm text-red-400">
                      {fieldError("city")}
                    </p>
                  )}
                </div>
                {projectInfo.country && (
                  <p className="text-xs text-slate-500">
                    Currency auto-set to{" "}
                    <span className="text-emerald-400 font-medium">
                      {COUNTRIES.find((c) => c.name === projectInfo.country)?.currency ?? projectInfo.currency}
                    </span>{" "}
                    for {projectInfo.country}. You can change it in the next step if needed.
                  </p>
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
                  Project Currency
                </label>
                <select
                  value={projectInfo.currency}
                  onChange={(e) =>
                    updateFormData(
                      "currency",
                      e.target.value as ProjectInfo["currency"]
                    )
                  }
                  className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="AED">AED - UAE Dirham</option>
                  <option value="SAR">SAR - Saudi Riyal</option>
                  <option value="KWD">KWD - Kuwaiti Dinar</option>
                  <option value="QAR">QAR - Qatari Riyal</option>
                  <option value="BHD">BHD - Bahraini Dinar</option>
                  <option value="OMR">OMR - Omani Rial</option>
                  <option value="GBP">GBP - British Pound</option>
                  <option value="MYR">MYR - Malaysian Ringgit</option>
                  <option value="USD">USD - US Dollar</option>
                </select>
                {fieldError("currency") && (
                  <p className="mt-1 text-sm text-red-400">
                    {fieldError("currency")}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Building type (sale) / Operational asset type (hold) — Step 3 of 13 */}
          {currentStep === 2 && (
            <div>
              <p className="mb-1 text-xs font-medium uppercase tracking-wide text-slate-500">
                Step {currentStep + 1} of {totalSteps}
              </p>
              <h2 className="mb-6 text-xl font-semibold text-white">
                {isOperationalStream
                  ? "Operational asset type"
                  : "Building type"}
              </h2>
              <div className="space-y-4">
                <p className="text-sm text-slate-400">
                  {isOperationalStream
                    ? "Pick the income-producing asset class for this hold / operations project. Each card has a quick summary; hover for more detail."
                    : "Select the primary product sub-type for this for-sale development. Each card includes examples and key characteristics."}
                </p>
                <div
                  className={`grid gap-4 ${
                    isOperationalStream
                      ? "grid-cols-1 sm:grid-cols-2"
                      : "grid-cols-2"
                  }`}
                >
                  {buildingTypeOptions.map((opt) => {
                    if (isOperationalStream) {
                      const o = opt as (typeof OPERATIONAL_BUILDING_TYPES)[number];
                      const selected = projectInfo.buildingType === o.value;
                      const cardButton = (
                        <button
                          type="button"
                          onClick={() => updateFormData("buildingType", o.value)}
                          className={`w-full rounded-xl border p-5 text-left transition-all min-h-[112px] cursor-pointer shadow-sm ${
                            selected
                              ? "border-emerald-500 bg-emerald-500/15 text-emerald-100 ring-2 ring-emerald-500/40"
                              : "border-slate-600 bg-slate-800/80 text-slate-100 hover:border-slate-500 hover:bg-slate-800"
                          }`}
                        >
                          <span className="block text-base font-semibold leading-snug">
                            {o.label}
                          </span>
                          <span className="mt-2 block text-xs font-normal leading-relaxed text-slate-400">
                            {o.hint}
                          </span>
                        </button>
                      );
                      return (
                        <div key={o.value} className="min-w-0">
                          <HoverTipAbove tip={o.title}>{cardButton}</HoverTipAbove>
                        </div>
                      );
                    }

                    const s = opt as (typeof SALE_BUILDING_SUBTYPES)[number];
                    const selected = projectInfo.buildingSubType === s.id;
                    const card = (
                      <button
                        type="button"
                        onClick={() => {
                          updateProjectInfoForStream({
                            buildingType: s.baseType,
                            buildingSubType: s.id,
                          });
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

          {/* Building Configuration */}
          {currentStep === 3 && (
            <div>
              <h2 className="text-xl font-semibold text-white mb-6">
                Building Configuration
              </h2>
              {streamPrefix === "/sale" ? (() => {
                const sub = projectInfo.buildingSubType ?? "residential_landed";
                const activeTab =
                  sub === "residential_high_rise" || sub === "commercial_strata_office"
                    ? "highrise"
                    : "landed";

                const landedUnits = projectInfo.buildingConfig.landedUnits ?? 0;
                const landedLandAreaPerUnit =
                  projectInfo.buildingConfig.landedLandAreaPerUnit ?? 0;
                const landedBUAPerUnit = projectInfo.buildingConfig.landedBUAPerUnit ?? 0;

                const totalBUA = landedUnits * landedBUAPerUnit;
                const totalSaleableLand = landedUnits * landedLandAreaPerUnit;
                const totalLandArea = totalSaleableLand > 0 ? totalSaleableLand / 0.7 : 0;

                return (
                  <>
                    <div className="flex border-b border-slate-700 mb-6">
                      <div
                        className={`px-6 py-3 text-sm font-medium transition-colors ${
                          activeTab === "highrise"
                            ? "text-emerald-400 border-b-2 border-emerald-400 bg-emerald-500/5"
                            : "text-slate-500"
                        }`}
                      >
                        High-Rise Config
                      </div>
                      <div
                        className={`px-6 py-3 text-sm font-medium transition-colors ${
                          activeTab === "landed"
                            ? "text-emerald-400 border-b-2 border-emerald-400 bg-emerald-500/5"
                            : "text-slate-500"
                        }`}
                      >
                        Landed Config
                      </div>
                    </div>

                    <div className="mb-6 p-3 bg-slate-800/50 rounded-lg border border-slate-700">
                      <p className="text-sm text-slate-400">
                        ℹ️ Configuration form auto-selected based on Building Type from Step 3.
                        To change, go back to Step 3 and select a different building type.
                      </p>
                    </div>

                    {activeTab === "highrise" ? (
                      <div className="space-y-6">
                        <h3 className="text-lg font-semibold text-white">
                          Hi-Rise Residential & Strata Office Development Configuration
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-slate-300 mb-2">
                              Basements (No. of levels)
                            </label>
                            <input
                              type="number"
                              value={projectInfo.buildingConfig.basements}
                              min={0}
                              onChange={(e) =>
                                updateFormData("basements", Number(e.target.value) || 0)
                              }
                              className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                            />
                            {fieldError("basements") && (
                              <p className="mt-1 text-sm text-red-400">
                                {fieldError("basements")}
                              </p>
                            )}
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-slate-300 mb-2">
                              Podium / Parking Floors
                            </label>
                            <input
                              type="number"
                              value={projectInfo.buildingConfig.podiumFloors}
                              min={0}
                              onChange={(e) =>
                                updateFormData("podiumFloors", Number(e.target.value) || 0)
                              }
                              className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                            />
                            {fieldError("podiumFloors") && (
                              <p className="mt-1 text-sm text-red-400">
                                {fieldError("podiumFloors")}
                              </p>
                            )}
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-slate-300 mb-2">
                              Tower Floors
                            </label>
                            <input
                              type="number"
                              value={projectInfo.buildingConfig.towerFloors}
                              min={1}
                              onChange={(e) =>
                                updateFormData("towerFloors", Number(e.target.value) || 0)
                              }
                              className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                            />
                            {fieldError("towerFloors") && (
                              <p className="mt-1 text-sm text-red-400">
                                {fieldError("towerFloors")}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-6">
                        <h3 className="text-lg font-semibold text-white">
                          Landed Residential & Commercial Development Configuration
                        </h3>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-slate-300 mb-2">
                              Number of Units
                            </label>
                            <input
                              type="number"
                              value={landedUnits}
                              min={1}
                              onChange={(e) =>
                                updateProjectInfoForStream({
                                  buildingConfig: {
                                    ...projectInfo.buildingConfig,
                                    landedUnits: Number(e.target.value) || 0,
                                  },
                                })
                              }
                              className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                              placeholder="e.g., 50"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-slate-300 mb-2">
                              Land Area per Unit (sqft)
                            </label>
                            <input
                              type="number"
                              value={landedLandAreaPerUnit}
                              min={1}
                              onChange={(e) =>
                                updateProjectInfoForStream({
                                  buildingConfig: {
                                    ...projectInfo.buildingConfig,
                                    landedLandAreaPerUnit: Number(e.target.value) || 0,
                                  },
                                })
                              }
                              className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                              placeholder="e.g., 4000"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-slate-300 mb-2">
                              BUA per Unit (sqft)
                            </label>
                            <input
                              type="number"
                              value={landedBUAPerUnit}
                              min={1}
                              onChange={(e) =>
                                updateProjectInfoForStream({
                                  buildingConfig: {
                                    ...projectInfo.buildingConfig,
                                    landedBUAPerUnit: Number(e.target.value) || 0,
                                  },
                                })
                              }
                              className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                              placeholder="e.g., 2500"
                            />
                          </div>
                        </div>

                        <div className="mt-6 p-4 bg-slate-800/50 rounded-lg border border-slate-700">
                          <h4 className="text-sm font-semibold text-white mb-3">
                            Summary
                          </h4>
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div>
                              <p className="text-xs text-slate-400 mb-1">
                                Total BUA (sqft)
                              </p>
                              <p className="text-lg font-semibold text-emerald-400">
                                {totalBUA.toLocaleString()}
                              </p>
                              <p className="text-xs text-slate-500">
                                Units × BUA per Unit
                              </p>
                            </div>
                            <div>
                              <p className="text-xs text-slate-400 mb-1">
                                Total Saleable Land Area (sqft)
                              </p>
                              <p className="text-lg font-semibold text-emerald-400">
                                {totalSaleableLand.toLocaleString()}
                              </p>
                              <p className="text-xs text-slate-500">
                                Units × Land Area per Unit
                              </p>
                            </div>
                            <div>
                              <p className="text-xs text-slate-400 mb-1">
                                Total Land Area (sqft)
                              </p>
                              <p className="text-lg font-semibold text-emerald-400">
                                {totalLandArea.toLocaleString(undefined, {
                                  maximumFractionDigits: 0,
                                })}
                              </p>
                              <p className="text-xs text-slate-500">
                                Saleable Land ÷ 70%
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </>
                );
              })() : (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                      Basements (No. of levels)
                    </label>
                    <input
                      type="number"
                      value={projectInfo.buildingConfig.basements}
                      min={0}
                      onChange={(e) =>
                        updateFormData("basements", Number(e.target.value) || 0)
                      }
                      className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                    {fieldError("basements") && (
                      <p className="mt-1 text-sm text-red-400">
                        {fieldError("basements")}
                      </p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                      Podium / Parking Floors
                    </label>
                    <input
                      type="number"
                      value={projectInfo.buildingConfig.podiumFloors}
                      min={0}
                      onChange={(e) =>
                        updateFormData(
                          "podiumFloors",
                          Number(e.target.value) || 0
                        )
                      }
                      className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                    {fieldError("podiumFloors") && (
                      <p className="mt-1 text-sm text-red-400">
                        {fieldError("podiumFloors")}
                      </p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                      Tower Floors
                    </label>
                    <input
                      type="number"
                      value={projectInfo.buildingConfig.towerFloors}
                      min={1}
                      onChange={(e) =>
                        updateFormData("towerFloors", Number(e.target.value) || 0)
                      }
                      className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
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

          {/* Step 1c: Operational hotel segment / Mixed-Use Toggle */}
          {currentStep === 4 && (
            <div>
              {isOperationalHotel ? (
                <>
                  <h2 className="text-xl font-semibold text-white mb-2">
                    Hotel operating segment & star rating
                  </h2>
                  <p className="text-sm text-slate-400 mb-6">
                    Choose the positioning that best matches your hold strategy.
                    Star options follow typical industry pairings; invalid
                    combinations block the next step.
                  </p>

                  <p className="text-sm font-medium text-slate-200 mb-3">
                    Operating segment
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
                    {HOTEL_OPERATING_TYPE_CARDS.map((opt) => {
                      const selected =
                        projectInfo.hotelOperatingType === opt.value;
                      return (
                        <HoverTipAbove key={opt.value} tip={opt.title}>
                          <button
                            type="button"
                            onClick={() => {
                              const allowed = HOTEL_STARS_BY_TYPE[opt.value];
                              const cur = Number(projectInfo.hotelStarRating);
                              const keepStar = allowed.includes(cur);
                              updateProjectInfoForStream({
                                hotelOperatingType: opt.value,
                                hotelStarRating: keepStar
                                  ? projectInfo.hotelStarRating
                                  : "",
                              });
                            }}
                            className={`w-full min-h-[100px] cursor-pointer rounded-xl border p-5 text-left shadow-sm transition-all ${
                              selected
                                ? "border-emerald-500 bg-emerald-500/15 text-emerald-100 ring-2 ring-emerald-500/40"
                                : "border-slate-600 bg-slate-800/80 text-slate-100 hover:border-slate-500 hover:bg-slate-800"
                            }`}
                          >
                            <div className="flex items-start gap-3">
                              <span className="shrink-0 text-2xl" aria-hidden>
                                {opt.icon}
                              </span>
                              <div className="min-w-0">
                                <span className="block text-base font-semibold leading-snug">
                                  {opt.label}
                                </span>
                                <span className="mt-2 block text-xs font-normal leading-relaxed text-slate-400">
                                  {opt.hint}
                                </span>
                              </div>
                            </div>
                          </button>
                        </HoverTipAbove>
                      );
                    })}
                  </div>
                  {fieldError("hotelOperatingType") && (
                    <p className="mb-4 text-sm text-red-400">
                      {fieldError("hotelOperatingType")}
                    </p>
                  )}

                  <p className="text-sm font-medium text-slate-200 mb-3">
                    Star rating
                  </p>
                  {projectInfo.hotelOperatingType ? (
                    <div className="flex flex-wrap gap-3">
                      {HOTEL_STARS_BY_TYPE[
                        projectInfo.hotelOperatingType as HotelOperatingType
                      ].map((s) => {
                        const selected =
                          projectInfo.hotelStarRating === String(s);
                        return (
                          <button
                            key={s}
                            type="button"
                            onClick={() =>
                              updateProjectInfoForStream({ hotelStarRating: String(s) })
                            }
                            className={`rounded-lg border px-5 py-3 text-sm font-semibold transition-all ${
                              selected
                                ? "border-emerald-500 bg-emerald-500/20 text-emerald-200 ring-2 ring-emerald-500/30"
                                : "border-slate-600 bg-slate-800 text-slate-200 hover:border-slate-500"
                            }`}
                          >
                            {s}★
                          </button>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="text-sm text-slate-500">
                      Select an operating segment to see allowed star ratings.
                    </p>
                  )}
                  {fieldError("hotelStarRating") && (
                    <p className="mt-3 text-sm text-red-400">
                      {fieldError("hotelStarRating")}
                    </p>
                  )}
                </>
              ) : (
                <>
                  <h2 className="text-xl font-semibold text-white mb-6">
                    Mixed-Use (Retail on Ground/Podium)
                  </h2>
                  {projectInfo.buildingType === "residential" ||
                  projectInfo.buildingType === "office" ? (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-slate-200">
                            Retail / Mixed-use Component
                          </p>
                          <p className="text-xs text-slate-400">
                            Toggle if the Hi-Rise Residential ground/podium includes retail or F&amp;B.
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() =>
                            updateFormData(
                              "hasRetailComponent",
                              !projectInfo.buildingConfig.hasRetailComponent
                            )
                          }
                          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                            projectInfo.buildingConfig.hasRetailComponent
                              ? "bg-emerald-600"
                              : "bg-slate-600"
                          }`}
                        >
                          <span
                            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                              projectInfo.buildingConfig.hasRetailComponent
                                ? "translate-x-6"
                                : "translate-x-1"
                            }`}
                          />
                        </button>
                      </div>

                      {projectInfo.buildingConfig.hasRetailComponent && (
                        <div>
                          <label className="block text-sm font-medium text-slate-300 mb-2">
                            Retail BUA as % of Ground/Podium BUA
                          </label>
                          <div className="flex items-center gap-2">
                            <input
                              type="number"
                              value={projectInfo.buildingConfig.retailPercentage}
                              min={1}
                              max={50}
                              onChange={(e) =>
                                updateFormData(
                                  "retailPercentage",
                                  Number(e.target.value) || 0
                                )
                              }
                              className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                            />
                            <span className="text-slate-400 text-sm">%</span>
                          </div>
                          {fieldError("retailPercentage") && (
                            <p className="mt-1 text-sm text-red-400">
                              {fieldError("retailPercentage")}
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  ) : (
                    <p className="text-sm text-slate-400">
                      Mixed-use toggle is primarily for residential and office
                      towers.
                    </p>
                  )}
                </>
              )}
            </div>
          )}

          {/* Step 2: Construction Costs */}
          {currentStep === 5 && (
            <div>
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
                    <label className="block text-xs font-medium text-slate-400 mb-1">
                      Building BUA (sqft)
                    </label>
                    <input
                      type="number"
                      value={cashOutflows.buildingBUA}
                      onChange={(e) =>
                        updateFormData(
                          "buildingBUA",
                          Number(e.target.value) || 0
                        )
                      }
                      className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                    {fieldError("buildingBUA") && (
                      <p className="mt-1 text-sm text-red-400">
                        {fieldError("buildingBUA")}
                      </p>
                    )}
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1">
                      Building Rate ({projectInfo.currency}/sqft)
                    </label>
                    <input
                      type="number"
                      value={cashOutflows.buildingRate}
                      onChange={(e) =>
                        updateFormData(
                          "buildingRate",
                          Number(e.target.value) || 0
                        )
                      }
                      className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                    {fieldError("buildingRate") && (
                      <p className="mt-1 text-sm text-red-400">
                        {fieldError("buildingRate")}
                      </p>
                    )}
                  </div>
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

                <div className="space-y-3">
                  <h3 className="text-sm font-semibold text-slate-200">
                    Parking & Basements
                  </h3>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-slate-400 mb-1">
                        Parking BUA (sqft)
                      </label>
                      <input
                        type="number"
                        value={cashOutflows.parkingBUA}
                        onChange={(e) =>
                          updateFormData(
                            "parkingBUA",
                            Number(e.target.value) || 0
                          )
                        }
                        className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      />
                      {fieldError("parkingBUA") && (
                        <p className="mt-1 text-sm text-red-400">
                          {fieldError("parkingBUA")}
                        </p>
                      )}
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-400 mb-1">
                        Parking Rate ({projectInfo.currency}/sqft)
                      </label>
                      <input
                        type="number"
                        value={cashOutflows.parkingRate}
                        onChange={(e) =>
                          updateFormData(
                            "parkingRate",
                            Number(e.target.value) || 0
                          )
                        }
                        className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      />
                      {fieldError("parkingRate") && (
                        <p className="mt-1 text-sm text-red-400">
                          {fieldError("parkingRate")}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-slate-400 mb-1">
                        Basement BUA (sqft)
                      </label>
                      <input
                        type="number"
                        value={cashOutflows.basementBUA}
                        onChange={(e) =>
                          updateFormData(
                            "basementBUA",
                            Number(e.target.value) || 0
                          )
                        }
                        className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      />
                      {fieldError("basementBUA") && (
                        <p className="mt-1 text-sm text-red-400">
                          {fieldError("basementBUA")}
                        </p>
                      )}
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-400 mb-1">
                        Basement Rate ({projectInfo.currency}/sqft)
                      </label>
                      <input
                        type="number"
                        value={cashOutflows.basementRate}
                        onChange={(e) =>
                          updateFormData(
                            "basementRate",
                            Number(e.target.value) || 0
                          )
                        }
                        className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      />
                      {fieldError("basementRate") && (
                        <p className="mt-1 text-sm text-red-400">
                          {fieldError("basementRate")}
                        </p>
                      )}
                    </div>
                  </div>
                  <p className="text-sm text-slate-300">
                    Parking & Basement Cost (CC):{" "}
                    <span className="font-semibold text-emerald-400">
                      {(parkingCost + basementCost).toLocaleString(undefined, {
                        maximumFractionDigits: 0,
                      })}{" "}
                      {projectInfo.currency}
                    </span>
                  </p>
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
                    <div>
                      <label className="block text-sm text-slate-400 mb-2">
                        Infrastructure Rate ({projectInfo.currency}/sqft)
                      </label>
                      <input
                        type="number"
                        value={cashOutflows.infrastructureRate ?? 0}
                        onChange={(e) =>
                          updateFormData(
                            "infrastructureRate",
                            Number(e.target.value) || 0
                          )
                        }
                        className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                        min={0}
                        max={1000}
                        placeholder="e.g., 150"
                      />
                      <p className="text-xs text-slate-500 mt-1">
                        For landed developments only (Hi-Rise: leave as 0)
                      </p>
                    </div>

                    <div>
                      <label className="block text-sm text-slate-400 mb-2">
                        Total Land Area (sqft)
                        <span className="text-xs text-slate-500 ml-2">
                          (from Step 4)
                        </span>
                      </label>
                      <input
                        type="number"
                        value={Math.round(landedTotalLandArea)}
                        readOnly
                        disabled
                        className="w-full px-4 py-2 bg-slate-800/50 border border-slate-700 rounded-lg text-slate-400"
                      />
                      <p className="text-xs text-slate-500 mt-1">
                        Auto-populated from Step 4 (saleable land ÷ 70%)
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

          {/* Step 3: Contingency */}
          {currentStep === 6 && (
            <div>
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
                  <p className="mt-1 text-xs text-slate-500">
                    Typical range: 5–10% depending on asset and design stage.
                  </p>
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

          {/* Step 4-6: Soft Costs, POWC, Development Costs */}
          {currentStep === 7 && (
            <div>
              <h2 className="text-xl font-semibold text-white mb-4">
                SC, POWC & DC
              </h2>
              {isOperationalHotel && operationalHotelProfileUi ? (
                <p className="text-sm text-slate-400 mb-4">
                  SC, POWC, and FFE are suggested from your segment and location.
                  Calculations use CC{" "}
                  <span className="text-slate-300">including contingency</span>{" "}
                  from the prior steps. Typed values count as overrides.
                </p>
              ) : (
                <p className="text-sm text-slate-400 mb-6">
                  SC and POWC percentages apply to{" "}
                  <span className="text-slate-300">CC including contingency</span>{" "}
                  (same base as hotel FFE where applicable).
                </p>
              )}

              {isOperationalHotel && operationalHotelProfileUi ? (
                <div className="mb-6 flex flex-wrap items-center gap-x-3 gap-y-2">
                  <span className="text-xs font-medium uppercase tracking-wide text-slate-500">
                    Benchmark
                  </span>
                  <HoverTipInline
                    tip={operationalHotelProfileUi.tooltip}
                    className="cursor-default border-b border-dotted border-slate-500 text-sm text-slate-200"
                  >
                    {operationalHotelProfileUi.key.replace(/-/g, " · ")}
                  </HoverTipInline>
                  {(cashOutflows.operationalHotelScManual ||
                    cashOutflows.operationalHotelPowcManual ||
                    cashOutflows.operationalHotelFfeManual) && (
                    <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-xs font-medium text-amber-300">
                      Manual overrides
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      const op = projectInfo.hotelOperatingType as HotelOperatingType;
                      const star = Number(projectInfo.hotelStarRating);
                      if (!isValidHotelCombo(op, star).valid) return;
                      const { key, profile } = resolveHotelProfile(
                        op,
                        star,
                        projectInfo.country,
                        projectInfo.city
                      );
                      if (baseCC <= 0 || ccWithContingency <= 0) return;
                      const dcModel = ccWithContingency / profile.cc;
                      updateCashOutflowsForStream({
                        operationalHotelProfileKey: key,
                        operationalHotelScManual: false,
                        operationalHotelPowcManual: false,
                        operationalHotelFfeManual: false,
                        softCostPercent: round2(
                          ((profile.sc * dcModel) / ccWithContingency) * 100
                        ),
                        powcPercent: round2(
                          ((profile.powc * dcModel) / ccWithContingency) * 100
                        ),
                        ffePercent: round2(
                          ((profile.ffe * dcModel) / ccWithContingency) * 100
                        ),
                      });
                      operationalHotelProfilePrevKeyRef.current = key;
                    }}
                    className="text-xs font-medium text-emerald-400 underline-offset-2 hover:text-emerald-300 hover:underline"
                  >
                    Use profile defaults
                  </button>
                </div>
              ) : null}

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-300">
                    <HoverTipInline
                      tip={
                        isOperationalHotel && operationalHotelProfileUi
                          ? operationalHotelProfileUi.tooltip
                          : ""
                      }
                    >
                      <span className="cursor-default">
                        Soft Costs % of CC incl. contingency (SC%)
                      </span>
                    </HoverTipInline>
                    {isOperationalHotel &&
                    cashOutflows.operationalHotelScManual ? (
                      <span className="ml-2 text-xs font-normal text-amber-400">
                        (override)
                      </span>
                    ) : null}
                  </label>
                  <input
                    type="number"
                    value={cashOutflows.softCostPercent}
                    onChange={(e) => {
                      const v = Number(e.target.value) || 0;
                      if (isOperationalHotel) {
                        updateCashOutflowsForStream({
                          softCostPercent: v,
                          operationalHotelScManual: true,
                        });
                      } else {
                        updateFormData("softCostPercent", v);
                      }
                    }}
                    className={`w-full rounded-lg bg-slate-800 px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 ${
                      isOperationalHotel && cashOutflows.operationalHotelScManual
                        ? "border-2 border-amber-500/70"
                        : "border border-slate-700"
                    }`}
                  />
                  {fieldError("softCostPercent") && (
                    <p className="mt-1 text-sm text-red-400">
                      {fieldError("softCostPercent")}
                    </p>
                  )}
                  <p className="mt-2 text-xs text-slate-500">
                    SC amount = CC incl. contingency × SC% ÷ 100
                  </p>
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-300">
                    <HoverTipInline
                      tip={
                        isOperationalHotel && operationalHotelProfileUi
                          ? operationalHotelProfileUi.tooltip
                          : ""
                      }
                    >
                      <span className="cursor-default">
                        POWC % of CC incl. contingency (POWC%)
                      </span>
                    </HoverTipInline>
                    {isOperationalHotel &&
                    cashOutflows.operationalHotelPowcManual ? (
                      <span className="ml-2 text-xs font-normal text-amber-400">
                        (override)
                      </span>
                    ) : null}
                  </label>
                  <input
                    type="number"
                    value={cashOutflows.powcPercent}
                    onChange={(e) => {
                      const v = Number(e.target.value) || 0;
                      if (isOperationalHotel) {
                        updateCashOutflowsForStream({
                          powcPercent: v,
                          operationalHotelPowcManual: true,
                        });
                      } else {
                        updateFormData("powcPercent", v);
                      }
                    }}
                    className={`w-full rounded-lg bg-slate-800 px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 ${
                      isOperationalHotel &&
                      cashOutflows.operationalHotelPowcManual
                        ? "border-2 border-amber-500/70"
                        : "border border-slate-700"
                    }`}
                  />
                  {fieldError("powcPercent") && (
                    <p className="mt-1 text-sm text-red-400">
                      {fieldError("powcPercent")}
                    </p>
                  )}
                  <p className="mt-2 text-xs text-slate-500">
                    POWC amount = CC incl. contingency × POWC% ÷ 100
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    POWC = Pre-Operating Expenses & Working Capital (Site Establishment,
                    Overhead, Authority Fees)
                  </p>
                </div>
                {projectInfo.buildingType === "hotel" && (
                  <div>
                    <label className="mb-2 block text-sm font-medium text-slate-300">
                      <HoverTipInline
                        tip={
                          isOperationalHotel && operationalHotelProfileUi
                            ? operationalHotelProfileUi.tooltip
                            : ""
                        }
                      >
                        <span className="cursor-default">
                          FFE % of CC incl. contingency (Hotel)
                        </span>
                      </HoverTipInline>
                      {isOperationalHotel &&
                      cashOutflows.operationalHotelFfeManual ? (
                        <span className="ml-2 text-xs font-normal text-amber-400">
                          (override)
                        </span>
                      ) : null}
                    </label>
                    <input
                      type="number"
                      value={cashOutflows.ffePercent}
                      onChange={(e) => {
                        const v = Number(e.target.value) || 0;
                        if (isOperationalHotel) {
                          updateCashOutflowsForStream({
                            ffePercent: v,
                            operationalHotelFfeManual: true,
                          });
                        } else {
                          updateFormData("ffePercent", v);
                        }
                      }}
                      className={`w-full rounded-lg bg-slate-800 px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 ${
                        isOperationalHotel &&
                        cashOutflows.operationalHotelFfeManual
                          ? "border-2 border-amber-500/70"
                          : "border border-slate-700"
                      }`}
                    />
                    {fieldError("ffePercent") && (
                      <p className="mt-1 text-sm text-red-400">
                        {fieldError("ffePercent")}
                      </p>
                    )}
                    <p className="mt-2 text-xs text-slate-500">
                      Furniture, Fixtures & Equipment for hotel rooms and public areas.
                    </p>
                  </div>
                )}
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
                {projectInfo.buildingType === "hotel" && (
                  <p>
                    FFE:{" "}
                    <span className="font-semibold text-emerald-400">
                      {ffe.toLocaleString(undefined, {
                        maximumFractionDigits: 0,
                      })}{" "}
                      {projectInfo.currency}
                    </span>
                  </p>
                )}
                <p>
                  Development Cost (DC = CC% + SC + POWC
                  {projectInfo.buildingType === "hotel" ? " + FFE" : ""}):{" "}
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

          {/* Step 7: Land Costs */}
          {currentStep === 8 && (
            <div>
              <h2 className="text-xl font-semibold text-white mb-4">
                Land Costs (LC)
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Land Area (sqft)
                  </label>
                  <input
                    type="number"
                    value={cashOutflows.landArea}
                    onChange={(e) =>
                      updateFormData("landArea", Number(e.target.value) || 0)
                    }
                    className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                  {fieldError("landArea") && (
                    <p className="mt-1 text-sm text-red-400">
                      {fieldError("landArea")}
                    </p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Land Rate ({projectInfo.currency}/sqft)
                  </label>
                  <input
                    type="number"
                    value={cashOutflows.landRate}
                    onChange={(e) =>
                      updateFormData("landRate", Number(e.target.value) || 0)
                    }
                    className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                  {fieldError("landRate") && (
                    <p className="mt-1 text-sm text-red-400">
                      {fieldError("landRate")}
                    </p>
                  )}
                </div>
                <div>
                  <p className="text-xs font-medium text-slate-400 mb-1">
                    Land Cost (LC)
                  </p>
                  <p className="text-lg font-semibold text-emerald-400">
                    {landCost.toLocaleString(undefined, {
                      maximumFractionDigits: 0,
                    })}{" "}
                    {projectInfo.currency}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Step 8-9: TDC & Ratio Checks */}
          {currentStep === 9 && (
            <div>
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
                  <p className="text-sm text-slate-300 mt-4">
                    Land Cost (LC)
                  </p>
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
                    <p>
                      Land / TDC:{" "}
                      <span
                        className={`font-semibold ${
                          landToTdcRatio <= 51
                            ? "text-emerald-400"
                            : "text-red-400"
                        }`}
                      >
                        {landToTdcRatio.toFixed(1)}% (target ≤ 51%)
                      </span>
                    </p>
                    <p>
                      Development (DC) / TDC:{" "}
                      <span
                        className={`font-semibold ${
                          dcToTdcRatio >= 49
                            ? "text-emerald-400"
                            : "text-red-400"
                        }`}
                      >
                        {dcToTdcRatio.toFixed(1)}% (target ≥ 49%)
                      </span>
                    </p>
                  </div>
                  {(fieldError("landRatio") || fieldError("dcRatio")) && (
                    <p className="text-xs text-red-400">
                      {fieldError("landRatio") || fieldError("dcRatio")}
                    </p>
                  )}
                  <p className="text-xs text-slate-500 mt-2">
                    These ratios are simple guardrails. In many GCC projects, land cost
                    is kept below ~50% of total development cost.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Step 10: Construction Period */}
          {currentStep === 10 && (
            <div>
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
                  }}
                  className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
                {fieldError("constructionPeriod") && (
                  <p className="mt-1 text-sm text-red-400">
                    {fieldError("constructionPeriod")}
                  </p>
                )}
                <div className="rounded-lg bg-slate-800 border border-slate-700 p-3 text-xs text-slate-300">
                  <p className="font-semibold text-emerald-400 mb-1">
                    AI Recommendation (rule-of-thumb)
                  </p>
                  <p>
                    For a{" "}
                    <span className="font-semibold">
                      {projectInfo.buildingType}
                    </span>{" "}
                    with{" "}
                    <span className="font-semibold">
                      {projectInfo.buildingConfig.towerFloors} tower floors
                    </span>
                    , a reasonable range is{" "}
                    <span className="font-semibold">
                      {(projectInfo.buildingConfig.towerFloors + 12).toFixed(0)}–{(
                        projectInfo.buildingConfig.towerFloors + 24
                      ).toFixed(0)}{" "}
                      months
                    </span>
                    , depending on basement complexity and authority approvals.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Step 11: Construction Stages */}
          {currentStep === 11 && (
            <div>
              <h2 className="text-xl font-semibold text-white mb-4">
                Construction Stages (M0 to Finishes)
              </h2>
              <p className="text-sm text-slate-400 mb-4">
                Break down CC% (construction cost including contingency) into stages.
                Percentages must sum to 100%.
              </p>
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-5 gap-4 text-xs text-slate-300">
                  <div>
                    <p className="font-semibold mb-1">M0</p>
                    <p>Design, authority, early enabling.</p>
                  </div>
                  <div>
                    <p className="font-semibold mb-1">Enabling</p>
                    <p>Shoring, piling, early works.</p>
                  </div>
                  <div>
                    <p className="font-semibold mb-1">Sub-Structure</p>
                    <p>Basements, foundations.</p>
                  </div>
                  <div>
                    <p className="font-semibold mb-1">Super Structure</p>
                    <p>Podium, typical floors.</p>
                  </div>
                  <div>
                    <p className="font-semibold mb-1">Finishes</p>
                    <p>Façade, MEP, fit-out.</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
                    <label className="block text-xs font-medium text-slate-400 mt-2 mb-1">
                      Stage 1 (% of CC%)
                    </label>
                    <input
                      type="number"
                      value={cashOutflows.stageAllocation.stage1Percent}
                      onChange={(e) =>
                        updateFormData(
                          "stage1Percent",
                          Number(e.target.value) || 0
                        )
                      }
                      className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
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
                    <label className="block text-xs font-medium text-slate-400 mt-2 mb-1">
                      Stage 2 (% of CC%)
                    </label>
                    <input
                      type="number"
                      value={cashOutflows.stageAllocation.stage2Percent}
                      onChange={(e) =>
                        updateFormData(
                          "stage2Percent",
                          Number(e.target.value) || 0
                        )
                      }
                      className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
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
                    <label className="block text-xs font-medium text-slate-400 mt-2 mb-1">
                      Stage 3 (% of CC%)
                    </label>
                    <input
                      type="number"
                      value={cashOutflows.stageAllocation.stage3Percent}
                      onChange={(e) =>
                        updateFormData(
                          "stage3Percent",
                          Number(e.target.value) || 0
                        )
                      }
                      className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                </div>
                <p className="text-sm text-slate-300">
                  Total Allocation:{" "}
                  <span className="font-semibold text-emerald-400">
                    {(
                      cashOutflows.stageAllocation.stage1Percent +
                      cashOutflows.stageAllocation.stage2Percent +
                      cashOutflows.stageAllocation.stage3Percent
                    ).toFixed(1)}
                    %
                  </span>
                </p>
                {fieldError("stages") && (
                  <p className="mt-1 text-sm text-red-400">
                    {fieldError("stages")}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Step 12 & 13: POWC & SC Allocation + Summary */}
          {currentStep === 12 && (
            <div className="space-y-8">
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
                    explanation={`Step 13 timing: ${POWC_STEP13_TIMING_NOTES}`}
                  >
                    <div className="space-y-4">
                      {(() => {
                        const powcAlloc =
                          cashOutflows.powcAllocation ?? {
                            ...DEFAULT_POWC_ALLOCATION,
                          };
                        const powcTotal = powcAlloc.siteEstablishment + powcAlloc.overhead + powcAlloc.authorityFees;
                        return (
                          <>
                            <div className="flex items-center justify-between rounded-lg bg-slate-900/50 p-3">
                              <div>
                                <label className="text-sm font-medium text-slate-200">Site Establishment</label>
                                <p className="mt-1 text-xs text-slate-500">Mobilization, temporary facilities, site prep</p>
                              </div>
                              <div className="flex items-center gap-2">
                                <input
                                  type="number"
                                  min={0}
                                  max={100}
                                  value={powcAlloc.siteEstablishment}
                                  onChange={(e) => {
                                    const newValue = parseFloat(e.target.value) || 0;
                                    updateCashOutflowsForStream({
                                      powcAllocation: { ...powcAlloc, siteEstablishment: newValue },
                                    });
                                  }}
                                  className="w-20 rounded border border-slate-600 bg-slate-800 px-3 py-2 text-right text-white focus:ring-2 focus:ring-emerald-500"
                                />
                                <span className="text-slate-400">%</span>
                                <span className="text-sm text-emerald-400" title="Click to override">✏️</span>
                              </div>
                            </div>
                            <div className="flex items-center justify-between rounded-lg bg-slate-900/50 p-3">
                              <div>
                                <label className="text-sm font-medium text-slate-200">Overhead Costs</label>
                                <p className="mt-1 text-xs text-slate-500">Admin, HSE, Management, site staff</p>
                              </div>
                              <div className="flex items-center gap-2">
                                <input
                                  type="number"
                                  min={0}
                                  max={100}
                                  value={powcAlloc.overhead}
                                  onChange={(e) => {
                                    const newValue = parseFloat(e.target.value) || 0;
                                    updateCashOutflowsForStream({
                                      powcAllocation: { ...powcAlloc, overhead: newValue },
                                    });
                                  }}
                                  className="w-20 rounded border border-slate-600 bg-slate-800 px-3 py-2 text-right text-white focus:ring-2 focus:ring-emerald-500"
                                />
                                <span className="text-slate-400">%</span>
                                <span className="text-sm text-emerald-400" title="Click to override">✏️</span>
                              </div>
                            </div>
                            <div className="flex items-center justify-between rounded-lg bg-slate-900/50 p-3">
                              <div>
                                <label className="text-sm font-medium text-slate-200">Authority Fees</label>
                                <p className="mt-1 text-xs text-slate-500">Telco, power, water, drainage, permits</p>
                              </div>
                              <div className="flex items-center gap-2">
                                <input
                                  type="number"
                                  min={0}
                                  max={100}
                                  value={powcAlloc.authorityFees}
                                  onChange={(e) => {
                                    const newValue = parseFloat(e.target.value) || 0;
                                    updateCashOutflowsForStream({
                                      powcAllocation: { ...powcAlloc, authorityFees: newValue },
                                    });
                                  }}
                                  className="w-20 rounded border border-slate-600 bg-slate-800 px-3 py-2 text-right text-white focus:ring-2 focus:ring-emerald-500"
                                />
                                <span className="text-slate-400">%</span>
                                <span className="text-sm text-emerald-400" title="Click to override">✏️</span>
                              </div>
                            </div>
                            <div className="flex items-center justify-between border-t border-slate-700 pt-4">
                              <label className="text-sm font-semibold text-slate-200">Total</label>
                              <div className="flex items-center gap-2">
                                <span className={`font-semibold ${powcTotal === 100 ? "text-emerald-400" : "text-amber-400"}`}>
                                  {powcTotal.toFixed(1)}%
                                </span>
                                <span className="text-slate-400">%</span>
                                {powcTotal === 100 ? (
                                  <span className="text-sm text-emerald-400">✅</span>
                                ) : (
                                  <span className="text-sm text-amber-400">⚠️ Must equal 100%</span>
                                )}
                              </div>
                            </div>
                            {fieldError("powcAllocation") && (
                              <p className="text-sm text-red-400">{fieldError("powcAllocation")}</p>
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
                    explanation={`Percentages below are shares of total soft costs (Step 13). Aggregate cash timing: ${SOFT_COSTS_TIMING_NOTES}`}
                  >
                    <div className="space-y-4">
                      {(() => {
                        const softAlloc =
                          cashOutflows.softCostAllocation ?? {
                            ...DEFAULT_SOFT_COST_ALLOCATION,
                          };
                        const softCostsTotal = softAlloc.architect + softAlloc.projectManagement + softAlloc.engineering + softAlloc.geotechnical + softAlloc.otherFees;
                        return (
                          <>
                            <div className="flex items-center justify-between rounded-lg bg-slate-900/50 p-3">
                              <div>
                                <label className="text-sm font-medium text-slate-200">Main Architect</label>
                                <p className="mt-1 text-xs text-slate-500">Design, drawings, site supervision</p>
                              </div>
                              <div className="flex items-center gap-2">
                                <input
                                  type="number"
                                  min={0}
                                  max={100}
                                  value={softAlloc.architect}
                                  onChange={(e) => {
                                    const newValue = parseFloat(e.target.value) || 0;
                                    updateCashOutflowsForStream({ softCostAllocation: { ...softAlloc, architect: newValue } });
                                  }}
                                  className="w-20 rounded border border-slate-600 bg-slate-800 px-3 py-2 text-right text-white focus:ring-2 focus:ring-emerald-500"
                                />
                                <span className="text-slate-400">%</span>
                                <span className="text-sm text-emerald-400" title="Click to override">✏️</span>
                              </div>
                            </div>
                            <div className="flex items-center justify-between rounded-lg bg-slate-900/50 p-3">
                              <div>
                                <label className="text-sm font-medium text-slate-200">Project Management</label>
                                <p className="mt-1 text-xs text-slate-500">Owner&apos;s rep, coordination, reporting</p>
                              </div>
                              <div className="flex items-center gap-2">
                                <input
                                  type="number"
                                  min={0}
                                  max={100}
                                  value={softAlloc.projectManagement}
                                  onChange={(e) => {
                                    const newValue = parseFloat(e.target.value) || 0;
                                    updateCashOutflowsForStream({ softCostAllocation: { ...softAlloc, projectManagement: newValue } });
                                  }}
                                  className="w-20 rounded border border-slate-600 bg-slate-800 px-3 py-2 text-right text-white focus:ring-2 focus:ring-emerald-500"
                                />
                                <span className="text-slate-400">%</span>
                                <span className="text-sm text-emerald-400" title="Click to override">✏️</span>
                              </div>
                            </div>
                            <div className="flex items-center justify-between rounded-lg bg-slate-900/50 p-3">
                              <div>
                                <label className="text-sm font-medium text-slate-200">Engineering Consultant</label>
                                <p className="mt-1 text-xs text-slate-500">Structural, MEP, civil engineering</p>
                              </div>
                              <div className="flex items-center gap-2">
                                <input
                                  type="number"
                                  min={0}
                                  max={100}
                                  value={softAlloc.engineering}
                                  onChange={(e) => {
                                    const newValue = parseFloat(e.target.value) || 0;
                                    updateCashOutflowsForStream({ softCostAllocation: { ...softAlloc, engineering: newValue } });
                                  }}
                                  className="w-20 rounded border border-slate-600 bg-slate-800 px-3 py-2 text-right text-white focus:ring-2 focus:ring-emerald-500"
                                />
                                <span className="text-slate-400">%</span>
                                <span className="text-sm text-emerald-400" title="Click to override">✏️</span>
                              </div>
                            </div>
                            <div className="flex items-center justify-between rounded-lg bg-slate-900/50 p-3">
                              <div>
                                <label className="text-sm font-medium text-slate-200">Geotechnical Consultant</label>
                                <p className="mt-1 text-xs text-slate-500">Soil investigation, foundation recommendations</p>
                              </div>
                              <div className="flex items-center gap-2">
                                <input
                                  type="number"
                                  min={0}
                                  max={100}
                                  value={softAlloc.geotechnical}
                                  onChange={(e) => {
                                    const newValue = parseFloat(e.target.value) || 0;
                                    updateCashOutflowsForStream({ softCostAllocation: { ...softAlloc, geotechnical: newValue } });
                                  }}
                                  className="w-20 rounded border border-slate-600 bg-slate-800 px-3 py-2 text-right text-white focus:ring-2 focus:ring-emerald-500"
                                />
                                <span className="text-slate-400">%</span>
                                <span className="text-sm text-emerald-400" title="Click to override">✏️</span>
                              </div>
                            </div>
                            <div className="flex items-center justify-between rounded-lg bg-slate-900/50 p-3">
                              <div>
                                <label className="text-sm font-medium text-slate-200">Other Fees</label>
                                <p className="mt-1 text-xs text-slate-500">Legal, insurance, marketing, miscellaneous</p>
                              </div>
                              <div className="flex items-center gap-2">
                                <input
                                  type="number"
                                  min={0}
                                  max={100}
                                  value={softAlloc.otherFees}
                                  onChange={(e) => {
                                    const newValue = parseFloat(e.target.value) || 0;
                                    updateCashOutflowsForStream({ softCostAllocation: { ...softAlloc, otherFees: newValue } });
                                  }}
                                  className="w-20 rounded border border-slate-600 bg-slate-800 px-3 py-2 text-right text-white focus:ring-2 focus:ring-emerald-500"
                                />
                                <span className="text-slate-400">%</span>
                                <span className="text-sm text-emerald-400" title="Click to override">✏️</span>
                              </div>
                            </div>
                            <div className="flex items-center justify-between border-t border-slate-700 pt-4">
                              <label className="text-sm font-semibold text-slate-200">Total</label>
                              <div className="flex items-center gap-2">
                                <span className={`font-semibold ${softCostsTotal === 100 ? "text-emerald-400" : "text-amber-400"}`}>
                                  {softCostsTotal.toFixed(1)}%
                                </span>
                                <span className="text-slate-400">%</span>
                                {softCostsTotal === 100 ? (
                                  <span className="text-sm text-emerald-400">✅</span>
                                ) : (
                                  <span className="text-sm text-amber-400">⚠️ Must equal 100%</span>
                                )}
                              </div>
                            </div>
                            {fieldError("softCostAllocation") && (
                              <p className="text-sm text-red-400">{fieldError("softCostAllocation")}</p>
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
                    {projectInfo.buildingType === "hotel" && (
                      <p className="text-slate-300">
                        <span className="text-slate-400">FFE:</span>{" "}
                        {ffe.toLocaleString(undefined, {
                          maximumFractionDigits: 0,
                        })}{" "}
                        {projectInfo.currency} ({cashOutflows.ffePercent}% of CC)
                      </p>
                    )}
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
