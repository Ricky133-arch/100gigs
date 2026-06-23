import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import connectDB from '@/lib/mongodb';
import Notification from '@/models/Notification';
import { authOptions } from '../auth/[...nextauth]/route';

// GET /api/notifications
// Returns unread count + recent notifications list
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    const [notifications, unreadCount] = await Promise.all([
      Notification.find({ recipient: session.user.id })
        .sort({ createdAt: -1 })
        .limit(30)
        .lean(),
      Notification.countDocuments({
        recipient: session.user.id,
        isRead:    false,
      }),
    ]);

    return NextResponse.json({ notifications, unreadCount });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed to fetch notifications' }, { status: 500 });
  }
}

// PATCH /api/notifications
// Mark all as read
export async function PATCH() {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    await Notification.updateMany(
      { recipient: session.user.id, isRead: false },
      { $set: { isRead: true } }
    );

    return NextResponse.json({ message: 'All notifications marked as read' });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed to mark notifications as read' }, { status: 500 });
  }
}