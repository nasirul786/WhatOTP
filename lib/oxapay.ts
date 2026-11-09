import crypto from 'crypto';

/** Server-only OxaPay client (white-label payments). */

const API = 'https://api.oxapay.com/v1';

function merchantKey() {
  const key = process.env.OXAPAY_MERCHANT_API_KEY;
  if (!key) throw new Error('OXAPAY_MERCHANT_API_KEY is not set');
  return key;
}

interface OxaResponse<T> {
  data: T;
  message: string;
  error: { type?: string; key?: string; message?: string } | null | Record<string, never>;
  status: number;
}

export interface WhiteLabelPayment {
  track_id: string;
  amount: number;
  currency: string;
  pay_amount: number;
  pay_currency: string;
  network: string;
  address: string;
  memo: string;
  qr_code: string;
  expired_at: number;
  date: number;
}

export interface PaymentInfo {
  track_id: string;
  status: string;
  amount: number;
  expired_at?: number;
}

async function call<T>(path: string, init: RequestInit): Promise<T> {
  const res = await fetch(`${API}${path}`, {
    ...init,
    headers: { 'Content-Type': 'application/json', merchant_api_key: merchantKey(), ...init.headers },
    cache: 'no-store',
  });
  const json = (await res.json().catch(() => null)) as OxaResponse<T> | null;
  if (!res.ok || !json || json.status !== 200) {
    const err = json?.error && 'message' in json.error ? json.error.message : json?.message;
    throw new Error(err || `OxaPay request failed (${res.status})`);
  }
  return json.data;
}

export function createWhiteLabelPayment(params: {
  amount: number;
  network: string;
  orderId: string;
  description: string;
  callbackUrl?: string;
  lifetimeMinutes?: number;
}) {
  return call<WhiteLabelPayment>('/payment/white-label', {
    method: 'POST',
    body: JSON.stringify({
      pay_currency: 'USDT',
      currency: 'USD',
      amount: params.amount,
      network: params.network,
      lifetime: params.lifetimeMinutes ?? 30,
      order_id: params.orderId,
      description: params.description,
      ...(params.callbackUrl ? { callback_url: params.callbackUrl } : {}),
    }),
  });
}

export function getPaymentInfo(trackId: string) {
  return call<PaymentInfo>(`/payment/${encodeURIComponent(trackId)}`, { method: 'GET' });
}

/** OxaPay signs callbacks with HMAC-SHA512(rawBody, merchant API key) in the `hmac` header. */
export function verifyCallbackSignature(rawBody: string, hmacHeader: string | null) {
  if (!hmacHeader) return false;
  const expected = crypto.createHmac('sha512', merchantKey()).update(rawBody).digest('hex');
  const a = Buffer.from(expected);
  const b = Buffer.from(hmacHeader);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}
