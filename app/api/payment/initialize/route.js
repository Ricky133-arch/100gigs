import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import connectDB from '@/lib/mongodb';
import Job from '@/models/Job';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';

const COMMISSION_RATE = 0.10; // 10%

export async function POST(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { jobId, applicationId, amount, providerId } = await request.json();

    if (!jobId || !amount || !providerId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    await connectDB();

    const job = await Job.findById(jobId);
    if (!job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }

    // Calculate commission
    const amountKobo    = Math.round(amount * 100); // Paystack uses kobo
    const commission    = Math.round(amount * COMMISSION_RATE);
    const providerShare = amount - commission;

    // Generate unique reference
    const reference = `100gigs_${jobId}_${Date.now()}`;

    // Initialize Paystack transaction
    const paystackRes = await fetch('https://api.paystack.co/transaction/initialize', {
      method:  'POST',
      headers: {
        Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email:     session.user.email,
        amount:    amountKobo,
        reference,
        currency:  'NGN',
        callback_url: `${process.env.NEXT_PUBLIC_APP_URL}/payment/verify?reference=${reference}&jobId=${jobId}&providerId=${providerId}&providerShare=${providerShare}`,
        metadata: {
          jobId,
          applicationId,
          providerId,
          clientId:      session.user.id,
          commission,
          providerShare,
          jobTitle:      job.title,
          custom_fields: [
            { display_name: 'Job', variable_name: 'job_title', value: job.title },
            { display_name: 'Commission', variable_name: 'commission', value: `₦${commission.toLocaleString()}` },
            { display_name: 'Provider Share', variable_name: 'provider_share', value: `₦${providerShare.toLocaleString()}` },
          ],
        },
      }),
    });

    const paystackData = await paystackRes.json();

    if (!paystackData.status) {
      console.error('Paystack error:', paystackData);
      return NextResponse.json({ error: 'Failed to initialize payment' }, { status: 500 });
    }

    return NextResponse.json({
      authorizationUrl: paystackData.data.authorization_url,
      reference:        paystackData.data.reference,
      commission,
      providerShare,
    });
  } catch (error) {
    console.error('[PAYMENT INIT]', error);
    return NextResponse.json({ error: 'Failed to initialize payment' }, { status: 500 });
  }
}