import { Button, Input, Space } from "antd";
import { AppModal } from "@/components/ui/product/app-modal";
import { downloadCatalog } from "./subscription-admin-data";

export function SubscriptionCatalogExport({ value, open, onClose }: { value: unknown; open: boolean; onClose: () => void }) {
    return (
        <AppModal
            title="导出目录备份"
            open={open}
            onCancel={onClose}
            width={800}
            footer={
                <Space>
                    <Button onClick={onClose}>关闭</Button>
                    <Button type="primary" onClick={() => downloadCatalog(value)}>
                        下载 JSON
                    </Button>
                </Space>
            }
        >
            <p>包含最新套餐配置、比较表和全部 FAQ。导入时套餐恢复为草稿，核对后再发布。</p>
            <Input.TextArea aria-label="目录备份内容" readOnly value={JSON.stringify(value, null, 2)} rows={14} />
        </AppModal>
    );
}
