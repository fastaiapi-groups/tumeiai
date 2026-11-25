import assert from "node:assert/strict";
import { describe, test } from "node:test";

import { compileCustomDramaStyleFastai, customDramaStyleIssueFastai, parseCustomDramaStyleFastai, resolveDramaStyleFastai, seedCustomDramaStyleFastai } from "./custom-style-fastai";
import { DEFAULT_DRAMA_STYLE_ID, findDramaStyle } from "./drama-styles";

describe("fastai custom drama style", () => {
    test("seeds from the selected style and compiles to the same labelled format", () => {
        const base = findDramaStyle(DEFAULT_DRAMA_STYLE_ID)!;
        const seeded = seedCustomDramaStyleFastai(base);
        assert.equal(compileCustomDramaStyleFastai(seeded), base.prompt);
        assert.equal(seeded.name, `${base.name}（改）`);
    });

    test("parses back what it compiled, including preset prompts without a medium label", () => {
        const style = { name: "水彩童话", medium: "水彩手绘绘本画风，纸张纹理", world: "森林小镇", look: "柔和粉彩。", wardrobe: "", forbid: "照片质感" };
        const prompt = compileCustomDramaStyleFastai(style);
        assert.equal(prompt, "表现形式：水彩手绘绘本画风，纸张纹理。题材场景：森林小镇。色彩光影：柔和粉彩。禁止：照片质感");
        assert.deepEqual(parseCustomDramaStyleFastai("水彩童话", prompt), { ...style, look: "柔和粉彩" });
        const preset = findDramaStyle("live-ceo")!;
        assert.deepEqual(parseCustomDramaStyleFastai(preset.name, preset.prompt), { name: preset.name, ...preset.detail });
    });

    test("free text without labels is kept as the medium", () => {
        assert.equal(parseCustomDramaStyleFastai("x", "赛博朋克霓虹 3D").medium, "赛博朋克霓虹 3D");
    });

    test("requires a name and a medium, and resolves only complete custom styles", () => {
        const style = { name: "我的风格", medium: "3D 动画渲染", world: "", look: "", wardrobe: "", forbid: "" };
        assert.equal(customDramaStyleIssueFastai(style), "");
        assert.match(customDramaStyleIssueFastai({ ...style, name: " " }), /名称/);
        assert.match(customDramaStyleIssueFastai({ ...style, medium: "3D" }), /表现形式/);
        assert.deepEqual(resolveDramaStyleFastai("custom", style), { name: "我的风格", prompt: "表现形式：3D 动画渲染" });
        assert.equal(resolveDramaStyleFastai("custom", { ...style, medium: "" }), undefined);
        assert.equal(resolveDramaStyleFastai("live-ceo", undefined)?.name, "都市霸总");
    });
});
