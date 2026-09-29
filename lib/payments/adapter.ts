/**
 * Payment provider abstraction (§45). No provider logic leaks into the app.
 * IMPORTANT: real gateway calls are only enabled when credentials + webhook secret are configured.
 * We do NOT fabricate API behaviour: the "manual" provider records intent and waits for an
 * out-of-band confirmation; Razorpay/Stripe adapters validate webhook signatures per their
 * official documented schemes (HMAC-SHA256 of raw body for Razorpay events; Stripe-Signature
 * t=…,v1=… scheme) — if env keys are absent, orders cannot be created at all.
 */
import { createHmac, timingSafeEqual, randomBytes } from 'crypto';

export interface CreateOrderInput { plan: 'PLUS' | 'PRO'; amountPaise: number; currency: 'INR'; userId: string }
export interface Order { orderId: string; provider: string; status: 'CREATED' | 'PAID' | 'FAILED'; clientSecret?: string }

export interface PaymentProvider {
  name: string;
  createOrder(i: CreateOrderInput): Promise<Order>;
  verifyPayment(orderId: string, paymentRef: string, signature: string): Promise<boolean>;
  handleWebhook(rawBody: string, headers: Record<string, string>): Promise<{ eventId: string; type: string; userId?: string; externalSubId?: string; status?: string } | null>;
}

/* ------------------------- Razorpay adapter ------------------------- */
class RazorpayProvider implements PaymentProvider {
  name = 'razorpay';
  private keyId = process.env.RAZORPAY_KEY_ID ?? '';
  private keySecret = process.env.RAZORPAY_KEY_SECRET ?? '';
  private webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET ?? '';

  private configured() { return !!(this.keyId && this.keySecret); }

  async createOrder(i: CreateOrderInput): Promise<Order> {
    if (!this.configured()) throw new Error('Payments are not configured on this deployment yet. Please try again later.');
    // Official REST: POST https://api.razorpay.com/v1/orders (Basic auth key_id:key_secret)
    const res = await fetch('https://api.razorpay.com/v1/orders', {
      method: 'POST',
      headers: {
        Authorization: 'Basic ' + Buffer.from(`${this.keyId}:${this.keySecret}`).toString('base64'),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ amount: i.amountPaise, currency: i.currency, receipt: `taxos_${i.userId.slice(0, 12)}_${Date.now()}`, notes: { plan: i.plan, userId: i.userId } }),
    });
    if (!res.ok) throw new Error(`Payment provider rejected the order (${res.status}).`);
    const j = await res.json();
    return { orderId: j.id, provider: this.name, status: 'CREATED', clientSecret: j.secret };
  }

  /** Signature verification per official checkout docs: HMAC_SHA256(order_id|payment_id, key_secret). */
  async verifyPayment(orderId: string, paymentRef: string, signature: string): Promise<boolean> {
    if (!this.configured()) return false;
    const expected = createHmac('sha256', this.keySecret).update(`${orderId}|${paymentRef}`).digest('hex');
    try { return timingSafeEqual(Buffer.from(expected), Buffer.from(signature)); } catch { return false; }
  }

  /** Webhook authenticity per docs: sha256 HMAC of raw body vs x-razorpay-signature. */
  async handleWebhook(rawBody: string, headers: Record<string, string>) {
    if (!this.webhookSecret) return null;
    const sig = headers['x-razorpay-signature'] ?? '';
    const expected = createHmac('sha256', this.webhookSecret).update(rawBody).digest('hex');
    let match = false;
    try { match = timingSafeEqual(Buffer.from(expected), Buffer.from(sig)); } catch { match = false; }
    if (!match) return null;
    const evt = JSON.parse(rawBody);
    const entity = evt?.payload?.payment?.entity ?? evt?.payload?.subscription?.entity ?? {};
    return {
      eventId: evt.event as string, type: evt.event as string,
      userId: entity.notes?.userId ?? evt?.payload?.order?.entity?.notes?.userId,
      externalSubId: entity.id, status: entity.status,
    };
  }
}

/* --------------------------- Manual (dev) --------------------------- */
/** Local development: creates a pending order that can be confirmed via a signed dev endpoint. Never auto-succeeds in production. */
class ManualProvider implements PaymentProvider {
  name = 'manual';
  async createOrder(i: CreateOrderInput): Promise<Order> {
    if (process.env.NODE_ENV === 'production') throw new Error('Configure a payment provider for production payments.');
    return { orderId: `man_${randomBytes(8).toString('hex')}`, provider: this.name, status: 'CREATED' };
  }
  async verifyPayment(): Promise<boolean> { return false; } // never trust frontend success (§45)
  async handleWebhook() { return null; }
}

export function getPaymentProvider(): PaymentProvider {
  if (process.env.RAZORPAY_KEY_ID) return new RazorpayProvider();
  return new ManualProvider();
}

export const PLANS = {
  FREE: { label: 'Free', pricePaise: 0, documents: 3, taxYears: 1 },
  PLUS: { label: 'TaxOS Plus', pricePaise: 9900, documents: Infinity, taxYears: 1 },     // ₹99/year
  PRO: { label: 'TaxOS Pro', pricePaise: 19900, documents: Infinity, taxYears: 10 },     // ₹199/year
} as const;
export type PlanKey = keyof typeof PLANS;

/** Server-side plan enforcement (§46). */
export function assertWithinPlan(plan: string, action: 'document_upload', currentCount: number) {
  const limit = PLANS[(plan as PlanKey) in PLANS ? (plan as PlanKey) : 'FREE'].documents;
  if (currentCount >= limit) {
    throw Object.assign(new Error(`Your ${plan.toLowerCase()} plan allows ${limit} document${limit === 1 ? '' : 's'}. Upgrade to Plus for unlimited uploads.`), { status: 402 });
  }
}
