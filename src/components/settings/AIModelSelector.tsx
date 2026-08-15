"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import { getPuterModel, PUTER_MODELS, DEFAULT_MODEL } from "@/lib/puter-models";
import {
  loadUserPreferences,
  saveUserPreferences,
} from "@/lib/puter-kv-preferences";

const TIER_LABELS: Record<(typeof PUTER_MODELS)[number]["tier"], string> = {
  recommended: "Recommended",
  premium: "Premium",
  fast: "Fast",
  budget: "Budget",
};

interface AIModelSelectorProps {
  variant?: "card" | "inline";
}

export default function AIModelSelector({
  variant = "card",
}: AIModelSelectorProps) {
  const { isLoaded, isSignedIn, userId } = useAuth();
  const [selectedModel, setSelectedModel] = useState<string>(DEFAULT_MODEL);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isLoaded || !isSignedIn || !userId) return;
    loadUserPreferences(userId).then((prefs) => {
      setSelectedModel(prefs.preferredModel);
    });
  }, [isLoaded, isSignedIn, userId]);

  const handleModelChange = async (newModelId: string) => {
    setSelectedModel(newModelId);
    setIsSaving(true);
    setError(null);

    try {
      await saveUserPreferences({ preferredModel: newModelId }, userId);
    } catch {
      setError("Failed to save preference. Please try again.");
      loadUserPreferences(userId).then((prefs) =>
        setSelectedModel(prefs.preferredModel)
      );
    } finally {
      setIsSaving(false);
    }
  };

  if (!isLoaded || !isSignedIn) {
    if (variant === "inline") return null;
    return (
      <div className="rounded-xl border border-slate-800 bg-slate-900 p-6">
        <h3 className="text-sm font-semibold text-white">AI Model Preference</h3>
        <p className="mt-2 text-sm text-slate-400">
          Sign in to choose the LLM used for AI research and feasibility study
          generation.
        </p>
      </div>
    );
  }

  const selected = getPuterModel(selectedModel);

  if (variant === "inline") {
    return (
      <label className="flex items-center gap-2">
        <span className="hidden text-xs font-medium text-slate-400 lg:inline">
          AI model
        </span>
        <select
          value={selectedModel}
          onChange={(e) => void handleModelChange(e.target.value)}
          disabled={isSaving}
          aria-label="AI model preference"
          className="max-w-[14rem] truncate rounded-lg border border-slate-700 bg-slate-900 px-2 py-1.5 text-xs text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:opacity-50"
        >
          {PUTER_MODELS.map((model) => (
            <option key={model.id} value={model.id}>
              {model.name}
            </option>
          ))}
        </select>
      </label>
    );
  }

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900 p-6">
      <h3 className="text-sm font-semibold text-white">AI Model Preference</h3>
      <p className="mt-2 text-xs text-slate-400">
        Choose the LLM for AI research and feasibility study generation. All
        processing happens securely via your Puter account.
      </p>

      <select
        value={selectedModel}
        onChange={(e) => void handleModelChange(e.target.value)}
        disabled={isSaving}
        className="mt-4 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:opacity-50"
      >
        {PUTER_MODELS.map((model) => (
          <option key={model.id} value={model.id}>
            {model.name}
          </option>
        ))}
      </select>

      {isSaving && (
        <p className="mt-2 flex items-center text-xs text-emerald-400">
          <span className="mr-2 animate-spin">⟳</span> Saving to your secure
          vault...
        </p>
      )}

      {error && <p className="mt-2 text-xs text-red-400">{error}</p>}

      {selected && (
        <div className="mt-4 rounded-lg border border-slate-800 bg-slate-950/60 p-3">
          <div className="mb-2 flex items-center gap-2">
            <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-400">
              {TIER_LABELS[selected.tier]}
            </span>
          </div>
          <p className="text-xs font-medium text-slate-300">
            {selected.description}
          </p>
          <p className="mt-1 text-xs text-slate-500">
            Best for: {selected.recommendedFor}
          </p>
          <p className="mt-2 text-xs leading-relaxed text-slate-400">
            {selected.whyThisModel}
          </p>
        </div>
      )}
    </div>
  );
}
