// fastai: 短剧本分支接口。
import type { DramaEpisodeDetail } from "./drama";
import { http } from "./request";

/** 按当前视频模型与“每段最多参考图”重新切分一集的剧情段；已有段视频的集会被拒绝。 */
export function resegmentDramaEpisodeFastai(projectId: string, episodeId: string) {
    return http.post<DramaEpisodeDetail>(`/dramas/${encodeURIComponent(projectId)}/episodes/${encodeURIComponent(episodeId)}/resegment`);
}
