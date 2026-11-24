import { expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

// Vite 在构建时注入版本号；这里给真实顶栏依赖提供同样的编译常量。
const buildScope = globalThis as typeof globalThis & { __APP_VERSION__?: string };
const previousVersion = buildScope.__APP_VERSION__;
buildScope.__APP_VERSION__ = "test";
const { WorkspaceTopBar } = await import("../src/components/layout/workspace-top-bar");
if (previousVersion === undefined) delete buildScope.__APP_VERSION__;
else buildScope.__APP_VERSION__ = previousVersion;

for (const [path, title] of [
    ["/", "创作"],
    ["/toolbox/image", "图片生成"],
    ["/toolbox/video", "视频生成"],
    ["/toolbox/unknown", "TumeiAI"],
]) {
    test(`工作台面包屑在 ${path} 正常渲染`, () => {
        const client = new QueryClient();
        try {
            const markup = renderToStaticMarkup(
                <QueryClientProvider client={client}>
                    <MemoryRouter initialEntries={[path]}>
                        <WorkspaceTopBar sidebarOpen={false} onToggleSidebar={() => undefined} />
                    </MemoryRouter>
                </QueryClientProvider>,
            );
            const breadcrumb = markup.match(/<nav[^>]*aria-label="当前位置"[^>]*>([\s\S]*?)<\/nav>/)?.[1];
            expect(breadcrumb).toBeDefined();
            expect(breadcrumb).toContain(title);
        } finally {
            client.clear();
        }
    });
}
