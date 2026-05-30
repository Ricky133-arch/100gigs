import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Job from '@/models/Job';

export async function GET(request, { params }) {
  try {
    const { id } = await params;
    await connectDB();

    const job = await Job.findById(id)
      .populate('postedBy', 'name avatar phone location');

    if (!job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }

    // ── Auto-close if deadline has passed ─────────────────────────────────
    if (job.deadline && new Date(job.deadline) < new Date() && job.status === 'open') {
      job.status = 'closed';
      await job.save();
    }

    return NextResponse.json(job);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed to fetch job' }, { status: 500 });
  }
}

export async function PATCH(request, { params }) {
  try {
    const { id } = await params;
    await connectDB();

    const body = await request.json();
    const job = await Job.findByIdAndUpdate(id, { ...body }, { new: true });

    if (!job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }

    return NextResponse.json(job);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed to update job' }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  try {
    const { id } = await params;
    await connectDB();

    const job = await Job.findByIdAndDelete(id);

    if (!job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }

    return NextResponse.json({ message: 'Job deleted successfully' });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed to delete job' }, { status: 500 });
  }
}