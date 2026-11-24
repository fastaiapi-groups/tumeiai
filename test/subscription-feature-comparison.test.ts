import { expect, test } from "bun:test";
import { featureComparisonFor, featureComparisonRows, featureComparisonValue, isFeatureComparison } from "../src/lib/subscription-feature-comparison";
import type { SubscriptionPriceComparison, SubscriptionPriceComparisonRow } from "../src/services/api/subscriptions";

const row = (values: Partial<SubscriptionPriceComparisonRow>) => ({ enabled: true, category: "Video Models", valueEn: "253 videos\n11.84 credits/4s\n20% OFF", ...values }) as SubscriptionPriceComparisonRow;
test("feature tables select only the enabled matching billing period", () => {
    const tables = [
        { code: "plan-features-month", enabled: true },
        { code: "plan-features-year", enabled: false },
        { code: "competitors", enabled: true },
    ] as SubscriptionPriceComparison[];
    expect(featureComparisonFor(tables, "month")).toBe(tables[0]);
    expect(featureComparisonFor(tables, "year")).toBeUndefined();
    expect(isFeatureComparison("competitors")).toBe(false);
});
test("rows preserve distinct specifications, sort and omit duplicate price summaries", () => {
    const rows = [row({ code: "hd", sortOrder: 2 }), row({ code: "sd", sortOrder: 1 }), row({ code: "price", category: "Pricing" }), row({ code: "hidden", enabled: false })];
    const table = { columns: [{ rows }, { rows }] } as SubscriptionPriceComparison;
    expect(featureComparisonRows(table).map((item) => item.code)).toEqual(["sd", "hd"]);
});
test("generation estimates scale without modifying model rates, promotions or concurrent limits", () => {
    expect(featureComparisonValue(row({}), "en-US", 10000)).toBe("253 videos\n11.84 credits/4s\n20% OFF");
    expect(featureComparisonValue(row({}), "en-US", 20000)).toBe("≈ 506 videos\n11.84 credits/4s\n20% OFF");
    expect(featureComparisonValue(row({ category: "Processing & Features", valueEn: "12" }), "en-US", 20000)).toBe("12");
    expect(featureComparisonValue(row({ valueEn: "30 Days Unlimited" }), "en-US", 20000)).toBe("30 Days Unlimited");
    expect(featureComparisonValue(row({ valueZh: "253 个视频\n11.84 积分/4秒" }), "zh-CN", 20000)).toBe("≈ 506 个视频\n11.84 积分/4秒");
    expect(featureComparisonValue(row({ valueZh: "20 张图片" }), "zh-CN", 20000)).toBe("≈ 40 张图片");
    expect(featureComparisonValue(row({ valueZh: "30 天无限畅享" }), "zh-CN", 20000)).toBe("30 天无限畅享");
});
