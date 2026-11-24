// tumeiai: 渠道「一键同步价格」：读取上游价格表 → 预览差异 → 确认写入 → 展示结果。
import { useEffect, useMemo, useRef, useState } from "react";
import { Alert, App, Button, Checkbox, Input, InputNumber, Segmented, Steps, Switch, Table } from "antd";
import { BadgeDollarSign } from "lucide-react";

import { AdminModal } from "@/pages/admin/ui/overlays";
import { Select } from "@/components/ui/base/select";
import type { ModelChannel } from "@/stores/use-config-store";
import {
    applyChannelPriceSync,
    getChannelPriceAutoSync,
    previewChannelPriceSync,
    runChannelPriceAutoSync,
    saveChannelPriceAutoSync,
    type ChannelPriceAutoSync,
    type ChannelPriceSyncCreatePlan,
    type ChannelPriceSyncModelPlan,
    type ChannelPriceSyncPreview,
    type ChannelPriceSyncResult,
    type ChannelPriceSyncSettings,
} from "@/services/api/tumeiai-channel-price-sync";
import { AdminStatusBadge } from "./admin-ui";
import { formatModelPrice } from "./channel-model-pricing";
import {
    defaultPriceSyncCreateSelection,
    defaultPriceSyncSelection,
    filterPriceSyncPlans,
    isActionable,
    loadPriceSyncSettings,
    priceChangeText,
    priceChangeTone,
    priceSyncApplyCreates,
    priceSyncApplyModels,
    priceSyncCurrencyUnit,
    priceSyncGroupText,
    priceSyncRequest,
    priceSyncSelectionCounts,
    priceSyncStatusMeta,
    savePriceSyncSettings,
    type PriceSyncFilter,
} from "./tumeiai-channel-price-sync";
import "./tumeiai-channel-price-sync.css";

type Phase = "loading" | "review" | "applying" | "done";

const stepIndex: Record<Phase, number> = { loading: 0, review: 1, applying: 2, done: 3 };

// 选择器不接受空值，用占位值表示“按渠道 Key 自动识别分组”。
const autoGroupValue = "__auto__";

export function TumeiaiChannelPriceSyncButton({ channel, onSynced }: { channel: ModelChannel; onSynced: () => Promise<void> }) {
    const [open, setOpen] = useState(false);
    return (
        <>
            <Button icon={<BadgeDollarSign className="size-3.5" />} onClick={() => setOpen(true)}>
                一键同步价格
            </Button>
            {open && <TumeiaiChannelPriceSyncDialog channel={channel} onClose={() => setOpen(false)} onSynced={onSynced} />}
        </>
    );
}

