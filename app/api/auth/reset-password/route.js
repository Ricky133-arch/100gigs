/**
 * app/api/auth/reset-password/route.js
 * POST /api/auth/reset-password
 * Body: { token, email, password }
 *
 * Validates the token and updates the user's password.
 */
import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import connectDB from '@/lib/mongodb';
import User from '@/models/User';

export async function POST(request) {
  try {
    const { token, email, password } = await request.json();

    if (!token || !email || !password) {
      return NextResponse.json({ error: 'All fields are required' }, { status: 400 });
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: 'Password must be at least 6 characters' },
        { status: 400 }
      );
    }

    await connectDB();

    // Find user with matching token that hasn't expired
    const user = await User.findOne({
      email:                email.toLowerCase().trim(),
      resetPasswordToken:   token,
      resetPasswordExpires: { $gt: new Date() }, // token must still be valid
    });

    if (!user) {
      return NextResponse.json(
        { error: 'This reset link is invalid or has expired. Please request a new one.' },
        { status: 400 }
      );
    }

    // Hash new password and clear reset token
    user.password             = await bcrypt.hash(password, 12);
    user.resetPasswordToken   = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();

    return NextResponse.json({ message: 'Password reset successfully. You can now sign in.' });
  } catch (error) {
    console.error('[RESET PASSWORD]', error);
    return NextResponse.json({ error: 'Failed to reset password' }, { status: 500 });
  }
}