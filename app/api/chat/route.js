import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import connectDB from '@/lib/mongodb';
import Message from '@/models/Message';
import { authOptions } from '../auth/[...nextauth]/route';
import { sendNotificationToUser } from '@/lib/sendNotification';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    const messages = await Message.find({
      $or: [
        { sender: session.user.id },
        { receiver: session.user.id },
      ],
    })
      .populate('sender', 'name avatar')
      .populate('receiver', 'name avatar')
      .sort({ createdAt: -1 });

    // Get last message per conversation
    const conversations = {};
    messages.forEach(msg => {
      if (!conversations[msg.conversationId]) {
        conversations[msg.conversationId] = msg;
      }
    });

    // Count total unread messages for this user
    const totalUnread = await Message.countDocuments({
      receiver: session.user.id,
      seen: false,
    });

    // Count unread per conversation
    const unreadPerConv = await Message.aggregate([
      {
        $match: {
          receiver: session.user.id,
          seen: false,
        },
      },
      {
        $group: {
          _id: '$conversationId',
          count: { $sum: 1 },
        },
      },
    ]);

    const unreadMap = {};
    unreadPerConv.forEach(item => {
      unreadMap[item._id] = item.count;
    });

    const convList = Object.values(conversations).map(conv => ({
      ...conv.toObject(),
      unreadCount: unreadMap[conv.conversationId] || 0,
    }));

    return NextResponse.json({ conversations: convList, totalUnread });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed to fetch conversations' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { receiverId, content, conversationId, replyTo } = await request.json();

    if (!receiverId || !content) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    await connectDB();

    const message = await Message.create({
      conversationId,
      sender: session.user.id,
      receiver: receiverId,
      content,
      replyTo: replyTo || null,
    });

    const populated = await Message.findById(message._id)
      .populate('sender', 'name avatar');

    // ── Send push notification to receiver ────────────────────────────────
    try {
      const unreadCount = await Message.countDocuments({
        receiver: receiverId,
        seen: false,
      });

      await sendNotificationToUser(receiverId, {
        title: `💬 ${session.user.name}`,
        body: content.length > 80 ? content.substring(0, 80) + '...' : content,
        url: `/chat?to=${session.user.id}&name=${encodeURIComponent(session.user.name)}`,
        unreadCount,
      });
    } catch (pushError) {
      console.error('Push notification failed:', pushError.message);
    }

    return NextResponse.json(populated, { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed to send message' }, { status: 500 });
  }
}