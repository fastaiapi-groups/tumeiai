import { App } from "antd";
import { useEffect, useRef, useState, type ReactNode } from "react";

import { MoresiaPaymentDialog } from "@/components/moresia-payment-dialog";
import { createClientUUID } from "@/lib/client-id";
import { createPaymentOrder, queryPaymentOrder, refreshPaymentCheckout, type MoresiaPaymentType, type PaymentOrder, type TopupProduct } from "@/services/api/payments";

export const TUMEIAI_MORESIA_PROVIDER_ID = "moresia-stripe";

/**
 * Moresia 内嵌收银台。钱包弹窗只保留两行挂接（下单前拦截 + 渲染 dialog），
 * 选择支付方式、下单、轮询到账都在这里完成。Moresia 的支付方式通过下单接口的 method 字段传给后端。
 */
export function useTumeiaiMoresiaCheckout({ product, onGranted }: { product?: TopupProduct; onGranted: (order: PaymentOrder) => Promise<void> | void }): { intercept: (providerId: string) => boolean; dialog: ReactNode } {
    const { message } = App.useApp();
    const [open, setOpen] = useState(false);
    const [order, setOrder] = useState<PaymentOrder | null>(null);
    const [creating, setCreating] = useState(false);
    const [querying, setQuerying] = useState(false);
    const grantedOrderId = useRef("");
    const onGrantedRef = useRef(onGranted);
    onGrantedRef.current = onGranted;

    const settle = async (next: PaymentOrder) => {
        setOrder(next);
        if (next.status !== "credited" || grantedOrderId.current === next.id) return;
        grantedOrderId.current = next.id;
        await onGrantedRef.current(next);
        setOpen(false);
        setOrder(null);
        message.success(next.productKind === "storage" ? "支付已确认，存储空间已扩容" : "支付已确认，积分已到账");
    };

    const refresh = async (orderId: string, silent: boolean) => {
        try {
            await settle((await queryPaymentOrder(orderId)).order);
        } catch (error) {
            if (!silent) message.error(error instanceof Error ? error.message : "查询支付结果失败");
        }
    };
    const refreshRef = useRef(refresh);
    refreshRef.current = refresh;

    // 订单未完成时定时向服务端确认；到账只以服务端查询结果为准。
    useEffect(() => {
        if (!open || !order || !["created", "pending", "closing"].includes(order.status)) return;
        const orderId = order.id;
        const interval = window.setInterval(() => void refreshRef.current(orderId, true), 4_000);
        // 收银台页面完成后会发同源消息，收到后立即查一次，不必等下一轮轮询。
        const onMessage = (event: MessageEvent) => {
            if (event.origin !== window.location.origin || event.data?.type !== "moresia-payment-complete") return;
            void refreshRef.current(orderId, true);
        };
        window.addEventListener("message", onMessage);
        return () => {
            window.clearInterval(interval);
            window.removeEventListener("message", onMessage);
        };
    }, [open, order?.id, order?.status]);

    const create = async (paymentType: MoresiaPaymentType) => {
        if (!product || creating) return;
        setCreating(true);
        try {
            const result = await createPaymentOrder({ productId: product.id, providerId: TUMEIAI_MORESIA_PROVIDER_ID, method: paymentType, idempotencyKey: createClientUUID() });
            await settle(result.order);
        } catch (error) {
            message.error(error instanceof Error ? error.message : "创建支付订单失败");
        } finally {
            setCreating(false);
        }
    };

    const retry = async () => {
        if (!order) return;
        setQuerying(true);
        try {
            setOrder((await refreshPaymentCheckout(order.id)).order);
        } catch (error) {
            message.error(error instanceof Error ? error.message : "刷新支付入口失败");
        } finally {
            setQuerying(false);
        }
    };

    return {
        intercept(providerId: string) {
            if (providerId !== TUMEIAI_MORESIA_PROVIDER_ID) return false;
            setOrder(null);
            setOpen(true);
            return true;
        },
        dialog: <MoresiaPaymentDialog open={open} product={product} order={order} creating={creating} querying={querying} onClose={() => setOpen(false)} onCreate={create} onRetry={retry} />,
    };
}
