import { UI_TEXT } from "@/lib/ui-text";

import type { CreditLedgerEntry } from "@/services/api/wallet";

export function SubscriptionLedgerDetail({ entry }: { entry: CreditLedgerEntry }) {
    const { locale } = UI_TEXT;
    const detail = entry.subscriptionDetail;
    if (!detail) return null;
    const labels = locale.startsWith("zh")
        ? ["订阅额度", "普通积分", "到期失效", "免费次数", "优惠", "规则"]
        : locale.startsWith("ja")
          ? ["サブスクリプション", "通常クレジット", "失効", "無料回数", "割引", "ルール"]
          : locale.startsWith("ko")
            ? ["구독 크레딧", "일반 크레딧", "만료", "무료 횟수", "할인", "규칙"]
            : ["Subscription credits", "Regular credits", "Expired", "Free uses", "Discount", "Rule"];
    const format = (value: number) => (value / 1_000_000).toLocaleString(locale, { maximumFractionDigits: 6 });
    const parts = [`${labels[0]} ${format(detail.subscriptionMicrocredits)}`, `${labels[1]} ${format(detail.ordinaryMicrocredits)}`];
    if (detail.expiredMicrocredits) parts.push(`${labels[2]} ${format(detail.expiredMicrocredits)}`);
    if (detail.freeQuantity) parts.push(`${labels[3]} ${detail.freeQuantity}`);
    if (detail.freeQuantity && detail.usageStatus === "refunded") parts.push(locale.startsWith("zh") ? "已退回" : locale.startsWith("ja") ? "返却済み" : locale.startsWith("ko") ? "반환됨" : "Returned");
    if (detail.benefitDiscountBasisPoints) parts.push(`${labels[4]} ${detail.benefitDiscountBasisPoints / 100}%`);
    if (detail.reconstructed) parts.push(locale.startsWith("zh") ? "历史明细推算" : locale.startsWith("ja") ? "過去の推定内訳" : locale.startsWith("ko") ? "과거 내역 추정" : "Historical estimate");
    return <span title={detail.benefitRuleId ? `${labels[5]}: ${detail.benefitRuleId}` : undefined}>{parts.join(" · ")}</span>;
}
