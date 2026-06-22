import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import connectDB from '@/lib/mongodb';
import User from '@/models/User';
import { authOptions } from '../../auth/[...nextauth]/route';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    await connectDB();
    const user = await User.findById(session.user.id).select('-password');
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    return NextResponse.json(user);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed to fetch profile' }, { status: 500 });
  }
}

export async function PATCH(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { name, phone, bio, location, skills, avatar, username, socialLinks } = await request.json();

    await connectDB();

    // ── Username uniqueness check ──────────────────────────────────────────
    if (username !== undefined && username !== '') {
      const existing = await User.findOne({
        username: username.toLowerCase().trim(),
        _id: { $ne: session.user.id }, // exclude current user
      });
      if (existing) {
        return NextResponse.json(
          { error: 'This username is already taken. Please choose another.' },
          { status: 409 }
        );
      }
    }

    const updateData = { name, phone, bio, location, skills };

    // Only update avatar if provided
    if (avatar !== undefined) updateData.avatar = avatar;

    // Username — allow clearing it by passing empty string
    if (username !== undefined) {
      updateData.username = username.trim() === '' ? undefined : username.toLowerCase().trim();
    }

    // Social links — merge with existing so partial updates work
    if (socialLinks !== undefined) {
      updateData.socialLinks = socialLinks;
    }

    const user = await User.findByIdAndUpdate(
      session.user.id,
      updateData,
      { new: true, runValidators: true }
    ).select('-password');

    return NextResponse.json(user);
  } catch (error) {
    // Mongoose validation error (e.g. bad username format)
    if (error.name === 'ValidationError') {
      const message = Object.values(error.errors)[0]?.message || 'Validation failed';
      return NextResponse.json({ error: message }, { status: 400 });
    }
    // Duplicate key (username taken — race condition)
    if (error.code === 11000) {
      return NextResponse.json({ error: 'This username is already taken.' }, { status: 409 });
    }
    console.error(error);
    return NextResponse.json({ error: 'Failed to update profile' }, { status: 500 });
  }
}