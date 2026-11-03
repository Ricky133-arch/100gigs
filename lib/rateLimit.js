/**
 * lib/rateLimit.js
 *
 * Simple rate limiting stored in MongoDB, so it works on Vercel/serverless
 * (in-memory counters reset on every cold start and don't share between instances).
 *
 * Usage:
 *   const limit = await rateLimit(`signup:${ip}`, { max: 5, windowMs: 60 * 60_000 });
 *   if (!limit.ok) return NextResponse.json({ error: '…' }, { status: 429 });
 *
 * Old entries delete themselves (TTL index), so the collection stays small.
 */
import mongoose from 'mongoose';
import connectDB from '@/lib/mongodb';

const RateLimitSchema = new mongoose.Schema({
  key:       { type: String, required: true, unique: true },
  count:     { type: Number, default: 0 },
  expiresAt: { type: Date, required: true },
});
RateLimitSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

const RateLimit = mongoose.models.RateLimit || mongoose.model('RateLimit', RateLimitSchema);

export async function rateLimit(key, { max, windowMs }) {
  try {
    await connectDB();
    const now = new Date();

    // Window expired (or never existed)? Start a fresh one at 1.
    const reset = await RateLimit.findOneAndUpdate(
      { key, expiresAt: { $lte: now } },
      { $set: { count: 1, expiresAt: new Date(now.getTime() + windowMs) } },
      { new: true }
    );
    if (reset) return { ok: true, remaining: max - 1 };

    // Otherwise count this attempt (creates the entry the first time)
    const entry = await RateLimit.findOneAndUpdate(
      { key },
      { $inc: { count: 1 }, $setOnInsert: { expiresAt: new Date(now.getTime() + windowMs) } },
      { new: true, upsert: true }
    );
    return {
      ok: entry.count <= max,
      remaining: Math.max(0, max - entry.count),
      retryAfterMs: entry.expiresAt.getTime() - now.getTime(),
    };
  } catch (err) {
    // Two first-attempts racing on the unique key — just let this one through
    if (err?.code === 11000) return { ok: true, remaining: max };
    console.error('[RATE LIMIT]', err?.message);
    return { ok: true, remaining: max }; // never lock people out because of a limiter bug
  }
}

/** Best-effort client IP (Vercel and most hosts set x-forwarded-for). */
export function clientIp(request) {
  const fwd = request.headers.get('x-forwarded-for');
  if (fwd) return fwd.split(',')[0].trim();
  return request.headers.get('x-real-ip') || 'unknown';
}