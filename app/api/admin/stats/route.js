import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import connectDB from '@/lib/mongodb';
import User from '@/models/User';
import Job from '@/models/Job';
import { authOptions } from '../../auth/[...nextauth]/route';

// GET /api/admin/stats
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Admins only' }, { status: 403 });
    }

    await connectDB();

    const [
      totalUsers,
      totalClients,
      totalProviders,
      pendingVerifications,
      verifiedProviders,
      rejectedVerifications,
      suspendedUsers,
      totalJobs,
      openJobs,
      newUsersThisWeek,
    ] = await Promise.all([
      User.countDocuments({ role: { $ne: 'admin' } }),
      User.countDocuments({ role: 'client' }),
      User.countDocuments({ role: 'provider' }),
      User.countDocuments({ role: 'provider', verificationStatus: 'pending' }),
      User.countDocuments({ role: 'provider', verificationStatus: 'verified' }),
      User.countDocuments({ role: 'provider', verificationStatus: 'rejected' }),
      User.countDocuments({ isSuspended: true }),
      Job.countDocuments(),
      Job.countDocuments({ status: 'open' }),
      User.countDocuments({
        createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
        role: { $ne: 'admin' },
      }),
    ]);

    return NextResponse.json({
      totalUsers,
      totalClients,
      totalProviders,
      pendingVerifications,
      verifiedProviders,
      rejectedVerifications,
      suspendedUsers,
      totalJobs,
      openJobs,
      newUsersThisWeek,
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed to fetch stats' }, { status: 500 });
  }
}