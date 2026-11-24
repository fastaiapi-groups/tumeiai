import dayjs from "dayjs";
import type { ColumnsType } from "antd/es/table";

const paymentStatuses: Record<string, string> = {
    created: "待支付",
    pending: "支付中",
    paid: "已支付",
    failed: "支付失败",
    closed: "已关闭",
    refunded: "已退款",
};
const subscriptionStatuses: Record<string, string> = {
    pending_payment: "待支付",
    trialing: "试用中",
    active: "生效中",
    past_due: "续费逾期",
    grace_period: "宽限期",
    canceled: "已取消",
    expired: "已到期",
};

export function formatSubscriptionOperationTime(value: unknown): string {
    if (typeof value !== "string" || !value || value.startsWith("0001-")) return "—";
    const date = dayjs(value);
    return date.isValid() ? date.format("YYYY-MM-DD HH:mm:ss") : "—";
}

const emailColumn = { title: "用户邮箱", dataIndex: "userEmail", render: (email: string) => email || "未设置邮箱" };
export const subscriptionPaymentColumns: ColumnsType<Record<string, unknown>> = [
    { title: "订单号", dataIndex: "merchantOrderNo" },
    emailColumn,
    { title: "金额", render: (_, row) => `${Number(row.amountMinor) / 100} ${row.currency}` },
    { title: "状态", dataIndex: "status", render: (status: string) => paymentStatuses[status] || "未知状态" },
    { title: "创建时间", dataIndex: "createdAt", render: formatSubscriptionOperationTime },
    { title: "支付时间", dataIndex: "paidAt", render: formatSubscriptionOperationTime },
];
export const userSubscriptionColumns: ColumnsType<Record<string, unknown>> = [
    emailColumn,
    { title: "套餐", dataIndex: "planName", render: (name: string) => name || "套餐名称不可用" },
    { title: "状态", dataIndex: "status", render: (status: string) => subscriptionStatuses[status] || "未知状态" },
    { title: "周期开始", dataIndex: "currentPeriodStart", render: formatSubscriptionOperationTime },
    { title: "周期结束", dataIndex: "currentPeriodEnd", render: formatSubscriptionOperationTime },
];
