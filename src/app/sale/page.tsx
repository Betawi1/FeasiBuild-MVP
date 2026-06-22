import { redirect } from "next/navigation";

type SalePageProps = {
  searchParams?: Promise<{ projectId?: string }>;
};

export default async function SalePage({ searchParams }: SalePageProps) {
  const params = (await searchParams) ?? {};
  const qs = params.projectId
    ? `?projectId=${encodeURIComponent(params.projectId)}`
    : "";
  redirect(`/sale/cash-outflows${qs}`);
}
