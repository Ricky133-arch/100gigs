/**
 * app/api/chat/[conversationId]/route.js
 *
 * Returns the messages in one conversation — but only to the two people in it.
 * Every message is filtered by "I sent it or I received it", so knowing (or
 * guessing) a conversation ID is not enough to read someone else's chat.
 */
import mongoose from 'mongoose';
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import connectDB from '@/lib/mongodb';
import Message from '@/models/Message';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';

export const dynamic = 'force-dynamic';

const MAX_MESSAGES = 500; // newest 500; plenty for a job conversation

export async function GET(request, { params }) {
  try {
    const session = await getServerSession(authOptions);
    const me = session?.user?.id;
    if (!me) {
      return NextResponse.json({ error: 'Please log in.' }, { status: 401 });
    }

    const { conversationId } = await params;
    if (typeof conversationId !== 'string' || !/^[\w-]{1,120}$/.test(conversationId)) {
      return NextResponse.json({ error: 'Conversation not found.' }, { status: 404 });
    }
    if (!mongoose.Types.ObjectId.isValid(me)) {
      return NextResponse.json({ error: 'Please log in again.' }, { status: 401 });
    }

    await connectDB();

    // Only messages this user is part of
    const mine = {
      conversationId,
      $or: [{ sender: me }, { receiver: me }],
    };

    const newestFirst = await Message.find(mine)
      .populate('sender', 'name avatar')
      .sort({ createdAt: -1 })
      .limit(MAX_MESSAGES)
      .lean();

    if (newestFirst.length === 0) {
      // Either a brand-new chat, or a conversation this user isn't in.
      // Tell the two apart without revealing anything about someone else's chat.
      const existsForOthers = await Message.exists({ conversationId });
      if (existsForOthers) {
        return NextResponse.json({ error: 'Conversation not found.' }, { status: 404 });
      }
      return NextResponse.json([]);
    }

    // Mark what was sent to me as seen
    await Message.updateMany(
      { conversationId, receiver: me, seen: false },
      { $set: { seen: true } }
    );

    return NextResponse.json(newestFirst.reverse()); // oldest → newest, as before
  } catch (error) {
    console.error('[CHAT GET]', error);
    return NextResponse.json({ error: 'Couldn’t load messages.' }, { status: 500 });
  }
}