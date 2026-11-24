import { describe, expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import type { CreditLedgerEntry } from "@/services/api/wallet";
import { SubscriptionLedgerDetail } from "@/components/layout/subscription-ledger-detail";
import { AdminSubscriptionLedgerDetail } from "@/pages/admin/components/admin-subscription-ledger-detail";

const entry: CreditLedgerEntry = {
    id: "ledger",
    userId: "user",
    type: "consume",
    amountMicrocredits: -8_000_000,
    availableAfterMicrocredits: 92_000_000,
    reservedAfterMicrocredits: 0,
    createdAt: "2026-10-17T00:00:00Z",
    subscriptionDetail: { subscriptionMicrocredits: 5_000_000, ordinaryMicrocredits: 3_000_000, expiredMicrocredits: 0, freeQuantity: 0, benefitDiscountBasisPoints: 2000, benefitRuleId: "purchased-rule" },
};

describe("subscription ledger presentation", () => {
    test("renders credits and discounts in Chinese", () => {
        const html = renderToStaticMarkup(<SubscriptionLedgerDetail entry={entry} />);
        expect(html).toContain("订阅额度 5");
        expect(html).toContain("普通积分 3");
        expect(html).toContain("20%");
        expect(html).toContain("purchased-rule");
        expect(html).not.toContain("5000000");
    });
    test("distinguishes returned free use and historical estimates", () => {
        const refunded = { ...entry, type: "refund" as const, subscriptionDetail: { ...entry.subscriptionDetail!, freeQuantity: 1, usageStatus: "refunded", reconstructed: true } };
        const html = renderToStaticMarkup(<SubscriptionLedgerDetail entry={refunded} />);
        expect(html).toContain("已退回");
        expect(html).toContain("历史明细推算");
        const admin = renderToStaticMarkup(<AdminSubscriptionLedgerDetail entry={refunded} />);
        expect(admin).toContain("已退回");
        expect(admin).toContain("历史明细推算");
    });
});
