import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import connectDB from '@/lib/mongodb';
import Message from '@/models/Message';
import { authOptions } from '../auth/[...nextauth]/route';

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

    return NextResponse.json(Object.values(conversations));
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

    const { receiverId, content, conversationId } = await request.json();

    if (!receiverId || !content) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    await connectDB();

    const message = await Message.create({
      conversationId,
      sender: session.user.id,
      receiver: receiverId,
      content,
    });

    const populated = await Message.findById(message._id)
      .populate('sender', 'name avatar');

    return NextResponse.json(populated, { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed to send message' }, { status: 500 });
  }
}