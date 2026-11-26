import { expect, test } from "bun:test";

import { normalizeStoryboard, segmentLimits, segmentTargetSeconds, SHOT_SEGMENT_SECONDS_FASTAI } from "../src/lib/drama/storyboard";

test("按镜头切段档归一化后保留，并按典型段长估算段数", () => {
    const rules = normalizeStoryboard({ segmentMode: "shot" });
    expect(rules.segmentMode).toBe("shot");
    const limits = segmentLimits(rules, 10);
    expect(limits).toEqual({ mode: "shot", min: 0, max: 10 });
    expect(segmentTargetSeconds(limits)).toBe(SHOT_SEGMENT_SECONDS_FASTAI);
});
