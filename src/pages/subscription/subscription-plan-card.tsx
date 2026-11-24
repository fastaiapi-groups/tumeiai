import { uiText } from "@/lib/ui-text";
import { Check, Pencil, Sparkles } from "lucide-react";
import type { SubscriptionPlan } from "@/services/api/subscriptions";
import { catalogCredits, catalogLabel, catalogPrice, catalogModelScope } from "./subscription-catalog";

type AppLocale = "zh-CN";
import { subscriptionPriceBadge } from "./subscription-price-label";

export function SubscriptionPlanCard({
    plan,
    interval,
    locale,
    multiplier,
    choices,
    onMultiplier,
    onCheckout,
}: {
    plan: SubscriptionPlan;
    interval: "month" | "year";
    locale: AppLocale;
    multiplier: number;
    choices: number[];
    onMultiplier: (value: number) => void;
    onCheckout: () => void;
}) {
    const price = catalogPrice(plan, interval);
    if (!price) return null;
    const label = catalogLabel(plan);
    label.badge = subscriptionPriceBadge(price, label.badge);
    const concurrency = plan.limitRules.find((rule) => rule.limitCode === "concurrent_tasks" && rule.scope === "user");
    const factor = price.multiplierPriceMode === "linear" ? multiplier / 10000 : 1;
    const money = (minor: number) => new Intl.NumberFormat(locale, { style: "currency", currency: price.currency }).format(Math.round(minor * factor) / 100);
    const terms = { credits: "积分", month: "个月", year: "年", buy: "订阅", multiplier: "倍率" };
    return (
        <article className={`subscription-plan-card${plan.plan.featured ? " is-featured" : ""}`}>
            <header className="subscription-plan-header">
                <h2 className="subscription-plan-title">
                    {label.name}
                    {label.badge ? <span className="subscription-plan-badge">{label.badge}</span> : null}
                </h2>
                <p className="subscription-plan-tagline">{label.tagline}</p>
            </header>
            <div className="subscription-plan-body">
                <div className="subscription-benefit-panel">
                    <p className="subscription-credit-lead">
                        <Sparkles className="mr-1 inline size-4" />
                        {(catalogCredits(price) * factor).toLocaleString(locale)} {terms.credits}
                    </p>
                    <div className="subscription-multiplier" aria-label={terms.multiplier}>
                        {choices.map((choice) => (
                            <button key={choice} type="button" aria-pressed={choice === multiplier} className={choice === multiplier ? "is-active" : ""} onClick={() => onMultiplier(choice)}>
                                {choice / 10000}×
                            </button>
                        ))}
                        <button type="button" className="is-edit" aria-label={terms.multiplier} onClick={onCheckout}>
                            <Pencil className="inline size-4" />
                        </button>
                    </div>
                </div>
                <ul className="subscription-feature-list">
                    {plan.features
                        .filter((feature) => feature.featureCode !== "included_credits" && !(concurrency && feature.featureCode === "concurrent_tasks"))
                        .map((feature) => (
                            <li key={feature.id || feature.featureCode} className={feature.valueBool === false ? "is-muted" : ""}>
                                {feature.valueBool === false ? <span>×</span> : <Check className="size-4" />}
                                {feature.displayText}
                            </li>
                        ))}
                    {concurrency ? (
                        <li>
                            <Check className="size-4" />
                            {Number(concurrency.limitValue)} 个并发任务
                        </li>
                    ) : null}
                </ul>
                {plan.modelRules.length ? (
                    <ul className="subscription-model-list">
                        {plan.modelRules.map((rule) => (
                            <li key={String(rule.id)}>
                                <Check className="size-4" />
                                <span>
                                    {String(rule.logicalModelCode)}
                                    <small className="block">{catalogModelScope(rule, locale)}</small>
                                    {rule.accessMode === "free" || rule.accessMode === "unlimited" ? <small className="block">{Number(rule.freeDailyLimit) > 0 ? `${Number(rule.freeDailyLimit)} ${"次免费任务 / 天（UTC）"}` : "不限次数"}</small> : null}
                                </span>
                            </li>
                        ))}
                    </ul>
                ) : null}
                <div className="subscription-price-block">
                    <div className="subscription-price-line">
                        {price.listAmountMinor > price.amountMinor ? <span className="subscription-price-list">{money(price.listAmountMinor)}</span> : null}
                        <span className="subscription-price">{money(price.amountMinor)}</span>
                        <span className="subscription-price-note">
                            / {price.intervalCount} {interval === "year" ? terms.year : terms.month}
                        </span>
                    </div>
                    <button type="button" className="subscription-upgrade-button" onClick={onCheckout}>
                        {terms.buy}
                    </button>
                </div>
            </div>
        </article>
    );
}
