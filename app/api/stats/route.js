import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Job from '@/models/Job';
import User from '@/models/User';

export async function GET() {
  try {
    await connectDB();

    const [jobs, users] = await Promise.all([
      Job.countDocuments({ status: 'open' }),
      User.countDocuments(),
    ]);

    return NextResponse.json({
      jobs,
      users,
      categories: 12,
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ jobs: 0, users: 0, categories: 12 });
  }
}