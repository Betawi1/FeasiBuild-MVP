"use client";

import { useEffect, useState } from "react";
import ResidentialFinancingWizard from "./residential-wizard";

export default function FinancingPage() {
  const [mounted, setMounted] = useState(false);

  // Prevent hydration mismatch (store is client-only)
  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return null; // Or a minimal loading skeleton
  }

  return <ResidentialFinancingWizard />;
}
