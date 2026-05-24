import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import connectDB from '@/lib/mongodb';
import Application from '@/models/Application';
import Job from '@/models/Job';
import { authOptions } from '../auth/[...nextauth]/route';
import { sendNotificationToUser } from '@/lib/sendNotification';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    const applications = await Application.find({
      applicant: session.user.id,
    })
      .populate('job', 'title budgetMin budgetMax location status category')
      .sort({ createdAt: -1 });

    return NextResponse.json(applications);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (session.user.role !== 'provider') {
      return NextResponse.json({ error: 'Only service providers can apply' }, { status: 403 });
    }

    const { jobId, coverLetter, proposedRate } = await request.json();

    if (!jobId || !coverLetter) {
      return NextResponse.json({ error: 'Job ID and cover letter are required' }, { status: 400 });
    }

    await connectDB();

    const job = await Job.findById(jobId);
    if (!job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }

    const existingApplication = await Application.findOne({
      job: jobId,
      applicant: session.user.id,
    });

    if (existingApplication) {
      return NextResponse.json({ error: 'You have already applied to this job' }, { status: 400 });
    }

    const application = await Application.create({
      job: jobId,
      applicant: session.user.id,
      coverLetter,
      proposedRate: proposedRate || null,
    });

    await Job.findByIdAndUpdate(jobId, {
      $addToSet: { applicants: session.user.id }
    });

    // ✅ Notify the client that someone applied to their job
    try {
      await sendNotificationToUser(job.postedBy.toString(), {
        title: '🔔 New Application!',
        body: `Someone applied to your job: "${job.title}"`,
        url: `/jobs/${jobId}`,
      });
    } catch (notifError) {
      console.error('Notification error:', notifError);
      // Don't fail the request if notification fails
    }

    return NextResponse.json({
      message: 'Application submitted successfully!',
      application,
    }, { status: 201 });

  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed to submit application' }, { status: 500 });
  }
}