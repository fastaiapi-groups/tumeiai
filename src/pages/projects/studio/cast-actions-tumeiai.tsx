// tumeiai: 设定侧栏的「加入素材库」与「删除设定」操作；panels.tsx 只挂接一行。
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { App, Button } from "antd";
import { BookmarkPlus, Trash2 } from "lucide-react";

import type { AssetCategory } from "@/lib/asset-category";
import { dramaKeys } from "@/lib/drama/drama-query-keys";
import type { DramaCast, DramaCastKind } from "@/services/api/drama";
import { deleteDramaCastTumeiai, listDramaCastReferencesTumeiai, type DramaCastReferenceTumeiai } from "@/services/api/drama-cast-tumeiai";
import { getResource, resourceFileUrl, resourceStorageKey } from "@/services/api/resources";
import { localSavedRemotePendingMessage, saveRemoteUserDataNow } from "@/services/user-data-sync";
import { useAssetStore } from "@/stores/use-asset-store";

import { CAST_KIND_LABEL } from "../drama-shared";

const CAST_ASSET_CATEGORY: Record<DramaCastKind, AssetCategory> = { character: "character", prop: "prop", scene: "environment" };

/** 参考图写入素材库：复用同一服务端资源，不复制文件；同一张图已在素材库时不重复添加。 */
async function addCastImageToLibrary(cast: DramaCast, parent?: DramaCast) {
    const resourceId = cast.imageResourceId;
    if (!resourceId) throw new Error("还没有参考图，生成或上传后再加入素材库");
    const storageKey = resourceStorageKey(resourceId);
    const store = useAssetStore.getState();
    if (store.assets.some((asset) => asset.kind === "image" && asset.data.storageKey === storageKey && asset.status !== "archived")) return "exists" as const;
    const resource = await getResource(resourceId);
    if (resource.status !== "ready") throw new Error("参考图文件还没有就绪，请稍后再试");
    const url = resourceFileUrl(resourceId);
    const name = cast.parentId ? `${parent?.name || cast.name}·${cast.lookName || "造型"}` : cast.name;
    store.addAsset({
        kind: "image",
        title: name,
        category: CAST_ASSET_CATEGORY[cast.kind],
        coverUrl: url,
        tags: [cast.parentId ? "造型" : CAST_KIND_LABEL[cast.kind]],
        source: "短剧设定",
        note: cast.appearance || undefined,
        metadata: { source: "drama-cast", dramaProjectId: cast.projectId, dramaCastId: cast.id },
        data: { dataUrl: url, storageKey, width: resource.width || 0, height: resource.height || 0, bytes: resource.size || 0, mimeType: resource.mimeType || "image/png" },
    });
    try {
        await saveRemoteUserDataNow([]);
        return "saved" as const;
    } catch (error) {
        return { pending: localSavedRemotePendingMessage("已加入素材库", error) };
    }
}

export function TumeiaiCastActions({ projectId, cast, parent, busy, onChanged }: { projectId: string; cast: DramaCast; parent?: DramaCast; busy: boolean; onChanged: () => void }) {
    const { message, modal } = App.useApp();
    const queryClient = useQueryClient();
    const isLook = Boolean(cast.parentId);
    const kindLabel = CAST_KIND_LABEL[cast.kind];
    const addToLibrary = useMutation({
        mutationFn: () => addCastImageToLibrary(cast, parent),
        onSuccess: (result) => {
            if (result === "exists") message.info("这张参考图已在素材库中");
            else if (result === "saved") message.success("已加入素材库");
            else message.warning(result.pending);
        },
        onError: (error) => message.error(error instanceof Error ? error.message : "加入素材库失败"),
    });
    // 先查引用再确认：被剧情段引用时列出位置，用户确认后连同引用一起移除，不再只给一句拒绝。
    const checkReferences = useMutation({
        mutationFn: () => listDramaCastReferencesTumeiai(projectId, cast.id),
        onSuccess: ({ references }) => {
            const detach = references.length > 0;
            modal.confirm({
                title: `删除${kindLabel}「${cast.name}」？`,
                content: <DeleteCastContent references={references} />,
                okText: detach ? `移除引用并删除` : `删除${kindLabel}`,
                okButtonProps: { danger: true },
                cancelText: "取消",
                width: detach ? 520 : undefined,
                onOk: async () => {
                    try {
                        const result = await deleteDramaCastTumeiai(projectId, cast.id, detach);
                        message.success(result.affectedSegments ? `已删除${kindLabel}「${cast.name}」，${result.affectedSegments} 个剧情段需要重新撰写提示词` : `已删除${kindLabel}「${cast.name}」`);
                        if (detach) await queryClient.invalidateQueries({ queryKey: dramaKeys.summary(projectId) });
                        onChanged();
                    } catch (error) {
                        message.error(error instanceof Error ? error.message : "删除失败");
                    }
                },
            });
        },
        onError: (error) => message.error(error instanceof Error ? error.message : "读取引用失败"),
    });
    return (
        <>
            <Button
                className="drama-editor-wide"
                icon={<BookmarkPlus className="size-4" />}
                disabled={!cast.imageResourceId || cast.imageStatus !== "ready"}
                title={!cast.imageResourceId ? "还没有参考图" : undefined}
                loading={addToLibrary.isPending}
                onClick={() => addToLibrary.mutate()}
            >
                加入素材库
            </Button>
            {isLook ? null : (
                <Button danger className="drama-editor-wide" icon={<Trash2 className="size-4" />} disabled={busy} loading={checkReferences.isPending} onClick={() => checkReferences.mutate()}>
                    删除{kindLabel}
                </Button>
            )}
        </>
    );
}

/** 删除确认正文：有引用时列出受影响的集与剧情段，说明移除引用后的后果。 */
function DeleteCastContent({ references }: { references: DramaCastReferenceTumeiai[] }) {
    const base = "同时删除它的全部造型和参考图版本记录，无法恢复；已加入素材库的图片不受影响。";
    if (!references.length) return <p className="m-0">{base}</p>;
    const withVideo = references.filter((item) => item.hasVideo).length;
    return (
        <div className="drama-episode-delete">
            <p>{base}</p>
            <div className="drama-episode-delete-warn" role="alert">
                <span>
                    它仍被下面 {references.length} 个剧情段引用。删除时会从这些段的镜头和参考图里一并移除，这些段的视频提示词需要重新撰写（手写的提示词会保留，待你核对）
                    {withVideo ? `，其中 ${withVideo} 个已生成的视频会标记过期、需要重新生成` : ""}。镜头文字里提到的名称不会自动改写。
                </span>
            </div>
            <ul className="m-0 grid max-h-48 gap-1 overflow-y-auto pl-5" aria-label="引用它的剧情段">
                {references.map((item) => (
                    <li key={`${item.episodeId}:${item.segmentIndex}`}>
                        第 {item.episodeNumber} 集{item.episodeTitle ? `《${item.episodeTitle}》` : ""} · 第 {item.segmentIndex + 1} 段{item.hasVideo ? "（已生成视频）" : ""}
                    </li>
                ))}
            </ul>
        </div>
    );
}
