import { Form, InputNumber, Select } from "antd";
import { topupCurrencyOptions, topupCurrencyScale } from "@/lib/topup-currency";

export function TopupCurrencyField() {
    return (
        <Form.Item name="currency" label="售价币种" initialValue="CNY" rules={[{ required: true }]} extra="金额按所选币种收取，不自动换汇。Cash App Pay 请选择 USD。">
            <Select options={topupCurrencyOptions} />
        </Form.Item>
    );
}

export function TopupAmountField() {
    const currency = Form.useWatch("currency");
    const scale = topupCurrencyScale(currency);
    return (
        <Form.Item
            name="amountYuan"
            label="售价（所选币种）"
            dependencies={["currency"]}
            rules={[
                { required: true },
                {
                    validator: (_, value) =>
                        Number.isFinite(value) && value >= 1 / scale && value <= 100_000_000 / scale && Math.abs(value * scale - Math.round(value * scale)) < 1e-7
                            ? Promise.resolve()
                            : Promise.reject(new Error(scale === 1 ? "请输入有效整数金额" : "请输入有效金额，最多两位小数")),
                },
            ]}
        >
            <InputNumber min={1 / scale} max={100_000_000 / scale} precision={scale === 1 ? 0 : 2} className="w-full" />
        </Form.Item>
    );
}
