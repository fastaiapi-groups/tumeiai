import { describe, expect, test } from "bun:test";
import { Window } from "happy-dom";
import { buildPublicSite, homepageSEO, publicSiteConfig, publicSitePlugin } from "../seo/public-site";

const config = { origin: "https://studio.example", name: "创作 & Film <Studio>" };

describe("public search documents", () => {
    test("homepage is enriched only for an explicit public build, with safe single metadata values", () => {
        const html = '<html><head><title>正在加载</title><meta name="description" content="default" /></head><body><div id="root"></div></body></html>';
        const disabled = publicSitePlugin(null).transformIndexHtml as (html: string) => string;
        const enabled = publicSitePlugin(config).transformIndexHtml as (html: string) => string;
        expect(disabled(html)).toBe(html);
        const window = new Window();
        window.document.write(enabled(html));
        expect(window.document.querySelectorAll('meta[name="description"]')).toHaveLength(1);
        expect(window.document.title).toBe(homepageSEO(config).title);
        expect(window.document.querySelector('link[rel="canonical"]')!.getAttribute("href")).toBe(config.origin + "/");
        expect(JSON.parse(window.document.querySelector('script[type="application/ld+json"]')!.textContent!).name).toBe(config.name);
        window.close();
    });
    test("requires explicit deployment identity and rejects unsafe origins", () => {
        expect(publicSiteConfig({})).toBeNull();
        for (const url of ["http://example.com", "https://user:secret@example.com", "https://example.com/path", "https://example.com/?key=secret", "https://example.com/#hash"]) {
            expect(() => publicSiteConfig({ CANVAS_SEO_SITE_URL: url, CANVAS_SEO_SITE_NAME: "Studio" })).toThrow();
        }
        expect(() => publicSiteConfig({ CANVAS_SEO_SITE_URL: "https://example.com" })).toThrow();
        expect(publicSiteConfig({ CANVAS_SEO_SITE_URL: "https://example.com/", CANVAS_SEO_SITE_NAME: "Studio" })).toEqual({ origin: "https://example.com", name: "Studio" });
    });

    test("Chinese documents are readable without JS and expose only valid Chinese links", () => {
        const files = buildPublicSite(config);
        const pages = Object.keys(files).filter((path) => path.endsWith("index.html"));
        expect(pages).toHaveLength(5);
        const titles = new Set<string>();
        for (const path of pages) {
            const window = new Window();
            const document = window.document;
            document.write(files[path]);
            titles.add(document.title);
            expect(document.querySelectorAll("h1")).toHaveLength(1);
            expect(document.querySelectorAll(".sections h2").length).toBeGreaterThanOrEqual(3);
            expect(document.querySelector("main")!.textContent!.length).toBeGreaterThan(350);
            expect(document.querySelector('link[rel="canonical"]')!.getAttribute("href")).toBe(config.origin + "/" + path.replace(/index.html$/, ""));
            expect(document.querySelectorAll('link[rel="alternate"]')).toHaveLength(2);
            const schema = JSON.parse(document.querySelector('script[type="application/ld+json"]')!.textContent!);
            expect(schema["@graph"][0].name).toBe(config.name);
            expect(document.querySelectorAll("iframe")).toHaveLength(0);
            expect(document.querySelectorAll('script:not([type="application/ld+json"])')).toHaveLength(0);
            for (const link of document.querySelectorAll("a[href], link[rel=alternate]")) {
                const url = new URL(link.getAttribute("href")!, config.origin);
                if (url.hash || url.pathname === "/") continue;
                const key = url.pathname.slice(1) + (url.pathname.endsWith("/") ? "index.html" : "");
                expect(files[key]).toBeDefined();
            }
            window.close();
        }
        expect(titles.size).toBe(5);
    });

    test("sitemap contains only real public canonical URLs, not private data or fake lastmod", () => {
        const files = buildPublicSite(config);
        const window = new Window();
        const xml = new window.DOMParser().parseFromString(files["sitemap.xml"], "application/xml");
        expect(xml.querySelector("parsererror")).toBeNull();
        expect(xml.querySelectorAll("loc")).toHaveLength(6);
        expect(xml.querySelectorAll("lastmod")).toHaveLength(0);
        for (const loc of xml.querySelectorAll("loc")) {
            const url = new URL(loc.textContent!);
            expect(url.origin).toBe(config.origin);
            expect(url.pathname === "/" || files[url.pathname.slice(1) + "index.html"]).toBeTruthy();
        }
        expect(files["robots.txt"]).toContain("User-agent: *\nAllow: /\n");
        expect(files["robots.txt"]).toContain("Disallow: /api/");
        expect(files["robots.txt"]).toContain("Disallow: /share/");
        expect(files["robots.txt"]).toContain(`Sitemap: ${config.origin}/sitemap.xml`);
        expect(files["llms-full.txt"]).toContain("AI 图片生成");
        expect(homepageSEO(config).keywords).toContain("AI短剧制作");
        expect(files["discover/en/index.html"]).toBeUndefined();
        window.close();
    });
});
