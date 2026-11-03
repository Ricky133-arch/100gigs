/**
 * app/api/users/[id]/route.js
 *
 * Public profile. Anyone can call this (including people who aren't logged in),
 * so it returns an explicit list of safe fields — never "everything except…".
 */
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import connectDB from '@/lib/mongodb';
import User from '@/models/User';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { PUBLIC_USER_FIELDS, canSeePhone } from '@/lib/publicUser';

export const dynamic = 'force-dynamic';

const isObjectId = (v) => typeof v === 'string' && /^[a-f\d]{24}$/i.test(v);

export async function GET(request, { params }) {
  try {
    const { id } = await params;
    if (!isObjectId(id)) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    await connectDB();

    const user = await User.findById(id)
      .select(`${PUBLIC_USER_FIELDS} phone isSuspended`)
      .lean();
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const session = await getServerSession(authOptions).catch(() => null);
    const viewer = session?.user;

    // Suspended accounts disappear from public view (admins can still see them)
    if (user.isSuspended && viewer?.role !== 'admin') {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const { phone, isSuspended, ...publicProfile } = user;
    if (phone && (await canSeePhone(viewer, id))) {
      publicProfile.phone = phone;
    }

    return NextResponse.json(publicProfile);
  } catch (error) {
    console.error('[USER GET]', error);
    return NextResponse.json({ error: 'Couldn’t load this profile.' }, { status: 500 });
  }
}