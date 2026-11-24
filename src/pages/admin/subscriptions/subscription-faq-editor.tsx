import { App, Button, Form, Input, InputNumber, Segmented, Space, Switch } from "antd";
import { useEffect, useState } from "react";
import { AppModal } from "@/components/ui/product/app-modal";
import { createAdminSubscriptionFAQ } from "@/services/api/subscriptions";
import { updateAdminFAQ, type AdminFAQ } from "@/services/api/subscription-faq-editor";
import { localeOptions } from "./subscription-admin-data";

export function SubscriptionFAQEditor({ record, open, onClose, onSaved }: { record?: AdminFAQ; open: boolean; onClose: () => void; onSaved: () => Promise<void> }) {
    const [form] = Form.useForm();
    const { message } = App.useApp();
    const locale = "zh-CN";
    const [saving, setSaving] = useState(false);
    useEffect(() => {
        if (open) {
            form.resetFields();
            form.setFieldsValue({
                faqCode: record?.faqCode || "",
                category: record?.category || "billing",
                sortOrder: record?.sortOrder ?? 10,
                enabled: record?.enabled ?? false,
                translations: Object.fromEntries((record?.localizations || []).map((l) => [l.locale, l])),
            });
        }
    }, [open, record, form]);
    const save = async () => {
        try {
            const value = form.getFieldsValue(true);
            const localizations = Object.entries(value.translations || {})
                .filter(([, v]) => !!(v as any)?.question?.trim() || !!(v as any)?.answer?.trim())
                .map(([locale, v]) => ({ ...(v as any), locale, status: "published" }));
            if (!value.faqCode?.trim() || !localizations.length || localizations.some((l) => !l.question?.trim() || !l.answer?.trim())) throw Error("请填写编码，至少完成一种语言的问题和答案");
            setSaving(true);
            const payload = { ...value, localizations };
            delete payload.translations;
            if (record) await updateAdminFAQ(record.id, payload);
            else await createAdminSubscriptionFAQ(payload);
            message.success("FAQ 已保存");
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
            title={record ? "编辑 FAQ" : "添加 FAQ"}
            open={open}
            onCancel={() => {
                if (!saving) onClose();
            }}
            footer={null}
            width={760}
        >
            <Form form={form} layout="vertical" disabled={saving}>
                <div className="subscription-editor-grid">
                    <Form.Item name="faqCode" label="编码">
                        <Input disabled={!!record} />
                    </Form.Item>
                    <Form.Item name="category" label="分类">
                        <Input />
                    </Form.Item>
                    <Form.Item name="sortOrder" label="显示顺序">
                        <InputNumber min={0} />
                    </Form.Item>
                </div>

                <Form.Item name={["translations", locale, "question"]} label="问题">
                    <Input />
                </Form.Item>
                <Form.Item name={["translations", locale, "answer"]} label="答案">
                    <Input.TextArea rows={7} />
                </Form.Item>
                <Form.Item name="enabled" label="在前台展示" valuePropName="checked" extra="关闭时保留为内部参考；启用前请核对本站实际支持的服务。">
                    <Switch />
                </Form.Item>
                <div className="subscription-editor-footer">
                    <Button onClick={onClose} disabled={saving}>
                        取消
                    </Button>
                    <Button type="primary" loading={saving} onClick={() => void save()}>
                        保存 FAQ
                    </Button>
                </div>
            </Form>
        </AppModal>
    );
}
