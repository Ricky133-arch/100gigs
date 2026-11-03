/**
 * app/api/applications/route.js
 *
 * GET  — the logged-in provider's own applications
 * POST — apply to an open job (once per job, never your own)
 */
import mongoose from 'mongoose';
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import connectDB from '@/lib/mongodb';
import Application from '@/models/Application';
import Job from '@/models/Job';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { sendNotificationToUser } from '@/lib/sendNotification';

export const dynamic = 'force-dynamic';

const MIN_COVER = 10;
const MAX_COVER = 3000;
const MAX_RATE = 5_000_000; // ₦, same ceiling as payments

const isObjectId = (v) => typeof v === 'string' && mongoose.Types.ObjectId.isValid(v) && /^[a-f\d]{24}$/i.test(v);

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Please log in.' }, { status: 401 });
    }

    await connectDB();

    const applications = await Application.find({ applicant: session.user.id })
      .populate('job', 'title budgetMin budgetMax location status category')
      .sort({ createdAt: -1 })
      .lean();

    return NextResponse.json(applications);
  } catch (error) {
    console.error('[APPLICATIONS GET]', error);
    return NextResponse.json({ error: 'Couldn’t load your applications.' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const session = await getServerSession(authOptions);
    const me = session?.user?.id;
    if (!me) {
      return NextResponse.json({ error: 'Please log in to apply.' }, { status: 401 });
    }
    if (session.user.role !== 'provider') {
      return NextResponse.json({ error: 'Only service providers can apply.' }, { status: 403 });
    }

    const body = await request.json().catch(() => ({}));
    const jobId = body.jobId;
    const coverLetter = typeof body.coverLetter === 'string' ? body.coverLetter.trim() : '';

    if (!isObjectId(jobId)) {
      return NextResponse.json({ error: 'Job not found.' }, { status: 404 });
    }
    if (coverLetter.length < MIN_COVER) {
      return NextResponse.json(
        { error: `Tell the client a bit more — at least ${MIN_COVER} characters.` },
        { status: 400 }
      );
    }
    if (coverLetter.length > MAX_COVER) {
      return NextResponse.json(
        { error: `Keep your message under ${MAX_COVER.toLocaleString()} characters.` },
        { status: 400 }
      );
    }

    // Optional rate: empty means "not given"; otherwise a sensible whole number
    let proposedRate = null;
    if (body.proposedRate !== undefined && body.proposedRate !== null && body.proposedRate !== '') {
      const n = Number(body.proposedRate);
      if (!Number.isFinite(n) || n < 0 || n > MAX_RATE) {
        return NextResponse.json({ error: 'Enter a valid rate in naira.' }, { status: 400 });
      }
      proposedRate = Math.round(n);
    }

    await connectDB();

    const job = await Job.findById(jobId).select('title status deadline postedBy').lean();
    if (!job) {
      return NextResponse.json({ error: 'Job not found.' }, { status: 404 });
    }

    if (String(job.postedBy) === String(me)) {
      return NextResponse.json({ error: 'You can’t apply to your own job.' }, { status: 400 });
    }

    if (job.status !== 'open') {
      return NextResponse.json({ error: 'This job is no longer taking applications.' }, { status: 400 });
    }

    // Deadline passed: refuse, but don't change the job's status here.
    // ("closed" isn't a valid Job status, and the owner may still hire from existing applicants.)
    if (job.deadline && new Date(job.deadline) < new Date()) {
      return NextResponse.json({ error: 'The deadline for this job has passed.' }, { status: 400 });
    }

    let application;
    try {
      application = await Application.create({
        job: jobId,
        applicant: me,
        coverLetter,
        proposedRate,
      });
    } catch (err) {
      // The unique {job, applicant} index catches double-taps and repeat attempts
      if (err?.code === 11000) {
        return NextResponse.json({ error: 'You’ve already applied to this job.' }, { status: 409 });
      }
      throw err;
    }

    await Job.findByIdAndUpdate(jobId, { $addToSet: { applicants: me } });

    // Notify the client in the background — never blocks or fails the application
    const who = session.user.name ? session.user.name.split(' ')[0] : 'A provider';
    sendNotificationToUser(String(job.postedBy), {
      title: 'New application',
      body: `${who} applied to "${job.title}"${proposedRate ? ` — ₦${proposedRate.toLocaleString('en-NG')}` : ''}.`,
      url: `/jobs/${jobId}`,
      type: 'application',
    }).catch((e) => console.error('[APPLICATIONS] Notification failed:', e?.message));

    return NextResponse.json(
      { message: 'Application sent.', application },
      { status: 201 }
    );
  } catch (error) {
    console.error('[APPLICATIONS POST]', error);
    return NextResponse.json({ error: 'Couldn’t send your application. Please try again.' }, { status: 500 });
  }
}