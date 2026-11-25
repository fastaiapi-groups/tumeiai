// tumeiai: MiniMax H3 算力来源只对 minimax-h3-xs 开放（自有显卡直连 Wrapper 的资源池型号为 minimax-h3-x）。
const XIANGONG_MODELS = new Set(["minimax-h3-xs"]);

/** 任一名称（型号 ID 或展示名）命中 minimax-h3-xs 即显示算力来源入口。 */
export function tumeiaiSupportsXiangong(...names: Array<string | undefined>) {
    return names.some((name) => {
        const normalized = (name || "").trim().toLowerCase();
        return XIANGONG_MODELS.has(normalized) || XIANGONG_MODELS.has(normalized.split("/").pop() || "");
    });
}

/** 仙宫云镜像 ID 为 UUID；留空表示默认镜像。 */
export function tumeiaiIsXiangongImageId(value: string) {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value.trim());
}

type TumeiaiXiangongImageMode = "relay" | "own";

export type TumeiaiXiangongImage = {
    /** 仙宫云镜像 ID；空字符串表示默认镜像。 */
    value: string;
    label: string;
    /** 可选的算力来源：只属于平台账号的镜像只能中转；社区镜像（含专用工作流镜像）两种来源都可用。 */
    modes: TumeiaiXiangongImageMode[];
    description?: string;
};

const MODE_LABEL: Record<TumeiaiXiangongImageMode, string> = { relay: "仅中转", own: "仅自有显卡" };

/** 与 Wrapper 的镜像清单（gpu_image_catalog.go 与内置模板）保持一致，名称为中文，值为镜像 ID。 */
export const TUMEIAI_XIANGONG_IMAGES: TumeiaiXiangongImage[] = [
    { value: "", label: "默认镜像", modes: ["relay", "own"], description: "平台默认 MiniMax H3 镜像" },
    { value: "a3175776-4cf2-4adf-a148-d0ca20792c83", label: "猪丫师兄 · MiniMax H3", modes: ["relay", "own"], description: "社区镜像，平台默认工作流" },
    { value: "6c731fb9-45ee-4a89-92b8-228007184783", label: "鹏哥 · 番茄漫剧 H3", modes: ["relay", "own"], description: "社区镜像，平台默认工作流" },
    { value: "8517a83f-a46c-4ed0-b529-4910d97bcf80", label: "花满楼 · MiniMax H3 体验版", modes: ["relay", "own"], description: "社区镜像，需 48G 显卡" },
    { value: "6ade1f36-2b22-4b87-afa7-af4c2e8a543c", label: "猴赛雷镜像 v3 · MiniMax H3", modes: ["relay", "own"], description: "社区镜像，文武双全一体化，支持首尾帧，24G 显卡可用" },
    { value: "b900441e-8c7e-4f00-bce6-bfe50ae47408", label: "H3 文戏 8 步（Pinggoo）", modes: ["relay", "own"], description: "专用工作流，参考图最多 9、音频 3、视频 3，合计 12" },
    { value: "76081786-f098-45a1-992d-209943cb073f", label: "H3 打斗优化 v1.5（Pingguo 双采）", modes: ["relay", "own"], description: "专用工作流，打斗动作优化，参考图最多 9、音频 3、视频 3，合计 12" },
];

export type TumeiaiXiangongImageOption = { value: string; label: string; disabled: boolean; description?: string };

/** 下拉选项：当前模式用不了的镜像置灰并注明；已保存但不在清单里的旧 ID 作为「自定义镜像」保留。 */
export function tumeiaiXiangongImageOptions(mode: TumeiaiXiangongImageMode, current: string): TumeiaiXiangongImageOption[] {
    const options = TUMEIAI_XIANGONG_IMAGES.map((image) => {
        const allowed = image.modes.includes(mode);
        const only = image.modes.length === 1 ? MODE_LABEL[image.modes[0]] : "";
        return { value: image.value, label: allowed ? image.label : `${image.label}（${only}）`, disabled: !allowed, description: image.description };
    });
    const saved = current.trim();
    if (saved && !TUMEIAI_XIANGONG_IMAGES.some((image) => image.value === saved)) {
        options.push({ value: saved, label: `自定义镜像 ${saved.slice(0, 8)}`, disabled: false, description: saved });
    }
    return options;
}

/** 镜像在该模式下是否可用；清单外的自定义镜像不拦截。 */
export function tumeiaiXiangongImageAllowed(mode: TumeiaiXiangongImageMode, value: string) {
    const known = TUMEIAI_XIANGONG_IMAGES.find((image) => image.value === value.trim());
    return !known || known.modes.includes(mode);
}
