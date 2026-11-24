import { expect, test } from "bun:test";
import { editorPayload, editorValues, comparisonPayload } from "../src/pages/admin/subscriptions/subscription-admin-data";
import { parseCatalogImport, prepareImportPlans } from "../src/pages/admin/subscriptions/subscription-import-data";

test("editor converts actual USD prices, fractional credits and multipliers without losing price references", () => {
    const values = editorValues();
    values.code = "custom";
    values.localizations[0].name = "Custom";
    values.prices[0].amountMinor = 599.9;
    values.prices[0].maxMultiplierBasisPoints = 5;
    values.creditRules = [{ priceId: values.prices[0].id, amountMicrocredits: 250.5 }];
    const payload = editorPayload(values);
    expect(payload.prices[0].amountMinor).toBe(59990);
    expect(payload.prices[0].maxMultiplierBasisPoints).toBe(50000);
    expect(payload.creditRules[0].amountMicrocredits).toBe(250500000);
    expect(payload.creditRules[0].priceId).toBe(payload.prices[0].id);
    values.creditRules[0].priceId = "removed";
    expect(() => editorPayload(values)).toThrow("关联的价格");
});
test("import rejects duplicate catalog codes before any write", () => {
    expect(() => parseCatalogImport(JSON.stringify({ version: 1, plans: [{ code: "plus" }, { code: "plus" }] }))).toThrow("重复");
    expect(() => parseCatalogImport('{"version":1,"plans":[]}')).toThrow();
    expect(() => prepareImportPlans({ version: 1, plans: [{ code: "bad", prices: [] }] }, [])).toThrow();
});
test("comparison export preserves column mapping and disabled source references", () => {
    const result = comparisonPayload({
        code: "reference",
        enabled: false,
        columns: [
            { code: "a", nameEn: "A", rows: [{ code: "cost", valueEn: "$599.9" }] },
            { code: "b", nameEn: "B", rows: [{ code: "cost", valueEn: "$600" }] },
        ],
    });
    expect(result.set.enabled).toBe(false);
    expect(result.rows.map((r: any) => [r.columnCode, r.valueEn])).toEqual([
        ["a", "$599.9"],
        ["b", "$600"],
    ]);
    expect(result.columns[0].rows).toBeUndefined();
});
