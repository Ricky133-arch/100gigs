import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import connectDB from '@/lib/mongodb';
import Application from '@/models/Application';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    const applications = await Application.find({ 
      applicant: session.user.id,
    })
      .populate('job', 'title budgetMin budgetMax location category status')
      .sort({ createdAt: -1 });

    return NextResponse.json(applications);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed to fetch applications' }, { status: 500 });
  }
}