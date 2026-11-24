// tumeiai: 短剧设定本体删除接口。
import { compactApiParams, http } from "@/services/api/request";

/** 仍引用某个设定（含其造型）的剧情段；segmentIndex 从 0 开始。 */
export type DramaCastReferenceTumeiai = {
    episodeId: string;
    episodeNumber: number;
    episodeTitle: string;
    segmentIndex: number;
    /** 该段已有生成的视频，移除引用后需要重新生成。 */
    hasVideo: boolean;
};

export function listDramaCastReferencesTumeiai(projectId: string, castId: string, signal?: AbortSignal) {
    return http.get<{ references: DramaCastReferenceTumeiai[] }>(`/dramas/${encodeURIComponent(projectId)}/cast/${encodeURIComponent(castId)}/references`, { signal });
}

/**
 * 删除设定本体及其造型。仍被剧情段引用时：detachReferences=false 后端拒绝；
 * detachReferences=true 先从镜头与剧情段参考里移除再删除，受影响的段提示词与视频标记过期。
 */
export function deleteDramaCastTumeiai(projectId: string, castId: string, detachReferences = false) {
    return http.delete<{ id: string; deletedLooks: number; affectedSegments: number }>(`/dramas/${encodeURIComponent(projectId)}/cast/${encodeURIComponent(castId)}`, {
        params: compactApiParams({ detachReferences: detachReferences ? "true" : undefined }),
    });
}
