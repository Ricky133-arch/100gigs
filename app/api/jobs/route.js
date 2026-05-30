import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import connectDB from '@/lib/mongodb';
import Job from '@/models/Job';
import { authOptions } from '../auth/[...nextauth]/route';

export async function GET(request) {
  try {
    await connectDB();

    // ── Auto-close expired jobs ────────────────────────────────────────────
    await Job.updateMany(
      {
        status: 'open',
        deadline: { $lt: new Date(), $ne: null, $exists: true },
      },
      { $set: { status: 'closed' } }
    );

    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');
    const location = searchParams.get('location');
    const search   = searchParams.get('search');

    const query = { status: 'open' };
    if (category) query.category = category;
    if (location) query.location = location;

    let jobs = await Job.find(query)
      .populate('postedBy', 'name avatar')
      .sort({ createdAt: -1 })
      .limit(100);

    // ── Relevance scoring ──────────────────────────────────────────────────
    if (search && search.trim()) {
      const term  = search.trim().toLowerCase();
      const terms = term.split(/\s+/);

      jobs = jobs
        .map(job => {
          let score = 0;
          const title       = job.title?.toLowerCase()       || '';
          const description = job.description?.toLowerCase() || '';
          const category    = job.category?.toLowerCase()    || '';
          const location    = job.location?.toLowerCase()    || '';

          if (title === term)           score += 100;
          if (title.startsWith(term))   score += 50;
          if (title.includes(term))     score += 40;
          if (category === term)        score += 35;
          if (category.includes(term))  score += 25;
          terms.forEach(word => { if (title.includes(word))       score += 20; });
          if (description.includes(term))                         score += 15;
          terms.forEach(word => { if (description.includes(word)) score += 8; });
          if (location.includes(term))  score += 10;

          return { job, score };
        })
        .filter(({ score }) => score > 0)
        .sort((a, b) => b.score - a.score)
        .map(({ job }) => job);
    }

    return NextResponse.json(jobs);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed to fetch jobs' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (session.user.role !== 'client') {
      return NextResponse.json({ error: 'Only clients can post jobs' }, { status: 403 });
    }

    const body = await request.json();
    const { title, description, category, budgetMin, budgetMax, location, deadline, images } = body;

    if (!title || !description || !category || !budgetMin || !budgetMax || !location) {
      return NextResponse.json({ error: 'All required fields must be filled' }, { status: 400 });
    }

    await connectDB();

    const job = await Job.create({
      title,
      description,
      category,
      budgetMin,
      budgetMax,
      location,
      deadline: deadline || null,
      images: images || [],
      postedBy: session.user.id,
      status: 'open',
    });

    return NextResponse.json(job, { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed to create job' }, { status: 500 });
  }
}