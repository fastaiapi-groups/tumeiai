import { uiText } from "@/lib/ui-text";
import { groupModelsByDisplayName, isDirectSystemModel, type DisplayModelGroup, type ModelRequirements } from "@/lib/model-selection";
import { modelIcon, modelOptionName, PUBLIC_MODEL_CATALOG_ID, resolveModelChannel, type AiConfig } from "@/stores/use-config-store";

export type ModelPickerGroup = {
    key: string;
    label: string;
    icon: string;
    scope: string;
    kind: "product" | "channel";
    models: DisplayModelGroup[];
};

export { isDirectSystemModel } from "@/lib/model-selection";

export function modelPickerRequirements(requirements?: ModelRequirements): ModelRequirements | undefined {
    if (!requirements) return undefined;
    const input = requirements.input;
    const emptyVideoInput = requirements.capability === "video" && input && !input.imageCount && !input.characterCount && !input.videoCount && !input.audioCount;
    // 允许先选参考专用型号，再按该型号的限制添加素材；提交仍检查完整输入合同。
    return { ...requirements, input: emptyVideoInput ? undefined : input, videoSeconds: undefined, imageSize: undefined, options: undefined };
}

export function modelChannelLabel(config: AiConfig, value: string) {
    const channel = resolveModelChannel(config, value);
    const cost = channel.modelCosts?.find((item) => item.model === modelOptionName(value));
    if (channel.scope === "system") return cost?.channelLabel?.trim() || modelOptionName(value);
    return cost?.channelLabel?.trim() || channel.name || "未命名渠道";
}

type ProductFamily = { key: string; label: string; variant: string; standard: boolean };

function productFamily(label: string): ProductFamily | undefined {
    const h3 = /^(?:minimax[\s_-]*)?h3(?:[\s_-]+(.+))?$/i.exec(label);
    if (h3) {
        const edition = h3[1]?.trim();
        return { key: "minimax-h3", label: "MiniMax H3", variant: edition ? (/^u(?:24|32)$/i.test(edition) ? edition.toUpperCase() : edition) : "H3 标准", standard: !edition };
    }
    const versioned = /^(seedance|ltx|wan)[\s_-]*(\d+(?:\.\d+)*)(?:[\s_-]+(.+))?$/i.exec(label);
    if (!versioned) return undefined;
    const brand = versioned[1].toLowerCase();
    const version = brand === "seedance" && !versioned[2].includes(".") ? `${versioned[2]}.0` : versioned[2];
    const name = brand === "seedance" ? "Seedance" : brand === "ltx" ? "LTX" : "Wan";
    return { key: `${brand}-${version}`, label: `${name} ${version}`, variant: versioned[3] ? versioned[3].trim() : "标准版", standard: !versioned[3] };
}

function familyVariantLabel(config: AiConfig, value: string, displayName: string, family: ProductFamily) {
    const channel = resolveModelChannel(config, value);
    const label = channel.modelCosts?.find((item) => item.model === modelOptionName(value))?.channelLabel?.trim();
    const normalized = (text: string) => text.toLowerCase().replace(/[\s_-]+/g, "");
    if (!label || normalized(label) === normalized(displayName) || normalized(label) === normalized(family.variant) || label === "平台服务" || label === "Platform service") return family.variant;
    if (family.key === "minimax-h3" && family.standard) return label;
    return `${family.variant} · ${label}`;
}

// 一级合并同一模型系列；二级保留每个版本/渠道的完整选项 ID，不混用能力与报价。
export function groupModelsForPicker(config: AiConfig, options: string[]): ModelPickerGroup[] {
    const groups = new Map<string, ModelPickerGroup>();
    for (const channel of config.channels) {
        const models = options.filter((value) => resolveModelChannel(config, value).id === channel.id);
        const directModels = models.filter((value) => isDirectSystemModel(config, value));
        for (const value of directModels) {
            const cost = channel.modelCosts?.find((item) => item.model === modelOptionName(value));
            const displayName = cost?.displayName?.trim() || "未分类";
            const family = productFamily(displayName);
            const label = family?.label || displayName;
            const key = JSON.stringify(family ? ["product", "family", family.key] : ["product", label]);
            let group = groups.get(key);
            if (!group) {
                group = { key, label, icon: modelIcon(config, value), scope: "平台服务", kind: "product", models: [] };
                groups.set(key, group);
            }
            if (family) {
                group.models.push({ key: value, label: familyVariantLabel(config, value, displayName, family), models: [value] });
                continue;
            }
            const channelGroup = group.models.find((item) => item.key === channel.id);
            if (channelGroup) {
                channelGroup.models.push(value);
                channelGroup.label = channel.name || "未命名渠道";
            } else {
                group.models.push({ key: channel.id, label: modelChannelLabel(config, value), models: [value] });
            }
        }
        const otherModels = models.filter((value) => !isDirectSystemModel(config, value));
        if (otherModels.length) {
            const key = JSON.stringify(["channel", channel.id]);
            groups.set(key, {
                key,
                label: channel.scope === "system" ? "系统模型" : channel.name || "未命名渠道",
                icon: modelIcon(config, otherModels[0]),
                scope: channel.id === PUBLIC_MODEL_CATALOG_ID ? "" : "我的模型",
                kind: "channel",
                models: groupModelsByDisplayName(config, otherModels),
            });
        }
    }
    return Array.from(groups.values());
}

export function modelVariantLabel(config: AiConfig, value: string, index: number) {
    const channel = resolveModelChannel(config, value);
    const label = modelChannelLabel(config, value);
    const prefix = `${channel.name} · `;
    return label.startsWith(prefix) ? label.slice(prefix.length) : label === channel.name ? `型号 ${index + 1}` : label;
}
