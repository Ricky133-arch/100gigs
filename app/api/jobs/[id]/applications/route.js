/**
 * app/api/jobs/[id]/applications/route.js
 *
 * GET   — the job's applications. Job owner (and admins) only.
 *         The job page shows the "Your job" panel only when this succeeds,
 *         so anyone else must get a 403 here.
 * PATCH — hire, decline, or mark done. Job owner (and admins) only, and
 *         only on applications that belong to THIS job.
 *
 * Allowed moves:
 *   pending  → accepted   (job must be open; job becomes in-progress)
 *   pending  → rejected
 *   accepted → completed  (job becomes completed; client can then pay)
 */
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import connectDB from '@/lib/mongodb';
import Application from '@/models/Application';
import Job from '@/models/Job';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { sendNotificationToUser } from '@/lib/sendNotification';

export const dynamic = 'force-dynamic';

const isObjectId = (v) => typeof v === 'string' && /^[a-f\d]{24}$/i.test(v);
const APPLICANT_FIELDS = 'name phone location skills avatar verificationStatus';
const FROM = { accepted: 'pending', rejected: 'pending', completed: 'accepted' };

/** Loads the job and checks the logged-in user may manage it. */
async function loadOwnedJob(id) {
  const session = await getServerSession(authOptions);
  const me = session?.user?.id;
  if (!me) return { error: NextResponse.json({ error: 'Please log in.' }, { status: 401 }) };
  if (!isObjectId(id)) return { error: NextResponse.json({ error: 'Job not found.' }, { status: 404 }) };

  await connectDB();
  const job = await Job.findById(id).select('title status postedBy').lean();
  if (!job) return { error: NextResponse.json({ error: 'Job not found.' }, { status: 404 }) };

  const isAdmin = session.user.role === 'admin';
  if (String(job.postedBy) !== String(me) && !isAdmin) {
    return { error: NextResponse.json({ error: 'Only the person who posted this job can do that.' }, { status: 403 }) };
  }
  return { job, session };
}

export async function GET(request, { params }) {
  try {
    const { id } = await params;
    const { job, error } = await loadOwnedJob(id);
    if (error) return error;

    const applications = await Application.find({ job: job._id })
      .populate('applicant', APPLICANT_FIELDS)
      .sort({ createdAt: -1 })
      .lean();

    // Phone numbers only for people actually hired — everyone else, use chat
    for (const app of applications) {
      if (app.applicant && !['accepted', 'completed'].includes(app.status)) {
        delete app.applicant.phone;
      }
    }

    return NextResponse.json(applications);
  } catch (error) {
    console.error('[JOB APPLICATIONS GET]', error);
    return NextResponse.json({ error: 'Couldn’t load applications.' }, { status: 500 });
  }
}

export async function PATCH(request, { params }) {
  try {
    const { id } = await params;
    const { job, error } = await loadOwnedJob(id);
    if (error) return error;

    const body = await request.json().catch(() => ({}));
    const { applicationId, status } = body;

    if (!FROM[status]) {
      return NextResponse.json({ error: 'Invalid status.' }, { status: 400 });
    }
    if (!isObjectId(applicationId)) {
      return NextResponse.json({ error: 'Application not found.' }, { status: 404 });
    }

    const current = await Application.findOne({ _id: applicationId, job: job._id }).select('status applicant').lean();
    if (!current) {
      return NextResponse.json({ error: 'That application isn’t on this job.' }, { status: 404 });
    }
    if (current.status !== FROM[status]) {
      const msg = {
        accepted: 'You can only hire someone whose application is still pending.',
        rejected: 'You can only decline a pending application.',
        completed: 'Hire this provider before marking the job as done.',
      }[status];
      return NextResponse.json({ error: msg }, { status: 409 });
    }

    // ── Move the job first, atomically, so two quick taps can't hire twice ──
    if (status === 'accepted') {
      const moved = await Job.findOneAndUpdate(
        { _id: job._id, status: 'open' },
        { $set: { status: 'in-progress' } }
      );
      if (!moved) {
        return NextResponse.json({ error: 'This job isn’t open for hiring any more.' }, { status: 409 });
      }
    }
    if (status === 'completed' && job.status === 'cancelled') {
      return NextResponse.json({ error: 'This job was cancelled.' }, { status: 409 });
    }

    const update = { status };
    if (status === 'completed') update.completedAt = new Date();

    // Only succeeds if the application is still in the expected state
    const application = await Application.findOneAndUpdate(
      { _id: applicationId, job: job._id, status: FROM[status] },
      { $set: update },
      { new: true }
    )
      .populate('applicant', APPLICANT_FIELDS)
      .lean();

    if (!application) {
      // Someone else changed it in the meantime — undo the job move
      if (status === 'accepted') {
        await Job.updateOne({ _id: job._id, status: 'in-progress' }, { $set: { status: 'open' } });
      }
      return NextResponse.json({ error: 'This application was just updated. Refresh and try again.' }, { status: 409 });
    }

    if (status === 'completed' && job.status !== 'completed') {
      await Job.updateOne({ _id: job._id }, { $set: { status: 'completed' } });
    }

    // ── Tell the provider (background; never blocks the response) ─────────
    const providerId = String(current.applicant);
    const title = job.title || 'a job';
    const note = {
      accepted: {
        title: 'You’re hired',
        body: `You got "${title}". Message the client to agree on timing.`,
        url: `/jobs/${id}`,
        type: 'application_accepted',
      },
      rejected: {
        title: 'Application update',
        body: `The client went with someone else for "${title}". New jobs are posted every day.`,
        url: '/browse',
        type: 'application_rejected',
      },
      completed: {
        title: 'Job marked as done',
        body: `The client confirmed "${title}" is finished. You’ll be notified when they pay.`,
        url: '/dashboard',
        type: 'system',
      },
    }[status];
    sendNotificationToUser(providerId, note).catch((e) =>
      console.error('[JOB APPLICATIONS] Notification failed:', e?.message)
    );

    return NextResponse.json(application);
  } catch (error) {
    console.error('[JOB APPLICATIONS PATCH]', error);
    return NextResponse.json({ error: 'Couldn’t update the application. Please try again.' }, { status: 500 });
  }
}