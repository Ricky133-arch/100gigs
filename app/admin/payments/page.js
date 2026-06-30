// app/admin/payments/page.js
//
// Admin view for reviewing payments and manually releasing payouts
// once funds have settled into the Paystack balance.

'use client';
import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import {
  Loader2, CreditCard, Clock, CheckCircle, XCircle, AlertTriangle,
  ShieldAlert, RefreshCw, Send,
} from 'lucide-react';

const glass = {
  background:          'rgba(255,255,255,0.04)',
  border:              '1px solid rgba(255,255,255,0.08)',
  backdropFilter:      'blur(12px)',
  WebkitBackdropFilter:'blur(12px)',
};

const STATUS_STYLES = {
  awaiting_settlement: { color: '#facc15', bg: 'rgba(250,204,21,0.12)',  label: 'Awaiting Settlement', icon: Clock },
  pending:              { color: '#60a5fa', bg: 'rgba(96,165,250,0.12)', label: 'Transfer Pending',    icon: Loader2 },
  success:              { color: '#4ade80', bg: 'rgba(74,222,128,0.12)', label: 'Paid Out',            icon: CheckCircle },
  failed:                { color: '#f87171', bg: 'rgba(248,113,113,0.12)',label: 'Failed',              icon: XCircle },
};

function StatusPill({ status }) {
  const s = STATUS_STYLES[status] || STATUS_STYLES.awaiting_settlement;
  const Icon = s.icon;
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold"
      style={{ background: s.bg, color: s.color }}>
      <Icon size={11} /> {s.label}
    </span>
  );
}

