import { Button, Divider } from "antd";

import { appleLoginURL, googleLoginURL, type AuthSettings } from "@/services/api/auth";

export function GoogleIcon() {
    return (
        <span aria-hidden className="inline-flex size-5 shrink-0 items-center justify-center rounded-full bg-white text-xs font-bold text-[#4285f4] shadow-[0_0_0_1px_rgba(0,0,0,.12)]">
            G
        </span>
    );
}

export function AppleIcon() {
    return <span aria-hidden className="inline-flex size-5 shrink-0 items-center justify-center rounded-full bg-black text-sm font-semibold text-white shadow-[0_0_0_1px_rgba(0,0,0,.18)]"></span>;
}

/**
 * Google / Apple 登录入口。独立成文件，登录表单只保留一行挂接。
 * showDivider 为 true 表示原有的第三方登录区没有渲染，这里需要自己补分隔线。
 */
export function TumeiaiOAuthButtons({ settings, next, acceptedTerms, showDivider }: { settings?: Pick<AuthSettings, "googleEnabled" | "appleEnabled"> | null; next: string; acceptedTerms?: boolean; showDivider: boolean }) {
    if (!settings?.googleEnabled && !settings?.appleEnabled) return null;
    return (
        <>
            {showDivider ? (
                <Divider plain className="auth-scene-divider auth-form-divider">
                    或
                </Divider>
            ) : null}
            {settings.googleEnabled ? (
                <Button size="large" block icon={<GoogleIcon />} href={googleLoginURL(next, acceptedTerms)}>
                    使用 Google 登录
                </Button>
            ) : null}
            {settings.appleEnabled ? (
                <Button size="large" block icon={<AppleIcon />} href={appleLoginURL(next, acceptedTerms)}>
                    使用 Apple 登录
                </Button>
            ) : null}
        </>
    );
}
