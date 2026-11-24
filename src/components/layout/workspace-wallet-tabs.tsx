import { UI_TEXT } from "@/lib/ui-text";
import { Crown, History, TicketCheck, WalletCards } from "lucide-react";

import type { WorkspaceWalletTab } from "@/lib/workspace-wallet";
import "./workspace-wallet-tabs.css";

const tabs = [
    { id: "topup", label: "充值", icon: WalletCards },
    { id: "subscription", label: "订阅", icon: Crown },
    { id: "redeem", label: "兑换", icon: TicketCheck },
    { id: "history", label: "积分消耗历史", icon: History },
] as const;

export function WorkspaceWalletTabs({ value, onChange }: { value: WorkspaceWalletTab; onChange: (tab: WorkspaceWalletTab) => void }) {
    const { t } = UI_TEXT;
    return (
        <div className="workspace-wallet-tabs workspace-wallet-tabs-extended" role="tablist" aria-label="积分中心">
            {tabs.map(({ id, label, icon: Icon }) => (
                <button key={id} type="button" role="tab" aria-selected={value === id} onClick={() => onChange(id)}>
                    <Icon /> {t(label)}
                </button>
            ))}
        </div>
    );
}
