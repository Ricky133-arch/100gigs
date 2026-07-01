import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import connectDB from '@/lib/mongodb';
import Payment from '@/models/Payment';
import { authOptions } from '../../../../auth/[...nextauth]/route';
import { sendNotificationToUser } from '@/lib/sendNotification';

export async function POST(request, { params }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Admins only' }, { status: 403 });
    }

    const { id } = await params;
    const body   = await request.json().catch(() => ({}));
    const { note } = body; // optional admin note

    await connectDB();

    const payment = await Payment.findById(id)
      .populate('providerId', 'name email bankDetails')
      .populate('clientId',   'name')
      .populate('jobId',      'title');

    if (!payment) {
      return NextResponse.json({ error: 'Payment not found' }, { status: 404 });
    }

    if (payment.transferStatus === 'success') {
      return NextResponse.json({ error: 'This payout has already been marked as paid' }, { status: 400 });
    }

    // ── Mark as manually paid ──────────────────────────────────────────────
    payment.transferStatus      = 'success';
    payment.transferCompletedAt = new Date();
    payment.transferReference   = `manual_${session.user.id}_${Date.now()}`;
    if (note) payment.transferFailReason = note; // reusing field for admin note
    await payment.save();

    // ── Notify provider ────────────────────────────────────────────────────
    const provider = payment.providerId;
    if (provider?._id) {
      sendNotificationToUser(provider._id.toString(), {
        title: '💸 Your payment has been sent!',
        body:  `₦${payment.providerShare.toLocaleString()} has been sent to your ${
          provider.bankDetails?.bankName || 'bank'
        } account for "${payment.jobId?.title || 'your completed job'}". Check your account shortly.`,
        url:   '/dashboard',
        type:  'system',
      }).catch(console.error);
    }

    return NextResponse.json({
      message: `✓ Payment of ₦${payment.providerShare.toLocaleString()} marked as paid to ${provider?.name}`,
      payment,
    });
  } catch (error) {
    console.error('[MANUAL PAYOUT]', error);
    return NextResponse.json({ error: 'Failed to mark as paid' }, { status: 500 });
  }
}