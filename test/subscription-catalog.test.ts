import { describe, expect, test } from "bun:test";
import { catalogCredits, catalogLabel, catalogPlans, catalogPrice } from "../src/pages/subscription/subscription-catalog";
import type { SubscriptionPlan, SubscriptionPrice } from "../src/services/api/subscriptions";
import { subscriptionPriceBadge } from "../src/pages/subscription/subscription-price-label";

function plan(code: string, audience = "individual", sortOrder = 0): SubscriptionPlan {
    return {
        plan: { id: code, code, audience, sortOrder, featured: false, status: "published", defaultLocale: "zh-CN" },
        revision: { id: code, planId: code, versionNo: 1, status: "published", effectiveAt: "" },
        name: "后台设置的名称",
        tagline: "后台介绍",
        badgeText: "后台标签",
        locale: "zh-CN",
        prices: [],
        features: [],
        modelRules: [],
        limitRules: [],
        apiPools: [],
        modelQuotes: [],
    };
}

describe("subscription catalog", () => {
    test("discount badge follows the selected price instead of annual-only copy", () => {
        expect(subscriptionPriceBadge({ amountMinor: 5800, listAmountMinor: 7500 } as SubscriptionPrice, "41% OFF")).toBe("23% OFF");
        expect(subscriptionPriceBadge({ amountMinor: 52800, listAmountMinor: 90000 } as SubscriptionPrice, "41% OFF")).toBe("41% OFF");
        expect(subscriptionPriceBadge({ amountMinor: 3600, listAmountMinor: 3600 } as SubscriptionPrice, "50% OFF")).toBe("");
    });
    test("known plan codes never override server copy", () => {
        expect(catalogLabel(plan("plus"))).toEqual({ name: "后台设置的名称", tagline: "后台介绍", badge: "后台标签" });
    });
    test("custom plans follow audience and server ordering", () => {
        expect(catalogPlans([plan("plus", "individual", 20), plan("custom", "individual", 10), plan("team", "team")], "individual").map((p) => p.plan.code)).toEqual(["custom", "plus"]);
        expect(catalogPlans([plan("plus")], "team")).toEqual([]);
    });
    test("missing year price is not silently replaced by monthly price", () => {
        const item = plan("custom");
        item.prices = [{ id: "month", billingInterval: "month", enabled: true, includedMicrocredits: 150_000_000 } as SubscriptionPrice];
        expect(catalogPrice(item, "year")).toBeUndefined();
        expect(catalogCredits(catalogPrice(item, "month"))).toBe(150);
        expect(catalogCredits(undefined)).toBe(0);
    });
});
