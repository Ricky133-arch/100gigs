/**
 * app/api/bank/resolve/route.js
 * GET /api/bank/resolve?accountNumber=0123456789&bankCode=058
 *
 * Calls Paystack's account resolution API to verify a bank account
 * and return the account name. Used for auto-filling account name
 * when provider enters their account number.
 */
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';

export async function GET(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const accountNumber = searchParams.get('accountNumber');
    const bankCode      = searchParams.get('bankCode');

    if (!accountNumber || !bankCode) {
      return NextResponse.json({ error: 'Account number and bank code are required' }, { status: 400 });
    }

    if (accountNumber.length !== 10) {
      return NextResponse.json({ error: 'Account number must be 10 digits' }, { status: 400 });
    }

    const res = await fetch(
      `https://api.paystack.co/bank/resolve?account_number=${accountNumber}&bank_code=${bankCode}`,
      {
        headers: {
          Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
        },
      }
    );

    const data = await res.json();

    if (!data.status) {
      return NextResponse.json(
        { error: 'Could not verify account. Please check your details.' },
        { status: 400 }
      );
    }

    return NextResponse.json({
      accountName:   data.data.account_name,
      accountNumber: data.data.account_number,
    });
  } catch (error) {
    console.error('[BANK RESOLVE]', error);
    return NextResponse.json({ error: 'Failed to verify account' }, { status: 500 });
  }
}