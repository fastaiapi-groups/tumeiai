// fastai: 短剧制作预设（三个文字步骤的写作技能 + 参考图方案 + 分镜切段规则），后端见 app/drama_preset_fastai.go。
import { http } from "./request";
import type { DramaAssetSettings, DramaSegmentMode, DramaSkillRef } from "./drama";

export type DramaPresetFastai = {
    id: string;
    name: string;
    description: string;
    skills: { bible?: DramaSkillRef; script?: DramaSkillRef; prompt?: DramaSkillRef };
    assets: DramaAssetSettings;
    storyboard: { segmentMode: DramaSegmentMode; segmentMaxShots: number };
    /** 当前用户用不了预设里的技能（没有技能库权限或技能已下架），只能套用参考图与分镜规则。 */
    skillsUnavailable?: boolean;
};

export function getDramaPresetsFastai() {
    return http.get<DramaPresetFastai[]>("/dramas/presets");
}
