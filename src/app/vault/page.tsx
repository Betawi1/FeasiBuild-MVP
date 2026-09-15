import type { Metadata } from "next";
import VaultLibrary from "@/components/vault/VaultLibrary";

export const metadata: Metadata = {
  title: "Sample Feasibility Studies: 3 Real Examples | FeasiBuild",
  description:
    "Inspect three institutional-grade feasibility studies — a UAE residential tower, a China residential tower and a Tier IV data centre in Malaysia — free in the FeasiBuild Vault.",
  openGraph: {
    title: "Sample Feasibility Studies: 3 Real Examples | FeasiBuild",
    description:
      "Inspect three institutional-grade feasibility studies — a UAE residential tower, a China residential tower and a Tier IV data centre in Malaysia — free in the FeasiBuild Vault.",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "Sample Feasibility Studies: 3 Real Examples | FeasiBuild",
    description:
      "Inspect three institutional-grade feasibility studies — a UAE residential tower, a China residential tower and a Tier IV data centre in Malaysia — free in the FeasiBuild Vault.",
  },
};

export default function VaultPage() {
  return <VaultLibrary />;
}
