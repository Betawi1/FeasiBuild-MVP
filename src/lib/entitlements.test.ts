import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  getCustomerTier,
  hasCustomPagesAccess,
  hasWhiteLabelAccess,
  reportCustomPagesPillRegression,
  type SubscriptionLike,
} from "./entitlements";

function daysAgo(days: number): string {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
}

const recent = daysAgo(1);
const expired = daysAgo(400);

describe("custom pages and white-label share one check", () => {
  it("is a single function under two names", () => {
    assert.equal(hasCustomPagesAccess, hasWhiteLabelAccess);
  });

  it("getCustomerTier advisory -> true", () => {
    assert.equal(getCustomerTier("advisory@example.com", null), "advisory");
    assert.equal(hasCustomPagesAccess("advisory@example.com", null), true);

    const unlimited: SubscriptionLike = {
      plan: "advisory",
      lifetime: true,
      unlimited: true,
      whiteLabel: true,
      unlimitedPurchasedAt: recent,
    };
    assert.equal(getCustomerTier("member@firm.com", unlimited), "advisory");
    assert.equal(hasCustomPagesAccess("member@firm.com", unlimited), true);
  });

  it("Professional + active 100-Pack -> true", () => {
    const sub: SubscriptionLike = {
      plan: "professional",
      lifetime: true,
      whiteLabel: true,
      packPurchasedAt: recent,
    };
    assert.equal(getCustomerTier("member@firm.com", sub), "pro");
    assert.equal(hasCustomPagesAccess("member@firm.com", sub), true);
  });

  it("Professional only -> false", () => {
    const sub: SubscriptionLike = {
      plan: "professional",
      lifetime: true,
    };
    assert.equal(getCustomerTier("pro@example.com", sub), "pro");
    assert.equal(hasCustomPagesAccess("pro@example.com", sub), false);
  });

  it("Explorer -> false", () => {
    assert.equal(getCustomerTier("explorer@example.com", null), "explorer");
    assert.equal(hasCustomPagesAccess("explorer@example.com", null), false);
    assert.equal(
      hasCustomPagesAccess("explorer@example.com", { plan: "explorer" }),
      false
    );
  });

  it("expired Unlimited -> false", () => {
    const sub: SubscriptionLike = {
      plan: "advisory",
      lifetime: true,
      unlimited: true,
      whiteLabel: true,
      unlimitedPurchasedAt: expired,
    };
    assert.equal(hasCustomPagesAccess("member@firm.com", sub), false);
    assert.equal(hasWhiteLabelAccess("member@firm.com", sub), false);
  });

  it("dev warn fires only for advisory or an active 100-Pack", () => {
    const warnings: unknown[][] = [];
    const original = console.warn;
    console.warn = (...args: unknown[]) => {
      warnings.push(args);
    };
    try {
      reportCustomPagesPillRegression("advisory@example.com", null);
      reportCustomPagesPillRegression("member@firm.com", {
        plan: "professional",
        lifetime: true,
        whiteLabel: true,
        packPurchasedAt: recent,
      });
      reportCustomPagesPillRegression("explorer@example.com", null);
      reportCustomPagesPillRegression("member@firm.com", {
        plan: "advisory",
        lifetime: true,
        unlimited: true,
        whiteLabel: true,
        unlimitedPurchasedAt: expired,
      });
    } finally {
      console.warn = original;
    }
    if (process.env.NODE_ENV === "production") {
      assert.equal(warnings.length, 0);
      return;
    }
    assert.equal(warnings.length, 2);
    assert.match(String(warnings[0][0]), /advisory tier or an active 100-Pack/);
  });
});
