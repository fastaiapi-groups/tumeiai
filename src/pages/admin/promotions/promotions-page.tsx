import { App, Alert, Button, Card, Input, Popconfirm, Progress, Select, Space, Statistic, Table, Upload } from "antd";
import { useEffect, useRef, useState } from "react";
import { AdminPageFrame } from "../components/admin-shell";
import { createPromotion, getPromotion, listPromotions, sendPromotion, type PromotionCampaign, type PromotionDetail } from "@/services/api/promotions";
import { parsePromotionEmails, promotionStats, promotionStatuses } from "./promotion-data";
import { formatSubscriptionOperationTime as formatTime } from "../subscriptions/subscription-operation-columns";
import "./promotions.css";

export default function PromotionsPage() {
    const { message } = App.useApp();
    const [title, setTitle] = useState("");
    const [emails, setEmails] = useState("");
    const [html, setHTML] = useState("");
    const [filename, setFilename] = useState("");
    const [testEmail, setTestEmail] = useState("");
    const [detail, setDetail] = useState<PromotionDetail>();
    const [history, setHistory] = useState<PromotionCampaign[]>([]);
    const [running, setRunning] = useState(false);
    const [busy, setBusy] = useState(false);
    const [current, setCurrent] = useState("");
    const stop = useRef(false);
    const active = useRef(false);
    const parsed = parsePromotionEmails(emails);
    const rows = detail?.recipients ?? [];
    const stats = promotionStats(rows);
    const finished = rows.filter((row) => !["pending", "sending"].includes(row.status)).length;
    const error = (e: unknown) => void message.error(e instanceof Error ? e.message : "操作失败，请刷新核对结果");
    const loadHistory = async () => setHistory(await listPromotions());
    useEffect(() => {
        void loadHistory().catch(error);
        return () => {
            stop.current = true;
        };
    }, []);
    useEffect(() => {
        const warn = (event: BeforeUnloadEvent) => {
            if (active.current) {
                event.preventDefault();
                event.returnValue = "";
            }
        };
        window.addEventListener("beforeunload", warn);
        return () => window.removeEventListener("beforeunload", warn);
    }, []);
    const refresh = async () => {
        try {
            if (detail) setDetail(await getPromotion(detail.campaign.id));
            await loadHistory();
        } catch (e) {
            error(e);
        }
    };
    const select = async (id: string) => {
        setBusy(true);
        try {
            const next = await getPromotion(id);
            setDetail(next);
            setTitle(next.campaign.title);
            setHTML(next.campaign.html);
            setFilename("已保存邮件");
            setEmails(next.recipients.map((row) => row.email).join("\n"));
        } catch (e) {
            error(e);
        } finally {
            setBusy(false);
        }
    };
    const run = async (test = false, retry = false) => {
        if (active.current) return;
        if (!detail || test) {
            const input = parsePromotionEmails(test ? testEmail : emails);
            if (!title.trim() || !html || !input.emails.length || input.invalid.length || input.emails.length > 1000 || (test && input.emails.length !== 1)) {
                void message.error("请填写标题、上传 HTML，并检查邮箱（最多 1000 个，测试仅一个）");
                return;
            }
        }
        active.current = true;
        stop.current = false;
        setRunning(true);
        try {
            const batch = test || !detail ? await createPromotion({ title: test ? `[测试] ${title}` : title, html, emails: parsePromotionEmails(test ? testEmail : emails).emails, baseUrl: window.location.origin }) : await getPromotion(detail.campaign.id);
            if (!test) setDetail(batch);
            const pending = batch.recipients.filter((row) => row.status === (retry ? "failed" : "pending"));
            for (const row of pending) {
                if (stop.current) break;
                setCurrent(row.email);
                const result = await sendPromotion(batch.campaign.id, row.id);
                if (!test) setDetail(result);
                const sent = result.recipients.find((item) => item.id === row.id);
                if (test) {
                    if (sent?.status === "sent") void message.success("测试邮件已提交给邮件服务");
                    else void message.warning(sent?.error || "请核对测试发送结果");
                }
                if (sent?.status === "unknown" || sent?.status === "sending") {
                    void message.warning("发送结果待确认，已暂停。请刷新并核对邮件服务日志。");
                    break;
                }
                await new Promise((resolve) => setTimeout(resolve, 1100));
            }
            await loadHistory();
        } catch (e) {
            error(e);
            void message.warning("发送已停止；请刷新确认上一封结果后再继续");
        } finally {
            active.current = false;
            setRunning(false);
            setCurrent("");
        }
    };
    const preview = `<meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src https: http: data:; style-src 'unsafe-inline'; form-action 'none'; base-uri 'none'">${html}`;
    return (
        <AdminPageFrame
            title="邮件推广"
            description="上传邮件、检查收件人，由当前浏览器逐封发送并统计推广效果。"
            scroll
            actions={
                <Button disabled={running} onClick={() => void refresh()}>
                    刷新统计
                </Button>
            }
        >
            <Alert type="info" showIcon message="前端逐封发送，关闭页面后停止；正在提交的一封仍可能完成。成功表示邮件服务已接受，不保证进入收件箱。" />
            <Space wrap className="promotion-toolbar">
                <Select
                    placeholder="查看历史批次（最近 100 批）"
                    style={{ minWidth: 300 }}
                    value={detail?.campaign.id}
                    disabled={running || busy}
                    options={history.map((item) => ({ value: item.id, label: `${formatTime(item.createdAt)} · ${item.title}` }))}
                    onChange={(id) => void select(id)}
                />
                <Button
                    disabled={running || busy}
                    onClick={() => {
                        setDetail(undefined);
                        setTitle("");
                        setHTML("");
                        setFilename("");
                        setEmails("");
                    }}
                >
                    新建推广
                </Button>
            </Space>
            <div className="promotion-grid">
                <Card title="邮件内容">
                    <label className="promotion-field">
                        收件人邮箱（每行一个）
                        <Input.TextArea aria-label="收件人邮箱" rows={6} value={emails} disabled={running || !!detail} onChange={(e) => setEmails(e.target.value)} />
                    </label>
                    <p>
                        有效 {parsed.emails.length - parsed.invalid.length} 个 · 已去重 {parsed.duplicates} 个{parsed.invalid.length > 0 && ` · 格式错误：${parsed.invalid.slice(0, 5).join("、")}`}
                    </p>
                    <label className="promotion-field">
                        邮件标题
                        <Input aria-label="邮件标题" maxLength={200} value={title} disabled={running || !!detail} onChange={(e) => setTitle(e.target.value)} />
                    </label>
                    <Upload
                        accept=".html,.htm"
                        showUploadList={false}
                        disabled={running || !!detail}
                        beforeUpload={async (file) => {
                            if (file.size > 512 * 1024 || !/\.html?$/i.test(file.name)) {
                                void message.error("请选择不超过 512KB 的 HTML 文件");
                                return false;
                            }
                            setHTML(await file.text());
                            setFilename(file.name);
                            return false;
                        }}
                    >
                        <Button disabled={running || !!detail}>上传 HTML 邮件</Button>
                    </Upload>{" "}
                    <span>{filename}</span>
                    {html && <iframe title="邮件隔离预览" sandbox="" referrerPolicy="no-referrer" srcDoc={preview} className="promotion-preview" />}
                    <p>图片和按钮请使用完整公网网址；自动添加打开追踪、点击追踪和退订链接。脚本、表单及嵌入内容会被移除。</p>
                    <Space.Compact block>
                        <Input aria-label="测试收件邮箱" placeholder="自己的邮箱，用于测试排版" value={testEmail} disabled={running} onChange={(e) => setTestEmail(e.target.value)} />
                        <Button disabled={running || !html} onClick={() => void run(true)}>
                            发送测试邮件
                        </Button>
                    </Space.Compact>
                    <Space wrap className="promotion-toolbar">
                        <Popconfirm title={`确认发送给 ${detail ? rows.filter((row) => row.status === "pending").length : parsed.emails.length} 位收件人？`} description="请确认收件人和邮件内容；已退订用户会自动跳过。" onConfirm={() => run()}>
                            <Button type="primary" disabled={running || busy || !html || parsed.invalid.length > 0}>
                                {detail ? "继续发送待发邮件" : "开始发送"}
                            </Button>
                        </Popconfirm>
                        <Button
                            disabled={!running}
                            onClick={() => {
                                stop.current = true;
                                void message.info("将于当前一封处理后暂停");
                            }}
                        >
                            暂停
                        </Button>
                        <Button disabled={running || !rows.some((row) => row.status === "failed")} onClick={() => void run(false, true)}>
                            重试失败邮件
                        </Button>
                    </Space>
                </Card>
                <Card title="发送进度与效果">
                    <Progress percent={rows.length ? Math.round((finished / rows.length) * 100) : 0} />
                    <p>
                        {running ? `正在发送：${current || "准备中"}` : "未执行发送"} · 已处理 {finished} / {rows.length}
                    </p>
                    <div className="promotion-stats">
                        <Statistic title="发送成功" value={stats.sent} />
                        <Statistic title="发送失败" value={rows.filter((row) => row.status === "failed").length} />
                        <Statistic title="打开人数（估算）" value={stats.opened} suffix={stats.openRate} />
                        <Statistic title="点击人数" value={stats.clicked} suffix={stats.clickRate} />
                        <Statistic title="新增注册人数" value={stats.registered} />
                        <Statistic title="注册转化率" value={stats.registrationRate} />
                    </div>
                    <p>打开可能受邮箱自动加载影响，点击也可能包含安全扫描。注册归因窗口为点击后 30 天，仅统计新账号；注册转化率 = 注册人数 / 发送成功人数；点击后注册转化率：{stats.clickRegistrationRate}。点击链接被转发会影响归因。</p>
                    <Table
                        rowKey="id"
                        size="small"
                        dataSource={rows}
                        pagination={{ pageSize: 10 }}
                        scroll={{ x: 700 }}
                        columns={[
                            { title: "收件人", dataIndex: "email" },
                            { title: "状态", dataIndex: "status", render: (value) => promotionStatuses[value] || "未知" },
                            { title: "结果", dataIndex: "error" },
                            { title: "发送时间", dataIndex: "sentAt", render: formatTime },
                            { title: "首次打开", dataIndex: "openedAt", render: formatTime },
                            { title: "首次点击", dataIndex: "clickedAt", render: formatTime },
                            { title: "注册时间", dataIndex: "registeredAt", render: formatTime },
                        ]}
                    />
                </Card>
            </div>
        </AdminPageFrame>
    );
}
