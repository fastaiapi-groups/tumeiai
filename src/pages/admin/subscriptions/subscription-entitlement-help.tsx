import { Alert } from "antd";

export function SubscriptionEntitlementHelp() {
    return (
        <Alert
            type="info"
            showIcon
            title="配置生效范围"
            description="模型规则按前台模型 ID / 编码、能力和规格精确匹配；支持免费次数、限时无限和折扣。并发限额作用于排队及执行中任务。API 额度池是现有订阅积分的周期可用上限，不额外发放积分。发布时会检查模型及供应线路。团队席位、MCP、额外充值包折扣尚未接入，必须禁用；展示权益文案不会自动创建计费规则。"
        />
    );
}