export default function AdminPaymentsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [payments, setPayments] = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [filter,   setFilter]   = useState('');
  const [releasing,setReleasing]= useState(null);

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/login');
  }, [status]);

  const fetchPayments = useCallback(async () => {
    if (!session || session.user.role !== 'admin') return;
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filter) params.set('transferStatus', filter);
      const res = await fetch(`/api/admin/payments?${params}`);
      if (res.ok) {
        const data = await res.json();
        setPayments(data.payments || []);
      }
    } catch (e) {
      toast.error('Failed to load payments');
    } finally {
      setLoading(false);
    }
  }, [session, filter]);

  useEffect(() => { fetchPayments(); }, [fetchPayments]);

  const handleRelease = async (paymentId) => {
    setReleasing(paymentId);
    try {
      const res = await fetch(`/api/admin/payments/${paymentId}/release`, { method: 'POST' });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || 'Failed to release payout');
        await fetchPayments(); // refresh to show failed status
        return;
      }
      toast.success(data.message);
      await fetchPayments();
    } catch {
      toast.error('Something went wrong');
    } finally {
      setReleasing(null);
    }
  };

  if (status === 'loading') {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#080f0a]">
        <div className="w-10 h-10 rounded-full border-2 border-green-500/20 border-t-green-500 animate-spin" />
      </div>
    );
  }
  if (!session || session.user.role !== 'admin') {
    return (
      <div className="min-h-screen bg-[#080f0a] flex items-center justify-center px-4">
        <div className="text-center p-10 rounded-3xl max-w-md w-full" style={glass}>
          <ShieldAlert size={36} className="mx-auto mb-4" style={{ color: 'rgba(255,255,255,0.2)' }} />
          <h2 className="text-xl font-bold text-white mb-2">Admins Only</h2>
        </div>
      </div>
    );
  }

  const awaitingCount = payments.filter(p => p.transferStatus === 'awaiting_settlement').length;
  const totalAwaiting = payments
    .filter(p => p.transferStatus === 'awaiting_settlement')
    .reduce((sum, p) => sum + p.providerShare, 0);

  return (
    <div className="min-h-screen bg-[#080f0a] pb-32">
      <div className="max-w-4xl mx-auto px-4 py-10 space-y-6">

        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-green-400/60 mb-1">Admin Panel</p>
            <h1 className="text-3xl font-bold text-white">Payments & Payouts</h1>
            <p className="text-white/30 text-sm mt-1">Review payments and release provider payouts once funds settle</p>
          </div>
          <button onClick={fetchPayments}
            className="p-2.5 rounded-xl transition hover:bg-white/5"
            style={{ color: 'rgba(255,255,255,0.4)' }} title="Refresh">
            <RefreshCw size={16} />
          </button>
        </div>

        {/* Summary banner */}
        {awaitingCount > 0 && (
          <div className="flex items-center gap-4 p-4 rounded-2xl"
            style={{ background: 'rgba(250,204,21,0.08)', border: '1px solid rgba(250,204,21,0.2)' }}>
            <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
              style={{ background: 'rgba(250,204,21,0.15)' }}>
              <AlertTriangle size={18} style={{ color: '#facc15' }} />
            </div>
            <div>
              <p className="text-sm font-semibold text-white">
                {awaitingCount} payout{awaitingCount > 1 ? 's' : ''} awaiting release
              </p>
              <p className="text-xs text-white/35 mt-0.5">
                Total: ₦{totalAwaiting.toLocaleString()} — confirm settlement in your Paystack balance before releasing
              </p>
            </div>
          </div>
        )}

        {/* Filter tabs */}
        <div className="flex gap-2 flex-wrap">
          {[
            { value: '', label: 'All' },
            { value: 'awaiting_settlement', label: 'Awaiting Settlement' },
            { value: 'pending', label: 'Transfer Pending' },
            { value: 'success', label: 'Paid Out' },
            { value: 'failed', label: 'Failed' },
          ].map(f => (
            <button key={f.value} onClick={() => setFilter(f.value)}
              className="px-3.5 py-2 rounded-xl text-xs font-semibold transition"
              style={{
                background: filter === f.value ? 'rgba(74,222,128,0.12)' : 'rgba(255,255,255,0.04)',
                color:      filter === f.value ? '#4ade80' : 'rgba(255,255,255,0.5)',
                border:     `1px solid ${filter === f.value ? 'rgba(74,222,128,0.25)' : 'rgba(255,255,255,0.08)'}`,
              }}>
              {f.label}
            </button>
          ))}
        </div>

        {/* Payments list */}
        <div className="rounded-2xl overflow-hidden" style={glass}>
          {loading ? (
            <div className="p-12 flex items-center justify-center">
              <Loader2 size={24} className="animate-spin text-green-400" />
            </div>
          ) : payments.length === 0 ? (
            <div className="p-12 text-center">
              <CreditCard size={32} className="mx-auto mb-3" style={{ color: 'rgba(255,255,255,0.1)' }} />
              <p className="text-white/30 text-sm">No payments found</p>
            </div>
          ) : (
            <div className="divide-y" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
              {payments.map(p => (
                <div key={p._id} className="p-5 space-y-3">
                  <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div>
                      <p className="text-sm font-semibold text-white">{p.jobId?.title || 'Job deleted'}</p>
                      <p className="text-xs text-white/30 mt-0.5">
                        {p.clientId?.name || 'Unknown client'} → {p.providerId?.name || 'Unknown provider'}
                      </p>
                    </div>
                    <StatusPill status={p.transferStatus} />
                  </div>

                  <div className="grid grid-cols-3 gap-2 text-xs">
                    <div className="p-2.5 rounded-lg" style={{ background: 'rgba(255,255,255,0.03)' }}>
                      <p className="text-white/25 mb-0.5">Total Paid</p>
                      <p className="text-white font-semibold">₦{p.totalAmount.toLocaleString()}</p>
                    </div>
                    <div className="p-2.5 rounded-lg" style={{ background: 'rgba(255,255,255,0.03)' }}>
                      <p className="text-white/25 mb-0.5">Commission</p>
                      <p className="text-white font-semibold">₦{p.commission.toLocaleString()}</p>
                    </div>
                    <div className="p-2.5 rounded-lg" style={{ background: 'rgba(74,222,128,0.06)' }}>
                      <p className="text-white/25 mb-0.5">Provider Gets</p>
                      <p className="text-green-400 font-semibold">₦{p.providerShare.toLocaleString()}</p>
                    </div>
                  </div>

                  {p.providerId?.bankDetails?.accountNumber && (
                    <p className="text-xs text-white/30">
                      Bank: {p.providerId.bankDetails.bankName} · {p.providerId.bankDetails.accountNumber} · {p.providerId.bankDetails.accountName}
                    </p>
                  )}

                  {p.transferFailReason && (
                    <p className="text-xs text-red-400 p-2 rounded-lg" style={{ background: 'rgba(248,113,113,0.08)' }}>
                      {p.transferFailReason}
                    </p>
                  )}

                  {(p.transferStatus === 'awaiting_settlement' || p.transferStatus === 'failed') && (
                    <button
                      onClick={() => handleRelease(p._id)}
                      disabled={releasing === p._id}
                      className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold text-white transition disabled:opacity-50"
                      style={{ background: 'linear-gradient(135deg,#16a34a,#15803d)' }}
                    >
                      {releasing === p._id
                        ? <><Loader2 size={13} className="animate-spin" /> Releasing...</>
                        : <><Send size={13} /> {p.transferStatus === 'failed' ? 'Retry Payout' : 'Release Payout'}</>
                      }
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}