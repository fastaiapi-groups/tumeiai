import type { Plugin } from "vite";
import { publicArticlePath, publicSiteArticles, type PublicSiteLocale } from "../src/lib/public-site";

export type PublicSiteConfig = { origin: string; name: string };
const locales: PublicSiteLocale[] = ["zh"];
const indexRobots = "index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1";
const escape = (value: string) => value.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
const json = (value: unknown) => JSON.stringify(value).replace(/</g, "\\u003c");

export function publicSiteConfig(env: Record<string, string | undefined>): PublicSiteConfig | null {
    const raw = env.CANVAS_SEO_SITE_URL?.trim();
    const name = env.CANVAS_SEO_SITE_NAME?.trim();
    if (!raw && !name) return null;
    if (!raw || !name) throw new Error("Public SEO requires both CANVAS_SEO_SITE_URL and CANVAS_SEO_SITE_NAME");
    const url = new URL(raw);
    if (url.protocol !== "https:" || url.username || url.password || url.search || url.hash || url.pathname !== "/") {
        throw new Error("CANVAS_SEO_SITE_URL must be an HTTPS origin without a path, credentials or query");
    }
    return { origin: url.origin, name };
}

export function homepageSEO(config: PublicSiteConfig) {
    return {
        title: `${config.name} | AI影视短剧创作`,
        description: `${config.name}：AI图片生成、视频生成、剧本构思与分镜画布。`,
        keywords: publicSiteArticles[0].zh.keywords.join(", "),
    };
}

function alternates(config: PublicSiteConfig, slug: string) {
    return [
        ...locales.map((locale) => `<link rel="alternate" hreflang="${locale === "zh" ? "zh-CN" : "en"}" href="${config.origin}${publicArticlePath(locale, slug)}">`),
        `<link rel="alternate" hreflang="x-default" href="${config.origin}${publicArticlePath("zh", slug)}">`,
    ].join("\n");
}

function metadata(config: PublicSiteConfig, title: string, description: string, keywords: string, path: string, locale: PublicSiteLocale) {
    return `<meta name="description" content="${escape(description)}">
<meta name="keywords" content="${escape(keywords)}">
<meta name="robots" content="${indexRobots}">
<link rel="canonical" href="${config.origin}${path}">
<meta property="og:type" content="website"><meta property="og:site_name" content="${escape(config.name)}">
<meta property="og:title" content="${escape(title)}"><meta property="og:description" content="${escape(description)}">
<meta property="og:url" content="${config.origin}${path}"><meta property="og:locale" content="${locale === "zh" ? "zh_CN" : "en_US"}">
<meta name="twitter:card" content="summary"><meta name="twitter:title" content="${escape(title)}"><meta name="twitter:description" content="${escape(description)}">`;
}

const css = `:root{color-scheme:light dark;--background:#fafaf9;--foreground:#1d2524;--surface:#fff;--muted:#58645f;--border:#dce2de;--accent:#126959;--radius:20px}*{box-sizing:border-box}body{margin:0;background:var(--background);color:var(--foreground);font:16px/1.85 system-ui,-apple-system,"PingFang SC",sans-serif}a{color:var(--accent);text-underline-offset:4px}a:focus-visible{outline:3px solid var(--accent);outline-offset:5px}header,main,footer{max-width:1100px;margin:auto;padding:28px}header{display:flex;justify-content:space-between;gap:24px;align-items:center;border-bottom:1px solid var(--border)}header>a{font-size:20px;font-weight:700;text-decoration:none}nav{display:flex;flex-wrap:wrap;gap:18px}.hero{padding:54px 0 30px;max-width:850px}h1{font-size:clamp(32px,5vw,52px);line-height:1.22;letter-spacing:-.025em;margin:16px 0 24px}h2{font-size:23px;line-height:1.5;margin:0 0 14px}p{margin:0 0 16px}.intro{font-size:20px;color:var(--muted)}.eyebrow{font-size:13px;color:var(--accent);letter-spacing:.08em}.cta{display:inline-block;background:var(--accent);color:var(--surface);padding:11px 22px;border-radius:var(--radius);text-decoration:none;font-weight:600;margin:10px 0}.sections,.related{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:20px}.card{padding:28px;background:var(--surface);border:1px solid var(--border);border-radius:var(--radius)}.card p{color:var(--muted)}.related{margin-top:25px}.related a{display:block;text-decoration:none}.related h2{font-size:18px}footer{color:var(--muted);font-size:14px;border-top:1px solid var(--border);margin-top:48px}.skip{position:absolute;top:-100px}.skip:focus{top:0}@media(prefers-color-scheme:dark){:root{--background:#121a18;--foreground:#edf3ef;--surface:#1b2723;--muted:#b2c1b9;--border:#34453c;--accent:#8fddc5}.cta{color:#121a18}}@media(max-width:650px){header{align-items:flex-start;flex-direction:column}header,main,footer{padding:22px}.hero{padding-top:25px}.sections,.related{grid-template-columns:1fr}.card{padding:22px}}`;

