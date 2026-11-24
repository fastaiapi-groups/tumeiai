import { UI_TEXT } from "@/lib/ui-text";
import { App } from "antd";
import { useEffect, useRef, useState, type Dispatch, type SetStateAction } from "react";

import type { MoresiaPaymentType, PaymentOrder } from "@/services/api/payments";

type CheckoutOptions = {
    order: PaymentOrder | null;
    setOrder: Dispatch<SetStateAction<PaymentOrder | null>>;
    setDefaultOpen: Dispatch<SetStateAction<boolean>>;
    refresh: (id: string, silent: boolean) => Promise<void>;
};

export function redirectPaymentCheckout(order: PaymentOrder) {
    if (["moresia-stripe", "epay-alipay", "epay-wxpay"].includes(order.providerId) || order.checkout.mode !== "redirect" || !order.checkout.url) return false;
    window.location.assign(order.checkout.url);
    return true;
}

// Moresia uses an embedded checkout and an origin-checked completion signal;
// order status and crediting are always confirmed by the existing server query.
export function useMoresiaWalletCheckout({ order, setOrder, setDefaultOpen, refresh }: CheckoutOptions) {
    const [open, setOpen] = useState(false);
    const { message } = App.useApp();
    const { t } = UI_TEXT;
    const refreshRef = useRef(refresh);
    useEffect(() => {
        refreshRef.current = refresh;
    });

    useEffect(() => {
        if (!open || !order || order.providerId !== "moresia-stripe") return;
        const orderId = order.id;
        const handlePaymentMessage = (event: MessageEvent) => {
            if (event.origin !== window.location.origin || event.data?.type !== "moresia-payment-complete") return;
            void refreshRef.current(orderId, true);
        };
        window.addEventListener("message", handlePaymentMessage);
        return () => window.removeEventListener("message", handlePaymentMessage);
    }, [open, order?.id, order?.providerId]);

    useEffect(() => {
        if (!open || order?.status !== "credited") return;
        setOpen(false);
        setOrder(null);
        message.success(order.productKind === "storage" ? "支付已确认，存储空间已扩容" : "支付已确认，积分已到账");
    }, [open, order?.status, setOrder, message, t]);

    return {
        open,
        setOpen,
        selectMethod(providerId: string, paymentType?: MoresiaPaymentType) {
            if (providerId !== "moresia-stripe" || paymentType) return false;
            setDefaultOpen(false);
            setOrder(null);
            setOpen(true);
            return true;
        },
        showOrder(next: PaymentOrder) {
            if (next.providerId === "moresia-stripe") {
                setDefaultOpen(false);
                setOpen(true);
            } else setDefaultOpen(true);
        },
        confirmOrder(next: PaymentOrder) {
            // The hosted document may navigate away before sending postMessage.
            if (next.providerId !== "moresia-stripe" || next.status !== "credited") return;
            setOpen(false);
            setOrder(null);
        },
    };
}
