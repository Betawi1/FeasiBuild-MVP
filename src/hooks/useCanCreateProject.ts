"use client";

import { useEffect, useState } from "react";
import { useUser } from "@clerk/nextjs";
import { getCustomerTier } from "@/lib/entitlements";
import { canCreateProject } from "@/lib/report-entitlements";

const LOCKED_HINT =
  "Free tier limit reached — upgrade to start new projects";

export function useCanCreateProject() {
  const { user } = useUser();
  const email = user?.primaryEmailAddress?.emailAddress ?? "";
  const sub = (
    user?.publicMetadata as { subscription?: Record<string, unknown> } | undefined
  )?.subscription;
  const tier = getCustomerTier(email, sub);
  const [canCreate, setCanCreate] = useState(true);

  useEffect(() => {
    let on = true;
    canCreateProject(tier, user?.id).then((v) => {
      if (on) setCanCreate(v);
    });
    return () => {
      on = false;
    };
  }, [tier, user?.id]);

  return { canCreate, tier, lockedHint: LOCKED_HINT };
}
