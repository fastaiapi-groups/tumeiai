import { describe, expect, test } from "bun:test";

import { TUMEIAI_XIANGONG_IMAGES, tumeiaiIsXiangongImageId, tumeiaiSupportsXiangong, tumeiaiXiangongImageAllowed, tumeiaiXiangongImageOptions } from "@/lib/tumeiai-xiangong";

describe("tumeiai xiangong", () => {
    test("只对 minimax-h3-xs 显示算力来源入口", () => {
        expect(tumeiaiSupportsXiangong("minimax-h3-xs")).toBe(true);
        expect(tumeiaiSupportsXiangong(undefined, "MiniMax-H3-XS")).toBe(true);
        expect(tumeiaiSupportsXiangong("minimax-h3-x", "minimax-h3-f")).toBe(false);
    });

    test("镜像 ID 必须是 UUID", () => {
        expect(tumeiaiIsXiangongImageId("a3175776-4cf2-4adf-a148-d0ca20792c83")).toBe(true);
        expect(tumeiaiIsXiangongImageId("../etc")).toBe(false);
    });

    test("镜像下拉：中文名称、值为镜像 ID，私有镜像只能中转，专用工作流镜像两种来源都可选", () => {
        for (const image of TUMEIAI_XIANGONG_IMAGES) {
            expect(image.value === "" || tumeiaiIsXiangongImageId(image.value)).toBe(true);
            expect(image.label).toMatch(/[\u4e00-\u9fa5]/);
        }
        const own = tumeiaiXiangongImageOptions("own", "");
        expect(own.find((option) => option.value === "2911b873-f283-420d-a788-d6e5974c29eb")).toMatchObject({ disabled: true, label: "私有镜像 v3（仅中转）" });
        expect(own.find((option) => option.value === "6c731fb9-45ee-4a89-92b8-228007184783")).toMatchObject({ disabled: false });
        expect(TUMEIAI_XIANGONG_IMAGES.length).toBe(8);
        expect(own[0]).toMatchObject({ value: "", label: "默认镜像" });
        const relay = tumeiaiXiangongImageOptions("relay", "");
        expect(relay.find((option) => option.value === "b900441e-8c7e-4f00-bce6-bfe50ae47408")).toMatchObject({ disabled: false, label: "H3 文戏 8 步（Pinggoo）" });
        expect(tumeiaiXiangongImageAllowed("relay", "b900441e-8c7e-4f00-bce6-bfe50ae47408")).toBe(true);
        expect(tumeiaiXiangongImageAllowed("relay", "76081786-f098-45a1-992d-209943cb073f")).toBe(true);
        expect(tumeiaiXiangongImageAllowed("own", "b900441e-8c7e-4f00-bce6-bfe50ae47408")).toBe(true);
        expect(tumeiaiXiangongImageAllowed("relay", "")).toBe(true);
        expect(tumeiaiXiangongImageAllowed("own", "96c6f99c-f64b-4605-86dc-e5ec9a69cce1")).toBe(false);
        expect(tumeiaiXiangongImageAllowed("own", "00000000-0000-4000-8000-000000000000")).toBe(true);
    });

    test("已保存的旧镜像 ID 不在清单里时保留为自定义镜像", () => {
        const options = tumeiaiXiangongImageOptions("relay", "11111111-2222-4333-8444-555555555555");
        expect(options.at(-1)).toMatchObject({ value: "11111111-2222-4333-8444-555555555555", disabled: false });
        expect(options.at(-1)?.label).toContain("自定义镜像");
    });
});
