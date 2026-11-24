import { http } from "./request";
export interface PromotionCampaign {
    id: string;
    title: string;
    html: string;
    baseUrl: string;
    createdAt: string;
}
export interface PromotionRecipient {
    id: string;
    email: string;
    status: string;
    error: string;
    sentAt?: string;
    openedAt?: string;
    clickedAt?: string;
    registeredAt?: string;
}
export interface PromotionDetail {
    campaign: PromotionCampaign;
    recipients: PromotionRecipient[];
}
export const listPromotions = () => http.get<PromotionCampaign[]>("/admin/promotions");
export const getPromotion = (id: string) => http.get<PromotionDetail>(`/admin/promotions/${encodeURIComponent(id)}`);
export const createPromotion = (data: { title: string; html: string; emails: string[]; baseUrl: string }) => http.post<PromotionDetail>("/admin/promotions", data);
export const sendPromotion = (id: string, recipient: string) => http.post<PromotionDetail>(`/admin/promotions/${encodeURIComponent(id)}/send/${encodeURIComponent(recipient)}`, {}, { timeout: 65000 });
