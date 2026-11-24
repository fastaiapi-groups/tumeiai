import { lazy } from "react";

/** 扩展页面：订阅套餐、后台订阅管理、邮件推广。集中在这里懒加载，router.tsx 只保留路由挂接行。 */
export const TumeiaiSubscriptionPage = lazy(() => import("@/pages/subscription/subscription-page"));
export const TumeiaiAdminSubscriptionsPage = lazy(() => import("@/pages/admin/subscriptions/subscriptions-page"));
export const TumeiaiAdminPromotionsPage = lazy(() => import("@/pages/admin/promotions/promotions-page"));
