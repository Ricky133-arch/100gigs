// app/api/payment/webhook/route.js
//
// Paystack calls this URL automatically on payment events. This is a
// RELIABLE BACKUP to app/api/payment/verify/route.js — if the user
// closes their browser before the redirect completes, this guarantees
// the payment still gets recorded.
//
// NOTE: This does NOT attempt any transfer. Payouts are released
// manually by an admin once funds have settled — see
// app/api/admin/payments/[id]/release/route.js

import { NextResponse } from 'next/server';
import crypto from 'crypto';
import connectDB from '@/lib/mongodb';
import Job from '@/models/Job';
import User from '@/models/User';
import Payment from '@/models/Payment';
import { sendNotificationToUser } from '@/lib/sendNotification';

export async function POST(request) {
  try {
    const rawBody = await request.text();
    const signature = request.headers.get('x-paystack-signature');

    const hash = crypto
      .createHmac('sha512', process.env.PAYSTACK_SECRET_KEY)
      .update(rawBody)
      .digest('hex');

    if (hash !== signature) {
      console.error('[WEBHOOK] Invalid signature — request rejected');
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }

    const event = JSON.parse(rawBody);

    if (event.event !== 'charge.success') {
      return NextResponse.json({ received: true });
    }

    const { reference, amount, metadata } = event.data;
    const { jobId, providerId, clientId, commission, providerShare, jobTitle } = metadata;

    await connectDB();

    // ── Idempotency: if /verify already processed this, do nothing ──────
    const existing = await Payment.findOne({ reference });
    if (existing) {
      return NextResponse.json({ received: true, message: 'Already processed' });
    }

    // ── This webhook is the FIRST to see this payment — do everything ───
    const payment = await Payment.create({
      reference,
      jobId,
      clientId,
      providerId,
      totalAmount: amount / 100,
      commission: Number(commission),
      providerShare: Number(providerShare),
      paystackStatus: 'success',
      paidAt: new Date(),
      transferStatus: 'awaiting_settlement',
    });

    await Job.findByIdAndUpdate(jobId, { status: 'completed' });

    try {
      await sendNotificationToUser(providerId, {
        title: '💰 Payment Received!',
        body: `You've been paid ₦${payment.providerShare.toLocaleString()} for "${jobTitle || 'your job'}". `
            + `Your payout is being processed and will be sent once funds settle (usually within 1 business day).`,
        url: '/dashboard',
        type: 'payment_received',
      });
    } catch (e) {
      console.error('[WEBHOOK] Provider notification failed:', e.message);
    }

    try {
      const admins = await User.find({ role: 'admin' }).select('_id');
      const client = await User.findById(clientId).select('name');
      for (const admin of admins) {
        await sendNotificationToUser(admin._id.toString(), {
          title: '💳 New Payment — Payout Pending',
          body: `${client?.name || 'A client'} paid ₦${payment.totalAmount.toLocaleString()} for "${jobTitle || 'a job'}". `
              + `Commission: ₦${payment.commission.toLocaleString()} · Provider share: ₦${payment.providerShare.toLocaleString()}. `
              + `Release the payout once funds have settled.`,
          url: '/admin/payments',
          type: 'system',
        });
      }
    } catch (e) {
      console.error('[WEBHOOK] Admin notification failed:', e.message);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('[PAYMENT WEBHOOK]', error);
    return NextResponse.json({ received: true, error: 'Internal error logged' });
  }
}