// tumeiai: 渠道一键同步价格。后端从上游 new-api 的 /api/pricing 读取成本，按加价率重算售价。
import { http } from "@/services/api/request";

export type ChannelPriceSyncSettings = {
    /** 为空时后端按渠道 Base URL 推导为 {scheme}://{host}/api/pricing。 */
    pricingUrl?: string;
    upstreamGroup?: string;
    /** 上游 1 个计价单位折合多少元，默认 1。 */
    upstreamUnitYuan?: number;
    markupPercent: number;
    /** 按渠道模型 ID 覆盖加价率（百分比）。 */
    modelMarkups?: Record<string, number>;
    disableMissing: boolean;
};

export type ChannelPriceSyncFieldPlan = {
    key: "unit" | "input" | "output" | "cached" | "cacheWrite" | "referenceVideoUnit" | "referenceVideoOutput";
    label: string;
    oldCost: number;
    newCost: number;
    oldSale: number;
    newSale: number;
    legacyCost: boolean;
};

export type ChannelPriceSyncTierPlan = {
    tierId: string;
    label: string;
    resolution: string;
    videoSeconds: number;
    billingMode: string;
    priceVersion: number;
    status: "changed" | "unchanged" | "error" | "skipped";
    reason?: string;
    upstreamTier?: string;
    fields: ChannelPriceSyncFieldPlan[];
};

export type ChannelPriceSyncModelPlan = {
    modelId: string;
    modelKey: string;
    displayName: string;
    providerModelKey: string;
    capability: string;
    enabled: boolean;
    priceCurrency: string;
    priceVersion: number;
    action: "update" | "disable" | "none";
    status: "changed" | "partial" | "unchanged" | "missing" | "skipped" | "error";
    markupPercent: number;
    currentMarkupPercent?: number;
    reason?: string;
    notes: string[];
    upstreamOnlyTiers: string[];
    tiers: ChannelPriceSyncTierPlan[];
    planHash?: string;
};

/** 上游有、本渠道没有的型号按上游规格新建的计划；status=skipped 时见 reason。 */
export type ChannelPriceSyncCreatePlan = {
    modelKey: string;
    /** 非空表示补全同名“未分类”占位模型。 */
    existingModelId?: string;
    displayName: string;
    capability: string;
    protocol: string;
    billingMode: string;
    status: "ready" | "skipped";
    reason?: string;
    notes: string[];
    fields: ChannelPriceSyncFieldPlan[];
    planHash?: string;
};

export type ChannelPriceSyncPreview = {
    channelId: string;
    channelName: string;
    pricingUrl: string;
    upstreamVersion?: string;
    upstreamGroup: string;
    /** manual 手动指定；detected 按渠道 Key 识别；default 识别失败退回 default（见 groupNote）。 */
    groupSource: "manual" | "detected" | "default";
    groupNote?: string;
    groupRatio: number;
    groups: { name: string; ratio: number }[];
    upstreamUnitYuan: number;
    markupPercent: number;
    disableMissing: boolean;
    models: ChannelPriceSyncModelPlan[];
    upstreamOnly: string[];
    creates: ChannelPriceSyncCreatePlan[];
    summary: { create: number; update: number; disable: number; unchanged: number; missing: number; skipped: number; failed: number };
    fetchedAt: string;
};

export type ChannelPriceSyncResult = { created: number; updated: number; disabled: number; preview?: ChannelPriceSyncPreview };

type ApplyChoice = { modelId: string; planHash: string };

export function previewChannelPriceSync(channelId: string, settings: ChannelPriceSyncSettings, signal?: AbortSignal) {
    return http.post<ChannelPriceSyncPreview>(`/admin/channels/${encodeURIComponent(channelId)}/price-sync/preview`, settings, { signal, timeout: 60_000 });
}

export function applyChannelPriceSync(channelId: string, settings: ChannelPriceSyncSettings, models: ApplyChoice[], creates: ApplyChoice[] = []) {
    return http.post<ChannelPriceSyncResult>(`/admin/channels/${encodeURIComponent(channelId)}/price-sync/apply`, { ...settings, models, creates }, { timeout: 120_000 });
}

/** 渠道价格自动同步：后台按间隔执行改价、新建上游新型号、禁用上游已下架型号。 */
export type ChannelPriceAutoSync = {
    channelId: string;
    enabled: boolean;
    /** 为空表示按渠道 Key 自动识别上游分组。 */
    upstreamGroup: string;
    markupPercent: number;
    intervalMinutes: number;
    createMissing: boolean;
    disableMissing: boolean;
    lastRunAt?: string | null;
    lastStatus: "" | "ok" | "error";
    lastMessage?: string;
    lastDetectedGroup?: string;
    /** 未保存过设置时后端返回零值时间。 */
    createdAt?: string;
};

export type ChannelPriceAutoSyncInput = Pick<ChannelPriceAutoSync, "enabled" | "upstreamGroup" | "markupPercent" | "intervalMinutes" | "createMissing" | "disableMissing">;

const autoSyncPath = (channelId: string) => `/admin/channels/${encodeURIComponent(channelId)}/price-sync/auto`;

export function getChannelPriceAutoSync(channelId: string, signal?: AbortSignal) {
    return http.get<ChannelPriceAutoSync>(autoSyncPath(channelId), { signal });
}

export function saveChannelPriceAutoSync(channelId: string, input: ChannelPriceAutoSyncInput) {
    return http.put<ChannelPriceAutoSync>(autoSyncPath(channelId), input);
}

export function runChannelPriceAutoSync(channelId: string) {
    return http.post<ChannelPriceAutoSync>(`${autoSyncPath(channelId)}/run`, {}, { timeout: 150_000 });
}
