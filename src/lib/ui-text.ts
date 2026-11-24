export const UI_LOCALE = "zh-CN";

/** 中文展示文案中的命名占位符；不改变账号数据、模型参数或用户输入。 */
export function uiText(source: string, params?: Record<string, string | number>): string {
    return source.replace(/\{(\w+)\}/g, (placeholder, key: string) => String(params?.[key] ?? placeholder));
}

export const UI_TEXT = { locale: UI_LOCALE, t: uiText } as const;
