// tumeiai: 一键同步价格弹窗的纯函数（选择、提交载荷、涨跌幅、设置记忆），可独立测试。
import type { AdminStatusTone } from "./admin-ui";
import type { ChannelPriceSyncCreatePlan, ChannelPriceSyncModelPlan, ChannelPriceSyncPreview, ChannelPriceSyncSettings } from "@/services/api/tumeiai-channel-price-sync";

export const defaultPriceSyncSettings: ChannelPriceSyncSettings = { markupPercent: 0, disableMissing: true, upstreamGroup: "", pricingUrl: "", upstreamUnitYuan: 1 };

const storageKey = (channelId: string) => `tumeiai:channel-price-sync:${channelId}`;

/** 读取上次在该渠道使用的同步设置；浏览器存储不可用时回到默认值。 */
export function loadPriceSyncSettings(channelId: string): ChannelPriceSyncSettings {
    try {
        const raw = globalThis.localStorage?.getItem(storageKey(channelId));
        if (!raw) return { ...defaultPriceSyncSettings };
        const parsed = JSON.parse(raw) as Partial<ChannelPriceSyncSettings>;
        const markups: Record<string, number> = {};
        for (const [id, value] of Object.entries(parsed.modelMarkups ?? {})) {
            if (typeof value === "number" && Number.isFinite(value)) markups[id] = value;
        }
        return {
            markupPercent: typeof parsed.markupPercent === "number" && Number.isFinite(parsed.markupPercent) ? parsed.markupPercent : 0,
            disableMissing: parsed.disableMissing !== false,
            upstreamGroup: typeof parsed.upstreamGroup === "string" ? parsed.upstreamGroup : "",
            pricingUrl: typeof parsed.pricingUrl === "string" ? parsed.pricingUrl : "",
            upstreamUnitYuan: typeof parsed.upstreamUnitYuan === "number" && parsed.upstreamUnitYuan > 0 ? parsed.upstreamUnitYuan : 1,
            modelMarkups: markups,
        };
    } catch {
        return { ...defaultPriceSyncSettings };
    }
}

export function savePriceSyncSettings(channelId: string, settings: ChannelPriceSyncSettings) {
    try {
        globalThis.localStorage?.setItem(storageKey(channelId), JSON.stringify(settings));
    } catch {
        /* 仅是界面便利，存储失败不影响同步。 */
    }
}

/** 发给后端的设置：空字符串不发送，加价率覆盖只保留当前渠道仍存在的模型。 */
export function priceSyncRequest(settings: ChannelPriceSyncSettings, modelIds?: string[]): ChannelPriceSyncSettings {
    const known = modelIds ? new Set(modelIds) : null;
    const modelMarkups: Record<string, number> = {};
    for (const [id, value] of Object.entries(settings.modelMarkups ?? {})) {
        if (!known || known.has(id)) modelMarkups[id] = value;
    }
    return {
        markupPercent: settings.markupPercent,
        disableMissing: settings.disableMissing,
        modelMarkups,
        ...(settings.upstreamGroup?.trim() ? { upstreamGroup: settings.upstreamGroup.trim() } : {}),
        ...(settings.pricingUrl?.trim() ? { pricingUrl: settings.pricingUrl.trim() } : {}),
        ...(settings.upstreamUnitYuan && settings.upstreamUnitYuan !== 1 ? { upstreamUnitYuan: settings.upstreamUnitYuan } : {}),
    };
}

export const isActionable = (plan: ChannelPriceSyncModelPlan) => plan.action !== "none" && Boolean(plan.planHash);

/** 默认勾选全部可写入的模型。 */
export function defaultPriceSyncSelection(preview: ChannelPriceSyncPreview) {
    return preview.models.filter(isActionable).map((plan) => plan.modelId);
}

export function priceSyncApplyModels(preview: ChannelPriceSyncPreview, selected: string[]) {
    const chosen = new Set(selected);
    return preview.models.filter((plan) => chosen.has(plan.modelId) && isActionable(plan)).map((plan) => ({ modelId: plan.modelId, planHash: plan.planHash as string }));
}

const isCreatable = (plan: ChannelPriceSyncCreatePlan) => plan.status === "ready" && Boolean(plan.planHash);

/** 默认勾选全部能按上游规格新建的型号。 */
export function defaultPriceSyncCreateSelection(preview: ChannelPriceSyncPreview) {
    return (preview.creates ?? []).filter(isCreatable).map((plan) => plan.modelKey);
}

export function priceSyncApplyCreates(preview: ChannelPriceSyncPreview, selected: string[]) {
    const chosen = new Set(selected);
    return (preview.creates ?? []).filter((plan) => chosen.has(plan.modelKey) && isCreatable(plan)).map((plan) => ({ modelId: plan.modelKey, planHash: plan.planHash as string }));
}

/** 上游分组来源说明：自动识别的分组决定成本倍率，识别失败时必须提醒管理员。 */
export function priceSyncGroupText(preview: Pick<ChannelPriceSyncPreview, "upstreamGroup" | "groupRatio" | "groupSource" | "groupNote">) {
    const base = `${preview.upstreamGroup}（×${preview.groupRatio}）`;
    if (preview.groupSource === "detected") return `${base} · 按渠道 Key 自动识别`;
    if (preview.groupSource === "default") return `${base} · 未能识别 Key 分组：${preview.groupNote ?? "原因未知"}`;
    return `${base} · 手动指定`;
}

export function priceSyncSelectionCounts(preview: ChannelPriceSyncPreview, selected: string[]) {
    const chosen = new Set(selected);
    let update = 0;
    let disable = 0;
    for (const plan of preview.models) {
        if (!chosen.has(plan.modelId) || !isActionable(plan)) continue;
        if (plan.action === "update") update++;
        else disable++;
    }
    return { update, disable, total: update + disable };
}

/** 涨跌幅文本；旧值为 0 时无法计算比例。 */
export function priceChangeText(oldValue: number, newValue: number) {
    if (oldValue === newValue) return "持平";
    if (oldValue <= 0) return "新增";
    const percent = ((newValue - oldValue) * 100) / oldValue;
    const text = Math.abs(percent).toLocaleString("zh-CN", { maximumFractionDigits: 2 });
    return percent > 0 ? `↑${text}%` : `↓${text}%`;
}

export function priceChangeTone(oldValue: number, newValue: number): AdminStatusTone {
    if (oldValue === newValue) return "neutral";
    return newValue > oldValue ? "warning" : "success";
}

export const priceSyncStatusMeta: Record<ChannelPriceSyncModelPlan["status"], { label: string; tone: AdminStatusTone }> = {
    changed: { label: "价格有变化", tone: "info" },
    partial: { label: "部分规格无法同步", tone: "warning" },
    unchanged: { label: "无变化", tone: "neutral" },
    missing: { label: "上游已无该型号", tone: "error" },
    skipped: { label: "跳过", tone: "neutral" },
    error: { label: "无法同步", tone: "error" },
};

export function priceSyncCurrencyUnit(currency: string) {
    if (currency === "CNY") return "元";
    if (currency === "USD") return "美元";
    return "积分";
}

export type PriceSyncFilter = "all" | "actionable" | "problem";

export function filterPriceSyncPlans(plans: ChannelPriceSyncModelPlan[], filter: PriceSyncFilter) {
    if (filter === "actionable") return plans.filter(isActionable);
    if (filter === "problem") return plans.filter((plan) => plan.status === "partial" || plan.status === "error" || plan.status === "missing");
    return plans;
}
