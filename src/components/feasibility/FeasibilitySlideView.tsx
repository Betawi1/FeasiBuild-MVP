"use client";

import { useEffect, useState } from "react";
import { useUser } from "@clerk/nextjs";
import type {
  FeasibilityProjectBundle,
  FeasibilitySlide,
  FeasibilitySlideData,
  SaleFeasibilityBundle,
} from "@/types/feasibility";
import { hasWhiteLabelAccess, getCustomerTier } from "@/lib/entitlements";
import {
  DEFAULT_LOGO_HEIGHT,
  clearBrandLogo,
  loadBrandLogo,
  loadBrandLogoHeight,
  saveBrandLogo,
  saveBrandLogoHeight,
} from "@/lib/brand-logo";
import { SlidePaginationProvider } from "@/components/feasibility/SlideHeader";
import { SlideWatermarkProvider } from "@/components/feasibility/SlideWatermark";
import { shouldWatermark } from "@/lib/report-entitlements";
import ProjectAnalysis from "./sections/ProjectAnalysis";
import MarketReview from "./sections/MarketReview";
import ExecutiveSummary from "./sections/ExecutiveSummary";
import FinancialFeasibility from "./sections/FinancialFeasibility";
import TravelTourismDemandSlide from "./slides/TravelTourismDemandSlide";
import TravelTourismOutlookSlide from "./slides/TravelTourismOutlookSlide";
import HistoricalHotelGuestsSlide from "./slides/HistoricalHotelGuestsSlide";
import AverageLengthOfStaySlide from "./slides/AverageLengthOfStaySlide";
import AnnualRevenuesByClassSlide from "./slides/AnnualRevenuesByClassSlide";
import CompetitionAnalysisSlide from "./slides/CompetitionAnalysisSlide";
import SummaryOfHospitalityMarketSlide from "./slides/SummaryOfHospitalityMarketSlide";
import ImplicationsOnProjectSlide from "./slides/ImplicationsOnProjectSlide";
import KeySuccessFactorsSlide from "./slides/KeySuccessFactorsSlide";
import KeyRiskFactorsSlide from "./slides/KeyRiskFactorsSlide";
import TitleSlide from "./slides/TitleSlide";
import ProjectLocationSlide from "./slides/ProjectLocationSlide";
import {
  buildTitleSlideData,
  isTitleSlideData,
} from "@/lib/feasibility/generate-title-slide";
import {
  buildProjectLocationSlideData,
  isProjectLocationSlideData,
} from "@/lib/feasibility/generate-project-location-slide";
import {
  generateTravelTourismDemandData,
  generateTravelTourismOutlookData,
  isTravelTourismDemandData,
  isTravelTourismOutlookData,
} from "@/lib/feasibility/generate-travel-tourism-data";
import {
  generateAnnualRevenuesData,
  generateCompetitionData,
  generateHistoricalGuestsData,
  generateHospitalitySummaryData,
  generateImplicationsData,
  generateLengthOfStayData,
  generateRiskFactorsData,
  generateSuccessFactorsData,
  isAnnualRevenuesData,
  isCompetitionData,
  isHistoricalGuestsData,
  isHospitalitySummaryData,
  isImplicationsData,
  isLengthOfStayData,
  isRiskFactorsData,
  isSuccessFactorsData,
} from "@/lib/feasibility/generate-hospitality-extended-data";
import RetailMarketOverviewSlide from "./slides/RetailMarketOverviewSlide";
import RetailMarketMetricsSlide from "./slides/RetailMarketMetricsSlide";
import RetailSupplyPipelineSlide from "./slides/RetailSupplyPipelineSlide";
import RetailCompetitiveLandscapeSlide from "./slides/RetailCompetitiveLandscapeSlide";
import RetailTenantProfileSlide from "./slides/RetailTenantProfileSlide";
import RetailMarketSummarySlide from "./slides/RetailMarketSummarySlide";
import {
  buildMallImplicationsData,
  buildMallRiskFactorsData,
  buildMallSuccessFactorsData,
  buildRetailCompetitiveLandscapeData,
  buildRetailMarketMetricsData,
  buildRetailMarketOverviewData,
  buildRetailMarketSummaryData,
  buildRetailSupplyPipelineData,
  buildRetailTenantProfileData,
  isRetailCompetitiveLandscapeData,
  isRetailMarketMetricsData,
  isRetailMarketOverviewData,
  isRetailMarketSummaryData,
  isRetailSupplyPipelineData,
  isRetailTenantProfileData,
} from "@/lib/feasibility/build-retail-market-data";
import {
  buildOfficeCompetitiveLandscapeData,
  buildOfficeImplicationsData,
  buildOfficeMarketMetricsData,
  buildOfficeMarketOverviewData,
  buildOfficeMarketSummaryData,
  buildOfficeRiskFactorsData,
  buildOfficeSuccessFactorsData,
  buildOfficeSupplyPipelineData,
  buildOfficeTenantProfileData,
} from "@/lib/feasibility/build-office-market-data";
import {
  buildBTRCompetitiveLandscapeData,
  buildBTRImplicationsData,
  buildBTRMarketMetricsData,
  buildBTRMarketOverviewData,
  buildBTRMarketSummaryData,
  buildBTRRiskFactorsData,
  buildBTRSuccessFactorsData,
  buildBTRSupplyPipelineData,
  buildBTRTenantProfileData,
} from "@/lib/feasibility/build-btr-market-data";
import {
  buildWarehouseCompetitiveLandscapeData,
  buildWarehouseDevelopmentAssumptionsData,
  buildWarehouseImplicationsData,
  buildWarehouseMarketMetricsData,
  buildWarehouseMarketOverviewData,
  buildWarehouseMarketSummaryData,
  buildWarehouseRiskFactorsData,
  buildWarehouseSuccessFactorsData,
  buildWarehouseSupplyPipelineData,
  buildWarehouseTenantProfileData,
  isWarehouseDevelopmentAssumptionsData,
} from "@/lib/feasibility/build-warehouse-market-data";
import {
  buildDataCentreCompetitiveAnalysisData,
  buildDataCentreCompetitiveLandscapeData,
  buildDataCentreDevelopmentAssumptionsData,
  buildDataCentreImplicationsData,
  buildDataCentreMarketMetricsData,
  buildDataCentreMarketOverviewData,
  buildDataCentreMarketSummaryData,
  buildDataCentreOperationalAssumptionsData,
  buildDataCentreRiskFactorsData,
  buildDataCentreSuccessFactorsData,
  buildDataCentreSupplyPipelineData,
  buildDataCentreTenantProfileData,
  isDataCentreCompetitiveAnalysisData,
  isDataCentreDevelopmentAssumptionsData,
  isDataCentreOperationalAssumptionsData,
} from "@/lib/feasibility/build-data-centre-market-data";
import WarehouseDevelopmentAssumptionsSlide from "./slides/WarehouseDevelopmentAssumptionsSlide";
import DataCentreMarketOverviewSlide from "./slides/DataCentreMarketOverviewSlide";
import DataCentreSupplyDemandSlide from "./slides/DataCentreSupplyDemandSlide";
import DataCentreCompetitiveAnalysisSlide from "./slides/DataCentreCompetitiveAnalysisSlide";
import DataCentreDevelopmentAssumptionsSlide from "./slides/DataCentreDevelopmentAssumptionsSlide";
import DataCentreOperationalAssumptionsSlide from "./slides/DataCentreOperationalAssumptionsSlide";
import {
  buildSaleImplicationsData,
  buildSaleRiskFactorsData,
  buildSaleSuccessFactorsData,
} from "@/lib/feasibility/sale/build-sale-market-data";

