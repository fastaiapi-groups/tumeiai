import { Alert, App, Button, Input, Space, Table } from "antd";
import { useState } from "react";
import { AppModal } from "@/components/ui/product/app-modal";
import { createAdminSubscriptionFAQ, createAdminSubscriptionPlan, saveAdminSubscriptionPriceComparison, type AdminSubscriptionPlanRecord } from "@/services/api/subscriptions";
import { updateSubscriptionPlan } from "@/services/api/subscription-editor";
import { updateAdminFAQ, type AdminFAQ } from "@/services/api/subscription-faq-editor";
import { type EditorRow } from "./subscription-admin-data";
import { parseCatalogImport, prepareImportPlans, type CatalogImport } from "./subscription-import-data";

export function SubscriptionCatalogImport({ open, plans, faqs, onClose, onSaved }: { open: boolean; plans: AdminSubscriptionPlanRecord[]; faqs: AdminFAQ[]; onClose: () => void; onSaved: () => Promise<void> }) {
    const { message } = App.useApp();
    const [text, setText] = useState("");
    const [data, setData] = useState<CatalogImport | null>(null);
    const [saving, setSaving] = useState(false);
    const [results, setResults] = useState<string[]>([]);
    const [error, setError] = useState("");
    const preview = () => {
        try {
            const next = parseCatalogImport(text);
            prepareImportPlans(next, plans);
            setData(next);
            setError("");
            setResults([]);
        } catch (e) {
            setError(e instanceof Error ? e.message : "配置无效");
            setData(null);
        }
    };
    const save = async () => {
        if (!data || saving) return;
        const completed = new Set(results);
        setSaving(true);
        setError("");
        const mark = (key: string) => {
            completed.add(key);
            setResults([...completed]);
        };
        try {
            for (const { record, payload } of prepareImportPlans(data, plans)) {
                const key = "套餐：" + payload.code;
                if (completed.has(key)) continue;
                if (record) await updateSubscriptionPlan(record.revision.id, payload);
                else await createAdminSubscriptionPlan(payload);
                mark(key);
            }
            for (const comparison of data.comparisons || []) {
                const key = "比较表：" + comparison.set.code;
                if (completed.has(key)) continue;
                await saveAdminSubscriptionPriceComparison(comparison);
                mark(key);
            }
            for (const faq of data.faqs || []) {
                const key = "FAQ：" + faq.faqCode;
                if (completed.has(key)) continue;
                const existing = faqs.find((f) => f.faqCode === faq.faqCode);
                if (existing) await updateAdminFAQ(existing.id, faq as Omit<AdminFAQ, "id">);
                else await createAdminSubscriptionFAQ(faq);
                mark(key);
            }
            message.success("导入完成。套餐已保存为草稿，请核对后发布。");
        } catch (e) {
            setError((e instanceof Error ? e.message : "导入失败") + "；已保存的项目保留，可继续重试剩余项目。");
        } finally {
            setSaving(false);
            await onSaved();
        }
    };
    return (
        <AppModal
            title="批量导入目录"
            open={open}
            onCancel={() => {
                if (!saving) onClose();
            }}
            footer={null}
            width={920}
        >
            <p className="subscription-admin-intro">先导出备份，再导入配置并检查预览。同编码套餐保存新草稿；比较表覆盖同编码内容；FAQ 按启用状态展示。</p>
            <label>
                选择目录文件{" "}
                <input
                    aria-label="选择目录文件"
                    type="file"
                    accept=".json,application/json"
                    disabled={saving}
                    onChange={async (e) => {
                        const f = e.target.files?.[0];
                        if (f) {
                            setText(await f.text());
                            setData(null);
                        }
                    }}
                />
            </label>
            <Input.TextArea
                aria-label="目录配置"
                value={text}
                onChange={(e) => {
                    setText(e.target.value);
                    setData(null);
                }}
                rows={5}
                className="my-4"
                placeholder='{"version":1,"plans":[],"comparisons":[],"faqs":[]}'
                disabled={saving}
            />
            <Button onClick={preview} disabled={saving}>
                检查并预览
            </Button>
            {error && <Alert type="error" title={error} className="mt-4" />}
            {data && (
                <div className="mt-4">
                    <Alert type="info" title={`${data.plans?.length || 0} 个套餐草稿 · ${data.comparisons?.length || 0} 张比较表 · ${data.faqs?.length || 0} 条 FAQ`} description={data.source || "未填写来源"} />
                    <Table
                        size="small"
                        pagination={false}
                        rowKey="code"
                        dataSource={prepareImportPlans(data, plans).map(({ payload }) => payload)}
                        columns={[
                            { title: "套餐", dataIndex: "code" },
                            { title: "实收价格", render: (_, row) => (row.prices || []).map((p: EditorRow) => `${p.billingInterval}: ${p.currency} ${(p.amountMinor / 100).toFixed(2)}`).join(" / ") },
                        ]}
                    />
                    <p>{results.length ? "已保存：" + results.join("、") : "确认后比较表与已启用 FAQ 会立即更新；套餐需单独发布。"}</p>
                </div>
            )}
            <div className="subscription-editor-footer">
                <Button onClick={onClose} disabled={saving}>
                    关闭
                </Button>
                <Space>
                    <Button type="primary" disabled={!data} loading={saving} onClick={() => void save()}>
                        确认导入
                    </Button>
                </Space>
            </div>
        </AppModal>
    );
}
