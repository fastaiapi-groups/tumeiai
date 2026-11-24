import { UI_TEXT } from "@/lib/ui-text";
import { QRCode, Spin, message } from "antd";
import { ChevronDown, CircleHelp, Pencil, Users, UserRound, WalletCards } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router";
import { SubscriptionCheckoutDialog } from "./subscription-checkout-dialog";
import { SubscriptionPaymentDialog } from "./subscription-payment-dialog";
import type { SubscriptionPaymentSession } from "@/services/stripe-subscription";

import { WorkspacePage } from "@/components/layout/workspace-page";
import { openWorkspaceWallet } from "@/lib/workspace-wallet";
import { listPaymentProviders, type PaymentProvider } from "@/services/api/payments";
import {
    checkoutSubscription,
    getSubscriptionPayment,
    listSubscriptionComparison,
    listSubscriptionFAQs,
    listSubscriptionPlans,
    listSubscriptionPriceComparisons,
    querySubscriptionPayment,
    quoteSubscription,
    type SubscriptionFAQ,
    type SubscriptionPlan,
    type SubscriptionPriceComparison,
} from "@/services/api/subscriptions";

import { catalogPlans, catalogLabel, catalogPrice, catalogCredits } from "./subscription-catalog";
import { SubscriptionPlanCard } from "./subscription-plan-card";
import { SubscriptionFeatureTable } from "./subscription-feature-table";
import { featureComparisonFor, isFeatureComparison } from "@/lib/subscription-feature-comparison";
import "./subscription-page.css";

type Locale = "zh-CN";

type BillingInterval = "month" | "year";
type Price = SubscriptionPlan["prices"][number];

const copy: Record<Locale, Record<string, string>> = {
    "zh-CN": {
        month: "月度",
        year: "每年",
        creditsTopup: "购买积分",
        individual: "个人计划",
        team: "团队计划",
        currency: "暂无可用支付渠道",
        support: "遇到问题了吗？",
        credits: "积分",
        perMonth: "每月",
        perYear: "每年",
        annualAccount: "年账单金额为",
        noPlan: "暂无已发布套餐",
        compareAll: "比较所有功能和套餐",
        faq: "常见问题",
        noFaq: "暂无常见问题",
        loading: "正在读取订阅信息…",
        provider: "支付渠道",
        multiplier: "乘以积分",
        checkoutTitle: "确认升级",
        checkoutHint: "选择倍率和支付方式后继续",
        pay: "继续支付",
        close: "关闭",
        scan: "请使用支付应用完成付款",
        paid: "支付成功，积分正在发放",
    },
};

function money(amountMinor: number, currency: string, locale: Locale) {
    const amount = (amountMinor || 0) / 100;
    const value = new Intl.NumberFormat(locale, { maximumFractionDigits: 2 }).format(amount);
    if (currency.toUpperCase() === "USD") return `${value}美元`;
    return new Intl.NumberFormat(locale, { style: "currency", currency: currency || "USD", maximumFractionDigits: 2 }).format(amount);
}

function scaledMinor(price: Price, multiplier: number) {
    return price.multiplierPriceMode === "linear" ? Math.round((price.amountMinor * multiplier) / 10000) : price.amountMinor;
}
function scaledQuantity(price: Price | undefined, quantity: number, multiplier: number) {
    return !price || price.multiplierPriceMode !== "linear" ? quantity : Math.round((quantity * multiplier) / 10000);
}
function multiplierOptions(price: Price) {
    const min = price.minMultiplierBasisPoints || 10000;
    const max = price.maxMultiplierBasisPoints || min;
    const step = price.multiplierStepBasisPoints || 10000;
    const values: number[] = [];
    for (let value = min; value <= max && values.length < 10; value += step) values.push(value);
    return values.length ? values : [min];
}
function idempotencyKey() {
    return typeof crypto?.randomUUID === "function" ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}
