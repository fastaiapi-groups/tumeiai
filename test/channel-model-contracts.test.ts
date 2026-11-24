import { expect, test } from "bun:test";
import { defaultConfig, normalizeConfigSnapshot } from "../src/stores/use-config-store";
import { defaultModelCapabilityConfig } from "../src/lib/model-capabilities";
import { modelQuoteRequest, requestCreditCost } from "../src/lib/model-pricing";
import { modelCompatibilityError, modelRequestOptions } from "../src/lib/model-selection";
import { systemChannelModelChannels } from "../src/lib/user-session";
import { audioFormatOptionsForConfig, normalizeAudioFormatForConfig, normalizeAudioSpeedForConfig, normalizeAudioVoiceForConfig } from "../src/lib/audio-generation";
import type { PublicChannelCatalog, PublicChannelModel } from "../src/services/api/logical-models";
import { channelModelAuditCases } from "../scripts/audit-channel-models";

function catalogs(): PublicChannelCatalog[] {
    return ["tumeiaiapi", "newapi", "niuniu"].map((id) => ({
        id,
        name: id,
        displayName: id,
        models: (["image", "video", "audio", "text"] as const).map((capability): PublicChannelModel => {
            const profile = defaultModelCapabilityConfig();
            profile.video!.references.maxImages = id === "newapi" ? 5 : 9;
            profile.video!.references.maxAudios = id === "newapi" ? 0 : 3;
            profile.video!.operations = ["text_to_video", "image_to_video", "reference_to_video"];
            profile.video!.resolutions = id === "newapi" ? ["480p", "720p"] : ["1080p"];
            profile.video!.defaultResolution = profile.video!.resolutions[0];
            profile.video!.generateAudio = { supported: false, default: true };
            profile.video!.watermark = { supported: false, default: true };
            profile.image!.parameters = [
                { name: "size", label: "画幅", type: "string", default: "1:1", values: ["1:1"], binding: "aspectRatio" },
                { name: "imageResolution", label: "分辨率", type: "string", values: [id === "tumeiaiapi" ? "1k" : "2k"], default: id === "tumeiaiapi" ? "1k" : "2k", binding: "resolution", pricing: true },
                { name: "count", label: "数量", type: "integer", default: 1, min: 1, max: 1, binding: "imageCount" },
            ];
            profile.audio = {
                ...profile.audio!,
                formats: ["wav"],
                defaultFormat: "wav",
                voices: ["voice-a"],
                defaultVoice: "voice-a",
                allowCustomVoice: false,
                speed: { supported: true, min: 0.8, max: 1.2, default: 1 },
                references: { promptMaxChars: 500, maxImages: id === "newapi" ? 0 : 1, maxAudios: id === "newapi" ? 0 : 2, allowMixed: false },
            };
            return {
                id: `${id}-${capability}`,
                modelKey: capability,
                displayName: capability,
                channelLabel: id,
                capability,
                protocol: capability === "video" ? "newapi-channel-1" : capability === "image" ? "openai-image" : capability === "audio" ? "openai-audio" : "chat-completion",
                capabilityConfig: profile,
                available: true,
                pricingMode: "provider",
                priceLabel: "",
                priceTiers: [{ id: "tier", selector: {}, resolution: "*", videoSeconds: 0, billingMode: "fixed_request", unitPriceMicrocredits: 2_000_000, inputTokenPriceMicrocredits: 0, outputTokenPriceMicrocredits: 0, cachedTokenPriceMicrocredits: 0 }],
            };
        }),
    }));
}

function config() {
    return normalizeConfigSnapshot({ config: { ...defaultConfig, channels: systemChannelModelChannels(catalogs()), model: "tumeiaiapi::image", imageResolution: "1k", imageParameters: "{}" } }).config;
}

test("all direct channel capabilities quote using the selected channel rather than the global model", () => {
    const c = config();
    for (const id of ["tumeiaiapi", "newapi", "niuniu"])
        for (const capability of ["image", "video", "audio", "text"] as const) {
            const request = modelQuoteRequest(c, `${id}::${capability}`, capability);
            expect(request).toMatchObject({ channelId: id, modelKey: capability, intent: { capability } });
            if (capability === "image") expect(request!.intent.options!.imageResolution).toBe(id === "tumeiaiapi" ? "1k" : "2k");
        }
});

test("video references and unsupported boolean options follow the selected channel", () => {
    const c = config();
    const input = { textCount: 1, imageCount: 6, audioCount: 1, videoCount: 0, characterCount: 0 };
    expect(modelCompatibilityError(c, "newapi::video", { capability: "video", input })).toContain("最多支持 5");
    expect(modelCompatibilityError(c, "niuniu::video", { capability: "video", input })).toBe("");
    // 上游约定：渠道不支持的布尔选项直接省略，由后端按默认值处理；不能把用户残留的 true 发出去。
    const unsupported = modelRequestOptions({ ...c, model: "newapi::video", videoGenerateAudio: "true", videoWatermark: "true" }, "video");
    expect(unsupported.videoGenerateAudio ?? false).toBe(false);
    expect(unsupported.videoWatermark ?? false).toBe(false);
});

test("audio formats, voice, speed and references use editable channel model capabilities", () => {
    const c = { ...config(), model: "niuniu::audio" };
    expect(audioFormatOptionsForConfig(c).map((item) => item.value)).toEqual(["wav"]);
    expect(normalizeAudioFormatForConfig(c, "mp3")).toBe("wav");
    expect(normalizeAudioVoiceForConfig(c, "alloy")).toBe("voice-a");
    expect(modelRequestOptions({ ...c, audioVoice: "old-channel-voice" }, "audio")).toMatchObject({ audioVoice: "voice-a", audioFormat: "wav" });
    expect(normalizeAudioSpeedForConfig(c, "4")).toBe("1.2");
    const input = { textCount: 1, imageCount: 1, audioCount: 0, videoCount: 0, characterCount: 0 };
    expect(modelCompatibilityError(c, "niuniu::audio", { capability: "audio", input })).toBe("");
    expect(modelCompatibilityError(c, "newapi::audio", { capability: "audio", input })).toContain("最多支持 0");
});

test("local image price tiers match the selected channel parameter schema", () => {
    const c = config();
    const channel = c.channels.find((item) => item.id === "niuniu")!;
    channel.modelCosts![0].logicalPriceTiers![0].selector = { imageResolution: "2k" };
    expect(requestCreditCost({ channelMode: "remote", modelCosts: channel.modelCosts, model: "image", modelValue: "niuniu::image", capability: "image", config: c, count: 1 })).toBe(2);
});

test("audit plan covers every capability of every channel without submitting model tasks", () => {
    const cases = channelModelAuditCases(catalogs());
    expect(new Set(cases.map((item) => item.modelId)).size).toBe(12);
    expect(cases.filter((item) => item.reject).length).toBeGreaterThan(36);
    expect(cases.every((item) => item.request.channelId === item.channelId)).toBe(true);
});
