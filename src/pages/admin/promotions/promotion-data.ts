import type { PromotionRecipient } from "@/services/api/promotions";
export function parsePromotionEmails(text: string) {
    const lines = text
        .split(/\r?\n/)
        .map((line) => line.trim().toLowerCase())
        .filter(Boolean);
    const invalid = lines.filter((email) => !/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(email));
    return { emails: [...new Set(lines)], invalid, duplicates: lines.length - new Set(lines).size };
}
export const promotionStatuses: Record<string, string> = { pending: "待发送", sending: "发送中／结果待确认", sent: "发送成功", failed: "发送失败，可重试", unknown: "结果不确定，禁止自动重试", skipped: "已退订，跳过" };
export function promotionStats(rows: PromotionRecipient[]) {
    const sent = rows.filter((row) => row.status === "sent");
    const rate = (count: number, total: number) => (total ? `${((count / total) * 100).toFixed(1)}%` : "—");
    const opened = sent.filter((row) => row.openedAt).length;
    const clicked = sent.filter((row) => row.clickedAt).length;
    const registered = sent.filter((row) => row.registeredAt).length;
    return { sent: sent.length, opened, clicked, registered, openRate: rate(opened, sent.length), clickRate: rate(clicked, sent.length), registrationRate: rate(registered, sent.length), clickRegistrationRate: rate(registered, clicked) };
}
