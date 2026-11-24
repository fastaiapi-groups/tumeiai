import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import vm from "node:vm";

const source = (path) => readFileSync(new URL(path, import.meta.url), "utf8");

test("welcome entry loads configured appearance", async () => {
    let calls = 0;
    const imports = [];
    const main = source("../src/main.tsx")
        .replace(/^import .*;\n/gm, "")
        .replace(/import\.meta\.env\.DEV/g, "false")
        .replace(/import\(/g, "loadModule(");
    vm.runInNewContext(main, {
        window: { location: { pathname: "/welcome" } },
        installChunkRecovery() {},
        isIsolatedDirectorRepro: () => false,
        bootstrapAppearance: async () => {
            calls++;
        },
        loadModule: async (name) => {
            imports.push(name);
        },
    });
    await Promise.resolve();
    assert.equal(calls, 1, "welcome entry must bootstrap appearance");
    assert.deepEqual(imports, ["./welcome-application"]);
});

test("welcome uses the shared Chinese appearance bootstrap", () => {
    const page = source("../src/pages/welcome/index.tsx");
    const bootstrap = source("../src/services/appearance-bootstrap.ts");
    const store = source("../src/stores/use-appearance-store.ts");
    const locale = source("../src/lib/ui-text.ts");
    assert.doesNotMatch(page, /document\.title\s*=/);
    assert.match(bootstrap, /return commitPublicAppearance\(await resolvePublicAppearance\(fetchAppearance\)\)/);
    assert.match(store, /applyAppearanceMetadata\(appearance\)/);
    assert.match(store, /locale = UI_LOCALE/);
    assert.match(locale, /UI_LOCALE = "zh-CN"/);
});
