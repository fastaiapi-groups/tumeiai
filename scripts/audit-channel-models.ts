// Read-only plan: inputs are catalog snapshots, output is free quote requests.
import { defaultConfig, normalizeConfigSnapshot } from "../src/stores/use-config-store";
import { systemChannelModelChannels } from "../src/lib/user-session";
import { modelCapabilityConfigFor } from "../src/lib/model-capabilities";
import { modelRequestOptions, resolveModelGenerationDefaults } from "../src/lib/model-selection";
import { modelQuoteRequest } from "../src/lib/model-pricing";
import type { ModelQuoteRequest, PublicChannelCatalog } from "../src/services/api/logical-models";

export type ModelAuditCase = { id: string; channelId: string; modelId: string; capability: string; reject: boolean; request: ModelQuoteRequest };

export function channelModelAuditCases(channels: PublicChannelCatalog[]) {
    const root = normalizeConfigSnapshot({ config: { ...defaultConfig, channels: systemChannelModelChannels(channels) } }).config;
    const cases: ModelAuditCase[] = [];
    for (const channel of channels) for (const model of channel.models.filter((m) => m.available)) {
        const capability = model.capability;
        const value = `${channel.id}::${model.modelKey}`;
        let config = { ...root, model: value };
        if (capability === "image" || capability === "video") config = { ...config, ...resolveModelGenerationDefaults(config, value, capability) };
        const profile = modelCapabilityConfigFor(config, value);
        const video = profile.video!;
        const operation = capability === "video" ? video.defaultOperation : capability === "image" ? "text_to_image" : capability;
        const images = capability === "video" ? Math.max(video.references.minImages, ["image_to_video", "reference_to_video"].includes(operation) && video.references.maxImages ? 1 : 0) : 0;
        const requirements = { capability, input: { textCount: 1, imageCount: images, videoCount: 0, audioCount: capability === "video" && operation === "audio_to_video" ? 1 : 0, characterCount: 0 } };
        const request = modelQuoteRequest(config, value, capability, requirements);
        if (!request) throw new Error(`Missing quote contract: ${model.id}`);
        request.intent.operation = operation;
        const add = (label: string, options: Record<string, unknown> = {}, reject = false, inputs?: Record<string, number>, operationOverride?: string) => {
            cases.push({ id: `${model.id}:${label}`, channelId: channel.id, modelId: model.id, capability, reject, request: { ...request, intent: { ...request.intent, ...(operationOverride ? { operation: operationOverride } : {}), options: { ...request.intent.options, ...options }, inputs: inputs || request.intent.inputs } } });
        };
        add("default");
        if (capability === "video") {
            for (const operation of video.operations) {
                const input = { image: video.references.minImages, video: 0, audio: 0 };
                if (operation === "image_to_video" || operation === "reference_to_video") input.image = Math.max(1, input.image);
                if (operation === "video_to_video") input.video = 1;
                if (operation === "audio_to_video") input.audio = 1;
                if (input.image <= video.references.maxImages && input.video <= video.references.maxVideos && input.audio <= video.references.maxAudios) add(`operation:${operation}`, {}, false, input, operation);
            }
            const durations = video.duration.selection === "enum" ? video.duration.values! : [video.duration.min!, video.duration.default, video.duration.max!];
            for (const resolution of video.resolutions) for (const seconds of new Set(durations)) add(`video:${resolution}:${seconds}`, { vquality: resolution, videoSeconds: seconds });
            add("invalid-duration", { videoSeconds: Math.max(...durations) + 1 }, true);
            add("invalid-resolution", { vquality: "__unsupported__" }, true);
        }
        if (capability === "image") {
            const image = profile.image!;
            for (let count = 1; count <= Math.min(image.references.maxImages, 3); count++) {
                add(`image:references:${count}`, {}, false, { ...request.intent.inputs, image: count });
                if (image.resolution.supported) for (const resolution of image.resolution.values.filter((value) => value !== "auto")) add(`image:references:${count}:${resolution}`, { imageResolution: resolution }, false, { ...request.intent.inputs, image: count });
            }
            if (image.parameters) {
                for (const field of image.parameters.filter((field) => field.enabled !== false)) {
                    for (const option of field.values || []) add(`image:${field.name}:${option}`, { [field.name]: option });
                    if (field.pricing && field.values?.length) add(`invalid-image:${field.name}`, { [field.name]: "__unsupported__" }, true);
                }
            } else {
                for (const size of image.size.values) if (size !== "*") add(`image:size:${size}`, { size });
                for (const resolution of image.resolution.values) if (image.resolution.supported) add(`image:resolution:${resolution}`, { imageResolution: resolution });
            }
        }
        const refs = capability === "video" ? video.references : capability === "image" ? profile.image!.references : capability === "text" ? profile.text!.references : profile.audio!.references;
        for (const [kind, key] of [["image", "maxImages"], ["video", "maxVideos"], ["audio", "maxAudios"]] as const) {
            const max = Number((refs as Record<string, unknown>)[key] || 0);
            add(`invalid-references:${kind}`, {}, true, { ...request.intent.inputs, [kind]: max + 1 });
        }
        const defaults = modelRequestOptions(config, capability);
        // A stale globally selected model must never change another channel's image contract.
        if (JSON.stringify(request.intent.options) !== JSON.stringify(defaults)) throw new Error(`Quote option drift: ${model.id}`);
    }
    return cases.filter((item, index, all) => all.findIndex((candidate) => candidate.id === item.id) === index);
}

if (import.meta.main) {
    const input = await Bun.stdin.text();
    process.stdout.write(JSON.stringify(channelModelAuditCases(JSON.parse(input)), null, 2) + "\n");
}
