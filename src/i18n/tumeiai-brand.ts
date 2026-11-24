import type { Resource } from "i18next";

import { PLATFORM_BRAND_ZH } from "@/lib/platform-brand";

/** 把文案目录里的默认品牌名统一替换为本站品牌（PLATFORM_BRAND_ZH）。 */
export function applyTumeiaiBrand<T>(value: T): T {
    if (typeof value === "string") return value.replaceAll("TumeiAI", PLATFORM_BRAND_ZH) as T;
    if (Array.isArray(value)) return value.map((item) => applyTumeiaiBrand(item)) as T;
    if (value && typeof value === "object") return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, applyTumeiaiBrand(item)])) as T;
    return value;
}

export function tumeiaiBrandResources(resources: Resource): Resource {
    return applyTumeiaiBrand(resources);
}
