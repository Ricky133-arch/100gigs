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

    console.log(`[PAYMENT RELEASE] Attempting to release payment: ${id}`);

    const session = await getServerSession(authOptions);

    if (!session?.user || session.user.role !== 'admin') {
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

    if (!payment.providerShare || payment.providerShare <= 0) {
      return NextResponse.json({ error: 'Invalid payout amount' }, { status: 400 });
    }

    const provider = await User.findById(payment.providerId);
    if (!provider) {
      return NextResponse.json({ error: 'Provider not found' }, { status: 404 });
    }

    let transferSuccess = false;
    let transferCode = null;
    let errorMessage = null;

    // Try automated Paystack transfer first
    if (provider.bankDetails?.recipientCode || provider.bankDetails?.accountNumber) {
      try {
        let recipientCode = provider.bankDetails?.recipientCode;

        // Create recipient if missing
        if (!recipientCode && provider.bankDetails?.accountNumber && provider.bankDetails?.bankCode) {
          const createRes = await fetch('https://api.paystack.co/transferrecipient', {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              type: 'nuban',
              name: provider.bankDetails.accountName || provider.name || 'Provider',
              account_number: provider.bankDetails.accountNumber,
              bank_code: provider.bankDetails.bankCode,
              currency: 'NGN',
            }),
          });

          const createData = await createRes.json();
          if (createData.status) {
            recipientCode = createData.data.recipient_code;
            await User.findByIdAndUpdate(payment.providerId, {
              $set: {
                'bankDetails.recipientCode': recipientCode,
                'bankDetails.recipientId': createData.data.id,
              }
            });
          }
        }

        if (recipientCode) {
          const job = await Job.findById(payment.jobId).select('title'); // ← Moved up

          const transferRes = await fetch('https://api.paystack.co/transfer', {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              source: 'balance',
              amount: Math.round(payment.providerShare * 100),
              recipient: recipientCode,
              reason: `Payment for job: ${job?.title || 'Job'}`,
              reference: `transfer_${payment.reference || id}_${Date.now()}`,
            }),
          });

          const transferResult = await transferRes.json();

          if (transferResult.status) {
            transferSuccess = true;
            transferCode = transferResult.data?.transfer_code;
            console.log(`[PAYMENT RELEASE] Automated transfer successful for ${id}`);
          } else {
            errorMessage = transferResult.message;
            console.error('[PAYMENT RELEASE] Paystack error:', errorMessage);
          }
        }
      } catch (transferError) {
        console.error('[PAYMENT RELEASE] Transfer attempt failed:', transferError);
        errorMessage = transferError.message;
      }
    }

    // Finalize Payment Record
    const job = await Job.findById(payment.jobId).select('title'); // Fallback if not fetched earlier

    payment.transferStatus = transferSuccess ? 'pending' : 'success';
    payment.transferReference = transferSuccess 
      ? `transfer_${payment.reference || id}_${Date.now()}` 
      : `manual_${Date.now()}`;
    payment.transferCode = transferCode;
    payment.transferFailReason = transferSuccess ? undefined : (errorMessage || 'Manual release by admin');
    payment.releasedBy = session.user.id;
    payment.releasedAt = new Date();
    payment.isManualRelease = !transferSuccess;

    await payment.save();

    // Notify provider
    try {
      await sendNotificationToUser(payment.providerId.toString(), {
        title: transferSuccess ? ' Payout Released!' : ' Payout Marked as Released',
        body: `₦${payment.providerShare.toLocaleString()} has been ${transferSuccess ? 'sent' : 'processed manually'}.`,
        url: '/dashboard',
        type: 'payment_received',
      });
    } catch (e) {
      console.error('Notification failed:', e);
    }

    if (transferSuccess) {
      return NextResponse.json({
        message: 'Payout released successfully via Paystack',
        payment,
      });
    } else {
      return NextResponse.json({
        message: 'Payout marked as released manually. Please send the money via Paystack dashboard.',
        note: errorMessage ? `Paystack error: ${errorMessage}` : null,
        payment,
      });
    }

  } catch (error) {
    console.error('[PAYMENT RELEASE] Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}