const priceFor = catalogPrice;
function labelFor(plan: SubscriptionPlan, _locale: Locale) {
    return catalogLabel(plan);
}
function selector(value: unknown) {
    try {
        return typeof value === "string" ? (JSON.parse(value) as Record<string, unknown>) : {};
    } catch {
        return {};
    }
}
function modelName(code: string, _locale: Locale) {
    return code;
}
function modelMeta(rule: Record<string, unknown>, locale: Locale) {
    const value = selector(rule.selectorJson);
    const resolution = String(value.resolution || "");
    const days = Number(value.unlimitedDays || 0);
    const suffix = days ? `${days}天无限畅享` : "";
    return [resolution, suffix].filter(Boolean).join("  ");
}
function comparisonLocale(value: SubscriptionPriceComparison, locale: Locale, field: "title" | "subtitle") {
    const key = `${field}Zh` as keyof SubscriptionPriceComparison;
    return String(value[key] || value[`${field}En` as keyof SubscriptionPriceComparison] || "");
}
function comparisonColumnLocale(value: SubscriptionPriceComparison["columns"][number], locale: Locale, field: "name" | "tagline") {
    const key = `${field}Zh` as keyof typeof value;
    return String(value[key] || value[`${field}En` as keyof typeof value] || "");
}
function comparisonRowLocale(value: SubscriptionPriceComparison["columns"][number]["rows"][number], locale: Locale, field: "label" | "value") {
    const key = `${field}Zh` as keyof typeof value;
    return String(value[key] || value[`${field}En` as keyof typeof value] || "");
}

