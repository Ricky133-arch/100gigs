import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import connectDB from '@/lib/mongodb';
import Message from '@/models/Message';
import { authOptions } from '../../auth/[...nextauth]/route';

export async function GET(request, { params }) {
  try {
    const { conversationId } = await params;
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    const messages = await Message.find({ conversationId })
      .populate('sender', 'name avatar')
      .sort({ createdAt: 1 });

    // Mark messages as seen
    await Message.updateMany(
      { conversationId, receiver: session.user.id, seen: false },
      { seen: true }
    );

    return NextResponse.json(messages);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed to fetch messages' }, { status: 500 });
  }
}