export interface SubscriptionPaymentSession {
    clientSecret?: string;
    publishableKey?: string;
    stripeAccountId: string;
    channel: string;
    status: string;
}
interface PaymentElement {
    mount(node: HTMLElement): void;
    destroy(): void;
    on(event: "ready", callback: () => void): void;
}
export interface StripeElements {
    create(type: "payment"): PaymentElement;
}
export interface SubscriptionStripe {
    elements(options: { clientSecret: string; locale: string; appearance?: { theme: "night" | "stripe" } }): StripeElements;
    confirmPayment(options: { elements: StripeElements; confirmParams: { return_url: string }; redirect: "if_required" }): Promise<{ error?: { message?: string } }>;
}
type StripeFactory = (key: string, options?: { stripeAccount: string }) => SubscriptionStripe;
let loading: Promise<StripeFactory> | undefined;
export function loadSubscriptionStripe(): Promise<StripeFactory> {
    const current = (window as unknown as { Stripe?: StripeFactory }).Stripe;
    if (current) return Promise.resolve(current);
    if (!loading)
        loading = new Promise<StripeFactory>((resolve, reject) => {
            const script = document.createElement("script");
            script.src = "https://js.stripe.com/v3/";
            script.async = true;
            const timer = window.setTimeout(() => {
                script.remove();
                reject(new Error("Stripe connection timed out"));
            }, 30000);
            script.onload = () => {
                window.clearTimeout(timer);
                const factory = (window as unknown as { Stripe?: StripeFactory }).Stripe;
                if (factory) resolve(factory);
                else reject(new Error("Stripe could not be loaded"));
            };
            script.onerror = () => {
                window.clearTimeout(timer);
                script.remove();
                reject(new Error("Stripe could not be loaded"));
            };
            document.head.appendChild(script);
        }).catch((error) => {
            loading = undefined;
            throw error;
        });
    return loading;
}
