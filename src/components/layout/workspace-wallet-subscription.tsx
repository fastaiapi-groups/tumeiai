import { UI_TEXT } from "@/lib/ui-text";

import { useUserStore } from "@/stores/use-user-store";
import { App, Button, Popconfirm, Skeleton } from "antd";
import { CircleAlert, Crown, RefreshCw } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router";

import { formatCredits } from "@/constant/credits";
import { cancelSubscription, getSubscriptionMe, resumeSubscription, type SubscriptionMe } from "@/services/api/subscriptions";

const statusLabels: Record<string, string> = {
    active: "订阅生效中",
    trialing: "试用中",
    past_due: "续费逾期",
    grace_period: "宽限期内",
    canceled: "已取消",
    expired: "已到期",
    pending_payment: "待支付",
};

export function WorkspaceWalletSubscription({ onClose }: { onClose: () => void }) {
    const subscriptionEnabled = useUserStore((state) => state.features.subscriptionEnabled);
    const { locale, t } = UI_TEXT;
    const { message } = App.useApp();
    const navigate = useNavigate();
    const [data, setData] = useState<SubscriptionMe | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [refresh, setRefresh] = useState(0);
    const [updating, setUpdating] = useState(false);
    const mounted = useRef(false);
    const updateInFlight = useRef(false);

    useEffect(() => {
        mounted.current = true;
        return () => {
            mounted.current = false;
        };
    }, []);

    useEffect(() => {
        const controller = new AbortController();
        setLoading(true);
        setError("");
        void getSubscriptionMe(controller.signal)
            .then((result) => {
                if (!controller.signal.aborted) setData(result);
            })
            .catch((reason) => {
                if (!controller.signal.aborted) setError(reason instanceof Error ? reason.message : "读取订阅失败");
            })
            .finally(() => {
                if (!controller.signal.aborted) setLoading(false);
            });
        return () => controller.abort();
    }, [refresh]);

    const subscription = data?.subscription;
    const remaining = (data?.lots ?? []).reduce((total, lot) => {
        if (lot.status !== "active" || (lot.expiresAt && new Date(lot.expiresAt).getTime() <= Date.now())) return total;
        return total + lot.remainingMicrocredits;
    }, 0);
    const viewPlans = () => {
        onClose();
        navigate("/subscription");
    };

    const updateSubscription = async () => {
        if (!subscription?.id || updateInFlight.current) return;
        updateInFlight.current = true;
        setUpdating(true);
        try {
            if (subscription.cancelAtPeriodEnd) await resumeSubscription(subscription.id);
            else await cancelSubscription(subscription.id);
            if (!mounted.current) return;
            message.success(subscription.cancelAtPeriodEnd ? "已恢复订阅" : "已设置到期取消，当前周期权益仍可使用");
            setRefresh((value) => value + 1);
        } catch (reason) {
            if (mounted.current) message.error(reason instanceof Error ? reason.message : "更新订阅失败");
        } finally {
            updateInFlight.current = false;
            if (mounted.current) setUpdating(false);
        }
    };

    return (
        <div className="workspace-wallet-content is-subscription">
            <section className="workspace-wallet-section" aria-label="我的订阅" aria-busy={loading}>
                <div className="workspace-wallet-section-heading">
                    <div>
                        <h3>我的订阅</h3>
                        <p>查看已订阅套餐、当前有效期与剩余订阅积分。</p>
                    </div>
                    <Button type="text" icon={<RefreshCw />} loading={loading} disabled={updating} onClick={() => setRefresh((value) => value + 1)}>
                        {" "}
                        刷新{" "}
                    </Button>
                </div>
                {loading ? (
                    <Skeleton active paragraph={{ rows: 4 }} />
                ) : error ? (
                    <div className="workspace-wallet-inline-state is-error" role="alert">
                        <CircleAlert />
                        <div>
                            <strong>订阅加载失败</strong>
                            <span>{error}</span>
                        </div>
                        <Button onClick={() => setRefresh((value) => value + 1)}>重试</Button>
                    </div>
                ) : subscription ? (
                    <div className="grid gap-6" style={{ color: "var(--user-ink)", fontSize: "var(--fs-body)" }}>
                        <div className="flex flex-wrap items-center justify-between gap-3">
                            <strong className="min-w-0 break-words" style={{ fontSize: "var(--fs-heading-lg)" }}>
                                {data?.planName || "已订阅套餐"}
                            </strong>
                            <span style={{ color: "var(--user-ink-muted)" }}>{t(statusLabels[subscription.status] || "状态待确认")}</span>
                        </div>
                        <dl className="m-0 grid grid-cols-1 gap-5 sm:grid-cols-2">
                            <div>
                                <dt style={{ color: "var(--user-ink-muted)" }}>当前有效期</dt>
                                <dd className="m-0 mt-2 break-words">
                                    {new Date(subscription.currentPeriodStart).toLocaleString(locale, { hour12: false })}
                                    <span className="mx-2">至</span>
                                    {new Date(subscription.currentPeriodEnd).toLocaleString(locale, { hour12: false })}
                                </dd>
                            </div>
                            <div>
                                <dt style={{ color: "var(--user-ink-muted)" }}>剩余订阅积分</dt>
                                <dd className="m-0 mt-2 font-semibold" style={{ fontSize: "var(--fs-heading-lg)" }}>
                                    {formatCredits(remaining, 6)} 积分
                                </dd>
                            </div>
                        </dl>
                        <p className="m-0" style={{ color: "var(--user-ink-muted)" }}>
                            可用余额已包含订阅积分；生成时先使用适用的免费次数，再使用订阅积分，最后使用普通积分。
                        </p>
                        {subscription.cancelAtPeriodEnd ? (
                            <p className="m-0" style={{ color: "var(--user-ink-muted)" }}>
                                已设置到期取消，当前周期内仍可使用套餐权益。
                            </p>
                        ) : null}
                        <div className="flex flex-wrap gap-3">
                            {subscription.cancelAtPeriodEnd ? (
                                <Button loading={updating} onClick={() => void updateSubscription()}>
                                    恢复订阅
                                </Button>
                            ) : (
                                <Popconfirm title="确定到期取消订阅？" description="当前周期的套餐权益将保留至到期，可在到期前恢复订阅。" okText="确认取消" cancelText="保留订阅" onConfirm={updateSubscription} disabled={updating}>
                                    <Button loading={updating}>到期取消订阅</Button>
                                </Popconfirm>
                            )}
                            {subscriptionEnabled && (
                                <Button disabled={updating} onClick={viewPlans}>
                                    订阅新套餐
                                </Button>
                            )}
                        </div>
                    </div>
                ) : (
                    <div className="workspace-wallet-empty flex-col">
                        <Crown />
                        <strong>暂无已订阅套餐</strong>
                        <span>订阅套餐后，可在这里查看套餐与积分信息。</span>
                        {subscriptionEnabled && <Button onClick={viewPlans}>订阅新套餐</Button>}
                    </div>
                )}
            </section>
        </div>
    );
}
