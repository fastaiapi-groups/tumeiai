import assert from "node:assert/strict";
import { test } from "node:test";

import { normalizeStoryboard, segmentEstimateFastai, segmentMaxShotsFastai, shotTarget } from "./storyboard";

test("按场景切段的每段镜头数不超过上限，段数按镜头上限取大", () => {
    const rules = normalizeStoryboard({ segmentMode: "scene", segmentMaxShots: 10 });
    const estimate = segmentEstimateFastai(rules, "scene", 60, 60);
    assert.ok(estimate.shotsPerSegment <= segmentMaxShotsFastai(10));
    assert.ok(estimate.segments >= Math.ceil(shotTarget(rules, 60) / 10));
});

test("其余模式保持按段长折算", () => {
    const rules = normalizeStoryboard({ segmentMode: "fixed" });
    const estimate = segmentEstimateFastai(rules, "fixed", 60, 15);
    assert.equal(estimate.segments, 4);
    assert.ok(estimate.shotsPerSegment >= 1);
});
