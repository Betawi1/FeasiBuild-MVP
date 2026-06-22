import { redirect } from "next/navigation";

type OperationalPageProps = {
  searchParams?: Promise<{ projectId?: string }>;
};

export default async function OperationalPage({
  searchParams,
}: OperationalPageProps) {
  const params = (await searchParams) ?? {};
  const qs = params.projectId
    ? `?projectId=${encodeURIComponent(params.projectId)}`
    : "";
  redirect(`/operational/cash-outflows${qs}`);
}
