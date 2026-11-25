// fastai: 短剧自定义画风编辑区，作品画风（创建页）与设定单独画风共用。纯逻辑在 lib/drama/custom-style-fastai.ts。
import { useRef, useState } from "react";
import { Input, Switch } from "antd";

import {
    CUSTOM_DRAMA_STYLE_ID_FASTAI,
    CUSTOM_STYLE_LIMITS_FASTAI,
    customDramaStyleIssueFastai,
    compileCustomDramaStyleFastai,
    isCustomDramaStyleFastai,
    parseCustomDramaStyleFastai,
    resolveDramaStyleFastai,
    seedCustomDramaStyleFastai,
    type DramaCustomStyleFastai,
} from "@/lib/drama/custom-style-fastai";
import { DEFAULT_DRAMA_STYLE_ID, findDramaStyle } from "@/lib/drama/drama-styles";

/**
 * 创建页的作品画风状态：开启时以当前预设 / 组合为起点，关闭时回到开启前的风格；
 * 在上方选任一预设或组合即自动退出自定义，填写内容保留，再次开启时继续编辑。
 */
export function useDramaCustomStyleFastai(styleId: string, setStyleId: (id: string) => void) {
    const [custom, setCustom] = useState<DramaCustomStyleFastai>();
    const previous = useRef(DEFAULT_DRAMA_STYLE_ID);
    const active = isCustomDramaStyleFastai(styleId);
    return {
        active,
        custom,
        setCustom,
        style: resolveDramaStyleFastai(styleId, custom),
        issue: active ? (custom ? customDramaStyleIssueFastai(custom) : "请填写自定义风格") : "",
        toggle(next: boolean) {
            if (next) {
                previous.current = styleId;
                if (!custom) setCustom(seedCustomDramaStyleFastai(findDramaStyle(styleId)));
                setStyleId(CUSTOM_DRAMA_STYLE_ID_FASTAI);
            } else setStyleId(findDramaStyle(previous.current) ? previous.current : DEFAULT_DRAMA_STYLE_ID);
        },
        /** 草稿回填：自定义画风只存了名称与提示词，按标签拆回各项。 */
        hydrate(savedStyleId: string | undefined, name: string | undefined, prompt: string | undefined) {
            if (!isCustomDramaStyleFastai(savedStyleId) || !prompt) return;
            setCustom(parseCustomDramaStyleFastai(name || "自定义风格", prompt));
            setStyleId(CUSTOM_DRAMA_STYLE_ID_FASTAI);
        },
    };
}

import "./style-custom-fastai.css";

const FIELDS: Array<{ key: Exclude<keyof DramaCustomStyleFastai, "name">; label: string; hint: string; placeholder: string }> = [
    { key: "medium", label: "表现形式", hint: "必填，决定画面怎么画", placeholder: "如：高品质 3D 动画渲染，卡通化建模，皮肤为平滑 3D 材质，柔和全局光照" },
    { key: "world", label: "题材场景", hint: "时代、地域与常见场景", placeholder: "如：现代都市，写字楼、公寓、街角咖啡馆" },
    { key: "look", label: "色彩光影", hint: "主色调与光线", placeholder: "如：暖橙与奶白为主，柔和逆光，低饱和" },
    { key: "wardrobe", label: "服化道", hint: "服装、妆发与道具", placeholder: "如：当代都市通勤装，妆发自然" },
    { key: "forbid", label: "避免", hint: "不希望出现的画面", placeholder: "如：真人照片质感、文字水印、畸形手指" },
];

