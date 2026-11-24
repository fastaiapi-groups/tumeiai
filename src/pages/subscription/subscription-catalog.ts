import { uiText } from "@/lib/ui-text";
import type { SubscriptionPlan } from "@/services/api/subscriptions";

export function catalogPlans(plans: SubscriptionPlan[], audience: string) {
    return plans.filter((plan) => plan.plan.audience === audience).sort((a, b) => (a.plan.sortOrder || 0) - (b.plan.sortOrder || 0) || a.plan.code.localeCompare(b.plan.code));
}

export function catalogLabel(plan: SubscriptionPlan) {
    return { name: plan.name, tagline: plan.tagline || plan.description || "", badge: plan.badgeText };
}

export function catalogPrice(plan: SubscriptionPlan, interval: "month" | "year") {
    return plan.prices.find((price) => price.enabled && price.billingInterval === interval);
}

export function catalogCredits(price: SubscriptionPlan["prices"][number] | undefined) {
    return (price?.includedMicrocredits || 0) / 1_000_000;
}

export function catalogModelScope(rule: Record<string, unknown>, locale: string) {
    try {
        const selector = JSON.parse(String(rule.selectorJson || "{}")) as Record<string, unknown>;
        const values = Object.entries(selector)
            .filter(([key, value]) => key !== "unlimitedDays" && value !== "*" && ["string", "number"].includes(typeof value))
            .map(([, value]) => String(value));
        if (Number(selector.unlimitedDays) > 0) values.push(`${Number(selector.unlimitedDays)} 天`);
        return values.join(" · ");
    } catch {
        return "";
    }
}
