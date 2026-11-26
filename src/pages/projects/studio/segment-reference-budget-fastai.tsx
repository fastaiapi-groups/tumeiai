// fastai: 剧情段参考图名额。
// 段卡片显示“参考图 已发/可发”，可发张数取视频模型上限与“每段最多参考图”（默认 9 张）的较小值；
// 分镜板顶部汇总超出名额的段，未生成段视频时可按当前模型一键重新切段。
import { App, Button, Popconfirm } from "antd";
import { useMutation } from "@tanstack/react-query";
import { Images, Scissors } from "lucide-react";

import { AntTooltip as Tooltip } from "@/components/ui/base/tooltip/ant-tooltip";
import type { DramaCast, DramaSegment, DramaShot } from "@/services/api/drama";
import { resegmentDramaEpisodeFastai } from "@/services/api/drama-fastai";

import { mediaBusy } from "../drama-shared";
import { overflowReferencesTumeiai } from "./segment-references-tumeiai";
import { useDramaInvalidate } from "./use-studio";
import "./segment-reference-budget-fastai.css";

/** 段卡片上的参考图计数；有已就绪却发不出去的设定时标黄。 */
export function SegmentReferenceCountFastai({ segment, castById }: { segment: DramaSegment; castById: Map<string, DramaCast> }) {
    const { request } = segment;
    if (!request.operation || request.operation === "text_to_video" || request.referenceCapacity <= 0) return null;
    const sent = request.references.filter((ref) => ref.sent).length;
    const overflow = overflowReferencesTumeiai(segment, castById);
    const title = overflow.length
        ? `本段最多发送 ${request.referenceCapacity} 张参考图，${overflow.map((ref) => ref.name).join("、")} 按文字设定生成`
        : `本段最多发送 ${request.referenceCapacity} 张参考图${request.modelMaxImages ? `（模型上限 ${request.modelMaxImages} 张，含首帧）` : ""}`;
    return (
        <Tooltip title={title} mouseEnterDelay={0.3}>
            <span className={`drama-sg-refcount-fastai ${overflow.length ? "is-over" : ""}`} aria-label={`参考图 ${sent}/${request.referenceCapacity}`}>
                <Images className="size-3" aria-hidden />
                {sent}/{request.referenceCapacity}
            </span>
        </Tooltip>
    );
}

/** 分镜板顶部：本集有段超出参考图名额时提示，并提供按当前模型重新切段。 */
export function ReferenceOverflowBarFastai({ shots, segments, castById, busy }: { shots: DramaShot[]; segments: DramaSegment[]; castById: Map<string, DramaCast>; busy: boolean }) {
    const { message } = App.useApp();
    const projectId = shots[0]?.projectId || "";
    const episodeId = shots[0]?.episodeId || "";
    const invalidate = useDramaInvalidate(projectId);
    const resegment = useMutation({
        mutationFn: () => resegmentDramaEpisodeFastai(projectId, episodeId),
        onSuccess: (detail) => {
            invalidate(episodeId);
            message.success(detail.segments.length === segments.length ? "已按当前模型检查，切段无需调整" : `已重新切成 ${detail.segments.length} 段，段提示词将重新撰写`);
        },
        onError: (error) => {
            invalidate(episodeId);
            message.error(error instanceof Error ? error.message : "重新切段失败");
        },
    });
    const over = segments.filter((segment) => overflowReferencesTumeiai(segment, castById).length > 0);
    if (!over.length || !projectId) return null;
    const hasVideo = segments.some((segment) => segment.videoResourceId || mediaBusy(segment.videoStatus));
    const button = (
        <Button size="small" icon={<Scissors className="size-3.5" />} disabled={busy || hasVideo} loading={resegment.isPending}>
            按当前模型重新切段
        </Button>
    );
    return (
        <div className="drama-refbudget-bar-fastai" role="status">
            <span>
                本集 <b>{over.length}</b> 段超出参考图名额（第 {over.map((segment) => segment.index + 1).join("、")} 段），超出的设定按文字生成
            </span>
            {hasVideo ? (
                <Tooltip title="本集已有段视频，重新切段会作废它们；需要时请重新改编本集">
                    <span>{button}</span>
                </Tooltip>
            ) : (
                <Popconfirm title="按当前视频模型重新切段？" description="按模型能收的参考图张数重新拆分剧情段，段提示词会重新撰写，手动指定的段参考图需重新设置。" okText="重新切段" cancelText="取消" onConfirm={() => resegment.mutate()}>
                    {button}
                </Popconfirm>
            )}
        </div>
    );
}
