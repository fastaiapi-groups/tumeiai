import { expect, test } from "bun:test";

import { overflowReferencesTumeiai, removeReferencesPatchTumeiai } from "../src/pages/projects/studio/segment-references-tumeiai";
import type { DramaCast, DramaSegment } from "../src/services/api/drama";

const refs = [
    { castId: "lead", label: "参考图1", kind: "character", name: "顾辙", sent: true },
    { castId: "car", label: "参考图2", kind: "prop", name: "旧环17号", sent: true },
    { castId: "drone", label: "参考图3", kind: "prop", name: "巡检无人机", sent: false },
    { castId: "room", label: "参考图4", kind: "scene", name: "旧环17号内部", sent: false },
    { castId: "", resourceId: "img1", label: "参考图5", kind: "image", name: "草图", sent: false },
] as DramaSegment["request"]["references"];
const segment = { request: { references: refs, referenceCapacity: 2 } } as unknown as DramaSegment;
const castById = new Map<string, DramaCast>([
    ["lead", { id: "lead", imageStatus: "ready", imageResourceId: "r1" } as DramaCast],
    ["car", { id: "car", imageStatus: "ready", imageResourceId: "r2" } as DramaCast],
    ["drone", { id: "drone", imageStatus: "running", imageResourceId: "" } as DramaCast],
    ["room", { id: "room", imageStatus: "ready", imageResourceId: "r4" } as DramaCast],
]);

test("移除设定参考只提交设定列表，保留顺序", () => {
    expect(removeReferencesPatchTumeiai(segment, [refs[1]])).toEqual({ referenceCastIds: ["lead", "drone", "room"] });
});

test("移除附加图片只提交图片列表", () => {
    expect(removeReferencesPatchTumeiai(segment, [refs[4]])).toEqual({ referenceImages: [] });
});

test("超出上限的参考不含仍在生成的设定", () => {
    const overflow = overflowReferencesTumeiai(segment, castById);
    expect(overflow.map((ref) => ref.label)).toEqual(["参考图4", "参考图5"]);
    expect(removeReferencesPatchTumeiai(segment, overflow)).toEqual({ referenceCastIds: ["lead", "car", "drone"], referenceImages: [] });
});
