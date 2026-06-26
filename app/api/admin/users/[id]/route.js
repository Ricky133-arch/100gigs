import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import connectDB from '@/lib/mongodb';
import User from '@/models/User';
import { authOptions } from '../../../auth/[...nextauth]/route';
import { sendNotificationToUser } from '@/lib/sendNotification';

export async function PATCH(request, { params }) {
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

    if (!['suspend', 'unsuspend', 'delete'].includes(action)) {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

    await connectDB();

    const user = await User.findById(id);
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Prevent an admin from suspending/deleting another admin
    if (user.role === 'admin') {
      return NextResponse.json({ error: 'Admin accounts cannot be modified here' }, { status: 403 });
    }

    if (action === 'delete') {
      await User.findByIdAndDelete(id);
      return NextResponse.json({ message: `${user.name} has been permanently deleted` });
    }

    if (action === 'suspend') {
      user.isSuspended = true;
      user.suspendedReason = reason?.trim() || 'No reason provided';
      user.suspendedAt = new Date();
    } else {
      // unsuspend
      user.isSuspended = false;
      user.suspendedReason = undefined;
      user.suspendedAt = undefined;
    }

    await user.save();

    // ── Notify the user about their account status change ───────────────
    try {
      if (action === 'suspend') {
        await sendNotificationToUser(user._id.toString(), {
          title: 'Account Suspended',
          body: user.suspendedReason || 'Your account has been suspended. Contact support for more information.',
          url: '/',
          type: 'account_suspended',
        });
      } else {
        await sendNotificationToUser(user._id.toString(), {
          title: 'Account Reinstated',
          body: 'Your account has been reinstated. You can now log in and use the platform again.',
          url: '/dashboard',
          type: 'account_reinstated',
        });
      }
    } catch (notifError) {
      console.error('Notification error:', notifError);
      // Don't fail the request if notification fails
    }

    const safeUser = user.toObject();
    delete safeUser.password;

    return NextResponse.json({
      message: action === 'suspend'
        ? `${user.name} has been suspended`
        : `${user.name} has been unsuspended`,
      user: safeUser,
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed to update user' }, { status: 500 });
  }
}