/**
 * app/api/users/profile/route.js
 *
 * GET   — the logged-in user's own profile
 * PATCH — update it. Only the fields listed below can ever change here;
 *         role, verification, ratings etc. are untouchable from the browser.
 *         Sending just { avatar } (or any single field) leaves the rest alone.
 */
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import connectDB from '@/lib/mongodb';
import User from '@/models/User';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';

export const dynamic = 'force-dynamic';

// Never send these to the browser, even to the account owner
const PRIVATE_FIELDS =
  '-password -resetPasswordToken -resetPasswordExpires -resetToken -resetTokenExpiry -pushSubscriptions -__v';

const SOCIAL_KEYS = ['instagram', 'facebook', 'twitter', 'tiktok', 'linkedin', 'youtube'];
const USERNAME_RE = /^[a-z0-9_.-]{3,30}$/;
const HANDLE_RE = /^@?[\w.\-]{1,100}$/;

const str = (v) => (typeof v === 'string' ? v.trim() : null);

function bad(message, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

/** A handle like "@chidi_fixes", or a full https:// link. Nothing else (no javascript: links). */
function cleanSocial(v) {
  const s = str(v);
  if (s === null || s === '') return '';
  if (HANDLE_RE.test(s)) return s;
  try {
    const u = new URL(s);
    if (u.protocol === 'https:' && s.length <= 200) return s;
  } catch {}
  return null; // invalid
}

/** Ask Paystack who owns the account. The name comes from the bank, not from what was typed. */
async function resolveAccount(accountNumber, bankCode) {
  const res = await fetch(
    `https://api.paystack.co/bank/resolve?account_number=${accountNumber}&bank_code=${encodeURIComponent(bankCode)}`,
    { headers: { Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}` }, cache: 'no-store' }
  );
  const data = await res.json().catch(() => null);
  if (!res.ok || !data?.status || !data.data?.account_name) return null;
  return data.data.account_name;
}

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return bad('Please log in.', 401);

    await connectDB();
    const user = await User.findById(session.user.id).select(PRIVATE_FIELDS).lean();
    if (!user) return bad('Account not found.', 404);

    return NextResponse.json(user);
  } catch (error) {
    console.error('[PROFILE GET]', error);
    return bad('Couldn’t load your profile.', 500);
  }
}

export async function PATCH(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return bad('Please log in.', 401);
    const me = session.user.id;

    const body = await request.json().catch(() => null);
    if (!body || typeof body !== 'object') return bad('Nothing to update.');

    const $set = {};
    const $unset = {};

    // ── Plain text fields: only touched if sent ──────────────────────────
    if (body.name !== undefined) {
      const name = str(body.name);
      if (!name || name.length < 2 || name.length > 60) return bad('Enter your name (2–60 characters).');
      $set.name = name;
    }
    if (body.phone !== undefined) {
      const phone = (str(body.phone) || '').replace(/[\s-]/g, '');
      if (phone && !/^\+?\d{10,14}$/.test(phone)) return bad('Enter a valid phone number.');
      $set.phone = phone;
    }
    if (body.bio !== undefined) {
      const bio = str(body.bio) ?? '';
      if (bio.length > 600) return bad('Keep your bio under 600 characters.');
      $set.bio = bio;
    }
    if (body.location !== undefined) {
      const location = str(body.location) ?? '';
      if (location.length > 100) return bad('Location is too long.');
      $set.location = location;
    }
    if (body.skills !== undefined) {
      if (!Array.isArray(body.skills)) return bad('Skills must be a list.');
      const skills = [...new Set(body.skills.map(str).filter(Boolean))];
      if (skills.length > 20 || skills.some((s) => s.length > 50)) return bad('Too many skills, or one is too long.');
      $set.skills = skills;
    }

    // ── Avatar: an https image link, or empty to remove ──────────────────
    if (body.avatar !== undefined) {
      const avatar = str(body.avatar) ?? '';
      if (avatar) {
        let ok = false;
        try { ok = new URL(avatar).protocol === 'https:' && avatar.length <= 500; } catch {}
        if (!ok) return bad('That photo link isn’t valid. Please upload again.');
      }
      $set.avatar = avatar;
    }

    // ── Username ─────────────────────────────────────────────────────────
    if (body.username !== undefined) {
      const username = (str(body.username) ?? '').toLowerCase().replace(/^@/, '');
      if (username === '') {
        $unset.username = 1;
      } else {
        if (!USERNAME_RE.test(username)) {
          return bad('Usernames are 3–30 characters: letters, numbers, dots, dashes and underscores.');
        }
        const taken = await User.exists({ username, _id: { $ne: me } });
        if (taken) return bad('This username is already taken. Please choose another.', 409);
        $set.username = username;
      }
    }

    // ── Social links: known networks only, handles or https links ───────
    if (body.socialLinks !== undefined) {
      if (!body.socialLinks || typeof body.socialLinks !== 'object') return bad('Invalid social links.');
      for (const key of SOCIAL_KEYS) {
        if (body.socialLinks[key] === undefined) continue;
        const v = cleanSocial(body.socialLinks[key]);
        if (v === null) return bad(`Your ${key} link isn’t valid. Use your @handle or an https:// link.`);
        $set[`socialLinks.${key}`] = v; // partial update: other networks untouched
      }
    }

    // ── Bank details (providers only) ────────────────────────────────────
    const bd = body.bankDetails;
    if (bd !== undefined && bd !== null && bd.accountNumber) {
      if (session.user.role !== 'provider') return bad('Only providers can add bank details.', 403);

      const accountNumber = String(bd.accountNumber).replace(/\D/g, '');
      const bankCode = str(String(bd.bankCode ?? ''));
      const bankName = str(String(bd.bankName ?? '')) || '';
      if (accountNumber.length !== 10) return bad('Account numbers are 10 digits.');
      if (!bankCode || !/^[\w-]{2,12}$/.test(bankCode)) return bad('Choose your bank.');

      // 1) The bank tells us the real account name — the typed name is ignored
      const accountName = await resolveAccount(accountNumber, bankCode);
      if (!accountName) {
        return bad('We couldn’t find that account. Check the number and bank, then try again.');
      }

      // 2) Register it with Paystack so payouts can be sent to it
      const recipientRes = await fetch('https://api.paystack.co/transferrecipient', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: 'nuban',
          name: accountName,
          account_number: accountNumber,
          bank_code: bankCode,
          currency: 'NGN',
        }),
      });
      const recipientData = await recipientRes.json().catch(() => null);
      if (!recipientRes.ok || !recipientData?.status || !recipientData.data?.recipient_code) {
        console.error('[PROFILE] Recipient creation failed:', recipientData?.message);
        return bad('We couldn’t register that bank account for payouts. Please try again.');
      }

      $set.bankDetails = {
        bankCode,
        bankName,
        accountNumber,
        accountName,
        recipientCode: recipientData.data.recipient_code,
        verifiedAt: new Date(),
      };
    }

    if (Object.keys($set).length === 0 && Object.keys($unset).length === 0) {
      return bad('Nothing to update.');
    }

    const update = {};
    if (Object.keys($set).length) update.$set = $set;
    if (Object.keys($unset).length) update.$unset = $unset;

    const user = await User.findByIdAndUpdate(me, update, { new: true, runValidators: true })
      .select(PRIVATE_FIELDS)
      .lean();
    if (!user) return bad('Account not found.', 404);

    return NextResponse.json(user);
  } catch (error) {
    if (error?.name === 'ValidationError') {
      const message = Object.values(error.errors)[0]?.message || 'Some details aren’t valid.';
      return bad(message);
    }
    if (error?.code === 11000) return bad('This username is already taken.', 409);
    console.error('[PROFILE PATCH]', error);
    return bad('Couldn’t save your profile. Please try again.', 500);
  }
}