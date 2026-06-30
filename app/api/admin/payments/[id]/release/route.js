// app/api/admin/payments/[id]/release/route.js
//
// Admin manually releases a pending payout once they've confirmed
// the funds have settled into the Paystack balance. This is the ONLY
// place that actually calls Paystack's Transfer API.

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import connectDB from '@/lib/mongodb';
import Payment from '@/models/Payment';
import User from '@/models/User';
import Job from '@/models/Job';
import { authOptions } from '../../../../auth/[...nextauth]/route';
import { sendNotificationToUser } from '@/lib/sendNotification';

export async function POST(request, { params }) {
  try {
    const { id } = await params;
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Admins only' }, { status: 403 });
    }

    await connectDB();

    const payment = await Payment.findById(id);
    if (!payment) {
      return NextResponse.json({ error: 'Payment not found' }, { status: 404 });
    }

    if (payment.transferStatus === 'success') {
      return NextResponse.json({ error: 'This payout has already been completed' }, { status: 400 });
    }
    if (payment.transferStatus === 'pending') {
      return NextResponse.json({ error: 'A transfer is already in progress for this payment' }, { status: 400 });
    }

    const provider = await User.findById(payment.providerId);
    if (!provider?.bankDetails?.recipientCode) {
      payment.transferStatus = 'failed';
      payment.transferFailReason = 'Provider has not added bank details yet';
      await payment.save();
      return NextResponse.json({ error: 'Provider has not added bank details yet' }, { status: 400 });
    }

    const job = await Job.findById(payment.jobId).select('title');

    // ── Attempt the transfer ─────────────────────────────────────────────
    const transferRes = await fetch('https://api.paystack.co/transfer', {
      method:  'POST',
      headers: {
        Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        source:    'balance',
        amount:    Math.round(payment.providerShare * 100),
        recipient: provider.bankDetails.recipientCode,
        reason:    `Payment for job: ${job?.title || 'Job'}`,
        reference: `transfer_${payment.reference}_${Date.now()}`, // unique per attempt, in case of retry
      }),
    });
    const transferResult = await transferRes.json();

    if (!transferResult.status) {
      payment.transferStatus = 'failed';
      payment.transferFailReason = transferResult.message || 'Transfer initiation failed';
      await payment.save();
      return NextResponse.json(
        { error: transferResult.message || 'Transfer failed. The balance may not have settled yet.' },
        { status: 400 }
      );
    }

    payment.transferStatus = 'pending'; // Paystack transfers are async — webhook/status check confirms success later
    payment.transferReference = `transfer_${payment.reference}_${Date.now()}`;
    payment.transferCode = transferResult.data?.transfer_code;
    payment.transferFailReason = undefined;
    payment.releasedBy = session.user.id;
    await payment.save();

    // Notify the provider that their payout is on the way
    try {
      await sendNotificationToUser(payment.providerId.toString(), {
        title: '💸 Payout Released!',
        body: `₦${payment.providerShare.toLocaleString()} is on its way to your bank account.`,
        url: '/dashboard',
        type: 'payment_received',
      });
    } catch (e) {
      console.error('[RELEASE] Notification failed:', e.message);
    }

    return NextResponse.json({
      message: 'Payout released successfully',
      payment,
    });
  } catch (error) {
    console.error('[ADMIN PAYOUT RELEASE]', error);
    return NextResponse.json({ error: 'Failed to release payout' }, { status: 500 });
  }
}