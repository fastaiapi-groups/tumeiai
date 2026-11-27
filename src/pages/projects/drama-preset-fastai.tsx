// fastai: 创建页的“一键套用制作预设”：把写作技能、参考图方案与分镜切段规则配成一套（目前只有精品剧）。
import { useQuery } from "@tanstack/react-query";
import { App, Button } from "antd";
import { Sparkles } from "lucide-react";

import { getDramaPresetsFastai, type DramaPresetFastai } from "@/services/api/drama-preset-fastai";

export function DramaPresetBarFastai({ onApply, disabled }: { onApply: (preset: DramaPresetFastai) => void; disabled?: boolean }) {
    const { message } = App.useApp();
    const presets = useQuery({ queryKey: ["drama-presets-fastai"], queryFn: getDramaPresetsFastai, staleTime: 10 * 60_000 });
    if (!presets.data?.length) return null;
    return (
        <section>
            <div className="drama-section-title">
                <h2>制作预设</h2>
                <span>一键配好写作技能、参考图方案与剧情段切分，之后仍可逐项修改</span>
            </div>
            <div className="flex flex-col gap-2">
                {presets.data.map((preset) => (
                    <div key={preset.id} className="flex items-start gap-3 rounded-[var(--radius-md,8px)] border border-[var(--workspace-border)] px-3 py-2">
                        <Sparkles className="mt-0.5 size-4 shrink-0 text-[var(--workspace-accent)]" aria-hidden />
                        <div className="min-w-0 flex-1">
                            <strong className="text-sm">{preset.name}</strong>
                            <p className="m-0 text-xs text-[var(--workspace-muted)]">{preset.description}</p>
                            {preset.skillsUnavailable ? <p className="m-0 text-xs text-[var(--workspace-muted)]">当前账号无法使用预设里的写作技能，只会套用参考图方案与剧情段切分。</p> : null}
                        </div>
                        <Button
                            size="small"
                            disabled={disabled}
                            onClick={() => {
                                onApply(preset);
                                message.success(`已套用「${preset.name}」预设`);
                            }}
                        >
                            套用
                        </Button>
                    </div>
                ))}
            </div>
        </section>
    );
}
