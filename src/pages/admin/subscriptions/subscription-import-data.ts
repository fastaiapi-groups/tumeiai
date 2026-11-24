import type { AdminSubscriptionPlanRecord } from "@/services/api/subscriptions";
import { latestPlans, planBundle, validatePlanPayload, type EditorRow } from "./subscription-admin-data";

export type CatalogImport = { version: 1; source?: string; plans?: EditorRow[]; comparisons?: EditorRow[]; faqs?: EditorRow[] };
export function parseCatalogImport(text: string): CatalogImport {
    const data = JSON.parse(text);
    if (data?.version !== 1 || !["plans", "comparisons", "faqs"].some((k) => Array.isArray(data[k]) && data[k].length)) throw Error("请使用 version 为 1 的目录配置，至少包含一条数据");
    for (const key of ["plans", "comparisons", "faqs"]) {
        if (data[key] !== undefined && !Array.isArray(data[key])) throw Error(key + " 必须为数组");
        const codes = new Set();
        for (const item of data[key] || []) {
            const code = key === "comparisons" ? item.set?.code : key === "faqs" ? item.faqCode : item.code;
            if (!code || codes.has(code)) throw Error("编码缺失或重复：" + key);
            codes.add(code);
        }
    }
    return data;
}
export function prepareImportPlans(data: CatalogImport, existing: AdminSubscriptionPlanRecord[]) {
    const latest = latestPlans(existing);
    return (data.plans || []).map((patch) => {
        const record = latest.find((p) => p.plan.code === patch.code);
        const payload = { ...(record ? planBundle(record) : {}), ...patch };
        validatePlanPayload(payload);
        return { record, payload };
    });
}