export function buildPublicSite(config: PublicSiteConfig): Record<string, string> {
    const files: Record<string, string> = { "discover/site.css": css };
    const urls: string[] = ["/"];
    const markdown: string[] = [`# ${config.name}`, "", "> 公开产品介绍", "", `站点：${config.origin}/`, "", "产品可用性与价格以实时工作台为准；介绍页不包含私人项目数据。", ""];
    for (const article of publicSiteArticles) {
        for (const locale of locales) {
            const en = false;
            const name = config.name;
            const content = article[locale];
            const path = publicArticlePath(locale, article.slug);
            const url = config.origin + path;
            const title = `${content.title} | ${name}`;
            urls.push(path);
            const related = publicSiteArticles
                .filter((item) => item !== article)
                .map((item) => `<a class="card" href="${publicArticlePath(locale, item.slug)}"><h2>${escape(item[locale].title)}</h2><p>${escape(item[locale].description)}</p></a>`)
                .join("");
            const sections = content.sections.map(([heading, text]) => `<section class="card"><h2>${escape(heading)}</h2><p>${escape(text)}</p></section>`).join("");
            const schema = {
                "@context": "https://schema.org",
                "@graph": [
                    { "@type": "Organization", "@id": `${config.origin}/#organization`, name, url: `${config.origin}/` },
                    { "@type": "WebSite", "@id": `${config.origin}/#website`, name, url: `${config.origin}/`, inLanguage: ["zh-CN"] },
                    {
                        "@type": "WebPage",
                        "@id": url,
                        url,
                        name: title,
                        description: content.description,
                        inLanguage: en ? "en" : "zh-CN",
                        isPartOf: { "@id": `${config.origin}/#website` },
                        about: { "@type": "SoftwareApplication", name, applicationCategory: "MultimediaApplication", operatingSystem: "Web", url: `${config.origin}/`, featureList: content.keywords },
                    },
                ],
            };
            files[`${path.slice(1)}index.html`] = `<!doctype html><html lang="${en ? "en" : "zh-CN"}"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escape(title)}</title>
${metadata({ ...config, name }, title, content.description, content.keywords.join(", "), path, locale)}
${alternates(config, article.slug)}<link rel="stylesheet" href="/discover/site.css"><script type="application/ld+json">${json(schema)}</script></head><body>
<a class="skip" href="#content">${en ? "Skip to content" : "跳到正文"}</a>
<header><a href="${publicArticlePath(locale)}">${escape(name)}</a><nav aria-label="${en ? "Main navigation" : "主导航"}"><a href="/">${en ? "Open workspace" : "进入创作工作台"}</a><a href="/sitemap.xml">Sitemap</a></nav></header>
<main id="content"><div class="hero"><span class="eyebrow">${en ? "AI FILMMAKING WORKSPACE" : "AI 影视 · 短剧 · 可视化创作"}</span><h1>${escape(content.title)}</h1><p class="intro">${escape(content.description)}</p><a class="cta" href="/">${en ? "Open creative workspace" : "进入创作工作台"}</a></div><div class="sections">${sections}</div><section aria-label="${en ? "Explore more" : "了解更多"}"><div class="hero"><h2>${en ? "Explore the creation workflow" : "探索更多创作流程"}</h2></div><div class="related">${related}</div></section></main>
<footer><p>${escape(name)} · ${en ? "AI filmmaking, images, videos and storyboards" : "AI 影视创作、图片、视频与分镜"}</p><nav><a href="${publicArticlePath(locale)}">${en ? "Product overview" : "产品总览"}</a><a href="/llms.txt">llms.txt</a><a href="/robots.txt">robots.txt</a></nav></footer></body></html>`;
            markdown.push(`## [${content.title}](${url})`, "", content.description, "", ...content.sections.flatMap(([h, p]) => [`### ${h}`, "", p, ""]));
        }
    }
    const sitemap = urls
        .map((path) => {
            const article = publicSiteArticles.find((item) => locales.some((locale) => publicArticlePath(locale, item.slug) === path));
            const links = article
                ? [
                      ...locales.map((locale) => `<xhtml:link rel="alternate" hreflang="${locale === "zh" ? "zh-CN" : "en"}" href="${config.origin}${publicArticlePath(locale, article.slug)}"/>`),
                      `<xhtml:link rel="alternate" hreflang="x-default" href="${config.origin}${publicArticlePath("zh", article.slug)}"/>`,
                  ].join("")
                : "";
            return `<url><loc>${config.origin}${path}</loc>${links}</url>`;
        })
        .join("\n");
    files["sitemap.xml"] = `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">${sitemap}</urlset>`;
    // One group for search/AI bots preserves the same private-path exclusions for every agent.
    files["robots.txt"] =
        `User-agent: *\nAllow: /\nDisallow: /api/\nDisallow: /admin\nDisallow: /oauth/\nDisallow: /login\nDisallow: /register\nDisallow: /forgot-password\nDisallow: /wallet\nDisallow: /settings\nDisallow: /projects\nDisallow: /canvas\nDisallow: /share/\nDisallow: /tasks\nDisallow: /assets\nAllow: /assets/\nDisallow: /toolbox/\nDisallow: /plugins\nDisallow: /skills\nDisallow: /subscription\nDisallow: /dev/\n\nSitemap: ${config.origin}/sitemap.xml\n`;
    files["llms.txt"] = [
        `# ${config.name}`,
        "",
        "> AI 影视与短剧创作工作台。",
        "",
        "## 公开产品介绍",
        ...publicSiteArticles.flatMap((a) => locales.map((l) => `- [${a[l].title}](${config.origin}${publicArticlePath(l, a.slug)}): ${a[l].description}`)),
        "",
        "## 机器可读资源",
        `- [Sitemap](${config.origin}/sitemap.xml)`,
        `- [完整中文产品介绍](${config.origin}/llms-full.txt)`,
        "",
        "这些页面仅提供公开产品介绍。模型可用性和价格以工作台为准，私人项目、支付数据和个人素材需要登录后访问。",
        "",
    ].join("\n");
    files["llms-full.txt"] = markdown.join("\n");
    return files;
}

