import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import connectDB from '@/lib/mongodb';
import PushSubscription from '@/models/PushSubscription';
import { authOptions } from '../../auth/[...nextauth]/route';

export async function POST(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { subscription } = await request.json();
    if (!subscription) {
      return NextResponse.json({ error: 'No subscription provided' }, { status: 400 });
    }

    await connectDB();

    // Upsert — update if exists, create if not
    await PushSubscription.findOneAndUpdate(
      { user: session.user.id },
      {
        user: session.user.id,
        subscription,
      },
      { upsert: true, new: true }
    );

    return NextResponse.json({ message: 'Subscribed successfully' });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed to subscribe' }, { status: 500 });
  }
}

export async function DELETE(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();
    await PushSubscription.findOneAndDelete({ user: session.user.id });

    return NextResponse.json({ message: 'Unsubscribed successfully' });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed to unsubscribe' }, { status: 500 });
  }
}