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

    const { name, phone, bio, location, skills, avatar, username, socialLinks, bankDetails } = await request.json();

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

    // ── Bank details — also creates a Paystack Transfer Recipient ───────
    // This is required before any automatic payout can be sent to this
    // provider. We do this BEFORE saving so we never store bank details
    // without a working recipientCode.
    if (bankDetails !== undefined && bankDetails.accountNumber) {
      if (session.user.role !== 'provider') {
        return NextResponse.json({ error: 'Only providers can add bank details' }, { status: 403 });
      }

      const recipientRes = await fetch('https://api.paystack.co/transferrecipient', {
        method:  'POST',
        headers: {
          Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type:           'nuban',
          name:           bankDetails.accountName,
          account_number: bankDetails.accountNumber,
          bank_code:      bankDetails.bankCode,
          currency:       'NGN',
        }),
      });
      const recipientData = await recipientRes.json();

      if (!recipientData.status) {
        console.error('[PROFILE] Recipient creation failed:', recipientData);
        return NextResponse.json(
          { error: recipientData.message || 'Failed to register bank account with payment provider. Please check your details and try again.' },
          { status: 400 }
        );
      }

      updateData.bankDetails = {
        bankCode:      bankDetails.bankCode,
        bankName:      bankDetails.bankName,
        accountNumber: bankDetails.accountNumber,
        accountName:   bankDetails.accountName,
        recipientCode: recipientData.data.recipient_code,
        verifiedAt:    new Date(),
      };
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