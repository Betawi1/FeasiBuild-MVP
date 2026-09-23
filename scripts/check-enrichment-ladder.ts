import assert from "node:assert/strict";
import {
  buildCompactChartPrompt,
  buildCondensedCommentaryPrompt,
  chartPayloadUsable,
  ENRICHMENT_ATTEMPT_TIMEOUT_MS,
  guardEnrichmentCacheWrite,
  isPersistableEnrichmentContent,
  asFallbackCommentary,
  runAttemptLadder,
  withAttemptTimeout,
} from "../src/lib/feasibility/enrichment-ladder.ts";
import {
  createPromisePool,
  ENRICHMENT_CONCURRENCY,
  mapInEnrichmentOrder,
} from "../src/lib/feasibility/enrichment-pool.ts";

async function testPool() {
  assert.equal(ENRICHMENT_CONCURRENCY, 2);
  const run = createPromisePool(2);
  let active = 0;
  let max = 0;
  const tasks = Array.from({ length: 6 }, (_, i) =>
    run(async () => {
      active += 1;
      max = Math.max(max, active);
      await new Promise((r) => setTimeout(r, 20));
      active -= 1;
      return i;
    })
  );
  const values = await Promise.all(tasks);
  assert.deepEqual(values, [0, 1, 2, 3, 4, 5]);
  assert.equal(max, 2);

  const order: number[] = [];
  const mapped = await mapInEnrichmentOrder([1, 2, 3, 4], async (n) => {
    order.push(n);
    await new Promise((r) => setTimeout(r, 5));
    return n * 10;
  });
  assert.deepEqual(mapped, [10, 20, 30, 40]);
  assert.deepEqual(order.slice(0, 2).sort(), [1, 2]);
}

async function testLadder() {
  const calls: Array<{ attempt: number; stream: boolean; prompt: string }> = [];
  const recovered = await runAttemptLadder({
    prompt: "FULL",
    compactPrompt: "COMPACT",
    accept: (text) => text === "ok",
    call: async (step) => {
      calls.push(step);
      if (step.attempt < 3) return "";
      return "ok";
    },
  });
  assert.equal(recovered.ok, true);
  assert.equal(recovered.attempts, 3);
  assert.equal(calls[0]?.stream, true);
  assert.equal(calls[0]?.prompt, "FULL");
  assert.equal(calls[1]?.stream, false);
  assert.equal(calls[1]?.prompt, "FULL");
  assert.equal(calls[2]?.stream, false);
  assert.equal(calls[2]?.prompt, "COMPACT");

  const early = await runAttemptLadder({
    prompt: "FULL",
    compactPrompt: "COMPACT",
    accept: (text) => text.length > 0,
    call: async (step) => (step.attempt === 1 ? "" : "bullet"),
  });
  assert.equal(early.ok, true);
  assert.equal(early.attempts, 2);

  const partials: number[] = [];
  const rejected = await runAttemptLadder({
    prompt: "CHART",
    compactPrompt: "CHART-COMPACT",
    accept: (text) => chartPayloadUsable(JSON.parse(text)),
    call: async (step) => {
      partials.push(step.attempt);
      if (step.attempt < 3) return JSON.stringify({ data: [] });
      return JSON.stringify({
        data: [{ year: "2024", value: 1 }],
      });
    },
  });
  assert.equal(rejected.ok, true);
  assert.equal(rejected.attempts, 3);
  assert.deepEqual(partials, [1, 2, 3]);

  const failed = await runAttemptLadder({
    prompt: "X",
    compactPrompt: "Y",
    accept: () => false,
    call: async () => "",
  });
  assert.equal(failed.ok, false);
  assert.equal(failed.attempts, 3);
}

async function testTimeout() {
  assert.equal(ENRICHMENT_ATTEMPT_TIMEOUT_MS, 75_000);
  await assert.rejects(
    () => withAttemptTimeout(new Promise(() => {}), 30),
    (error: unknown) =>
      error instanceof Error && error.message === "ENRICHMENT_TIMEOUT"
  );
}

function testCacheGuard() {
  assert.equal(chartPayloadUsable(null), false);
  assert.equal(chartPayloadUsable({ data: [] }), false);
  assert.equal(chartPayloadUsable({ chart1: { data: [] }, chart2: { data: [{ a: 1 }] } }), false);
  assert.equal(
    chartPayloadUsable({ data: [{ year: "2024", value: 2 }] }),
    true
  );
  assert.equal(
    chartPayloadUsable({
      charts: [{ data: [{ year: "2024", arrivals: 1 }] }],
      commentary: ["a", "b", "c"],
    }),
    true
  );

  const fallback = asFallbackCommentary([
    "Deterministic paragraph one.",
    "Deterministic paragraph two.",
  ]);
  assert.equal(isPersistableEnrichmentContent(fallback), false);
  assert.equal(isPersistableEnrichmentContent(null), false);
  assert.equal(isPersistableEnrichmentContent([]), false);
  assert.equal(
    isPersistableEnrichmentContent(["Content generation failed: empty"]),
    false
  );
  assert.equal(
    isPersistableEnrichmentContent([
      "Dubai office vacancy tightened to 8% in 2025.",
    ]),
    true
  );
  assert.equal(guardEnrichmentCacheWrite("slide_hash", null), false);
  assert.equal(
    guardEnrichmentCacheWrite("slide_hash", [
      "Transaction volumes in Dubai rose 12% year on year.",
    ]),
    true
  );
  assert.ok(buildCompactChartPrompt("Return ONLY {\"data\":[]}").includes("compact raw JSON"));
  assert.ok(buildCondensedCommentaryPrompt("brief").includes("5 concise"));
}

await testPool();
await testLadder();
await testTimeout();
testCacheGuard();
console.log("enrichment ladder checks passed");