export function publicSitePlugin(config: PublicSiteConfig | null): Plugin {
    return {
        name: "canvas-public-site",
        transformIndexHtml(html) {
            if (!config) return html;
            const seo = homepageSEO(config);
            return html
                .replace(/<title>[^<]*<\/title>/, `<title>${escape(seo.title)}</title>`)
                .replace(/<meta name="description"[^>]*\/>/, "")
                .replace(
                    "</head>",
                    `${metadata(config, seo.title, seo.description, seo.keywords, "/", "zh")}<script type="application/ld+json">${json({ "@context": "https://schema.org", "@type": "WebSite", name: config.name, url: `${config.origin}/`, inLanguage: ["zh-CN"] })}</script>\n</head>`,
                )
                .replace(
                    '<div id="root"></div>',
                    `<div id="root"></div><noscript><main><h1>${escape(config.name)} · AI 影视与短剧创作</h1><p>${escape(seo.description)}</p><a href="/discover/zh/">中文产品介绍</a><p>创作工作台需要 JavaScript。</p></main></noscript>`,
                );
        },
        generateBundle() {
            const files = config ? buildPublicSite(config) : { "robots.txt": "User-agent: *\nDisallow: /\n" };
            for (const [fileName, source] of Object.entries(files)) this.emitFile({ type: "asset", fileName, source });
        },
    };
}