function TumeiaiChannelPriceSyncDialog({ channel, onClose, onSynced }: { channel: ModelChannel; onClose: () => void; onSynced: () => Promise<void> }) {
    const { message } = App.useApp();
    const [settings, setSettings] = useState<ChannelPriceSyncSettings>(() => loadPriceSyncSettings(channel.id));
    const [phase, setPhase] = useState<Phase>("loading");
    const [error, setError] = useState("");
    const [preview, setPreview] = useState<ChannelPriceSyncPreview | null>(null);
    const [selected, setSelected] = useState<string[]>([]);
    const [selectedCreates, setSelectedCreates] = useState<string[]>([]);
    const [dirty, setDirty] = useState(false);
    const [filter, setFilter] = useState<PriceSyncFilter>("all");
    const [result, setResult] = useState<ChannelPriceSyncResult | null>(null);
    const [applied, setApplied] = useState<ChannelPriceSyncModelPlan[]>([]);
    const [created, setCreated] = useState<string[]>([]);
    const abortRef = useRef<AbortController | null>(null);

    const runPreview = async (next: ChannelPriceSyncSettings) => {
        abortRef.current?.abort();
        const controller = new AbortController();
        abortRef.current = controller;
        setPhase("loading");
        setError("");
        setResult(null);
        try {
            const data = await previewChannelPriceSync(
                channel.id,
                priceSyncRequest(
                    next,
                    preview?.models.map((plan) => plan.modelId),
                ),
                controller.signal,
            );
            if (controller.signal.aborted) return;
            setPreview(data);
            setSelected(defaultPriceSyncSelection(data));
            setSelectedCreates(defaultPriceSyncCreateSelection(data));
            setDirty(false);
            savePriceSyncSettings(channel.id, next);
        } catch (cause) {
            if (controller.signal.aborted) return;
            setError(cause instanceof Error ? cause.message : "读取上游价格失败");
        } finally {
            if (!controller.signal.aborted) setPhase("review");
        }
    };

    useEffect(() => {
        void runPreview(settings);
        return () => abortRef.current?.abort();
        // 打开弹窗时按上次的设置自动预览一次。
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const update = (patch: Partial<ChannelPriceSyncSettings>) => {
        setSettings((current) => ({ ...current, ...patch }));
        setDirty(true);
    };
    const setModelMarkup = (modelId: string, value: number | null) => {
        setSettings((current) => {
            const modelMarkups = { ...(current.modelMarkups ?? {}) };
            if (value === null) delete modelMarkups[modelId];
            else modelMarkups[modelId] = value;
            return { ...current, modelMarkups };
        });
        setDirty(true);
    };

    const modelCounts = preview ? priceSyncSelectionCounts(preview, selected) : { update: 0, disable: 0, total: 0 };
    const createCount = preview ? priceSyncApplyCreates(preview, selectedCreates).length : 0;
    const counts = { ...modelCounts, create: createCount, total: modelCounts.total + createCount };
    const busy = phase === "loading" || phase === "applying";

    const apply = async () => {
        if (!preview || dirty || busy || !counts.total) return;
        const models = priceSyncApplyModels(preview, selected);
        const creates = priceSyncApplyCreates(preview, selectedCreates);
        setPhase("applying");
        setError("");
        try {
            const data = await applyChannelPriceSync(
                channel.id,
                priceSyncRequest(
                    settings,
                    preview.models.map((plan) => plan.modelId),
                ),
                models,
                creates,
            );
            const chosen = new Set(models.map((item) => item.modelId));
            setCreated(creates.map((item) => item.modelId));
            setApplied(preview.models.filter((plan) => chosen.has(plan.modelId)));
            setResult(data);
            setPhase("done");
            savePriceSyncSettings(channel.id, settings);
            try {
                await onSynced();
            } catch {
                message.warning("价格已同步，但模型列表刷新失败，请手动刷新");
            }
        } catch (cause) {
            setError(cause instanceof Error ? cause.message : "同步价格失败");
            setPhase("review");
        }
    };

    const footer =
        phase === "done"
            ? [
                  <Button key="again" onClick={() => void runPreview(settings)}>
                      再次预览
                  </Button>,
                  <Button key="close" type="primary" onClick={onClose}>
                      完成
                  </Button>,
              ]
            : [
                  <Button key="cancel" disabled={phase === "applying"} onClick={onClose}>
                      取消
                  </Button>,
                  <Button key="apply" type="primary" loading={phase === "applying"} disabled={!preview || dirty || phase === "loading" || !counts.total} onClick={() => void apply()}>
                      {counts.total ? `同步 ${counts.total} 个模型（新建 ${counts.create}，改价 ${counts.update}，禁用 ${counts.disable}）` : "没有需要同步的模型"}
                  </Button>,
              ];

    return (
        <AdminModal
            title={`一键同步价格 · ${channel.name}`}
            open
            centered
            width={1200}
            rootClassName="tumeiai-price-sync-modal"
            onCancel={phase === "applying" ? undefined : onClose}
            closable={phase !== "applying"}
            mask={{ closable: false }}
            keyboard={phase !== "applying"}
            footer={footer}
        >
            <div className="tumeiai-price-sync">
                <Steps size="small" current={stepIndex[phase]} status={error ? "error" : phase === "done" ? "finish" : "process"} items={[{ title: "读取上游价格表" }, { title: "核对差异" }, { title: "写入价格" }, { title: "完成" }]} />
                <div className="tumeiai-price-sync-controls">
                    <label className="tumeiai-price-sync-field">
                        <span>利润比例（加价率）</span>
                        <InputNumber aria-label="利润比例" min={0} max={1000} step={5} precision={2} suffix="%" value={settings.markupPercent} disabled={busy || phase === "done"} onChange={(value) => update({ markupPercent: value ?? 0 })} />
                    </label>
                    <label className="tumeiai-price-sync-field">
                        <span>上游分组</span>
                        <Select
                            aria-label="上游分组"
                            value={settings.upstreamGroup || autoGroupValue}
                            disabled={busy || phase === "done"}
                            onChange={(value) => update({ upstreamGroup: value === autoGroupValue ? "" : String(value) })}
                            options={[
                                { value: autoGroupValue, label: preview?.groupSource === "detected" ? `按 Key 识别：${preview.upstreamGroup} · ×${preview.groupRatio}` : "按 Key 自动识别" },
                                ...(preview?.groups ?? []).map((group) => ({ value: group.name, label: `${group.name} · ×${group.ratio}` })),
                            ]}
                        />
                    </label>
                    <label className="tumeiai-price-sync-field">
                        <span>上游 1 单位折合（元）</span>
                        <InputNumber aria-label="上游计价单位折合人民币" min={0.0001} max={1000} step={0.1} value={settings.upstreamUnitYuan ?? 1} disabled={busy || phase === "done"} onChange={(value) => update({ upstreamUnitYuan: value ?? 1 })} />
                    </label>
                    <label className="tumeiai-price-sync-field is-wide">
                        <span>价格表地址</span>
                        <Input aria-label="价格表地址" placeholder={preview?.pricingUrl || "默认：渠道域名 /api/pricing"} value={settings.pricingUrl} disabled={busy || phase === "done"} onChange={(event) => update({ pricingUrl: event.target.value })} />
                    </label>
                    <Checkbox checked={settings.disableMissing} disabled={busy || phase === "done"} onChange={(event) => update({ disableMissing: event.target.checked })}>
                        上游没有的模型自动禁用
                    </Checkbox>
                    <Button type={dirty ? "primary" : "default"} loading={phase === "loading"} disabled={phase === "applying" || phase === "done"} onClick={() => void runPreview(settings)}>
                        {dirty ? "按新设置重新预览" : "重新读取上游价格"}
                    </Button>
                </div>
                <p className="tumeiai-price-sync-note">
                    新成本 = 上游价格 × 分组倍率 × 折合元（1 元 = 1 积分）；新售价 = 新成本 ×（1 + 利润比例），向上取整。分组默认按渠道 Key 能用的型号自动识别。上游有、本渠道没有的文本 / 图片型号按上游规格新建并启用（人民币计价）。
                </p>
                <PriceAutoSyncPanel
                    channelId={channel.id}
                    settings={settings}
                    disabled={busy}
                    onRan={async () => {
                        await onSynced().catch(() => undefined);
                        await runPreview(settings);
                    }}
                />
                {dirty && phase === "review" && <Alert type="info" showIcon title="设置已修改，请重新预览后再同步。" />}
                {error && <Alert type="error" showIcon title={error} />}
                {phase === "loading" && <div className="tumeiai-price-sync-progress">正在读取上游价格表并计算差异…</div>}
                {phase === "applying" && <div className="tumeiai-price-sync-progress">正在写入 {counts.total} 个模型的价格，请勿关闭…</div>}
                {phase === "done" && result && <PriceSyncResultPanel result={result} applied={applied} created={created} />}
                {preview && phase !== "done" && phase !== "loading" && (
                    <>
                        <PriceSyncCreates plans={preview.creates ?? []} selected={selectedCreates} onSelect={setSelectedCreates} disabled={busy} />
                        <PriceSyncReview preview={preview} selected={selected} onSelect={setSelected} filter={filter} onFilter={setFilter} settings={settings} disabled={busy} onModelMarkup={setModelMarkup} />
                    </>
                )}
            </div>
        </AdminModal>
    );
}

function PriceSyncReview({
    preview,
    selected,
    onSelect,
    filter,
    onFilter,
    settings,
    disabled,
    onModelMarkup,
}: {
    preview: ChannelPriceSyncPreview;
    selected: string[];
    onSelect: (ids: string[]) => void;
    filter: PriceSyncFilter;
    onFilter: (filter: PriceSyncFilter) => void;
    settings: ChannelPriceSyncSettings;
    disabled: boolean;
    onModelMarkup: (modelId: string, value: number | null) => void;
}) {
    const rows = useMemo(() => filterPriceSyncPlans(preview.models, filter), [preview.models, filter]);
    const { summary } = preview;
    return (
        <>
            <div className="tumeiai-price-sync-summary">
                <span>
                    上游 {preview.pricingUrl} · 分组 {priceSyncGroupText(preview)}
                </span>
                <span>
                    新建 {summary.create ?? 0} · 改价 {summary.update} · 禁用 {summary.disable} · 无变化 {summary.unchanged} · 上游缺失 {summary.missing} · 跳过 {summary.skipped} · 有问题 {summary.failed}
                </span>
            </div>
            <div className="tumeiai-price-sync-list-heading">
                <Segmented<PriceSyncFilter>
                    size="small"
                    value={filter}
                    onChange={onFilter}
                    options={[
                        { value: "all", label: `全部 ${preview.models.length}` },
                        { value: "actionable", label: `待同步 ${preview.models.filter(isActionable).length}` },
                        { value: "problem", label: "需关注" },
                    ]}
                />
                <span>已选 {selected.length} 个</span>
            </div>
            <Table<ChannelPriceSyncModelPlan>
                className="tumeiai-price-sync-table"
                rowKey="modelId"
                size="small"
                dataSource={rows}
                pagination={false}
                tableLayout="fixed"
                scroll={{ x: 1080, y: 420 }}
                locale={{ emptyText: "没有符合条件的模型" }}
                rowSelection={{
                    selectedRowKeys: selected,
                    onChange: (keys) => onSelect(keys.map(String)),
                    getCheckboxProps: (plan) => ({ disabled: disabled || !isActionable(plan) }),
                }}
                columns={[
                    {
                        title: "模型",
                        width: 220,
                        render: (_, plan) => (
                            <div className="tumeiai-price-sync-identity">
                                <strong>{plan.displayName}</strong>
                                <small className="admin-monospace">{plan.providerModelKey}</small>
                                <span className="tumeiai-price-sync-badges">
                                    <AdminStatusBadge label={priceSyncStatusMeta[plan.status].label} tone={priceSyncStatusMeta[plan.status].tone} />
                                    {plan.action === "disable" && <AdminStatusBadge label="将禁用" tone="error" />}
                                    {!plan.enabled && <AdminStatusBadge label="已停用" />}
                                </span>
                            </div>
                        ),
                    },
                    {
                        title: "利润比例",
                        width: 150,
                        render: (_, plan) =>
                            plan.status === "missing" || plan.status === "skipped" ? (
                                <span className="tumeiai-price-sync-muted">—</span>
                            ) : (
                                <div className="tumeiai-price-sync-identity">
                                    <InputNumber
                                        size="small"
                                        aria-label={`${plan.displayName} 利润比例`}
                                        min={0}
                                        max={1000}
                                        precision={2}
                                        suffix="%"
                                        placeholder={`${settings.markupPercent}`}
                                        value={settings.modelMarkups?.[plan.modelId] ?? null}
                                        disabled={disabled}
                                        onChange={(value) => onModelMarkup(plan.modelId, value)}
                                    />
                                    {plan.currentMarkupPercent !== undefined && (
                                        <button
                                            type="button"
                                            className="tumeiai-price-sync-link"
                                            disabled={disabled}
                                            title="按现售价相对新成本的利润比例设置"
                                            onClick={() => onModelMarkup(plan.modelId, Math.max(0, Math.min(1000, plan.currentMarkupPercent ?? 0)))}
                                        >
                                            现售价利润 {plan.currentMarkupPercent}%
                                        </button>
                                    )}
                                </div>
                            ),
                    },
                    { title: "规格价格（旧 → 新）", width: 520, render: (_, plan) => <PriceSyncTiers plan={plan} /> },
                    {
                        title: "说明",
                        width: 190,
                        render: (_, plan) => (
                            <div className="tumeiai-price-sync-identity">
                                {plan.reason && <small className="is-error">{plan.reason}</small>}
                                {plan.notes.map((note) => (
                                    <small key={note}>{note}</small>
                                ))}
                                {plan.upstreamOnlyTiers.length > 0 && <small>上游另有档位：{plan.upstreamOnlyTiers.join("、")}（需手动新增规格）</small>}
                            </div>
                        ),
                    },
                ]}
            />
            {preview.upstreamOnly.length > 0 && (
                <details className="tumeiai-price-sync-upstream-only">
                    <summary>上游有 {preview.upstreamOnly.length} 个型号本渠道尚未接入</summary>
                    <p className="admin-monospace">{preview.upstreamOnly.join("、")}</p>
                </details>
            )}
        </>
    );
}

function PriceSyncTiers({ plan }: { plan: ChannelPriceSyncModelPlan }) {
    if (!plan.tiers.length) return <span className="tumeiai-price-sync-muted">{plan.status === "missing" ? "上游价格表中没有该型号" : "—"}</span>;
    const saleUnit = priceSyncCurrencyUnit(plan.priceCurrency);
    return (
        <div className="tumeiai-price-sync-tiers">
            {plan.tiers.map((tier) => (
                <div key={tier.tierId} className="tumeiai-price-sync-tier">
                    <span className="tumeiai-price-sync-tier-label">{tier.label}</span>
                    {tier.status === "error" || tier.status === "skipped" ? (
                        <small className={tier.status === "error" ? "is-error" : "tumeiai-price-sync-muted"}>{tier.reason}</small>
                    ) : (
                        <div className="tumeiai-price-sync-fields">
                            {tier.fields.map((field) => (
                                <div key={field.key} className="tumeiai-price-sync-field-row">
                                    {tier.fields.length > 1 && <small>{field.label}</small>}
                                    <span>
                                        成本 {formatModelPrice(field.oldCost)} → <strong>{formatModelPrice(field.newCost)}</strong> 积分
                                        <AdminStatusBadge label={priceChangeText(field.oldCost, field.newCost)} tone={priceChangeTone(field.oldCost, field.newCost)} />
                                        {field.legacyCost && <AdminStatusBadge label="旧口径" tone="warning" title="旧成本约为新成本的 100 倍，疑似 1 元 = 100 积分旧口径" />}
                                    </span>
                                    <span>
                                        售价 {formatModelPrice(field.oldSale)} → <strong>{formatModelPrice(field.newSale)}</strong> {saleUnit}
                                        <AdminStatusBadge label={priceChangeText(field.oldSale, field.newSale)} tone={priceChangeTone(field.oldSale, field.newSale)} />
                                    </span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            ))}
        </div>
    );
}

function PriceSyncResultPanel({ result, applied, created }: { result: ChannelPriceSyncResult; applied: ChannelPriceSyncModelPlan[]; created: string[] }) {
    const remaining = (result.preview?.models ?? []).filter((plan) => plan.status === "partial" || plan.status === "error" || (plan.status === "missing" && plan.enabled));
    const updated = applied.filter((plan) => plan.action === "update");
    const disabled = applied.filter((plan) => plan.action === "disable");
    return (
        <div className="tumeiai-price-sync-result">
            <Alert type="success" showIcon title={`同步完成：已新建 ${result.created ?? 0} 个模型，已更新 ${result.updated} 个模型的成本价与售价，已禁用 ${result.disabled} 个上游已下架的模型。`} />
            {created.length > 0 && (
                <section>
                    <strong>已新建并启用</strong>
                    <p>{created.join("、")}</p>
                </section>
            )}
            {updated.length > 0 && (
                <section>
                    <strong>已改价</strong>
                    <p>{updated.map((plan) => plan.displayName).join("、")}</p>
                </section>
            )}
            {disabled.length > 0 && (
                <section>
                    <strong>已禁用</strong>
                    <p>{disabled.map((plan) => plan.displayName).join("、")}</p>
                </section>
            )}
            {remaining.length > 0 ? (
                <section>
                    <strong>仍需手动处理（{remaining.length}）</strong>
                    <ul>
                        {remaining.map((plan) => (
                            <li key={plan.modelId}>
                                {plan.displayName}：
                                {plan.reason ||
                                    plan.tiers
                                        .filter((tier) => tier.status === "error")
                                        .map((tier) => `${tier.label} ${tier.reason ?? ""}`)
                                        .join("；")}
                            </li>
                        ))}
                    </ul>
                </section>
            ) : (
                <p className="tumeiai-price-sync-muted">没有遗留问题。</p>
            )}
        </div>
    );
}

const protocolLabels: Record<string, string> = { "chat-completion": "对话 · Chat Completions", "gemini-image": "图片 · Gemini", "openai-image": "图片 · OpenAI Images" };

function PriceSyncCreates({ plans, selected, onSelect, disabled }: { plans: ChannelPriceSyncCreatePlan[]; selected: string[]; onSelect: (keys: string[]) => void; disabled: boolean }) {
    if (!plans.length) return null;
    return (
        <section className="tumeiai-price-sync-creates">
            <div className="tumeiai-price-sync-list-heading">
                <strong>上游有、本渠道没有的型号（{plans.length}）</strong>
                <span>已选新建 {selected.length} 个</span>
            </div>
            <Table<ChannelPriceSyncCreatePlan>
                rowKey="modelKey"
                size="small"
                dataSource={plans}
                pagination={false}
                tableLayout="fixed"
                scroll={{ x: 900, y: 260 }}
                rowSelection={{
                    selectedRowKeys: selected,
                    onChange: (keys) => onSelect(keys.map(String)),
                    getCheckboxProps: (plan) => ({ disabled: disabled || plan.status !== "ready" }),
                }}
                columns={[
                    {
                        title: "型号",
                        width: 240,
                        render: (_, plan) => (
                            <div className="tumeiai-price-sync-identity">
                                <span className="admin-monospace">{plan.modelKey}</span>
                                {plan.existingModelId && <AdminStatusBadge label="补全未分类模型" tone="info" />}
                            </div>
                        ),
                    },
                    { title: "接入方式", width: 180, render: (_, plan) => (plan.protocol ? (protocolLabels[plan.protocol] ?? plan.protocol) : "—") },
                    {
                        title: "规格价格（成本 / 售价，元）",
                        width: 360,
                        render: (_, plan) =>
                            plan.status === "ready" ? (
                                <div className="tumeiai-price-sync-fields">
                                    {plan.fields.map((field) => (
                                        <span key={field.key}>
                                            {plan.fields.length > 1 ? `${field.label} ` : "每次 "}
                                            {formatModelPrice(field.newCost)} / <strong>{formatModelPrice(field.newSale)}</strong>
                                            {plan.billingMode === "token" ? " /百万 Token" : ""}
                                        </span>
                                    ))}
                                </div>
                            ) : (
                                <small className="tumeiai-price-sync-muted">{plan.reason}</small>
                            ),
                    },
                    {
                        title: "说明",
                        width: 200,
                        render: (_, plan) => (
                            <div className="tumeiai-price-sync-identity">
                                {plan.notes.map((note) => (
                                    <small key={note}>{note}</small>
                                ))}
                            </div>
                        ),
                    },
                ]}
            />
        </section>
    );
}

function PriceAutoSyncPanel({ channelId, settings, disabled, onRan }: { channelId: string; settings: ChannelPriceSyncSettings; disabled: boolean; onRan: () => Promise<void> }) {
    const { message } = App.useApp();
    const [state, setState] = useState<ChannelPriceAutoSync | null>(null);
    const [enabled, setEnabled] = useState(false);
    const [intervalMinutes, setIntervalMinutes] = useState(10);
    const [createMissing, setCreateMissing] = useState(true);
    const [busy, setBusy] = useState<"" | "save" | "run">("");

    useEffect(() => {
        const controller = new AbortController();
        getChannelPriceAutoSync(channelId, controller.signal)
            .then((data) => {
                setState(data);
                setEnabled(data.enabled);
                setIntervalMinutes(data.intervalMinutes || 10);
                setCreateMissing(data.createMissing);
            })
            .catch(() => undefined);
        return () => controller.abort();
    }, [channelId]);

    const save = async (nextEnabled = enabled) => {
        setBusy("save");
        try {
            const data = await saveChannelPriceAutoSync(channelId, {
                enabled: nextEnabled,
                upstreamGroup: settings.upstreamGroup?.trim() ?? "",
                markupPercent: settings.markupPercent,
                intervalMinutes,
                createMissing,
                disableMissing: settings.disableMissing,
            });
            setState(data);
            setEnabled(data.enabled);
            message.success(data.enabled ? `已开启自动同步，每 ${data.intervalMinutes} 分钟执行一次` : "已关闭自动同步");
        } catch (cause) {
            message.error(cause instanceof Error ? cause.message : "保存自动同步设置失败");
        } finally {
            setBusy("");
        }
    };

    const run = async () => {
        setBusy("run");
        try {
            const data = await runChannelPriceAutoSync(channelId);
            setState(data);
            if (data.lastStatus === "error") message.error(data.lastMessage || "自动同步失败");
            else message.success(data.lastMessage || "已同步");
            await onRan();
        } catch (cause) {
            message.error(cause instanceof Error ? cause.message : "执行自动同步失败");
        } finally {
            setBusy("");
        }
    };

    const saved = Boolean(state?.createdAt && !state.createdAt.startsWith("0001-"));
    return (
        <div className="tumeiai-price-sync-auto">
            <div className="tumeiai-price-sync-auto-controls">
                <Switch checked={enabled} loading={busy === "save"} disabled={disabled || busy !== ""} onChange={(checked) => void save(checked)} aria-label="自动同步" />
                <strong>自动同步</strong>
                <span>每</span>
                <InputNumber aria-label="自动同步间隔" size="small" min={5} max={1440} step={5} precision={0} value={intervalMinutes} disabled={disabled || busy !== ""} onChange={(value) => setIntervalMinutes(value ?? 10)} />
                <span>分钟</span>
                <Checkbox checked={createMissing} disabled={disabled || busy !== ""} onChange={(event) => setCreateMissing(event.target.checked)}>
                    自动新建上游新型号
                </Checkbox>
                <Button size="small" disabled={disabled || busy !== ""} loading={busy === "save"} onClick={() => void save()}>
                    保存（沿用上方利润比例、分组和禁用设置）
                </Button>
                <Button size="small" disabled={disabled || busy !== "" || !saved} loading={busy === "run"} onClick={() => void run()}>
                    立即执行一次
                </Button>
            </div>
            {state?.lastRunAt && (
                <small className={state.lastStatus === "error" ? "is-error" : "tumeiai-price-sync-muted"}>
                    上次执行 {new Date(state.lastRunAt).toLocaleString("zh-CN")}：{state.lastMessage}
                </small>
            )}
        </div>
    );
}
