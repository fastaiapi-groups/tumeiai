import { App, Button, Switch } from "antd";
import { useEffect, useState } from "react";
import { getAdminFeatureAvailability } from "@/services/api/auth";
import { saveSubscriptionVisibility } from "@/services/api/subscription-visibility";
import { useUserStore } from "@/stores/use-user-store";

export function SubscriptionVisibilitySetting() {
    const { message } = App.useApp();
    const [enabled, setEnabled] = useState<boolean>();
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");
    const [reload, setReload] = useState(0);

    useEffect(() => {
        let active = true;
        setError("");
        void getAdminFeatureAvailability()
            .then(({ features }) => {
                if (active) setEnabled(features.subscriptionEnabled);
            })
            .catch((reason: unknown) => {
                if (active) setError(reason instanceof Error ? reason.message : "读取功能开关失败");
            });
        return () => {
            active = false;
        };
    }, [reload]);

    async function save(next: boolean) {
        setSaving(true);
        try {
            const { features } = await saveSubscriptionVisibility(next);
            setEnabled(features.subscriptionEnabled);
            useUserStore.getState().setFeatures(features);
            message.success("订阅页面开关已保存");
        } catch (reason) {
            message.error(reason instanceof Error ? reason.message : "保存失败");
        } finally {
            setSaving(false);
        }
    }

    return (
        <section className="subscription-admin-toolbar" aria-label="订阅页面设置">
            <div className="flex-1">
                <strong>前端订阅与套餐页面</strong>
                <p className="subscription-admin-intro">关闭后隐藏套餐入口并禁止直接访问套餐页面；已有订阅的权益、续费及取消管理不受影响。</p>
                {error && (
                    <p role="alert">
                        {error} <Button onClick={() => setReload((value) => value + 1)}>重试</Button>
                    </p>
                )}
            </div>
            <Switch aria-label="前端订阅与套餐页面" checked={enabled ?? false} disabled={enabled === undefined || Boolean(error)} loading={saving} onChange={(next) => void save(next)} />
        </section>
    );
}
