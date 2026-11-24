import { Statistic } from "antd";
import { topupCurrencyScale } from "@/lib/topup-currency";

export function SubscriptionOperationMetrics({ metrics }: { metrics: Record<string, number> }) {
    const revenues = Object.entries(metrics)
        .filter(([key]) => key.startsWith("revenue_"))
        .sort(([a], [b]) => a.localeCompare(b));
    return (
        <div className="subscription-admin-summary">
            <Statistic title="订阅总数" value={metrics.total ?? 0} suffix="个" />
            <Statistic title="生效订阅" value={metrics.active ?? 0} suffix="个" />
            <Statistic title="累计发放积分" value={(metrics.granted ?? 0) / 1_000_000} formatter={(value) => Number(value).toLocaleString("zh-CN", { maximumFractionDigits: 6 })} suffix="积分" />
            {revenues.length ? (
                revenues.map(([key, amount]) => {
                    const currency = key.slice("revenue_".length);
                    const scale = topupCurrencyScale(currency);
                    return <Statistic key={key} title={`累计实收（${currency}）`} value={amount / scale} precision={scale === 1 ? 0 : 2} suffix={currency} />;
                })
            ) : (
                <Statistic title="累计实收" value="暂无收入" />
            )}
        </div>
    );
}
