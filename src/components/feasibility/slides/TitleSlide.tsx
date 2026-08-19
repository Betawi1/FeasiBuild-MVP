"use client";

import SlideContainer from "@/components/feasibility/SlideContainer";
import LogoUploadControl from "@/components/feasibility/LogoUploadControl";
import type { TitleSlideData } from "@/types/feasibility";
import type { SlideEditingProps } from "@/components/feasibility/slide-editing";
import { DEFAULT_LOGO_HEIGHT } from "@/lib/brand-logo";

interface Props extends SlideEditingProps {
  data: TitleSlideData;
  logo?: string | null;
  logoHeight?: number;
  canWhiteLabel?: boolean;
  onLogoSave?: (dataUrl: string) => Promise<void>;
  onLogoClear?: () => Promise<void>;
  onHeightPreview?: (h: number) => void;
  onHeightCommit?: (h: number) => Promise<void>;
}

function buildDefaultTitle(data: TitleSlideData): string {
  if (data.displayTitle) return data.displayTitle;
  if (data.isSaleStream) {
    return `Financial Feasibility Study for the Development of a ${data.saleAssetLabel || data.assetType} in ${data.city}, ${data.country}`;
  }
  if (data.benchmarkTitleLabel) {
    return `Financial Feasibility Study for the Development of a ${data.benchmarkTitleLabel} in ${data.city}, ${data.country}`;
  }
  if (data.isResidentialBTR) {
    return `Financial Feasibility Study for the Development of a ${data.btrGradeLabel || "Grade B"} Residential ${data.btrSegmentLabel || "High-Rise"} BTR Tower in ${data.city}, ${data.country}`;
  }
  if (data.isDataCentre) {
    return `Financial Feasibility Study for the Development of a ${data.dataCentreTierLabel || "Tier III"} ${data.dataCentreSegmentLabel || "Colocation"} Data Centre in ${data.city}, ${data.country}`;
  }
  if (data.isWarehouse) {
    return `Financial Feasibility Study for the Development of a ${data.warehouseGradeLabel || "Grade A"} ${data.warehouseSegmentLabel || "Warehouse"} in ${data.city}, ${data.country}`;
  }
  if (data.isOfficeMixedUse) {
    return `Financial Feasibility Study for the Development of a Prime Office & Retail Tower in ${data.city}, ${data.country}`;
  }
  if (data.isShoppingMall) {
    return `Financial Feasibility Study for the Development of a ${data.mallTypeLabel || "Regional"} Shopping Mall in ${data.city}, ${data.country}`;
  }
  return `Financial Feasibility Study for the Development of a ${data.starRating} ${data.segment} ${data.assetType} in ${data.city}, ${data.country}`;
}

export default function TitleSlide({
  data,
  isEditing = false,
  onDataChange,
  logo = null,
  logoHeight = DEFAULT_LOGO_HEIGHT,
  canWhiteLabel = false,
  onLogoSave,
  onLogoClear,
  onHeightPreview,
  onHeightCommit,
}: Props) {
  const fullTitle = buildDefaultTitle(data);
  const preparedBy = data.preparedBy ?? "Prepared by FeasiBuild AI";
  const reportYear = data.reportYear ?? String(new Date().getFullYear());
  const confidentialFooter =
    data.confidentialFooter ??
    "Confidential & Proprietary — For Internal Use Only";

  const updateField = (patch: Partial<TitleSlideData>) => {
    onDataChange?.({ ...data, ...patch });
  };

  const showLogo = Boolean(logo && canWhiteLabel);

  return (
    <SlideContainer className="[&>div]:p-0">
      <div className="relative w-full h-full flex flex-col justify-center items-center text-center px-12 py-12">
        {showLogo && (
          <img
            src={logo!}
            alt="Company logo"
            style={{ height: logoHeight }}
            className="mx-auto mb-6 w-auto object-contain"
          />
        )}
        {canWhiteLabel && isEditing && (
          <LogoUploadControl
            logo={logo}
            height={logoHeight}
            onSave={async (d) => {
              await onLogoSave?.(d);
            }}
            onClear={async () => {
              await onLogoClear?.();
            }}
            onHeightPreview={(h) => onHeightPreview?.(h)}
            onHeightCommit={async (h) => {
              await onHeightCommit?.(h);
            }}
          />
        )}
        {!canWhiteLabel && isEditing && (
          <p className="mb-4 text-xs text-slate-400" data-pdf-hide>
            Logo branding is available on Advisory, or Professional with the
            100-Pack.{" "}
            <a href="/#pricing" className="text-emerald-500 underline">
              See pricing
            </a>
          </p>
        )}
        {isEditing ? (
          <textarea
            value={fullTitle}
            onChange={(e) => updateField({ displayTitle: e.target.value })}
            className="w-full text-2xl font-bold text-slate-800 leading-tight mb-8 p-3 bg-slate-50 border border-emerald-500/50 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-y min-h-[100px]"
          />
        ) : (
          <h1 className="text-4xl font-bold text-slate-900 leading-tight mb-8">
            {fullTitle}
          </h1>
        )}

        <div className="w-32 h-1 bg-blue-600 mb-8" />

        <div className="space-y-2 w-full max-w-xl">
          {isEditing ? (
            <>
              <input
                type="text"
                value={preparedBy}
                onChange={(e) => updateField({ preparedBy: e.target.value })}
                className="w-full text-center text-lg text-slate-700 font-medium p-2 bg-slate-50 border border-emerald-500/50 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
              <input
                type="text"
                value={reportYear}
                onChange={(e) => updateField({ reportYear: e.target.value })}
                className="w-full text-center text-base text-slate-600 p-2 bg-slate-50 border border-emerald-500/50 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </>
          ) : (
            <>
              <p className="text-xl text-slate-600 font-medium">{preparedBy}</p>
              <p className="text-lg text-slate-500">{reportYear}</p>
            </>
          )}
        </div>

        <div className="absolute bottom-8 left-0 right-0 text-center px-8">
          {isEditing ? (
            <input
              type="text"
              value={confidentialFooter}
              onChange={(e) =>
                updateField({ confidentialFooter: e.target.value })
              }
              className="w-full text-center text-xs text-slate-600 italic p-2 bg-slate-50 border border-emerald-500/50 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          ) : (
            <p className="text-xs text-slate-400 italic">{confidentialFooter}</p>
          )}
        </div>
      </div>
    </SlideContainer>
  );
}
