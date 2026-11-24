import type { CreditLedgerEntry } from "@/services/api/wallet";

export function AdminSubscriptionLedgerDetail({ entry }: { entry: CreditLedgerEntry }) {
    const detail = entry.subscriptionDetail;
    if (!detail) return <>{entry.note || "—"}</>;
    const format = (amount: number) => (amount / 1_000_000).toLocaleString("zh-CN", { maximumFractionDigits: 6 });
    return (
        <div>
            <div>{entry.note}</div>
            <div>
                订阅 {format(detail.subscriptionMicrocredits)} · 普通 {format(detail.ordinaryMicrocredits)}
                {detail.expiredMicrocredits > 0 && ` · 失效 ${format(detail.expiredMicrocredits)}`}
            </div>
            {detail.freeQuantity > 0 && (
                <div>
                    免费次数 {detail.freeQuantity} · {detail.usageStatus === "refunded" ? "已退回" : detail.usageStatus === "consumed" ? "已使用" : "已预占"}
                </div>
            )}
            {!!detail.benefitDiscountBasisPoints && <div>减免 {detail.benefitDiscountBasisPoints / 100}%</div>}
            {detail.benefitRuleId && <small>规则：{detail.benefitRuleId}</small>}
            {detail.reconstructed && <div>历史明细推算</div>}
        </div>
    );
}
