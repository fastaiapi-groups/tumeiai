import "./tumeiai-public-guides.css";

/** 创作首页底部的公开介绍页入口（SEO 落地页），仅在配置了公开站点地址时显示。 */
export function TumeiaiPublicGuides() {
    if (!import.meta.env.VITE_PUBLIC_SITE_URL) return null;
    return (
        <nav aria-label="产品介绍" className="creation-public-guides">
            <a href="/discover/zh/">AI 影视与短剧创作</a>
            <a href="/discover/zh/ai-image-generator/">AI 图片生成</a>
            <a href="/discover/zh/ai-video-generator/">AI 视频生成</a>
            <a href="/discover/zh/storyboard-canvas/">分镜画布</a>
        </nav>
    );
}
