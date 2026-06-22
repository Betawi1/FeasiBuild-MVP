"use client";

import { useEffect, useState } from "react";
import useFinModelStore from "@/store/useFinModelStore";
import ResidentialFinancingWizard from "./residential-wizard";
import CommercialFinancingWizard from "./commercial-wizard";

export default function FinancingPage() {
  const isResidential = useFinModelStore(
    (s) => s.sale.projectInfo.buildingType === "residential"
  );
  const [mounted, setMounted] = useState(false);

  // Prevent hydration mismatch (store is client-only)
  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return null; // Or a minimal loading skeleton
  }

  return isResidential ? (
    <ResidentialFinancingWizard />
  ) : (
    <CommercialFinancingWizard />
  );
}