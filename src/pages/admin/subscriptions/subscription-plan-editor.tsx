import { Alert, App, Button, Collapse, Form, Input, InputNumber, Segmented, Select, Space, Steps, Switch, Table } from "antd";
import { useEffect, useState } from "react";
import { SubscriptionEntitlementHelp } from "./subscription-entitlement-help";
import { AppModal } from "@/components/ui/product/app-modal";
import { createAdminSubscriptionPlan, type AdminSubscriptionPlanRecord } from "@/services/api/subscriptions";
import { updateSubscriptionPlan } from "@/services/api/subscription-editor";
import { editorPayload, editorValues, fieldLabels, localeOptions, type EditorRow } from "./subscription-admin-data";
import { sections, type Section } from "./subscription-plan-fields";
import "./subscription-admin.css";

export { editorValues as subscriptionEditorValues } from "./subscription-admin-data";
const steps = ["名称与介绍", "价格与额度", "权益与限制", "确认保存"];

function RowsEditor({ section, locale }: { section: Section; locale?: string }) {
    const form = Form.useFormInstance();
    const values = Form.useWatch(section.key, { form, preserve: true }) || [];
    const prices = Form.useWatch("prices", { form, preserve: true }) || [];
    const visible = (index: number) => !locale || values[index]?.locale === locale;
    return (
        <Form.List name={section.key}>
            {(rows, { add, remove }) => (
                <>
                    <Collapse
                        accordion
                        items={rows
                            .filter((row) => visible(row.name))
                            .map((row) => ({
                                key: String(row.name),
                                label:
                                    section.key === "prices"
                                        ? `${fieldLabels[values[row.name]?.billingInterval] || "价格"} · ${values[row.name]?.currency || ""} ${values[row.name]?.amountMinor ?? ""}`
                                        : values[row.name]?.name || values[row.name]?.displayText || values[row.name]?.logicalModelCode || values[row.name]?.featureCode || values[row.name]?.limitCode || `${section.title} ${row.name + 1}`,
                                children: (
                                    <>
                                        <div className="subscription-editor-grid">
                                            {section.fields.map((field) => (
                                                <Form.Item key={field.key} name={[row.name, field.key]} label={field.label} valuePropName={field.type === "boolean" ? "checked" : "value"}>
                                                    {field.choices ? (
                                                        <Select options={field.choices.map((value) => ({ value, label: fieldLabels[value] || localeOptions.find((l) => l.value === value)?.label || value }))} />
                                                    ) : field.type === "boolean" ? (
                                                        <Switch />
                                                    ) : field.type === "number" ? (
                                                        <InputNumber min={0} className="w-full" />
                                                    ) : field.type === "text" ? (
                                                        <Input.TextArea autoSize={{ minRows: 2, maxRows: 6 }} />
                                                    ) : (
                                                        <Input />
                                                    )}
                                                </Form.Item>
                                            ))}
                                            {section.key === "creditRules" && (
                                                <Form.Item name={[row.name, "priceId"]} label="适用价格">
                                                    <Select allowClear placeholder="全部价格" options={prices.map((p: EditorRow) => ({ value: p.id, label: `${fieldLabels[p.billingInterval]} · ${p.currency} ${p.amountMinor}` }))} />
                                                </Form.Item>
                                            )}
                                        </div>
                                        <Button danger type="text" onClick={() => remove(row.name)}>
                                            移除此项
                                        </Button>
                                    </>
                                ),
                            }))}
                        defaultActiveKey={rows
                            .filter((row) => visible(row.name))
                            .slice(0, 1)
                            .map((row) => String(row.name))}
                    />
                    <Button
                        className="mt-3"
                        type="dashed"
                        onClick={() => {
                            const defaults = { ...section.defaults, ...(locale ? { locale } : {}) };
                            if (section.key === "prices") Object.assign(defaults, { id: crypto.randomUUID(), minMultiplierBasisPoints: 1, maxMultiplierBasisPoints: 5, multiplierStepBasisPoints: 1 });
                            add(defaults);
                        }}
                    >
                        添加{section.title.split("（")[0]}
                    </Button>
                </>
            )}
        </Form.List>
    );
}

