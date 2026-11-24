import { App, Button, Input } from "antd";
import { AlertTriangle, BadgeCheck, Globe2, KeyRound, RotateCcw, Save, ShieldCheck } from "lucide-react";
import { useEffect, useState } from "react";

import { getAdminGoogleSetting, updateAdminGoogleSetting, type GoogleSetting } from "@/services/api/wallet";
import { AdminStatusBadge, SettingsSectionCard, configuredSecretText } from "./admin-ui";
import { Switch } from "@/pages/admin/ui/controls";

type GoogleDraft = { enabled: boolean; clientId: string; clientSecret: string; redirectUrl: string };

export function GoogleAccessSettings() {
    const { message } = App.useApp();
    const [setting, setSetting] = useState<GoogleSetting | null>(null);
    const [draft, setDraft] = useState<GoogleDraft>({ enabled: false, clientId: "", clientSecret: "", redirectUrl: "" });
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");

    const load = () => {
        setLoading(true);
        setError("");
        void getAdminGoogleSetting()
            .then(({ setting: value }) => {
                setSetting(value);
                setDraft({ enabled: value.enabled, clientId: value.clientId, clientSecret: "", redirectUrl: value.redirectUrl });
            })
            .catch((cause) => setError(cause instanceof Error ? cause.message : "读取 Google 登录配置失败"))
            .finally(() => setLoading(false));
    };

    useEffect(load, []);

    const dirty = Boolean(setting) && (draft.enabled !== setting?.enabled || draft.clientId.trim() !== setting?.clientId || draft.redirectUrl.trim() !== setting?.redirectUrl || Boolean(draft.clientSecret.trim()));
    const update = <K extends keyof GoogleDraft>(key: K, value: GoogleDraft[K]) => setDraft((current) => ({ ...current, [key]: value }));
    const save = async () => {
        const next = { ...draft, clientId: draft.clientId.trim(), clientSecret: draft.clientSecret.trim(), redirectUrl: draft.redirectUrl.trim() };
        if (next.enabled && (!next.clientId || (!next.clientSecret && !setting?.hasClientSecret) || !next.redirectUrl)) {
            message.error("启用 Google 登录前请完整填写 Client ID、Client Secret 和回调地址");
            return;
        }
        if (next.enabled && !isValidRedirectURL(next.redirectUrl)) {
            message.error("Google 回调地址必须使用 HTTPS，本地回环地址可使用 HTTP");
            return;
        }
        setSaving(true);
        try {
            const result = await updateAdminGoogleSetting(next);
            setSetting(result.setting);
            setDraft({ enabled: result.setting.enabled, clientId: result.setting.clientId, clientSecret: "", redirectUrl: result.setting.redirectUrl });
            message.success("Google 登录配置已保存");
        } catch (cause) {
            message.error(cause instanceof Error ? cause.message : "保存 Google 登录配置失败");
        } finally {
            setSaving(false);
        }
    };

    return (
        <div id="admin-access-google" className="admin-settings-anchor">
            <SettingsSectionCard
                className="admin-access-section admin-access-google-section"
                icon={<KeyRound className="size-4" aria-hidden="true" />}
                title="是否开放 Google 登录"
                description="使用 Google OpenID Connect 登录。授权、Token 和用户资料地址由系统固定为 Google 官方端点。"
                status={<AdminStatusBadge label={draft.enabled ? (dirty ? "待保存" : "运行中") : "未启用"} tone={dirty ? "warning" : draft.enabled ? "success" : "neutral"} />}
                footer={
                    <>
                        <div className="admin-access-footer-note">
                            <BadgeCheck className="size-4" aria-hidden="true" />
                            <span>{draft.enabled ? "保存后在登录与注册页显示 Google 入口" : "关闭后隐藏入口，已有账号绑定不受影响"}</span>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                            {dirty ? (
                                <Button icon={<RotateCcw className="size-4" />} disabled={saving} onClick={() => setting && setDraft({ enabled: setting.enabled, clientId: setting.clientId, clientSecret: "", redirectUrl: setting.redirectUrl })}>
                                    撤销
                                </Button>
                            ) : null}
                            <Button type="primary" icon={<Save className="size-4" />} loading={saving} disabled={!dirty || loading} onClick={() => void save()}>
                                {draft.enabled ? "保存并启用" : "保存并关闭"}
                            </Button>
                        </div>
                    </>
                }
            >
                {error ? (
                    <div className="admin-access-inline-alert" role="alert">
                        <AlertTriangle className="size-4 shrink-0" aria-hidden="true" />
                        <span>{error}</span>
                        <Button size="small" onClick={load}>
                            重试
                        </Button>
                    </div>
                ) : null}
                <div className="admin-access-provider-toggle">
                    <span className="admin-access-policy-icon">
                        <ShieldCheck className="size-5" aria-hidden="true" />
                    </span>
                    <div className="admin-access-policy-copy">
                        <div className="flex flex-wrap items-center gap-2">
                            <strong>在登录与注册页显示 Google</strong>
                            <AdminStatusBadge label="保存后生效" tone="info" />
                        </div>
                        <p>首次登录是否能创建账号仍受上方注册开关控制。</p>
                    </div>
                    <Switch checked={draft.enabled} disabled={loading || saving} onChange={(value) => update("enabled", value)} aria-label="在登录与注册页显示 Google" />
                </div>
                {draft.enabled ? (
                    <>
                        <div className="admin-access-form-section">
                            <div className="admin-access-form-section-heading">
                                <span>
                                    <KeyRound className="size-4" />
                                </span>
                                <div>
                                    <h3>应用凭据</h3>
                                    <p>在 Google Cloud Console 创建 OAuth Web 客户端；密钥只保存在服务端。</p>
                                </div>
                            </div>
                            <div className="admin-access-form-grid is-credentials">
                                <label className="ant-form-item">
                                    <span className="ant-form-item-label">
                                        <label>Client ID</label>
                                    </span>
                                    <Input autoComplete="off" value={draft.clientId} onChange={(event) => update("clientId", event.target.value)} placeholder="Google OAuth Web Client ID" />
                                </label>
                                <label className="ant-form-item">
                                    <span className="ant-form-item-label">
                                        <label>{setting?.hasClientSecret ? `Client Secret（${configuredSecretText}）` : "Client Secret"}</label>
                                    </span>
                                    <Input.Password
                                        autoComplete="new-password"
                                        value={draft.clientSecret}
                                        onChange={(event) => update("clientSecret", event.target.value)}
                                        placeholder={setting?.hasClientSecret ? "留空保留原密钥" : "Google OAuth Client Secret"}
                                    />
                                </label>
                            </div>
                        </div>
                        <div className="admin-access-form-section">
                            <div className="admin-access-form-section-heading">
                                <span>
                                    <Globe2 className="size-4" />
                                </span>
                                <div>
                                    <h3>OAuth 连接地址</h3>
                                    <p>系统固定使用 Google 官方 OIDC 端点，回调地址必须与 Google Cloud Console 完全一致。</p>
                                </div>
                            </div>
                            <div className="admin-access-form-grid">
                                <label className="ant-form-item admin-access-form-span-full">
                                    <span className="ant-form-item-label">
                                        <label>本站回调地址</label>
                                    </span>
                                    <Input inputMode="url" value={draft.redirectUrl} onChange={(event) => update("redirectUrl", event.target.value)} placeholder="https://你的域名/oauth/google/callback" />
                                </label>
                                <div className="admin-access-form-span-full text-xs opacity-70">
                                    授权：{setting?.authorizationUrl || "https://accounts.google.com/o/oauth2/v2/auth"}
                                    <br />
                                    Token：{setting?.tokenUrl || "https://oauth2.googleapis.com/token"}
                                    <br />
                                    用户资料：{setting?.userInfoUrl || "https://openidconnect.googleapis.com/v1/userinfo"}
                                    <br />
                                    Scopes：openid、profile、email
                                </div>
                            </div>
                        </div>
                    </>
                ) : null}
            </SettingsSectionCard>
        </div>
    );
}

function isValidRedirectURL(value: string) {
    try {
        const parsed = new URL(value);
        return Boolean(parsed.host) && (parsed.protocol === "https:" || (parsed.protocol === "http:" && ["localhost", "127.0.0.1", "::1"].includes(parsed.hostname)));
    } catch {
        return false;
    }
}
