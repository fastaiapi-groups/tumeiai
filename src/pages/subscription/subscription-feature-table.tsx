import { Fragment } from "react";
import type { SubscriptionPlan, SubscriptionPriceComparison } from "@/services/api/subscriptions";
import { comparisonText, featureComparisonRows, featureComparisonValue } from "@/lib/subscription-feature-comparison";
import { catalogPrice } from "./subscription-catalog";
import { supportedComparisonColumns } from "./subscription-supported-comparison";
import { useFeatureDisclosure } from "./subscription-feature-disclosure";
import "./subscription-feature-table.css";

const groups: Record<string, string> = {
    Credits: "积分",
    "Video Models": "视频模型",
    "Image Models": "图片模型",
    "AI Avatars": "AI 数字人",
    "Video Agent": "视频智能体",
    Support: "支持",
    "Processing & Features": "处理与功能",
};
function Lines({ text, label = false }: { text: string; label?: boolean }) {
    const lines = text.split("\n").filter(Boolean);
    if (text === "Yes" || text === "No")
        return (
            <span aria-label={text === "Yes" ? "支持" : "不支持"} className={text === "Yes" ? "feature-yes" : "feature-no"}>
                {text === "Yes" ? "✓" : "—"}
            </span>
        );
    return (
        <>
            {(label && lines.length > 1 ? [lines[0], lines.slice(1).join(" ")] : lines).map((line, index) => (
                <span key={index} className={/%\s*OFF/.test(line) ? "feature-discount" : index ? "feature-detail" : "feature-primary"}>
                    {line}
                </span>
            ))}
        </>
    );
}
export function SubscriptionFeatureTable({
    table,
    plans,
    interval,
    setInterval,
    locale,
    multipliers,
    setMultiplier,
}: {
    table: SubscriptionPriceComparison;
    plans: SubscriptionPlan[];
    interval: "month" | "year";
    setInterval: (value: "month" | "year") => void;
    locale: string;
    multipliers: Record<string, number>;
    setMultiplier: (code: string, value: number) => void;
}) {
    const { rows, id, ref, toggle } = useFeatureDisclosure(featureComparisonRows(table), locale);
    const columns = supportedComparisonColumns(table, plans);
    const money = (amount: number, currency: string) => new Intl.NumberFormat(locale, { style: "currency", currency, maximumFractionDigits: 2 }).format(amount / 100);
    return (
        <div className="subscription-feature-table">
            <h2 className="subscription-section-title subscription-comparison-detail-title">{comparisonText(table, "title", locale)}</h2>
            <p className="subscription-comparison-subtitle">{comparisonText(table, "subtitle", locale)}</p>
            <div className="subscription-comparison-card" ref={ref}>
                <div className="subscription-comparison-scroll" id={id}>
                    <table className="subscription-comparison-table">
                        <thead>
                            <tr>
                                <th>
                                    <div className="subscription-billing-toggle">
                                        {(["month", "year"] as const).map((value) => (
                                            <button type="button" key={value} aria-pressed={interval === value} className={`subscription-segment${interval === value ? " is-active" : ""}`} onClick={() => setInterval(value)}>
                                                {value === "year" ? "年付" : "月付"}
                                            </button>
                                        ))}
                                    </div>
                                </th>
                                {columns.map((column) => {
                                    const plan = plans.find((item) => item.plan.code === column.code);
                                    const price = plan && catalogPrice(plan, interval);
                                    const multiplier = multipliers[column.code] || 10000;
                                    const amount = price ? Math.round(price.amountMinor * (price.multiplierPriceMode === "linear" ? multiplier / 10000 : 1)) : 0;
                                    const options: number[] = [];
                                    if (price) for (let value = price.minMultiplierBasisPoints || 10000; value <= (price.maxMultiplierBasisPoints || 10000) && options.length < 10; value += price.multiplierStepBasisPoints || 10000) options.push(value);
                                    return (
                                        <th key={column.code}>
                                            <strong>{comparisonText(column, "name", locale)}</strong>
                                            {price ? (
                                                <>
                                                    <div className="feature-price">
                                                        {price.listAmountMinor > price.amountMinor ? (
                                                            <del>{money(Math.round((price.listAmountMinor * (price.multiplierPriceMode === "linear" ? multiplier / 10000 : 1)) / (interval === "year" ? 12 : 1)), price.currency)}</del>
                                                        ) : null}
                                                        {money(Math.round(amount / (interval === "year" ? 12 : 1)), price.currency)}
                                                    </div>
                                                    <small>
                                                        {money(amount, price.currency)} · {interval === "year" ? "每年结算" : "每月结算"}
                                                        {plan?.plan.audience === "team" ? " / 席位" : ""}
                                                    </small>
                                                    <div className="subscription-multiplier subscription-comparison-multiplier">
                                                        {options.map((value) => (
                                                            <button key={value} type="button" aria-pressed={multiplier === value} className={multiplier === value ? "is-active" : ""} onClick={() => setMultiplier(column.code, value)}>
                                                                {value / 10000}×
                                                            </button>
                                                        ))}
                                                    </div>
                                                </>
                                            ) : (
                                                <small>—</small>
                                            )}
                                        </th>
                                    );
                                })}
                            </tr>
                        </thead>
                        <tbody>
                            {rows.map((row, index) => (
                                <Fragment key={row.code}>
                                    {index === 0 || rows[index - 1].category !== row.category ? (
                                        <tr className="subscription-comparison-group">
                                            <th colSpan={columns.length + 1}>{groups[row.category] || row.category}</th>
                                        </tr>
                                    ) : null}
                                    <tr data-feature-code={row.code}>
                                        <th className="subscription-comparison-label">
                                            <Lines text={comparisonText(row, "label", locale)} label />
                                        </th>
                                        {columns.map((column) => {
                                            const cell = column.rows.find((item) => item.code === row.code && item.enabled);
                                            const plan = plans.find((item) => item.plan.code === column.code);
                                            const price = plan && catalogPrice(plan, interval);
                                            const multiplier = price?.multiplierPriceMode === "linear" ? multipliers[column.code] || 10000 : 10000;
                                            let text = cell ? featureComparisonValue(cell, locale, multiplier) : "—";
                                            if (cell?.category === "Credits" && price?.includedMicrocredits !== undefined) text = text.replace(/^[\d,]+/, Math.round(((price.includedMicrocredits / 1_000_000) * multiplier) / 10000).toLocaleString(locale));
                                            return (
                                                <td key={column.code}>
                                                    <Lines text={text} />
                                                </td>
                                            );
                                        })}
                                    </tr>
                                </Fragment>
                            ))}
                        </tbody>
                    </table>
                </div>
                {toggle}
            </div>
        </div>
    );
}
