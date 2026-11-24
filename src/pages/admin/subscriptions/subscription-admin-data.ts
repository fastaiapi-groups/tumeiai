import type { AdminSubscriptionPlanRecord, SubscriptionPriceComparison } from "@/services/api/subscriptions";

export type EditorRow = Record<string, any>;
export const localeOptions = [{ value: "zh-CN", label: "中文" }];
export const fieldLabels: Record<string, string> = {
    month: "月付",
    year: "年付",
    manual: "单次支付",
    recurring: "自动续费",
    monthly: "每月发放",
    upfront: "一次发完",
    cycle: "每周期",
    cycle_end: "周期结束",
    period_end: "当期结束",
    fixed_days: "固定天数",
    linear: "按倍数计价",
    fixed: "固定价格",
    website: "站内",
    api: "API",
    mcp: "MCP",
    bool: "开关",
    int: "数字",
    text: "文本",
    free: "免费",
    unlimited: "无限",
    credits: "按积分",
    discount: "折扣扣费",
    web: "站内",
    image: "图片",
    video: "视频",
    audio: "音频",
    concurrent: "同时进行",
    day: "每日",
    period: "每周期",
    user: "用户",
    team: "团队",
};
const basisFields = ["minMultiplierBasisPoints", "maxMultiplierBasisPoints", "multiplierStepBasisPoints"];
export function latestPlans(plans: AdminSubscriptionPlanRecord[]) {
    const result = new Map<string, AdminSubscriptionPlanRecord>();
    for (const plan of plans) if (!result.has(plan.plan.code) || result.get(plan.plan.code)!.revision.versionNo < plan.revision.versionNo) result.set(plan.plan.code, plan);
    return [...result.values()];
}
export function planBundle(record: AdminSubscriptionPlanRecord): EditorRow {
    const metadata = record.revision.catalogJson ? JSON.parse(record.revision.catalogJson) : record.plan;
    return structuredClone({ ...record, ...metadata });
}
export function editorValues(record?: AdminSubscriptionPlanRecord): EditorRow {
    const value = record
        ? planBundle(record)
        : {
              code: "",
              audience: "individual",
              defaultLocale: "zh-CN",
              sortOrder: 10,
              featured: false,
              localizations: localeOptions.map(({ value: locale }) => ({ locale, name: "", tagline: "" })),
              prices: [
                  {
                      id: crypto.randomUUID(),
                      billingInterval: "month",
                      intervalCount: 1,
                      billingMethod: "manual",
                      currency: "USD",
                      amountMinor: 2400,
                      listAmountMinor: 3600,
                      minMultiplierBasisPoints: 10000,
                      maxMultiplierBasisPoints: 50000,
                      multiplierStepBasisPoints: 10000,
                      multiplierPriceMode: "linear",
                      creditDeliveryMode: "monthly",
                      enabled: true,
                  },
              ],
              features: [],
              featureLocales: [],
              creditRules: [],
              modelRules: [],
              limitRules: [],
              apiPools: [],
              modelQuotes: [],
          };
    return {
        ...value,
        defaultLocale: "zh-CN",
        prices: value.prices.map((p: EditorRow) => ({ ...p, amountMinor: p.amountMinor / 100, listAmountMinor: p.listAmountMinor / 100, ...Object.fromEntries(basisFields.map((key) => [key, p[key] / 10000])) })),
        creditRules: value.creditRules.map((r: EditorRow) => ({ ...r, amountMicrocredits: r.amountMicrocredits / 1e6 })),
        apiPools: (value.apiPools || []).map((r: EditorRow) => ({ ...r, includedMicrocredits: r.includedMicrocredits / 1e6 })),
    };
}
export function editorPayload(value: EditorRow): EditorRow {
    const payload = {
        ...value,
        defaultLocale: "zh-CN",
        prices: value.prices.map((p: EditorRow) => ({
            ...p,
            amountMinor: Math.round(Number(p.amountMinor) * 100),
            listAmountMinor: Math.round(Number(p.listAmountMinor || 0) * 100),
            ...Object.fromEntries(basisFields.map((key) => [key, Math.round(Number(p[key]) * 10000)])),
        })),
        creditRules: value.creditRules.map((r: EditorRow) => ({ ...r, amountMicrocredits: Math.round(Number(r.amountMicrocredits) * 1e6) })),
        apiPools: (value.apiPools || []).map((r: EditorRow) => ({ ...r, includedMicrocredits: Math.round(Number(r.includedMicrocredits) * 1e6) })),
    };
    validatePlanPayload(payload);
    return payload;
}
export function validatePlanPayload(value: EditorRow) {
    if (!/^[a-z0-9_-]{1,64}$/.test(value.code || "")) throw Error("请填写套餐编码（小写字母、数字或横线）");
    if (!Array.isArray(value.prices) || !value.prices.length) throw Error("请至少配置一个价格");
    const ids = new Set(value.prices.map((p: EditorRow) => p.id));
    for (const p of value.prices) {
        if (!Number.isSafeInteger(p.amountMinor) || p.amountMinor <= 0 || !/^[A-Z]{3}$/.test(p.currency)) throw Error("售价必须大于 0，币种须为三位大写编码");
        if (p.minMultiplierBasisPoints < 10000 || p.maxMultiplierBasisPoints < p.minMultiplierBasisPoints || p.multiplierStepBasisPoints <= 0) throw Error("请检查购买倍率范围");
    }
    for (const r of value.creditRules || []) {
        if (!Number.isSafeInteger(r.amountMicrocredits) || r.amountMicrocredits < 0) throw Error("发放积分无效");
        if (r.priceId && !ids.has(r.priceId)) throw Error("额度关联的价格已移除，请重新选择");
    }
    if (!value.localizations?.some((l: EditorRow) => l.locale === value.defaultLocale && l.name?.trim())) throw Error("请填写默认语言的套餐名称");
}
export function comparisonPayload(value: SubscriptionPriceComparison | EditorRow) {
    const { columns, ...set } = value;
    return { set, columns: columns.map(({ rows, ...column }: EditorRow) => column), rows: columns.flatMap((column: EditorRow) => (column.rows || []).map((row: EditorRow) => ({ ...row, columnCode: column.code }))) };
}
export function downloadCatalog(value: unknown) {
    const url = URL.createObjectURL(new Blob([JSON.stringify(value, null, 2)], { type: "application/json" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = "subscription-catalog.json";
    link.click();
    URL.revokeObjectURL(url);
}
