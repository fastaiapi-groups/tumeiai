import { App, Button, Input, Pagination, Segmented, Select, Space, Switch } from "antd";
import { useEffect, useState } from "react";
import { AppModal } from "@/components/ui/product/app-modal";
import { saveAdminSubscriptionPriceComparison, type SubscriptionPriceComparison } from "@/services/api/subscriptions";
import { comparisonPayload, localeOptions, type EditorRow } from "./subscription-admin-data";
import { featureComparisonCodes, isFeatureComparison } from "@/lib/subscription-feature-comparison";

export function SubscriptionComparisonEditor({ record, open, onClose, onSaved }: { record?: SubscriptionPriceComparison; open: boolean; onClose: () => void; onSaved: () => Promise<void> }) {
    const { message } = App.useApp();
    const [value, setValue] = useState<EditorRow>({ columns: [] });
    const locale = "zh-CN";
    const [category, setCategory] = useState("all");
    const [page, setPage] = useState(1);
    const [query, setQuery] = useState("");
    const [saving, setSaving] = useState(false);
    useEffect(() => {
        if (open) {
            setValue(record ? structuredClone(record) : { code: "", sortOrder: 10, enabled: true, columns: [] });
            setCategory("all");
            setQuery("");
        }
    }, [open, record]);
    const suffix = "Zh";
    const columns: EditorRow[] = value.columns || [];
    const rows: EditorRow[] = [...new Map<string, EditorRow>(columns.flatMap((c) => c.rows || []).map((r: EditorRow) => [r.code, r] as [string, EditorRow])).values()].sort((a, b) => a.sortOrder - b.sortOrder);
    const filteredRows = rows.filter(
        (r) =>
            (category === "all" || r.category === category) &&
            String(r["label" + suffix] || "")
                .toLowerCase()
                .includes(query.toLowerCase()),
    );
    useEffect(() => {
        setPage(1);
    }, [category, query, open, record]);
    const changeColumn = (index: number, key: string, next: unknown) => setValue((v) => ({ ...v, columns: v.columns.map((c: EditorRow, i: number) => (i === index ? { ...c, [key]: next } : c)) }));
    const changeRow = (code: string, key: string, next: string, column?: number) =>
        setValue((v) => ({ ...v, columns: v.columns.map((c: EditorRow, i: number) => ({ ...c, rows: c.rows.map((r: EditorRow) => (r.code === code && (column === undefined || i === column) ? { ...r, [key]: next } : r)) })) }));
    const save = async () => {
        try {
            if (!value.code?.trim() || !value.titleZh?.trim() || !columns.length) throw Error("请填写编码、中文标题，并至少添加一个比较对象");
            setSaving(true);
            await saveAdminSubscriptionPriceComparison(comparisonPayload(value));
            message.success("比较表已保存");
            onClose();
            await onSaved();
        } catch (error) {
            message.error(error instanceof Error ? error.message : "保存失败");
        } finally {
            setSaving(false);
        }
    };
    return (
        <AppModal
            title="编辑比较表"
            open={open}
            onCancel={() => {
                if (!saving) onClose();
            }}
            footer={null}
            width={1280}
            style={{ top: 24 }}
            styles={{ body: { display: "flex", flexDirection: "column", maxHeight: "calc(100dvh - 150px)" } }}
        >
            <p className="subscription-admin-intro">一行一个指标，一列一个套餐，统一维护中文内容。</p>
            <Space className="mb-4">
                <Switch checked={value.enabled} onChange={(enabled) => setValue({ ...value, enabled })} aria-label="前台展示比较表" />
                前台展示（关闭后仅供后台参考）
            </Space>
            <div className="subscription-admin-toolbar">
                <Select
                    aria-label="比较表展示位置"
                    disabled={!!record}
                    value={isFeatureComparison(value.code) ? value.code : "standalone"}
                    style={{ width: 240 }}
                    options={[
                        { value: "standalone", label: "独立价格比较表" },
                        { value: featureComparisonCodes.month, label: "完整套餐对比 · 月付" },
                        { value: featureComparisonCodes.year, label: "完整套餐对比 · 年付" },
                    ]}
                    onChange={(code) => setValue({ ...value, code: code === "standalone" ? "" : code })}
                />

                <Input aria-label="比较表编码" placeholder="比较表编码" value={value.code} disabled={!!record} style={{ width: 220 }} onChange={(e) => setValue({ ...value, code: e.target.value })} />
            </div>
            <Space orientation="vertical" className="w-full mb-4">
                <Input aria-label="比较表标题" placeholder="此语言的标题" value={value["title" + suffix] || ""} onChange={(e) => setValue({ ...value, ["title" + suffix]: e.target.value })} />
                <Input aria-label="比较表说明" placeholder="来源、口径和说明" value={value["subtitle" + suffix] || ""} onChange={(e) => setValue({ ...value, ["subtitle" + suffix]: e.target.value })} />
            </Space>
            <div className="subscription-admin-toolbar">
                <Space>
                    <Select aria-label="筛选比较分组" value={category} onChange={setCategory} options={[{ value: "all", label: "全部指标" }, ...[...new Set(rows.map((r) => r.category))].map((v) => ({ value: v, label: v }))]} />
                    <Input.Search aria-label="搜索比较指标" placeholder="搜索模型或指标" value={query} onChange={(e) => setQuery(e.target.value)} />
                </Space>
                <Space>
                    <Button
                        onClick={() =>
                            setValue((v) => ({
                                ...v,
                                columns: [...v.columns, { code: crypto.randomUUID(), sortOrder: columns.length + 1, featured: false, nameZh: "新对象", nameEn: "New", rows: rows.map((r) => ({ ...r, valueZh: "", valueEn: "", valueJa: "", valueKo: "" })) }],
                            }))
                        }
                    >
                        添加比较对象
                    </Button>
                    <Button
                        disabled={!columns.length}
                        onClick={() => {
                            const row = { code: crypto.randomUUID(), category: category === "all" ? "pricing" : category, sortOrder: rows.length + 1, labelZh: "新指标", labelEn: "New metric" };
                            setValue((v) => ({ ...v, columns: v.columns.map((c: EditorRow) => ({ ...c, rows: [...c.rows, { ...row }] })) }));
                        }}
                    >
                        添加指标
                    </Button>
                </Space>
            </div>
            <div className="subscription-matrix-scroll">
                <table className="subscription-matrix">
                    <thead>
                        <tr>
                            <th>指标 / 分组</th>
                            {columns.map((c, i) => (
                                <th key={c.code}>
                                    <Input aria-label={`对象 ${i + 1} 名称`} value={c["name" + suffix] || ""} onChange={(e) => changeColumn(i, "name" + suffix, e.target.value)} />
                                    {isFeatureComparison(value.code) ? <Input aria-label={`对象 ${i + 1} 套餐编码`} placeholder="关联套餐编码，如 plus" value={c.code} onChange={(e) => changeColumn(i, "code", e.target.value)} /> : null}
                                    <Space className="mt-2">
                                        <Switch size="small" checked={c.featured} onChange={(v) => changeColumn(i, "featured", v)} />
                                        推荐
                                        <Button type="text" danger size="small" onClick={() => setValue({ ...value, columns: columns.filter((_, n) => n !== i) })}>
                                            移除列
                                        </Button>
                                    </Space>
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {filteredRows.slice((page - 1) * 10, page * 10).map((row) => (
                            <tr key={row.code}>
                                <td>
                                    <Input.TextArea aria-label="指标名称" autoSize={{ minRows: 2, maxRows: 4 }} value={row["label" + suffix] || ""} onChange={(e) => changeRow(row.code, "label" + suffix, e.target.value)} />
                                    <Input aria-label="指标分组" size="small" value={row.category} onChange={(e) => changeRow(row.code, "category", e.target.value)} />
                                    <Button type="text" size="small" danger onClick={() => setValue((v) => ({ ...v, columns: v.columns.map((c: EditorRow) => ({ ...c, rows: c.rows.filter((r: EditorRow) => r.code !== row.code) })) }))}>
                                        移除指标
                                    </Button>
                                </td>
                                {columns.map((column, i) => (
                                    <td key={column.code}>
                                        <Input.TextArea
                                            aria-label={`${column["name" + suffix] || column.code} / ${row["label" + suffix] || row.code}`}
                                            value={column.rows.find((r: EditorRow) => r.code === row.code)?.["value" + suffix] || ""}
                                            onChange={(e) => changeRow(row.code, "value" + suffix, e.target.value, i)}
                                            autoSize={{ minRows: 2, maxRows: 5 }}
                                        />
                                    </td>
                                ))}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            <Pagination className="mt-4" current={page} pageSize={10} total={filteredRows.length} showSizeChanger={false} onChange={setPage} />
            <div className="subscription-editor-footer">
                <span>
                    {columns.length} 个对象 · {rows.length} 个指标
                </span>
                <Space>
                    <Button onClick={onClose} disabled={saving}>
                        取消
                    </Button>
                    <Button type="primary" loading={saving} onClick={() => void save()}>
                        保存比较表
                    </Button>
                </Space>
            </div>
        </AppModal>
    );
}
