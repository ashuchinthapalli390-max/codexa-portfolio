import crypto from "crypto";

export interface RazorpayOrderResponse {
  id: string;
  entity: string;
  amount: number; // in paise
  amount_paid: number;
  amount_due: number;
  currency: string;
  receipt: string;
  status: string;
  attempts: number;
  notes?: Record<string, string>;
  created_at: number;
}

export function getRazorpayKeys() {
  const keyId = process.env.RAZORPAY_KEY_ID || process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || "";
  const keySecret = process.env.RAZORPAY_KEY_SECRET || "";
  const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET || "";
  const isConfigured = Boolean(keyId && keySecret);

  return {
    keyId,
    keySecret,
    webhookSecret,
    isConfigured,
  };
}

/**
 * Creates a Razorpay Order server-side using standard REST API
 */
export async function createRazorpayOrder(params: {
  amountInINR: number;
  receipt: string;
  notes?: Record<string, string>;
}): Promise<{
  success: boolean;
  order?: RazorpayOrderResponse;
  isMock?: boolean;
  error?: string;
}> {
  const { keyId, keySecret, isConfigured } = getRazorpayKeys();
  const amountInPaise = Math.round(params.amountInINR * 100);

  // If Razorpay live credentials are not set in environment (e.g. initial dev/staging test),
  // generate a sandbox simulated order ID so developers and testers can test without failing.
  if (!isConfigured) {
    const mockOrderId = `order_sim_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    return {
      success: true,
      isMock: true,
      order: {
        id: mockOrderId,
        entity: "order",
        amount: amountInPaise,
        amount_paid: 0,
        amount_due: amountInPaise,
        currency: "INR",
        receipt: params.receipt,
        status: "created",
        attempts: 0,
        notes: params.notes,
        created_at: Math.floor(Date.now() / 1000),
      },
    };
  }

  try {
    const authHeader = `Basic ${Buffer.from(`${keyId}:${keySecret}`).toString("base64")}`;
    const response = await fetch("https://api.razorpay.com/v1/orders", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: authHeader,
      },
      body: JSON.stringify({
        amount: amountInPaise,
        currency: "INR",
        receipt: params.receipt,
        notes: params.notes || {},
        payment_capture: 1, // Auto-capture payment upon authorization
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      return {
        success: false,
        error: `Razorpay Order API error: ${response.status} ${errText}`,
      };
    }

    const orderData = (await response.json()) as RazorpayOrderResponse;
    return {
      success: true,
      order: orderData,
      isMock: false,
    };
  } catch (err: any) {
    return {
      success: false,
      error: err?.message || "Failed to create Razorpay Order",
    };
  }
}

/**
 * Verifies Razorpay payment signature server-side using HMAC SHA-256
 */
export function verifyRazorpayPaymentSignature(params: {
  orderId: string;
  paymentId: string;
  signature: string;
}): boolean {
  const { keySecret, isConfigured } = getRazorpayKeys();

  // If simulation order
  if (params.orderId.startsWith("order_sim_") || !isConfigured) {
    return true;
  }

  try {
    const payload = `${params.orderId}|${params.paymentId}`;
    const expectedSignature = crypto
      .createHmac("sha256", keySecret)
      .update(payload)
      .digest("hex");

    return crypto.timingSafeEqual(
      Buffer.from(expectedSignature, "utf8"),
      Buffer.from(params.signature, "utf8")
    );
  } catch {
    return false;
  }
}

/**
 * Verifies Razorpay webhook event signature server-side
 */
export function verifyRazorpayWebhookSignature(rawBody: string, signature: string): boolean {
  const { webhookSecret } = getRazorpayKeys();
  if (!webhookSecret) return true; // webhook secret not configured yet

  try {
    const expectedSignature = crypto
      .createHmac("sha256", webhookSecret)
      .update(rawBody)
      .digest("hex");

    return crypto.timingSafeEqual(
      Buffer.from(expectedSignature, "utf8"),
      Buffer.from(signature, "utf8")
    );
  } catch {
    return false;
  }
}
