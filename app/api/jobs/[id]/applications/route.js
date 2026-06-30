import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import connectDB from '@/lib/mongodb';
import Application from '@/models/Application';
import Job from '@/models/Job';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { sendNotificationToUser } from '@/lib/sendNotification';

export async function GET(request, { params }) {
  try {
    const { id } = await params;
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    await connectDB();
    const applications = await Application.find({ job: id })
      .populate('applicant', 'name phone location skills avatar verificationStatus')
      .sort({ createdAt: -1 });
    return NextResponse.json(applications);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed to fetch applications' }, { status: 500 });
  }
}

export async function PATCH(request, { params }) {
  try {
    const { id } = await params;
    const session = await getServerSession(authOptions);

    if (!session || (session.user.role !== 'client' && session.user.role !== 'admin')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { applicationId, status } = await request.json();

    if (!['accepted', 'rejected', 'completed'].includes(status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
    }

    await connectDB();

    // Build update object
    const updateData = { status };
    if (status === 'completed') {
      updateData.completedAt = new Date();
    }

    const application = await Application.findByIdAndUpdate(
      applicationId,
      updateData,
      { new: true }
    ).populate('job', 'title');

    if (!application) {
      return NextResponse.json({ error: 'Application not found' }, { status: 404 });
    }

    // ── When marked complete, also update the job status ──────────────────
    if (status === 'completed') {
      await Job.findByIdAndUpdate(id, { status: 'completed' });

      // Notify provider that client marked job as done
      sendNotificationToUser(application.applicant.toString(), {
        title: '✅ Job marked as completed!',
        body:  `The client has confirmed "${application.job?.title}" is done. Payment may follow through 100Gigs.`,
        url:   '/dashboard',
        type:  'system',
      }).catch(console.error);
    }

    // ── Notify on accept / reject ─────────────────────────────────────────
    if (status === 'accepted') {
      sendNotificationToUser(application.applicant.toString(), {
        title: '🎉 Application Accepted!',
        body:  `Your application for "${application.job?.title}" was accepted! Chat with the client now.`,
        url:   '/dashboard',
        type:  'application_accepted',
      }).catch(console.error);
    }

    if (status === 'rejected') {
      sendNotificationToUser(application.applicant.toString(), {
        title: 'Application Update',
        body:  `Your application for "${application.job?.title}" was not accepted. Keep applying!`,
        url:   '/browse',
        type:  'application_rejected',
      }).catch(console.error);
    }

    return NextResponse.json(application);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed to update application' }, { status: 500 });
  }
}