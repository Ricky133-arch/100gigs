/**
 * app/api/payment/webhook/route.js
 *
 * Paystack calls this directly when a payment succeeds, so the payment is
 * recorded even if the client closes the browser before the confirmation
 * page loads.
 *
 * Set it up once in Paystack: Settings → API Keys & Webhooks →
 * Webhook URL = https://YOUR-DOMAIN/api/payment/webhook
 */
import crypto from 'crypto';
import { NextResponse } from 'next/server';
import { fetchPaystackTransaction, recordPaystackPayment, PaymentError } from '@/lib/payments';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function validSignature(rawBody, signature) {
  if (!signature || !process.env.PAYSTACK_SECRET_KEY) return false;
  const expected = crypto
    .createHmac('sha512', process.env.PAYSTACK_SECRET_KEY)
    .update(rawBody)
    .digest('hex');
  const a = Buffer.from(signature);
  const b = Buffer.from(expected);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

export async function POST(request) {
  const raw = await request.text();

  // Only accept messages genuinely signed by Paystack
  if (!validSignature(raw, request.headers.get('x-paystack-signature'))) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
  }

  let event;
  try { event = JSON.parse(raw); } catch { return NextResponse.json({ ok: true }); }

  if (event?.event === 'charge.success' && event.data?.reference) {
    // Double-check with Paystack's API instead of trusting the message body
    const { ok, tx } = await fetchPaystackTransaction(event.data.reference);
    if (ok) {
      try {
        await recordPaystackPayment(tx);
      } catch (err) {
        if (!(err instanceof PaymentError)) console.error('[PAYSTACK WEBHOOK]', err);
        else console.warn('[PAYSTACK WEBHOOK]', event.data.reference, err.message);
      }
    }
  }

  // Always 200 after a valid signature, so Paystack doesn't retry forever
  return NextResponse.json({ ok: true });
}