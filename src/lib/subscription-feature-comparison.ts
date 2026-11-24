import type { SubscriptionPriceComparison, SubscriptionPriceComparisonRow } from "@/services/api/subscriptions";

// Stable catalog keys let the admin select a placement without changing database schema.
export const featureComparisonCodes = { month: "plan-features-month", year: "plan-features-year" } as const;
export function isFeatureComparison(code: string) {
    return Object.values(featureComparisonCodes).some((value) => value === code);
}
export function featureComparisonFor(tables: SubscriptionPriceComparison[], interval: "month" | "year") {
    return tables.find((table) => table.enabled && table.code === featureComparisonCodes[interval]);
}
export function comparisonText(value: object, field: string, _locale: string) {
    const fields = value as Record<string, unknown>;
    return String(fields[field + "Zh"] || fields[field + "En"] || "");
}
export function featureComparisonRows(table: SubscriptionPriceComparison) {
    return [
        ...new Map(
            table.columns
                .flatMap((column) => column.rows)
                .filter((row) => row.enabled && row.category !== "Pricing")
                .map((row) => [row.code, row]),
        ).values(),
    ].sort((a, b) => a.sortOrder - b.sortOrder);
}
export function featureComparisonValue(row: SubscriptionPriceComparisonRow, locale: string, multiplier: number) {
    const value = comparisonText(row, "value", locale);
    // Only generation estimates scale. Durations, unit prices, free benefits and concurrency do not.
    if (multiplier === 10000 || !["Video Models", "Image Models"].includes(row.category)) return value;
    return value.replace(/^([\d,]+)(?=\s*(?:个视频|张图片)|\s+(?:videos|images)\b)/, (count) => `≈ ${Math.round((Number(count.replaceAll(",", "")) * multiplier) / 10000).toLocaleString(locale)}`);
}
