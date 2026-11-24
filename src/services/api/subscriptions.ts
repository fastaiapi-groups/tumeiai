import { http, serializeApiParams } from "@/services/api/request";

export type SubscriptionPrice = {
    id: string;
    billingInterval: "month" | "year";
    intervalCount: number;
    billingMethod: "manual" | "recurring";
    currency: string;
    amountMinor: number;
    listAmountMinor: number;
    discountBasisPoints: number;
    minMultiplierBasisPoints: number;
    maxMultiplierBasisPoints: number;
    multiplierStepBasisPoints: number;
    multiplierPriceMode: "linear" | "fixed";
    creditDeliveryMode: string;
    autoRenewDefault: boolean;
    enabled: boolean;
    monthlyEquivalentMinor: number;
    includedMicrocredits?: number;
};

export type SubscriptionFeature = {
    id: string;
    featureCode: string;
    valueType: string;
    valueBool?: boolean;
    valueInt?: number;
    valueText?: string;
    unit?: string;
    displayGroup?: string;
    highlighted: boolean;
    displayText: string;
    description?: string;
};

export type SubscriptionPlan = {
    plan: { id: string; code: string; audience: string; status: string; defaultLocale: string; featured: boolean; sortOrder?: number };
    revision: { id: string; planId: string; versionNo: number; status: string; effectiveAt: string; catalogJson?: string };
    name: string;
    tagline?: string;
    description?: string;
    badgeText?: string;
    locale: string;
    prices: SubscriptionPrice[];
    features: SubscriptionFeature[];
    modelRules: Array<Record<string, unknown>>;
    limitRules: Array<Record<string, unknown>>;
    apiPools: Array<Record<string, unknown>>;
    modelQuotes: Array<{ id: string; logicalModelCode: string; capability: string; specJson: string; unitCostMicrocredits: number; netCostMicrocredits: number; estimatedGenerationCount: number; displayable: boolean }>;
};

export type SubscriptionFAQ = { id: string; faqCode: string; category: string; question: string; answer: string; locale: string };
export type SubscriptionPriceComparisonRow = {
    id: string;
    setId: string;
    columnId: string;
    columnCode?: string;
    code: string;
    category: string;
    sortOrder: number;
    enabled: boolean;
    labelZh: string;
    labelEn: string;
    labelJa: string;
    labelKo: string;
    valueZh: string;
    valueEn: string;
    valueJa: string;
    valueKo: string;
};
export type SubscriptionPriceComparisonColumn = {
    id: string;
    setId: string;
    code: string;
    sortOrder: number;
    featured: boolean;
    enabled: boolean;
    nameZh: string;
    nameEn: string;
    nameJa: string;
    nameKo: string;
    taglineZh: string;
    taglineEn: string;
    taglineJa: string;
    taglineKo: string;
    rows: SubscriptionPriceComparisonRow[];
};
export type SubscriptionPriceComparison = {
    id: string;
    code: string;
    sortOrder: number;
    enabled: boolean;
    titleZh: string;
    titleEn: string;
    titleJa: string;
    titleKo: string;
    subtitleZh: string;
    subtitleEn: string;
    subtitleJa: string;
    subtitleKo: string;
    columns: SubscriptionPriceComparisonColumn[];
};
export type SubscriptionMe = {
    subscription?: { id: string; planId: string; revisionId: string; priceId: string; status: string; currentPeriodStart: string; currentPeriodEnd: string; cancelAtPeriodEnd: boolean } | null;
    planName: string;
    cycles: Array<Record<string, unknown>>;
    lots: Array<{ id: string; poolCode: string; remainingMicrocredits: number; expiresAt?: string; status: string }>;
};
export type SubscriptionCheckout = {
    session?: import("../stripe-subscription").SubscriptionPaymentSession;
    subscriptionId: string;
    cycleId: string;
    paymentId: string;
    merchantOrderNo: string;
    amountMinor: number;
    currency: string;
    status: string;
    checkout: { mode: string; value?: string; expiresAt?: string };
};

