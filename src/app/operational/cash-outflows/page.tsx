"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import dynamic from "next/dynamic";
import { useRouter, useSearchParams } from "next/navigation";
import SearchParamsBoundary from "@/components/SearchParamsBoundary";

const LocationMapPicker = dynamic(() => import("@/components/LocationMapPicker"), {
  ssr: false,
});
import { getCurrencyForCountry } from "@/lib/constants/countryCurrencies";
import type { HotelOperatingType } from "@/config/hotel-cost-profiles";
import {
  formatHotelProfileTooltip,
  inferHotelProfileRegion,
  isValidHotelCombo,
  resolveHotelProfile,
} from "@/config/hotel-cost-profiles";
import useFinModelStore, {
  type AiResearchData,
  type CashOutflows,
  type ProjectInfo,
} from "@/store/useFinModelStore";
import { saveProject, type ProjectIndexItem } from "@/lib/puter-kv";
import AIRecommendationBox from "@/components/AIRecommendationBox";
import { AiGuardrailBox } from "@/components/ui/AiGuardrailBox";
import { AiHintBox } from "@/components/ui/AiHintBox";
import { AiInput } from "@/components/ui/AiInput";
import PreviewFloatingBar from "@/components/PreviewFloatingBar";
import {
  getRetailBenchmark,
  getRetailBenchmarkProfileKey,
} from "@/lib/benchmarks/retail-construction-costs";
import {
  getOfficeBenchmark,
  getOfficeBenchmarkProfileKey,
} from "@/lib/benchmarks/office-construction-costs";
import {
  getOperationalFfeAssetLabel,
} from "@/lib/operational-ffe-validation";
import ResidentialBenchmarkHeader from "./steps/ResidentialBenchmarkHeader";
import ResidentialStep6Construction from "./steps/ResidentialStep6Construction";
import ResidentialStep8SoftCosts from "./steps/ResidentialStep8SoftCosts";
import ResidentialStep9LandCosts from "./steps/ResidentialStep9LandCosts";
import { useResidentialCashOutflowBenchmark } from "./steps/residential-cash-outflow-benchmark";
import BenchmarkHeader from "@/components/BenchmarkHeader";
import {
  DEFAULT_POWC_ALLOCATION,
  DEFAULT_SOFT_COST_ALLOCATION,
} from "@/lib/cash-outflow-default-allocations";
import {
  POWC_STEP13_TIMING_NOTES,
  SOFT_COSTS_TIMING_NOTES,
} from "@/lib/cash-outflow-powc-timing";
import {
  withStreamPrefix,
  type StreamPrefix,
} from "@/lib/stream-path";
import HotelSegmentationStep, {
  validateHotelSegmentation,
} from "./steps/HotelSegmentationStep";
import OfficeSegmentationStep, {
  validateOfficeSegmentation,
} from "./steps/OfficeSegmentationStep";
import RetailSegmentationStep, {
  validateRetailSegmentation,
} from "./steps/RetailSegmentationStep";
import ResidentialSegmentationStep, {
  validateResidentialSegmentation,
} from "./steps/ResidentialSegmentationStep";
import { logAuditChange } from "@/lib/audit-utils";
import { useAiResearch } from "@/hooks/useAiResearch";
import { normalizeAiResearchData, type AiAssetType } from "@/lib/constants/aiPrompts";
import {
  CASH_OUTFLOW_AUDIT_FIELDS,
  CASH_OUTFLOW_STAGE_ALLOCATION_FIELDS,
  CASH_OUTFLOW_STEP_NAMES,
  CASH_OUTFLOWS_COMPONENT,
  cashOutflowAuditRoute,
  formatCashOutflowAuditDisplay,
  humanizeFieldId,
  logOperationalCashOutflow,
} from "@/lib/operational-audit-fields";

/** Bump only when AI research output schema changes (not model name). */
const AI_CACHE_VERSION = "v1.0";

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
  {
    name: "United Arab Emirates",
    code: "AE",
    currency: ["AED", "USD"],
    cities: ["Dubai", "Abu Dhabi"],
  },
  {
    name: "Saudi Arabia",
    code: "SA",
    currency: ["SAR", "USD"],
    cities: ["Riyadh", "Jeddah", "Makkah"],
  },
  {
    name: "Malaysia",
    code: "MY",
    currency: ["MYR", "USD"],
    cities: ["Kuala Lumpur", "Penang", "Johor Bahru"],
  },
  {
    name: "Vietnam",
    code: "VN",
    currency: ["VND", "USD"],
    cities: ["Ho Chi Minh City", "Hanoi", "Da Nang"],
  },
  {
    name: "Thailand",
    code: "TH",
    currency: ["THB", "USD"],
    cities: ["Bangkok", "Phuket", "Chiang Mai"],
  },
  {
    name: "Australia",
    code: "AU",
    currency: ["AUD", "USD"],
    cities: ["Sydney", "Melbourne", "Brisbane"],
  },
] as const;

const CURRENCY_LABELS: Record<string, string> = {
  AED: "AED - UAE Dirham",
  SAR: "SAR - Saudi Riyal",
  MYR: "MYR - Malaysian Ringgit",
  VND: "VND - Vietnamese Dong",
  THB: "THB - Thai Baht",
  AUD: "AUD - Australian Dollar",
  USD: "USD - US Dollar",
};

// MVP Profile Database - Hotel Development Cost Benchmarks
const PROFILE_DEFAULTS: Record<
  string,
  {
    softCostPercent: number;
    powcPercent: number;
    ffePercent: number;
    constructionCostPerKey: number;
    adrBenchmark: number;
    occupancyBenchmark: number;
    regionBucket: string;
  }
> = {
  // === UNITED ARAB EMIRATES ===
  "United Arab Emirates:Dubai:Business:5": {
    softCostPercent: 8.5,
    powcPercent: 5.0,
    ffePercent: 22.0,
    constructionCostPerKey: 850000,
    adrBenchmark: 650,
    occupancyBenchmark: 75,
    regionBucket: "dubai",
  },
  "United Arab Emirates:Dubai:Business:4": {
    softCostPercent: 8.0,
    powcPercent: 4.5,
    ffePercent: 18.0,
    constructionCostPerKey: 650000,
    adrBenchmark: 450,
    occupancyBenchmark: 72,
    regionBucket: "dubai",
  },
  "United Arab Emirates:Dubai:Resort:5": {
    softCostPercent: 9.0,
    powcPercent: 5.5,
    ffePercent: 28.0,
    constructionCostPerKey: 1200000,
    adrBenchmark: 950,
    occupancyBenchmark: 68,
    regionBucket: "dubai",
  },
  "United Arab Emirates:Dubai:Resort:4": {
    softCostPercent: 8.5,
    powcPercent: 5.0,
    ffePercent: 24.0,
    constructionCostPerKey: 900000,
    adrBenchmark: 700,
    occupancyBenchmark: 65,
    regionBucket: "dubai",
  },
  "United Arab Emirates:Abu Dhabi:Business:5": {
    softCostPercent: 8.0,
    powcPercent: 5.0,
    ffePercent: 20.0,
    constructionCostPerKey: 800000,
    adrBenchmark: 600,
    occupancyBenchmark: 70,
    regionBucket: "abudhabi",
  },
  "United Arab Emirates:Abu Dhabi:Business:4": {
    softCostPercent: 7.5,
    powcPercent: 4.5,
    ffePercent: 16.0,
    constructionCostPerKey: 600000,
    adrBenchmark: 400,
    occupancyBenchmark: 68,
    regionBucket: "abudhabi",
  },
  "United Arab Emirates:Abu Dhabi:Resort:5": {
    softCostPercent: 8.5,
    powcPercent: 5.0,
    ffePercent: 24.0,
    constructionCostPerKey: 1000000,
    adrBenchmark: 800,
    occupancyBenchmark: 65,
    regionBucket: "abudhabi",
  },
  "United Arab Emirates:Abu Dhabi:Resort:4": {
    softCostPercent: 8.0,
    powcPercent: 4.5,
    ffePercent: 20.0,
    constructionCostPerKey: 750000,
    adrBenchmark: 550,
    occupancyBenchmark: 62,
    regionBucket: "abudhabi",
  },

  // === SAUDI ARABIA ===
  "Saudi Arabia:Riyadh:Business:5": {
    softCostPercent: 9.0,
    powcPercent: 5.5,
    ffePercent: 20.0,
    constructionCostPerKey: 320000,
    adrBenchmark: 550,
    occupancyBenchmark: 65,
    regionBucket: "gcc",
  },
  "Saudi Arabia:Riyadh:Business:4": {
    softCostPercent: 8.5,
    powcPercent: 5.0,
    ffePercent: 16.0,
    constructionCostPerKey: 250000,
    adrBenchmark: 380,
    occupancyBenchmark: 62,
    regionBucket: "gcc",
  },
  "Saudi Arabia:Jeddah:Business:5": {
    softCostPercent: 8.5,
    powcPercent: 5.0,
    ffePercent: 18.0,
    constructionCostPerKey: 300000,
    adrBenchmark: 500,
    occupancyBenchmark: 68,
    regionBucket: "gcc",
  },
  "Saudi Arabia:Makkah:Business:5": {
    softCostPercent: 9.5,
    powcPercent: 6.0,
    ffePercent: 22.0,
    constructionCostPerKey: 400000,
    adrBenchmark: 750,
    occupancyBenchmark: 80,
    regionBucket: "gcc",
  },

  // === MALAYSIA ===
  "Malaysia:Kuala Lumpur:Business:5": {
    softCostPercent: 7.5,
    powcPercent: 4.5,
    ffePercent: 18.0,
    constructionCostPerKey: 450000,
    adrBenchmark: 350,
    occupancyBenchmark: 70,
    regionBucket: "southeast_asia",
  },
  "Malaysia:Kuala Lumpur:Business:4": {
    softCostPercent: 7.0,
    powcPercent: 4.0,
    ffePercent: 14.0,
    constructionCostPerKey: 350000,
    adrBenchmark: 250,
    occupancyBenchmark: 68,
    regionBucket: "southeast_asia",
  },
  "Malaysia:Kuala Lumpur:Budget:3": {
    softCostPercent: 6.5,
    powcPercent: 3.5,
    ffePercent: 10.0,
    constructionCostPerKey: 220000,
    adrBenchmark: 150,
    occupancyBenchmark: 75,
    regionBucket: "southeast_asia",
  },

  // === VIETNAM ===
  "Vietnam:Ho Chi Minh City:Business:5": {
    softCostPercent: 8.0,
    powcPercent: 5.0,
    ffePercent: 20.0,
    constructionCostPerKey: 4500,
    adrBenchmark: 2800,
    occupancyBenchmark: 72,
    regionBucket: "southeast_asia",
  },
  "Vietnam:Ho Chi Minh City:Business:4": {
    softCostPercent: 7.5,
    powcPercent: 4.5,
    ffePercent: 16.0,
    constructionCostPerKey: 3500,
    adrBenchmark: 1800,
    occupancyBenchmark: 70,
    regionBucket: "southeast_asia",
  },

  // === THAILAND ===
  "Thailand:Bangkok:Business:5": {
    softCostPercent: 8.0,
    powcPercent: 5.0,
    ffePercent: 20.0,
    constructionCostPerKey: 5500,
    adrBenchmark: 3500,
    occupancyBenchmark: 75,
    regionBucket: "southeast_asia",
  },
  "Thailand:Bangkok:Business:4": {
    softCostPercent: 7.5,
    powcPercent: 4.5,
    ffePercent: 16.0,
    constructionCostPerKey: 4200,
    adrBenchmark: 2200,
    occupancyBenchmark: 73,
    regionBucket: "southeast_asia",
  },
  "Thailand:Phuket:Resort:5": {
    softCostPercent: 9.0,
    powcPercent: 5.5,
    ffePercent: 26.0,
    constructionCostPerKey: 7500,
    adrBenchmark: 5500,
    occupancyBenchmark: 70,
    regionBucket: "southeast_asia",
  },

  // === AUSTRALIA ===
  "Australia:Sydney:Business:5": {
    softCostPercent: 10.0,
    powcPercent: 6.0,
    ffePercent: 22.0,
    constructionCostPerKey: 550,
    adrBenchmark: 450,
    occupancyBenchmark: 72,
    regionBucket: "australia",
  },
  "Australia:Sydney:Business:4": {
    softCostPercent: 9.5,
    powcPercent: 5.5,
    ffePercent: 18.0,
    constructionCostPerKey: 420,
    adrBenchmark: 320,
    occupancyBenchmark: 70,
    regionBucket: "australia",
  },
};

function profileKeyFromProject(pi: ProjectInfo): string | null {
  if (!pi.country || !pi.city) return null;
  const op = (pi.hotelOperatingType ?? "").trim();
  const star = Number(pi.hotelStarRating);
  if (!op || !Number.isFinite(star) || star <= 0) return null;
  const opTitle = op.charAt(0).toUpperCase() + op.slice(1).toLowerCase();
  return `${pi.country.trim()}:${pi.city.trim()}:${opTitle}:${Math.round(star)}`;
}

function findProfileDefault(pi: ProjectInfo) {
  const rawKey = profileKeyFromProject(pi);
  if (!rawKey) return { key: null as string | null, profile: undefined as (typeof PROFILE_DEFAULTS)[string] | undefined };

  // Fast path: exact match.
  const exact = PROFILE_DEFAULTS[rawKey];
  if (exact) return { key: rawKey, profile: exact };

  // Case/whitespace-insensitive fallback.
  const norm = rawKey.replace(/\s+/g, " ").trim().toLowerCase();
  for (const k of Object.keys(PROFILE_DEFAULTS)) {
    if (k.replace(/\s+/g, " ").trim().toLowerCase() === norm) {
      return { key: k, profile: PROFILE_DEFAULTS[k]! };
    }
  }
  return { key: rawKey, profile: undefined };
}

function getProfileKey(
  country: string,
  city: string,
  hotelOperatingType: string,
  hotelStarRating: string | number
): string {
  const op = String(hotelOperatingType || "").trim();
  const opTitle = op ? op.charAt(0).toUpperCase() + op.slice(1).toLowerCase() : "Business";
  const star = Math.round(Number(hotelStarRating) || 5);
  return `${String(country || "").trim()}:${String(city || "").trim()}:${opTitle}:${star}`;
}

