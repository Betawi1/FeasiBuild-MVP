"use client";

export type AIRecommendationBoxProps = {
  title: string;
  source: string;
  sourceDetail: string;
  children: React.ReactNode;
  explanation: string;
};

export default function AIRecommendationBox({
  title,
  source,
  sourceDetail,
  children,
  explanation,
}: AIRecommendationBoxProps) {
  return (
    <div className="mb-6 rounded-lg border border-slate-700 bg-slate-800/50 p-6">
      <div className="mb-4 flex items-center gap-2">
        <span className="text-2xl">🤖</span>
        <div>
          <h3 className="text-lg font-semibold text-white">AI RECOMMENDATION</h3>
          <p className="text-sm font-medium text-slate-300">{title}</p>
          <p className="text-sm text-slate-400">{source}</p>
          <p className="text-xs text-slate-500">{sourceDetail}</p>
        </div>
      </div>

      <p className="mb-4 text-sm text-slate-300">
        These are suggested benchmarks. You can override any value if you have
        project-specific data.
      </p>

      {children}

      <div className="mt-4 border-t border-slate-700 pt-4">
        <p className="text-sm text-slate-400">
          <span className="text-lg">ℹ️</span> {explanation}
        </p>
      </div>
    </div>
  );
}