export function DramaCustomStyleEditorFastai({
    active,
    value,
    onToggle,
    onChange,
    disabled = false,
    compact = false,
}: {
    active: boolean;
    value: DramaCustomStyleFastai | undefined;
    onToggle: (active: boolean) => void;
    onChange: (value: DramaCustomStyleFastai) => void;
    disabled?: boolean;
    compact?: boolean;
}) {
    const issue = active && value ? customDramaStyleIssueFastai(value) : "";
    const length = active && value ? compileCustomDramaStyleFastai(value).length : 0;
    return (
        <div className={`drama-custom-style${compact ? " is-compact" : ""}`} data-active={active || undefined}>
            <label className="drama-switch-label">
                <Switch size="small" checked={active} disabled={disabled} onChange={onToggle} aria-label="使用自定义风格" />
                <span>
                    <strong>自定义风格</strong>
                    {active ? null : <small>以当前所选风格为起点，逐项改写成自己的画风</small>}
                </span>
            </label>
            {active && value ? (
                <div className="drama-custom-style-body">
                    <label className="drama-custom-style-field">
                        <span>
                            风格名称 <small>显示在作品列表和设置里</small>
                        </span>
                        <Input
                            value={value.name}
                            maxLength={CUSTOM_STYLE_LIMITS_FASTAI.name}
                            disabled={disabled}
                            placeholder="如：暖调绘本 3D"
                            status={value.name.trim() ? undefined : "error"}
                            onChange={(event) => onChange({ ...value, name: event.target.value })}
                        />
                    </label>
                    {FIELDS.map((field) => (
                        <label key={field.key} className="drama-custom-style-field">
                            <span>
                                {field.label} <small>{field.hint}</small>
                            </span>
                            <Input.TextArea
                                value={value[field.key]}
                                maxLength={CUSTOM_STYLE_LIMITS_FASTAI[field.key]}
                                showCount
                                autoSize={{ minRows: field.key === "medium" ? 2 : 1, maxRows: 5 }}
                                disabled={disabled}
                                placeholder={field.placeholder}
                                status={field.key === "medium" && issue.startsWith("请写清表现形式") ? "error" : undefined}
                                onChange={(event) => onChange({ ...value, [field.key]: event.target.value })}
                            />
                        </label>
                    ))}
                    <p className={`drama-custom-style-status${issue ? " is-error" : ""}`} role="status">
                        {issue || `共 ${length} 字。只写长期不变的美术基线，画幅、构图和动作由作品设置与分镜决定。`}
                    </p>
                </div>
            ) : null}
        </div>
    );
}

type CastStyleValueFastai = { imageStyleId?: string; imageStyleName?: string; imageStylePrompt?: string };

/**
 * 设定单独画风里的自定义风格（如穿越、梦境等与作品画风不同的造型）。各项在本地编辑，
 * 每次修改拼成提示词写回设定的 imageStyleName / imageStylePrompt，imageStyleId 记为 custom。
 */
export function CastCustomStyleFastai({ value, onChange, disabled = false }: { value: CastStyleValueFastai; onChange: (patch: Required<CastStyleValueFastai>) => void; disabled?: boolean }) {
    const active = isCustomDramaStyleFastai(value.imageStyleId);
    const [fields, setFields] = useState<DramaCustomStyleFastai | undefined>(() => (active ? parseCustomDramaStyleFastai(value.imageStyleName || "", value.imageStylePrompt || "") : undefined));
    const previous = useRef(DEFAULT_DRAMA_STYLE_ID);
    const emit = (next: DramaCustomStyleFastai) => {
        setFields(next);
        onChange({ imageStyleId: CUSTOM_DRAMA_STYLE_ID_FASTAI, imageStyleName: next.name.trim(), imageStylePrompt: compileCustomDramaStyleFastai(next) });
    };
    const toggle = (next: boolean) => {
        if (next) {
            previous.current = value.imageStyleId || DEFAULT_DRAMA_STYLE_ID;
            emit(fields || seedCustomDramaStyleFastai(findDramaStyle(previous.current)));
            return;
        }
        const style = findDramaStyle(previous.current) || findDramaStyle(DEFAULT_DRAMA_STYLE_ID)!;
        onChange({ imageStyleId: style.id, imageStyleName: style.name, imageStylePrompt: style.prompt });
    };
    return <DramaCustomStyleEditorFastai active={active} value={fields} onToggle={toggle} onChange={emit} disabled={disabled} compact />;
}
