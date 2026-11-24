import { UI_TEXT } from "@/lib/ui-text";
import { Button } from "antd";

// A declined/expired order has no checkout URL and cannot be retried in place.
export function MoresiaClosedOrder({ onClose }: { onClose: () => void }) {
    const { t } = UI_TEXT;
    return (
        <div className="moresia-payment-dialog">
            <p role="status">订单已关闭，未产生积分充值</p>
            <div className="moresia-payment-actions">
                <Button onClick={onClose}>关闭</Button>
            </div>
        </div>
    );
}
