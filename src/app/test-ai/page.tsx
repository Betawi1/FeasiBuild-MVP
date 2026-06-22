"use client";

import { useState } from "react";
import { aiProvider } from "@/lib/ai-service";

export default function TestAIPage() {
  const [output, setOutput] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  const testGeneration = async () => {
    setLoading(true);
    try {
      const result = await aiProvider.generateCommentary(
        "Generate 5 detailed bullet points about GDP growth in Malaysia. Include specific GDP figures, sector drivers, and government policies. One bullet per line.",
        "Test"
      );
      setOutput(result);
    } catch (error) {
      setOutput([
        `Error: ${error instanceof Error ? error.message : "Unknown error"}`,
      ]);
    }
    setLoading(false);
  };

  return (
    <div className="p-8 max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Test Puter.js AI Integration</h1>
      <p className="text-sm text-slate-600 mb-4">
        Puter available: {aiProvider.isAvailable() ? "Yes" : "Waiting for script..."}
      </p>
      <button
        type="button"
        onClick={testGeneration}
        disabled={loading}
        className="px-4 py-2 bg-blue-600 text-white rounded disabled:bg-gray-400"
      >
        {loading ? "Generating..." : "Test AI Generation"}
      </button>

      {output.length > 0 && (
        <div className="mt-4 p-4 bg-gray-100 rounded">
          <h2 className="font-bold mb-2">Output:</h2>
          <ul className="list-disc pl-5 space-y-2">
            {output.map((line, i) => (
              <li key={i} className="text-sm text-slate-800">
                {line}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
