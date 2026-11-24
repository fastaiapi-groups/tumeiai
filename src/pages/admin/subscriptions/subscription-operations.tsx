import { Table, Tabs } from "antd";
import { SubscriptionOperationMetrics } from "./subscription-operation-metrics";
import { subscriptionPaymentColumns, userSubscriptionColumns } from "./subscription-operation-columns";
export function SubscriptionOperations({ metrics, payments, users }: { metrics: Record<string, number>; payments: Record<string, unknown>[]; users: Record<string, unknown>[] }) {
    return (
        <Tabs
            items={[
                {
                    key: "metrics",
                    label: "运营指标",
                    children: <SubscriptionOperationMetrics metrics={metrics} />,
                },
                {
                    key: "payments",
                    label: "支付订单",
                    children: <Table rowKey="id" dataSource={payments} columns={subscriptionPaymentColumns} />,
                },
                {
                    key: "users",
                    label: "用户订阅",
                    children: <Table rowKey="id" dataSource={users} columns={userSubscriptionColumns} />,
                },
            ]}
        />
    );
}
