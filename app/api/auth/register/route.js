/**
 * Sign-up route.
 *
 * Role can ONLY be "client" or "provider". Admins are made by hand in the
 * database, never through sign-up.
 */
import { NextResponse } from 'next/server';
import bcryptjs from 'bcryptjs';
import connectDB from '@/lib/mongodb';
import User from '@/models/User';
import { rateLimit, clientIp } from '@/lib/rateLimit';

export const dynamic = 'force-dynamic';

const ALLOWED_ROLES = ['client', 'provider'];
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const CASE_INSENSITIVE = { locale: 'en', strength: 2 };

const bad = (error, status = 400) => NextResponse.json({ error }, { status });

export async function POST(request) {
  try {
    // 5 sign-ups per hour per network — stops bots mass-creating accounts
    const limit = await rateLimit(`signup:${clientIp(request)}`, { max: 5, windowMs: 60 * 60_000 });
    if (!limit.ok) return bad('Too many sign-ups from this network. Try again in an hour.', 429);

    const body = await request.json().catch(() => ({}));
    const name = typeof body.name === 'string' ? body.name.trim() : '';
    const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
    const password = typeof body.password === 'string' ? body.password : '';
    const role = body.role;
    const phone = typeof body.phone === 'string' ? body.phone.replace(/[\s-]/g, '') : '';

    if (!name || !email || !password || !role) return bad('Please fill in every field.');
    if (!ALLOWED_ROLES.includes(role)) return bad('Choose whether you’re hiring or offering a service.');
    if (name.length < 2 || name.length > 60) return bad('Enter your name (2–60 characters).');
    if (!EMAIL_RE.test(email) || email.length > 254) return bad('Enter a valid email address.');
    // Matches MIN_PASSWORD in the signup page and MIN_LENGTH in reset-password
    if (password.length < 6) return bad('Use at least 6 characters for your password.');
    if (password.length > 72) return bad('That password is too long (72 characters max).');
    if (phone && !/^\+?\d{10,14}$/.test(phone)) return bad('Enter a valid phone number.');

    await connectDB();

    // Case-insensitive, so "Chidi@Gmail.com" and "chidi@gmail.com" are the same person
    const existingUser = await User.findOne({ email }).collation(CASE_INSENSITIVE).select('_id').lean();
    if (existingUser) return bad('An account with this email already exists. Try logging in.');

    const hashedPassword = await bcryptjs.hash(password, 12);

    let user;
    try {
      user = await User.create({ name, email, password: hashedPassword, role, phone });
    } catch (err) {
      if (err?.code === 11000) return bad('An account with this email already exists. Try logging in.');
      if (err?.name === 'ValidationError') {
        return bad(Object.values(err.errors)[0]?.message || 'Some details aren’t valid.');
      }
      throw err;
    }

    return NextResponse.json({
      message: 'Account created',
      user: { id: user._id, name: user.name, email: user.email, role: user.role },
    }, { status: 201 });
  } catch (error) {
    console.error('[SIGNUP]', error);
    return bad('Couldn’t create your account. Please try again.', 500);
  }
}