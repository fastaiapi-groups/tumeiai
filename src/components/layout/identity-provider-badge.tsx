import { useTranslation } from "react-i18next";

import { cn } from "@/lib/utils";

type IdentityUser = { identityProvider?: string; identityUsername?: string };

export function isLinuxDOIdentity(user?: IdentityUser | null) {
    return user?.identityProvider?.trim().toLowerCase() === "linuxdo";
}

// tumeiai: Google / Apple 登录身份
export function isGoogleIdentity(user?: IdentityUser | null) {
    return user?.identityProvider?.trim().toLowerCase() === "google";
}

export function isAppleIdentity(user?: IdentityUser | null) {
    return user?.identityProvider?.trim().toLowerCase() === "apple";
}

export function IdentityProviderBadge({ user, compact = false, className }: { user: IdentityUser; compact?: boolean; className?: string }) {
    const { t } = useTranslation();
    const tumeiaiProvider = isGoogleIdentity(user) ? "Google" : isAppleIdentity(user) ? "Apple" : "";
    if (!isLinuxDOIdentity(user) && !tumeiaiProvider) return null;
    return (
        <span
            className={cn(
                "inline-flex shrink-0 items-center justify-center border border-border bg-background font-semibold text-foreground/65",
                compact ? "size-3.5 rounded-full text-[var(--fs-micro)] leading-none" : "h-4 rounded px-1 text-[var(--fs-micro)] leading-none",
                className,
            )}
            title={tumeiaiProvider ? (user.identityUsername ? `${tumeiaiProvider} · ${user.identityUsername}` : `${tumeiaiProvider} 用户`) : user.identityUsername ? `Linux.do · @${user.identityUsername}` : t("account.layout.identity.linuxdoUser")}
        >
            {tumeiaiProvider ? (compact ? (tumeiaiProvider === "Google" ? "G" : "") : tumeiaiProvider) : compact ? "L" : "Linux.do"}
        </span>
    );
}
