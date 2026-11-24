import { UI_TEXT } from "@/lib/ui-text";

import { formatTopupMoney, topupSupportsMethod } from "@/lib/topup-currency";
import { paymentOrderGrantLabel } from "@/lib/payment-order-grant";
import { Button } from "antd";
import { ArrowLeft, ArrowRight, Apple, CreditCard, LoaderCircle, Smartphone, WalletCards } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { AppModal } from "@/components/ui/product/app-modal";
import { formatCredits } from "@/constant/credits";
import type { MoresiaPaymentType, PaymentOrder, TopupProduct } from "@/services/api/payments";

import "./moresia-payment-dialog.css";
import { MoresiaClosedOrder } from "./moresia-closed-order";

const METHODS: Array<{ value: MoresiaPaymentType; label: string; detail: string; icon: typeof CreditCard }> = [
    { value: "card", label: "银行卡", detail: "Visa、Mastercard 等", icon: CreditCard },
    { value: "cashapp", label: "Cash App", detail: "使用 Cash App 支付", icon: WalletCards },
    { value: "google_pay", label: "Google Pay", detail: "使用 Google Pay 支付", icon: Smartphone },
    { value: "apple_pay", label: "Apple Pay", detail: "使用 Apple Pay 支付", icon: Apple },
];

export function MoresiaPaymentDialog({
    open,
    product,
    order,
    creating = false,
    querying = false,
    onClose,
    onCreate,
    onRetry,
}: {
    open: boolean;
    product?: TopupProduct;
    order: PaymentOrder | null;
    creating?: boolean;
    querying?: boolean;
    onClose: () => void;
    onCreate: (paymentType: MoresiaPaymentType) => Promise<void>;
    onRetry: () => Promise<void>;
}) {
    const { locale, t } = UI_TEXT;
    const [method, setMethod] = useState<MoresiaPaymentType>("card");
    const [frameLoaded, setFrameLoaded] = useState(false);
    const checkoutURL = useMemo(() => order?.checkout.url || (order?.checkout.value?.startsWith("http") ? order.checkout.value : ""), [order]);
    const availableMethods = useMemo(() => {
        const returned = order?.checkout.paymentMethods;
        const allowed = returned?.length ? new Set(returned) : null;
        return METHODS.filter((item) => (!allowed || allowed.has(item.value)) && topupSupportsMethod(order?.currency ?? product?.currency, item.value));
    }, [order?.checkout.paymentMethods, order?.currency, product?.currency]);

    useEffect(() => {
        if (!open) return;
        setFrameLoaded(false);
    }, [open, order?.id, checkoutURL]);

    useEffect(() => {
        if (order) return;
        if (availableMethods.some((item) => item.value === method)) return;
        setMethod(availableMethods[0]?.value || "card");
    }, [availableMethods, method, order]);

    const canContinue = Boolean(product && !creating);

    return (
        <AppModal open={open} centered width="min(600px, calc(100vw - 28px))" title={order ? "完成支付" : "Moresia 支付"} footer={null} onCancel={onClose} rootClassName="moresia-payment-modal">
            {order?.status === "closed" ? (
                <MoresiaClosedOrder onClose={onClose} />
            ) : !order ? (
                <div className="moresia-payment-dialog">
                    <div className="moresia-payment-summary">
                        <span className="moresia-payment-eyebrow">订单金额</span>
                        <strong>{formatTopupMoney(product?.amountFen ?? 0, product?.currency, locale)}</strong>
                        <span>{product ? `${product.name} · ${paymentOrderGrantLabel({ ...product, productKind: product.kind })}` : "正在读取商品信息"}</span>
                    </div>
                    <div className="moresia-payment-step">
                        <span className="is-active">1</span>
                        <i />
                        <span>2</span>
                        <b>选择支付方式</b>
                        <b>填写支付信息</b>
                    </div>
                    <div className="moresia-payment-section">
                        <h3>选择支付方式</h3>
                        <p>支付信息将在安全的 Moresia Stripe 收银台中完成。</p>
                        <div className="moresia-payment-methods" role="radiogroup" aria-label="Moresia 支付方式">
                            {availableMethods.map(({ value, label, detail, icon: Icon }) => (
                                <button key={value} type="button" role="radio" aria-checked={method === value} className={method === value ? "is-selected" : ""} onClick={() => setMethod(value)}>
                                    <Icon />
                                    <span>
                                        <strong>{t(label)}</strong>
                                        <small>{t(detail)}</small>
                                    </span>
                                    <i />
                                </button>
                            ))}
                        </div>
                    </div>
                    <div className="moresia-payment-actions">
                        <Button onClick={onClose}>取消</Button>
                        <Button type="primary" loading={creating} disabled={!canContinue} onClick={() => void onCreate(method)}>
                            {" "}
                            下一步 <ArrowRight />
                        </Button>
                    </div>
                </div>
            ) : (
                <div className="moresia-payment-dialog is-checkout">
                    <div className="moresia-payment-summary compact">
                        <span className="moresia-payment-eyebrow">应付金额</span>
                        <strong>{formatTopupMoney(order.amountFen, order.currency, locale)}</strong>
                        <span>
                            {order.productName} · {paymentOrderGrantLabel(order)}
                        </span>
                    </div>
                    <div className="moresia-payment-step">
                        <span className="is-done">✓</span>
                        <i />
                        <span className="is-active">2</span>
                        <b>选择支付方式</b>
                        <b>填写支付信息</b>
                    </div>
                    {checkoutURL ? (
                        <div className="moresia-payment-frame-wrap">
                            {!frameLoaded ? (
                                <div className="moresia-payment-frame-loading">
                                    <LoaderCircle className="is-spinning" />
                                    正在加载安全支付页面…
                                </div>
                            ) : null}
                            <iframe title="Moresia Stripe 支付" src={checkoutURL} allow="payment" className={frameLoaded ? "is-loaded" : ""} onLoad={() => setFrameLoaded(true)} />
                        </div>
                    ) : order.status === "create_failed" ? (
                        <div className="moresia-payment-error">支付页面创建失败，请重新生成支付入口。</div>
                    ) : (
                        <div className="moresia-payment-error">支付页面暂不可用，请稍后重试。</div>
                    )}
                    <div className="moresia-payment-actions">
                        <Button icon={<ArrowLeft />} onClick={onClose}>
                            稍后支付
                        </Button>
                        {order.status === "create_failed" || !checkoutURL ? (
                            <Button type="primary" loading={querying} onClick={() => void onRetry()}>
                                重新加载
                            </Button>
                        ) : null}
                    </div>
                </div>
            )}
        </AppModal>
    );
}
