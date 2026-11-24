import type { SubscriptionPlan, SubscriptionPriceComparison } from "@/services/api/subscriptions";

// Imported comparisons can retain archived plan columns. Only currently
// available plans belong in the purchase comparison.
export function supportedComparisonColumns(table: SubscriptionPriceComparison, plans: SubscriptionPlan[]) {
    const codes = new Set(plans.map((plan) => plan.plan.code));
    return table.columns.filter((column) => column.enabled && codes.has(column.code)).sort((a, b) => a.sortOrder - b.sortOrder);
}
