import { expect, test } from "bun:test";
import { isPaymentQrImageURL } from "../src/lib/payment-checkout-code";

test("server-validated QR images render as images instead of encoding their data URLs", () => {
    expect(isPaymentQrImageURL("data:image/png;base64,aGVsbG8=")).toBe(true);
    expect(isPaymentQrImageURL("data:image/jpeg;base64,aGVsbG8=")).toBe(true);
    expect(isPaymentQrImageURL("data:image/svg+xml;base64,PHN2Zz4=")).toBe(false);
    expect(isPaymentQrImageURL("wxp://native-payment")).toBe(false);
    expect(isPaymentQrImageURL("https://pay.example/qrcode.png")).toBe(true);
});
