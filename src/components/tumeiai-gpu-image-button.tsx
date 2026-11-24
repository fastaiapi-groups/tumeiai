import { useState } from "react";
import { Input, Segmented, Select } from "antd";
import { Server } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { AppModal } from "@/components/ui/product/app-modal";
import { tumeiaiIsXiangongImageId, tumeiaiXiangongImageAllowed, tumeiaiXiangongImageOptions } from "@/lib/tumeiai-xiangong";
import { getTumeiaiXiangongSetting, saveTumeiaiXiangongSetting, type TumeiaiXiangongMode, type TumeiaiXiangongSetting } from "@/services/api/tumeiai-xiangong";
import { useUserStore } from "@/stores/use-user-store";

// tumeiai: 模型选择器中 minimax-h3-xs 行右下角的「算力来源」入口：中转（平台网关）或自有显卡（直连 Wrapper 资源池）。

function buttonLabel(setting?: TumeiaiXiangongSetting) {
    if (setting?.mode === "own") return "自有显卡";
    return setting?.gpuImage ? "中转 · 自定义镜像" : "中转";
}

export function TumeiaiGpuImageButton() {
    const userId = useUserStore((state) => state.user?.id);
    const queryClient = useQueryClient();
    const queryKey = ["tumeiai-xiangong", userId] as const;
    const settingQuery = useQuery({ queryKey, queryFn: ({ signal }) => getTumeiaiXiangongSetting(signal), enabled: Boolean(userId), staleTime: 60_000 });
    const setting = settingQuery.data;
    const [open, setOpen] = useState(false);
    const [mode, setMode] = useState<TumeiaiXiangongMode>("relay");
    const [image, setImage] = useState("");
    const [token, setToken] = useState("");
    const [error, setError] = useState("");
    const save = useMutation({
        mutationFn: saveTumeiaiXiangongSetting,
        onSuccess: (next) => {
            queryClient.setQueryData(queryKey, next);
            setOpen(false);
        },
        onError: (reason) => setError(reason instanceof Error ? reason.message : "保存失败，请稍后重试"),
    });
    if (!userId) return null;

    const active = setting?.mode === "own" || Boolean(setting?.gpuImage);
    const label = buttonLabel(setting);
    const ownNeedsToken = mode === "own" && !setting?.connected;
    const imageOptions = tumeiaiXiangongImageOptions(mode, setting?.gpuImage ?? "");

    const openDialog = () => {
        setMode(setting?.mode ?? "relay");
        setImage(setting?.gpuImage ?? "");
        setToken("");
        setError("");
        setOpen(true);
    };
    const submit = () => {
        const nextImage = image.trim();
        if (nextImage && !tumeiaiIsXiangongImageId(nextImage)) {
            setError("镜像 ID 格式不正确，应为镜像的 UUID");
            return;
        }
        if (!tumeiaiXiangongImageAllowed(mode, nextImage)) {
            setError(mode === "relay" ? "该镜像只支持自有显卡，请切换到「自有显卡」或改选其他镜像" : "该镜像属于平台账号，只能用于中转，请改选其他镜像");
            return;
        }
        if (ownNeedsToken && !token.trim()) {
            setError("请填写访问令牌");
            return;
        }
        setError("");
        save.mutate({ mode, gpuImage: nextImage, ...(mode === "own" && token.trim() ? { accessToken: token.trim() } : {}) });
    };

    return (
        // 零高度锚点贴在选项底部，按钮浮在该行右下角，不改动上游行布局。
        <div className="relative h-0">
            <button
                type="button"
                className="absolute bottom-2 right-3 z-[1] inline-flex h-6 items-center gap-1 rounded-md border border-[var(--user-border,currentColor)] px-2 text-[var(--fs-tiny)] leading-none opacity-80 transition-opacity hover:opacity-100 focus-visible:opacity-100 data-[active]:border-[var(--user-accent,currentColor)] data-[active]:text-[var(--user-accent,currentColor)] [&>svg]:size-3"
                aria-label={`算力来源：${label}`}
                aria-pressed={active}
                title={`算力来源：${label}`}
                data-active={active || undefined}
                onClick={(event) => {
                    event.stopPropagation();
                    openDialog();
                }}
            >
                <Server aria-hidden="true" />
                <span>{label}</span>
            </button>
            <AppModal
                open={open}
                title="MiniMax H3 算力来源"
                okText="保存"
                cancelText="取消"
                onOk={submit}
                confirmLoading={save.isPending}
                onCancel={() => setOpen(false)}
                width={480}
                // 选择器 Popover 位于其下层，弹窗交互不应关闭或穿透到画布。
                zIndex={2100}
                modalRender={(node) => (
                    <div data-canvas-no-zoom onMouseDown={(event) => event.stopPropagation()} onPointerDown={(event) => event.stopPropagation()}>
                        {node}
                    </div>
                )}
            >
                <div className="grid gap-4">
                    <Segmented<TumeiaiXiangongMode>
                        block
                        value={mode}
                        onChange={(value) => {
                            setMode(value);
                            setError("");
                        }}
                        options={[
                            { label: "中转", value: "relay" },
                            { label: "自有显卡", value: "own" },
                        ]}
                    />
                    <p className="m-0 text-[var(--fs-label)] text-[var(--user-ink-muted)]">
                        {mode === "own" ? "视频直接提交到你自己的显卡，本站不扣积分，显卡费用由你的显卡账号结算。没有空闲显卡时会按下方镜像自动租用 1 台，空闲后自动关机。" : "经平台中转生成，按 minimax-h3-xs 价格扣积分。"}
                    </p>
                    {mode === "own" ? (
                        <label className="grid gap-1.5">
                            <span className="text-[var(--fs-label)] font-medium">访问令牌</span>
                            <Input.Password
                                autoFocus
                                value={token}
                                autoComplete="off"
                                placeholder={setting?.connected ? "已连接；更换显卡账号时重新填写" : "粘贴访问令牌"}
                                maxLength={4096}
                                onChange={(event) => setToken(event.target.value)}
                                onPressEnter={submit}
                            />
                        </label>
                    ) : null}
                    <label className="grid gap-1.5">
                        <span className="text-[var(--fs-label)] font-medium">GPU 镜像</span>
                        <Select
                            value={image}
                            options={imageOptions}
                            optionRender={(option) => (
                                <div className="grid">
                                    <span>{option.data.label}</span>
                                    {option.data.description ? <span className="text-[var(--fs-tiny)] text-[var(--user-ink-muted)]">{option.data.description}</span> : null}
                                </div>
                            )}
                            // 弹窗 zIndex 为 2100，下拉挂在 body 上并提到弹窗之上，避免被弹窗裁剪或遮住。
                            styles={{ popup: { root: { zIndex: 2200 } } }}
                            listHeight={360}
                            onChange={(value) => {
                                setImage(value);
                                setError("");
                            }}
                        />
                        <span className="text-[var(--fs-tiny)] text-[var(--user-ink-muted)]">{mode === "own" ? "自动租用新实例时使用的镜像；所选镜像按其专用工作流生成。" : "生成时使用的平台镜像；专用工作流镜像按其工作流生成。"}</span>
                    </label>
                    {error ? (
                        <p role="alert" className="m-0 text-[var(--fs-label)]" style={{ color: "var(--color-status-error)" }}>
                            {error}
                        </p>
                    ) : null}
                </div>
            </AppModal>
        </div>
    );
}