function getProfileDefaults(profileKey: string) {
  const exact = PROFILE_DEFAULTS[profileKey];
  if (exact) return exact;
  const norm = profileKey.replace(/\s+/g, " ").trim().toLowerCase();
  for (const k of Object.keys(PROFILE_DEFAULTS)) {
    if (k.replace(/\s+/g, " ").trim().toLowerCase() === norm) {
      return PROFILE_DEFAULTS[k]!;
    }
  }
  return undefined;
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

function CashOutflowsPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const streamPrefix: StreamPrefix = "/operational";
  const isOperationalStream = true;
  const operationalHotelProfilePrevKeyRef = useRef<string | null>(null);
  const operationalRetailProfilePrevKeyRef = useRef<string | null>(null);
  const operationalOfficeProfilePrevKeyRef = useRef<string | null>(null);
  const cashOutflowStepVisitLogged = useRef<Set<number>>(new Set());
  const buildingTypeOptions = isOperationalStream
    ? OPERATIONAL_BUILDING_TYPES
    : SALE_BUILDING_SUBTYPES;
  const projectInfo = useFinModelStore((s) => s.operational?.projectInfo);
  const hasResearchedForHotelRef = useRef<string | null>(null);
  const hasResearchedForRetailRef = useRef<string | null>(null);
  const hasResearchedForOfficeRef = useRef<string | null>(null);
  const hasResearchedForResidentialRef = useRef<string | null>(null);
  const cashOutflows = useFinModelStore((s) => s.operational?.cashOutflows);
  const [isMapGeocoding, setIsMapGeocoding] = useState(false);
  const isOperationalHotel =
    isOperationalStream && projectInfo.buildingType === "hotel";
  const isOperationalRetail =
    isOperationalStream && projectInfo.buildingType === "retail";
  const isOperationalOffice =
    isOperationalStream && projectInfo.buildingType === "office";
  const isOperationalResidential =
    isOperationalStream && projectInfo.buildingType === "residential";
  const isStep4LockedBua =
    isOperationalHotel ||
    isOperationalRetail ||
    isOperationalOffice ||
    isOperationalResidential;
  const step4BuildingBua = isOperationalHotel
    ? projectInfo.hotelTotalBuildingBUA
    : isOperationalRetail
      ? projectInfo.retailTotalBuildingBUA
      : isOperationalOffice
        ? projectInfo.officeTotalBuildingBUA
        : isOperationalResidential
          ? projectInfo.residentialTotalBuildingBUA
          : undefined;
  const step4BasementBua = isOperationalHotel
    ? projectInfo.hotelBasementBUA
    : isOperationalRetail
      ? projectInfo.retailBasementBUA
      : isOperationalOffice
        ? projectInfo.officeBasementBUA
        : isOperationalResidential
          ? projectInfo.residentialBasementBUA
          : undefined;
  const step4ParkingBua = isOperationalHotel
    ? projectInfo.hotelPodiumBUA
    : isOperationalRetail
      ? projectInfo.retailPodiumBUA
      : isOperationalOffice
        ? projectInfo.officePodiumBUA
        : isOperationalResidential
          ? projectInfo.residentialPodiumBUA
          : undefined;
  const effectiveParkingBua = isStep4LockedBua
    ? step4ParkingBua || 0
    : cashOutflows.parkingBUA || 0;
  const effectiveBasementBua = isStep4LockedBua
    ? step4BasementBua || 0
    : cashOutflows.basementBUA || 0;
  const step4PlotArea = isOperationalHotel
    ? projectInfo.hotelPlotArea
    : isOperationalRetail
      ? projectInfo.retailPlotArea
      : isOperationalOffice
        ? projectInfo.officePlotArea
        : isOperationalResidential
          ? projectInfo.residentialPlotArea
          : undefined;
  const showsOperationalFfe =
    isOperationalHotel ||
    isOperationalRetail ||
    isOperationalOffice ||
    isOperationalResidential;
  const patchUpdateProjectInfo = useFinModelStore((s) => s.updateProjectInfo);
  const patchUpdateCashOutflows = useFinModelStore((s) => s.updateCashOutflows);
  const updateProjectInfoForStream = useCallback(
    (data: Partial<ProjectInfo>) => patchUpdateProjectInfo(data, "operational"),
    [patchUpdateProjectInfo]
  );
  const updateCashOutflowsForStream = useCallback(
    (data: Partial<CashOutflows>) => patchUpdateCashOutflows(data, "operational"),
    [patchUpdateCashOutflows]
  );

  const handleSaveProject = useCallback(async () => {
    console.log("💾 [NEW SAVE] Starting project save to Puter KV...");

    try {
      // 1. Verify Puter is available
      if (typeof window === "undefined" || !(window as any).puter) {
        console.error("❌ [NEW SAVE] Puter.js is not loaded!");
        alert(
          "❌ Puter is not available. Please ensure you are logged into your Puter account."
        );
        return;
      }
      console.log("✅ [NEW SAVE] Puter.js is available");

      // 2. Get current state
      const state = useFinModelStore.getState();
      const currentProjectInfo = state.operational.projectInfo;
      const currentCashOutflows = state.operational.cashOutflows;

      // 3. Generate or retrieve Project ID
      const urlParams = new URLSearchParams(window.location.search);
      let projectId = urlParams.get("projectId");

      if (!projectId) {
        projectId = `proj_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        console.log("💾 [NEW SAVE] Generated new project ID:", projectId);

        // Update URL silently
        const newUrl = `${window.location.pathname}?projectId=${projectId}`;
        window.history.replaceState({}, "", newUrl);
      } else {
        console.log("💾 [NEW SAVE] Using existing project ID:", projectId);
      }

      // 4. Prepare lightweight index item
      const indexItem: ProjectIndexItem = {
        id: projectId,
        title:
          (currentProjectInfo as { projectName?: string }).projectName ||
          state.activeProjectName ||
          `${currentProjectInfo.buildingType || "Project"} - ${currentProjectInfo.city || "Unknown"}`,
        type: "Operational",
        location: `${currentProjectInfo.city || "Unknown"}, ${currentProjectInfo.country || "Unknown"}`,
        status: "In Progress",
        lastModified: new Date().toISOString(),
      };

      // 5. Prepare full project payload
      const projectData = {
        id: projectId,
        operational: {
          projectInfo: currentProjectInfo,
          cashOutflows: currentCashOutflows,
        },
        savedAt: new Date().toISOString(),
      };

      console.log(
        "💾 [NEW SAVE] Payload prepared. Size:",
        JSON.stringify(projectData).length,
        "bytes"
      );

      // 6. Save to Puter KV
      await saveProject(indexItem, projectData);
      console.log("✅ [NEW SAVE] Successfully saved to Puter KV!");

      // 7. Show new success alert
      alert(
        `✅ Project saved successfully to your Puter cloud!\n\nProject ID: ${projectId}`
      );
    } catch (error) {
      console.error("❌ [NEW SAVE] Failed to save project:", error);
      alert(
        `❌ Failed to save project.\n\nError: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }, []);

  const { performResearch, isLoading: isAiLoading, error: aiError } =
    useAiResearch();

  useEffect(() => {
    const state = useFinModelStore.getState() as any;

    // TEMP DEBUG: identify whether existing data lives in root vs operational slice
    // eslint-disable-next-line no-console
    console.log("=== COMPONENT 1 DEBUG: STORE PATH CHECK ===");
    // eslint-disable-next-line no-console
    console.log("Root cashOutflows:", state.cashOutflows);
    // eslint-disable-next-line no-console
    console.log("Operational cashOutflows:", state.operational?.cashOutflows);
    // eslint-disable-next-line no-console
    console.log("Root projectInfo:", state.projectInfo);
    // eslint-disable-next-line no-console
    console.log("Operational projectInfo:", state.operational?.projectInfo);

    const rootHasData = !!state.cashOutflows?.landCost;
    const operationalHasData = !!state.operational?.cashOutflows?.landCost;

    // eslint-disable-next-line no-console
    console.log("Root has data:", rootHasData);
    // eslint-disable-next-line no-console
    console.log("Operational has data:", operationalHasData);
    // eslint-disable-next-line no-console
    console.log(
      "Reading from:",
      operationalHasData ? "operational ✅" : rootHasData ? "root ❌" : "neither"
    );
  }, []);

  const [currentStep, setCurrentStep] = useState(0);
  const [errors, setErrors] = useState<Errors>({});

  /** Avoid clobbering edits; `type="number"` + `Number(x) || 0` was persisting 0 mid-typing. */
  const constructionPeriodFocusedRef = useRef(false);
  const [constructionPeriodDraft, setConstructionPeriodDraft] = useState(() =>
    String(cashOutflows.constructionPeriod)
  );

  const hotelTotalFloors = useMemo(() => {
    return (
      (projectInfo.hotelBasements || 0) +
      (projectInfo.hotelPodiums || 0) +
      (projectInfo.hotelGroundFloors || 0) +
      (projectInfo.hotelGuestRoomFloors || 0)
    );
  }, [
    projectInfo.hotelBasements,
    projectInfo.hotelPodiums,
    projectInfo.hotelGroundFloors,
    projectInfo.hotelGuestRoomFloors,
  ]);

  const hotelAvgRoomSize = useMemo(() => {
    const keys = projectInfo.hotelTotalKeys || 0;
    const gla = projectInfo.hotelGuestRoomGLA || 0;
    return keys > 0 ? Math.round(gla / keys) : 0;
  }, [projectInfo.hotelTotalKeys, projectInfo.hotelGuestRoomGLA]);

  const retailTotalFloors = useMemo(() => {
    return (
      (projectInfo.retailBasements || 0) +
      (projectInfo.retailPodiums || 0) +
      (projectInfo.retailGroundFloors || 0) +
      (projectInfo.retailRetailFloors || 0)
    );
  }, [
    projectInfo.retailBasements,
    projectInfo.retailPodiums,
    projectInfo.retailGroundFloors,
    projectInfo.retailRetailFloors,
  ]);

  const officeTotalFloors = useMemo(() => {
    return (
      (projectInfo.officeBasements || 0) +
      (projectInfo.officePodiums || 0) +
      (projectInfo.officeGroundFloors || 0) +
      (projectInfo.officeOfficeFloors || 0)
    );
  }, [
    projectInfo.officeBasements,
    projectInfo.officePodiums,
    projectInfo.officeGroundFloors,
    projectInfo.officeOfficeFloors,
  ]);

  const residentialTotalFloors = useMemo(() => {
    return (
      (projectInfo.residentialBasements || 0) +
      (projectInfo.residentialPodiums || 0) +
      (projectInfo.residentialGroundFloors || 0) +
      (projectInfo.residentialResidentialFloors || 0)
    );
  }, [
    projectInfo.residentialBasements,
    projectInfo.residentialPodiums,
    projectInfo.residentialGroundFloors,
    projectInfo.residentialResidentialFloors,
  ]);

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
        router.replace(withStreamPrefix("/operational", "/preview/cash-outflows"));
        return;
      }
    }

    // UI shows "Step 1..14"; internal state is 0..13
    const desired = Math.min(totalSteps - 1, Math.max(0, Math.round(parsed) - 1));
    setCurrentStep(desired);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const logCashOutflowAudit = (
    field: string,
    value: string | number | boolean,
    uiStepOverride?: number
  ) => {
    const meta = CASH_OUTFLOW_AUDIT_FIELDS[field];
    const uiStep = uiStepOverride ?? meta?.uiStep ?? currentStep + 1;
    const stepTitle =
      CASH_OUTFLOW_STEP_NAMES[uiStep] ?? meta?.label ?? `Step ${uiStep}`;
    logAuditChange({
      id: `operational.cashOutflows.${field}`,
      label: meta?.label ?? humanizeFieldId(field),
      value: formatCashOutflowAuditDisplay(field, value),
      component: CASH_OUTFLOWS_COMPONENT,
      step: `Step ${uiStep}: ${stepTitle}`,
      route: cashOutflowAuditRoute(uiStep),
      type:
        meta?.type ??
        (typeof value === "boolean" ? "toggle" : typeof value === "string" ? "select" : "input"),
    });
  };

  // Log Step 3 asset type & Step 4 segment/positioning on first visit
  useEffect(() => {
    if (!isOperationalStream) return;
    const uiStep = currentStep + 1;

    if (uiStep === 3 && projectInfo.buildingType) {
      if (!cashOutflowStepVisitLogged.current.has(3)) {
        cashOutflowStepVisitLogged.current.add(3);
        logOperationalCashOutflow("buildingType", projectInfo.buildingType, 3);
      }
    }

    if (uiStep === 4) {
      if (!cashOutflowStepVisitLogged.current.has(4)) {
        cashOutflowStepVisitLogged.current.add(4);
        if (isOperationalHotel) {
          if (projectInfo.hotelOperatingType) {
            logOperationalCashOutflow(
              "hotelOperatingType",
              projectInfo.hotelOperatingType,
              4
            );
          }
          if (projectInfo.hotelStarRating) {
            logOperationalCashOutflow(
              "hotelStarRating",
              projectInfo.hotelStarRating,
              4
            );
          }
        } else if (isOperationalRetail) {
          if (projectInfo.retailSegment) {
            logOperationalCashOutflow("retailSegment", projectInfo.retailSegment, 4);
          }
          if (projectInfo.retailPositioning) {
            logOperationalCashOutflow(
              "retailPositioning",
              projectInfo.retailPositioning,
              4
            );
          }
        } else if (isOperationalOffice) {
          if (projectInfo.officeSegment) {
            logOperationalCashOutflow("officeSegment", projectInfo.officeSegment, 4);
          }
          if (projectInfo.officePositioning) {
            logOperationalCashOutflow(
              "officePositioning",
              projectInfo.officePositioning,
              4
            );
          }
        } else if (isOperationalResidential) {
          if (projectInfo.residentialSegment) {
            logOperationalCashOutflow(
              "residentialSegment",
              projectInfo.residentialSegment,
              4
            );
          }
          if (projectInfo.residentialPositioning) {
            logOperationalCashOutflow(
              "residentialPositioning",
              projectInfo.residentialPositioning,
              4
            );
          }
        }
      }
    }

    if (uiStep === 6 && !cashOutflowStepVisitLogged.current.has(6)) {
      cashOutflowStepVisitLogged.current.add(6);
      logOperationalCashOutflow("buildingBUA", cashOutflows.buildingBUA, 6);
      logOperationalCashOutflow("buildingRate", cashOutflows.buildingRate, 6);
      logOperationalCashOutflow("parkingBUA", cashOutflows.parkingBUA, 6);
      logOperationalCashOutflow("parkingRate", cashOutflows.parkingRate, 6);
      logOperationalCashOutflow("basementBUA", cashOutflows.basementBUA, 6);
      logOperationalCashOutflow("basementRate", cashOutflows.basementRate, 6);
    }

    if (uiStep === 7 && !cashOutflowStepVisitLogged.current.has(7)) {
      cashOutflowStepVisitLogged.current.add(7);
      logOperationalCashOutflow(
        "contingencyPercent",
        cashOutflows.contingencyPercent,
        7
      );
    }

    if (uiStep === 8 && !cashOutflowStepVisitLogged.current.has(8)) {
      cashOutflowStepVisitLogged.current.add(8);
      logOperationalCashOutflow("softCostPercent", cashOutflows.softCostPercent, 8);
      logOperationalCashOutflow("powcPercent", cashOutflows.powcPercent, 8);
      if (showsOperationalFfe) {
        logOperationalCashOutflow("ffePercent", cashOutflows.ffePercent, 8);
      }
    }

    if (uiStep === 9 && !cashOutflowStepVisitLogged.current.has(9)) {
      cashOutflowStepVisitLogged.current.add(9);
      logOperationalCashOutflow("landArea", cashOutflows.landArea, 9);
      logOperationalCashOutflow("landRate", cashOutflows.landRate, 9);
    }

    if (uiStep === 11) {
      const months = cashOutflows.constructionPeriod;
      if (months >= 6 && months <= 84) {
        if (!cashOutflowStepVisitLogged.current.has(11)) {
          cashOutflowStepVisitLogged.current.add(11);
          logOperationalCashOutflow("constructionPeriod", months, 11);
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
    cashOutflows.ffePercent,
    cashOutflows.landArea,
    cashOutflows.landRate,
    cashOutflows.parkingBUA,
    cashOutflows.parkingRate,
    cashOutflows.powcPercent,
    cashOutflows.softCostPercent,
    isOperationalHotel,
    isOperationalOffice,
    isOperationalResidential,
    isOperationalRetail,
    isOperationalStream,
    projectInfo.buildingType,
    projectInfo.hotelOperatingType,
    projectInfo.hotelStarRating,
    projectInfo.officePositioning,
    projectInfo.officeSegment,
    projectInfo.residentialPositioning,
    projectInfo.residentialSegment,
    projectInfo.retailPositioning,
    projectInfo.retailSegment,
    showsOperationalFfe,
  ]);

  const aiDataRaw = cashOutflows.aiResearchData;
  const aiData = useMemo(() => {
    if (!aiDataRaw) return undefined;
    // Re-normalize legacy flat AI payloads stored before the nested schema.
    if (
      aiDataRaw.c1_development &&
      !(aiDataRaw.c1_development as { construction_rates?: unknown }).construction_rates
    ) {
      return normalizeAiResearchData(aiDataRaw) as unknown as AiResearchData;
    }
    return aiDataRaw;
  }, [aiDataRaw]);
  const aiC1 = aiData?.c1_development;

  const aiBuildingRate =
    aiC1?.construction_rates?.building_rate_psf ??
    (aiC1?.construction_rates as { buildingRate?: number } | undefined)?.buildingRate;
  const aiParkingRate =
    aiC1?.construction_rates?.parking_rate_psf ??
    (aiC1?.construction_rates as { parkingRate?: number } | undefined)?.parkingRate;
  const aiBasementRate =
    aiC1?.construction_rates?.basement_rate_psf ??
    (aiC1?.construction_rates as { basementRate?: number } | undefined)?.basementRate;
  const aiLandRate = aiC1?.land_rate_psf;
  const aiScPct = aiC1?.soft_costs?.sc_percentage;
  const aiPowcPct = aiC1?.soft_costs?.powc_percentage;
  const aiFfePct = aiC1?.soft_costs?.ffe_percentage?.recommended;
  const aiFfeMin = aiC1?.soft_costs?.ffe_percentage?.min_range;
  const aiFfeMax = aiC1?.soft_costs?.ffe_percentage?.max_range;
  const aiFfeRange = aiC1?.soft_costs?.ffe_percentage;
  const ffeSegmentLabel = isOperationalRetail
    ? (projectInfo.retailSegment || "retail").replace(/_/g, " ")
    : isOperationalHotel
      ? (projectInfo.hotelOperatingType || "hotel").replace(/_/g, " ")
      : isOperationalOffice
        ? (projectInfo.officeSegment || "office").replace(/_/g, " ")
        : isOperationalResidential
          ? (projectInfo.residentialSegment || "residential").replace(/_/g, " ")
          : getOperationalFfeAssetLabel(projectInfo.buildingType);
  const aiPowcBreakdown = aiC1?.powc_breakdown;
  const aiScBreakdown = aiC1?.sc_breakdown;
  const aiScurve = aiC1?.s_curve;

  const ALLOC_EPS = 0.01;
  const differsFromAi = (current: number, ai?: number | null) =>
    ai != null && Number.isFinite(ai) && Math.abs(current - ai) > ALLOC_EPS;

  const hasStageAllocationOverride = useMemo(() => {
    if (!aiScurve) return false;
    const sa = cashOutflows.stageAllocation;
    return (
      differsFromAi(sa.stage1Percent, aiScurve.stage_1_pct) ||
      differsFromAi(sa.stage2Percent, aiScurve.stage_2_pct) ||
      differsFromAi(sa.stage3Percent, aiScurve.stage_3_pct) ||
      differsFromAi(sa.stage4Percent, aiScurve.stage_4_pct)
    );
  }, [
    aiScurve,
    cashOutflows.stageAllocation.stage1Percent,
    cashOutflows.stageAllocation.stage2Percent,
    cashOutflows.stageAllocation.stage3Percent,
    cashOutflows.stageAllocation.stage4Percent,
  ]);

  const powcAllocCurrent =
    cashOutflows.powcAllocation ?? { ...DEFAULT_POWC_ALLOCATION };
  const softAllocCurrent =
    cashOutflows.softCostAllocation ?? { ...DEFAULT_SOFT_COST_ALLOCATION };

  const hasPowcAllocationOverride = useMemo(() => {
    if (!aiPowcBreakdown) return false;
    return (
      differsFromAi(
        powcAllocCurrent.siteEstablishment,
        aiPowcBreakdown.site_establishment_pct
      ) ||
      differsFromAi(powcAllocCurrent.overhead, aiPowcBreakdown.overhead_pct) ||
      differsFromAi(
        powcAllocCurrent.authorityFees,
        aiPowcBreakdown.authority_fees_pct
      )
    );
  }, [
    aiPowcBreakdown,
    powcAllocCurrent.siteEstablishment,
    powcAllocCurrent.overhead,
    powcAllocCurrent.authorityFees,
  ]);

  const hasScAllocationOverride = useMemo(() => {
    if (!aiScBreakdown) return false;
    return (
      differsFromAi(softAllocCurrent.architect, aiScBreakdown.architect_pct) ||
      differsFromAi(
        softAllocCurrent.projectManagement,
        aiScBreakdown.pm_pct
      ) ||
      differsFromAi(
        softAllocCurrent.engineering,
        aiScBreakdown.engineering_pct
      ) ||
      differsFromAi(
        softAllocCurrent.geotechnical,
        aiScBreakdown.geotech_pct
      ) ||
      differsFromAi(softAllocCurrent.otherFees, aiScBreakdown.other_pct)
    );
  }, [
    aiScBreakdown,
    softAllocCurrent.architect,
    softAllocCurrent.projectManagement,
    softAllocCurrent.engineering,
    softAllocCurrent.geotechnical,
    softAllocCurrent.otherFees,
  ]);

  const hasDetailedAllocationOverride =
    hasPowcAllocationOverride || hasScAllocationOverride;

  const resetStagesToAiBenchmark = useCallback(() => {
    if (!aiC1?.s_curve) return;
    console.log("[Benchmark Reset] Construction stages from AI:", aiC1.s_curve);
    updateCashOutflowsForStream({
      stageAllocation: {
        ...cashOutflows.stageAllocation,
        stage1Percent: aiC1.s_curve.stage_1_pct ?? 10,
        stage2Percent: aiC1.s_curve.stage_2_pct ?? 20,
        stage3Percent: aiC1.s_curve.stage_3_pct ?? 40,
        stage4Percent: aiC1.s_curve.stage_4_pct ?? 30,
      },
    });
  }, [aiC1, cashOutflows.stageAllocation, updateCashOutflowsForStream]);

  const resetDetailedAllocationsToAi = useCallback(() => {
    if (!aiC1) return;
    console.log("[Benchmark Reset] POWC/SC allocations from AI:", {
      powc: aiC1.powc_breakdown,
      sc: aiC1.sc_breakdown,
    });
    const patch: Partial<CashOutflows> = {};
    if (aiC1.powc_breakdown) {
      patch.powcAllocation = {
        siteEstablishment: aiC1.powc_breakdown.site_establishment_pct,
        overhead: aiC1.powc_breakdown.overhead_pct,
        authorityFees: aiC1.powc_breakdown.authority_fees_pct,
      };
    }
    if (aiC1.sc_breakdown) {
      patch.softCostAllocation = {
        architect: aiC1.sc_breakdown.architect_pct,
        projectManagement: aiC1.sc_breakdown.pm_pct,
        engineering: aiC1.sc_breakdown.engineering_pct,
        geotechnical: aiC1.sc_breakdown.geotech_pct,
        otherFees: aiC1.sc_breakdown.other_pct,
      };
    }
    if (Object.keys(patch).length > 0) {
      updateCashOutflowsForStream(patch);
    }
  }, [aiC1, updateCashOutflowsForStream]);

  const allocInputClass = (current: number, aiVal?: number | null) => {
    const base =
      "w-20 rounded bg-slate-800 px-3 py-2 text-right text-white focus:outline-none focus:ring-2 focus:ring-emerald-500";
    if (aiVal != null && differsFromAi(current, aiVal)) {
      return `${base} border-2 border-amber-500`;
    }
    if (aiVal != null) {
      return `${base} border-2 border-blue-500`;
    }
    return `${base} border border-slate-600`;
  };

  const renderAllocBadge = (current: number, aiVal?: number | null) => {
    if (aiVal == null) return null;
    if (differsFromAi(current, aiVal)) {
      return (
        <span className="rounded-full bg-amber-500/20 px-1.5 py-0.5 text-[10px] font-medium text-amber-400">
          Override
        </span>
      );
    }
    return (
      <span className="rounded-full bg-blue-500/20 px-1.5 py-0.5 text-[10px] font-medium text-blue-400">
        AI
      </span>
    );
  };

  const hotelHasManualOverride = !!(
    cashOutflows.operationalHotelScManual ||
    cashOutflows.operationalHotelPowcManual ||
    cashOutflows.operationalHotelFfeManual ||
    cashOutflows.operationalHotelBuildingRateManual ||
    cashOutflows.operationalHotelParkingRateManual ||
    cashOutflows.operationalHotelBasementRateManual ||
    cashOutflows.operationalHotelLandRateManual
  );

  const hotelCcRateOverrides = {
    building: !!cashOutflows.operationalHotelBuildingRateManual,
    parking: !!cashOutflows.operationalHotelParkingRateManual,
    basement: !!cashOutflows.operationalHotelBasementRateManual,
    any: !!(
      cashOutflows.operationalHotelBuildingRateManual ||
      cashOutflows.operationalHotelParkingRateManual ||
      cashOutflows.operationalHotelBasementRateManual
    ),
  };

  const hotelSoftPercentOverrides = !!(
    cashOutflows.operationalHotelScManual ||
    cashOutflows.operationalHotelPowcManual ||
    cashOutflows.operationalHotelFfeManual
  );

  const resetHotelToAiBenchmark = useCallback(() => {
    if (!aiC1) return;
    updateCashOutflowsForStream({
      buildingRate: aiBuildingRate ?? cashOutflows.buildingRate,
      parkingRate: aiParkingRate ?? cashOutflows.parkingRate,
      basementRate: aiBasementRate ?? cashOutflows.basementRate,
      softCostPercent: aiScPct ?? cashOutflows.softCostPercent,
      powcPercent: aiPowcPct ?? cashOutflows.powcPercent,
      ffePercent: aiFfePct ?? cashOutflows.ffePercent,
      landRate: aiLandRate ?? cashOutflows.landRate,
      ...(aiC1.construction_period?.months
        ? { constructionPeriod: aiC1.construction_period.months }
        : {}),
      ...(aiC1.s_curve
        ? {
            stageAllocation: {
              stage1Label: cashOutflows.stageAllocation.stage1Label || "Enabling",
              stage1Percent: aiC1.s_curve.stage_1_pct || 10,
              stage2Label:
                cashOutflows.stageAllocation.stage2Label || "Sub-Structure",
              stage2Percent: aiC1.s_curve.stage_2_pct || 20,
              stage3Label:
                cashOutflows.stageAllocation.stage3Label || "Super Structure",
              stage3Percent: aiC1.s_curve.stage_3_pct || 40,
              stage4Label: cashOutflows.stageAllocation.stage4Label || "Finishes",
              stage4Percent: aiC1.s_curve.stage_4_pct || 30,
            },
          }
        : {}),
      ...(aiC1.powc_breakdown
        ? {
            powcAllocation: {
              siteEstablishment: aiC1.powc_breakdown.site_establishment_pct,
              overhead: aiC1.powc_breakdown.overhead_pct,
              authorityFees: aiC1.powc_breakdown.authority_fees_pct,
            },
          }
        : {}),
      ...(aiC1.sc_breakdown
        ? {
            softCostAllocation: {
              architect: aiC1.sc_breakdown.architect_pct,
              projectManagement: aiC1.sc_breakdown.pm_pct,
              engineering: aiC1.sc_breakdown.engineering_pct,
              geotechnical: aiC1.sc_breakdown.geotech_pct,
              otherFees: aiC1.sc_breakdown.other_pct,
            },
          }
        : {}),
      operationalHotelBuildingRateManual: false,
      operationalHotelParkingRateManual: false,
      operationalHotelBasementRateManual: false,
      operationalHotelScManual: false,
      operationalHotelPowcManual: false,
      operationalHotelFfeManual: false,
      operationalHotelLandRateManual: false,
    });
  }, [
    aiBasementRate,
    aiBuildingRate,
    aiC1,
    aiFfePct,
    aiLandRate,
    aiParkingRate,
    aiPowcPct,
    aiScPct,
    cashOutflows.basementRate,
    cashOutflows.buildingRate,
    cashOutflows.ffePercent,
    cashOutflows.landRate,
    cashOutflows.parkingRate,
    cashOutflows.powcPercent,
    cashOutflows.softCostPercent,
    cashOutflows.stageAllocation.stage1Label,
    cashOutflows.stageAllocation.stage2Label,
    cashOutflows.stageAllocation.stage3Label,
    cashOutflows.stageAllocation.stage4Label,
    updateCashOutflowsForStream,
  ]);

  // Auto-zero basement rate when basement BUA is 0
  useEffect(() => {
    if (effectiveBasementBua === 0 && cashOutflows.basementRate !== 0) {
      updateCashOutflowsForStream({ basementRate: 0 });
      console.log("🔧 Auto-zeroed basement rate (BUA is 0)");
    }
  }, [
    effectiveBasementBua,
    cashOutflows.basementRate,
    updateCashOutflowsForStream,
  ]);

  // Temporary: verify FFE AI range persists across step navigation
  useEffect(() => {
    console.log("🔍 SC/POWC/FFE Step - Debug Data:");
    console.log("- Cash Outflows FFE:", cashOutflows?.ffePercent);
    console.log("- AI Research Data:", cashOutflows?.aiResearchData);
    console.log(
      "- AI FFE Percentage:",
      cashOutflows?.aiResearchData?.c1_development?.soft_costs?.ffe_percentage
    );
    console.log(
      "- AI FFE Recommended:",
      cashOutflows?.aiResearchData?.c1_development?.soft_costs?.ffe_percentage
        ?.recommended
    );
    console.log("- Derived aiFfePct:", aiFfePct);
  }, [cashOutflows, aiFfePct]);

  // Auto-zero parking rate when parking BUA is 0
  useEffect(() => {
    if (effectiveParkingBua === 0 && cashOutflows.parkingRate !== 0) {
      updateCashOutflowsForStream({ parkingRate: 0 });
      console.log("🔧 Auto-zeroed parking rate (BUA is 0)");
    }
  }, [
    effectiveParkingBua,
    cashOutflows.parkingRate,
    updateCashOutflowsForStream,
  ]);

  // --- START: Hotel Step-Specific Resets ---
  const resetHotelStep5Rates = useCallback(() => {
    if (!aiC1) return;
    updateCashOutflowsForStream({
      buildingRate: aiBuildingRate ?? cashOutflows.buildingRate,
      parkingRate:
        effectiveParkingBua === 0
          ? 0
          : (aiParkingRate ?? cashOutflows.parkingRate),
      basementRate:
        effectiveBasementBua === 0
          ? 0
          : (aiBasementRate ?? cashOutflows.basementRate),
      operationalHotelBuildingRateManual: false,
      operationalHotelParkingRateManual: false,
      operationalHotelBasementRateManual: false,
    });
  }, [
    aiBuildingRate,
    aiParkingRate,
    aiBasementRate,
    cashOutflows.buildingRate,
    cashOutflows.parkingRate,
    cashOutflows.basementRate,
    effectiveParkingBua,
    effectiveBasementBua,
    updateCashOutflowsForStream,
  ]);

  const resetHotelStep7Percents = useCallback(() => {
    if (!aiC1) return;
    updateCashOutflowsForStream({
      softCostPercent: aiScPct ?? cashOutflows.softCostPercent,
      powcPercent: aiPowcPct ?? cashOutflows.powcPercent,
      ffePercent: aiFfePct ?? cashOutflows.ffePercent,
      operationalHotelScManual: false,
      operationalHotelPowcManual: false,
      operationalHotelFfeManual: false,
    });
  }, [aiScPct, aiPowcPct, aiFfePct, cashOutflows.softCostPercent, cashOutflows.powcPercent, cashOutflows.ffePercent, updateCashOutflowsForStream]);

  const resetHotelStep8LandRate = useCallback(() => {
    if (!aiC1) return;
    updateCashOutflowsForStream({
      landRate: aiLandRate ?? cashOutflows.landRate,
      operationalHotelLandRateManual: false,
    });
  }, [aiLandRate, cashOutflows.landRate, updateCashOutflowsForStream]);

  const resetHotelStep11Stages = useCallback(() => {
    if (!aiC1?.s_curve) return;
    updateCashOutflowsForStream({
      stageAllocation: {
        stage1Label: cashOutflows.stageAllocation.stage1Label || "Enabling",
        stage1Percent: aiC1.s_curve.stage_1_pct || 10,
        stage2Label: cashOutflows.stageAllocation.stage2Label || "Sub-Structure",
        stage2Percent: aiC1.s_curve.stage_2_pct || 20,
        stage3Label: cashOutflows.stageAllocation.stage3Label || "Super Structure",
        stage3Percent: aiC1.s_curve.stage_3_pct || 40,
        stage4Label: cashOutflows.stageAllocation.stage4Label || "Finishes",
        stage4Percent: aiC1.s_curve.stage_4_pct || 30,
      },
    });
  }, [aiC1, cashOutflows.stageAllocation, updateCashOutflowsForStream]);

  const resetHotelStep12Allocations = useCallback(() => {
    if (!aiC1) return;
    updateCashOutflowsForStream({
      ...(aiC1.powc_breakdown ? {
        powcAllocation: {
          siteEstablishment: aiC1.powc_breakdown.site_establishment_pct,
          overhead: aiC1.powc_breakdown.overhead_pct,
          authorityFees: aiC1.powc_breakdown.authority_fees_pct,
        },
      } : {}),
      ...(aiC1.sc_breakdown ? {
        softCostAllocation: {
          architect: aiC1.sc_breakdown.architect_pct,
          projectManagement: aiC1.sc_breakdown.pm_pct,
          engineering: aiC1.sc_breakdown.engineering_pct,
          geotechnical: aiC1.sc_breakdown.geotech_pct,
          otherFees: aiC1.sc_breakdown.other_pct,
        },
      } : {}),
      operationalHotelPowcManual: false,
      operationalHotelScManual: false,
    });
  }, [aiC1, updateCashOutflowsForStream]);
  // --- END: Hotel Step-Specific Resets ---

  const renderHotelBenchmarkBar = (
    resetFn?: () => void,
    hasOverride: boolean = hotelHasManualOverride
  ) => {
    if (!isOperationalHotel || !operationalHotelProfileUi) return null;
    return (
      <div className="mb-6 flex flex-wrap items-center justify-between gap-x-3 gap-y-2 border-b border-slate-700 pb-4">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
          <span className="text-xs font-medium uppercase tracking-wide text-slate-500">
            Benchmark
          </span>
          <HoverTipInline
            tip={operationalHotelProfileUi.tooltip}
            className="cursor-default rounded-md border border-slate-700 bg-slate-800 px-3 py-1 text-sm font-medium text-slate-200"
          >
            {`${projectInfo.hotelOperatingType || "resort"} · ${
              projectInfo.hotelStarRating || "5"
            } · ${(projectInfo.city || "dubai").toLowerCase()}`}
          </HoverTipInline>
          {hasOverride && (
            <span className="inline-flex items-center rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1 text-xs font-medium text-amber-400">
              Manual overrides
            </span>
          )}
        </div>
        {hasOverride && resetFn && (
          <button
            type="button"
            onClick={resetFn}
            className="text-sm font-medium text-emerald-400 transition-colors hover:text-emerald-300"
          >
            Reset to benchmark
          </button>
        )}
      </div>
    );
  };

  const renderRetailBenchmarkBar = ({
    hasManualOverride,
    onReset,
  }: {
    hasManualOverride: boolean;
    onReset?: () => void;
  }) => {
    if (!isOperationalRetail) return null;
    return (
      <BenchmarkHeader
        assetType="retail"
        country={projectInfo.country}
        segment={projectInfo.retailSegment}
        positioning={projectInfo.retailPositioning}
        onUseDefaults={onReset ?? (() => {})}
        isManualOverride={hasManualOverride}
        showResetButton={!!onReset}
      />
    );
  };

  const renderOfficeBenchmarkHeader = ({
    hasManualOverride,
    onReset,
  }: {
    hasManualOverride: boolean;
    onReset?: () => void;
  }) => {
    // Show for Office projects, regardless of legacy benchmark match.
    // AI research data is the primary source now.
    if (!isOperationalOffice) return null;

    const segmentTitle = projectInfo.officeSegment
      ? projectInfo.officeSegment.replace(/_/g, " ")
      : "Office";
    const positioningTitle = projectInfo.officePositioning || "Standard";

    return (
      <div className="mb-6 flex flex-wrap items-center justify-between gap-x-3 gap-y-2 border-b border-slate-700 pb-4">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
          <span className="text-xs font-medium uppercase tracking-wide text-slate-500">
            Benchmark
          </span>
          <div className="rounded-full border border-slate-700 bg-slate-800 px-3 py-1">
            <span className="text-xs text-slate-300">
              Office · {projectInfo.country || "Country"} · {segmentTitle} ·{" "}
              {positioningTitle}
              {projectInfo.officeSegment === "co_working" &&
              projectInfo.officeCoworkingDelivery
                ? ` · ${projectInfo.officeCoworkingDelivery}`
                : ""}
            </span>
          </div>
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
  };

  // Trigger AI Research after Segmentation + Building Config (entering Step 6 Construction)
  useEffect(() => {
    if (!isOperationalHotel || currentStep !== 5) return;
    if (!projectInfo.hotelOperatingType || !projectInfo.hotelStarRating) return;
    if (!projectInfo.country || !projectInfo.city) return;

    // SAFEGUARD: Do not trigger AI if map is still geocoding
    if (projectInfo.coordinates && !projectInfo.subMarket) {
      console.log("⏳ AI Research paused: Waiting for map neighborhood lookup...");
      return;
    }

    // Create the unique fingerprint for the current parameters
    const researchKey = `${AI_CACHE_VERSION}:${projectInfo.country}-${projectInfo.city}-${projectInfo.subMarket || "general"}-${projectInfo.hotelOperatingType}-${projectInfo.hotelStarRating}-${projectInfo.hotelTotalKeys}-${projectInfo.hotelTotalBuildingBUA}`;

    const savedFingerprint = cashOutflows?.aiResearchData?._researchKey;

    // 1. Perfect Match: Skip research
    if (savedFingerprint === researchKey) {
      console.log("✅ Hotel AI Research skipped: Parameters match saved fingerprint.");
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
      const dataWithFingerprint = {
        ...cashOutflows.aiResearchData,
        _researchKey: researchKey,
      };
      updateCashOutflowsForStream({ aiResearchData: dataWithFingerprint });
      return;
    }

    const researchParams = {
      assetType: "hotel" as const,
      location: {
        country: projectInfo.country,
        city: projectInfo.city,
        currency: projectInfo.currency,
        subMarket: projectInfo.subMarket,
        coordinates: projectInfo.coordinates,
      },
      buildingConfig: {
        basements: projectInfo.hotelBasements,
        podiums: projectInfo.hotelPodiums,
        groundFloors: projectInfo.hotelGroundFloors,
        guestRoomFloors: projectInfo.hotelGuestRoomFloors,
        totalBuildingBUA: projectInfo.hotelTotalBuildingBUA,
        basementBUA: projectInfo.hotelBasementBUA,
        podiumBUA: projectInfo.hotelPodiumBUA,
        guestRoomGLA: projectInfo.hotelGuestRoomGLA,
        totalKeys: projectInfo.hotelTotalKeys,
        plotArea: projectInfo.hotelPlotArea,
        operatingSegment: projectInfo.hotelOperatingType,
        starRating: projectInfo.hotelStarRating,
      },
    };

    const triggerPhase1Research = async () => {
      try {
        console.log("🤖 Triggering Phase 1 AI research for Hotel...");
        console.log("📍 Location & Building Payload:", researchParams);
        const rawAiData = await performResearch(researchParams);

        if (rawAiData) {
          const researchData = rawAiData as unknown as AiResearchData;
          console.log(
            "🤖 Hotel Phase 1 AI Research Data:",
            JSON.stringify(researchData, null, 2)
          );
          console.log(
            "🤖 AI C1 Construction Rates:",
            researchData?.c1_development?.construction_rates
          );

          const c1 = researchData.c1_development;
          const rates = c1?.construction_rates;
          const soft = c1?.soft_costs;
          const st = useFinModelStore.getState().operational?.cashOutflows;

          const dataWithFingerprint = { ...researchData, _researchKey: researchKey };
          const patch: Partial<CashOutflows> = {
            aiResearchData: dataWithFingerprint,
          };

          // Apply AI benchmarks unless the user already set a hotel manual override.
          if (!st?.operationalHotelBuildingRateManual && rates?.building_rate_psf) {
            patch.buildingRate = rates.building_rate_psf;
          }
          if (
            !st?.operationalHotelParkingRateManual &&
            rates?.parking_rate_psf &&
            (projectInfo.hotelPodiumBUA || 0) > 0
          ) {
            patch.parkingRate = rates.parking_rate_psf;
          }
          if (
            !st?.operationalHotelBasementRateManual &&
            rates?.basement_rate_psf &&
            (projectInfo.hotelBasementBUA || 0) > 0
          ) {
            patch.basementRate = rates.basement_rate_psf;
          }
          if (!st?.operationalHotelScManual && soft?.sc_percentage != null) {
            patch.softCostPercent = round2(soft.sc_percentage);
          }
          if (!st?.operationalHotelPowcManual && soft?.powc_percentage != null) {
            patch.powcPercent = round2(soft.powc_percentage);
          }
          if (
            !st?.operationalHotelFfeManual &&
            soft?.ffe_percentage?.recommended != null
          ) {
            patch.ffePercent = round2(soft.ffe_percentage.recommended);
          }
          if (!st?.operationalHotelLandRateManual && c1?.land_rate_psf) {
            patch.landRate = c1.land_rate_psf;
          }
          if (c1?.construction_period?.months) {
            patch.constructionPeriod = c1.construction_period.months;
          }
          if (c1?.s_curve) {
            patch.stageAllocation = {
              stage1Label: st?.stageAllocation?.stage1Label || "Enabling",
              stage1Percent: c1.s_curve.stage_1_pct || 10,
              stage2Label: st?.stageAllocation?.stage2Label || "Sub-Structure",
              stage2Percent: c1.s_curve.stage_2_pct || 20,
              stage3Label:
                st?.stageAllocation?.stage3Label || "Super Structure",
              stage3Percent: c1.s_curve.stage_3_pct || 40,
              stage4Label: st?.stageAllocation?.stage4Label || "Finishes",
              stage4Percent: c1.s_curve.stage_4_pct || 30,
            };
          }
          if (!st?.operationalHotelPowcManual && c1?.powc_breakdown) {
            patch.powcAllocation = {
              siteEstablishment: c1.powc_breakdown.site_establishment_pct,
              overhead: c1.powc_breakdown.overhead_pct,
              authorityFees: c1.powc_breakdown.authority_fees_pct,
            };
          }
          if (!st?.operationalHotelScManual && c1?.sc_breakdown) {
            patch.softCostAllocation = {
              architect: c1.sc_breakdown.architect_pct,
              projectManagement: c1.sc_breakdown.pm_pct,
              engineering: c1.sc_breakdown.engineering_pct,
              geotechnical: c1.sc_breakdown.geotech_pct,
              otherFees: c1.sc_breakdown.other_pct,
            };
          }

          updateCashOutflowsForStream(patch);
          console.log("📊 Auto-populated fields from AI research:", patch);

          const storedData =
            useFinModelStore.getState().operational?.cashOutflows
              ?.aiResearchData;
          console.log("🔍 Stored AI Data:", storedData);

          hasResearchedForHotelRef.current = researchKey;
        }
      } catch (error) {
        console.error("❌ Hotel Phase 1 AI research failed:", error);
      }
    };

    void triggerPhase1Research();
  }, [
    isOperationalHotel,
    currentStep,
    projectInfo.hotelOperatingType,
    projectInfo.hotelStarRating,
    projectInfo.country,
    projectInfo.city,
    projectInfo.subMarket,
    projectInfo.coordinates,
    projectInfo.currency,
    projectInfo.hotelBasements,
    projectInfo.hotelPodiums,
    projectInfo.hotelGroundFloors,
    projectInfo.hotelGuestRoomFloors,
    projectInfo.hotelTotalBuildingBUA,
    projectInfo.hotelBasementBUA,
    projectInfo.hotelPodiumBUA,
    projectInfo.hotelGuestRoomGLA,
    projectInfo.hotelTotalKeys,
    projectInfo.hotelPlotArea,
    performResearch,
    updateCashOutflowsForStream,
  ]);

  // Phase 1 AI Research: Retail (single trigger with Step 5 building data)
  useEffect(() => {
    if (!isOperationalRetail || currentStep !== 5) return;
    if (!projectInfo.retailSegment || !projectInfo.retailPositioning) return;
    if (!projectInfo.country || !projectInfo.city) return;

    if (projectInfo.coordinates && !projectInfo.subMarket) {
      console.log("⏳ AI Research paused: Waiting for map neighborhood lookup...");
      return;
    }

    const researchKey = `${AI_CACHE_VERSION}:${projectInfo.country}-${projectInfo.city}-${projectInfo.subMarket || "general"}-${projectInfo.retailSegment}-${projectInfo.retailPositioning}-${projectInfo.retailGLA}-${projectInfo.retailTotalBuildingBUA}`;

    const savedFingerprint = cashOutflows?.aiResearchData?._researchKey;

    if (savedFingerprint === researchKey) {
      console.log("✅ Retail AI Research skipped: Parameters match saved fingerprint.");
      return;
    }

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
      const dataWithFingerprint = {
        ...cashOutflows.aiResearchData,
        _researchKey: researchKey,
      };
      updateCashOutflowsForStream({ aiResearchData: dataWithFingerprint });
      return;
    }

    const researchParams = {
      assetType: "retail" as const,
      location: {
        country: projectInfo.country,
        city: projectInfo.city,
        currency: projectInfo.currency,
        subMarket: projectInfo.subMarket,
        coordinates: projectInfo.coordinates,
      },
      buildingConfig: {
        basements: projectInfo.retailBasements,
        podiums: projectInfo.retailPodiums,
        groundFloors: projectInfo.retailGroundFloors,
        retailFloors: projectInfo.retailRetailFloors,
        totalBuildingBUA: projectInfo.retailTotalBuildingBUA,
        basementBUA: projectInfo.retailBasementBUA,
        podiumBUA: projectInfo.retailPodiumBUA,
        gla: projectInfo.retailGLA,
        glaSqft: projectInfo.retailGLA,
        plotArea: projectInfo.retailPlotArea,
        operatingSegment: projectInfo.retailSegment,
        positioning: projectInfo.retailPositioning,
      },
    };

    const triggerPhase1Research = async () => {
      try {
        console.log("🤖 Triggering Phase 1 AI research for Retail...");
        console.log("📍 Location & Building Payload:", researchParams);
        const rawAiData = await performResearch(researchParams);

        if (rawAiData) {
          const researchData = rawAiData as unknown as AiResearchData;
          console.log(
            "🤖 Retail Phase 1 AI Research Data:",
            JSON.stringify(researchData, null, 2)
          );

          const c1 = researchData.c1_development;
          const rates = c1?.construction_rates;
          const soft = c1?.soft_costs;
          const st = useFinModelStore.getState().operational?.cashOutflows;

          const dataWithFingerprint = { ...researchData, _researchKey: researchKey };
          const patch: Partial<CashOutflows> = {
            aiResearchData: dataWithFingerprint,
          };

          if (!st?.operationalRetailBuildingRateManual && rates?.building_rate_psf) {
            patch.buildingRate = rates.building_rate_psf;
          }
          if (
            !st?.operationalRetailParkingRateManual &&
            rates?.parking_rate_psf &&
            (projectInfo.retailPodiumBUA || 0) > 0
          ) {
            patch.parkingRate = rates.parking_rate_psf;
          }
          if (
            !st?.operationalRetailBasementRateManual &&
            rates?.basement_rate_psf &&
            (projectInfo.retailBasementBUA || 0) > 0
          ) {
            patch.basementRate = rates.basement_rate_psf;
          }
          if (!st?.operationalRetailScManual && soft?.sc_percentage != null) {
            patch.softCostPercent = round2(soft.sc_percentage);
          }
          if (!st?.operationalRetailPowcManual && soft?.powc_percentage != null) {
            patch.powcPercent = round2(soft.powc_percentage);
          }
          if (
            !st?.operationalRetailFfeManual &&
            soft?.ffe_percentage?.recommended != null
          ) {
            patch.ffePercent = round2(soft.ffe_percentage.recommended);
          }
          if (!st?.operationalRetailLandRateManual && c1?.land_rate_psf) {
            patch.landRate = c1.land_rate_psf;
          }
          if (c1?.construction_period?.months) {
            patch.constructionPeriod = c1.construction_period.months;
          }
          if (c1?.s_curve) {
            patch.stageAllocation = {
              stage1Label: st?.stageAllocation?.stage1Label || "Enabling",
              stage1Percent: c1.s_curve.stage_1_pct || 10,
              stage2Label: st?.stageAllocation?.stage2Label || "Sub-Structure",
              stage2Percent: c1.s_curve.stage_2_pct || 20,
              stage3Label:
                st?.stageAllocation?.stage3Label || "Super Structure",
              stage3Percent: c1.s_curve.stage_3_pct || 40,
              stage4Label: st?.stageAllocation?.stage4Label || "Finishes",
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
          console.log("📊 Retail auto-populated fields from AI research:", patch);

          hasResearchedForRetailRef.current = researchKey;
        }
      } catch (error) {
        console.error("❌ Retail Phase 1 AI research failed:", error);
      }
    };

    void triggerPhase1Research();
  }, [
    isOperationalRetail,
    currentStep,
    projectInfo.retailSegment,
    projectInfo.retailPositioning,
    projectInfo.country,
    projectInfo.city,
    projectInfo.subMarket,
    projectInfo.coordinates,
    projectInfo.currency,
    projectInfo.retailBasements,
    projectInfo.retailPodiums,
    projectInfo.retailGroundFloors,
    projectInfo.retailRetailFloors,
    projectInfo.retailTotalBuildingBUA,
    projectInfo.retailBasementBUA,
    projectInfo.retailPodiumBUA,
    projectInfo.retailGLA,
    projectInfo.retailPlotArea,
    performResearch,
    updateCashOutflowsForStream,
  ]);

  // Phase 1 AI Research: Office (single trigger with Step 5 building data)
  useEffect(() => {
    if (!isOperationalOffice || currentStep !== 5) return;
    if (!projectInfo.officeSegment || !projectInfo.officePositioning) return;
    if (!projectInfo.country || !projectInfo.city) return;

    if (projectInfo.coordinates && !projectInfo.subMarket) {
      console.log("⏳ AI Research paused: Waiting for map neighborhood lookup...");
      return;
    }

    const researchKey = `${AI_CACHE_VERSION}:${projectInfo.country}-${projectInfo.city}-${projectInfo.subMarket || "general"}-${projectInfo.officeSegment}-${projectInfo.officePositioning}-${projectInfo.officeGLA}-${projectInfo.officeTotalBuildingBUA}`;

    const savedFingerprint = cashOutflows?.aiResearchData?._researchKey;

    if (savedFingerprint === researchKey) {
      console.log("✅ Office AI Research skipped: Parameters match saved fingerprint.");
      return;
    }

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
      const dataWithFingerprint = {
        ...cashOutflows.aiResearchData,
        _researchKey: researchKey,
      };
      updateCashOutflowsForStream({ aiResearchData: dataWithFingerprint });
      return;
    }

    const researchParams = {
      assetType: "office" as const,
      location: {
        country: projectInfo.country,
        city: projectInfo.city,
        currency: projectInfo.currency,
        subMarket: projectInfo.subMarket,
        coordinates: projectInfo.coordinates,
      },
      buildingConfig: {
        basements: projectInfo.officeBasements,
        podiums: projectInfo.officePodiums,
        groundFloors: projectInfo.officeGroundFloors,
        officeFloors: projectInfo.officeOfficeFloors,
        totalBuildingBUA: projectInfo.officeTotalBuildingBUA,
        basementBUA: projectInfo.officeBasementBUA,
        podiumBUA: projectInfo.officePodiumBUA,
        gla: projectInfo.officeGLA,
        glaSqft: projectInfo.officeGLA,
        plotArea: projectInfo.officePlotArea,
        operatingSegment: projectInfo.officeSegment,
        positioning: projectInfo.officePositioning,
        coworkingDelivery: projectInfo.officeCoworkingDelivery,
      },
    };

    const triggerPhase1Research = async () => {
      try {
        console.log("🤖 Triggering Phase 1 AI research for Office...");
        console.log("📍 Location & Building Payload:", researchParams);
        const rawAiData = await performResearch(researchParams);

        if (rawAiData) {
          const researchData = rawAiData as unknown as AiResearchData;
          console.log(
            "🤖 Office Phase 1 AI Research Data:",
            JSON.stringify(researchData, null, 2)
          );

          const c1 = researchData.c1_development;
          const rates = c1?.construction_rates;
          const soft = c1?.soft_costs;
          const st = useFinModelStore.getState().operational?.cashOutflows;

          const dataWithFingerprint = { ...researchData, _researchKey: researchKey };
          const patch: Partial<CashOutflows> = {
            aiResearchData: dataWithFingerprint,
          };

          if (!st?.operationalOfficeBuildingRateManual && rates?.building_rate_psf) {
            patch.buildingRate = rates.building_rate_psf;
          }
          if (
            !st?.operationalOfficeParkingRateManual &&
            rates?.parking_rate_psf &&
            (projectInfo.officePodiumBUA || 0) > 0
          ) {
            patch.parkingRate = rates.parking_rate_psf;
          }
          if (
            !st?.operationalOfficeBasementRateManual &&
            rates?.basement_rate_psf &&
            (projectInfo.officeBasementBUA || 0) > 0
          ) {
            patch.basementRate = rates.basement_rate_psf;
          }
          if (!st?.operationalOfficeScManual && soft?.sc_percentage != null) {
            patch.softCostPercent = round2(soft.sc_percentage);
          }
          if (!st?.operationalOfficePowcManual && soft?.powc_percentage != null) {
            patch.powcPercent = round2(soft.powc_percentage);
          }
          if (
            !st?.operationalOfficeFfeManual &&
            soft?.ffe_percentage?.recommended != null
          ) {
            patch.ffePercent = round2(soft.ffe_percentage.recommended);
          }
          if (!st?.operationalOfficeLandRateManual && c1?.land_rate_psf) {
            patch.landRate = c1.land_rate_psf;
          }
          if (c1?.construction_period?.months) {
            patch.constructionPeriod = c1.construction_period.months;
          }
          if (c1?.s_curve) {
            patch.stageAllocation = {
              stage1Label: st?.stageAllocation?.stage1Label || "Enabling",
              stage1Percent: c1.s_curve.stage_1_pct || 10,
              stage2Label: st?.stageAllocation?.stage2Label || "Sub-Structure",
              stage2Percent: c1.s_curve.stage_2_pct || 20,
              stage3Label:
                st?.stageAllocation?.stage3Label || "Super Structure",
              stage3Percent: c1.s_curve.stage_3_pct || 40,
              stage4Label: st?.stageAllocation?.stage4Label || "Finishes",
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
          console.log("📊 Office auto-populated fields from AI research:", patch);

          hasResearchedForOfficeRef.current = researchKey;
        }
      } catch (error) {
        console.error("❌ Office Phase 1 AI research failed:", error);
      }
    };

    void triggerPhase1Research();
  }, [
    isOperationalOffice,
    currentStep,
    projectInfo.officeSegment,
    projectInfo.officePositioning,
    projectInfo.officeCoworkingDelivery,
    projectInfo.country,
    projectInfo.city,
    projectInfo.subMarket,
    projectInfo.coordinates,
    projectInfo.currency,
    projectInfo.officeBasements,
    projectInfo.officePodiums,
    projectInfo.officeGroundFloors,
    projectInfo.officeOfficeFloors,
    projectInfo.officeTotalBuildingBUA,
    projectInfo.officeBasementBUA,
    projectInfo.officePodiumBUA,
    projectInfo.officeGLA,
    projectInfo.officePlotArea,
    performResearch,
    updateCashOutflowsForStream,
  ]);

  // Phase 1 AI Research: Residential BTR (single trigger with Step 5 building data)
  useEffect(() => {
    if (!isOperationalResidential || currentStep !== 5) return;
    if (!projectInfo.residentialSegment || !projectInfo.residentialPositioning) return;
    if (!projectInfo.country || !projectInfo.city) return;

    if (projectInfo.coordinates && !projectInfo.subMarket) {
      console.log("⏳ AI Research paused: Waiting for map neighborhood lookup...");
      return;
    }

    const researchKey = `${AI_CACHE_VERSION}:${projectInfo.country}-${projectInfo.city}-${projectInfo.subMarket || "general"}-${projectInfo.residentialSegment}-${projectInfo.residentialPositioning}-${projectInfo.residentialGLA}-${projectInfo.residentialTotalBuildingBUA}`;

    const savedFingerprint = cashOutflows?.aiResearchData?._researchKey;

    if (savedFingerprint === researchKey) {
      console.log("✅ Residential AI Research skipped: Parameters match saved fingerprint.");
      return;
    }

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
      const dataWithFingerprint = {
        ...cashOutflows.aiResearchData,
        _researchKey: researchKey,
      };
      updateCashOutflowsForStream({ aiResearchData: dataWithFingerprint });
      return;
    }

    const researchParams = {
      assetType: "residential-btr" as const,
      location: {
        country: projectInfo.country,
        city: projectInfo.city,
        currency: projectInfo.currency,
        subMarket: projectInfo.subMarket,
        coordinates: projectInfo.coordinates,
      },
      buildingConfig: {
        basements: projectInfo.residentialBasements,
        podiums: projectInfo.residentialPodiums,
        groundFloors: projectInfo.residentialGroundFloors,
        residentialFloors: projectInfo.residentialResidentialFloors,
        totalBuildingBUA: projectInfo.residentialTotalBuildingBUA,
        basementBUA: projectInfo.residentialBasementBUA,
        podiumBUA: projectInfo.residentialPodiumBUA,
        gla: projectInfo.residentialGLA,
        glaSqft: projectInfo.residentialGLA,
        plotArea: projectInfo.residentialPlotArea,
        operatingSegment: projectInfo.residentialSegment,
        positioning: projectInfo.residentialPositioning,
        furnishingLevel: projectInfo.residentialFurnishingLevel,
        isServiced: projectInfo.residentialIsServicedApartment,
      },
    };

    const triggerPhase1Research = async () => {
      try {
        console.log("🤖 Triggering Phase 1 AI research for Residential...");
        console.log("📍 Location & Building Payload:", researchParams);
        const rawAiData = await performResearch(researchParams);

        if (rawAiData) {
          const researchData = rawAiData as unknown as AiResearchData;
          console.log(
            "🤖 Residential Phase 1 AI Research Data:",
            JSON.stringify(researchData, null, 2)
          );

          const c1 = researchData.c1_development;
          const rates = c1?.construction_rates;
          const soft = c1?.soft_costs;
          const st = useFinModelStore.getState().operational?.cashOutflows;

          const dataWithFingerprint = { ...researchData, _researchKey: researchKey };
          const patch: Partial<CashOutflows> = {
            aiResearchData: dataWithFingerprint,
          };

          if (
            !st?.operationalResidentialBuildingRateManual &&
            rates?.building_rate_psf
          ) {
            patch.buildingRate = rates.building_rate_psf;
          }
          if (
            !st?.operationalResidentialParkingRateManual &&
            rates?.parking_rate_psf &&
            (projectInfo.residentialPodiumBUA || 0) > 0
          ) {
            patch.parkingRate = rates.parking_rate_psf;
          }
          if (
            !st?.operationalResidentialBasementRateManual &&
            rates?.basement_rate_psf &&
            (projectInfo.residentialBasementBUA || 0) > 0
          ) {
            patch.basementRate = rates.basement_rate_psf;
          }
          if (!st?.operationalResidentialScManual && soft?.sc_percentage != null) {
            patch.softCostPercent = round2(soft.sc_percentage);
          }
          if (!st?.operationalResidentialPowcManual && soft?.powc_percentage != null) {
            patch.powcPercent = round2(soft.powc_percentage);
          }
          if (
            !st?.operationalResidentialFfeManual &&
            soft?.ffe_percentage?.recommended != null
          ) {
            patch.ffePercent = round2(soft.ffe_percentage.recommended);
          }
          if (!st?.operationalResidentialLandRateManual && c1?.land_rate_psf) {
            patch.landRate = c1.land_rate_psf;
          }
          if (c1?.construction_period?.months) {
            patch.constructionPeriod = c1.construction_period.months;
          }
          if (c1?.s_curve) {
            patch.stageAllocation = {
              stage1Label: st?.stageAllocation?.stage1Label || "Enabling",
              stage1Percent: c1.s_curve.stage_1_pct || 10,
              stage2Label: st?.stageAllocation?.stage2Label || "Sub-Structure",
              stage2Percent: c1.s_curve.stage_2_pct || 20,
              stage3Label:
                st?.stageAllocation?.stage3Label || "Super Structure",
              stage3Percent: c1.s_curve.stage_3_pct || 40,
              stage4Label: st?.stageAllocation?.stage4Label || "Finishes",
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
          console.log("📊 Residential auto-populated fields from AI research:", patch);

          hasResearchedForResidentialRef.current = researchKey;
        }
      } catch (error) {
        console.error("❌ Residential Phase 1 AI research failed:", error);
      }
    };

    void triggerPhase1Research();
  }, [
    isOperationalResidential,
    currentStep,
    projectInfo.residentialSegment,
    projectInfo.residentialPositioning,
    projectInfo.residentialFurnishingLevel,
    projectInfo.residentialIsServicedApartment,
    projectInfo.country,
    projectInfo.city,
    projectInfo.subMarket,
    projectInfo.coordinates,
    projectInfo.currency,
    projectInfo.residentialBasements,
    projectInfo.residentialPodiums,
    projectInfo.residentialGroundFloors,
    projectInfo.residentialResidentialFloors,
    projectInfo.residentialTotalBuildingBUA,
    projectInfo.residentialBasementBUA,
    projectInfo.residentialPodiumBUA,
    projectInfo.residentialGLA,
    projectInfo.residentialPlotArea,
    performResearch,
    updateCashOutflowsForStream,
  ]);

  // Sync Hotel Step 5 BUA data to Cash Outflows state when entering Step 6
  useEffect(() => {
    if (isOperationalHotel && currentStep === 5) {
      const updates: Partial<CashOutflows> = {};
      if (projectInfo.hotelTotalBuildingBUA) {
        updates.buildingBUA = projectInfo.hotelTotalBuildingBUA;
      }
      if (projectInfo.hotelBasementBUA) {
        updates.basementBUA = projectInfo.hotelBasementBUA;
      }
      if (projectInfo.hotelPodiumBUA) {
        updates.parkingBUA = projectInfo.hotelPodiumBUA;
      }

      if (Object.keys(updates).length > 0) {
        updateCashOutflowsForStream(updates);
        console.log(" Synced Hotel Step 5 BUA to Cash Outflows:", updates);
      }
    }
  }, [
    isOperationalHotel,
    currentStep,
    projectInfo.hotelTotalBuildingBUA,
    projectInfo.hotelBasementBUA,
    projectInfo.hotelPodiumBUA,
    updateCashOutflowsForStream,
  ]);

  // Sync Retail Step 5 BUA data to Cash Outflows state when entering Step 6
  useEffect(() => {
    if (isOperationalRetail && currentStep === 5) {
      const updates: Partial<CashOutflows> = {};
      if (projectInfo.retailTotalBuildingBUA) {
        updates.buildingBUA = projectInfo.retailTotalBuildingBUA;
      }
      if (projectInfo.retailBasementBUA) {
        updates.basementBUA = projectInfo.retailBasementBUA;
      }
      if (projectInfo.retailPodiumBUA) {
        updates.parkingBUA = projectInfo.retailPodiumBUA;
      }

      if (Object.keys(updates).length > 0) {
        updateCashOutflowsForStream(updates);
        console.log("🔗 Synced Retail Step 5 BUA to Cash Outflows:", updates);
      }
    }
  }, [
    isOperationalRetail,
    currentStep,
    projectInfo.retailTotalBuildingBUA,
    projectInfo.retailBasementBUA,
    projectInfo.retailPodiumBUA,
    updateCashOutflowsForStream,
  ]);

  // Sync Hotel Step 5 Plot Area to Cash Outflows state when entering Step 9 (Land Costs)
  useEffect(() => {
    if (isOperationalHotel && currentStep === 8) {
      if (projectInfo.hotelPlotArea) {
        updateCashOutflowsForStream({ landArea: projectInfo.hotelPlotArea });
        console.log(
          "🔗 Synced Hotel Step 5 Plot Area to Cash Outflows:",
          projectInfo.hotelPlotArea
        );
      }
    }
  }, [
    isOperationalHotel,
    currentStep,
    projectInfo.hotelPlotArea,
    updateCashOutflowsForStream,
  ]);

  // Sync Retail Step 5 Plot Area to Cash Outflows state when entering Step 9
  useEffect(() => {
    if (isOperationalRetail && currentStep === 8) {
      if (projectInfo.retailPlotArea) {
        updateCashOutflowsForStream({ landArea: projectInfo.retailPlotArea });
        console.log(
          "🔗 Synced Retail Step 5 Plot Area to Cash Outflows:",
          projectInfo.retailPlotArea
        );
      }
    }
  }, [
    isOperationalRetail,
    currentStep,
    projectInfo.retailPlotArea,
    updateCashOutflowsForStream,
  ]);

  // Sync Office Step 5 BUA data to Cash Outflows state when entering Step 6
  useEffect(() => {
    if (isOperationalOffice && currentStep === 5) {
      const updates: Partial<CashOutflows> = {};
      if (projectInfo.officeTotalBuildingBUA) {
        updates.buildingBUA = projectInfo.officeTotalBuildingBUA;
      }
      if (projectInfo.officeBasementBUA) {
        updates.basementBUA = projectInfo.officeBasementBUA;
      }
      if (projectInfo.officePodiumBUA) {
        updates.parkingBUA = projectInfo.officePodiumBUA;
      }

      if (Object.keys(updates).length > 0) {
        updateCashOutflowsForStream(updates);
        console.log(" Synced Office Step 5 BUA to Cash Outflows:", updates);
      }
    }
  }, [
    isOperationalOffice,
    currentStep,
    projectInfo.officeTotalBuildingBUA,
    projectInfo.officeBasementBUA,
    projectInfo.officePodiumBUA,
    updateCashOutflowsForStream,
  ]);

  // Sync Office Step 5 Plot Area to Cash Outflows state when entering Step 9
  useEffect(() => {
    if (isOperationalOffice && currentStep === 8) {
      if (projectInfo.officePlotArea) {
        updateCashOutflowsForStream({ landArea: projectInfo.officePlotArea });
        console.log(
          "🔗 Synced Office Step 5 Plot Area to Cash Outflows:",
          projectInfo.officePlotArea
        );
      }
    }
  }, [
    isOperationalOffice,
    currentStep,
    projectInfo.officePlotArea,
    updateCashOutflowsForStream,
  ]);

  // Sync Residential Step 5 BUA data to Cash Outflows state when entering Step 6
  useEffect(() => {
    if (isOperationalResidential && currentStep === 5) {
      const updates: Partial<CashOutflows> = {};
      if (projectInfo.residentialTotalBuildingBUA) {
        updates.buildingBUA = projectInfo.residentialTotalBuildingBUA;
      }
      if (projectInfo.residentialBasementBUA) {
        updates.basementBUA = projectInfo.residentialBasementBUA;
      }
      if (projectInfo.residentialPodiumBUA) {
        updates.parkingBUA = projectInfo.residentialPodiumBUA;
      }

      if (Object.keys(updates).length > 0) {
        updateCashOutflowsForStream(updates);
        console.log("🔗 Synced Residential Step 5 BUA to Cash Outflows:", updates);
      }
    }
  }, [
    isOperationalResidential,
    currentStep,
    projectInfo.residentialTotalBuildingBUA,
    projectInfo.residentialBasementBUA,
    projectInfo.residentialPodiumBUA,
    updateCashOutflowsForStream,
  ]);

  // Sync Residential Step 5 Plot Area to Cash Outflows state when entering Step 9
  useEffect(() => {
    if (isOperationalResidential && currentStep === 8) {
      if (projectInfo.residentialPlotArea) {
        updateCashOutflowsForStream({ landArea: projectInfo.residentialPlotArea });
        console.log(
          "🔗 Synced Residential Step 5 Plot Area to Cash Outflows:",
          projectInfo.residentialPlotArea
        );
      }
    }
  }, [
    isOperationalResidential,
    currentStep,
    projectInfo.residentialPlotArea,
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
      "retailSegment",
      "retailPositioning",
      "officeSegment",
      "officePositioning",
      "officeCoworkingDelivery",
      "residentialSegment",
      "residentialPositioning",
      "residentialFurnishingLevel",
      "residentialIsServicedApartment",
    ]);
    if (projectFields.has(field)) {
      if (
        field === "country" ||
        field === "city" ||
        field === "currency" ||
        field === "buildingType" ||
        field === "hotelOperatingType" ||
        field === "hotelStarRating" ||
        field === "retailSegment" ||
        field === "retailPositioning" ||
        field === "officeSegment" ||
        field === "officePositioning" ||
        field === "officeCoworkingDelivery" ||
        field === "residentialSegment" ||
        field === "residentialPositioning" ||
        field === "residentialFurnishingLevel" ||
        field === "residentialIsServicedApartment"
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
      !CASH_OUTFLOW_STAGE_ALLOCATION_FIELDS.has(field) &&
      field in CASH_OUTFLOW_AUDIT_FIELDS &&
      (typeof value === "string" ||
        typeof value === "number" ||
        typeof value === "boolean")
    ) {
      logCashOutflowAudit(field, value);
    }
  };

  const updateStageAllocationField = (
    field: keyof typeof cashOutflows.stageAllocation,
    value: string | number
  ) => {
    updateCashOutflowsForStream({
      stageAllocation: { ...cashOutflows.stageAllocation, [field]: value },
    });
  };

  const logConstructionPeriodMonths = (months: number) => {
    if (!isOperationalStream) return;
    if (!Number.isFinite(months) || months < 6 || months > 84) return;
    logOperationalCashOutflow("constructionPeriod", months, 11);
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
  const infrastructureCosts = 0;

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

  const ffe = showsOperationalFfe
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

    // Prefer MVP profile defaults (location + segment + stars) for tooltip + labels.
    const { key: mvpKey, profile: def } = findProfileDefault(projectInfo);
    if (def && mvpKey) {
      const city = (projectInfo.city || "").trim();
      const profileLine = `Profile: ${(op || "resort").toLowerCase()}-${Math.round(
        star
      )}-${(city || "dubai").toLowerCase()}`;
      const tooltip = [
        profileLine,
        `Region bucket: ${def.regionBucket}`,
        "",
        "MVP benchmarks:",
        `- Soft costs (SC): ${def.softCostPercent.toFixed(1)}%`,
        `- Pre-opening & working capital (POWC): ${def.powcPercent.toFixed(1)}%`,
        `- FF&E: ${def.ffePercent.toFixed(1)}%`,
        `- Construction cost / key: ${def.constructionCostPerKey.toLocaleString()}`,
        `- ADR benchmark: ${def.adrBenchmark.toLocaleString()}`,
        `- Occupancy benchmark: ${def.occupancyBenchmark.toFixed(0)}%`,
      ].join("\n");
      return { key: `mvp:${mvpKey}`, profile: null, region: def.regionBucket, tooltip };
    }

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

    // Prefer AI research soft costs when available; MVP/profile tables are fallback only.
    const pickSc = (profilePct: number) =>
      aiScPct != null ? round2(Number(aiScPct)) : round2(profilePct);
    const pickPowc = (profilePct: number) =>
      aiPowcPct != null ? round2(Number(aiPowcPct)) : round2(profilePct);
    const pickFfe = (profilePct: number) =>
      aiFfePct != null ? round2(Number(aiFfePct)) : round2(profilePct);

    // Prefer MVP profile defaults (location + segment + stars) when available.
    const { key: k, profile: def } = findProfileDefault(projectInfo);
    if (def) {
      const st = useFinModelStore.getState().operational?.cashOutflows;
      const patch: Partial<CashOutflows> = {
        operationalHotelProfileKey: `mvp:${k}`,
      };

      const keyChanged =
        operationalHotelProfilePrevKeyRef.current !== null &&
        operationalHotelProfilePrevKeyRef.current !== `mvp:${k}`;
      operationalHotelProfilePrevKeyRef.current = `mvp:${k}`;

      if (keyChanged) {
        patch.operationalHotelScManual = false;
        patch.operationalHotelPowcManual = false;
        patch.operationalHotelFfeManual = false;
        patch.softCostPercent = pickSc(def.softCostPercent);
        patch.powcPercent = pickPowc(def.powcPercent);
        patch.ffePercent = pickFfe(def.ffePercent);
        updateCashOutflowsForStream(patch);
        return;
      }

      if (!st?.operationalHotelScManual)
        patch.softCostPercent = pickSc(def.softCostPercent);
      if (!st?.operationalHotelPowcManual)
        patch.powcPercent = pickPowc(def.powcPercent);
      if (!st?.operationalHotelFfeManual)
        patch.ffePercent = pickFfe(def.ffePercent);

      const pctDiff = (next: number | undefined, cur: number) =>
        next !== undefined && Math.abs(next - cur) > 0.004;
      if (
        pctDiff(patch.softCostPercent, st?.softCostPercent ?? 0) ||
        pctDiff(patch.powcPercent, st?.powcPercent ?? 0) ||
        pctDiff(patch.ffePercent, st?.ffePercent ?? 0) ||
        patch.operationalHotelProfileKey !== st?.operationalHotelProfileKey
      ) {
        updateCashOutflowsForStream(patch);
      }
      return;
    }

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

    const st = useFinModelStore.getState().operational?.cashOutflows;
    const patch: Partial<CashOutflows> = { operationalHotelProfileKey: key };

    if (keyChanged) {
      patch.operationalHotelScManual = false;
      patch.operationalHotelPowcManual = false;
      patch.operationalHotelFfeManual = false;
      patch.softCostPercent = pickSc(softPct);
      patch.powcPercent = pickPowc(powcPct);
      patch.ffePercent = pickFfe(ffePct);
    } else {
      if (!st?.operationalHotelScManual)
        patch.softCostPercent = pickSc(softPct);
      if (!st?.operationalHotelPowcManual)
        patch.powcPercent = pickPowc(powcPct);
      if (!st?.operationalHotelFfeManual)
        patch.ffePercent = pickFfe(ffePct);
    }

    if (keyChanged) {
      updateCashOutflowsForStream(patch);
      return;
    }

    const pctDiff = (next: number | undefined, cur: number) =>
      next !== undefined && Math.abs(next - cur) > 0.004;

    if (
      pctDiff(patch.softCostPercent, st?.softCostPercent ?? 0) ||
      pctDiff(patch.powcPercent, st?.powcPercent ?? 0) ||
      pctDiff(patch.ffePercent, st?.ffePercent ?? 0) ||
      patch.operationalHotelProfileKey !== st?.operationalHotelProfileKey
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
    aiScPct,
    aiPowcPct,
    aiFfePct,
    updateCashOutflowsForStream,
  ]);

  const retailBenchmark = useMemo(() => {
    if (!isOperationalRetail) return null;
    if (!projectInfo.retailSegment?.trim() || !projectInfo.retailPositioning?.trim()) {
      return null;
    }
    return getRetailBenchmark(
      projectInfo.country,
      projectInfo.retailSegment,
      projectInfo.retailPositioning
    );
  }, [
    isOperationalRetail,
    projectInfo.country,
    projectInfo.retailSegment,
    projectInfo.retailPositioning,
  ]);

  const retailProfileKey = useMemo(() => {
    if (!isOperationalRetail) return null;
    if (!projectInfo.retailSegment?.trim() || !projectInfo.retailPositioning?.trim()) {
      return null;
    }
    return getRetailBenchmarkProfileKey(
      projectInfo.country,
      projectInfo.retailSegment,
      projectInfo.retailPositioning
    );
  }, [
    isOperationalRetail,
    projectInfo.country,
    projectInfo.retailSegment,
    projectInfo.retailPositioning,
  ]);

  const retailBenchmarkReady =
    isOperationalRetail &&
    !!projectInfo.retailSegment?.trim() &&
    !!projectInfo.retailPositioning?.trim() &&
    !!retailBenchmark;

  const RETAIL_BENCHMARK_EPS = 0.01;

  const retailCcRateOverrides = useMemo(() => {
    if (!isOperationalRetail) {
      return { building: false, parking: false, basement: false, any: false };
    }

    // Use AI data as the "benchmark" if available, otherwise fall back to legacy benchmark
    const effectiveBuildingRate = aiBuildingRate ?? retailBenchmark?.buildingRate;
    const effectiveParkingRate = aiParkingRate ?? retailBenchmark?.parkingRate;
    const effectiveBasementRate = aiBasementRate ?? retailBenchmark?.basementRate;

    const differs = (current: number, effective: number | undefined) => {
      if (effective == null) return false;
      return Math.abs(current - effective) > RETAIL_BENCHMARK_EPS;
    };

    const building = differs(cashOutflows.buildingRate, effectiveBuildingRate);
    const parking = differs(cashOutflows.parkingRate, effectiveParkingRate);
    const basement = differs(cashOutflows.basementRate, effectiveBasementRate);

    return {
      building,
      parking,
      basement,
      any: building || parking || basement,
    };
  }, [
    isOperationalRetail,
    aiBuildingRate,
    aiParkingRate,
    aiBasementRate,
    retailBenchmark,
    cashOutflows.buildingRate,
    cashOutflows.parkingRate,
    cashOutflows.basementRate,
  ]);

  const handleRetailCcRateChange = useCallback(
    (
      field: "buildingRate" | "parkingRate" | "basementRate",
      manualFlag:
        | "operationalRetailBuildingRateManual"
        | "operationalRetailParkingRateManual"
        | "operationalRetailBasementRateManual",
      value: number,
      benchmarkValue: number
    ) => {
      const hasChanged = Math.abs(value - benchmarkValue) > RETAIL_BENCHMARK_EPS;
      updateCashOutflowsForStream({
        [field]: value,
        [manualFlag]: hasChanged,
      });
      logOperationalCashOutflow(field, value, 6);
    },
    [updateCashOutflowsForStream]
  );

  const retailHasManualOverride =
    isOperationalRetail &&
    !!(
      cashOutflows.operationalRetailBuildingRateManual ||
      cashOutflows.operationalRetailParkingRateManual ||
      cashOutflows.operationalRetailBasementRateManual ||
      cashOutflows.operationalRetailScManual ||
      cashOutflows.operationalRetailPowcManual ||
      cashOutflows.operationalRetailFfeManual ||
      cashOutflows.operationalRetailLandRateManual
    );

  const resetRetailProfileDefaults = useCallback(() => {
    if (!retailBenchmark || !retailProfileKey) return;
    updateCashOutflowsForStream({
      operationalRetailProfileKey: retailProfileKey,
      operationalRetailBuildingRateManual: false,
      operationalRetailParkingRateManual: false,
      operationalRetailBasementRateManual: false,
      operationalRetailScManual: false,
      operationalRetailPowcManual: false,
      operationalRetailFfeManual: false,
      operationalRetailLandRateManual: false,
      buildingRate: retailBenchmark.buildingRate,
      parkingRate: retailBenchmark.parkingRate,
      basementRate: retailBenchmark.basementRate,
      softCostPercent: round2(retailBenchmark.softCostsPercent),
      powcPercent: round2(retailBenchmark.powcPercent),
      ffePercent: round2(retailBenchmark.ffePercent),
      landRate: retailBenchmark.landRate,
    });
    operationalRetailProfilePrevKeyRef.current = retailProfileKey;
  }, [
    retailBenchmark,
    retailProfileKey,
    updateCashOutflowsForStream,
  ]);

  // --- START: Retail AI-Based Reset Functions ---
  const resetRetailToAiBenchmark = useCallback(() => {
    if (!aiC1) return;
    const rates = aiC1.construction_rates;
    const soft = aiC1.soft_costs;
    updateCashOutflowsForStream({
      buildingRate:
        rates?.building_rate_psf ??
        (rates as { buildingRate?: number } | undefined)?.buildingRate ??
        cashOutflows.buildingRate,
      parkingRate:
        rates?.parking_rate_psf ??
        (rates as { parkingRate?: number } | undefined)?.parkingRate ??
        cashOutflows.parkingRate,
      basementRate:
        rates?.basement_rate_psf ??
        (rates as { basementRate?: number } | undefined)?.basementRate ??
        cashOutflows.basementRate,
      softCostPercent:
        soft?.sc_percentage != null
          ? round2(soft.sc_percentage)
          : cashOutflows.softCostPercent,
      powcPercent:
        soft?.powc_percentage != null
          ? round2(soft.powc_percentage)
          : cashOutflows.powcPercent,
      ffePercent:
        soft?.ffe_percentage?.recommended != null
          ? round2(soft.ffe_percentage.recommended)
          : cashOutflows.ffePercent,
      landRate: aiC1.land_rate_psf ?? cashOutflows.landRate,
      operationalRetailBuildingRateManual: false,
      operationalRetailParkingRateManual: false,
      operationalRetailBasementRateManual: false,
      operationalRetailScManual: false,
      operationalRetailPowcManual: false,
      operationalRetailFfeManual: false,
      operationalRetailLandRateManual: false,
    });
  }, [
    aiC1,
    cashOutflows.buildingRate,
    cashOutflows.parkingRate,
    cashOutflows.basementRate,
    cashOutflows.softCostPercent,
    cashOutflows.powcPercent,
    cashOutflows.ffePercent,
    cashOutflows.landRate,
    updateCashOutflowsForStream,
  ]);

  const retailEffectiveBuildingRate =
    aiBuildingRate ?? retailBenchmark?.buildingRate;
  const retailEffectiveParkingRate =
    aiParkingRate ?? retailBenchmark?.parkingRate;
  const retailEffectiveBasementRate =
    aiBasementRate ?? retailBenchmark?.basementRate;

  const resetRetailStep5RatesToAi = useCallback(() => {
    updateCashOutflowsForStream({
      buildingRate:
        retailEffectiveBuildingRate ?? cashOutflows.buildingRate,
      parkingRate: retailEffectiveParkingRate ?? cashOutflows.parkingRate,
      basementRate:
        retailEffectiveBasementRate ?? cashOutflows.basementRate,
      operationalRetailBuildingRateManual: false,
      operationalRetailParkingRateManual: false,
      operationalRetailBasementRateManual: false,
    });
  }, [
    retailEffectiveBuildingRate,
    retailEffectiveParkingRate,
    retailEffectiveBasementRate,
    cashOutflows.buildingRate,
    cashOutflows.parkingRate,
    cashOutflows.basementRate,
    updateCashOutflowsForStream,
  ]);

  const resetRetailStep7PercentsToAi = useCallback(() => {
    if (!aiC1?.soft_costs) return;
    const soft = aiC1.soft_costs;
    updateCashOutflowsForStream({
      softCostPercent:
        soft.sc_percentage != null
          ? round2(soft.sc_percentage)
          : cashOutflows.softCostPercent,
      powcPercent:
        soft.powc_percentage != null
          ? round2(soft.powc_percentage)
          : cashOutflows.powcPercent,
      ffePercent:
        soft.ffe_percentage?.recommended != null
          ? round2(soft.ffe_percentage.recommended)
          : cashOutflows.ffePercent,
      operationalRetailScManual: false,
      operationalRetailPowcManual: false,
      operationalRetailFfeManual: false,
    });
  }, [
    aiC1,
    cashOutflows.softCostPercent,
    cashOutflows.powcPercent,
    cashOutflows.ffePercent,
    updateCashOutflowsForStream,
  ]);

  const resetRetailStep8LandRateToAi = useCallback(() => {
    if (aiC1?.land_rate_psf == null) return;
    updateCashOutflowsForStream({
      landRate: aiC1.land_rate_psf,
      operationalRetailLandRateManual: false,
    });
  }, [aiC1, updateCashOutflowsForStream]);

  const resetRetailStep11StagesToAi = useCallback(() => {
    if (!aiC1?.s_curve) return;
    updateCashOutflowsForStream({
      stageAllocation: {
        stage1Label: "Enabling",
        stage1Percent: aiC1.s_curve.stage_1_pct ?? 10,
        stage2Label: "Sub-Structure",
        stage2Percent: aiC1.s_curve.stage_2_pct ?? 20,
        stage3Label: "Super Structure",
        stage3Percent: aiC1.s_curve.stage_3_pct ?? 40,
        stage4Label: "Finishes",
        stage4Percent: aiC1.s_curve.stage_4_pct ?? 30,
      },
    });
  }, [aiC1, updateCashOutflowsForStream]);

  const resetRetailStep12AllocationsToAi = useCallback(() => {
    if (!aiC1) return;
    const patch: Partial<CashOutflows> = {};
    if (aiC1.powc_breakdown) {
      patch.powcAllocation = {
        siteEstablishment: aiC1.powc_breakdown.site_establishment_pct,
        overhead: aiC1.powc_breakdown.overhead_pct,
        authorityFees: aiC1.powc_breakdown.authority_fees_pct,
      };
    }
    if (aiC1.sc_breakdown) {
      patch.softCostAllocation = {
        architect: aiC1.sc_breakdown.architect_pct,
        projectManagement: aiC1.sc_breakdown.pm_pct,
        engineering: aiC1.sc_breakdown.engineering_pct,
        geotechnical: aiC1.sc_breakdown.geotech_pct,
        otherFees: aiC1.sc_breakdown.other_pct,
      };
    }
    updateCashOutflowsForStream(patch);
  }, [aiC1, updateCashOutflowsForStream]);
  // --- END: Retail AI-Based Reset Functions ---

  // --- START: Retail Step-Specific Resets ---
  const resetRetailStep5Rates = useCallback(() => {
    if (!retailBenchmark || !retailProfileKey) return;
    updateCashOutflowsForStream({
      operationalRetailBuildingRateManual: false,
      operationalRetailParkingRateManual: false,
      operationalRetailBasementRateManual: false,
      buildingRate: aiBuildingRate ?? retailBenchmark.buildingRate,
      parkingRate: aiParkingRate ?? retailBenchmark.parkingRate,
      basementRate: aiBasementRate ?? retailBenchmark.basementRate,
    });
  }, [
    aiBasementRate,
    aiBuildingRate,
    aiParkingRate,
    retailBenchmark,
    retailProfileKey,
    updateCashOutflowsForStream,
  ]);

  const resetRetailStep7Percents = useCallback(() => {
    if (!retailBenchmark || !retailProfileKey) return;
    updateCashOutflowsForStream({
      operationalRetailScManual: false,
      operationalRetailPowcManual: false,
      operationalRetailFfeManual: false,
      softCostPercent: aiScPct ?? round2(retailBenchmark.softCostsPercent),
      powcPercent: aiPowcPct ?? round2(retailBenchmark.powcPercent),
      ffePercent: aiFfePct ?? round2(retailBenchmark.ffePercent),
    });
  }, [
    aiFfePct,
    aiPowcPct,
    aiScPct,
    retailBenchmark,
    retailProfileKey,
    updateCashOutflowsForStream,
  ]);

  const resetRetailStep8LandRate = useCallback(() => {
    if (!retailBenchmark || !retailProfileKey) return;
    updateCashOutflowsForStream({
      operationalRetailLandRateManual: false,
      landRate: aiLandRate ?? retailBenchmark.landRate,
    });
  }, [
    aiLandRate,
    retailBenchmark,
    retailProfileKey,
    updateCashOutflowsForStream,
  ]);

  const resetRetailStep11Stages = useCallback(() => {
    const aiScurve = cashOutflows.aiResearchData?.c1_development?.s_curve;
    updateCashOutflowsForStream({
      stageAllocation: {
        stage1Label: "Enabling",
        stage1Percent: aiScurve?.stage_1_pct ?? 10,
        stage2Label: "Sub-Structure",
        stage2Percent: aiScurve?.stage_2_pct ?? 20,
        stage3Label: "Super Structure",
        stage3Percent: aiScurve?.stage_3_pct ?? 40,
        stage4Label: "Finishes",
        stage4Percent: aiScurve?.stage_4_pct ?? 30,
      },
    });
  }, [cashOutflows.aiResearchData, updateCashOutflowsForStream]);

  const resetRetailStep12Allocations = useCallback(() => {
    updateCashOutflowsForStream({
      powcAllocation: aiPowcBreakdown
        ? {
            siteEstablishment: aiPowcBreakdown.site_establishment_pct,
            overhead: aiPowcBreakdown.overhead_pct,
            authorityFees: aiPowcBreakdown.authority_fees_pct,
          }
        : { ...DEFAULT_POWC_ALLOCATION },
      softCostAllocation: aiScBreakdown
        ? {
            architect: aiScBreakdown.architect_pct,
            projectManagement: aiScBreakdown.pm_pct,
            engineering: aiScBreakdown.engineering_pct,
            geotechnical: aiScBreakdown.geotech_pct,
            otherFees: aiScBreakdown.other_pct,
          }
        : { ...DEFAULT_SOFT_COST_ALLOCATION },
    });
  }, [aiPowcBreakdown, aiScBreakdown, updateCashOutflowsForStream]);
  // --- END: Retail Step-Specific Resets ---

  const retailRateFieldClass = (manual?: boolean) =>
    `w-full px-3 py-2 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 ${
      manual
        ? "border-2 border-amber-500/70 bg-amber-900/10"
        : "border border-slate-700 bg-slate-800"
    }`;

  const retailPercentFieldClass = (manual?: boolean) =>
    `w-full rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 ${
      manual
        ? "border-2 border-amber-500/70 bg-amber-900/10"
        : "border border-slate-700 bg-slate-800"
    }`;

  useEffect(() => {
    if (!isOperationalRetail || !retailBenchmark || !retailProfileKey) return;

    const st = useFinModelStore.getState().operational?.cashOutflows;
    const keyChanged =
      operationalRetailProfilePrevKeyRef.current !== null &&
      operationalRetailProfilePrevKeyRef.current !== retailProfileKey;
    operationalRetailProfilePrevKeyRef.current = retailProfileKey;

    const patch: Partial<CashOutflows> = {
      operationalRetailProfileKey: retailProfileKey,
    };

    if (currentStep === 5) {
      if (keyChanged) {
        patch.operationalRetailBuildingRateManual = false;
        patch.operationalRetailParkingRateManual = false;
        patch.operationalRetailBasementRateManual = false;
        patch.buildingRate = aiBuildingRate ?? retailBenchmark.buildingRate;
        patch.parkingRate = aiParkingRate ?? retailBenchmark.parkingRate;
        patch.basementRate = aiBasementRate ?? retailBenchmark.basementRate;
      }
      if (!st?.operationalRetailBuildingRateManual)
        patch.buildingRate = aiBuildingRate ?? retailBenchmark.buildingRate;
      if (!st?.operationalRetailParkingRateManual)
        patch.parkingRate = aiParkingRate ?? retailBenchmark.parkingRate;
      if (!st?.operationalRetailBasementRateManual)
        patch.basementRate = aiBasementRate ?? retailBenchmark.basementRate;
    }

    if (currentStep === 7) {
      if (keyChanged) {
        patch.operationalRetailScManual = false;
        patch.operationalRetailPowcManual = false;
        patch.operationalRetailFfeManual = false;
      }
      if (!st?.operationalRetailScManual)
        patch.softCostPercent =
          aiScPct ?? round2(retailBenchmark.softCostsPercent);
      if (!st?.operationalRetailPowcManual)
        patch.powcPercent = aiPowcPct ?? round2(retailBenchmark.powcPercent);
      if (!st?.operationalRetailFfeManual)
        patch.ffePercent = aiFfePct ?? round2(retailBenchmark.ffePercent);
    }

    if (currentStep === 8) {
      if (keyChanged) {
        patch.operationalRetailLandRateManual = false;
      }
      if (!st?.operationalRetailLandRateManual)
        patch.landRate = aiLandRate ?? retailBenchmark.landRate;
    }

    const numDiff = (next: number | undefined, cur: number) =>
      next !== undefined && Math.abs(next - cur) > 0.004;

    if (
      numDiff(patch.buildingRate, st?.buildingRate ?? 0) ||
      numDiff(patch.parkingRate, st?.parkingRate ?? 0) ||
      numDiff(patch.basementRate, st?.basementRate ?? 0) ||
      numDiff(patch.softCostPercent, st?.softCostPercent ?? 0) ||
      numDiff(patch.powcPercent, st?.powcPercent ?? 0) ||
      numDiff(patch.ffePercent, st?.ffePercent ?? 0) ||
      numDiff(patch.landRate, st?.landRate ?? 0) ||
      patch.operationalRetailProfileKey !== st?.operationalRetailProfileKey
    ) {
      updateCashOutflowsForStream(patch);
    }
  }, [
    isOperationalRetail,
    currentStep,
    retailBenchmark,
    retailProfileKey,
    projectInfo.country,
    projectInfo.retailSegment,
    projectInfo.retailPositioning,
    aiBuildingRate,
    aiParkingRate,
    aiBasementRate,
    aiScPct,
    aiPowcPct,
    aiFfePct,
    aiLandRate,
    updateCashOutflowsForStream,
  ]);

  const officeCoworkingDeliveryForBenchmark =
    projectInfo.officeSegment === "co_working"
      ? projectInfo.officeCoworkingDelivery
      : undefined;

  const officeBenchmark = useMemo(() => {
    if (!isOperationalOffice) return null;
    if (!projectInfo.officeSegment?.trim() || !projectInfo.officePositioning?.trim()) {
      return null;
    }
    return getOfficeBenchmark(
      projectInfo.country,
      projectInfo.officeSegment,
      projectInfo.officePositioning,
      officeCoworkingDeliveryForBenchmark
    );
  }, [
    isOperationalOffice,
    projectInfo.country,
    projectInfo.officeSegment,
    projectInfo.officePositioning,
    officeCoworkingDeliveryForBenchmark,
  ]);

  const officeProfileKey = useMemo(() => {
    if (!isOperationalOffice) return null;
    if (!projectInfo.officeSegment?.trim() || !projectInfo.officePositioning?.trim()) {
      return null;
    }
    return getOfficeBenchmarkProfileKey(
      projectInfo.country,
      projectInfo.officeSegment,
      projectInfo.officePositioning,
      officeCoworkingDeliveryForBenchmark
    );
  }, [
    isOperationalOffice,
    projectInfo.country,
    projectInfo.officeSegment,
    projectInfo.officePositioning,
    officeCoworkingDeliveryForBenchmark,
  ]);

  const officeBenchmarkReady =
    isOperationalOffice &&
    !!projectInfo.officeSegment?.trim() &&
    !!projectInfo.officePositioning?.trim() &&
    !!officeBenchmark;

  const OFFICE_BENCHMARK_EPS = 0.01;

  const officeEffectiveBuildingRate =
    aiBuildingRate ?? officeBenchmark?.buildingRate;
  const officeEffectiveParkingRate =
    aiParkingRate ?? officeBenchmark?.parkingRate;
  const officeEffectiveBasementRate =
    aiBasementRate ?? officeBenchmark?.basementRate;

  const officeCcRateOverrides = useMemo(() => {
    if (!isOperationalOffice) {
      return { building: false, parking: false, basement: false, any: false };
    }

    // Use AI data as the "benchmark" if available, otherwise fall back to legacy benchmark
    const effectiveBuildingRate =
      aiBuildingRate ?? officeBenchmark?.buildingRate;
    const effectiveParkingRate =
      aiParkingRate ?? officeBenchmark?.parkingRate;
    const effectiveBasementRate =
      aiBasementRate ?? officeBenchmark?.basementRate;

    const differs = (current: number, effective: number | undefined) => {
      if (effective == null) return false;
      return Math.abs(current - effective) > OFFICE_BENCHMARK_EPS;
    };

    const building = differs(cashOutflows.buildingRate, effectiveBuildingRate);
    const parking = differs(cashOutflows.parkingRate, effectiveParkingRate);
    const basement = differs(cashOutflows.basementRate, effectiveBasementRate);

    return {
      building,
      parking,
      basement,
      any: building || parking || basement,
    };
  }, [
    isOperationalOffice,
    aiBuildingRate,
    aiParkingRate,
    aiBasementRate,
    officeBenchmark,
    cashOutflows.buildingRate,
    cashOutflows.parkingRate,
    cashOutflows.basementRate,
  ]);

  const officeSoftPercentOverrides = useMemo(() => {
    if (!isOperationalOffice) return false;
    return (
      !!cashOutflows.operationalOfficeScManual ||
      !!cashOutflows.operationalOfficePowcManual ||
      !!cashOutflows.operationalOfficeFfeManual ||
      differsFromAi(cashOutflows.softCostPercent, aiScPct) ||
      differsFromAi(cashOutflows.powcPercent, aiPowcPct) ||
      (showsOperationalFfe &&
        differsFromAi(cashOutflows.ffePercent, aiFfePct))
    );
  }, [
    isOperationalOffice,
    cashOutflows.operationalOfficeScManual,
    cashOutflows.operationalOfficePowcManual,
    cashOutflows.operationalOfficeFfeManual,
    cashOutflows.softCostPercent,
    cashOutflows.powcPercent,
    cashOutflows.ffePercent,
    aiScPct,
    aiPowcPct,
    aiFfePct,
    showsOperationalFfe,
  ]);

  const officeLandRateOverride = useMemo(() => {
    if (!isOperationalOffice) return false;
    return (
      !!cashOutflows.operationalOfficeLandRateManual ||
      differsFromAi(cashOutflows.landRate, aiLandRate)
    );
  }, [
    isOperationalOffice,
    cashOutflows.operationalOfficeLandRateManual,
    cashOutflows.landRate,
    aiLandRate,
  ]);

  const handleOfficeCcRateChange = useCallback(
    (
      field: "buildingRate" | "parkingRate" | "basementRate",
      manualFlag:
        | "operationalOfficeBuildingRateManual"
        | "operationalOfficeParkingRateManual"
        | "operationalOfficeBasementRateManual",
      value: number,
      benchmarkValue: number
    ) => {
      const hasChanged = Math.abs(value - benchmarkValue) > OFFICE_BENCHMARK_EPS;
      updateCashOutflowsForStream({
        [field]: value,
        [manualFlag]: hasChanged,
      });
      logOperationalCashOutflow(field, value, 6);
    },
    [updateCashOutflowsForStream]
  );

  const officeHasManualOverride =
    isOperationalOffice &&
    !!(
      cashOutflows.operationalOfficeBuildingRateManual ||
      cashOutflows.operationalOfficeParkingRateManual ||
      cashOutflows.operationalOfficeBasementRateManual ||
      cashOutflows.operationalOfficeScManual ||
      cashOutflows.operationalOfficePowcManual ||
      cashOutflows.operationalOfficeFfeManual ||
      cashOutflows.operationalOfficeLandRateManual
    );

  const resetOfficeProfileDefaults = useCallback(() => {
    if (!officeBenchmark || !officeProfileKey) return;
    updateCashOutflowsForStream({
      operationalOfficeProfileKey: officeProfileKey,
      operationalOfficeBuildingRateManual: false,
      operationalOfficeParkingRateManual: false,
      operationalOfficeBasementRateManual: false,
      operationalOfficeScManual: false,
      operationalOfficePowcManual: false,
      operationalOfficeFfeManual: false,
      operationalOfficeLandRateManual: false,
      buildingRate: aiBuildingRate ?? officeBenchmark.buildingRate,
      parkingRate: aiParkingRate ?? officeBenchmark.parkingRate,
      basementRate: aiBasementRate ?? officeBenchmark.basementRate,
      softCostPercent: aiScPct ?? round2(officeBenchmark.softCostsPercent),
      powcPercent: aiPowcPct ?? round2(officeBenchmark.powcPercent),
      ffePercent: aiFfePct ?? round2(officeBenchmark.ffePercent),
      landRate: aiLandRate ?? officeBenchmark.landRate,
    });
    operationalOfficeProfilePrevKeyRef.current = officeProfileKey;
  }, [
    aiBasementRate,
    aiBuildingRate,
    aiFfePct,
    aiLandRate,
    aiParkingRate,
    aiPowcPct,
    aiScPct,
    officeBenchmark,
    officeProfileKey,
    updateCashOutflowsForStream,
  ]);

  // --- START: Office Step-Specific Resets ---
  const resetOfficeStep5Rates = useCallback(() => {
    // Priority: AI data > legacy benchmark
    if (aiC1?.construction_rates) {
      updateCashOutflowsForStream({
        buildingRate:
          aiBuildingRate ??
          officeBenchmark?.buildingRate ??
          cashOutflows.buildingRate,
        parkingRate:
          aiParkingRate ??
          officeBenchmark?.parkingRate ??
          cashOutflows.parkingRate,
        basementRate:
          aiBasementRate ??
          officeBenchmark?.basementRate ??
          cashOutflows.basementRate,
        operationalOfficeBuildingRateManual: false,
        operationalOfficeParkingRateManual: false,
        operationalOfficeBasementRateManual: false,
      });
    } else if (officeBenchmark && officeProfileKey) {
      updateCashOutflowsForStream({
        operationalOfficeBuildingRateManual: false,
        operationalOfficeParkingRateManual: false,
        operationalOfficeBasementRateManual: false,
        buildingRate: officeBenchmark.buildingRate,
        parkingRate: officeBenchmark.parkingRate,
        basementRate: officeBenchmark.basementRate,
      });
    }
  }, [
    aiBuildingRate,
    aiParkingRate,
    aiBasementRate,
    aiC1,
    officeBenchmark,
    officeProfileKey,
    cashOutflows.buildingRate,
    cashOutflows.parkingRate,
    cashOutflows.basementRate,
    updateCashOutflowsForStream,
  ]);

  const resetOfficeStep7Percents = useCallback(() => {
    // Priority: AI data > legacy benchmark
    if (aiC1?.soft_costs) {
      updateCashOutflowsForStream({
        softCostPercent:
          aiScPct ??
          (officeBenchmark?.softCostsPercent != null
            ? round2(officeBenchmark.softCostsPercent)
            : cashOutflows.softCostPercent),
        powcPercent:
          aiPowcPct ??
          (officeBenchmark?.powcPercent != null
            ? round2(officeBenchmark.powcPercent)
            : cashOutflows.powcPercent),
        ffePercent:
          aiFfePct ??
          (officeBenchmark?.ffePercent != null
            ? round2(officeBenchmark.ffePercent)
            : cashOutflows.ffePercent),
        operationalOfficeScManual: false,
        operationalOfficePowcManual: false,
        operationalOfficeFfeManual: false,
      });
    } else if (officeBenchmark && officeProfileKey) {
      updateCashOutflowsForStream({
        operationalOfficeScManual: false,
        operationalOfficePowcManual: false,
        operationalOfficeFfeManual: false,
        softCostPercent: round2(officeBenchmark.softCostsPercent),
        powcPercent: round2(officeBenchmark.powcPercent),
        ffePercent: round2(officeBenchmark.ffePercent),
      });
    }
  }, [
    aiScPct,
    aiPowcPct,
    aiFfePct,
    aiC1,
    officeBenchmark,
    officeProfileKey,
    cashOutflows.softCostPercent,
    cashOutflows.powcPercent,
    cashOutflows.ffePercent,
    updateCashOutflowsForStream,
  ]);

  const resetOfficeStep8LandRate = useCallback(() => {
    // Priority: AI data > legacy benchmark
    if (aiC1?.land_rate_psf != null) {
      updateCashOutflowsForStream({
        landRate: aiLandRate ?? cashOutflows.landRate,
        operationalOfficeLandRateManual: false,
      });
    } else if (officeBenchmark && officeProfileKey) {
      updateCashOutflowsForStream({
        operationalOfficeLandRateManual: false,
        landRate: officeBenchmark.landRate,
      });
    }
  }, [
    aiLandRate,
    aiC1,
    officeBenchmark,
    officeProfileKey,
    cashOutflows.landRate,
    updateCashOutflowsForStream,
  ]);

  const resetOfficeStep11Stages = useCallback(() => {
    const curve = cashOutflows.aiResearchData?.c1_development?.s_curve;
    updateCashOutflowsForStream({
      stageAllocation: {
        stage1Label: "Enabling",
        stage1Percent: curve?.stage_1_pct ?? 10,
        stage2Label: "Sub-Structure",
        stage2Percent: curve?.stage_2_pct ?? 20,
        stage3Label: "Super Structure",
        stage3Percent: curve?.stage_3_pct ?? 40,
        stage4Label: "Finishes",
        stage4Percent: curve?.stage_4_pct ?? 30,
      },
    });
  }, [cashOutflows.aiResearchData, updateCashOutflowsForStream]);

  const resetOfficeStep12Allocations = useCallback(() => {
    if (!aiC1) return;
    const patch: Partial<CashOutflows> = {};
    if (aiC1.powc_breakdown) {
      patch.powcAllocation = {
        siteEstablishment: aiC1.powc_breakdown.site_establishment_pct,
        overhead: aiC1.powc_breakdown.overhead_pct,
        authorityFees: aiC1.powc_breakdown.authority_fees_pct,
      };
    }
    if (aiC1.sc_breakdown) {
      patch.softCostAllocation = {
        architect: aiC1.sc_breakdown.architect_pct,
        projectManagement: aiC1.sc_breakdown.pm_pct,
        engineering: aiC1.sc_breakdown.engineering_pct,
        geotechnical: aiC1.sc_breakdown.geotech_pct,
        otherFees: aiC1.sc_breakdown.other_pct,
      };
    }
    if (Object.keys(patch).length > 0) {
      updateCashOutflowsForStream(patch);
    }
  }, [aiC1, updateCashOutflowsForStream]);
  // --- END: Office Step-Specific Resets ---

  const officeRateFieldClass = retailRateFieldClass;
  const officePercentFieldClass = retailPercentFieldClass;

  const officeFfeFieldLabel =
    projectInfo.officeSegment === "co_working" &&
    projectInfo.officeCoworkingDelivery === "developer"
      ? "FFE % of CC incl. contingency (Co-Working Developer)"
      : projectInfo.officeSegment === "co_working" &&
          projectInfo.officeCoworkingDelivery === "operator"
        ? "FFE % of CC incl. contingency (Co-Working Operator)"
        : "FFE % of CC incl. contingency (Office)";

  const residentialAiRates = useMemo(() => {
    if (!isOperationalResidential || !aiC1) return null;
    return {
      buildingRate: aiBuildingRate,
      parkingRate: aiParkingRate,
      basementRate: aiBasementRate,
      softCostsPercent: aiScPct,
      powcPercent: aiPowcPct,
      ffePercent: aiFfePct,
      landRate: aiLandRate,
    };
  }, [
    isOperationalResidential,
    aiC1,
    aiBuildingRate,
    aiParkingRate,
    aiBasementRate,
    aiScPct,
    aiPowcPct,
    aiFfePct,
    aiLandRate,
  ]);

  const residentialBenchmark = useResidentialCashOutflowBenchmark(
    projectInfo,
    cashOutflows,
    updateCashOutflowsForStream,
    isOperationalResidential,
    residentialAiRates
  );

  useEffect(() => {
    if (!isOperationalOffice || !officeBenchmark || !officeProfileKey) return;

    const st = useFinModelStore.getState().operational?.cashOutflows;
    const keyChanged =
      operationalOfficeProfilePrevKeyRef.current !== null &&
      operationalOfficeProfilePrevKeyRef.current !== officeProfileKey;
    operationalOfficeProfilePrevKeyRef.current = officeProfileKey;

    const patch: Partial<CashOutflows> = {
      operationalOfficeProfileKey: officeProfileKey,
    };

    if (currentStep === 5) {
      if (keyChanged) {
        patch.operationalOfficeBuildingRateManual = false;
        patch.operationalOfficeParkingRateManual = false;
        patch.operationalOfficeBasementRateManual = false;
        patch.buildingRate = aiBuildingRate ?? officeBenchmark.buildingRate;
        patch.parkingRate = aiParkingRate ?? officeBenchmark.parkingRate;
        patch.basementRate = aiBasementRate ?? officeBenchmark.basementRate;
      }
      if (!st?.operationalOfficeBuildingRateManual)
        patch.buildingRate = aiBuildingRate ?? officeBenchmark.buildingRate;
      if (!st?.operationalOfficeParkingRateManual)
        patch.parkingRate = aiParkingRate ?? officeBenchmark.parkingRate;
      if (!st?.operationalOfficeBasementRateManual)
        patch.basementRate = aiBasementRate ?? officeBenchmark.basementRate;
    }

    if (currentStep === 7) {
      if (keyChanged) {
        patch.operationalOfficeScManual = false;
        patch.operationalOfficePowcManual = false;
        patch.operationalOfficeFfeManual = false;
      }
      if (!st?.operationalOfficeScManual)
        patch.softCostPercent =
          aiScPct ?? round2(officeBenchmark.softCostsPercent);
      if (!st?.operationalOfficePowcManual)
        patch.powcPercent = aiPowcPct ?? round2(officeBenchmark.powcPercent);
      if (!st?.operationalOfficeFfeManual)
        patch.ffePercent = aiFfePct ?? round2(officeBenchmark.ffePercent);
    }

    if (currentStep === 8) {
      if (keyChanged) {
        patch.operationalOfficeLandRateManual = false;
      }
      if (!st?.operationalOfficeLandRateManual)
        patch.landRate = aiLandRate ?? officeBenchmark.landRate;
    }

    const numDiff = (next: number | undefined, cur: number) =>
      next !== undefined && Math.abs(next - cur) > 0.004;

    if (
      numDiff(patch.buildingRate, st?.buildingRate ?? 0) ||
      numDiff(patch.parkingRate, st?.parkingRate ?? 0) ||
      numDiff(patch.basementRate, st?.basementRate ?? 0) ||
      numDiff(patch.softCostPercent, st?.softCostPercent ?? 0) ||
      numDiff(patch.powcPercent, st?.powcPercent ?? 0) ||
      numDiff(patch.ffePercent, st?.ffePercent ?? 0) ||
      numDiff(patch.landRate, st?.landRate ?? 0) ||
      patch.operationalOfficeProfileKey !== st?.operationalOfficeProfileKey
    ) {
      updateCashOutflowsForStream(patch);
    }
  }, [
    isOperationalOffice,
    currentStep,
    officeBenchmark,
    officeProfileKey,
    projectInfo.country,
    projectInfo.officeSegment,
    projectInfo.officePositioning,
    officeCoworkingDeliveryForBenchmark,
    aiBuildingRate,
    aiParkingRate,
    aiBasementRate,
    aiScPct,
    aiPowcPct,
    aiFfePct,
    aiLandRate,
    updateCashOutflowsForStream,
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

    if (step === 3 && isOperationalHotel) {
      Object.assign(newErrors, validateHotelSegmentation(projectInfo));
    }

    if (step === 3 && isOperationalRetail) {
      Object.assign(newErrors, validateRetailSegmentation(projectInfo));
    }

    if (step === 3 && isOperationalOffice) {
      Object.assign(newErrors, validateOfficeSegmentation(projectInfo));
    }

    if (step === 3 && isOperationalResidential) {
      Object.assign(newErrors, validateResidentialSegmentation(projectInfo));
    }

    if (step === 4) {
      if (bc.basements < 0)
        newErrors.basements = "Basements cannot be negative.";
      if (bc.podiumFloors < 0)
        newErrors.podiumFloors = "Podium/parking floors cannot be negative.";
      if (bc.towerFloors <= 0)
        newErrors.towerFloors = "Building floors must be greater than 0.";
    }

    if (
      step === 3 &&
      !isOperationalHotel &&
      !isOperationalRetail &&
      !isOperationalOffice &&
      !isOperationalResidential &&
      projectInfo.buildingType === "office"
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
      // FFE AI range warnings (AiGuardrailBox) are informational only — do not block Next.
    }

    if (step === 8) {
      if (cashOutflows.landArea <= 0)
        newErrors.landArea = "Land area must be greater than 0.";
      if (cashOutflows.landRate <= 0)
        newErrors.landRate = "Land rate must be greater than 0.";
    }

    // Step 9 (TDC ratios): AI Land/TDC and DC/TDC guardrails are informational only.

    if (step === 10) {
      const co = useFinModelStore.getState().operational?.cashOutflows;
      if ((co?.constructionPeriod ?? 0) < 6 || (co?.constructionPeriod ?? 0) > 84) {
        newErrors.constructionPeriod =
          "Construction period should be between 6 and 84 months.";
      }
    }

    if (step === 11) {
      const sa = cashOutflows.stageAllocation;
      const totalStagePercent =
        sa.stage1Percent + sa.stage2Percent + sa.stage3Percent + sa.stage4Percent;
      if (totalStagePercent !== 100) {
        newErrors.stages = "Stage allocation must sum to 100% of CC%.";
      }
      if (
        sa.stage1Percent <= 0 ||
        sa.stage2Percent <= 0 ||
        sa.stage3Percent <= 0 ||
        sa.stage4Percent <= 0
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
      const ffe = showsOperationalFfe
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
        <div className="mb-8 flex items-center justify-between gap-4">
          <div>
            <h1 className="mb-2 text-3xl font-bold text-white">
              FinModel App — Component 1
            </h1>
            <p className="text-slate-400">Development Financials</p>
          </div>

          <button
            type="button"
            onClick={handleSaveProject}
            className="flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 focus:ring-offset-slate-900"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4"
              />
            </svg>
            Save Project
          </button>
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

        {isAiLoading && (
          <div className="mb-6 p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg">
            <div className="flex items-center gap-3 text-blue-400">
              <div className="h-5 w-5 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
              <div>
                <p className="font-medium">AI Research in Progress...</p>
                <p className="text-sm text-slate-400">
                  Fetching market benchmarks for your project
                </p>
              </div>
            </div>
          </div>
        )}

        {aiError && (
          <div className="mb-6 p-4 bg-amber-500/10 border border-amber-500/30 rounded-lg">
            <div className="flex items-center gap-3">
              <svg
                className="h-5 w-5 text-amber-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
              <div>
                <p className="text-sm font-medium text-amber-400">
                  AI Research Unavailable
                </p>
                <p className="text-xs text-amber-300">
                  Using manual benchmarks. You can continue with manual inputs.
                </p>
              </div>
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

                      updateProjectInfoForStream({
                        country: countryName,
                        city: "", // Reset city when country changes
                        currency: detectedCurrency as ProjectInfo["currency"],
                        coordinates: null,
                        subMarket: undefined,
                      });
                      if (countryName) logCashOutflowAudit("country", countryName, 1);
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
                    onChange={(e) => updateFormData("city", e.target.value)}
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
                {projectInfo.country && (
                  <p className="text-xs text-slate-500">
                    Currency auto-set to{" "}
                    <span className="text-emerald-400 font-medium">
                      {projectInfo.currency || "USD"}
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
                  Currency
                </label>
                <select
                  value={projectInfo.currency}
                  onChange={(e) =>
                    updateProjectInfoForStream({
                      currency: e.target.value as ProjectInfo["currency"],
                    })
                  }
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

          {/* Step 4: Operating Segment & Positioning */}
          {currentStep === 3 && (
            <div>
              {isOperationalOffice ? (
                <OfficeSegmentationStep
                  errors={{
                    officeSegment: fieldError("officeSegment"),
                    officePositioning: fieldError("officePositioning"),
                  }}
                />
              ) : isOperationalRetail ? (
                <RetailSegmentationStep
                  errors={{
                    retailSegment: fieldError("retailSegment"),
                    retailPositioning: fieldError("retailPositioning"),
                  }}
                />
              ) : isOperationalResidential ? (
                <ResidentialSegmentationStep
                  errors={{
                    residentialSegment: fieldError("residentialSegment"),
                    residentialPositioning: fieldError(
                      "residentialPositioning"
                    ),
                    residentialFurnishingLevel: fieldError(
                      "residentialFurnishingLevel"
                    ),
                  }}
                />
              ) : isOperationalHotel ? (
                <HotelSegmentationStep
                  errors={{
                    hotelOperatingType: fieldError("hotelOperatingType"),
                    hotelStarRating: fieldError("hotelStarRating"),
                  }}
                />
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

          {/* Step 5: Building Configuration */}
          {currentStep === 4 && (
            <div className="space-y-6">
              <h2 className="text-xl font-bold text-white capitalize border-b border-slate-700 pb-4">
                {projectInfo.buildingType === "retail"
                  ? "Shopping Mall"
                  : projectInfo.buildingType}{" "}
                Configuration
              </h2>

              {projectInfo.buildingType === "hotel" && (
                <div className="space-y-6">
                  <h3 className="text-lg font-semibold text-slate-200">
                    Hotel Configuration
                  </h3>

                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-2">
                        Basements (B)
                      </label>
                      <input
                        type="number"
                        min={0}
                        max={5}
                        value={projectInfo.hotelBasements || 0}
                        onChange={(e) => {
                          const val = Number(e.target.value);
                          updateProjectInfoForStream({ hotelBasements: val });
                          console.log("🛒 Store Update - Hotel Basements:", val);
                        }}
                        className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-2">
                        Podium / Parking (P)
                      </label>
                      <input
                        type="number"
                        min={0}
                        max={8}
                        value={projectInfo.hotelPodiums || 0}
                        onChange={(e) => {
                          const val = Number(e.target.value);
                          updateProjectInfoForStream({ hotelPodiums: val });
                          console.log("🛒 Store Update - Hotel Podiums:", val);
                        }}
                        className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-2">
                        Ground Floor (G)
                      </label>
                      <input
                        type="number"
                        min={0}
                        max={1}
                        value={projectInfo.hotelGroundFloors || 0}
                        onChange={(e) => {
                          const val = Number(e.target.value);
                          updateProjectInfoForStream({ hotelGroundFloors: val });
                          console.log("🛒 Store Update - Hotel Ground:", val);
                        }}
                        className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-2">
                        Guest Room Floors (Storeys)
                      </label>
                      <input
                        type="number"
                        min={1}
                        max={60}
                        value={projectInfo.hotelGuestRoomFloors || 0}
                        onChange={(e) => {
                          const val = Number(e.target.value);
                          updateProjectInfoForStream({ hotelGuestRoomFloors: val });
                          console.log("🛒 Store Update - Hotel Floors:", val);
                        }}
                        className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-2">
                        Total Floors (Auto)
                      </label>
                      <input
                        type="number"
                        value={hotelTotalFloors}
                        readOnly
                        className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-slate-400 cursor-not-allowed"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-2">
                        Total Building BUA (sqft)
                      </label>
                      <input
                        type="number"
                        value={projectInfo.hotelTotalBuildingBUA || 0}
                        onChange={(e) => {
                          const val = Number(e.target.value);
                          updateProjectInfoForStream({ hotelTotalBuildingBUA: val });
                          console.log(" Store Update - Hotel BUA:", val);
                        }}
                        className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-2">
                        Basement BUA (sqft)
                      </label>
                      <input
                        type="number"
                        value={projectInfo.hotelBasementBUA || 0}
                        onChange={(e) => {
                          const val = Number(e.target.value);
                          updateProjectInfoForStream({ hotelBasementBUA: val });
                          console.log("🛒 Store Update - Hotel Basement BUA:", val);
                        }}
                        className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-2">
                        Podium / Parking BUA (sqft)
                      </label>
                      <input
                        type="number"
                        value={projectInfo.hotelPodiumBUA || 0}
                        onChange={(e) => {
                          const val = Number(e.target.value);
                          updateProjectInfoForStream({ hotelPodiumBUA: val });
                          console.log("🛒 Store Update - Hotel Podium BUA:", val);
                        }}
                        className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-2">
                        Guest Room Area (GLA) (sqft)
                      </label>
                      <input
                        type="number"
                        value={projectInfo.hotelGuestRoomGLA || 0}
                        onChange={(e) => {
                          const val = Number(e.target.value);
                          updateProjectInfoForStream({ hotelGuestRoomGLA: val });
                          console.log("🛒 Store Update - Hotel GLA:", val);
                        }}
                        className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-2">
                        Total Keys / Rooms
                      </label>
                      <input
                        type="number"
                        value={projectInfo.hotelTotalKeys || 0}
                        onChange={(e) => {
                          const val = Number(e.target.value);
                          updateProjectInfoForStream({ hotelTotalKeys: val });
                          console.log("🛒 Store Update - Hotel Keys:", val);
                        }}
                        className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-2">
                        Average Room Size (sqft) (Auto)
                      </label>
                      <input
                        type="number"
                        value={hotelAvgRoomSize}
                        readOnly
                        className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-slate-400 cursor-not-allowed"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-1 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-2">
                        Plot / Land Area (sqft)
                      </label>
                      <input
                        type="number"
                        value={projectInfo.hotelPlotArea || 0}
                        onChange={(e) => {
                          const val = Number(e.target.value);
                          updateProjectInfoForStream({ hotelPlotArea: val });
                          console.log("🛒 Store Update - Hotel Plot Area:", val);
                        }}
                        className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
                      />
                    </div>
                  </div>
                </div>
              )}

              {projectInfo.buildingType === "retail" && (
                <div className="space-y-6">
                  <h3 className="text-lg font-semibold text-slate-200">
                    Shopping Mall Configuration
                  </h3>

                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-2">
                        Basements (B)
                      </label>
                      <input
                        type="number"
                        min={0}
                        max={4}
                        value={projectInfo.retailBasements || 0}
                        onChange={(e) => {
                          const val = Number(e.target.value);
                          updateProjectInfoForStream({ retailBasements: val });
                          console.log(" Store Update - Retail Basements:", val);
                        }}
                        className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-2">
                        Podium / Parking (P)
                      </label>
                      <input
                        type="number"
                        min={0}
                        max={8}
                        value={projectInfo.retailPodiums || 0}
                        onChange={(e) => {
                          const val = Number(e.target.value);
                          updateProjectInfoForStream({ retailPodiums: val });
                          console.log("🛒 Store Update - Retail Podiums:", val);
                        }}
                        className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-2">
                        Ground Floor (G)
                      </label>
                      <input
                        type="number"
                        min={0}
                        max={1}
                        value={projectInfo.retailGroundFloors || 0}
                        onChange={(e) => {
                          const val = Number(e.target.value);
                          updateProjectInfoForStream({ retailGroundFloors: val });
                          console.log("🛒 Store Update - Retail Ground:", val);
                        }}
                        className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-2">
                        Retail Floors (Storeys)
                      </label>
                      <input
                        type="number"
                        min={1}
                        max={6}
                        value={projectInfo.retailRetailFloors || 0}
                        onChange={(e) => {
                          const val = Number(e.target.value);
                          updateProjectInfoForStream({ retailRetailFloors: val });
                          console.log("🛒 Store Update - Retail Floors:", val);
                        }}
                        className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-2">
                        Total Floors (Auto)
                      </label>
                      <input
                        type="number"
                        value={retailTotalFloors}
                        readOnly
                        className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-slate-400 cursor-not-allowed"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-2">
                        Total Building BUA (sqft)
                      </label>
                      <input
                        type="number"
                        value={projectInfo.retailTotalBuildingBUA || 0}
                        onChange={(e) => {
                          const val = Number(e.target.value);
                          updateProjectInfoForStream({ retailTotalBuildingBUA: val });
                          console.log("🛒 Store Update - Retail BUA:", val);
                        }}
                        className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-2">
                        Basement BUA (sqft)
                      </label>
                      <input
                        type="number"
                        value={projectInfo.retailBasementBUA || 0}
                        onChange={(e) => {
                          const val = Number(e.target.value);
                          updateProjectInfoForStream({ retailBasementBUA: val });
                          console.log("🛒 Store Update - Retail Basement BUA:", val);
                        }}
                        className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-2">
                        Podium / Parking BUA (sqft)
                      </label>
                      <input
                        type="number"
                        value={projectInfo.retailPodiumBUA || 0}
                        onChange={(e) => {
                          const val = Number(e.target.value);
                          updateProjectInfoForStream({ retailPodiumBUA: val });
                          console.log("🛒 Store Update - Retail Podium BUA:", val);
                        }}
                        className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-2">
                        Gross Leasable Area (GLA) (sqft)
                      </label>
                      <input
                        type="number"
                        value={projectInfo.retailGLA || 0}
                        onChange={(e) => {
                          const val = Number(e.target.value);
                          updateProjectInfoForStream({ retailGLA: val });
                          console.log("🛒 Store Update - Retail GLA:", val);
                        }}
                        className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-1 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-2">
                        Plot / Land Area (sqft)
                      </label>
                      <input
                        type="number"
                        value={projectInfo.retailPlotArea || 0}
                        onChange={(e) => {
                          const val = Number(e.target.value);
                          updateProjectInfoForStream({ retailPlotArea: val });
                          console.log("🛒 Store Update - Retail Plot Area:", val);
                        }}
                        className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
                      />
                    </div>
                  </div>
                </div>
              )}

              {projectInfo.buildingType === "office" && (
                <div className="space-y-6">
                  <h3 className="text-lg font-semibold text-slate-200">
                    Office Configuration
                  </h3>

                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-2">
                        Basements (B)
                      </label>
                      <input
                        type="number"
                        min={0}
                        max={5}
                        value={projectInfo.officeBasements || 0}
                        onChange={(e) => {
                          const val = Number(e.target.value);
                          updateProjectInfoForStream({ officeBasements: val });
                          console.log("🛒 Store Update - Office Basements:", val);
                        }}
                        className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-2">
                        Podium / Parking (P)
                      </label>
                      <input
                        type="number"
                        min={0}
                        max={10}
                        value={projectInfo.officePodiums || 0}
                        onChange={(e) => {
                          const val = Number(e.target.value);
                          updateProjectInfoForStream({ officePodiums: val });
                          console.log("🛒 Store Update - Office Podiums:", val);
                        }}
                        className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-2">
                        Ground Floor (G)
                      </label>
                      <input
                        type="number"
                        min={0}
                        max={1}
                        value={projectInfo.officeGroundFloors || 0}
                        onChange={(e) => {
                          const val = Number(e.target.value);
                          updateProjectInfoForStream({ officeGroundFloors: val });
                          console.log("🛒 Store Update - Office Ground:", val);
                        }}
                        className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-2">
                        Office Floors (Storeys)
                      </label>
                      <input
                        type="number"
                        min={1}
                        max={80}
                        value={projectInfo.officeOfficeFloors || 0}
                        onChange={(e) => {
                          const val = Number(e.target.value);
                          updateProjectInfoForStream({ officeOfficeFloors: val });
                          console.log(" Store Update - Office Floors:", val);
                        }}
                        className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-2">
                        Total Floors (Auto)
                      </label>
                      <input
                        type="number"
                        value={officeTotalFloors}
                        readOnly
                        className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-slate-400 cursor-not-allowed"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-2">
                        Total Building BUA (sqft)
                      </label>
                      <input
                        type="number"
                        value={projectInfo.officeTotalBuildingBUA || 0}
                        onChange={(e) => {
                          const val = Number(e.target.value);
                          updateProjectInfoForStream({ officeTotalBuildingBUA: val });
                          console.log("🛒 Store Update - Office BUA:", val);
                        }}
                        className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-2">
                        Basement BUA (sqft)
                      </label>
                      <input
                        type="number"
                        value={projectInfo.officeBasementBUA || 0}
                        onChange={(e) => {
                          const val = Number(e.target.value);
                          updateProjectInfoForStream({ officeBasementBUA: val });
                          console.log("🛒 Store Update - Office Basement BUA:", val);
                        }}
                        className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-2">
                        Podium / Parking BUA (sqft)
                      </label>
                      <input
                        type="number"
                        value={projectInfo.officePodiumBUA || 0}
                        onChange={(e) => {
                          const val = Number(e.target.value);
                          updateProjectInfoForStream({ officePodiumBUA: val });
                          console.log(" Store Update - Office Podium BUA:", val);
                        }}
                        className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-2">
                        Gross Leasable Area (GLA) (sqft)
                      </label>
                      <input
                        type="number"
                        value={projectInfo.officeGLA || 0}
                        onChange={(e) => {
                          const val = Number(e.target.value);
                          updateProjectInfoForStream({ officeGLA: val });
                          console.log("🛒 Store Update - Office GLA:", val);
                        }}
                        className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-1 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-2">
                        Plot / Land Area (sqft)
                      </label>
                      <input
                        type="number"
                        value={projectInfo.officePlotArea || 0}
                        onChange={(e) => {
                          const val = Number(e.target.value);
                          updateProjectInfoForStream({ officePlotArea: val });
                          console.log("🛒 Store Update - Office Plot Area:", val);
                        }}
                        className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
                      />
                    </div>
                  </div>
                </div>
              )}

              {projectInfo.buildingType === "residential" && (
                <div className="space-y-6">
                  <h3 className="text-lg font-semibold text-slate-200">
                    Residential BTR Configuration
                  </h3>

                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-2">
                        Basements (B)
                      </label>
                      <input
                        type="number"
                        min={0}
                        max={4}
                        value={projectInfo.residentialBasements || 0}
                        onChange={(e) => {
                          const val = Number(e.target.value);
                          updateProjectInfoForStream({ residentialBasements: val });
                          console.log("🛒 Store Update - Res Basements:", val);
                        }}
                        className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-2">
                        Podium / Parking (P)
                      </label>
                      <input
                        type="number"
                        min={0}
                        max={6}
                        value={projectInfo.residentialPodiums || 0}
                        onChange={(e) => {
                          const val = Number(e.target.value);
                          updateProjectInfoForStream({ residentialPodiums: val });
                          console.log("🛒 Store Update - Res Podiums:", val);
                        }}
                        className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-2">
                        Ground Floor (G)
                      </label>
                      <input
                        type="number"
                        min={0}
                        max={1}
                        value={projectInfo.residentialGroundFloors || 0}
                        onChange={(e) => {
                          const val = Number(e.target.value);
                          updateProjectInfoForStream({ residentialGroundFloors: val });
                          console.log("🛒 Store Update - Res Ground:", val);
                        }}
                        className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-2">
                        Residential Floors (Storeys)
                      </label>
                      <input
                        type="number"
                        min={1}
                        max={60}
                        value={projectInfo.residentialResidentialFloors || 0}
                        onChange={(e) => {
                          const val = Number(e.target.value);
                          updateProjectInfoForStream({
                            residentialResidentialFloors: val,
                          });
                          console.log("🛒 Store Update - Res Floors:", val);
                        }}
                        className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-2">
                        Total Floors (Auto)
                      </label>
                      <input
                        type="number"
                        value={residentialTotalFloors}
                        readOnly
                        className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-slate-400 cursor-not-allowed"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-2">
                        Total Building BUA (sqft)
                      </label>
                      <input
                        type="number"
                        value={projectInfo.residentialTotalBuildingBUA || 0}
                        onChange={(e) => {
                          const val = Number(e.target.value);
                          updateProjectInfoForStream({
                            residentialTotalBuildingBUA: val,
                          });
                          console.log("🛒 Store Update - Res BUA:", val);
                        }}
                        className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-2">
                        Basement BUA (sqft)
                      </label>
                      <input
                        type="number"
                        value={projectInfo.residentialBasementBUA || 0}
                        onChange={(e) => {
                          const val = Number(e.target.value);
                          updateProjectInfoForStream({ residentialBasementBUA: val });
                          console.log("🛒 Store Update - Res Basement BUA:", val);
                        }}
                        className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-2">
                        Podium / Parking BUA (sqft)
                      </label>
                      <input
                        type="number"
                        value={projectInfo.residentialPodiumBUA || 0}
                        onChange={(e) => {
                          const val = Number(e.target.value);
                          updateProjectInfoForStream({ residentialPodiumBUA: val });
                          console.log("🛒 Store Update - Res Podium BUA:", val);
                        }}
                        className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-2">
                        Residential GLA (sqft)
                      </label>
                      <input
                        type="number"
                        value={projectInfo.residentialGLA || 0}
                        onChange={(e) => {
                          const val = Number(e.target.value);
                          updateProjectInfoForStream({ residentialGLA: val });
                          console.log("🛒 Store Update - Res GLA:", val);
                        }}
                        className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-1 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-2">
                        Plot / Land Area (sqft)
                      </label>
                      <input
                        type="number"
                        value={projectInfo.residentialPlotArea || 0}
                        onChange={(e) => {
                          const val = Number(e.target.value);
                          updateProjectInfoForStream({ residentialPlotArea: val });
                          console.log("🛒 Store Update - Res Plot Area:", val);
                        }}
                        className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Step 2: Construction Costs */}
          {currentStep === 5 && (
            <div>
              <h2 className="text-xl font-semibold text-white mb-6">
                Construction Costs (CC)
              </h2>
              {renderHotelBenchmarkBar(
                resetHotelStep5Rates,
                hotelCcRateOverrides.any
              )}
              {residentialBenchmark.benchmarkReady ? (
                <ResidentialStep6Construction
                  projectInfo={projectInfo}
                  benchmarkReady={residentialBenchmark.benchmarkReady}
                  ccOverrides={residentialBenchmark.ccRateOverrides}
                  hasManualOverride={residentialBenchmark.hasManualOverride}
                  onReset={residentialBenchmark.resetProfileDefaults}
                />
              ) : (
                <>
                  {renderRetailBenchmarkBar({
                    hasManualOverride: !!(
                      cashOutflows.operationalRetailBuildingRateManual ||
                      cashOutflows.operationalRetailParkingRateManual ||
                      cashOutflows.operationalRetailBasementRateManual ||
                      retailCcRateOverrides.any
                    ),
                    onReset:
                      retailEffectiveBuildingRate != null ||
                      retailEffectiveParkingRate != null ||
                      retailEffectiveBasementRate != null
                        ? resetRetailStep5RatesToAi
                        : undefined,
                  })}
                  {renderOfficeBenchmarkHeader({
                    hasManualOverride: !!(
                      cashOutflows.operationalOfficeBuildingRateManual ||
                      cashOutflows.operationalOfficeParkingRateManual ||
                      cashOutflows.operationalOfficeBasementRateManual
                    ),
                    onReset: resetOfficeStep5Rates,
                  })}
                </>
              )}
              {!residentialBenchmark.benchmarkReady ? (
                <p className="mb-4 text-sm text-slate-400">
                  {isOperationalRetail
                    ? "Building, parking, and basement rates come from AI research when available, otherwise from your retail segment, positioning, and country. Typed values count as overrides."
                    : officeBenchmarkReady
                      ? "Building, parking, and basement rates come from AI research when available, otherwise from your office segment, positioning, and country. Typed values count as overrides."
                      : "Enter built-up areas (BUA) and benchmark construction rates for each component."}
                </p>
              ) : null}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-3">
                  <h3 className="text-sm font-semibold text-slate-200">
                    Superstructure / Main Building
                  </h3>
                  <div>
                    {isStep4LockedBua ? (
                      <>
                        <label className="block text-sm font-medium text-slate-300 mb-2">
                          Building BUA (sqft)
                        </label>
                        <input
                          type="number"
                          value={step4BuildingBua || 0}
                          readOnly
                          className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-slate-400 cursor-not-allowed"
                          title="Locked: Defined in Step 5 Building Configuration"
                        />
                        <p className="mt-1 text-xs text-amber-400">
                          🔒 Locked: To change, go back to Step 5
                        </p>
                      </>
                    ) : (
                      <>
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
                      </>
                    )}
                  </div>
                  <div>
                    <AiInput
                      label={`Building Rate (${projectInfo.currency}/sqft)`}
                      value={cashOutflows.buildingRate || aiBuildingRate || 0}
                      onChange={(value) => {
                        const v = Number(value) || 0;
                        if (
                          isOperationalResidential &&
                          residentialBenchmark.benchmark
                        ) {
                          residentialBenchmark.handleCcRateChange(
                            "buildingRate",
                            "operationalResidentialBuildingRateManual",
                            v,
                            residentialBenchmark.benchmark.buildingRate
                          );
                        } else if (isOperationalRetail) {
                          if (retailEffectiveBuildingRate != null) {
                            handleRetailCcRateChange(
                              "buildingRate",
                              "operationalRetailBuildingRateManual",
                              v,
                              retailEffectiveBuildingRate
                            );
                          } else {
                            updateCashOutflowsForStream({
                              buildingRate: v,
                              operationalRetailBuildingRateManual: true,
                            });
                            logOperationalCashOutflow("buildingRate", v, 6);
                          }
                        } else if (isOperationalOffice && officeBenchmark) {
                          handleOfficeCcRateChange(
                            "buildingRate",
                            "operationalOfficeBuildingRateManual",
                            v,
                            officeEffectiveBuildingRate ??
                              officeBenchmark.buildingRate
                          );
                        } else if (isOperationalHotel) {
                          updateCashOutflowsForStream({
                            buildingRate: v,
                            operationalHotelBuildingRateManual: true,
                          });
                          logOperationalCashOutflow("buildingRate", v, 6);
                        } else {
                          updateFormData("buildingRate", v);
                        }
                      }}
                      type="number"
                      isAiGenerated={
                        !!aiBuildingRate &&
                        !cashOutflows.operationalHotelBuildingRateManual &&
                        !cashOutflows.operationalRetailBuildingRateManual &&
                        !cashOutflows.operationalOfficeBuildingRateManual &&
                        !cashOutflows.operationalResidentialBuildingRateManual
                      }
                      isManualOverride={
                        !!(
                          cashOutflows.operationalHotelBuildingRateManual ||
                          cashOutflows.operationalRetailBuildingRateManual ||
                          cashOutflows.operationalOfficeBuildingRateManual ||
                          cashOutflows.operationalResidentialBuildingRateManual
                        )
                      }
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
                      {isStep4LockedBua ? (
                        <>
                          <label className="block text-sm font-medium text-slate-300 mb-2">
                            {isOperationalHotel
                              ? "Parking BUA (sqft)"
                              : "Parking / Podium BUA (sqft)"}
                          </label>
                          <input
                            type="number"
                            value={step4ParkingBua || 0}
                            readOnly
                            className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-slate-400 cursor-not-allowed"
                            title="Locked: Defined in Step 5 Building Configuration"
                          />
                          <p className="mt-1 text-xs text-amber-400">
                            🔒 Locked: To change, go back to Step 5
                          </p>
                        </>
                      ) : (
                        <>
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
                        </>
                      )}
                    </div>
                    <div>
                      <AiInput
                        label={`Parking Rate (${projectInfo.currency}/sqft)`}
                        value={
                          effectiveParkingBua === 0
                            ? 0
                            : cashOutflows.parkingRate || aiParkingRate || 0
                        }
                        onChange={(value) => {
                          if (effectiveParkingBua === 0) return;
                          const v = Number(value) || 0;
                          if (
                            isOperationalResidential &&
                            residentialBenchmark.benchmark
                          ) {
                            residentialBenchmark.handleCcRateChange(
                              "parkingRate",
                              "operationalResidentialParkingRateManual",
                              v,
                              residentialBenchmark.benchmark.parkingRate
                            );
                          } else if (isOperationalRetail) {
                            if (retailEffectiveParkingRate != null) {
                              handleRetailCcRateChange(
                                "parkingRate",
                                "operationalRetailParkingRateManual",
                                v,
                                retailEffectiveParkingRate
                              );
                            } else {
                              updateCashOutflowsForStream({
                                parkingRate: v,
                                operationalRetailParkingRateManual: true,
                              });
                              logOperationalCashOutflow("parkingRate", v, 6);
                            }
                          } else if (isOperationalOffice && officeBenchmark) {
                            handleOfficeCcRateChange(
                              "parkingRate",
                              "operationalOfficeParkingRateManual",
                              v,
                              officeEffectiveParkingRate ??
                                officeBenchmark.parkingRate
                            );
                          } else if (isOperationalHotel) {
                            updateCashOutflowsForStream({
                              parkingRate: v,
                              operationalHotelParkingRateManual: true,
                            });
                            logOperationalCashOutflow("parkingRate", v, 6);
                          } else {
                            updateFormData("parkingRate", v);
                          }
                        }}
                        type="number"
                        disabled={effectiveParkingBua === 0}
                        helperText={
                          effectiveParkingBua === 0
                            ? "Rate is 0 because Parking BUA is 0"
                            : undefined
                        }
                        isAiGenerated={
                          effectiveParkingBua > 0 &&
                          !!aiParkingRate &&
                          !cashOutflows.operationalHotelParkingRateManual &&
                          !cashOutflows.operationalRetailParkingRateManual &&
                          !cashOutflows.operationalOfficeParkingRateManual &&
                          !cashOutflows.operationalResidentialParkingRateManual
                        }
                        isManualOverride={
                          effectiveParkingBua > 0 &&
                          !!(
                            cashOutflows.operationalHotelParkingRateManual ||
                            cashOutflows.operationalRetailParkingRateManual ||
                            cashOutflows.operationalOfficeParkingRateManual ||
                            cashOutflows.operationalResidentialParkingRateManual
                          )
                        }
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
                      {isStep4LockedBua ? (
                        <>
                          <label className="block text-sm font-medium text-slate-300 mb-2">
                            Basement BUA (sqft)
                          </label>
                          <input
                            type="number"
                            value={step4BasementBua || 0}
                            readOnly
                            className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-slate-400 cursor-not-allowed"
                            title="Locked: Defined in Step 5 Building Configuration"
                          />
                          <p className="mt-1 text-xs text-amber-400">
                            🔒 Locked: To change, go back to Step 5
                          </p>
                        </>
                      ) : (
                        <>
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
                        </>
                      )}
                    </div>
                    <div>
                      <AiInput
                        label={`Basement Rate (${projectInfo.currency}/sqft)`}
                        value={
                          effectiveBasementBua === 0
                            ? 0
                            : cashOutflows.basementRate || aiBasementRate || 0
                        }
                        onChange={(value) => {
                          if (effectiveBasementBua === 0) return;
                          const v = Number(value) || 0;
                          if (
                            isOperationalResidential &&
                            residentialBenchmark.benchmark
                          ) {
                            residentialBenchmark.handleCcRateChange(
                              "basementRate",
                              "operationalResidentialBasementRateManual",
                              v,
                              residentialBenchmark.benchmark.basementRate
                            );
                          } else if (isOperationalRetail) {
                            if (retailEffectiveBasementRate != null) {
                              handleRetailCcRateChange(
                                "basementRate",
                                "operationalRetailBasementRateManual",
                                v,
                                retailEffectiveBasementRate
                              );
                            } else {
                              updateCashOutflowsForStream({
                                basementRate: v,
                                operationalRetailBasementRateManual: true,
                              });
                              logOperationalCashOutflow("basementRate", v, 6);
                            }
                          } else if (isOperationalOffice && officeBenchmark) {
                            handleOfficeCcRateChange(
                              "basementRate",
                              "operationalOfficeBasementRateManual",
                              v,
                              officeEffectiveBasementRate ??
                                officeBenchmark.basementRate
                            );
                          } else if (isOperationalHotel) {
                            updateCashOutflowsForStream({
                              basementRate: v,
                              operationalHotelBasementRateManual: true,
                            });
                            logOperationalCashOutflow("basementRate", v, 6);
                          } else {
                            updateFormData("basementRate", v);
                          }
                        }}
                        type="number"
                        disabled={effectiveBasementBua === 0}
                        helperText={
                          effectiveBasementBua === 0
                            ? "Rate is 0 because Basement BUA is 0"
                            : undefined
                        }
                        isAiGenerated={
                          effectiveBasementBua > 0 &&
                          !!aiBasementRate &&
                          !cashOutflows.operationalHotelBasementRateManual &&
                          !cashOutflows.operationalRetailBasementRateManual &&
                          !cashOutflows.operationalOfficeBasementRateManual &&
                          !cashOutflows.operationalResidentialBasementRateManual
                        }
                        isManualOverride={
                          effectiveBasementBua > 0 &&
                          !!(
                            cashOutflows.operationalHotelBasementRateManual ||
                            cashOutflows.operationalRetailBasementRateManual ||
                            cashOutflows.operationalOfficeBasementRateManual ||
                            cashOutflows.operationalResidentialBasementRateManual
                          )
                        }
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
                  {false && infrastructureCosts > 0 ? (
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
              {false ? (
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
                          (from Step 5)
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
                        Auto-populated from Step 5 (saleable land ÷ 70%)
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
              {renderHotelBenchmarkBar()}
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
                  {aiData?.hints?.contingency_text ? (
                    <AiHintBox
                      title="AI Contingency Recommendation"
                      className="mt-2"
                    >
                      {aiData.hints.contingency_text}
                    </AiHintBox>
                  ) : (
                    <p className="mt-1 text-xs text-slate-500">
                      Typical range: 5–10% depending on asset and design stage.
                    </p>
                  )}
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
              {renderHotelBenchmarkBar(
                resetHotelStep7Percents,
                hotelSoftPercentOverrides
              )}
              {isOperationalResidential && residentialBenchmark.benchmarkReady ? (
                <ResidentialStep8SoftCosts
                  projectInfo={projectInfo}
                  cashOutflows={cashOutflows}
                  benchmarkReady={residentialBenchmark.benchmarkReady}
                  hasManualOverride={residentialBenchmark.hasManualOverride}
                  onReset={residentialBenchmark.resetProfileDefaults}
                  onSoftCostChange={(v) => {
                    updateCashOutflowsForStream({
                      softCostPercent: v,
                      operationalResidentialScManual: true,
                    });
                    logOperationalCashOutflow("softCostPercent", v, 8);
                  }}
                  onPowcChange={(v) => {
                    updateCashOutflowsForStream({
                      powcPercent: v,
                      operationalResidentialPowcManual: true,
                    });
                    logOperationalCashOutflow("powcPercent", v, 8);
                  }}
                  onFfeChange={(v) => {
                    updateCashOutflowsForStream({
                      ffePercent: v,
                      operationalResidentialFfeManual: true,
                    });
                    logOperationalCashOutflow("ffePercent", v, 8);
                  }}
                  fieldError={fieldError}
                  showFfe={showsOperationalFfe}
                  aiScPct={aiScPct}
                  aiPowcPct={aiPowcPct}
                  aiFfePct={aiFfePct}
                />
              ) : (
                <>
                  {renderRetailBenchmarkBar({
                    hasManualOverride: !!(
                      cashOutflows.operationalRetailScManual ||
                      cashOutflows.operationalRetailPowcManual ||
                      cashOutflows.operationalRetailFfeManual
                    ),
                    onReset: resetRetailStep7PercentsToAi,
                  })}
                  {renderOfficeBenchmarkHeader({
                    hasManualOverride: officeSoftPercentOverrides,
                    onReset: resetOfficeStep7Percents,
                  })}
                </>
              )}
              {isOperationalHotel && operationalHotelProfileUi ? (
                <p className="text-sm text-slate-400 mb-4">
                  SC, POWC, and FFE are suggested from your segment and location.
                  Calculations use CC{" "}
                  <span className="text-slate-300">including contingency</span>{" "}
                  from the prior steps. Typed values count as overrides.
                </p>
              ) : isOperationalRetail ? (
                <p className="text-sm text-slate-400 mb-4">
                  SC, POWC, and FFE come from AI research when available, otherwise from
                  your mall segment, positioning, and country. Calculations use CC{" "}
                  <span className="text-slate-300">including contingency</span> from
                  prior steps. Typed values count as overrides.
                </p>
              ) : officeBenchmarkReady ? (
                <p className="text-sm text-slate-400 mb-4">
                  SC, POWC, and FFE come from AI research when available, otherwise from
                  your office segment, positioning, and country. Calculations use CC{" "}
                  <span className="text-slate-300">including contingency</span> from
                  prior steps. Typed values count as overrides.
                </p>
              ) : isOperationalResidential ? (
                <p className="mb-6 text-sm text-slate-400">
                  Complete residential segment and positioning in Step 4 to load
                  benchmark SC, POWC, and FFE defaults.
                </p>
              ) : (
                <p className="text-sm text-slate-400 mb-6">
                  SC, POWC{showsOperationalFfe ? ", and FFE" : ""} percentages apply to{" "}
                  <span className="text-slate-300">CC including contingency</span>
                  {showsOperationalFfe ? " from the prior steps." : "."}
                </p>
              )}

              {!isOperationalResidential || !residentialBenchmark.benchmarkReady ? (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <AiInput
                    label="Soft Costs % of CC incl. contingency (SC%)"
                    value={cashOutflows.softCostPercent || aiScPct || 0}
                    onChange={(value) => {
                      const v = Number(value) || 0;
                      if (isOperationalHotel) {
                        updateCashOutflowsForStream({
                          softCostPercent: v,
                          operationalHotelScManual: true,
                        });
                        logOperationalCashOutflow("softCostPercent", v, 8);
                      } else if (isOperationalRetail) {
                        updateCashOutflowsForStream({
                          softCostPercent: v,
                          operationalRetailScManual: true,
                        });
                        logOperationalCashOutflow("softCostPercent", v, 8);
                      } else if (isOperationalOffice) {
                        updateCashOutflowsForStream({
                          softCostPercent: v,
                          operationalOfficeScManual: true,
                        });
                        logOperationalCashOutflow("softCostPercent", v, 8);
                      } else {
                        updateFormData("softCostPercent", v);
                      }
                    }}
                    type="percentage"
                    isAiGenerated={
                      !!aiScPct &&
                      !cashOutflows.operationalHotelScManual &&
                      !cashOutflows.operationalRetailScManual &&
                      !cashOutflows.operationalOfficeScManual
                    }
                    isManualOverride={
                      !!(
                        cashOutflows.operationalHotelScManual ||
                        cashOutflows.operationalRetailScManual ||
                        cashOutflows.operationalOfficeScManual
                      )
                    }
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
                    value={cashOutflows.powcPercent || aiPowcPct || 0}
                    onChange={(value) => {
                      const v = Number(value) || 0;
                      if (isOperationalHotel) {
                        updateCashOutflowsForStream({
                          powcPercent: v,
                          operationalHotelPowcManual: true,
                        });
                        logOperationalCashOutflow("powcPercent", v, 8);
                      } else if (isOperationalRetail) {
                        updateCashOutflowsForStream({
                          powcPercent: v,
                          operationalRetailPowcManual: true,
                        });
                        logOperationalCashOutflow("powcPercent", v, 8);
                      } else if (isOperationalOffice) {
                        updateCashOutflowsForStream({
                          powcPercent: v,
                          operationalOfficePowcManual: true,
                        });
                        logOperationalCashOutflow("powcPercent", v, 8);
                      } else {
                        updateFormData("powcPercent", v);
                      }
                    }}
                    type="percentage"
                    isAiGenerated={
                      !!aiPowcPct &&
                      !cashOutflows.operationalHotelPowcManual &&
                      !cashOutflows.operationalRetailPowcManual &&
                      !cashOutflows.operationalOfficePowcManual
                    }
                    isManualOverride={
                      !!(
                        cashOutflows.operationalHotelPowcManual ||
                        cashOutflows.operationalRetailPowcManual ||
                        cashOutflows.operationalOfficePowcManual
                      )
                    }
                    helperText="POWC amount = CC incl. contingency × POWC% ÷ 100. POWC = Pre-Operating Expenses & Working Capital (Site Establishment, Overhead, Authority Fees)"
                  />
                  {fieldError("powcPercent") && (
                    <p className="mt-1 text-sm text-red-400">
                      {fieldError("powcPercent")}
                    </p>
                  )}
                </div>
                {showsOperationalFfe && (
                  <div>
                    <AiInput
                      label={
                        isOperationalOffice
                          ? officeFfeFieldLabel
                          : `FFE % of CC incl. contingency (${
                              isOperationalRetail
                                ? "Retail"
                                : isOperationalResidential
                                  ? "Residential"
                                  : "Hotel"
                            })`
                      }
                      value={
                        (
                          isOperationalHotel
                            ? cashOutflows.operationalHotelFfeManual
                            : isOperationalRetail
                              ? cashOutflows.operationalRetailFfeManual
                              : isOperationalOffice
                                ? cashOutflows.operationalOfficeFfeManual
                                : true
                        )
                          ? cashOutflows.ffePercent || 0
                          : (aiFfePct ?? cashOutflows.ffePercent ?? 0)
                      }
                      onChange={(value) => {
                        const v = Number(value) || 0;
                        if (isOperationalHotel) {
                          updateCashOutflowsForStream({
                            ffePercent: v,
                            operationalHotelFfeManual: true,
                          });
                          logOperationalCashOutflow("ffePercent", v, 8);
                        } else if (isOperationalRetail) {
                          updateCashOutflowsForStream({
                            ffePercent: v,
                            operationalRetailFfeManual: true,
                          });
                          logOperationalCashOutflow("ffePercent", v, 8);
                        } else if (isOperationalOffice) {
                          updateCashOutflowsForStream({
                            ffePercent: v,
                            operationalOfficeFfeManual: true,
                          });
                          logOperationalCashOutflow("ffePercent", v, 8);
                        } else {
                          updateFormData("ffePercent", v);
                        }
                      }}
                      type="percentage"
                      isAiGenerated={
                        !!aiFfePct &&
                        !cashOutflows.operationalHotelFfeManual &&
                        !cashOutflows.operationalRetailFfeManual &&
                        !cashOutflows.operationalOfficeFfeManual
                      }
                      isManualOverride={
                        !!(
                          cashOutflows.operationalHotelFfeManual ||
                          cashOutflows.operationalRetailFfeManual ||
                          cashOutflows.operationalOfficeFfeManual
                        )
                      }
                    />
                    <div className="mt-2">
                      <p className="text-xs text-slate-400">
                        {isOperationalRetail
                          ? "Fit-out, fixtures & equipment for mall common areas and tenants."
                          : isOperationalOffice
                            ? "Furniture, fixtures & equipment for office common areas and fit-out."
                            : isOperationalResidential
                              ? "Furniture, fixtures & equipment for residential units and common areas."
                              : "Furniture, fixtures & equipment for hotel rooms and public areas."}
                      </p>

                      {aiFfeRange && (
                        <p className="mt-2 text-xs text-slate-400">
                          FFE % for {ffeSegmentLabel} is typically between
                          <span className="font-semibold">
                            {" "}
                            {aiFfeRange.min_range}%
                          </span>{" "}
                          and
                          <span className="font-semibold">
                            {" "}
                            {aiFfeRange.max_range}%
                          </span>{" "}
                          of CC incl. contingency
                        </p>
                      )}
                    </div>
                    {aiFfeMin !== undefined &&
                      aiFfeMax !== undefined &&
                      ((cashOutflows.ffePercent || 0) < aiFfeMin ||
                        (cashOutflows.ffePercent || 0) > aiFfeMax) && (
                        <AiGuardrailBox
                          severity="error"
                          title="FFE% Outside Recommended Range"
                          message={`Your FFE value (${cashOutflows.ffePercent || 0}%) is outside the target range for this market and asset type. Recommended range: ${aiFfeMin}% - ${aiFfeMax}% of CC incl. contingency for ${ffeSegmentLabel}. You may adjust or proceed anyway.`}
                          className="mt-4"
                        />
                      )}
                  </div>
                )}
              </div>
              ) : null}

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
                {showsOperationalFfe && (
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
                  {showsOperationalFfe ? " + FFE" : ""}):{" "}
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
              {renderHotelBenchmarkBar(
                resetHotelStep8LandRate,
                !!cashOutflows.operationalHotelLandRateManual
              )}
              {isOperationalResidential && residentialBenchmark.benchmarkReady ? (
                <ResidentialStep9LandCosts
                  projectInfo={projectInfo}
                  cashOutflows={cashOutflows}
                  benchmarkReady={residentialBenchmark.benchmarkReady}
                  landCost={landCost}
                  onReset={residentialBenchmark.resetProfileDefaults}
                  onLandAreaChange={(v) => updateFormData("landArea", v)}
                  onLandRateChange={(v) => {
                    updateCashOutflowsForStream({
                      landRate: v,
                      operationalResidentialLandRateManual: true,
                    });
                    logOperationalCashOutflow("landRate", v, 9);
                  }}
                  fieldError={fieldError}
                  aiLandRate={aiLandRate}
                />
              ) : isOperationalRetail || isOperationalOffice ? (
                <>
                  {renderRetailBenchmarkBar({
                    hasManualOverride:
                      !!cashOutflows.operationalRetailLandRateManual,
                    onReset: resetRetailStep8LandRateToAi,
                  })}
                  {renderOfficeBenchmarkHeader({
                    hasManualOverride: officeLandRateOverride,
                    onReset: resetOfficeStep8LandRate,
                  })}
                  <p className="mb-4 text-sm text-slate-400">
                    {isOperationalRetail
                      ? "Land rate is suggested from your segment, positioning, and country. Land area is entered manually."
                      : "Land rate comes from AI research when available, otherwise from your office segment, positioning, and country. Land area is entered manually."}
                  </p>
                </>
              ) : isOperationalResidential ? (
                <p className="mb-4 text-sm text-slate-400">
                  Complete residential segment and positioning in Step 4 to load
                  benchmark land rate defaults.
                </p>
              ) : null}
              {!isOperationalResidential || !residentialBenchmark.benchmarkReady ? (
              <>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                <div>
                  {isStep4LockedBua ? (
                    <>
                      <label className="block text-sm font-medium text-slate-300 mb-2">
                        Plot / Land Area (sqft)
                      </label>
                      <input
                        type="number"
                        value={step4PlotArea || 0}
                        readOnly
                        className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-slate-400 cursor-not-allowed"
                        title="Locked: Defined in Step 5 Building Configuration"
                      />
                      <p className="mt-1 text-xs text-amber-400">
                        🔒 Locked: To change, go back to Step 5
                      </p>
                    </>
                  ) : (
                    <>
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
                    </>
                  )}
                </div>
                <div>
                  <AiInput
                    label={`Land Rate (${projectInfo.currency}/sqft)`}
                    value={cashOutflows.landRate || aiLandRate || 0}
                    onChange={(value) => {
                      const v = Number(value) || 0;
                      if (isOperationalRetail) {
                        updateCashOutflowsForStream({
                          landRate: v,
                          operationalRetailLandRateManual: true,
                        });
                        logOperationalCashOutflow("landRate", v, 9);
                      } else if (isOperationalOffice) {
                        updateCashOutflowsForStream({
                          landRate: v,
                          operationalOfficeLandRateManual: true,
                        });
                        logOperationalCashOutflow("landRate", v, 9);
                      } else if (isOperationalHotel) {
                        updateCashOutflowsForStream({
                          landRate: v,
                          operationalHotelLandRateManual: true,
                        });
                        logOperationalCashOutflow("landRate", v, 9);
                      } else {
                        updateCashOutflowsForStream({ landRate: v });
                        logOperationalCashOutflow("landRate", v, 9);
                      }
                    }}
                    type="number"
                    isAiGenerated={
                      !!aiLandRate &&
                      !cashOutflows.operationalHotelLandRateManual &&
                      !cashOutflows.operationalRetailLandRateManual &&
                      !cashOutflows.operationalOfficeLandRateManual
                    }
                    isManualOverride={
                      !!(
                        cashOutflows.operationalHotelLandRateManual ||
                        cashOutflows.operationalRetailLandRateManual ||
                        cashOutflows.operationalOfficeLandRateManual
                      )
                    }
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
              {/* Land Rate per GFA/BUA Display */}
              <div className="mt-3 p-3 bg-slate-800/50 border border-slate-700 rounded-lg">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-400">
                    Land Rate per GFA/BUA:
                  </span>
                  <span className="text-sm font-semibold text-emerald-400">
                    {projectInfo.currency || "AED"}{" "}
                    {(() => {
                      const landRate =
                        cashOutflows.landRate || aiLandRate || 0;
                      const landArea =
                        step4PlotArea || cashOutflows.landArea || 0;
                      const bua =
                        step4BuildingBua || cashOutflows.buildingBUA || 0;

                      if (landRate > 0 && landArea > 0 && bua > 0) {
                        const ratePerGFA = (landRate * landArea) / bua;
                        return ratePerGFA.toLocaleString("en-US", {
                          minimumFractionDigits: 0,
                          maximumFractionDigits: 2,
                        });
                      }
                      return "0";
                    })()}
                    {" /sqft (GFA)"}
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  Formula: (Land Rate × Plot Area) / Total BUA
                </p>
              </div>
              </>
              ) : null}
            </div>
          )}

          {/* Step 8-9: TDC & Ratio Checks */}
          {currentStep === 9 && (
            <div>
              <h2 className="text-xl font-semibold text-white mb-4">
                TDC & Ratio Checks
              </h2>
              {renderHotelBenchmarkBar()}
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
                                landInRange ? "text-emerald-400" : "text-red-400"
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
              {renderHotelBenchmarkBar()}
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
                {aiData?.hints?.construction_period_text ? (
                  <AiHintBox title="AI Construction Period Recommendation">
                    {aiData.hints.construction_period_text}
                  </AiHintBox>
                ) : (
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
                        {projectInfo.buildingConfig.towerFloors} building floors
                      </span>
                      , a reasonable range is{" "}
                      <span className="font-semibold">
                        {(projectInfo.buildingConfig.towerFloors + 12).toFixed(0)}–
                        {(projectInfo.buildingConfig.towerFloors + 24).toFixed(0)}{" "}
                        months
                      </span>
                      , depending on basement complexity and authority approvals.
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Step 11: Construction Stages */}
          {currentStep === 11 && (
            <div>
              <h2 className="text-xl font-semibold text-white mb-4">
                Construction Stages (M0 to Finishes)
              </h2>
              {renderHotelBenchmarkBar(
                resetHotelStep11Stages,
                hasStageAllocationOverride
              )}
              {isOperationalResidential && residentialBenchmark.benchmarkReady ? (
                <ResidentialBenchmarkHeader
                  projectInfo={projectInfo}
                  onUseDefaults={resetStagesToAiBenchmark}
                  isManualOverride={hasStageAllocationOverride}
                  showResetButton
                />
              ) : (
                <>
                  {renderRetailBenchmarkBar({
                    hasManualOverride:
                      isOperationalRetail && hasStageAllocationOverride,
                    onReset: resetRetailStep11StagesToAi,
                  })}
                  {renderOfficeBenchmarkHeader({
                    hasManualOverride: hasStageAllocationOverride,
                    onReset: resetOfficeStep11Stages,
                  })}
                </>
              )}
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

                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1">
                      Stage 1 Label
                    </label>
                    <input
                      type="text"
                      value={cashOutflows.stageAllocation.stage1Label}
                      onChange={(e) =>
                        updateStageAllocationField("stage1Label", e.target.value)
                      }
                      className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                    <div className="mt-2">
                      <AiInput
                        label="Stage 1 (% of CC%)"
                        value={
                          cashOutflows.stageAllocation.stage1Percent ||
                          aiC1?.s_curve?.stage_1_pct ||
                          0
                        }
                        onChange={(value) =>
                          updateStageAllocationField(
                            "stage1Percent",
                            Number(value) || 0
                          )
                        }
                        type="percentage"
                        isAiGenerated={!!aiC1?.s_curve?.stage_1_pct}
                        isManualOverride={differsFromAi(
                          cashOutflows.stageAllocation.stage1Percent,
                          aiC1?.s_curve?.stage_1_pct
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
                        updateStageAllocationField("stage2Label", e.target.value)
                      }
                      className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                    <div className="mt-2">
                      <AiInput
                        label="Stage 2 (% of CC%)"
                        value={
                          cashOutflows.stageAllocation.stage2Percent ||
                          aiC1?.s_curve?.stage_2_pct ||
                          0
                        }
                        onChange={(value) =>
                          updateStageAllocationField(
                            "stage2Percent",
                            Number(value) || 0
                          )
                        }
                        type="percentage"
                        isAiGenerated={!!aiC1?.s_curve?.stage_2_pct}
                        isManualOverride={differsFromAi(
                          cashOutflows.stageAllocation.stage2Percent,
                          aiC1?.s_curve?.stage_2_pct
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
                        updateStageAllocationField("stage3Label", e.target.value)
                      }
                      className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                    <div className="mt-2">
                      <AiInput
                        label="Stage 3 (% of CC%)"
                        value={
                          cashOutflows.stageAllocation.stage3Percent ||
                          aiC1?.s_curve?.stage_3_pct ||
                          0
                        }
                        onChange={(value) =>
                          updateStageAllocationField(
                            "stage3Percent",
                            Number(value) || 0
                          )
                        }
                        type="percentage"
                        isAiGenerated={!!aiC1?.s_curve?.stage_3_pct}
                        isManualOverride={differsFromAi(
                          cashOutflows.stageAllocation.stage3Percent,
                          aiC1?.s_curve?.stage_3_pct
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
                      value={cashOutflows.stageAllocation.stage4Label}
                      onChange={(e) =>
                        updateStageAllocationField("stage4Label", e.target.value)
                      }
                      className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                    <div className="mt-2">
                      <AiInput
                        label="Stage 4 (% of CC%)"
                        value={
                          cashOutflows.stageAllocation.stage4Percent ||
                          aiC1?.s_curve?.stage_4_pct ||
                          0
                        }
                        onChange={(value) =>
                          updateStageAllocationField(
                            "stage4Percent",
                            Number(value) || 0
                          )
                        }
                        type="percentage"
                        isAiGenerated={!!aiC1?.s_curve?.stage_4_pct}
                        isManualOverride={differsFromAi(
                          cashOutflows.stageAllocation.stage4Percent,
                          aiC1?.s_curve?.stage_4_pct
                        )}
                      />
                    </div>
                  </div>
                </div>
                <p className="text-sm text-slate-300">
                  Total Allocation:{" "}
                  <span className="font-semibold text-emerald-400">
                    {(
                      (cashOutflows.stageAllocation.stage1Percent ||
                        aiC1?.s_curve?.stage_1_pct ||
                        0) +
                      (cashOutflows.stageAllocation.stage2Percent ||
                        aiC1?.s_curve?.stage_2_pct ||
                        0) +
                      (cashOutflows.stageAllocation.stage3Percent ||
                        aiC1?.s_curve?.stage_3_pct ||
                        0) +
                      (cashOutflows.stageAllocation.stage4Percent ||
                        aiC1?.s_curve?.stage_4_pct ||
                        0)
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
                {renderHotelBenchmarkBar(
                  resetHotelStep12Allocations,
                  hasDetailedAllocationOverride
                )}
                {isOperationalResidential && residentialBenchmark.benchmarkReady ? (
                  <ResidentialBenchmarkHeader
                    projectInfo={projectInfo}
                    onUseDefaults={resetDetailedAllocationsToAi}
                    isManualOverride={hasDetailedAllocationOverride}
                    showResetButton
                  />
                ) : (
                  <>
                    {renderRetailBenchmarkBar({
                      hasManualOverride:
                        isOperationalRetail && hasDetailedAllocationOverride,
                      onReset: resetRetailStep12AllocationsToAi,
                    })}
                    {renderOfficeBenchmarkHeader({
                      hasManualOverride: hasDetailedAllocationOverride,
                      onReset: resetOfficeStep12Allocations,
                    })}
                  </>
                )}
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
                                      powcAllocation: {
                                        ...powcAlloc,
                                        siteEstablishment: newValue,
                                      },
                                      ...(isOperationalHotel
                                        ? { operationalHotelPowcManual: true }
                                        : {}),
                                    });
                                  }}
                                  className={allocInputClass(
                                    powcAlloc.siteEstablishment,
                                    aiPowcBreakdown?.site_establishment_pct
                                  )}
                                />
                                {renderAllocBadge(
                                  powcAlloc.siteEstablishment,
                                  aiPowcBreakdown?.site_establishment_pct
                                )}
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
                                      powcAllocation: {
                                        ...powcAlloc,
                                        overhead: newValue,
                                      },
                                      ...(isOperationalHotel
                                        ? { operationalHotelPowcManual: true }
                                        : {}),
                                    });
                                  }}
                                  className={allocInputClass(
                                    powcAlloc.overhead,
                                    aiPowcBreakdown?.overhead_pct
                                  )}
                                />
                                {renderAllocBadge(
                                  powcAlloc.overhead,
                                  aiPowcBreakdown?.overhead_pct
                                )}
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
                                      powcAllocation: {
                                        ...powcAlloc,
                                        authorityFees: newValue,
                                      },
                                      ...(isOperationalHotel
                                        ? { operationalHotelPowcManual: true }
                                        : {}),
                                    });
                                  }}
                                  className={allocInputClass(
                                    powcAlloc.authorityFees,
                                    aiPowcBreakdown?.authority_fees_pct
                                  )}
                                />
                                {renderAllocBadge(
                                  powcAlloc.authorityFees,
                                  aiPowcBreakdown?.authority_fees_pct
                                )}
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
                                    updateCashOutflowsForStream({
                                      softCostAllocation: {
                                        ...softAlloc,
                                        architect: newValue,
                                      },
                                      ...(isOperationalHotel
                                        ? { operationalHotelScManual: true }
                                        : {}),
                                    });
                                  }}
                                  className={allocInputClass(
                                    softAlloc.architect,
                                    aiScBreakdown?.architect_pct
                                  )}
                                />
                                {renderAllocBadge(
                                  softAlloc.architect,
                                  aiScBreakdown?.architect_pct
                                )}
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
                                    updateCashOutflowsForStream({
                                      softCostAllocation: {
                                        ...softAlloc,
                                        projectManagement: newValue,
                                      },
                                      ...(isOperationalHotel
                                        ? { operationalHotelScManual: true }
                                        : {}),
                                    });
                                  }}
                                  className={allocInputClass(
                                    softAlloc.projectManagement,
                                    aiScBreakdown?.pm_pct
                                  )}
                                />
                                {renderAllocBadge(
                                  softAlloc.projectManagement,
                                  aiScBreakdown?.pm_pct
                                )}
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
                                    updateCashOutflowsForStream({
                                      softCostAllocation: {
                                        ...softAlloc,
                                        engineering: newValue,
                                      },
                                      ...(isOperationalHotel
                                        ? { operationalHotelScManual: true }
                                        : {}),
                                    });
                                  }}
                                  className={allocInputClass(
                                    softAlloc.engineering,
                                    aiScBreakdown?.engineering_pct
                                  )}
                                />
                                {renderAllocBadge(
                                  softAlloc.engineering,
                                  aiScBreakdown?.engineering_pct
                                )}
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
                                    updateCashOutflowsForStream({
                                      softCostAllocation: {
                                        ...softAlloc,
                                        geotechnical: newValue,
                                      },
                                      ...(isOperationalHotel
                                        ? { operationalHotelScManual: true }
                                        : {}),
                                    });
                                  }}
                                  className={allocInputClass(
                                    softAlloc.geotechnical,
                                    aiScBreakdown?.geotech_pct
                                  )}
                                />
                                {renderAllocBadge(
                                  softAlloc.geotechnical,
                                  aiScBreakdown?.geotech_pct
                                )}
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
                                    updateCashOutflowsForStream({
                                      softCostAllocation: {
                                        ...softAlloc,
                                        otherFees: newValue,
                                      },
                                      ...(isOperationalHotel
                                        ? { operationalHotelScManual: true }
                                        : {}),
                                    });
                                  }}
                                  className={allocInputClass(
                                    softAlloc.otherFees,
                                    aiScBreakdown?.other_pct
                                  )}
                                />
                                {renderAllocBadge(
                                  softAlloc.otherFees,
                                  aiScBreakdown?.other_pct
                                )}
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
                      {projectInfo.buildingConfig.towerFloors}F
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
                    {showsOperationalFfe && (
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