interface Props {
  slide: FeasibilitySlide;
  projectData: FeasibilityProjectBundle;
  isEditing?: boolean;
  onParagraphChange?: (index: number, text: string) => void;
  onDataChange?: (data: FeasibilitySlideData) => void;
  /** 0-based index in the deck. Title slide (0) has no page number. */
  slideIndex?: number;
  /** Total slides in the deck (title included). Numbered pages = this minus 1. */
  slideCount?: number;
}

interface InnerProps extends Props {
  logo: string | null;
  logoHeight: number;
  canWhiteLabel: boolean;
  onLogoSave: (dataUrl: string) => Promise<void>;
  onLogoClear: () => Promise<void>;
  onHeightPreview: (h: number) => void;
  onHeightCommit: (h: number) => Promise<void>;
}

export default function FeasibilitySlideView(props: Props) {
  const { user } = useUser();
  const email = user?.primaryEmailAddress?.emailAddress ?? "";
  const sub = (
    user?.publicMetadata as { subscription?: Record<string, unknown> } | undefined
  )?.subscription;
  const canWhiteLabel = hasWhiteLabelAccess(email, sub);
  const watermark = shouldWatermark(getCustomerTier(email, sub));

  const [logo, setLogo] = useState<string | null>(null);
  const [logoHeight, setLogoHeight] = useState(DEFAULT_LOGO_HEIGHT);
  useEffect(() => {
    if (!user?.id) return;
    let on = true;
    void (async () => {
      const [l, h] = await Promise.all([
        loadBrandLogo(user.id),
        loadBrandLogoHeight(user.id),
      ]);
      if (on) {
        setLogo(l);
        setLogoHeight(h);
      }
    })();
    return () => {
      on = false;
    };
  }, [user?.id]);

  const slideIndex = props.slideIndex ?? 0;
  const slideCount = props.slideCount ?? 1;
  const pageNumber = slideIndex > 0 ? slideIndex : null;
  const totalNumbered = Math.max(0, slideCount - 1);

  return (
    <SlidePaginationProvider pageNumber={pageNumber} totalNumbered={totalNumbered}>
      <SlideWatermarkProvider enabled={watermark}>
        <FeasibilitySlideViewInner
          {...props}
          logo={canWhiteLabel ? logo : null}
          logoHeight={logoHeight}
          canWhiteLabel={canWhiteLabel}
          onLogoSave={async (d) => {
            await saveBrandLogo(d, user?.id);
            setLogo(d);
          }}
          onLogoClear={async () => {
            await clearBrandLogo(user?.id);
            setLogo(null);
            setLogoHeight(DEFAULT_LOGO_HEIGHT);
          }}
          onHeightPreview={(h) => setLogoHeight(h)}
          onHeightCommit={async (h) => {
            setLogoHeight(h);
            await saveBrandLogoHeight(h, user?.id);
          }}
        />
      </SlideWatermarkProvider>
    </SlidePaginationProvider>
  );
}

