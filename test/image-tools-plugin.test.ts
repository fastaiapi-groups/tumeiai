import { expect, test } from "bun:test";
import { readFileSync } from "node:fs";

test("拆层协议清单请求 PNG，不丢失多图输出列表", () => {
    const packaged = JSON.parse(readFileSync(new URL("./fixtures/plugin-manifests/image-tools/manifest.json", import.meta.url), "utf8"));
    const provider = packaged.contributes.providers.find((item: { id: string }) => item.id === "image-tools-layer-decomposition");
    expect(provider.create.body.output_format).toBe("png");
    expect(provider.create.path).toBe("/bytedance/seedream-v5.0-pro/layer-decomposition");
    expect(provider.response.images).toEqual({ $ref: "response.data.outputs" });
    expect(packaged.version).toBe("1.0.1");
});
