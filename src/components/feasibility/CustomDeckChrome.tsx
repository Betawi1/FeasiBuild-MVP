"use client";

import { useEffect } from "react";
import { useUser } from "@clerk/nextjs";
import {
  reportCustomPagesPillRegression,
  type SubscriptionLike,
} from "@/lib/entitlements";

export function CustomPageInsertDivider({
  onInsert,
}: {
  onInsert: () => void;
}) {
  return (
    <div
      data-pdf-hide
      data-custom-page-divider
      className="no-print mx-auto flex w-full max-w-[1280px] items-center gap-3"
    >
      <div className="h-px flex-1 bg-slate-700" />
      <button
        type="button"
        onClick={onInsert}
        className="text-sm font-medium text-slate-300 hover:text-white"
      >
        + Insert page
      </button>
      <div className="h-px flex-1 bg-slate-700" />
    </div>
  );
}

export function CustomPageAddButton({
  onAdd,
  className,
}: {
  onAdd: () => void;
  className: string;
}) {
  return (
    <button
      type="button"
      data-pdf-hide
      data-custom-page-add
      onClick={onAdd}
      className={className}
    >
      Add page
    </button>
  );
}

export function CustomPagesUpsellPill({ onClick }: { onClick: () => void }) {
  const { user, isLoaded } = useUser();

  useEffect(() => {
    if (!isLoaded) return;
    const email = user?.primaryEmailAddress?.emailAddress ?? "";
    const sub = (
      user?.publicMetadata as { subscription?: SubscriptionLike } | undefined
    )?.subscription;
    reportCustomPagesPillRegression(email, sub);
  }, [isLoaded, user]);

  return (
    <button
      type="button"
      data-pdf-hide
      data-custom-pages-upsell
      onClick={onClick}
      className="rounded-full border border-amber-500/50 bg-amber-500/10 px-4 py-2 text-sm font-medium text-amber-200"
    >
      Add custom pages · upgrade
    </button>
  );
}
