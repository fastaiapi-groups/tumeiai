import { App, Button, Input, Popconfirm, Space, Table, Tabs, Tag } from "antd";
import { Download, Plus, RefreshCw, Upload } from "lucide-react";
import { useEffect, useState } from "react";
import {
    getAdminSubscriptionMetrics,
    listAdminSubscriptionPayments,
    listAdminUserSubscriptions,
    listAdminSubscriptionPlans,
    listAdminSubscriptionPriceComparisons,
    publishAdminSubscriptionPlan,
    type AdminSubscriptionPlanRecord,
    type SubscriptionPriceComparison,
} from "@/services/api/subscriptions";
import { listAdminFAQs, type AdminFAQ } from "@/services/api/subscription-faq-editor";
import { AdminPageFrame } from "../components/admin-shell";
import { SubscriptionPlanEditor } from "./subscription-plan-editor";
import { SubscriptionComparisonEditor } from "./subscription-comparison-editor";
import { SubscriptionFAQEditor } from "./subscription-faq-editor";
import { SubscriptionCatalogImport } from "./subscription-catalog-import";
import { SubscriptionCatalogExport } from "./subscription-catalog-export";
import { SubscriptionOperations } from "./subscription-operations";
import { comparisonPayload, latestPlans, planBundle } from "./subscription-admin-data";
import "./subscription-admin.css";
import { SubscriptionVisibilitySetting } from "./subscription-visibility-setting";