export async function listSubscriptionPlans(locale?: string) {
    return http.get<{ plans: SubscriptionPlan[]; locales: string[] }>(`/subscription/catalog?${serializeApiParams({ locale })}`);
}
export async function listSubscriptionFAQs(locale?: string) {
    return http.get<{ faqs: SubscriptionFAQ[] }>(`/subscription/faqs?${serializeApiParams({ locale })}`);
}
export async function listSubscriptionPriceComparisons() {
    return http.get<{ comparisons: SubscriptionPriceComparison[] }>("/subscription/price-comparisons");
}
export async function listSubscriptionComparison(revisionId: string, locale?: string) {
    return http.get<{ revisionId: string; quotes: SubscriptionPlan["modelQuotes"] }>(`/subscription/compare?${serializeApiParams({ revisionId, locale })}`);
}
export async function getSubscriptionMe(signal?: AbortSignal) {
    return http.get<SubscriptionMe>("/subscription/me", { signal });
}
export async function quoteSubscription(payload: { revisionId: string; priceId: string; multiplierBasisPoints: number; currency?: string }) {
    return http.post<{ revisionId: string; priceId: string; amountMinor: number; totalMinor: number; multiplierBasisPoints: number; quoteId: string; expiresAt: string }>("/subscription/quote", payload);
}
export async function checkoutSubscription(payload: { revisionId: string; priceId: string; providerId: string; idempotencyKey: string; multiplierBasisPoints: number; locale?: string }) {
    return http.post<{ checkout: SubscriptionCheckout }>("/subscription/checkout", payload);
}
export async function cancelSubscription(subscriptionId: string) {
    return http.post<{ ok: boolean }>("/subscription/cancel", { subscriptionId });
}
export async function resumeSubscription(subscriptionId: string) {
    return http.post<{ ok: boolean }>("/subscription/resume", { subscriptionId });
}
export async function getSubscriptionPayment(id: string) {
    return http.get<{ payment: { id: string; status: string; checkoutMode: string; checkoutValue?: string; amountMinor: number; currency: string } }>(`/subscription/payments/${encodeURIComponent(id)}`);
}
export async function querySubscriptionPayment(id: string) {
    return http.post<{ payment: { id: string; status: string; checkoutMode: string; checkoutValue?: string; amountMinor: number; currency: string } }>(`/subscription/payments/${encodeURIComponent(id)}/query`);
}

export type AdminSubscriptionPlanRecord = {
    plan: SubscriptionPlan["plan"];
    revision: SubscriptionPlan["revision"];
    prices: SubscriptionPrice[];
    localizations: Array<Record<string, unknown>>;
    features: SubscriptionFeature[];
    featureLocales: Array<Record<string, unknown>>;
    creditRules: Array<Record<string, unknown>>;
    modelRules: Array<Record<string, unknown>>;
    limitRules: Array<Record<string, unknown>>;
    apiPools: Array<Record<string, unknown>>;
    modelQuotes: SubscriptionPlan["modelQuotes"];
};
export type AdminSubscriptionPriceComparison = SubscriptionPriceComparison;
export async function listAdminSubscriptionPlans() {
    return http.get<{ plans: AdminSubscriptionPlanRecord[] }>("/admin/subscriptions/plans");
}
export async function listAdminSubscriptionPriceComparisons() {
    return http.get<{ comparisons: AdminSubscriptionPriceComparison[] }>("/admin/subscriptions/price-comparisons");
}
export async function saveAdminSubscriptionPriceComparison(payload: Record<string, unknown>) {
    return http.post<{ comparison: Record<string, unknown> }>("/admin/subscriptions/price-comparisons", payload);
}
export async function createAdminSubscriptionPlan(payload: Record<string, unknown>) {
    return http.post<{ revision: { id: string; status: string } }>("/admin/subscriptions/plans", payload);
}
export async function publishAdminSubscriptionPlan(revisionId: string) {
    return http.post<{ published: boolean }>(`/admin/subscriptions/plans/${revisionId}/publish`);
}
export async function getAdminSubscriptionMetrics() {
    return http.get<Record<string, number>>("/admin/subscriptions/metrics");
}
export async function listAdminSubscriptionPayments() {
    return http.get<{ payments: Array<Record<string, unknown>> }>("/admin/subscriptions/payments");
}
export async function listAdminUserSubscriptions() {
    return http.get<{ subscriptions: Array<Record<string, unknown>> }>("/admin/subscriptions/users");
}
export async function createAdminSubscriptionFAQ(payload: Record<string, unknown>) {
    return http.post<{ faq: Record<string, unknown> }>("/admin/subscriptions/faqs", payload);
}
