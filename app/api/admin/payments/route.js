// app/api/admin/payments/route.js
//
// Lists payments for the admin "Pending Payouts" dashboard view.

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import connectDB from '@/lib/mongodb';
import Payment from '@/models/Payment';
import { authOptions } from '../../auth/[...nextauth]/route';

export async function GET(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Admins only' }, { status: 403 });
    }

    await connectDB();

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('transferStatus'); // optional filter

    const query = {};
    if (status) query.transferStatus = status;

    const payments = await Payment.find(query)
      .populate('clientId', 'name email')
      .populate('providerId', 'name email bankDetails')
      .populate('jobId', 'title')
      .sort({ createdAt: -1 })
      .limit(100);

    return NextResponse.json({ payments });
  } catch (error) {
    console.error('[ADMIN PAYMENTS LIST]', error);
    return NextResponse.json({ error: 'Failed to fetch payments' }, { status: 500 });
  }
}