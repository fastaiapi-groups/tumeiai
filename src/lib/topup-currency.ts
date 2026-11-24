/** Prices are stored in minor currency units. Never convert between currencies. */
export type TopupCurrency = "USD" | "GBP" | "CNY" | "EUR" | "JPY" | "KRW";
export const topupCurrencyOptions = ["USD", "GBP", "CNY", "EUR", "JPY", "KRW"].map((value) => ({ value, label: value }));
export function topupCurrencyScale(currency = "CNY") {
    return currency === "JPY" || currency === "KRW" ? 1 : 100;
}
export function formatTopupMoney(amount: number, currency = "CNY", locale = "zh-CN") {
    return new Intl.NumberFormat(locale, { style: "currency", currency, currencyDisplay: "code" }).format(amount / topupCurrencyScale(currency));
}

export function topupSupportsMethod(currency: string | undefined, method: string) {
    return method !== "cashapp" || currency === "USD";
}
