/**
 * app/api/auth/forgot-password/route.js
 * POST /api/auth/forgot-password
 * Body: { email }
 *
 * Generates a reset token, saves it to the user, sends the email.
 */
import { NextResponse } from 'next/server';
import crypto from 'crypto';
import connectDB from '@/lib/mongodb';
import User from '@/models/User';
import { sendPasswordResetEmail } from '@/lib/brevo';

export async function POST(request) {
  try {
    const { email } = await request.json();

    if (!email?.trim()) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    await connectDB();

    const user = await User.findOne({ email: email.toLowerCase().trim() });

    // Always return success even if email doesn't exist — prevents user enumeration
    if (!user) {
      return NextResponse.json({
        message: 'If an account with that email exists, a reset link has been sent.',
      });
    }

    // Generate a secure random token
    const token   = crypto.randomBytes(32).toString('hex');
    const expires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour from now

    // Save token to user
    user.resetPasswordToken   = token;
    user.resetPasswordExpires = expires;
    await user.save();

    // Build reset URL
    const appUrl   = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const resetUrl = `${appUrl}/reset-password?token=${token}&email=${encodeURIComponent(user.email)}`;

    // Send email via Brevo
    await sendPasswordResetEmail(user.email, user.name, resetUrl);

    return NextResponse.json({
      message: 'If an account with that email exists, a reset link has been sent.',
    });
  } catch (error) {
    console.error('[FORGOT PASSWORD]', error);
    return NextResponse.json({ error: 'Failed to send reset email' }, { status: 500 });
  }
}