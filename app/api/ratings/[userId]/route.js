import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Rating from '@/models/Rating';

export async function GET(request, { params }) {
  try {
    const { userId } = await params;
    await connectDB();

    const ratings = await Rating.find({ provider: userId })
      .populate('client', 'name')
      .populate('job', 'title')
      .sort({ createdAt: -1 });

    // Calculate average
    const average = ratings.length > 0
      ? ratings.reduce((sum, r) => sum + r.rating, 0) / ratings.length
      : 0;

    return NextResponse.json({
      ratings,
      average: Math.round(average * 10) / 10,
      total: ratings.length,
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed to fetch ratings' }, { status: 500 });
  }
}