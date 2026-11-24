import { App, Button, Input } from "antd";
import { AlertTriangle, BadgeCheck, Globe2, KeyRound, RotateCcw, Save, ShieldCheck } from "lucide-react";
import { useEffect, useState } from "react";

import { getAdminAppleSetting, updateAdminAppleSetting, type AppleSetting } from "@/services/api/wallet";
import { AdminStatusBadge, SettingsSectionCard, configuredSecretText } from "./admin-ui";
import { Switch } from "@/pages/admin/ui/controls";

type AppleDraft = { enabled: boolean; clientId: string; teamId: string; keyId: string; privateKey: string; redirectUrl: string };

export function AppleAccessSettings() {
    const { message } = App.useApp();
    const [setting, setSetting] = useState<AppleSetting | null>(null);
    const [draft, setDraft] = useState<AppleDraft>({ enabled: false, clientId: "", teamId: "", keyId: "", privateKey: "", redirectUrl: "" });
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");

    const load = () => {
        setLoading(true);
        setError("");
        void getAdminAppleSetting()
            .then(({ setting: value }) => {
                setSetting(value);
                setDraft({ enabled: value.enabled, clientId: value.clientId, teamId: value.teamId, keyId: value.keyId, privateKey: "", redirectUrl: value.redirectUrl });
            })
            .catch((cause) => setError(cause instanceof Error ? cause.message : "读取 Apple 登录配置失败"))
            .finally(() => setLoading(false));
    };

    useEffect(load, []);

    const dirty =
        Boolean(setting) &&
        (draft.enabled !== setting?.enabled ||
            draft.clientId.trim() !== setting?.clientId ||
            draft.teamId.trim() !== setting?.teamId ||
            draft.keyId.trim() !== setting?.keyId ||
            draft.redirectUrl.trim() !== setting?.redirectUrl ||
            Boolean(draft.privateKey.trim()));
    const update = <K extends keyof AppleDraft>(key: K, value: AppleDraft[K]) => setDraft((current) => ({ ...current, [key]: value }));
    const save = async () => {
        const next = { ...draft, clientId: draft.clientId.trim(), teamId: draft.teamId.trim(), keyId: draft.keyId.trim(), privateKey: draft.privateKey.trim(), redirectUrl: draft.redirectUrl.trim() };
        if (next.enabled && (!next.clientId || !next.teamId || !next.keyId || (!next.privateKey && !setting?.hasPrivateKey) || !next.redirectUrl)) {
            message.error("启用 Apple 登录前请完整填写 Service ID、Team ID、Key ID、私钥和回调地址");
            return;
        }
        if (next.enabled && !isValidRedirectURL(next.redirectUrl)) {
            message.error("Apple 回调地址必须使用 HTTPS，本地回环地址可使用 HTTP");
            return;
        }
        setSaving(true);
        try {
            const result = await updateAdminAppleSetting(next);
            setSetting(result.setting);
            setDraft({ enabled: result.setting.enabled, clientId: result.setting.clientId, teamId: result.setting.teamId, keyId: result.setting.keyId, privateKey: "", redirectUrl: result.setting.redirectUrl });
            message.success("Apple 登录配置已保存");
        } catch (cause) {
            message.error(cause instanceof Error ? cause.message : "保存 Apple 登录配置失败");
        } finally {
            setSaving(false);
        }
    };

    return (
        <div id="admin-access-apple" className="admin-settings-anchor">
            <SettingsSectionCard
                className="admin-access-section admin-access-apple-section"
                icon={<KeyRound className="size-4" aria-hidden="true" />}
                title="是否开放 Apple 登录"
                description="使用 Apple Sign in with Apple。服务端动态生成 client_secret，私钥只保存在服务端。"
                status={<AdminStatusBadge label={draft.enabled ? (dirty ? "待保存" : "运行中") : "未启用"} tone={dirty ? "warning" : draft.enabled ? "success" : "neutral"} />}
                footer={
                    <>
                        <div className="admin-access-footer-note">
                            <BadgeCheck className="size-4" aria-hidden="true" />
                            <span>{draft.enabled ? "保存后在登录与注册页显示 Apple 入口" : "关闭后隐藏入口，已有账号绑定不受影响"}</span>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                            {dirty ? (
                                <Button
                                    icon={<RotateCcw className="size-4" />}
                                    disabled={saving}
                                    onClick={() => setting && setDraft({ enabled: setting.enabled, clientId: setting.clientId, teamId: setting.teamId, keyId: setting.keyId, privateKey: "", redirectUrl: setting.redirectUrl })}
                                >
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
                            <strong>在登录与注册页显示 Apple</strong>
                            <AdminStatusBadge label="保存后生效" tone="info" />
                        </div>
                        <p>首次登录是否能创建账号仍受上方注册开关控制。</p>
                    </div>
                    <Switch checked={draft.enabled} disabled={loading || saving} onChange={(value) => update("enabled", value)} aria-label="在登录与注册页显示 Apple" />
                </div>
                {draft.enabled ? (
                    <>
                        <div className="admin-access-form-section">
                            <div className="admin-access-form-section-heading">
                                <span>
                                    <KeyRound className="size-4" />
                                </span>
                                <div>
                                    <h3>Apple Developer 凭据</h3>
                                    <p>Service ID、Team ID、Key ID 和 Sign in with Apple 私钥均来自 Apple Developer。</p>
                                </div>
                            </div>
                            <div className="admin-access-form-grid is-credentials">
                                <label className="ant-form-item">
                                    <span className="ant-form-item-label">
                                        <label>Service ID</label>
                                    </span>
                                    <Input autoComplete="off" value={draft.clientId} onChange={(event) => update("clientId", event.target.value)} placeholder="com.example.web" />
                                </label>
                                <label className="ant-form-item">
                                    <span className="ant-form-item-label">
                                        <label>Team ID</label>
                                    </span>
                                    <Input autoComplete="off" value={draft.teamId} onChange={(event) => update("teamId", event.target.value)} placeholder="Apple Developer Team ID" />
                                </label>
                                <label className="ant-form-item">
                                    <span className="ant-form-item-label">
                                        <label>Key ID</label>
                                    </span>
                                    <Input autoComplete="off" value={draft.keyId} onChange={(event) => update("keyId", event.target.value)} placeholder="Sign in with Apple Key ID" />
                                </label>
                                <label className="ant-form-item admin-access-form-span-full">
                                    <span className="ant-form-item-label">
                                        <label>{setting?.hasPrivateKey ? `私钥（${configuredSecretText}）` : "私钥 .p8"}</label>
                                    </span>
                                    <Input.TextArea
                                        autoComplete="new-password"
                                        value={draft.privateKey}
                                        onChange={(event) => update("privateKey", event.target.value)}
                                        placeholder={setting?.hasPrivateKey ? "留空保留原私钥" : "-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----"}
                                        rows={5}
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
                                    <p>回调地址必须同时登记在 Apple Developer 和本站配置中。</p>
                                </div>
                            </div>
                            <div className="admin-access-form-grid">
                                <label className="ant-form-item admin-access-form-span-full">
                                    <span className="ant-form-item-label">
                                        <label>本站回调地址</label>
                                    </span>
                                    <Input inputMode="url" value={draft.redirectUrl} onChange={(event) => update("redirectUrl", event.target.value)} placeholder="https://你的域名/oauth/apple/callback" />
                                </label>
                                <div className="admin-access-form-span-full text-xs opacity-70">
                                    授权：{setting?.authorizationUrl || "https://appleid.apple.com/auth/authorize"}
                                    <br />
                                    Token：{setting?.tokenUrl || "https://appleid.apple.com/auth/token"}
                                    <br />
                                    Scopes：name、email
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
