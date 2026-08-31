"use client";

export default function AiModelFallbackNotice({
  notice,
}: {
  notice: string | null;
}) {
  if (!notice) return null;
  return (
    <div className="mb-6 rounded-lg border border-sky-500/30 bg-sky-500/10 px-4 py-3">
      <p className="text-sm text-sky-300">{notice}</p>
    </div>
  );
}
