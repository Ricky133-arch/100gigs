// app/api/admin/announce/route.js
//
// Admin posts an announcement. Creates one Notification document per
// targeted user (all / clients / providers).

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import connectDB from '@/lib/mongodb';
import User from '@/models/User';
import Notification from '@/models/Notification';
import { authOptions } from '../../auth/[...nextauth]/route';
import { sendNotificationToUser } from '@/lib/sendNotification';

export async function POST(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Admins only' }, { status: 403 });
    }

    const { title, body, audience, url } = await request.json();
    // audience: 'all' | 'client' | 'provider'

    if (!title?.trim() || !body?.trim()) {
      return NextResponse.json({ error: 'Title and message are required' }, { status: 400 });
    }
    if (!['all', 'client', 'provider'].includes(audience)) {
      return NextResponse.json({ error: 'Invalid audience' }, { status: 400 });
    }

    await connectDB();

    // Build the user query based on audience
    const userQuery = audience === 'all'
      ? { role: { $in: ['client', 'provider'] } } // never push-notify other admins
      : { role: audience };

    const targetUsers = await User.find(userQuery).select('_id');

    if (targetUsers.length === 0) {
      return NextResponse.json({ error: 'No matching users found' }, { status: 400 });
    }

    // Create one Notification document per targeted user
    const notifDocs = targetUsers.map(u => ({
      recipient: u._id,
      sender: session.user.id,
      type: 'system',
      title: title.trim(),
      body: body.trim(),
      url: url?.trim() || '/dashboard',
    }));

    await Notification.insertMany(notifDocs);

    // Fire push notifications in the background — don't block the response
    (async () => {
      for (const u of targetUsers) {
        try {
          await sendNotificationToUser(u._id.toString(), {
            title: `📢 ${title.trim()}`,
            body: body.trim(),
            url: url?.trim() || '/dashboard',
          });
        } catch (e) {
          console.error('Push failed for', u._id.toString(), e.message);
        }
      }
    })();

    return NextResponse.json({
      message: `Announcement sent to ${targetUsers.length} user${targetUsers.length !== 1 ? 's' : ''}`,
      count: targetUsers.length,
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed to send announcement' }, { status: 500 });
  }
}