export function SubscriptionPlanEditor({ record, open, onClose, onSaved }: { record: AdminSubscriptionPlanRecord | null; open?: boolean; onClose: () => void; onSaved: () => Promise<void> }) {
    const [form] = Form.useForm();
    const { message } = App.useApp();
    const [step, setStep] = useState(0);
    const locale = "zh-CN";
    const [benefit, setBenefit] = useState("features");
    const [saving, setSaving] = useState(false);
    const values = Form.useWatch([], { form, preserve: true }) || {};
    const visible = open ?? !!record;
    useEffect(() => {
        if (visible) {
            form.resetFields();
            form.setFieldsValue(editorValues(record || undefined));
            setStep(0);
        }
    }, [form, record, visible]);
    const save = async () => {
        if (saving) return;
        try {
            const payload = editorPayload(form.getFieldsValue(true));
            setSaving(true);
            if (record) await updateSubscriptionPlan(record.revision.id, payload);
            else await createAdminSubscriptionPlan(payload);
            message.success("草稿已保存，可在目录中预览并发布");
            onClose();
            await onSaved();
        } catch (error) {
            message.error(error instanceof Error ? error.message : "保存失败");
        } finally {
            setSaving(false);
        }
    };
    const section = (key: string) => sections.find((s) => s.key === key)!;
    return (
        <AppModal
            title={record ? `编辑 ${record.plan.code}` : "创建套餐"}
            open={visible}
            onCancel={() => {
                if (!saving) onClose();
            }}
            footer={null}
            width={1040}
        >
            <Steps current={step} size="small" onChange={setStep} items={steps.map((title) => ({ title }))} />
            <Form form={form} layout="vertical" disabled={saving}>
                <div className="subscription-editor-body">
                    {step === 0 && (
                        <>
                            <div className="subscription-editor-grid">
                                <Form.Item name="code" label="套餐编码">
                                    <Input disabled={!!record} placeholder="例如 creator-plus" />
                                </Form.Item>
                                <Form.Item name="audience" label="适用对象">
                                    <Select
                                        options={[
                                            { value: "individual", label: "个人" },
                                            { value: "team", label: "团队" },
                                        ]}
                                    />
                                </Form.Item>
                                <Form.Item name="defaultLocale" label="默认语言">
                                    <Select options={localeOptions} />
                                </Form.Item>
                                <Form.Item name="sortOrder" label="显示顺序">
                                    <InputNumber min={0} />
                                </Form.Item>
                                <Form.Item name="featured" label="推荐套餐" valuePropName="checked">
                                    <Switch />
                                </Form.Item>
                            </div>

                            <RowsEditor key={locale} section={section("localizations")} locale={locale} />
                        </>
                    )}
                    {step === 1 && (
                        <>
                            <p className="subscription-admin-intro">年付填写全年实收金额，月均价格自动换算。倍率直接填 1、2、5；额度可关联不同价格。</p>
                            <h3>售价与购买倍率</h3>
                            <RowsEditor section={section("prices")} />
                            <h3 className="mt-6">积分发放</h3>
                            <RowsEditor section={section("creditRules")} />
                        </>
                    )}
                    {step === 2 && (
                        <>
                            <SubscriptionEntitlementHelp />
                            <Segmented
                                block
                                value={benefit}
                                onChange={setBenefit}
                                options={[
                                    { value: "features", label: "展示权益" },
                                    { value: "featureLocales", label: "权益文案" },
                                    { value: "modelRules", label: "模型规则" },
                                    { value: "limitRules", label: "并发与限额" },
                                    { value: "apiPools", label: "API 额度池" },
                                ]}
                                className="mb-4"
                            />

                            <RowsEditor key={benefit + locale} section={section(benefit)} locale={benefit === "featureLocales" ? locale : undefined} />
                        </>
                    )}
                    {step === 3 && (
                        <>
                            <Alert type="info" showIcon title="本次仅保存草稿，发布后影响新购买；已有订阅保留购买时的价格和权益。" className="mb-4" />
                            <h3>{values.code || "未命名套餐"}</h3>
                            <Table<EditorRow>
                                rowKey="id"
                                pagination={false}
                                dataSource={values.prices || []}
                                columns={[
                                    { title: "周期", render: (_, p) => fieldLabels[p.billingInterval] },
                                    { title: "实收金额", render: (_, p) => `${p.currency} ${Number(p.amountMinor).toFixed(2)}` },
                                    { title: "月均", render: (_, p) => `${p.currency} ${(Number(p.amountMinor) / (p.intervalCount * (p.billingInterval === "year" ? 12 : 1))).toFixed(2)}` },
                                    { title: "额度发放", render: (_, p) => fieldLabels[p.creditDeliveryMode] },
                                ]}
                            />
                            <p className="mt-4">
                                {values.creditRules?.length || 0} 条额度规则 · {values.features?.length || 0} 项权益 · {values.modelRules?.length || 0} 条模型规则
                            </p>
                        </>
                    )}
                </div>
                <div className="subscription-editor-footer">
                    <Button onClick={onClose} disabled={saving}>
                        取消
                    </Button>
                    <Space>
                        {step > 0 && <Button onClick={() => setStep(step - 1)}>上一步</Button>}
                        {step < 3 ? (
                            <Button type="primary" onClick={() => setStep(step + 1)}>
                                下一步
                            </Button>
                        ) : (
                            <Button type="primary" loading={saving} onClick={() => void save()}>
                                保存草稿
                            </Button>
                        )}
                    </Space>
                </div>
            </Form>
        </AppModal>
    );
}
