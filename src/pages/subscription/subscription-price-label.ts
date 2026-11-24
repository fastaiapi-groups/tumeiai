import type { SubscriptionPrice } from "@/services/api/subscriptions";

// Price promotions belong to the selected billing interval, not the plan's copy.
export function subscriptionPriceBadge(price: SubscriptionPrice, fallback = "") {
    if (price.listAmountMinor > price.amountMinor && price.amountMinor > 0) {
        return Math.round((1 - price.amountMinor / price.listAmountMinor) * 100) + "% OFF";
    }
    return /\d+%\s*OFF/i.test(fallback) ? "" : fallback;
}