function FeasibilitySlideViewInner({
  slide,
  projectData,
  isEditing,
  onParagraphChange,
  onDataChange,
  logo,
  logoHeight,
  canWhiteLabel,
  onLogoSave,
  onLogoClear,
  onHeightPreview,
  onHeightCommit,
}: InnerProps) {
  const common = { slide, isEditing, onParagraphChange, onDataChange };
  const editProps = { isEditing, onParagraphChange, onDataChange };
  const { country, city } = projectData.location;
  const agg = projectData.aggregate;
  const isRetail =
    projectData.assetType.toLowerCase().includes("retail") ||
    projectData.assetType.toLowerCase().includes("mall") ||
    slide.id.startsWith("mall-");
  const projectName = isRetail
    ? `${city} ${projectData.segment} mall`
    : `${city} ${projectData.segment} hotel`;

  if (slide.id === "title-slide") {
    const data = isTitleSlideData(slide.data)
      ? slide.data
      : buildTitleSlideData(projectData);
    return (
      <TitleSlide
        data={data}
        logo={logo}
        logoHeight={logoHeight}
        canWhiteLabel={canWhiteLabel}
        onLogoSave={onLogoSave}
        onLogoClear={onLogoClear}
        onHeightPreview={onHeightPreview}
        onHeightCommit={onHeightCommit}
        {...editProps}
      />
    );
  }

  if (slide.id === "project-location") {
    const data = isProjectLocationSlideData(slide.data)
      ? slide.data
      : buildProjectLocationSlideData(projectData);
    return <ProjectLocationSlide data={data} {...editProps} />;
  }

  if (slide.id === "hosp-demand") {
    const data = isTravelTourismDemandData(slide.data)
      ? slide.data
      : generateTravelTourismDemandData(country, city, []);
    return <TravelTourismDemandSlide data={data} country={country} {...editProps} />;
  }

  if (slide.id === "hosp-outlook") {
    const data = isTravelTourismOutlookData(slide.data)
      ? slide.data
      : generateTravelTourismOutlookData(country, city);
    return <TravelTourismOutlookSlide data={data} country={country} {...editProps} />;
  }

  if (slide.id === "hosp-guests") {
    const data = isHistoricalGuestsData(slide.data)
      ? slide.data
      : generateHistoricalGuestsData(agg);
    return (
      <HistoricalHotelGuestsSlide
        data={data}
        country={country}
        city={city}
        {...editProps}
      />
    );
  }

  if (slide.id === "hosp-length-of-stay") {
    const data = isLengthOfStayData(slide.data)
      ? slide.data
      : generateLengthOfStayData(agg);
    return (
      <AverageLengthOfStaySlide
        data={data}
        country={country}
        city={city}
        {...editProps}
      />
    );
  }

  if (slide.id === "hosp-revenues") {
    const data = isAnnualRevenuesData(slide.data)
      ? slide.data
      : generateAnnualRevenuesData(agg);
    return (
      <AnnualRevenuesByClassSlide
        data={data}
        country={country}
        city={city}
        {...editProps}
      />
    );
  }

  if (
    slide.id === "adr-occupancy" ||
    slide.id === "adr-occupancy-comp-set" ||
    slide.id === "hosp-3" ||
    slide.id === "hosp-arrivals-historical" ||
    slide.id === "hosp-arrivals-projected" ||
    slide.id === "hosp-supply" ||
    slide.id === "hosp-1" ||
    slide.id === "hosp-2" ||
    slide.id === "hosp-4"
  ) {
    return <MarketReview {...common} />;
  }

  if (slide.id === "hosp-competition-1") {
    const data = isCompetitionData(slide.data)
      ? slide.data
      : generateCompetitionData(agg);
    return (
      <CompetitionAnalysisSlide
        data={data}
        city={city}
        paragraphs={slide.paragraphs}
        {...editProps}
      />
    );
  }

  if (slide.id === "hosp-summary") {
    const data = isHospitalitySummaryData(slide.data)
      ? slide.data
      : generateHospitalitySummaryData(agg);
    return <SummaryOfHospitalityMarketSlide data={data} city={city} {...editProps} />;
  }

  if (slide.id === "hosp-implications") {
    const data = isImplicationsData(slide.data)
      ? slide.data
      : generateImplicationsData(agg);
    return (
      <ImplicationsOnProjectSlide
        data={data}
        city={city}
        subtitle={slide.subtitle ?? "Hospitality"}
        {...editProps}
      />
    );
  }

  if (slide.id === "hosp-success-factors") {
    const data = isSuccessFactorsData(slide.data)
      ? slide.data
      : generateSuccessFactorsData(agg);
    return <KeySuccessFactorsSlide data={data} projectName={projectName} {...editProps} />;
  }

  if (slide.id === "hosp-risk-factors") {
    const data = isRiskFactorsData(slide.data)
      ? slide.data
      : generateRiskFactorsData(agg);
    return <KeyRiskFactorsSlide data={data} city={city} {...editProps} />;
  }

  if (slide.id === "mall-market-overview") {
    const data = isRetailMarketOverviewData(slide.data)
      ? slide.data
      : buildRetailMarketOverviewData(projectData);
    return (
      <RetailMarketOverviewSlide
        data={data}
        paragraphs={slide.paragraphs}
        city={city}
        {...editProps}
      />
    );
  }

  if (slide.id === "mall-market-metrics") {
    if ((slide.charts?.length ?? 0) >= 2) {
      return <MarketReview {...common} />;
    }
    const data = isRetailMarketMetricsData(slide.data)
      ? slide.data
      : buildRetailMarketMetricsData(projectData);
    return (
      <RetailMarketMetricsSlide
        data={data}
        paragraphs={slide.paragraphs}
        city={city}
        {...editProps}
      />
    );
  }

  if (slide.id === "mall-supply-pipeline") {
    if ((slide.charts?.length ?? 0) >= 1) {
      return <MarketReview {...common} />;
    }
    const data = isRetailSupplyPipelineData(slide.data)
      ? slide.data
      : buildRetailSupplyPipelineData(projectData);
    return (
      <RetailSupplyPipelineSlide
        data={data}
        paragraphs={slide.paragraphs}
        city={city}
        {...editProps}
      />
    );
  }

  if (slide.id === "mall-competitive-landscape") {
    const data = isRetailCompetitiveLandscapeData(slide.data)
      ? slide.data
      : buildRetailCompetitiveLandscapeData(projectData);
    return (
      <RetailCompetitiveLandscapeSlide
        data={data}
        paragraphs={slide.paragraphs}
        city={city}
        {...editProps}
      />
    );
  }

  if (slide.id === "mall-tenant-profile") {
    const data = isRetailTenantProfileData(slide.data)
      ? slide.data
      : buildRetailTenantProfileData(projectData);
    return (
      <RetailTenantProfileSlide
        data={data}
        paragraphs={slide.paragraphs}
        city={city}
        {...editProps}
      />
    );
  }

  if (slide.id === "mall-market-summary") {
    const data = isRetailMarketSummaryData(slide.data)
      ? slide.data
      : buildRetailMarketSummaryData(projectData);
    return <RetailMarketSummarySlide data={data} city={city} {...editProps} />;
  }

  if (slide.id === "mall-implications") {
    const data = isImplicationsData(slide.data)
      ? slide.data
      : buildMallImplicationsData(projectData);
    return (
      <ImplicationsOnProjectSlide
        data={data}
        city={city}
        subtitle={slide.subtitle ?? "Retail"}
        {...editProps}
      />
    );
  }

  if (slide.id === "mall-success-factors") {
    const data = isSuccessFactorsData(slide.data)
      ? slide.data
      : buildMallSuccessFactorsData(projectData);
    return <KeySuccessFactorsSlide data={data} projectName={projectName} {...editProps} />;
  }

  if (slide.id === "mall-risk-factors") {
    const data = isRiskFactorsData(slide.data)
      ? slide.data
      : buildMallRiskFactorsData(projectData);
    return <KeyRiskFactorsSlide data={data} city={city} {...editProps} />;
  }

  if (slide.id === "mall-project-overview") {
    return <ProjectAnalysis {...common} projectData={projectData} />;
  }

  if (slide.id === "office-market-overview") {
    const data = isRetailMarketOverviewData(slide.data)
      ? slide.data
      : buildOfficeMarketOverviewData(projectData);
    return (
      <RetailMarketOverviewSlide
        data={data}
        paragraphs={slide.paragraphs}
        city={city}
        {...editProps}
      />
    );
  }

  if (slide.id === "office-market-metrics") {
    if ((slide.charts?.length ?? 0) >= 2) {
      return <MarketReview {...common} />;
    }
    const data = isRetailMarketMetricsData(slide.data)
      ? slide.data
      : buildOfficeMarketMetricsData(projectData);
    return (
      <RetailMarketMetricsSlide
        data={data}
        paragraphs={slide.paragraphs}
        city={city}
        {...editProps}
      />
    );
  }

  if (slide.id === "office-supply-pipeline") {
    if ((slide.charts?.length ?? 0) >= 1) {
      return <MarketReview {...common} />;
    }
    const data = isRetailSupplyPipelineData(slide.data)
      ? slide.data
      : buildOfficeSupplyPipelineData(projectData);
    return (
      <RetailSupplyPipelineSlide
        data={data}
        paragraphs={slide.paragraphs}
        city={city}
        {...editProps}
      />
    );
  }

  if (slide.id === "office-competitive-landscape") {
    const data = isRetailCompetitiveLandscapeData(slide.data)
      ? slide.data
      : buildOfficeCompetitiveLandscapeData(projectData);
    return (
      <RetailCompetitiveLandscapeSlide
        data={data}
        paragraphs={slide.paragraphs}
        city={city}
        {...editProps}
      />
    );
  }

  if (slide.id === "office-tenant-profile") {
    const data = isRetailTenantProfileData(slide.data)
      ? slide.data
      : buildOfficeTenantProfileData(projectData);
    return (
      <RetailTenantProfileSlide
        data={data}
        paragraphs={slide.paragraphs}
        city={city}
        {...editProps}
      />
    );
  }

  if (slide.id === "office-market-summary") {
    const data = isRetailMarketSummaryData(slide.data)
      ? slide.data
      : buildOfficeMarketSummaryData(projectData);
    return <RetailMarketSummarySlide data={data} city={city} {...editProps} />;
  }

  if (slide.id === "office-implications") {
    const data = isImplicationsData(slide.data)
      ? slide.data
      : buildOfficeImplicationsData(projectData);
    return (
      <ImplicationsOnProjectSlide
        data={data}
        city={city}
        subtitle={slide.subtitle ?? "Office"}
        {...editProps}
      />
    );
  }

  if (slide.id === "office-success-factors") {
    const data = isSuccessFactorsData(slide.data)
      ? slide.data
      : buildOfficeSuccessFactorsData(projectData);
    return <KeySuccessFactorsSlide data={data} projectName={projectName} {...editProps} />;
  }

  if (slide.id === "office-risk-factors") {
    const data = isRiskFactorsData(slide.data)
      ? slide.data
      : buildOfficeRiskFactorsData(projectData);
    return <KeyRiskFactorsSlide data={data} city={city} {...editProps} />;
  }

  if (slide.id === "office-project-overview") {
    return <ProjectAnalysis {...common} projectData={projectData} />;
  }

  if (slide.id === "btr-market-overview") {
    const data = isRetailMarketOverviewData(slide.data)
      ? slide.data
      : buildBTRMarketOverviewData(projectData);
    return (
      <RetailMarketOverviewSlide
        data={data}
        paragraphs={slide.paragraphs}
        city={city}
        {...editProps}
      />
    );
  }

  if (slide.id === "btr-market-metrics") {
    if ((slide.charts?.length ?? 0) >= 2) {
      return <MarketReview {...common} />;
    }
    const data = isRetailMarketMetricsData(slide.data)
      ? slide.data
      : buildBTRMarketMetricsData(projectData);
    return (
      <RetailMarketMetricsSlide
        data={data}
        paragraphs={slide.paragraphs}
        city={city}
        {...editProps}
      />
    );
  }

  if (slide.id === "btr-supply-pipeline") {
    if ((slide.charts?.length ?? 0) >= 1) {
      return <MarketReview {...common} />;
    }
    const data = isRetailSupplyPipelineData(slide.data)
      ? slide.data
      : buildBTRSupplyPipelineData(projectData);
    return (
      <RetailSupplyPipelineSlide
        data={data}
        paragraphs={slide.paragraphs}
        city={city}
        {...editProps}
      />
    );
  }

  if (slide.id === "btr-competitive-landscape") {
    const data = isRetailCompetitiveLandscapeData(slide.data)
      ? slide.data
      : buildBTRCompetitiveLandscapeData(projectData);
    return (
      <RetailCompetitiveLandscapeSlide
        data={data}
        paragraphs={slide.paragraphs}
        city={city}
        {...editProps}
      />
    );
  }

  if (slide.id === "btr-tenant-profile") {
    const data = isRetailTenantProfileData(slide.data)
      ? slide.data
      : buildBTRTenantProfileData(projectData);
    return (
      <RetailTenantProfileSlide
        data={data}
        paragraphs={slide.paragraphs}
        city={city}
        {...editProps}
      />
    );
  }

  if (
    slide.id === "warehouse-tenant-profile" ||
    slide.id === "datacentre-tenant-profile"
  ) {
    const data = isRetailTenantProfileData(slide.data)
      ? slide.data
      : slide.id === "datacentre-tenant-profile"
        ? buildDataCentreTenantProfileData(projectData)
        : buildWarehouseTenantProfileData(projectData);
    return (
      <RetailTenantProfileSlide
        data={data}
        paragraphs={slide.paragraphs}
        city={city}
        {...editProps}
      />
    );
  }

  if (slide.id === "datacentre-market-overview") {
    const data = isRetailMarketOverviewData(slide.data)
      ? slide.data
      : buildDataCentreMarketOverviewData(projectData);
    return (
      <DataCentreMarketOverviewSlide
        data={data}
        paragraphs={slide.paragraphs}
        city={city}
        {...editProps}
      />
    );
  }

  if (slide.id === "warehouse-market-overview") {
    const data = isRetailMarketOverviewData(slide.data)
      ? slide.data
      : buildWarehouseMarketOverviewData(projectData);
    return (
      <RetailMarketOverviewSlide
        data={data}
        paragraphs={slide.paragraphs}
        city={city}
        {...editProps}
      />
    );
  }

  if (slide.id === "datacentre-market-metrics") {
    if ((slide.charts?.length ?? 0) >= 2) {
      return <MarketReview {...common} />;
    }
    const data = isRetailMarketMetricsData(slide.data)
      ? slide.data
      : buildDataCentreMarketMetricsData(projectData);
    return (
      <RetailMarketMetricsSlide
        data={data}
        paragraphs={slide.paragraphs}
        city={city}
        {...editProps}
      />
    );
  }

  if (slide.id === "warehouse-market-metrics") {
    if ((slide.charts?.length ?? 0) >= 2) {
      return <MarketReview {...common} />;
    }
    const data = isRetailMarketMetricsData(slide.data)
      ? slide.data
      : buildWarehouseMarketMetricsData(projectData);
    return (
      <RetailMarketMetricsSlide
        data={data}
        paragraphs={slide.paragraphs}
        city={city}
        {...editProps}
      />
    );
  }

  if (slide.id === "datacentre-supply-pipeline") {
    if ((slide.charts?.length ?? 0) >= 1) {
      return <MarketReview {...common} />;
    }
    const data = isRetailSupplyPipelineData(slide.data)
      ? slide.data
      : buildDataCentreSupplyPipelineData(projectData);
    return (
      <DataCentreSupplyDemandSlide
        data={data}
        paragraphs={slide.paragraphs}
        city={city}
        {...editProps}
      />
    );
  }

  if (slide.id === "warehouse-supply-pipeline") {
    if ((slide.charts?.length ?? 0) >= 1) {
      return <MarketReview {...common} />;
    }
    const data = isRetailSupplyPipelineData(slide.data)
      ? slide.data
      : buildWarehouseSupplyPipelineData(projectData);
    return (
      <RetailSupplyPipelineSlide
        data={data}
        paragraphs={slide.paragraphs}
        city={city}
        {...editProps}
      />
    );
  }

  if (slide.id === "datacentre-competitive-analysis") {
    const data = isDataCentreCompetitiveAnalysisData(slide.data)
      ? slide.data
      : buildDataCentreCompetitiveAnalysisData(projectData);
    return (
      <DataCentreCompetitiveAnalysisSlide
        data={data}
        paragraphs={slide.paragraphs}
        city={city}
        {...editProps}
      />
    );
  }

  if (slide.id === "datacentre-competitive-landscape") {
    const data = isRetailCompetitiveLandscapeData(slide.data)
      ? slide.data
      : buildDataCentreCompetitiveLandscapeData(projectData);
    return (
      <RetailCompetitiveLandscapeSlide
        data={data}
        paragraphs={slide.paragraphs}
        city={city}
        assetLabel="datacentre"
        {...editProps}
      />
    );
  }

  if (slide.id === "warehouse-competitive-landscape") {
    const data = isRetailCompetitiveLandscapeData(slide.data)
      ? slide.data
      : buildWarehouseCompetitiveLandscapeData(projectData);
    return (
      <RetailCompetitiveLandscapeSlide
        data={data}
        paragraphs={slide.paragraphs}
        city={city}
        assetLabel="warehouse"
        {...editProps}
      />
    );
  }

  if (slide.id === "datacentre-market-summary") {
    const data = isRetailMarketSummaryData(slide.data)
      ? slide.data
      : buildDataCentreMarketSummaryData(projectData);
    return (
      <RetailMarketSummarySlide
        data={data}
        city={city}
        title="Summary of data centre market"
        {...editProps}
      />
    );
  }

  if (slide.id === "warehouse-market-summary") {
    const data = isRetailMarketSummaryData(slide.data)
      ? slide.data
      : buildWarehouseMarketSummaryData(projectData);
    return (
      <RetailMarketSummarySlide
        data={data}
        city={city}
        title="Summary of warehouse & industrial market"
        {...editProps}
      />
    );
  }

  if (slide.id === "datacentre-implications") {
    const data = isImplicationsData(slide.data)
      ? slide.data
      : buildDataCentreImplicationsData(projectData);
    return (
      <ImplicationsOnProjectSlide
        data={data}
        city={city}
        subtitle={slide.subtitle ?? "Data Centre"}
        {...editProps}
      />
    );
  }

  if (slide.id === "warehouse-implications") {
    const data = isImplicationsData(slide.data)
      ? slide.data
      : buildWarehouseImplicationsData(projectData);
    return (
      <ImplicationsOnProjectSlide
        data={data}
        city={city}
        subtitle={slide.subtitle ?? "Warehouse / Industrial"}
        {...editProps}
      />
    );
  }

  if (slide.id === "datacentre-success-factors") {
    const data = isSuccessFactorsData(slide.data)
      ? slide.data
      : buildDataCentreSuccessFactorsData(projectData);
    return (
      <KeySuccessFactorsSlide data={data} projectName={projectName} {...editProps} />
    );
  }

  if (slide.id === "warehouse-success-factors") {
    const data = isSuccessFactorsData(slide.data)
      ? slide.data
      : buildWarehouseSuccessFactorsData(projectData);
    return (
      <KeySuccessFactorsSlide data={data} projectName={projectName} {...editProps} />
    );
  }

  if (slide.id === "datacentre-risk-factors") {
    const data = isRiskFactorsData(slide.data)
      ? slide.data
      : buildDataCentreRiskFactorsData(projectData);
    return (
      <KeyRiskFactorsSlide data={data} city={city} {...editProps} />
    );
  }

  if (slide.id === "warehouse-risk-factors") {
    const data = isRiskFactorsData(slide.data)
      ? slide.data
      : buildWarehouseRiskFactorsData(projectData);
    return (
      <KeyRiskFactorsSlide data={data} city={city} {...editProps} />
    );
  }

  if (slide.id === "datacentre-dev-assumptions") {
    const data = isDataCentreDevelopmentAssumptionsData(slide.data)
      ? slide.data
      : buildDataCentreDevelopmentAssumptionsData(projectData);
    return (
      <DataCentreDevelopmentAssumptionsSlide
        data={data}
        paragraphs={slide.paragraphs}
        {...editProps}
      />
    );
  }

  if (slide.id === "datacentre-operational-assumptions") {
    const data = isDataCentreOperationalAssumptionsData(slide.data)
      ? slide.data
      : buildDataCentreOperationalAssumptionsData(projectData);
    return (
      <DataCentreOperationalAssumptionsSlide
        data={data}
        paragraphs={slide.paragraphs}
        {...editProps}
      />
    );
  }

  if (slide.id === "warehouse-dev-assumptions") {
    const data = isWarehouseDevelopmentAssumptionsData(slide.data)
      ? slide.data
      : buildWarehouseDevelopmentAssumptionsData(projectData);
    return (
      <WarehouseDevelopmentAssumptionsSlide
        data={data}
        paragraphs={slide.paragraphs}
        {...editProps}
      />
    );
  }

  if (slide.id === "btr-market-summary") {
    const data = isRetailMarketSummaryData(slide.data)
      ? slide.data
      : buildBTRMarketSummaryData(projectData);
    return <RetailMarketSummarySlide data={data} city={city} {...editProps} />;
  }

  if (slide.id === "btr-implications") {
    const data = isImplicationsData(slide.data)
      ? slide.data
      : buildBTRImplicationsData(projectData);
    return (
      <ImplicationsOnProjectSlide
        data={data}
        city={city}
        subtitle={slide.subtitle ?? "Residential"}
        {...editProps}
      />
    );
  }

  if (slide.id === "btr-success-factors") {
    const data = isSuccessFactorsData(slide.data)
      ? slide.data
      : buildBTRSuccessFactorsData(projectData);
    return <KeySuccessFactorsSlide data={data} projectName={projectName} {...editProps} />;
  }

  if (slide.id === "btr-risk-factors") {
    const data = isRiskFactorsData(slide.data)
      ? slide.data
      : buildBTRRiskFactorsData(projectData);
    return <KeyRiskFactorsSlide data={data} city={city} {...editProps} />;
  }

  if (slide.id === "btr-project-overview") {
    return <ProjectAnalysis {...common} projectData={projectData} />;
  }

  if (slide.id === "sale-project-overview") {
    return <ProjectAnalysis {...common} projectData={projectData} />;
  }

  if (slide.id === "sale-implications") {
    const data = isImplicationsData(slide.data)
      ? slide.data
      : buildSaleImplicationsData(projectData as SaleFeasibilityBundle);
    return (
      <ImplicationsOnProjectSlide
        data={data}
        city={city}
        subtitle={slide.subtitle ?? "Market Analysis"}
        {...editProps}
      />
    );
  }

  if (slide.id === "sale-success-factors") {
    const data = isSuccessFactorsData(slide.data)
      ? slide.data
      : buildSaleSuccessFactorsData(projectData as SaleFeasibilityBundle);
    return <KeySuccessFactorsSlide data={data} projectName={projectName} {...editProps} />;
  }

  if (slide.id === "sale-risk-factors") {
    const data = isRiskFactorsData(slide.data)
      ? slide.data
      : buildSaleRiskFactorsData(projectData as SaleFeasibilityBundle);
    return <KeyRiskFactorsSlide data={data} city={city} {...editProps} />;
  }

  switch (slide.section) {
    case "title":
      return (
        <TitleSlide
          data={
            isTitleSlideData(slide.data)
              ? slide.data
              : buildTitleSlideData(projectData)
          }
          logo={logo}
          logoHeight={logoHeight}
          canWhiteLabel={canWhiteLabel}
          onLogoSave={onLogoSave}
          onLogoClear={onLogoClear}
          onHeightPreview={onHeightPreview}
          onHeightCommit={onHeightCommit}
          {...editProps}
        />
      );
    case "executive":
      return <ExecutiveSummary {...common} projectData={projectData} />;
    case "financial":
      return <FinancialFeasibility {...common} projectData={projectData} />;
    case "project":
      return <ProjectAnalysis {...common} projectData={projectData} />;
    case "market":
      return <MarketReview {...common} />;
    default:
      return <ProjectAnalysis {...common} projectData={projectData} />;
  }
}
