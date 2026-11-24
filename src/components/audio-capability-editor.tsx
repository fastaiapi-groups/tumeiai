import { uiText } from "@/lib/ui-text";
import { Input, InputNumber, Select, Switch } from "antd";
import { defaultAudioCapabilityConfig, type AudioCapabilityConfig, type ModelCapabilityConfig } from "@/lib/model-capabilities";

export function AudioCapabilityEditor({ value, protocol, onChange, disabled, section }: { value?: ModelCapabilityConfig; protocol?: string; onChange?: (value: ModelCapabilityConfig) => void; disabled?: boolean; section?: string }) {
    const profile = value?.audio || defaultAudioCapabilityConfig(protocol);
    const update = (patch: Partial<AudioCapabilityConfig>) => onChange?.({ version: 1, audio: { ...profile, ...patch } });
    const numbers = section !== "protocol";
    const parameters = section !== "references";
    return (
        <div className="grid gap-4 text-sm">
            {numbers ? (
                <>
                    {(
                        [
                            ["promptMaxChars", "提示词字符上限"],
                            ["maxImages", "最大参考图片数"],
                            ["maxAudios", "最大参考音频数"],
                        ] as const
                    ).map(([key, label]) => (
                        <label key={key} className="grid gap-2">
                            {label}
                            <InputNumber
                                aria-label={label}
                                min={0}
                                max={key === "promptMaxChars" ? undefined : 128}
                                disabled={disabled}
                                value={profile.references[key]}
                                onChange={(value) => {
                                    if (value !== null) update({ references: { ...profile.references, [key]: value } });
                                }}
                            />
                        </label>
                    ))}
                    <label className="flex items-center gap-2">
                        <Switch aria-label="允许混合图片和音频参考" disabled={disabled} checked={profile.references.allowMixed} onChange={(allowMixed) => update({ references: { ...profile.references, allowMixed } })} />
                        允许混合图片和音频参考
                    </label>
                </>
            ) : null}
            {parameters ? (
                <>
                    <label className="grid gap-2">
                        支持格式（回车添加，留空隐藏格式选择）
                        <Select mode="tags" aria-label="支持音频格式" tokenSeparators={[",", "，"]} disabled={disabled} value={profile.formats} onChange={(formats: string[]) => update({ formats })} />
                    </label>
                    <label className="grid gap-2">
                        默认格式
                        <Input aria-label="默认音频格式" disabled={disabled} value={profile.defaultFormat} onChange={(event) => update({ defaultFormat: event.target.value.trim() })} />
                    </label>
                    <label className="grid gap-2">
                        音色列表（回车添加）
                        <Select mode="tags" aria-label="音色列表" tokenSeparators={[",", "，"]} disabled={disabled} value={profile.voices} onChange={(voices: string[]) => update({ voices })} />
                    </label>
                    <label className="grid gap-2">
                        默认音色
                        <Input aria-label="默认音色" disabled={disabled} value={profile.defaultVoice} onChange={(event) => update({ defaultVoice: event.target.value.trim() })} />
                    </label>
                    <label className="flex items-center gap-2">
                        <Switch aria-label="允许自定义音色 ID" disabled={disabled} checked={profile.allowCustomVoice} onChange={(allowCustomVoice) => update({ allowCustomVoice })} />
                        允许自定义音色 ID
                    </label>
                    <label className="flex items-center gap-2">
                        <Switch aria-label="支持语速设置" disabled={disabled} checked={profile.speed.supported} onChange={(supported) => update({ speed: { ...profile.speed, supported } })} />
                        支持语速设置
                    </label>
                    {profile.speed.supported ? (
                        <div className="grid grid-cols-3 gap-3">
                            {(
                                [
                                    ["min", "最小语速"],
                                    ["max", "最大语速"],
                                    ["default", "默认语速"],
                                ] as const
                            ).map(([key, label]) => (
                                <label key={key} className="grid gap-2">
                                    {label}
                                    <InputNumber
                                        aria-label={label}
                                        min={0.01}
                                        step={0.05}
                                        disabled={disabled}
                                        value={profile.speed[key]}
                                        onChange={(value) => {
                                            if (value !== null) update({ speed: { ...profile.speed, [key]: value } });
                                        }}
                                    />
                                </label>
                            ))}
                        </div>
                    ) : null}
                    <label className="flex items-center gap-2">
                        <Switch aria-label="支持声音指令" disabled={disabled} checked={profile.instructionsSupported} onChange={(instructionsSupported) => update({ instructionsSupported })} />
                        支持声音指令
                    </label>
                </>
            ) : null}
        </div>
    );
}