export default function AdminSubscriptionsPage() {
    const { message } = App.useApp();
    const [plans, setPlans] = useState<AdminSubscriptionPlanRecord[]>([]);
    const [comparisons, setComparisons] = useState<SubscriptionPriceComparison[]>([]);
    const [faqs, setFAQs] = useState<AdminFAQ[]>([]);
    const [metrics, setMetrics] = useState<Record<string, number>>({});
    const [payments, setPayments] = useState<Record<string, unknown>[]>([]);
    const [users, setUsers] = useState<Record<string, unknown>[]>([]);
    const [loading, setLoading] = useState(false);
    const [publishing, setPublishing] = useState("");
    const [query, setQuery] = useState("");
    const [tab, setTab] = useState("plans");
    const [editor, setEditor] = useState<{ kind: "plan" | "comparison" | "faq" | "import" | "export"; record?: any } | null>(null);
    const load = async () => {
        setLoading(true);
        try {
            const [p, c, f, m, o, u] = await Promise.all([listAdminSubscriptionPlans(), listAdminSubscriptionPriceComparisons(), listAdminFAQs(), getAdminSubscriptionMetrics(), listAdminSubscriptionPayments(), listAdminUserSubscriptions()]);
            setPlans(p.plans);
            setComparisons(c.comparisons);
            setFAQs(f.faqs);
            setMetrics(m);
            setPayments(o.payments);
            setUsers(u.subscriptions);
        } catch (e) {
            message.error(e instanceof Error ? e.message : "加载失败");
        } finally {
            setLoading(false);
        }
    };
    useEffect(() => {
        void load();
    }, []);
    const latest = latestPlans(plans);
    const publish = async (record: AdminSubscriptionPlanRecord) => {
        setPublishing(record.revision.id);
        try {
            await publishAdminSubscriptionPlan(record.revision.id);
            message.success("已发布，新购买使用此版本");
            await load();
        } catch (e) {
            message.error(e instanceof Error ? e.message : "发布失败");
        } finally {
            setPublishing("");
        }
    };
    const name = (p: AdminSubscriptionPlanRecord) => String(p.localizations.find((l) => l.locale === "zh-CN")?.name || p.localizations[0]?.name || p.plan.code);
    const matches = (...items: unknown[]) => items.join(" ").toLowerCase().includes(query.toLowerCase());
    const priceText = (p: AdminSubscriptionPlanRecord, interval: string) =>
        p.prices
            .filter((price) => price.billingInterval === interval)
            .map((price) => `${price.currency} ${(price.amountMinor / 100).toFixed(2)}`)
            .join(" / ") || "—";
    const planColumns: any[] = [
        {
            title: "套餐",
            render: (_: unknown, p: AdminSubscriptionPlanRecord) => (
                <>
                    <strong>{name(p)}</strong>
                    <div className="text-muted-foreground">{p.plan.code}</div>
                </>
            ),
        },
        { title: "月付实收", render: (_: unknown, p: AdminSubscriptionPlanRecord) => priceText(p, "month") },
        { title: "年付实收", render: (_: unknown, p: AdminSubscriptionPlanRecord) => priceText(p, "year") },
        {
            title: "当前版本",
            render: (_: unknown, p: AdminSubscriptionPlanRecord) => (
                <Tag color={p.revision.status === "published" ? "green" : "gold"}>
                    v{p.revision.versionNo} · {p.revision.status === "published" ? "在售" : p.revision.status === "draft" ? "待发布" : "历史"}
                </Tag>
            ),
        },
        {
            title: "操作",
            render: (_: unknown, p: AdminSubscriptionPlanRecord) => (
                <Space>
                    <Button onClick={() => setEditor({ kind: "plan", record: p })}>{p.revision.status === "draft" ? "继续编辑" : "编辑新版本"}</Button>
                    {p.revision.status === "draft" && (
                        <Popconfirm title="发布此套餐版本？" description="发布后对新购买生效，已有订阅不受影响。" onConfirm={() => publish(p)}>
                            <Button type="primary" loading={publishing === p.revision.id}>
                                发布
                            </Button>
                        </Popconfirm>
                    )}
                </Space>
            ),
        },
    ];
    return (
        <AdminPageFrame
            title="订阅与套餐"
            description="先配置套餐，再维护比较内容和常见问题。草稿与在售版本分开管理。"
            scroll
            actions={
                <Space>
                    <Button icon={<Download size={16} />} onClick={() => setEditor({ kind: "export" })}>
                        导出备份
                    </Button>
                    <Button icon={<Upload size={16} />} onClick={() => setEditor({ kind: "import" })}>
                        批量导入
                    </Button>
                    <Button icon={<RefreshCw size={16} />} loading={loading} onClick={() => void load()}>
                        刷新
                    </Button>
                </Space>
            }
        >
            <SubscriptionVisibilitySetting />
            <div className="subscription-admin-summary">
                <div>
                    套餐目录
                    <strong>
                        {latest.length}
                        <small> 个套餐</small>
                    </strong>
                </div>
                <div>
                    待发布
                    <strong>
                        {latest.filter((p) => p.revision.status === "draft").length}
                        <small> 个草稿</small>
                    </strong>
                </div>
                <div>
                    内容管理
                    <strong>
                        {comparisons.length}
                        <small> 张比较表 · {faqs.length} 条 FAQ</small>
                    </strong>
                </div>
            </div>
            <Tabs
                activeKey={tab}
                onChange={(key) => {
                    setTab(key);
                    setQuery("");
                }}
                items={[
                    {
                        key: "plans",
                        label: "套餐目录",
                        children: (
                            <>
                                <div className="subscription-admin-toolbar">
                                    <Input.Search aria-label="搜索套餐" placeholder="搜索套餐名称或编码" value={query} onChange={(e) => setQuery(e.target.value)} style={{ maxWidth: 320 }} />
                                    <Button type="primary" icon={<Plus size={16} />} onClick={() => setEditor({ kind: "plan" })}>
                                        创建套餐
                                    </Button>
                                </div>
                                <Table
                                    loading={loading}
                                    rowKey={(p) => p.revision.id}
                                    dataSource={latest.filter((p) => matches(name(p), p.plan.code))}
                                    columns={planColumns}
                                    expandable={{
                                        rowExpandable: (p) => plans.filter((v) => v.plan.id === p.plan.id).length > 1,
                                        expandedRowRender: (p) => <Table size="small" pagination={false} rowKey={(p) => p.revision.id} columns={planColumns} dataSource={plans.filter((v) => v.plan.id === p.plan.id && v.revision.id !== p.revision.id)} />,
                                    }}
                                    scroll={{ x: 850 }}
                                />
                            </>
                        ),
                    },
                    {
                        key: "comparison",
                        label: "价格与权益比较",
                        children: (
                            <>
                                <div className="subscription-admin-toolbar">
                                    <p>选择一张表，以矩阵方式维护对象、指标和多语言内容。</p>
                                    <Button type="primary" onClick={() => setEditor({ kind: "comparison" })}>
                                        新建比较表
                                    </Button>
                                </div>
                                <Table
                                    rowKey="id"
                                    dataSource={comparisons}
                                    columns={[
                                        {
                                            title: "比较表",
                                            render: (_, r) => (
                                                <>
                                                    <strong>{r.titleZh || r.titleEn}</strong>
                                                    <div>{r.code}</div>
                                                </>
                                            ),
                                        },
                                        { title: "比较对象", render: (_, r) => r.columns.map((c) => c.nameZh || c.nameEn).join(" · ") },
                                        { title: "指标数", render: (_, r) => new Set(r.columns.flatMap((c) => c.rows.map((row) => row.code))).size },
                                        { title: "展示状态", render: (_, r) => <Tag color={r.enabled ? "green" : "default"}>{r.enabled ? "已展示" : "内部参考"}</Tag> },
                                        { title: "操作", render: (_, r) => <Button onClick={() => setEditor({ kind: "comparison", record: r })}>编辑矩阵</Button> },
                                    ]}
                                />
                            </>
                        ),
                    },
                    {
                        key: "faqs",
                        label: "常见问题",
                        children: (
                            <>
                                <div className="subscription-admin-toolbar">
                                    <Input.Search aria-label="搜索 FAQ" placeholder="搜索问题、编码或分类" value={query} onChange={(e) => setQuery(e.target.value)} style={{ maxWidth: 320 }} />
                                    <Button type="primary" onClick={() => setEditor({ kind: "faq" })}>
                                        添加 FAQ
                                    </Button>
                                </div>
                                <Table
                                    rowKey="id"
                                    dataSource={faqs.filter((f) => matches(f.faqCode, f.category, ...f.localizations.map((l) => l.question)))}
                                    columns={[
                                        { title: "问题", render: (_, r) => r.localizations.find((l) => l.locale === "zh-CN")?.question || r.localizations[0]?.question || r.faqCode },
                                        { title: "分类", dataIndex: "category" },
                                        { title: "语言", render: (_, r) => r.localizations.map((l) => l.locale).join(" · ") },
                                        { title: "展示状态", render: (_, r) => <Tag color={r.enabled ? "green" : "default"}>{r.enabled ? "已展示" : "内部参考"}</Tag> },
                                        { title: "操作", render: (_, r) => <Button onClick={() => setEditor({ kind: "faq", record: r })}>编辑</Button> },
                                    ]}
                                />
                            </>
                        ),
                    },
                    { key: "operations", label: "订阅运营", children: <SubscriptionOperations metrics={metrics} payments={payments} users={users} /> },
                ]}
            />
            <SubscriptionPlanEditor record={editor?.kind === "plan" ? editor.record || null : null} open={editor?.kind === "plan"} onClose={() => setEditor(null)} onSaved={load} />
            <SubscriptionComparisonEditor record={editor?.kind === "comparison" ? editor.record : undefined} open={editor?.kind === "comparison"} onClose={() => setEditor(null)} onSaved={load} />
            <SubscriptionFAQEditor record={editor?.kind === "faq" ? editor.record : undefined} open={editor?.kind === "faq"} onClose={() => setEditor(null)} onSaved={load} />
            <SubscriptionCatalogImport open={editor?.kind === "import"} plans={plans} faqs={faqs} onClose={() => setEditor(null)} onSaved={load} />
            <SubscriptionCatalogExport open={editor?.kind === "export"} value={{ version: 1, plans: latest.map(planBundle), comparisons: comparisons.map(comparisonPayload), faqs }} onClose={() => setEditor(null)} />
        </AdminPageFrame>
    );
}
