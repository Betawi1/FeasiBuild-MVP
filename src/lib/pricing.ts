export type ProductKey =
  | "professional"
  | "credit_1"
  | "credit_10"
  | "credit_50"
  | "credit_100";

export const ONE_TIME_PRODUCTS: Record<
  ProductKey,
  { label: string; amount: string; credits: number; whiteLabel?: boolean }
> = {
  professional: {
    label: "Professional - Lifetime Access",
    amount: "99.00",
    credits: 0,
  },
  credit_1: {
    label: "Single Report Credit",
    amount: "59.00",
    credits: 1,
  },
  credit_10: {
    label: "10 Report Pack",
    amount: "390.00",
    credits: 10,
  },
  credit_50: {
    label: "50 Report Pack",
    amount: "1450.00",
    credits: 50,
  },
  credit_100: {
    label: "100 Report Pack (+ Logo Branding)",
    amount: "2400.00",
    credits: 100,
    whiteLabel: true,
  },
};

export const ADVISORY_ANNUAL_PRICE = "2889.00";
export const CREDIT_PRODUCT_KEYS: ProductKey[] = [
  "credit_1",
  "credit_10",
  "credit_50",
  "credit_100",
];
