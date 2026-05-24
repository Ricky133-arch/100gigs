import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import connectDB from '@/lib/mongodb';
import Rating from '@/models/Rating';
import Application from '@/models/Application';
import { authOptions } from '../auth/[...nextauth]/route';

export async function POST(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (session.user.role !== 'client') {
      return NextResponse.json({ error: 'Only clients can leave ratings' }, { status: 403 });
    }

    const { providerId, jobId, rating, review } = await request.json();

    if (!providerId || !jobId || !rating) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    if (rating < 1 || rating > 5) {
      return NextResponse.json({ error: 'Rating must be between 1 and 5' }, { status: 400 });
    }

    await connectDB();

    // Verify the application was accepted before allowing rating
    const application = await Application.findOne({
      job: jobId,
      applicant: providerId,
      status: 'accepted',
    });

    if (!application) {
      return NextResponse.json({
        error: 'You can only rate providers whose application you accepted',
      }, { status: 403 });
    }

    // Check if already rated
    const existingRating = await Rating.findOne({
      client: session.user.id,
      job: jobId,
    });

    if (existingRating) {
      return NextResponse.json({ error: 'You have already rated this provider for this job' }, { status: 400 });
    }

    const newRating = await Rating.create({
      provider: providerId,
      client: session.user.id,
      job: jobId,
      rating,
      review: review || '',
    });

    return NextResponse.json({
      message: 'Rating submitted successfully',
      rating: newRating,
    }, { status: 201 });

  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed to submit rating' }, { status: 500 });
  }
}