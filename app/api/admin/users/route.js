import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import connectDB from '@/lib/mongodb';
import User from '@/models/User';
import { authOptions } from '../../auth/[...nextauth]/route';

export async function GET(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Admins only' }, { status: 403 });
    }

    await connectDB();

    const { searchParams } = new URL(request.url);
    const role               = searchParams.get('role');
    const verificationStatus = searchParams.get('verificationStatus');
    const isSuspended        = searchParams.get('isSuspended');

    // Never return admin accounts in the list
    const query = { role: { $ne: 'admin' } };

    if (role)               query.role               = role;
    if (verificationStatus) query.verificationStatus = verificationStatus;
    if (isSuspended === 'true') query.isSuspended    = true;

    const users = await User.find(query)
      .select('-password')
      .sort({ createdAt: -1 });

    return NextResponse.json(users);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 });
  }
}