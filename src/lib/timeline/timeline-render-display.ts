import { uiText } from "@/lib/ui-text";

/** Translate generated plan labels at display time without rewriting clip titles or the execution plan. */
export function timelineRenderStepLabel(description: string): string {
    const trim = /^裁切片段 (\d+)（([\s\S]*)）$/.exec(description);
    if (trim) return `裁切片段 ${trim[1]}（${trim[2]}）`;
    const gap = /^补黑场 ([\d.]+)s$/.exec(description);
    if (gap) return `补黑场 ${gap[1]}s`;
    return description;
}
