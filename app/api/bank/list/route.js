/**
 * app/api/bank/list/route.js
 * GET /api/bank/list
 *
 * Returns list of Nigerian banks from Paystack.
 * Cached for 24 hours since bank list rarely changes.
 */
import { NextResponse } from 'next/server';

let cachedBanks = null;
let cacheTime   = null;
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours

export async function GET() {
  try {
    // Return cached list if still fresh
    if (cachedBanks && cacheTime && Date.now() - cacheTime < CACHE_TTL) {
      return NextResponse.json({ banks: cachedBanks });
    }

    const res  = await fetch('https://api.paystack.co/bank?country=nigeria&perPage=100', {
      headers: {
        Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
      },
    });

    const data = await res.json();

    if (!data.status) {
      return NextResponse.json({ error: 'Failed to fetch banks' }, { status: 500 });
    }

    // Cache the result
    cachedBanks = data.data.map(bank => ({
      name: bank.name,
      code: bank.code,
    }));
    cacheTime = Date.now();

    return NextResponse.json({ banks: cachedBanks });
  } catch (error) {
    console.error('[BANK LIST]', error);
    return NextResponse.json({ error: 'Failed to fetch bank list' }, { status: 500 });
  }
}