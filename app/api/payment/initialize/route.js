/**
 * app/api/payment/initialize/route.js
 *
 * Starts a Paystack payment for a finished job. The browser only says WHICH
 * hire it wants to pay and HOW MUCH; everything else (who pays, who gets paid,
 * the fee) is decided here from our own database.
 */
import crypto from 'crypto';
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import connectDB from '@/lib/mongodb';
import Job from '@/models/Job';
import Application from '@/models/Application';
import Payment from '@/models/Payment';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { COMMISSION_RATE } from '@/lib/payments';

const MIN_AMOUNT = 100;          // ₦
const MAX_AMOUNT = 5_000_000;    // ₦ — hard ceiling for a single job; raise if you need to
const BUDGET_MULTIPLE_CAP = 3;   // can't pay more than 3× the job's maximum budget

const idOf = (v) => (v == null ? null : String(v._id ?? v));
const isObjectId = (v) => typeof v === 'string' && /^[a-f\d]{24}$/i.test(v);

export async function POST(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Please log in to pay.' }, { status: 401 });
    }
    if (!session.user.email) {
      return NextResponse.json({ error: 'Your account needs an email address to pay.' }, { status: 400 });
    }

    const body = await request.json().catch(() => ({}));
    const { jobId, applicationId } = body;
    const amount = Number(body.amount);
    // providerId from the browser is ignored on purpose

    if (!isObjectId(jobId) || !isObjectId(applicationId)) {
      return NextResponse.json({ error: 'Missing or invalid job.' }, { status: 400 });
    }
    if (!Number.isFinite(amount) || amount < MIN_AMOUNT || amount > MAX_AMOUNT) {
      return NextResponse.json(
        { error: `Enter an amount between ₦${MIN_AMOUNT.toLocaleString()} and ₦${MAX_AMOUNT.toLocaleString()}.` },
        { status: 400 }
      );
    }
    if (Math.round(amount) !== amount) {
      return NextResponse.json({ error: 'Enter a whole naira amount.' }, { status: 400 });
    }

    await connectDB();

    const job = await Job.findById(jobId);
    if (!job) return NextResponse.json({ error: 'Job not found.' }, { status: 404 });

    // Only the person who posted the job can pay for it.
    // Adjust the field name if your Job model stores the owner differently.
    const ownerId = idOf(job.client ?? job.postedBy ?? job.clientId ?? job.user);
    if (!ownerId) {
      console.error('[PAYMENT INIT] Job has no owner field — check the field name in this route', jobId);
      return NextResponse.json({ error: 'Payments are unavailable for this job right now.' }, { status: 500 });
    }
    if (ownerId !== String(session.user.id)) {
      return NextResponse.json({ error: 'Only the person who posted this job can pay for it.' }, { status: 403 });
    }

    // The hire being paid must belong to this job and be hired or finished
    const application = await Application.findById(applicationId);
    if (!application || idOf(application.job) !== jobId) {
      return NextResponse.json({ error: 'That provider isn’t hired on this job.' }, { status: 400 });
    }
    if (!['accepted', 'completed'].includes(application.status)) {
      return NextResponse.json({ error: 'You can only pay a provider you’ve hired.' }, { status: 400 });
    }

    // Already paid?
    const alreadyPaid = application.paidAt || await Payment.exists({
      $or: [{ applicationId: application._id }, { jobId, providerId: application.applicant }],
    });
    if (alreadyPaid) {
      return NextResponse.json({ error: 'This job has already been paid for.' }, { status: 409 });
    }

    // Keep amounts in a sensible range for the job
    const budgetMax = Number(job.budgetMax) || 0;
    if (budgetMax > 0 && amount > budgetMax * BUDGET_MULTIPLE_CAP) {
      return NextResponse.json(
        { error: `That’s much more than this job’s budget. If it’s right, contact us before paying.` },
        { status: 400 }
      );
    }

    const providerId = idOf(application.applicant);
    const commission = Math.round(amount * COMMISSION_RATE);
    const providerShare = amount - commission;
    const reference = `100gigs_${jobId.slice(-8)}_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;

    const appUrl = (process.env.NEXT_PUBLIC_APP_URL || '').replace(/\/$/, '');
    const callbackUrl = `${appUrl}/payment/verify?reference=${encodeURIComponent(reference)}&jobId=${jobId}`;

    const paystackRes = await fetch('https://api.paystack.co/transaction/initialize', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: session.user.email,
        amount: amount * 100, // kobo
        reference,
        currency: 'NGN',
        callback_url: callbackUrl,
        metadata: {
          jobId,
          applicationId: String(application._id),
          providerId,
          clientId: ownerId,
          jobTitle: job.title,
          custom_fields: [
            { display_name: 'Job', variable_name: 'job_title', value: job.title },
            { display_name: '100Gigs fee', variable_name: 'commission', value: `₦${commission.toLocaleString('en-NG')}` },
            { display_name: 'Provider receives', variable_name: 'provider_share', value: `₦${providerShare.toLocaleString('en-NG')}` },
          ],
        },
      }),
    });

    const paystackData = await paystackRes.json().catch(() => null);
    if (!paystackRes.ok || !paystackData?.status) {
      console.error('[PAYMENT INIT] Paystack error:', paystackData);
      return NextResponse.json({ error: 'Couldn’t start the payment. Please try again.' }, { status: 502 });
    }

    return NextResponse.json({
      authorizationUrl: paystackData.data.authorization_url,
      reference: paystackData.data.reference,
      commission,
      providerShare,
    });
  } catch (error) {
    console.error('[PAYMENT INIT]', error);
    return NextResponse.json({ error: 'Couldn’t start the payment. Please try again.' }, { status: 500 });
  }
}