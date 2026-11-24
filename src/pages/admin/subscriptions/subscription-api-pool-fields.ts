import type { Section } from "./subscription-plan-fields";

export const subscriptionAPIPoolSection: Section = {
    key: "apiPools",
    title: "API 额度池",
    defaults: { poolCode: "website", channel: "api", includedMicrocredits: 0, deliveryMode: "cycle", expiryMode: "cycle_end", allowTopupFallback: true, enabled: true },
    fields: [
        { key: "poolCode", label: "来源额度池（须与积分发放规则一致）", required: true },
        { key: "includedMicrocredits", label: "每订阅周期最多用于 API 的积分", type: "number" },
        { key: "allowTopupFallback", label: "用完后允许扣普通积分", type: "boolean" },
        { key: "enabled", label: "启用（同时需启用 api_access 权益）", type: "boolean" },
    ],
};
