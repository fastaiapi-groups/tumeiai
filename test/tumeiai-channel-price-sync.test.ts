import { afterEach, describe, expect, test } from "bun:test";

import {
    defaultPriceSyncCreateSelection,
    defaultPriceSyncSelection,
    filterPriceSyncPlans,
    loadPriceSyncSettings,
    priceChangeText,
    priceSyncApplyCreates,
    priceSyncApplyModels,
    priceSyncGroupText,
    priceSyncRequest,
    priceSyncSelectionCounts,
    savePriceSyncSettings,
} from "../src/pages/admin/components/tumeiai-channel-price-sync";
import type { ChannelPriceSyncModelPlan, ChannelPriceSyncPreview } from "../src/services/api/tumeiai-channel-price-sync";

const plan = (modelId: string, action: ChannelPriceSyncModelPlan["action"], status: ChannelPriceSyncModelPlan["status"], planHash = action === "none" ? undefined : `hash-${modelId}`): ChannelPriceSyncModelPlan => ({
    modelId,
    modelKey: modelId,
    displayName: modelId,
    providerModelKey: modelId,
    capability: "video",
    enabled: true,
    priceCurrency: "CNY",
    priceVersion: 1,
    action,
    status,
    markupPercent: 0,
    notes: [],
    upstreamOnlyTiers: [],
    tiers: [],
    planHash,
});

const preview = {
    models: [plan("h3", "update", "partial"), plan("gone", "disable", "missing"), plan("same", "none", "unchanged"), plan("broken", "none", "error")],
} as ChannelPriceSyncPreview;

const memory = new Map<string, string>();
const storage = { getItem: (key: string) => memory.get(key) ?? null, setItem: (key: string, value: string) => void memory.set(key, value) };

afterEach(() => {
    memory.clear();
    Reflect.deleteProperty(globalThis, "localStorage");
});

describe("一键同步价格", () => {
    test("新建计划只提交可新建的型号，分组来源有明确提示", () => {
        const withCreates = {
            ...preview,
            creates: [
                { modelKey: "claude-sonnet-5-5", displayName: "claude-sonnet-5-5", capability: "text", protocol: "chat-completion", billingMode: "token", status: "ready", notes: [], fields: [], planHash: "c1" },
                { modelKey: "seedance2.5-pro", displayName: "seedance2.5-pro", capability: "video", protocol: "", billingMode: "", status: "skipped", reason: "视频型号需要选择视频协议与规格，请手动接入", notes: [], fields: [] },
            ],
        } as ChannelPriceSyncPreview;
        expect(defaultPriceSyncCreateSelection(withCreates)).toEqual(["claude-sonnet-5-5"]);
        expect(priceSyncApplyCreates(withCreates, ["claude-sonnet-5-5", "seedance2.5-pro"])).toEqual([{ modelId: "claude-sonnet-5-5", planHash: "c1" }]);
        expect(priceSyncGroupText({ upstreamGroup: "香蕉分组", groupRatio: 0.05, groupSource: "detected" })).toBe("香蕉分组（×0.05） · 按渠道 Key 自动识别");
        expect(priceSyncGroupText({ upstreamGroup: "default", groupRatio: 1, groupSource: "default", groupNote: "渠道未配置 API Key，无法识别上游分组" })).toContain("未能识别 Key 分组");
    });

    test("默认勾选全部可写入的模型，提交时只带 planHash", () => {
        const selected = defaultPriceSyncSelection(preview);
        expect(selected).toEqual(["h3", "gone"]);
        expect(priceSyncSelectionCounts(preview, selected)).toEqual({ update: 1, disable: 1, total: 2 });
        // 无变化的模型即使被选中也不会提交。
        expect(priceSyncApplyModels(preview, ["h3", "same"])).toEqual([{ modelId: "h3", planHash: "hash-h3" }]);
    });

    test("筛选需关注的模型包括部分失败、失败和上游缺失", () => {
        expect(filterPriceSyncPlans(preview.models, "problem").map((item) => item.modelId)).toEqual(["h3", "gone", "broken"]);
        expect(filterPriceSyncPlans(preview.models, "actionable").map((item) => item.modelId)).toEqual(["h3", "gone"]);
    });

    test("请求载荷省略空设置并丢弃已不存在模型的加价率覆盖", () => {
        expect(priceSyncRequest({ markupPercent: 50, disableMissing: true, upstreamGroup: " ", pricingUrl: "", upstreamUnitYuan: 1, modelMarkups: { h3: 0, deleted: 20 } }, ["h3"])).toEqual({
            markupPercent: 50,
            disableMissing: true,
            modelMarkups: { h3: 0 },
        });
        expect(priceSyncRequest({ markupPercent: 0, disableMissing: false, upstreamGroup: "低价视频", pricingUrl: "https://x.test/api/pricing", upstreamUnitYuan: 7.2 })).toEqual({
            markupPercent: 0,
            disableMissing: false,
            modelMarkups: {},
            upstreamGroup: "低价视频",
            pricingUrl: "https://x.test/api/pricing",
            upstreamUnitYuan: 7.2,
        });
    });

    test("涨跌幅文本", () => {
        expect(priceChangeText(20_000, 30_000)).toBe("↑50%");
        expect(priceChangeText(2_000_000, 30_000)).toBe("↓98.5%");
        expect(priceChangeText(0, 30_000)).toBe("新增");
        expect(priceChangeText(5, 5)).toBe("持平");
    });

    test("设置按渠道记忆，「上游没有的模型自动禁用」默认勾选，存储不可用时回到默认值", () => {
        expect(loadPriceSyncSettings("c1").disableMissing).toBe(true);
        Object.defineProperty(globalThis, "localStorage", { value: storage, configurable: true });
        savePriceSyncSettings("c1", { markupPercent: 30, disableMissing: false, upstreamGroup: "default", modelMarkups: { h3: 10 } });
        expect(loadPriceSyncSettings("c1")).toMatchObject({ markupPercent: 30, disableMissing: false, upstreamGroup: "default", modelMarkups: { h3: 10 } });
        expect(loadPriceSyncSettings("c2")).toMatchObject({ markupPercent: 0, disableMissing: true });
        memory.set("tumeiai:channel-price-sync:c3", "{broken");
        expect(loadPriceSyncSettings("c3").disableMissing).toBe(true);
    });
});
