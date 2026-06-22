import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import connectDB from '@/lib/mongodb';
import User from '@/models/User';
import { authOptions } from '../../auth/[...nextauth]/route';

// GET /api/users/check-username?username=chidi-plumber
export async function GET(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const username = searchParams.get('username')?.toLowerCase().trim();

    if (!username || username.length < 3) {
      return NextResponse.json({ available: false, error: 'Too short' });
    }

    if (!/^[a-z0-9_-]{3,30}$/.test(username)) {
      return NextResponse.json({ available: false, error: 'Invalid characters' });
    }

    await connectDB();

    const existing = await User.findOne({
      username,
      _id: { $ne: session.user.id }, // exclude current user
    });

    return NextResponse.json({ available: !existing });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Check failed' }, { status: 500 });
  }
}