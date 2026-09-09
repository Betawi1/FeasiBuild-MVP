"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

const PAGE_TO_COMPONENT: Record<string, string> = {
  "cash-outflows": "Component 1",
  "cash-inflows": "Component 2",
  "project-irr": "Component 3",
  financing: "Component 4",
  "equity-returns": "Component 5",
  "scenario-analysis": "Component 6",
};

function resolveWizardDocumentTitle(pathname: string): string | null {
  const parts = pathname.split("/").filter(Boolean);
  if (parts[0] === "docs") return null;
  if (parts.length === 1 && parts[0] === "app") return "FeasiBuild";

  let rest = parts;
  if (rest[0] === "sale" || rest[0] === "operational") {
    rest = rest.slice(1);
  }
  if (rest[0] === "preview") {
    rest = rest.slice(1);
  }

  const page = rest[0];
  if (!page || rest.length !== 1) return null;
  const component = PAGE_TO_COMPONENT[page];
  return component ? `${component} — FeasiBuild` : null;
}

/** Sets the browser tab to `Component N — FeasiBuild` on wizard/preview routes. */
export default function WizardDocumentTitle() {
  const pathname = usePathname() ?? "";

  useEffect(() => {
    const title = resolveWizardDocumentTitle(pathname);
    if (!title) return;
    const previous = document.title;
    document.title = title;
    return () => {
      document.title = previous;
    };
  }, [pathname]);

  return null;
}
