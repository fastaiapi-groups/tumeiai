import { http } from "./request";
export type AdminFAQ = { id: string; faqCode: string; category: string; sortOrder: number; enabled: boolean; localizations: Array<{ locale: string; question: string; answer: string; status?: string }> };
export function listAdminFAQs() {
    return http.get<{ faqs: AdminFAQ[] }>("/admin/subscriptions/faqs");
}
export function updateAdminFAQ(id: string, payload: Omit<AdminFAQ, "id">) {
    return http.put<{ saved: boolean }>(`/admin/subscriptions/faqs/${encodeURIComponent(id)}`, payload);
}
