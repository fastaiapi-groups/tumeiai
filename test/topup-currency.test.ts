import { expect, test } from "bun:test";
import { formatTopupMoney, topupSupportsMethod } from "../src/lib/topup-currency";

test("top-up currency displays the stored amount without FX conversion", () => {
    expect(formatTopupMoney(100, "USD")).toContain("1.00");
    expect(formatTopupMoney(100, "JPY")).toContain("100");
    expect(formatTopupMoney(100, "KRW")).not.toContain(".00");
    expect(formatTopupMoney(100, "CNY")).toContain("1.00");
    expect(topupSupportsMethod("USD", "cashapp")).toBe(true);
    expect(topupSupportsMethod("CNY", "cashapp")).toBe(false);
    expect(topupSupportsMethod(undefined, "cashapp")).toBe(false);
});
