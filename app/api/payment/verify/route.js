import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import connectDB from '@/lib/mongodb';
import Job from '@/models/Job';
import Payment from '@/models/Payment';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { sendNotificationToUser } from '@/lib/sendNotification';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const reference   = searchParams.get('reference');
    const jobId       = searchParams.get('jobId');
    const providerId  = searchParams.get('providerId');
    const providerShare = parseFloat(searchParams.get('providerShare') || '0');

    if (!reference) {
      return NextResponse.json({ error: 'Reference is required' }, { status: 400 });
    }

    // Verify with Paystack
    const paystackRes = await fetch(
      `https://api.paystack.co/transaction/verify/${reference}`,
      {
        headers: { Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}` },
      }
    );

    const paystackData = await paystackRes.json();

    if (!paystackData.status || paystackData.data.status !== 'success') {
      return NextResponse.json({ error: 'Payment verification failed', status: paystackData.data?.status }, { status: 400 });
    }

    await connectDB();

    const tx       = paystackData.data;
    const metadata = tx.metadata;
    const amount   = tx.amount / 100; // convert from kobo
    const commission   = metadata.commission || Math.round(amount * 0.10);
    const providerAmt  = providerShare || (amount - commission);

    // Check if already processed (idempotency)
    const existing = await Payment.findOne({ reference });
    if (existing) {
      return NextResponse.json({ message: 'Payment already processed', payment: existing });
    }

    // Save payment record
    const payment = await Payment.create({
      reference,
      jobId:         jobId || metadata.jobId,
      clientId:      metadata.clientId,
      providerId:    providerId || metadata.providerId,
      totalAmount:   amount,
      commission,
      providerShare: providerAmt,
      paystackStatus:'success',
      paidAt:        new Date(),
    });

    // Mark job as completed
    if (jobId || metadata.jobId) {
      await Job.findByIdAndUpdate(
        jobId || metadata.jobId,
        { status: 'completed' }
      );
    }

    // Notify provider
    if (providerId || metadata.providerId) {
      sendNotificationToUser((providerId || metadata.providerId).toString(), {
        title: '💰 Payment received!',
        body:  `₦${providerAmt.toLocaleString()} has been paid for "${metadata.jobTitle || 'your job'}". Contact the client to arrange transfer.`,
        url:   '/dashboard',
        type:  'system',
      }).catch(console.error);
    }

    return NextResponse.json({ message: 'Payment verified successfully', payment });
  } catch (error) {
    console.error('[PAYMENT VERIFY]', error);
    return NextResponse.json({ error: 'Failed to verify payment' }, { status: 500 });
  }
}