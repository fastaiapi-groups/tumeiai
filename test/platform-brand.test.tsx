import { afterEach, expect, test } from "bun:test";
import { Window } from "happy-dom";
import { renderToStaticMarkup } from "react-dom/server";
import { platformBranding } from "../src/lib/platform-brand";
import { applyAppearanceMetadata, normalizePublicAppearance, useAppearanceStore, usePlatformAppearance } from "../src/stores/use-appearance-store";
import { buildPublicSite } from "../seo/public-site";

const original = useAppearanceStore.getState().appearance;
afterEach(() => useAppearanceStore.setState({ appearance: original }));

function Brand() {
    const appearance = usePlatformAppearance();
    return (
        <span>
            {appearance.brandName} | {appearance.footerCopyright}
        </span>
    );
}

test("the appearance always uses the Chinese platform identity", () => {
    useAppearanceStore.setState({ appearance: normalizePublicAppearance({ brandName: "旧品牌设计", seoTitle: "旧标题", footerCopyright: "旧版权" }) });
    for (const locale of ["zh-CN", "en-US", "zh-CN"] as const) {
        const html = renderToStaticMarkup(<Brand />);
        expect(html).toContain(platformBranding(locale).brandName);
        expect(html).toContain(platformBranding(locale).footerCopyright);
        expect(html).not.toContain("旧品牌设计");
        expect(html).not.toContain("旧版权");
    }
});

test("browser and social metadata stay Chinese and keep the configured logo", () => {
    const window = new Window({ url: "https://example.com/toolbox/video" });
    const appearance = normalizePublicAppearance({ brandName: "旧站名", logoUrl: "/brand-icon.svg", logoConfigured: true, seoKeywords: "AI video" });
    for (const locale of ["zh-CN", "en-US", "zh-CN"] as const) {
        applyAppearanceMetadata(appearance, window.document as unknown as Document, locale);
        expect(window.document.title).toBe(platformBranding(locale).seoTitle);
        expect(window.document.querySelector('meta[property="og:site_name"]')?.getAttribute("content")).toBe(platformBranding(locale).brandName);
        expect(window.document.querySelector('meta[name="description"]')?.getAttribute("content")).toBe(platformBranding(locale).seoDescription);
        expect(window.document.querySelectorAll('meta[property="og:title"]')).toHaveLength(1);
        expect(window.document.querySelector('link[rel="icon"]')?.getAttribute("href")).toBe("/brand-icon.svg");
    }
    window.close();
});

test("public crawlable pages expose only the Chinese brand", () => {
    const files = buildPublicSite({ origin: "https://example.com", name: "TumeiAI" });
    expect(files["discover/en/index.html"]).toBeUndefined();
    expect(files["discover/zh/index.html"]).toContain("TumeiAI");
});
