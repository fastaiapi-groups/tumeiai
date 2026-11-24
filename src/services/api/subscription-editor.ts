import { http } from "./request";

export function updateSubscriptionPlan(revisionId: string, payload: Record<string, unknown>) {
    return http.put<{ revision: { id: string; versionNo: number; status: string } }>(`/admin/subscriptions/plans/${encodeURIComponent(revisionId)}`, payload);
}
