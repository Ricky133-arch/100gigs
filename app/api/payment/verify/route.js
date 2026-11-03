/**
 * app/api/payment/verify/route.js
 *
 * Called by the payment confirmation page after the client returns from
 * Paystack. Only the reference is read from the request — amounts, the
 * provider and the job all come from Paystack and our database.
 */
import { NextResponse } from 'next/server';
import {
  fetchPaystackTransaction,
  recordPaystackPayment,
  publicPayment,
  PaymentError,
} from '@/lib/payments';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  const params = new URL(request.url).searchParams;
  const reference = params.get('reference') || params.get('trxref');

  // Anything else in the address (providerShare, providerId, jobId…) is ignored on purpose
  if (!reference || !/^[\w.\-=]{1,120}$/.test(reference)) {
    return NextResponse.json({ error: 'A valid payment reference is required.' }, { status: 400 });
  }

  const { ok, tx, error } = await fetchPaystackTransaction(reference);
  if (!ok) {
    return NextResponse.json({ error: `${error}. If you were charged, don’t pay again.` }, { status: 502 });
  }

  try {
    const { payment, alreadyProcessed } = await recordPaystackPayment(tx);
    return NextResponse.json({
      message: alreadyProcessed ? 'Payment already confirmed' : 'Payment confirmed',
      payment: publicPayment(payment),
    });
  } catch (err) {
    if (err instanceof PaymentError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error('[PAYMENT VERIFY]', err);
    return NextResponse.json(
      { error: 'We couldn’t record this payment. If you were charged, don’t pay again — contact us with your reference.' },
      { status: 500 }
    );
  }
}