/**
 * lib/payments.js
 *
 * One place that turns a Paystack transaction into a 100Gigs payment.
 * Used by BOTH the verify route (client returns from Paystack) and the
 * webhook (Paystack tells us directly), so a payment is recorded even if
 * the client closes their browser right after paying.
 *
 * Rule: amounts come from Paystack, people come from our database.
 * Nothing from the browser decides who gets paid or how much.
 */
import connectDB from '@/lib/mongodb';
import Job from '@/models/Job';
import Payment from '@/models/Payment';
import Application from '@/models/Application';
import User from '@/models/User';
import { sendNotificationToUser } from '@/lib/sendNotification';

export const COMMISSION_RATE = 0.10;

export class PaymentError extends Error {
  constructor(message, status = 400) {
    super(message);
    this.status = status;
  }
}

const idOf = (v) => (v == null ? null : String(v._id ?? v));
const naira = (n) => `₦${Number(n || 0).toLocaleString('en-NG')}`;
const parseMeta = (m) => {
  if (!m) return {};
  if (typeof m === 'object') return m;
  try { return JSON.parse(m); } catch { return {}; }
};

/** Ask Paystack about a transaction. Never trust anything else about a payment. */
export async function fetchPaystackTransaction(reference) {
  try {
    const res = await fetch(
      `https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`,
      { headers: { Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}` }, cache: 'no-store' }
    );
    const data = await res.json().catch(() => null);
    if (!res.ok || !data?.status || !data.data) {
      return { ok: false, error: data?.message || 'Could not confirm with Paystack' };
    }
    return { ok: true, tx: data.data };
  } catch {
    return { ok: false, error: 'Could not reach Paystack' };
  }
}

/**
 * Record a successful Paystack transaction. Safe to call more than once
 * for the same reference — the second call just returns the first record.
 */
export async function recordPaystackPayment(tx) {
  if (!tx || tx.status !== 'success') throw new PaymentError('This payment was not successful.');
  if (tx.currency && tx.currency !== 'NGN') throw new PaymentError('Unexpected currency.', 422);

  const reference = tx.reference;
  await connectDB();

  // Already recorded? (verify page + webhook can both arrive)
  const existing = await Payment.findOne({ reference });
  if (existing) return { payment: existing, alreadyProcessed: true };

  // metadata was set by OUR initialize route, using our secret key
  const meta = parseMeta(tx.metadata);
  const jobId = idOf(meta.jobId);
  if (!jobId) throw new PaymentError('This payment isn’t linked to a job.', 422);

  const job = await Job.findById(jobId);
  if (!job) throw new PaymentError('The job for this payment no longer exists.', 404);

  // Work out who is being paid from our own records
  let application = meta.applicationId ? await Application.findById(meta.applicationId) : null;
  if (!application) {
    application = await Application.findOne({ job: jobId, status: { $in: ['completed', 'accepted'] } })
      .sort({ updatedAt: -1 });
  }
  if (!application || idOf(application.job) !== jobId) {
    throw new PaymentError('No hired provider was found for this job.', 422);
  }

  const providerId = idOf(application.applicant);
  if (meta.providerId && idOf(meta.providerId) !== providerId) {
    throw new PaymentError('The provider on this payment doesn’t match the job.', 422);
  }

  // Job owner — adjust the field name if your Job model uses a different one
  const ownerId = idOf(job.client ?? job.postedBy ?? job.clientId ?? job.user);
  if (ownerId && meta.clientId && idOf(meta.clientId) !== ownerId) {
    throw new PaymentError('This payment wasn’t made by the job’s owner.', 422);
  }

  // Money: always from Paystack's own figures
  const totalAmount = tx.amount / 100; // kobo → naira
  const commission = Math.round(totalAmount * COMMISSION_RATE);
  const providerShare = totalAmount - commission;
  const paidAt = tx.paid_at ? new Date(tx.paid_at) : new Date();

  let payment;
  try {
    payment = await Payment.create({
      reference,
      jobId,
      applicationId: application._id,
      clientId: ownerId || idOf(meta.clientId),
      providerId,
      totalAmount,
      commission,
      providerShare,
      paystackStatus: 'success',
      transferStatus: 'awaiting_settlement',
      paidAt,
    });
  } catch (err) {
    // Two requests raced; the other one saved it first
    if (err?.code === 11000) {
      return { payment: await Payment.findOne({ reference }), alreadyProcessed: true };
    }
    throw err;
  }

  // Close out the job and mark the hire as paid, so "Pay" disappears
  await Promise.all([
    job.status !== 'completed' ? Job.findByIdAndUpdate(jobId, { status: 'completed' }) : null,
    Application.findByIdAndUpdate(application._id, { status: 'completed', paidAt }),
  ]);

  // Notifications run in the background; a failure here never undoes the payment
  notifyPaymentParties({ payment, job, providerId, clientId: payment.clientId }).catch((e) =>
    console.error('[PAYMENT] Notifications failed:', e?.message)
  );

  return { payment, alreadyProcessed: false };
}

async function notifyPaymentParties({ payment, job, providerId, clientId }) {
  const jobTitle = job.title || 'your job';

  // Provider: honest about timing, since payouts are released manually
  await sendNotificationToUser(providerId, {
    title: 'You’ve been paid',
    body: `The client paid for "${jobTitle}". Your ${naira(payment.providerShare)} will be sent to your bank account once funds settle, usually within 1 business day.`,
    url: '/dashboard',
    type: 'payment_received',
  }).catch((e) => console.error('[PAYMENT] Provider notification failed:', e?.message));

  // Admins: a payout is waiting
  const [admins, client] = await Promise.all([
    User.find({ role: 'admin' }).select('_id').lean(),
    clientId ? User.findById(clientId).select('name').lean() : null,
  ]);
  await Promise.all(admins.map((a) =>
    sendNotificationToUser(String(a._id), {
      title: 'Payout waiting',
      body: `${client?.name || 'A client'} paid ${naira(payment.totalAmount)} for "${job.title || 'a job'}". Send ${naira(payment.providerShare)} to the provider once funds settle.`,
      url: '/admin/payments',
      type: 'system',
    }).catch((e) => console.error('[PAYMENT] Admin notification failed:', e?.message))
  ));
}

/** What the browser is allowed to see about a payment. */
export const publicPayment = (p) => p && ({
  totalAmount: p.totalAmount,
  commission: p.commission,
  providerShare: p.providerShare,
  jobId: idOf(p.jobId),
  paidAt: p.paidAt,
});