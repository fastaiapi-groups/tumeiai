import { http } from "./request";
import type { FeatureAvailability } from "@/stores/use-user-store";

export function saveSubscriptionVisibility(subscriptionEnabled: boolean) {
    return http.patch<{ features: FeatureAvailability }>("/admin/settings/features", { subscriptionEnabled });
}
