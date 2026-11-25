// fastai: 短剧自定义画风。
// 用户按预设同样的五项（表现形式、题材场景、色彩光影、服化道、禁止）填写，拼成与预设同格式的画风提示词，
// 后端照常把它当作作品或设定的画风文字使用，不新增接口和字段。持久化只有 styleId=custom、名称与提示词，
// 回到编辑时按标签把提示词拆回五项。

import { findDramaStyle, type DramaStyle } from "./drama-styles";

export const CUSTOM_DRAMA_STYLE_ID_FASTAI = "custom";

export type DramaCustomStyleFastai = { name: string; medium: string; world: string; look: string; wardrobe: string; forbid: string };

type Field = Exclude<keyof DramaCustomStyleFastai, "name">;

/** 每项上限加标签合计不超过后端作品画风的 1200 字。 */
export const CUSTOM_STYLE_LIMITS_FASTAI: Record<keyof DramaCustomStyleFastai, number> = { name: 20, medium: 280, world: 240, look: 240, wardrobe: 240, forbid: 160 };

const LABELS: Array<[Field, string]> = [
    ["medium", "表现形式："],
    ["world", "题材场景："],
    ["look", "色彩光影："],
    ["wardrobe", "服化道："],
    ["forbid", "禁止："],
];

const clean = (text: string) =>
    text
        .replace(/\s+/g, " ")
        .replace(/[。；;，,\s]+$/, "")
        .trim();

export function isCustomDramaStyleFastai(id: string | undefined) {
    return id === CUSTOM_DRAMA_STYLE_ID_FASTAI;
}

export function compileCustomDramaStyleFastai(style: DramaCustomStyleFastai): string {
    return LABELS.flatMap(([field, label]) => {
        const text = clean(style[field]);
        return text ? [label + text] : [];
    }).join("。");
}

/** 按标签拆回五项；预设提示词开头没有“表现形式：”，标签前的文字都算表现形式。 */
export function parseCustomDramaStyleFastai(name: string, prompt: string): DramaCustomStyleFastai {
    const result: DramaCustomStyleFastai = { name: name.trim(), medium: "", world: "", look: "", wardrobe: "", forbid: "" };
    const marks = LABELS.slice(1)
        .map(([field, label]) => ({ field, label, index: prompt.indexOf(label) }))
        .filter((mark) => mark.index >= 0)
        .sort((a, b) => a.index - b.index);
    const head = marks.length ? prompt.slice(0, marks[0].index) : prompt;
    result.medium = clean(head.replace(/^\s*表现形式：/, ""));
    marks.forEach((mark, i) => {
        result[mark.field] = clean(prompt.slice(mark.index + mark.label.length, marks[i + 1]?.index ?? prompt.length));
    });
    return result;
}

/** 以当前所选风格为起点，用户只改想改的项。 */
export function seedCustomDramaStyleFastai(base: DramaStyle | undefined): DramaCustomStyleFastai {
    if (!base) return { name: "自定义风格", medium: "", world: "", look: "", wardrobe: "", forbid: "" };
    const { medium, world, look, wardrobe, forbid } = base.detail;
    return { name: `${base.name}（改）`.slice(0, CUSTOM_STYLE_LIMITS_FASTAI.name), medium, world, look, wardrobe, forbid };
}

/** 返回第一个需要用户处理的问题；没有问题返回空串。 */
export function customDramaStyleIssueFastai(style: DramaCustomStyleFastai): string {
    if (!style.name.trim()) return "请填写自定义风格的名称";
    if (clean(style.medium).length < 4) return "请写清表现形式，例如“3D 动画渲染”“真人实拍”“水彩手绘”";
    for (const [field, label] of LABELS) {
        if (style[field].length > CUSTOM_STYLE_LIMITS_FASTAI[field]) return `${label.slice(0, -1)}超过 ${CUSTOM_STYLE_LIMITS_FASTAI[field]} 字`;
    }
    return "";
}

/** 统一取风格的名称与提示词：自定义风格按填写内容，其余按内置目录。自定义内容不完整时返回空。 */
export function resolveDramaStyleFastai(id: string, custom: DramaCustomStyleFastai | undefined): { name: string; prompt: string } | undefined {
    if (!isCustomDramaStyleFastai(id)) return findDramaStyle(id);
    if (!custom || customDramaStyleIssueFastai(custom)) return undefined;
    return { name: custom.name.trim(), prompt: compileCustomDramaStyleFastai(custom) };
}
