import { describe, expect, test } from "bun:test";
import { loadWorkbenchTaskRestore, workbenchRestoreModel, workbenchTaskSnapshot } from "../src/pages/workbench/workbench-task-restore";
import { createModelChannel, type AiConfig } from "../src/stores/use-config-store";
import type { GenerationTask } from "../src/services/api/task-center";

const config = { channels: [createModelChannel({ id: "first", models: ["ltx-2.3", "image-model"] }), createModelChannel({ id: "original", models: ["ltx-2.3", "image-model"] })] } as AiConfig;
const models = ["first::ltx-2.3", "original::ltx-2.3"];
const references = [
    { resourceId: "first-image", kind: "image", role: "first_frame", slotKey: "start" },
    { resourceId: "last-image", kind: "image", role: "last_frame", slotKey: "end" },
    { resourceId: "voice", kind: "audio", role: "reference" },
    { resourceId: "motion", kind: "video", role: "reference" },
];
const parameters = { seconds: 4, ratio: "16:9", resolution: "480p", generateAudio: false, watermark: false };
function detail(overrides: Partial<GenerationTask> = {}): GenerationTask {
    return { id: "task", model: "ltx-2.3", prompt: "完整提示词".repeat(300), inputJson: JSON.stringify({ workbench: { kind: "video", channelId: "original", toolId: "tool", presetId: "preset", parameters, references } }), ...overrides } as GenerationTask;
}

describe("workbench task restore", () => {
    test("loads full details from a summary and preserves all parameters and reference roles", async () => {
        const fetched: string[] = [];
        const source = detail();
        const restored = await loadWorkbenchTaskRestore({ id: "task", prompt: "截断…" } as GenerationTask, "video", config, models, {
            queryTask: async (id) => {
                expect(id).toBe("task");
                return source;
            },
            resourceURL: async (id) => {
                fetched.push(id);
                return "/api/resources/" + id + "/file";
            },
        });
        expect(restored.task.prompt).toBe(source.prompt);
        expect(restored.model).toBe("original::ltx-2.3");
        expect(restored.snapshot).toMatchObject({ toolId: "tool", presetId: "preset", parameters, references });
        expect(fetched).toEqual(references.map((ref) => ref.resourceId));
        expect(
            restored.references.map(({ previewUrl, ...ref }) => {
                expect(previewUrl).toContain(ref.resourceId);
                return ref;
            }),
        ).toEqual(references);
    });

    test("fails before returning a partial restore when a reference or detail cannot be read", async () => {
        await expect(loadWorkbenchTaskRestore(detail(), "video", config, models, { queryTask: async () => detail(), resourceURL: async () => undefined })).rejects.toThrow("参考素材");
        await expect(
            loadWorkbenchTaskRestore(detail(), "video", config, models, {
                queryTask: async () => {
                    throw new Error("读取失败");
                },
                resourceURL: async () => "unused",
            }),
        ).rejects.toThrow("读取失败");
    });

    test("preserves image dimensions, resolution tier, quality and count", async () => {
        const source = detail({ model: "image-model", inputJson: JSON.stringify({ workbench: { kind: "image", channelId: "original", parameters: { size: "1824x1024", imageResolution: "2k", quality: "high", count: 3 }, references: [references[0]] } }) });
        const restored = await loadWorkbenchTaskRestore(source, "image", config, ["first::image-model", "original::image-model"], { queryTask: async () => source, resourceURL: async () => "/original.png" });
        expect(restored.model).toBe("original::image-model");
        expect(restored.snapshot.parameters).toEqual({ size: "1824x1024", imageResolution: "2k", quality: "high", count: 3 });
    });

    test("does not silently choose another channel or an ambiguous model", () => {
        const source = detail();
        const snapshot = workbenchTaskSnapshot(source)!;
        expect(() => workbenchRestoreModel(source, snapshot, config, [models[0]!])).toThrow("不可用");
        expect(() => workbenchRestoreModel(source, { ...snapshot, channelId: undefined }, config, models)).toThrow("多个渠道");
        expect(workbenchRestoreModel(source, { ...snapshot, channelId: undefined }, config, [models[1]!])).toBe(models[1]!);
    });

    test("supports metadata snapshots and reference-free tasks, but rejects the wrong workbench", async () => {
        const source = detail({ inputJson: JSON.stringify({ metadata: { source: "workbench", workbenchKind: "video", workbench: { parameters, references: [] } } }) });
        expect(workbenchTaskSnapshot(source)?.parameters).toEqual(parameters);
        const deps = {
            queryTask: async () => source,
            resourceURL: async () => {
                throw new Error("no references");
            },
        };
        expect((await loadWorkbenchTaskRestore(source, "video", config, [models[1]!], deps)).references).toEqual([]);
        await expect(loadWorkbenchTaskRestore(source, "image", config, models, deps)).rejects.toThrow("没有可恢复");
    });
});
