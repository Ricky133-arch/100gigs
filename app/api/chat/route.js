/**
 * app/api/chat/route.js
 *
 * GET  — the logged-in user's conversation list (last message + unread count each)
 * POST — send a message
 *
 * Who the message is from, and which conversation it belongs to, are decided
 * here from the login session — never taken from the browser.
 */
import mongoose from 'mongoose';
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import connectDB from '@/lib/mongodb';
import Message from '@/models/Message';
import User from '@/models/User';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { sendPushOnly } from '@/lib/sendNotification';

export const dynamic = 'force-dynamic';

const MAX_LENGTH = 2000;        // characters per message
const RATE_WINDOW_MS = 60_000;  // 1 minute
const RATE_MAX = 30;            // messages per minute per user
const MAX_CONVERSATIONS = 100;

const isObjectId = (v) => typeof v === 'string' && /^[a-f\d]{24}$/i.test(v);
// Same format the chat page uses: the two user IDs, sorted, joined by "_"
const conversationIdFor = (a, b) => [String(a), String(b)].sort().join('_');

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    const me = session?.user?.id;
    if (!me || !isObjectId(me)) {
      return NextResponse.json({ error: 'Please log in.' }, { status: 401 });
    }

    await connectDB();
    const meId = new mongoose.Types.ObjectId(me);

    // Let the database find the latest message per conversation,
    // instead of loading every message this user has ever sent.
    const [latest, unreadPerConv] = await Promise.all([
      Message.aggregate([
        { $match: { $or: [{ sender: meId }, { receiver: meId }] } },
        { $sort: { createdAt: -1 } },
        { $group: { _id: '$conversationId', doc: { $first: '$$ROOT' } } },
        { $replaceRoot: { newRoot: '$doc' } },
        { $sort: { createdAt: -1 } },
        { $limit: MAX_CONVERSATIONS },
      ]),
      // aggregate() doesn't convert strings to ObjectIds — the old version
      // matched a string here, so every unread count came back 0.
      Message.aggregate([
        { $match: { receiver: meId, seen: false } },
        { $group: { _id: '$conversationId', count: { $sum: 1 } } },
      ]),
    ]);

    await Message.populate(latest, [
      { path: 'sender', select: 'name avatar' },
      { path: 'receiver', select: 'name avatar' },
    ]);

    const unreadMap = Object.fromEntries(unreadPerConv.map((u) => [u._id, u.count]));
    const totalUnread = unreadPerConv.reduce((sum, u) => sum + u.count, 0);

    const conversations = latest.map((conv) => ({
      ...conv,
      unreadCount: unreadMap[conv.conversationId] || 0,
    }));

    return NextResponse.json({ conversations, totalUnread });
  } catch (error) {
    console.error('[CHAT LIST]', error);
    return NextResponse.json({ error: 'Couldn’t load your messages.' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const session = await getServerSession(authOptions);
    const me = session?.user?.id;
    if (!me || !isObjectId(me)) {
      return NextResponse.json({ error: 'Please log in.' }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const receiverId = body.receiverId;
    const content = typeof body.content === 'string' ? body.content.trim() : '';
    // body.conversationId is ignored on purpose — we work it out below

    if (!isObjectId(receiverId)) {
      return NextResponse.json({ error: 'Who are you messaging?' }, { status: 400 });
    }
    if (receiverId === String(me)) {
      return NextResponse.json({ error: 'You can’t message yourself.' }, { status: 400 });
    }
    if (!content) {
      return NextResponse.json({ error: 'Write a message first.' }, { status: 400 });
    }
    if (content.length > MAX_LENGTH) {
      return NextResponse.json(
        { error: `Keep messages under ${MAX_LENGTH.toLocaleString()} characters.` },
        { status: 400 }
      );
    }

    await connectDB();

    const [receiver, recentCount] = await Promise.all([
      User.findById(receiverId).select('_id').lean(),
      Message.countDocuments({ sender: me, createdAt: { $gte: new Date(Date.now() - RATE_WINDOW_MS) } }),
    ]);
    if (!receiver) {
      return NextResponse.json({ error: 'That user no longer exists.' }, { status: 404 });
    }
    if (recentCount >= RATE_MAX) {
      return NextResponse.json({ error: 'You’re sending messages too fast. Wait a moment.' }, { status: 429 });
    }

    const conversationId = conversationIdFor(me, receiverId);

    // Replies: rebuild the quote from the real message, so nobody can
    // fake a quote or pull text from another conversation.
    let replyTo = null;
    const replyId = body.replyTo?._id ?? body.replyTo;
    if (isObjectId(typeof replyId === 'string' ? replyId : String(replyId ?? ''))) {
      const original = await Message.findOne({ _id: String(replyId), conversationId })
        .populate('sender', 'name')
        .lean();
      if (original) {
        replyTo = {
          _id: original._id,
          content: String(original.content || '').slice(0, 300),
          senderName: original.sender?.name || '',
        };
      }
    }

    const message = await Message.create({
      conversationId,
      sender: me,
      receiver: receiverId,
      content,
      replyTo,
    });

    const populated = await Message.findById(message._id).populate('sender', 'name avatar');

    // Push only — chat has its own unread system (Message.seen) and Navbar badge,
    // so no Notification document is created here.
    (async () => {
      const unreadCount = await Message.countDocuments({ receiver: receiverId, seen: false });
      const name = session.user.name || 'New message';
      await sendPushOnly(receiverId, {
        title: name,
        body: content.length > 80 ? `${content.slice(0, 80)}…` : content,
        url: `/chat?to=${me}&name=${encodeURIComponent(session.user.name || '')}`,
        unreadCount,
      });
    })().catch((e) => console.error('[CHAT] Push failed:', e?.message));

    return NextResponse.json(populated, { status: 201 });
  } catch (error) {
    console.error('[CHAT SEND]', error);
    return NextResponse.json({ error: 'Message not sent. Please try again.' }, { status: 500 });
  }
}