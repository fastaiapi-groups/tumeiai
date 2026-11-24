// tumeiai: 让剧情段参考图的移除入口看得见。
// 上游只在「项目资产窗口」的卡片上用「已引用 ✓」按钮移除参考图，用户看不出能点；
// 名额不够（如接续段首帧占一张）时也没有一键处理多出来的设定。这里补上：
// 缩略图上的移除按钮、未附图提示条（逐个或一键移除超出上限的引用）、失败提示旁的快捷操作。
import type { ReactNode } from "react";
import { Button } from "antd";
import { PenLine, X } from "lucide-react";

import type { DramaCast, DramaSegment, DramaSegmentReferencePatch } from "@/services/api/drama";
import "./segment-references-tumeiai.css";

type Reference = DramaSegment["request"]["references"][number];

const REORDER_NOTE = "移除后参考图编号会变：模型撰写的提示词需重新撰写，手写提示词请核对正文里的“参考图N”。";

/** 去掉若干参考后的保存补丁；只提交受影响的字段，未动的列表保持服务端原样。 */
export function removeReferencesPatchTumeiai(segment: DramaSegment, removed: Reference[]): DramaSegmentReferencePatch {
    const refs = segment.request.references;
    const gone = new Set(removed);
    const patch: DramaSegmentReferencePatch = {};
    if (removed.some((ref) => ref.castId)) {
        patch.referenceCastIds = refs.filter((ref) => ref.castId && !gone.has(ref)).map((ref) => ref.castId);
    }
    if (removed.some((ref) => !ref.castId && ref.resourceId)) {
        patch.referenceImages = refs.filter((ref) => !ref.castId && ref.resourceId && !gone.has(ref)).map((ref) => ({ resourceId: ref.resourceId!, name: ref.name }));
    }
    return patch;
}

/** 图片已就绪却没随请求发送的参考：超出模型或每段上限，移除它们不会丢掉还在生成的设定。 */
export function overflowReferencesTumeiai(segment: DramaSegment, castById: Map<string, DramaCast>) {
    return segment.request.references.filter((ref) => {
        if (ref.sent) return false;
        if (!ref.castId) return Boolean(ref.resourceId);
        const cast = castById.get(ref.castId);
        return cast?.imageStatus === "ready" && Boolean(cast.imageResourceId);
    });
}

/** 本段参考缩略图外包一层，右上角放移除按钮（按钮不能嵌套，所以放在缩略图按钮旁边）。 */
export function RemovableReferenceTileTumeiai({ name, disabled, onRemove, children }: { name: string; disabled: boolean; onRemove: () => void; children: ReactNode }) {
    return (
        <div className="drama-reference-tile-tumeiai">
            {children}
            <button type="button" className="drama-reference-tile-remove-tumeiai" disabled={disabled} aria-label={`从本段移除${name}`} title={`从本段移除${name}`} onClick={onRemove}>
                <X className="size-3.5" />
            </button>
        </div>
    );
}

/** 「已引用」按钮在悬停或键盘聚焦时显示「移除」，让人知道点它会把参考从本段去掉。 */
export function ReferencedLabelTumeiai() {
    return (
        <span className="drama-referenced-label-tumeiai">
            <span className="is-idle">已引用</span>
            <span className="is-hover">移除</span>
        </span>
    );
}

/** 有参考没随请求发送时的提示条：说明本段能发几张，逐个或一键移除超出上限的引用。 */
export function UnsentReferencesBarTumeiai({ segment, castById, busy, onSave }: { segment: DramaSegment; castById: Map<string, DramaCast>; busy: boolean; onSave: (patch: DramaSegmentReferencePatch) => void }) {
    const unsent = segment.request.references.filter((ref) => !ref.sent);
    if (!unsent.length) return null;
    const overflow = overflowReferencesTumeiai(segment, castById);
    return (
        <div className="drama-unsent-refs-tumeiai" role="status">
            <div className="drama-unsent-refs-tumeiai-head">
                <strong>
                    本段最多发送 {segment.request.referenceCapacity} 张参考图，{unsent.length} 项未附图
                </strong>
                {overflow.length ? (
                    <Button size="small" disabled={busy} onClick={() => onSave(removeReferencesPatchTumeiai(segment, overflow))}>
                        移除超出上限的 {overflow.length} 项
                    </Button>
                ) : null}
            </div>
            <ul>
                {unsent.map((ref) => (
                    <li key={ref.castId || ref.resourceId || ref.label}>
                        <span>
                            {ref.name}（{ref.label}）
                        </span>
                        <button type="button" disabled={busy} aria-label={`从本段移除${ref.name}`} title={`从本段移除${ref.name}`} onClick={() => onSave(removeReferencesPatchTumeiai(segment, [ref]))}>
                            <X className="size-3" />
                        </button>
                    </li>
                ))}
            </ul>
            <small>未附图的设定按文字描述生成；也可以不移除，直接重新撰写提示词。{REORDER_NOTE}</small>
        </div>
    );
}

/** 视频因“未附图”失败时，在失败提示里直接给出处理办法。 */
export function UnsentFailureActionsTumeiai({
    segment,
    castById,
    busy,
    onSave,
    onWritePrompt,
}: {
    segment: DramaSegment;
    castById: Map<string, DramaCast>;
    busy: boolean;
    onSave: (patch: DramaSegmentReferencePatch) => Promise<unknown>;
    onWritePrompt: () => void;
}) {
    if (!segment.videoError?.includes("未附图")) return null;
    const overflow = overflowReferencesTumeiai(segment, castById);
    return (
        <>
            <span>重新撰写提示词时只会给能发送的参考图编号；或者移除多出来的参考后再撰写。</span>
            <div className="drama-sd-error-actions drama-unsent-actions-tumeiai">
                <Button size="small" icon={<PenLine className="size-3.5" />} disabled={busy} onClick={onWritePrompt}>
                    重新撰写提示词
                </Button>
                {overflow.length ? (
                    <Button size="small" disabled={busy} onClick={() => void onSave(removeReferencesPatchTumeiai(segment, overflow)).catch(() => {})}>
                        移除未附图的参考
                    </Button>
                ) : null}
            </div>
        </>
    );
}
