import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  annotateResearchGuardrails,
  coerceAiResearchPayload,
  guardrailMessage,
} from "./ai-research-integrity";
import { normalizeAiResearchData } from "./constants/aiPrompts";

const INR_FX = 83.5;

function indiaPayload(basement: number) {
  return {
    fx_rate_to_usd: INR_FX,
    c1_development: {
      construction_rates: {
        building_rate_psf: 2500,
        parking_rate_psf: 2000,
        basement_rate_psf: basement,
        infrastructure_rate_psf: 400,
      },
      powc_breakdown: {
        site_establishment_pct: 30,
        overhead_pct: 40,
        authority_fees_pct: 30,
      },
      sc_breakdown: {
        architect_pct: 35,
        pm_pct: 20,
        engineering_pct: 30,
        geotech_pct: 5,
        other_pct: 10,
      },
    },
  };
}

describe("sale research is not floored to the USD sanity band", () => {
  it("keeps parsed rates, including 0, and flags 2500 as 40% under the old floor", () => {
    const raw = indiaPayload(0);
    const normalized = normalizeAiResearchData(raw);
    const stored = annotateResearchGuardrails(normalized, "INR");
    const rates = stored.c1_development.construction_rates as Record<string, number>;

    assert.equal(rates.building_rate_psf, 2500);
    assert.equal(rates.parking_rate_psf, 2000);
    assert.equal(rates.basement_rate_psf, 0);
    assert.equal(rates.infrastructure_rate_psf, 400);
    assert.equal(stored.guardrailFlags?.building_rate_psf, "40% below benchmark - review");
    assert.equal(stored.guardrailFlags?.basement_rate_psf, "zero rate - review");
    assert.equal(stored.guardrailFlags?.parking_rate_psf, undefined);
    assert.equal(stored.guardrailFlags?.infrastructure_rate_psf, undefined);
    assert.equal(140426 * rates.building_rate_psf, 351_065_000);
    assert.equal(207428 * rates.building_rate_psf, 518_570_000);
  });

  it("keeps a basement rate above the old floor", () => {
    const stored = annotateResearchGuardrails(
      normalizeAiResearchData(indiaPayload(3200)),
      "INR"
    );
    const rates = stored.c1_development.construction_rates as Record<string, number>;
    assert.equal(rates.basement_rate_psf, 3200);
    assert.equal(stored.guardrailFlags?.basement_rate_psf, undefined);
  });

  it("stores POWC and SC breakdowns verbatim when they already sum to 100", () => {
    const stored = normalizeAiResearchData(indiaPayload(3200));
    const powc = stored.c1_development.powc_breakdown as Record<string, number>;
    const sc = stored.c1_development.sc_breakdown as Record<string, number>;
    assert.deepEqual(
      [powc.site_establishment_pct, powc.overhead_pct, powc.authority_fees_pct],
      [30, 40, 30]
    );
    assert.deepEqual(
      [sc.architect_pct, sc.pm_pct, sc.engineering_pct, sc.geotech_pct, sc.other_pct],
      [35, 20, 30, 5, 10]
    );
  });

  it("scales an AI breakdown that does not sum to 100 instead of swapping in defaults", () => {
    const stored = normalizeAiResearchData({
      c1_development: {
        powc_breakdown: {
          site_establishment_pct: 30,
          overhead_pct: 30,
          authority_fees_pct: 30,
        },
      },
    });
    const powc = stored.c1_development.powc_breakdown as Record<string, number>;
    assert.notDeepEqual(
      [powc.site_establishment_pct, powc.overhead_pct, powc.authority_fees_pct],
      [40, 12, 48]
    );
    const sum =
      powc.site_establishment_pct + powc.overhead_pct + powc.authority_fees_pct;
    assert.ok(Math.abs(sum - 100) < 0.02);
  });

  it("omits a breakdown the payload did not send", () => {
    const stored = normalizeAiResearchData({
      c1_development: {
        construction_rates: { building_rate_psf: 2500 },
      },
    });
    assert.equal(stored.c1_development.powc_breakdown, undefined);
    assert.equal(stored.c1_development.sc_breakdown, undefined);
    assert.equal(
      (stored.c1_development.construction_rates as Record<string, number>)
        .building_rate_psf,
      2500
    );
  });

  it("parses a double-serialized payload once at the boundary", () => {
    const once = JSON.stringify(indiaPayload(3200));
    const twice = JSON.stringify(once);
    const parsed = coerceAiResearchPayload(twice) as ReturnType<
      typeof indiaPayload
    >;
    assert.equal(typeof parsed, "object");
    assert.equal(parsed.c1_development.construction_rates.building_rate_psf, 2500);
    assert.equal(parsed.c1_development.construction_rates.basement_rate_psf, 3200);
  });

  it("describes 2500 against a 4175 floor as 40 percent below", () => {
    assert.equal(guardrailMessage(2500, 4175), "40% below benchmark - review");
    assert.equal(guardrailMessage(3200, 1670), undefined);
    assert.equal(guardrailMessage(0, 1670), "zero rate - review");
  });
});
