export const PLATFORM_BRAND_ZH = "TumeiAI";

export function platformBranding(_locale?: string) {
    return {
        brandName: PLATFORM_BRAND_ZH,
        seoTitle: `${PLATFORM_BRAND_ZH} | AI图片、视频与影视创作工作台`,
        seoDescription: `${PLATFORM_BRAND_ZH}：AI图片生成、视频生成、剧本构思与分镜画布，面向 AI 影视与短剧创作。`,
        footerCopyright: `© ${new Date().getFullYear()} ${PLATFORM_BRAND_ZH}. 保留所有权利。`,
    };
}
