import { uiText } from "@/lib/ui-text";
import type { GenerationTask } from "@/services/api/task-center";
import type { WorkbenchKind } from "@/services/api/workbench";
import { decodeChannelModel, modelOptionName, resolveModelChannel, type AiConfig } from "@/stores/use-config-store";

export type WorkbenchTaskReferenceSnapshot = {
    resourceId: string;
    kind: "image" | "video" | "audio";
    role?: "reference" | "first_frame" | "last_frame";
    slotKey?: string;
};

export type WorkbenchTaskSnapshot = {
    kind: WorkbenchKind;
    channelId?: string;
    toolId?: string;
    presetId?: string;
    parameters: Record<string, unknown>;
    references: WorkbenchTaskReferenceSnapshot[];
};

export function workbenchTaskSnapshot(task: GenerationTask): WorkbenchTaskSnapshot | null {
    let input: Record<string, any>;
    try {
        input = JSON.parse(task.inputJson || "null");
        if (!input || typeof input !== "object" || Array.isArray(input)) return null;
    } catch {
        return null;
    }
    const metadata = input.metadata && typeof input.metadata === "object" ? input.metadata : {};
    const snapshot = input.workbench && typeof input.workbench === "object" ? input.workbench : metadata.workbench || {};
    const kind = snapshot.kind || metadata.workbenchKind;
    if (kind !== "image" && kind !== "video") return null;
    const references = (Array.isArray(snapshot.references) ? snapshot.references : []).flatMap((value: unknown): WorkbenchTaskReferenceSnapshot[] => {
        if (!value || typeof value !== "object") return [];
        const reference = value as Record<string, unknown>;
        const resourceId = typeof reference.resourceId === "string" ? reference.resourceId.trim() : "";
        const mediaKind = reference.kind;
        if (!resourceId || (mediaKind !== "image" && mediaKind !== "video" && mediaKind !== "audio")) return [];
        const role = reference.role === "first_frame" || reference.role === "last_frame" || reference.role === "reference" ? reference.role : undefined;
        return [{ resourceId, kind: mediaKind, ...(role ? { role } : {}), ...(typeof reference.slotKey === "string" ? { slotKey: reference.slotKey } : {}) }];
    });
    return {
        kind,
        ...(typeof snapshot.channelId === "string" ? { channelId: snapshot.channelId } : {}),
        ...(typeof snapshot.toolId === "string" ? { toolId: snapshot.toolId } : typeof metadata.workbenchToolId === "string" ? { toolId: metadata.workbenchToolId } : {}),
        ...(typeof snapshot.presetId === "string" ? { presetId: snapshot.presetId } : typeof metadata.workbenchPresetId === "string" ? { presetId: metadata.workbenchPresetId } : {}),
        parameters: snapshot.parameters && typeof snapshot.parameters === "object" ? snapshot.parameters : {},
        references,
    };
}

export function workbenchRestoreModel(task: GenerationTask, snapshot: WorkbenchTaskSnapshot, config: AiConfig, models: string[]) {
    const exact = models.find((model) => model === task.model);
    if (exact && (!snapshot.channelId || decodeChannelModel(exact)?.channelId === snapshot.channelId)) return exact;
    const candidates = models.filter((model) => {
        const channel = resolveModelChannel(config, model);
        if (snapshot.channelId && channel.id !== snapshot.channelId) return false;
        const name = modelOptionName(model);
        if (task.logicalModelId) return channel.modelCosts?.some((cost) => cost.model === name && cost.logicalModelId === task.logicalModelId);
        return name === task.model || channel.modelAliases?.[task.model || ""] === name;
    });
    if (candidates.length === 1) return candidates[0]!;
    throw new Error(candidates.length ? "原任务模型对应多个渠道，请先确认原渠道配置" : "原任务模型或渠道已不可用，无法完整恢复");
}

type RestoreDependencies = {
    queryTask(id: string): Promise<GenerationTask>;
    resourceURL(id: string): Promise<string | undefined>;
};

export async function loadWorkbenchTaskRestore(task: GenerationTask, kind: WorkbenchKind, config: AiConfig, models: string[], dependencies: RestoreDependencies) {
    // 列表省略输入并截断提示词，所有恢复入口均先取得完整详情。
    const detail = await dependencies.queryTask(task.id);
    const snapshot = workbenchTaskSnapshot(detail);
    if (!snapshot || snapshot.kind !== kind) throw new Error("该任务没有可恢复的工作台参数");
    const model = workbenchRestoreModel(detail, snapshot, config, models);
    const references = await Promise.all(
        snapshot.references.map(async (reference, index) => {
            const previewUrl = await dependencies.resourceURL(reference.resourceId);
            if (!previewUrl) throw new Error(`参考素材 ${index + 1} 无法读取，请检查素材是否已删除或访问权限`);
            return { ...reference, previewUrl };
        }),
    );
    return { task: detail, snapshot, model, references };
}
