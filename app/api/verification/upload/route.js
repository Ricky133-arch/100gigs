import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import connectDB from '@/lib/mongodb';
import User from '@/models/User';
import { authOptions } from '../../auth/[...nextauth]/route';

export async function POST(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (session.user.role !== 'provider') {
      return NextResponse.json({ error: 'Only service providers can submit verification' }, { status: 403 });
    }

    const body = await request.json();
    const { docUrl } = body; // URL returned by your existing /api/upload route

    if (!docUrl) {
      return NextResponse.json({ error: 'Document URL is required' }, { status: 400 });
    }

    await connectDB();

    const user = await User.findById(session.user.id);
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Don't allow re-submission while already verified
    if (user.verificationStatus === 'verified') {
      return NextResponse.json({ error: 'You are already verified' }, { status: 400 });
    }

    user.verificationDoc = docUrl;
    user.verificationStatus = 'pending';
    user.verificationSubmittedAt = new Date();
    user.verificationRejectionReason = undefined;
    await user.save();

    return NextResponse.json({
      message: 'Verification document submitted. An admin will review it shortly.',
      verificationStatus: user.verificationStatus,
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed to submit verification' }, { status: 500 });
  }
}

// GET — provider checks their own verification status
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();
    const user = await User.findById(session.user.id).select(
      'verificationStatus verificationDoc verificationSubmittedAt verificationReviewedAt verificationRejectionReason'
    );

    return NextResponse.json(user);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed to fetch verification status' }, { status: 500 });
  }
}