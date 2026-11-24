import { UI_TEXT } from "@/lib/ui-text";
import { Button, InputNumber, Select } from "antd";
import { ArrowRight, ShieldCheck } from "lucide-react";
import { AppModal } from "@/components/ui/product/app-modal";

import type { SubscriptionPrice } from "@/services/api/subscriptions";
import type { PaymentProvider } from "@/services/api/payments";
import "./subscription-checkout-dialog.css";

const copy = {
    "zh-CN": {
        title: "确认你的订阅",
        review: "订单确认",
        payment: "安全付款",
        today: "本次应付",
        monthly: "按月付费",
        yearly: "按年付费",
        credits: "套餐积分",
        multiplier: "积分倍率",
        provider: "付款渠道",
        next: "继续付款",
        cancel: "返回套餐",
        recurring: "订阅将按所选周期以此金额自动续费。可在「我的订阅」中取消续费。",
        manual: "本次为一次性付款，不会自动续费。",
        secure: "付款信息由 Stripe 安全处理",
    },
};

export type CheckoutSummary = { name: string; tagline?: string; price: SubscriptionPrice; amount: number; credits: number };
export function SubscriptionOrderSummary({ summary, compact = false }: { summary: CheckoutSummary; compact?: boolean }) {
    const { locale } = UI_TEXT;
    const t = copy[locale];
    const amount = new Intl.NumberFormat(locale, { style: "currency", currency: summary.price.currency }).format(summary.amount / 100);
    return (
        <section className="subscription-order-summary">
            <span className="subscription-order-eyebrow">{t.review}</span>
            <h3>{summary.name}</h3>
            {!compact && summary.tagline && <p>{summary.tagline}</p>}
            {!compact && (
                <dl>
                    <div>
                        <dt>{summary.price.billingInterval === "year" ? t.yearly : t.monthly}</dt>
                        <dd>{amount}</dd>
                    </div>
                    <div>
                        <dt>{t.credits}</dt>
                        <dd>{summary.credits.toLocaleString(locale)}</dd>
                    </div>
                </dl>
            )}
            <div className="subscription-order-total">
                <span>{t.today}</span>
                <strong>
                    {amount} <small>{summary.price.currency}</small>
                </strong>
            </div>
            <p className="subscription-order-terms">{summary.price.billingMethod === "recurring" ? t.recurring : t.manual}</p>
        </section>
    );
}

export function SubscriptionCheckoutDialog({
    open,
    summary,
    multiplier,
    onMultiplierChange,
    providers,
    providerId,
    onProviderChange,
    busy,
    onClose,
    onContinue,
}: {
    open: boolean;
    summary?: CheckoutSummary;
    multiplier: number;
    onMultiplierChange: (value: number) => void;
    providers: PaymentProvider[];
    providerId: string;
    onProviderChange: (value: string) => void;
    busy: boolean;
    onClose: () => void;
    onContinue: () => void;
}) {
    const { locale, t: tr } = UI_TEXT;
    const t = copy[locale];
    return (
        <AppModal open={open} title={t.title} footer={null} onCancel={busy ? undefined : onClose} closable={!busy} maskClosable={!busy} width={560}>
            {summary && (
                <div className="subscription-checkout-shell">
                    <SubscriptionOrderSummary summary={summary} />
                    {summary.price.maxMultiplierBasisPoints > summary.price.minMultiplierBasisPoints && (
                        <label className="subscription-order-control">
                            {t.multiplier}
                            <InputNumber
                                min={(summary.price.minMultiplierBasisPoints || 10000) / 10000}
                                max={summary.price.maxMultiplierBasisPoints / 10000}
                                step={(summary.price.multiplierStepBasisPoints || 10000) / 10000}
                                value={multiplier / 10000}
                                disabled={busy}
                                onChange={(value) => value != null && onMultiplierChange(Math.round(value * 10000))}
                            />
                        </label>
                    )}
                    {providers.length > 1 && (
                        <label className="subscription-order-control">
                            {t.provider}
                            <Select value={providerId} disabled={busy} onChange={onProviderChange} options={providers.map((provider) => ({ value: provider.id, label: tr(provider.name) }))} />
                        </label>
                    )}
                    <Button type="primary" size="large" block loading={busy} disabled={!providerId} onClick={onContinue}>
                        {t.next}
                        <ArrowRight size={16} />
                    </Button>
                    <Button type="text" block disabled={busy} onClick={onClose}>
                        {t.cancel}
                    </Button>
                    {providerId === "moresia-stripe" && (
                        <p className="subscription-order-security">
                            <ShieldCheck size={15} />
                            {t.secure}
                        </p>
                    )}
                </div>
            )}
        </AppModal>
    );
}
