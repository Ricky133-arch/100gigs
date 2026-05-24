import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import connectDB from '@/lib/mongodb';
import Application from '@/models/Application';
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
      .populate('applicant', 'name phone location skills avatar')
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

    if (!session || session.user.role !== 'client') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { applicationId, status } = await request.json();

    if (!['accepted', 'rejected'].includes(status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
    }

    await connectDB();

    const application = await Application.findByIdAndUpdate(
      applicationId,
      { status },
      { new: true }
    ).populate('job', 'title');

    if (!application) {
      return NextResponse.json({ error: 'Application not found' }, { status: 404 });
    }

    // ✅ Notify the provider about their application status
    try {
      if (status === 'accepted') {
        await sendNotificationToUser(application.applicant.toString(), {
          title: '🎉 Application Accepted!',
          body: `Your application for "${application.job?.title}" was accepted! Chat with the client now.`,
          url: '/dashboard',
        });
      } else if (status === 'rejected') {
        await sendNotificationToUser(application.applicant.toString(), {
          title: 'Application Update',
          body: `Your application for "${application.job?.title}" was not accepted. Keep applying!`,
          url: '/browse',
        });
      }
    } catch (notifError) {
      console.error('Notification error:', notifError);
      // Don't fail the request if notification fails
    }

    return NextResponse.json(application);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed to update application' }, { status: 500 });
  }
}