import { UI_TEXT } from "@/lib/ui-text";
import { useEffect, useRef, useState } from "react";
import { Alert, Button, Spin } from "antd";
import { AppModal } from "@/components/ui/product/app-modal";
import { SubscriptionOrderSummary, type CheckoutSummary } from "./subscription-checkout-dialog";

import { useThemeStore } from "@/stores/use-theme-store";
import { loadSubscriptionStripe, type SubscriptionPaymentSession, type SubscriptionStripe, type StripeElements } from "@/services/stripe-subscription";

const labels = {
    "zh-CN": { title: "订阅付款", pay: "确认订阅并付款", waiting: "正在确认支付结果，确认后会自动关闭", hint: "订阅将按所选周期自动续费，可在「我的订阅」中取消续费。", retry: "重新加载" },
};
export function SubscriptionPaymentDialog({ session, summary, paymentId, onClose }: { session?: SubscriptionPaymentSession; summary?: CheckoutSummary; paymentId?: string; onClose: () => void }) {
    const { locale } = UI_TEXT;
    const t = labels[locale];
    const theme = useThemeStore((state) => state.theme);
    const mount = useRef<HTMLDivElement>(null);
    const payment = useRef<{ stripe: SubscriptionStripe; elements: StripeElements } | undefined>(undefined);
    const [ready, setReady] = useState(false);
    const [busy, setBusy] = useState(false);
    const [waiting, setWaiting] = useState(false);
    const [error, setError] = useState("");
    const [attempt, setAttempt] = useState(0);
    useEffect(() => {
        if (!session) return;
        let cancelled = false;
        let destroy: (() => void) | undefined;
        setReady(false);
        setWaiting(!session.clientSecret);
        setError("");
        setBusy(false);
        if (session.clientSecret)
            void loadSubscriptionStripe()
                .then((factory) => {
                    if (cancelled || !mount.current) return;
                    if (!session.publishableKey) throw new Error("支付会话缺少公钥，请重新发起付款");
                    const stripe = factory(session.publishableKey, session.channel === "STRIPE_CONNECT" ? { stripeAccount: session.stripeAccountId } : undefined);
                    const elements = stripe.elements({ clientSecret: session.clientSecret!, locale: "zh", appearance: { theme: theme === "dark" ? "night" : "stripe" } });
                    const element = elements.create("payment");
                    destroy = () => element.destroy();
                    element.on("ready", () => {
                        if (!cancelled) setReady(true);
                    });
                    element.mount(mount.current);
                    payment.current = { stripe, elements };
                })
                .catch((cause: unknown) => {
                    if (!cancelled) setError(cause instanceof Error ? cause.message : "暂时无法付款");
                });
        return () => {
            cancelled = true;
            destroy?.();
            payment.current = undefined;
        };
    }, [session, locale, attempt, theme]);
    const pay = async () => {
        if (!payment.current || !paymentId) return;
        setBusy(true);
        setError("");
        try {
            const url = new URL(window.location.href);
            url.search = "";
            url.searchParams.set("paymentId", paymentId);
            const result = await payment.current.stripe.confirmPayment({ elements: payment.current.elements, confirmParams: { return_url: url.toString() }, redirect: "if_required" });
            if (result.error) setError(result.error.message || "支付失败");
            else setWaiting(true);
        } catch (cause) {
            setError(cause instanceof Error ? cause.message : "支付失败");
        } finally {
            setBusy(false);
        }
    };
    return (
        <AppModal open={Boolean(session)} title={t.title} footer={null} onCancel={busy ? undefined : onClose} closable={!busy} maskClosable={!busy} width={560}>
            <div className="subscription-checkout-shell">
                {summary ? <SubscriptionOrderSummary summary={summary} compact /> : <p>{t.hint}</p>}
                <div ref={mount} />
                {error && <Alert type="error" message={error} />}
                {error && !ready && <Button onClick={() => setAttempt((value) => value + 1)}>{t.retry}</Button>}
                {waiting ? (
                    <div role="status">
                        <Spin size="small" /> {t.waiting}
                    </div>
                ) : (
                    <Button type="primary" block disabled={!ready} loading={busy} onClick={() => void pay()}>
                        {t.pay}
                    </Button>
                )}
            </div>
        </AppModal>
    );
}
