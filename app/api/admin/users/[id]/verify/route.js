import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import connectDB from '@/lib/mongodb';
import User from '@/models/User';
import { authOptions } from '../../../../auth/[...nextauth]/route';
import { sendNotificationToUser } from '@/lib/sendNotification';

export async function PUT(request, { params }) {
  try {
    const { id } = await params;
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Admins only' }, { status: 403 });
    }

    const { action, reason } = await request.json();

    if (!['verify', 'reject'].includes(action)) {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

    await connectDB();

    const user = await User.findById(id);
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    if (user.role !== 'provider') {
      return NextResponse.json({ error: 'Only service providers can be verified' }, { status: 400 });
    }
    if (!user.verificationDoc) {
      return NextResponse.json({ error: 'This provider has not submitted a document yet' }, { status: 400 });
    }

    if (action === 'verify') {
      user.verificationStatus = 'verified';
      user.verifiedBy = session.user.id;
      user.verificationReviewedAt = new Date();
      user.verificationRejectionReason = undefined;
    } else {
      user.verificationStatus = 'rejected';
      user.verificationReviewedAt = new Date();
      user.verificationRejectionReason = reason || 'Document could not be verified.';
    }

    await user.save();

    // ── Notify the provider about the verification outcome ──────────────
    try {
      if (action === 'verify') {
        await sendNotificationToUser(user._id.toString(), {
          title: '✅ You\'re Verified!',
          body: 'Your account has been verified. Clients will now see your verification badge.',
          url: '/dashboard',
        });
      } else {
        await sendNotificationToUser(user._id.toString(), {
          title: 'Verification Update',
          body: user.verificationRejectionReason || 'Your verification document needs attention. Please re-submit.',
          url: '/verification',
        });
      }
    } catch (notifError) {
      console.error('Notification error:', notifError);
      // Don't fail the request if notification fails
    }

    const safeUser = user.toObject();
    delete safeUser.password;

    return NextResponse.json({
      message: action === 'verify' ? 'Provider verified successfully' : 'Provider verification rejected',
      user: safeUser,
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed to update verification status' }, { status: 500 });
  }
}