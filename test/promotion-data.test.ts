import { expect, test } from "bun:test";
import { parsePromotionEmails, promotionStats } from "../src/pages/admin/promotions/promotion-data";
test("normalizes and deduplicates recipients while rejecting invalid entries", () => {
    expect(parsePromotionEmails(" A@Example.com\na@example.com\ninvalid\n")).toEqual({ emails: ["a@example.com", "invalid"], invalid: ["invalid"], duplicates: 1 });
});
test("rates use successful deliveries and unique recipient timestamps", () => {
    const result = promotionStats([
        { id: "1", email: "a@example.com", status: "sent", error: "", openedAt: "now", clickedAt: "now", registeredAt: "now" },
        { id: "2", email: "b@example.com", status: "sent", error: "" },
        { id: "3", email: "c@example.com", status: "failed", error: "" },
    ]);
    expect(result.registrationRate).toBe("50.0%");
    expect(result.clickRegistrationRate).toBe("100.0%");
    expect(promotionStats([]).registrationRate).toBe("—");
});
