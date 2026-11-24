import { UI_LOCALE } from "./ui-text";

export function formatDateTime(value: string, locale = UI_LOCALE) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "--";
    return new Intl.DateTimeFormat(locale, { year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hour12: false }).format(date).replaceAll("/", "-");
}

export function relativeTime(value: string, locale = UI_LOCALE) {
    const timestamp = new Date(value).getTime();
    if (!Number.isFinite(timestamp)) return "--";
    const seconds = Math.max(0, Math.floor((Date.now() - timestamp) / 1000));
    const format = new Intl.RelativeTimeFormat(locale, { numeric: "auto" });
    if (seconds < 60) return format.format(0, "second");
    if (seconds < 3600) return format.format(-Math.floor(seconds / 60), "minute");
    if (seconds < 86400) return format.format(-Math.floor(seconds / 3600), "hour");
    if (seconds < 86400 * 7) return format.format(-Math.floor(seconds / 86400), "day");
    return format.format(-Math.floor(seconds / (86400 * 7)), "week");
}
