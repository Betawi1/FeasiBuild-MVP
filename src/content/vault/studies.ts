export type VaultStream = "SALE" | "OPERATIONAL";

export type VaultStudy = {
  id: string;
  title: string;
  stream: VaultStream;
  bullets: string[];
  pdf: string;
  fileName: string;
};

export const VAULT_STUDIES: VaultStudy[] = [
  {
    id: "residential-rak-uae",
    title: "High-Rise Residential Tower — Ras Al Khaimah, UAE",
    stream: "SALE",
    bullets: [
      "unit-mix pricing & absorption-paced sales",
      "development IRR, NPV & peak equity",
      "full bankable narrative",
    ],
    pdf: "/vault/residential-rak-uae.pdf",
    fileName: "residential-rak-uae.pdf",
  },
  {
    id: "residential-dongguan-china",
    title: "High-Rise Residential Tower — Dongguan, China",
    stream: "SALE",
    bullets: [
      "configurable payment structure (no native preset — pin-drop proof)",
      "absorption-paced sales",
      "development IRR & peak equity",
    ],
    pdf: "/vault/residential-dongguan-china.pdf",
    fileName: "residential-dongguan-china.pdf",
  },
  {
    id: "datacentre-penang-malaysia",
    title: "Tier IV Colocation Data Centre — Penang, Malaysia",
    stream: "OPERATIONAL",
    bullets: [
      "MW & rack-space revenue build",
      "Uptime Tier IV specifications",
      "stabilised yield, DSCR & WALT",
    ],
    pdf: "/vault/datacentre-penang-malaysia.pdf",
    fileName: "datacentre-penang-malaysia.pdf",
  },
];