export default function SubscriptionPage() {
    const [searchParams, setSearchParams] = useSearchParams();
    const completedPaymentId = useRef("");
    const { locale, t: tr } = UI_TEXT;
    const refreshSequence = useRef(0);
    const t = copy[locale];
    const [interval, setInterval] = useState<BillingInterval>("year");
    const [audience, setAudience] = useState<"individual" | "team">("individual");
    const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
    const [faqs, setFaqs] = useState<SubscriptionFAQ[]>([]);
    const [priceComparisons, setPriceComparisons] = useState<SubscriptionPriceComparison[]>([]);
    const [providers, setProviders] = useState<PaymentProvider[]>([]);
    const [providerId, setProviderId] = useState("");
    const [checkoutPlan, setCheckoutPlan] = useState<SubscriptionPlan>();
    const [checkoutOpen, setCheckoutOpen] = useState(false);
    const [paymentSession, setPaymentSession] = useState<SubscriptionPaymentSession>();
    const [checkoutPriceId, setCheckoutPriceId] = useState("");
    const [checkoutMultiplier, setCheckoutMultiplier] = useState(10000);
    const [comparisonQuotes, setComparisonQuotes] = useState<Record<string, SubscriptionPlan["modelQuotes"]>>({});
    const [loading, setLoading] = useState(true);
    const [busy, setBusy] = useState(false);
    const [pendingPayment, setPendingPayment] = useState<{ id: string; mode: string; value?: string; status: string }>();
    const [multipliers, setMultipliers] = useState<Record<string, number>>({});

    const refresh = async () => {
        const sequence = ++refreshSequence.current;
        setLoading(true);
        try {
            const [planResult, faqResult, comparisonResult, providerResult] = await Promise.all([listSubscriptionPlans(locale), listSubscriptionFAQs(locale), listSubscriptionPriceComparisons(), listPaymentProviders()]);
            if (sequence !== refreshSequence.current) return;
            setPlans(planResult.plans);
            setFaqs(faqResult.faqs);
            setPriceComparisons(comparisonResult.comparisons);
            setProviders(providerResult.providers);
            setProviderId((current) => current || providerResult.providers.find((provider) => provider.id === "moresia-stripe")?.id || providerResult.providers[0]?.id || "");
        } catch (error) {
            if (sequence === refreshSequence.current) message.error(error instanceof Error ? error.message : "读取订阅信息失败");
        } finally {
            if (sequence === refreshSequence.current) setLoading(false);
        }
    };

    useEffect(() => {
        void refresh();
        return () => {
            refreshSequence.current += 1;
        };
    }, [locale]);
    const returnPaymentId = searchParams.get("paymentId");
    useEffect(() => {
        if (returnPaymentId && completedPaymentId.current !== returnPaymentId) setPendingPayment({ id: returnPaymentId, mode: "", status: "pending" });
    }, [returnPaymentId]);
    useEffect(() => {
        if (!pendingPayment?.id || ["paid", "failed", "closed", "refunded"].includes(pendingPayment.status)) return;
        let cancelled = false;
        let querying = false;
        const poll = async () => {
            if (querying) return;
            querying = true;
            try {
                const result = await querySubscriptionPayment(pendingPayment.id).catch(() => getSubscriptionPayment(pendingPayment.id));
                if (!cancelled) setPendingPayment({ id: result.payment.id, mode: result.payment.checkoutMode, value: result.payment.checkoutValue, status: result.payment.status });
            } catch {
                /* Return may arrive before the payment record. */
            } finally {
                querying = false;
            }
        };
        void poll();
        const timer = window.setInterval(() => void poll(), 3000);
        return () => {
            cancelled = true;
            window.clearInterval(timer);
        };
    }, [pendingPayment?.id, pendingPayment?.status]);

    useEffect(() => {
        if (!pendingPayment || pendingPayment.status !== "paid" || completedPaymentId.current === pendingPayment.id) return;
        completedPaymentId.current = pendingPayment.id;
        setPaymentSession(undefined);
        setCheckoutOpen(false);
        setPendingPayment(undefined);
        setSearchParams(
            (current) => {
                const next = new URLSearchParams(current);
                next.delete("paymentId");
                return next;
            },
            { replace: true },
        );
        window.dispatchEvent(new CustomEvent("wallet:updated"));
        openWorkspaceWallet({ tab: "subscription" });
        message.success(t.paid);
    }, [pendingPayment, setSearchParams, t.paid]);

    const visiblePlans = useMemo(() => catalogPlans(plans, audience), [audience, plans]);
    const featureComparison = featureComparisonFor(priceComparisons, interval);
    const comparisonPlans = useMemo(() => visiblePlans.filter((plan) => Boolean(priceFor(plan, interval))), [interval, visiblePlans]);
    const openCheckout = (plan: SubscriptionPlan, multiplier = 10000) => {
        const price = priceFor(plan, interval);
        if (!price) return;
        setCheckoutPlan(plan);
        setCheckoutPriceId(price.id);
        setCheckoutMultiplier(multiplier || price.minMultiplierBasisPoints || 10000);
        setCheckoutOpen(true);
    };
    useEffect(() => {
        if (featureComparison || comparisonPlans.length === 0) return;
        let cancelled = false;
        void Promise.all(
            comparisonPlans.map(async (plan) => {
                try {
                    return [plan.plan.code, (await listSubscriptionComparison(plan.revision.id, locale)).quotes] as const;
                } catch {
                    return [plan.plan.code, plan.modelQuotes] as const;
                }
            }),
        ).then((entries) => {
            if (!cancelled) setComparisonQuotes(Object.fromEntries(entries));
        });
        return () => {
            cancelled = true;
        };
    }, [comparisonPlans, locale, featureComparison]);
    const checkoutPrice = checkoutPlan ? checkoutPlan.prices.find((price) => price.id === checkoutPriceId) || priceFor(checkoutPlan, interval) : undefined;
    const checkoutAmount = checkoutPrice ? scaledMinor(checkoutPrice, checkoutMultiplier) : 0;

    const checkoutSummary =
        checkoutPlan && checkoutPrice
            ? {
                  ...labelFor(checkoutPlan, locale),
                  price: providerId === "moresia-stripe" ? { ...checkoutPrice, billingMethod: "recurring" as const } : checkoutPrice,
                  amount: checkoutAmount,
                  credits: scaledQuantity(checkoutPrice, catalogCredits(checkoutPrice), checkoutMultiplier),
              }
            : undefined;

    const checkout = async () => {
        if (!checkoutPlan || !checkoutPrice || !providerId) return;
        setBusy(true);
        try {
            const quote = await quoteSubscription({ revisionId: checkoutPlan.revision.id, priceId: checkoutPrice.id, multiplierBasisPoints: checkoutMultiplier, currency: checkoutPrice.currency });
            const result = await checkoutSubscription({ revisionId: checkoutPlan.revision.id, priceId: checkoutPrice.id, providerId, idempotencyKey: idempotencyKey(), multiplierBasisPoints: quote.multiplierBasisPoints || checkoutMultiplier, locale });
            setPendingPayment({ id: result.checkout.paymentId, mode: result.checkout.checkout.mode, value: result.checkout.checkout.value, status: result.checkout.status });
            setCheckoutOpen(false);
            if (result.checkout.status === "paid") return;
            if (result.checkout.session) {
                setPaymentSession(result.checkout.session);
                return;
            }
            const target = result.checkout.checkout.value;
            if (result.checkout.checkout.mode === "redirect" && target) {
                if (target.startsWith("data:text/html;base64,")) {
                    const html = atob(target.slice("data:text/html;base64,".length));
                    window.location.assign(URL.createObjectURL(new Blob([html], { type: "text/html" })));
                } else window.location.assign(target);
            } else message.info(target || "请按照支付渠道提示完成付款");
        } catch (error) {
            message.error(error instanceof Error ? error.message : "创建订阅订单失败");
        } finally {
            setBusy(false);
        }
    };
    if (loading)
        return (
            <div className="flex min-h-[60vh] items-center justify-center">
                <Spin tip={t.loading} />
            </div>
        );
    const comparisonCodes = Array.from(
        new Set(comparisonPlans.flatMap((plan) => [...plan.modelRules.map((rule) => String(rule.logicalModelCode || "")), ...(comparisonQuotes[plan.plan.code] || []).map((quote) => quote.logicalModelCode)]).filter(Boolean)),
    );
    const comparisonModelRule = (plan: SubscriptionPlan | undefined, code: string) => plan?.modelRules.find((rule) => String(rule.logicalModelCode || "") === code);
    const comparisonCount = (plan: SubscriptionPlan, code: string) => {
        const quote = comparisonQuotes[plan.plan.code]?.find((item) => item.logicalModelCode === code);
        if (quote?.displayable && quote.estimatedGenerationCount >= 0) return quote.estimatedGenerationCount;
        return null;
    };

    return (
        <WorkspacePage className="subscription-page" fluid>
            <div className="subscription-shell">
                <header className="subscription-topbar">
                    <div className="subscription-topbar-group">
                        <div className="subscription-billing-toggle" aria-label={t.month}>
                            <button type="button" className={`subscription-segment${interval === "month" ? " is-active" : ""}`} onClick={() => setInterval("month")}>
                                {t.month}
                            </button>
                            <button type="button" className={`subscription-segment${interval === "year" ? " is-active" : ""}`} onClick={() => setInterval("year")}>
                                {t.year}
                            </button>
                            <button type="button" className="subscription-action" onClick={() => openWorkspaceWallet()}>
                                <WalletCards />
                                {t.creditsTopup}
                            </button>
                        </div>
                        <div className="subscription-audience-toggle" aria-label={t.individual}>
                            <button type="button" className={`subscription-segment${audience === "individual" ? " is-active" : ""}`} onClick={() => setAudience("individual")}>
                                <UserRound className="mr-1 inline size-4" />
                                {t.individual}
                            </button>
                            {plans.some((plan) => plan.plan.audience === "team") && (
                                <button type="button" className={`subscription-segment${audience === "team" ? " is-active" : ""}`} onClick={() => setAudience("team")}>
                                    <Users className="mr-1 inline size-4" />
                                    {t.team}
                                </button>
                            )}
                        </div>
                    </div>
                    <div className="subscription-actions">
                        <select className="subscription-currency" value={providerId} aria-label={t.provider} onChange={(event) => setProviderId(event.target.value)}>
                            {providers.length === 0 ? (
                                <option value="">{t.currency}</option>
                            ) : (
                                providers.map((provider) => (
                                    <option key={provider.id} value={provider.id}>
                                        {tr(provider.name)}
                                    </option>
                                ))
                            )}
                        </select>
                        <button type="button" className="subscription-support">
                            <CircleHelp className="mr-1 inline size-4" />
                            {t.support}
                        </button>
                    </div>
                </header>

                {visiblePlans.length === 0 ? (
                    <p>{t.noPlan}</p>
                ) : (
                    <section className="subscription-plan-grid">
                        {visiblePlans.map((plan) => {
                            const price = priceFor(plan, interval);
                            if (!price) return null;
                            const selected = multipliers[plan.plan.code] || price.minMultiplierBasisPoints || 10000;
                            return (
                                <SubscriptionPlanCard
                                    key={plan.revision.id}
                                    plan={plan}
                                    interval={interval}
                                    locale={locale}
                                    multiplier={selected}
                                    choices={multiplierOptions(price)}
                                    onMultiplier={(value) => setMultipliers((current) => ({ ...current, [plan.plan.code]: value }))}
                                    onCheckout={() => openCheckout(plan, selected)}
                                />
                            );
                        })}
                    </section>
                )}

                {pendingPayment?.mode === "qr_code" && pendingPayment.value ? (
                    <section className="subscription-section flex justify-center">
                        <div className="subscription-benefit-panel text-center">
                            <QRCode value={pendingPayment.value} status={pendingPayment.status === "paid" ? "scanned" : undefined} />
                            <p className="m-0 mt-3 text-sm text-white/65">{pendingPayment.status === "paid" ? t.paid : t.scan}</p>
                        </div>
                    </section>
                ) : null}
                <section className="subscription-section subscription-comparison-section">
                    {priceComparisons
                        .filter((comparison) => !isFeatureComparison(comparison.code))
                        .map((comparison) => (
                            <div key={comparison.id} className="subscription-price-comparison-block">
                                <h2 className="subscription-section-title">{comparisonLocale(comparison, locale, "title")}</h2>
                                <p className="subscription-comparison-subtitle">{comparisonLocale(comparison, locale, "subtitle")}</p>
                                <div className="subscription-price-comparison-card">
                                    <div className="subscription-comparison-scroll">
                                        <table className="subscription-price-comparison-table">
                                            <thead>
                                                <tr>
                                                    <th />
                                                    {comparison.columns.map((column) => (
                                                        <th key={column.id} className={column.featured ? "is-highlighted" : ""}>
                                                            <strong>{comparisonColumnLocale(column, locale, "name")}</strong>
                                                            <small>{comparisonColumnLocale(column, locale, "tagline")}</small>
                                                        </th>
                                                    ))}
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {Array.from(new Set(comparison.columns.flatMap((column) => column.rows.map((row) => row.code)))).map((rowCode) => {
                                                    const first = comparison.columns.flatMap((column) => column.rows).find((row) => row.code === rowCode);
                                                    return (
                                                        <tr key={rowCode}>
                                                            <th className="subscription-comparison-label">{first ? comparisonRowLocale(first, locale, "label") : rowCode}</th>
                                                            {comparison.columns.map((column) => {
                                                                const row = column.rows.find((item) => item.code === rowCode);
                                                                return (
                                                                    <td key={column.id} className={column.featured ? "is-highlighted" : ""}>
                                                                        {row ? comparisonRowLocale(row, locale, "value") : "—"}
                                                                    </td>
                                                                );
                                                            })}
                                                        </tr>
                                                    );
                                                })}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            </div>
                        ))}
                    {featureComparison ? (
                        <SubscriptionFeatureTable
                            table={featureComparison}
                            plans={plans}
                            interval={interval}
                            setInterval={setInterval}
                            locale={locale}
                            multipliers={multipliers}
                            setMultiplier={(code, value) => setMultipliers((current) => ({ ...current, [code]: value }))}
                        />
                    ) : (
                        <>
                            <h2 className="subscription-section-title subscription-comparison-detail-title">{t.compareAll}</h2>
                            <div className="subscription-comparison-card">
                                <div className="subscription-comparison-scroll">
                                    <table className="subscription-comparison-table">
                                        <thead>
                                            <tr>
                                                <th className="subscription-comparison-label">{t.compareAll}</th>
                                                {comparisonPlans.map((plan) => {
                                                    const price = priceFor(plan, interval);
                                                    const selected = multipliers[plan.plan.code] || price?.minMultiplierBasisPoints || 10000;
                                                    return (
                                                        <th key={plan.plan.code} className={plan.plan.featured ? "is-highlighted" : ""}>
                                                            <strong>{labelFor(plan, locale).name}</strong>
                                                            <small>{price ? `${money(interval === "year" ? Math.round(scaledMinor(price, selected) / 12) : scaledMinor(price, selected), price.currency, locale)} / ${t.perMonth}` : "—"}</small>
                                                        </th>
                                                    );
                                                })}
                                            </tr>
                                            <tr className="subscription-comparison-price-row">
                                                <th className="subscription-comparison-label">{t.perMonth}</th>
                                                {comparisonPlans.map((plan) => {
                                                    const price = priceFor(plan, interval);
                                                    const selected = multipliers[plan.plan.code] || price?.minMultiplierBasisPoints || 10000;
                                                    const monthly = price ? (interval === "year" ? Math.round(scaledMinor(price, selected) / 12) : scaledMinor(price, selected)) : 0;
                                                    return (
                                                        <td key={plan.plan.code} className={plan.plan.featured ? "is-highlighted" : ""}>
                                                            <strong>{price ? money(monthly, price.currency, locale) : "—"}</strong>
                                                            {interval === "year" ? (
                                                                <small>
                                                                    {t.annualAccount} {price ? money(scaledMinor(price, selected), price.currency, locale) : "—"}
                                                                </small>
                                                            ) : null}
                                                        </td>
                                                    );
                                                })}
                                            </tr>
                                            <tr className="subscription-comparison-multiplier-row">
                                                <th className="subscription-comparison-label">{t.multiplier}</th>
                                                {comparisonPlans.map((plan) => {
                                                    const price = priceFor(plan, interval);
                                                    const selected = multipliers[plan.plan.code] || price?.minMultiplierBasisPoints || 10000;
                                                    return (
                                                        <td key={plan.plan.code} className={plan.plan.featured ? "is-highlighted" : ""}>
                                                            <div className="subscription-multiplier subscription-comparison-multiplier">
                                                                {price
                                                                    ? multiplierOptions(price).map((choice) => (
                                                                          <button key={choice} type="button" className={choice === selected ? "is-active" : ""} onClick={() => setMultipliers((current) => ({ ...current, [plan.plan.code]: choice }))}>
                                                                              {choice / 10000}×
                                                                          </button>
                                                                      ))
                                                                    : null}
                                                                <button type="button" className="is-edit" aria-label={t.multiplier} onClick={() => openCheckout(plan, selected)}>
                                                                    <Pencil className="inline size-4" />
                                                                </button>
                                                            </div>
                                                        </td>
                                                    );
                                                })}
                                            </tr>
                                        </thead>
                                        <tbody>
                                            <tr className="subscription-comparison-group">
                                                <th>额度</th>
                                                {comparisonPlans.map((plan) => (
                                                    <td key={plan.plan.code} />
                                                ))}
                                            </tr>
                                            <tr>
                                                <th className="subscription-comparison-label">{t.credits}</th>
                                                {comparisonPlans.map((plan) => {
                                                    const price = priceFor(plan, interval);
                                                    const selected = multipliers[plan.plan.code] || price?.minMultiplierBasisPoints || 10000;
                                                    return (
                                                        <td key={plan.plan.code} className={plan.plan.featured ? "is-highlighted" : ""}>
                                                            <strong>{scaledQuantity(price, catalogCredits(price), selected).toLocaleString(locale)}</strong> {interval === "year" && price?.creditDeliveryMode === "upfront" ? t.perYear : t.perMonth}
                                                        </td>
                                                    );
                                                })}
                                            </tr>
                                            <tr className="subscription-comparison-group">
                                                <th>模型</th>
                                                {comparisonPlans.map((plan) => (
                                                    <td key={plan.plan.code} />
                                                ))}
                                            </tr>
                                            {comparisonCodes.map((code) => (
                                                <tr key={code}>
                                                    <th className="subscription-comparison-label">
                                                        <span>{modelName(code, locale)}</span>
                                                        <small>
                                                            {modelMeta(
                                                                comparisonModelRule(
                                                                    comparisonPlans.find((plan) => comparisonModelRule(plan, code)),
                                                                    code,
                                                                ) || {},
                                                                locale,
                                                            )}
                                                        </small>
                                                    </th>
                                                    {comparisonPlans.map((plan) => {
                                                        const price = priceFor(plan, interval);
                                                        const selected = multipliers[plan.plan.code] || price?.minMultiplierBasisPoints || 10000;
                                                        const count = comparisonCount(plan, code);
                                                        const rule = comparisonModelRule(plan, code);
                                                        return (
                                                            <td key={plan.plan.code} className={plan.plan.featured ? "is-highlighted" : ""}>
                                                                {rule && count != null ? (
                                                                    <>
                                                                        <strong>{Math.max(0, Math.round(count * (price?.multiplierPriceMode === "linear" ? selected / 10000 : 1))).toLocaleString(locale)}</strong> 次生成
                                                                    </>
                                                                ) : (
                                                                    "—"
                                                                )}
                                                            </td>
                                                        );
                                                    })}
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </>
                    )}
                </section>
                <section className="subscription-section">
                    <h2 className="subscription-section-title">{t.faq}</h2>
                    <div className="subscription-faq-grid">
                        {faqs.length > 0 ? (
                            faqs.map((faq) => (
                                <details key={faq.id} className="subscription-faq-item">
                                    <summary>
                                        {faq.question}
                                        <ChevronDown className="size-4" />
                                    </summary>
                                    <div className="subscription-faq-answer">{faq.answer}</div>
                                </details>
                            ))
                        ) : (
                            <p>{t.noFaq}</p>
                        )}
                    </div>
                </section>
            </div>

            <SubscriptionCheckoutDialog
                open={checkoutOpen}
                summary={checkoutSummary}
                multiplier={checkoutMultiplier}
                onMultiplierChange={setCheckoutMultiplier}
                providers={providers}
                providerId={providerId}
                onProviderChange={setProviderId}
                busy={busy}
                onClose={() => setCheckoutOpen(false)}
                onContinue={() => void checkout()}
            />
            <SubscriptionPaymentDialog session={paymentSession} summary={checkoutSummary} paymentId={pendingPayment?.id} onClose={() => setPaymentSession(undefined)} />
        </WorkspacePage>
    );
}
