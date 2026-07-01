'use client';
import { useEffect, useState, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import {
  CreditCard, CheckCircle, Clock, AlertTriangle,
  Loader2, RefreshCw, X, Building2, TrendingUp,
  ArrowRight, Filter,
} from 'lucide-react';
import { toast } from 'sonner';

const glass = {
  background:          'rgba(255,255,255,0.04)',
  border:              '1px solid rgba(255,255,255,0.08)',
  backdropFilter:      'blur(12px)',
  WebkitBackdropFilter:'blur(12px)',
};

const STATUS_CONFIG = {
  awaiting_settlement: { label: 'Awaiting Settlement', color: '#facc15', bg: 'rgba(250,204,21,0.12)',  icon: Clock         },
  pending:             { label: 'Transfer Pending',     color: '#60a5fa', bg: 'rgba(96,165,250,0.12)',  icon: Loader2       },
  success:             { label: 'Paid Out',             color: '#4ade80', bg: 'rgba(74,222,128,0.12)',  icon: CheckCircle   },
  failed:              { label: 'Failed',               color: '#f87171', bg: 'rgba(248,113,113,0.12)', icon: AlertTriangle },
};

function StatusPill({ status }) {
  const config = STATUS_CONFIG[status] || STATUS_CONFIG.awaiting_settlement;
  const Icon   = config.icon;
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold"
      style={{ background: config.bg, color: config.color }}>
      <Icon size={11} />
      {config.label}
    </span>
  );
}

function StatCard({ label, value, icon: Icon, color, sub }) {
  return (
    <div className="p-5 rounded-2xl" style={glass}>
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs text-white/35 font-medium">{label}</p>
        <div className="w-8 h-8 rounded-lg flex items-center justify-center"
          style={{ background: `${color}20` }}>
          <Icon size={15} style={{ color }} />
        </div>
      </div>
      <p className="text-2xl font-bold text-white tabular-nums">{value}</p>
      {sub && <p className="text-xs text-white/25 mt-1">{sub}</p>}
    </div>
  );
}

export default function AdminPaymentsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [payments,   setPayments]   = useState([]);
  const [stats,      setStats]      = useState(null);
  const [loading,    setLoading]    = useState(true);
  const [filter,     setFilter]     = useState(''); // '' | 'awaiting_settlement' | 'success'

  // Modal
  const [modal,      setModal]      = useState(null); // payment object
  const [note,       setNote]       = useState('');
  const [releasing,  setReleasing]  = useState(false);

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/login');
  }, [status]);

  const fetchPayments = useCallback(async () => {
    if (!session || session.user.role !== 'admin') return;
    setLoading(true);
    try {
      const params = filter ? `?transferStatus=${filter}` : '';
      const res    = await fetch(`/api/admin/payments${params}`);
      const data   = await res.json();
      if (res.ok) {
        setPayments(data.payments || []);
        setStats(data.stats);
      }
    } catch (e) {
      toast.error('Failed to load payments');
    } finally {
      setLoading(false);
    }
  }, [session, filter]);

  useEffect(() => { fetchPayments(); }, [fetchPayments]);

  const handleMarkPaid = async () => {
    if (!modal) return;
    setReleasing(true);
    try {
      const res  = await fetch(`/api/admin/payments/${modal._id}/release`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ note }),
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error || 'Failed'); return; }
      toast.success(data.message);
      setModal(null);
      setNote('');
      fetchPayments();
    } catch {
      toast.error('Something went wrong');
    } finally {
      setReleasing(false);
    }
  };

  if (status === 'loading') return (
    <div className="flex items-center justify-center min-h-screen bg-[#080f0a]">
      <div className="w-10 h-10 rounded-full border-2 border-green-500/20 border-t-green-500 animate-spin" />
    </div>
  );

  if (!session || session.user.role !== 'admin') return null;

  const fmt = (n) => n ? `₦${Number(n).toLocaleString()}` : '₦0';

  return (
    <div className="min-h-screen bg-[#080f0a] pb-32">
      <div className="max-w-5xl mx-auto px-4 py-10 space-y-6">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-green-400/60 mb-1">Admin</p>
            <h1 className="text-3xl font-bold text-white">Payments & Payouts</h1>
            <p className="text-white/30 text-sm mt-1">
              Track all transactions and release provider payouts manually
            </p>
          </div>
          <button onClick={fetchPayments}
            className="p-2.5 rounded-xl hover:bg-white/5 transition"
            style={{ color: 'rgba(255,255,255,0.4)' }}>
            <RefreshCw size={16} />
          </button>
        </div>

        {/* Manual payout notice */}
        <div className="p-4 rounded-xl flex items-start gap-3"
          style={{ background: 'rgba(250,204,21,0.06)', border: '1px solid rgba(250,204,21,0.15)' }}>
          <AlertTriangle size={16} className="text-yellow-400 shrink-0 mt-0.5" />
          <div className="text-xs text-white/50 leading-relaxed">
            <strong className="text-white/70">Manual payout mode:</strong> Payouts are currently processed manually.
            When a client pays, transfer the provider's share from your Paystack dashboard or bank app,
            then click <strong className="text-white/70">"Mark as Paid"</strong> to confirm and notify the provider.
            Automatic payouts will be enabled once a verified business account is in place.
          </div>
        </div>

        {/* Stats */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <StatCard label="Total Commission"  value={fmt(stats.totalCommission)}  icon={TrendingUp}  color="#4ade80" sub="Your earnings" />
            <StatCard label="Total Paid Out"    value={fmt(stats.totalPaidOut)}     icon={CheckCircle} color="#60a5fa" sub="To providers" />
            <StatCard label="Awaiting Payout"   value={fmt(stats.awaitingPayout)}   icon={Clock}       color="#facc15" sub="Needs your action" />
            <StatCard label="Total Payments"    value={stats.totalPayments}         icon={CreditCard}  color="#a78bfa" sub="All time" />
          </div>
        )}

        {/* Filter tabs */}
        <div className="flex gap-2">
          {[
            { value: '',                      label: 'All Payments' },
            { value: 'awaiting_settlement',   label: 'Needs Payout' },
            { value: 'success',               label: 'Paid Out'     },
          ].map(f => (
            <button key={f.value}
              onClick={() => setFilter(f.value)}
              className="px-4 py-2 rounded-xl text-sm font-medium transition"
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
        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 size={28} className="animate-spin text-green-400" />
          </div>
        ) : payments.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center" style={glass}>
            <CreditCard size={36} className="mb-4" style={{ color: 'rgba(255,255,255,0.1)' }} />
            <p className="text-white/30 text-sm">No payments yet</p>
            <p className="text-white/20 text-xs mt-1">Payments will appear here when clients pay through 100Gigs</p>
          </div>
        ) : (
          <div className="rounded-2xl overflow-hidden" style={glass}>
            <div className="divide-y" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
              {payments.map(payment => (
                <div key={payment._id} className="p-5">
                  <div className="flex items-start justify-between gap-4 mb-4">
                    {/* Job + parties */}
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-white truncate mb-1">
                        {payment.jobId?.title || 'Job removed'}
                      </p>
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-white/35">
                        <span>
                          Client: <span className="text-white/60">{payment.clientId?.name || '—'}</span>
                        </span>
                        <span>→</span>
                        <span>
                          Provider: <span className="text-white/60">{payment.providerId?.name || '—'}</span>
                        </span>
                      </div>
                      {payment.providerId?.bankDetails?.accountNumber && (
                        <p className="text-xs text-white/25 mt-1">
                          <Building2 size={10} className="inline mr-1" />
                          {payment.providerId.bankDetails.bankName} ·{' '}
                          {payment.providerId.bankDetails.accountNumber} ·{' '}
                          {payment.providerId.bankDetails.accountName}
                        </p>
                      )}
                      {!payment.providerId?.bankDetails?.accountNumber && (
                        <p className="text-xs text-red-400/60 mt-1">
                          ⚠ Provider has not added bank details
                        </p>
                      )}
                    </div>

                    <StatusPill status={payment.transferStatus} />
                  </div>

                  {/* Amounts */}
                  <div className="grid grid-cols-3 gap-2 mb-4">
                    {[
                      { label: 'Client Paid',     value: fmt(payment.totalAmount),   color: 'text-white'       },
                      { label: 'Your Commission', value: fmt(payment.commission),    color: 'text-green-400'   },
                      { label: 'Provider Gets',   value: fmt(payment.providerShare), color: 'text-blue-400'    },
                    ].map(row => (
                      <div key={row.label} className="p-3 rounded-xl text-center"
                        style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)' }}>
                        <p className={`text-sm font-bold ${row.color}`}>{row.value}</p>
                        <p className="text-[10px] text-white/25 mt-0.5">{row.label}</p>
                      </div>
                    ))}
                  </div>

                  {/* Date + action */}
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-white/25">
                      Paid {payment.paidAt
                        ? new Date(payment.paidAt).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
                        : '—'
                      }
                    </p>

                    {payment.transferStatus === 'awaiting_settlement' && (
                      <button
                        onClick={() => { setModal(payment); setNote(''); }}
                        className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold transition"
                        style={{ background: 'linear-gradient(135deg,#16a34a,#15803d)', color: 'white', boxShadow: '0 2px 12px rgba(22,163,74,0.3)' }}
                      >
                        <CheckCircle size={13} /> Mark as Paid
                      </button>
                    )}

                    {payment.transferStatus === 'success' && (
                      <span className="flex items-center gap-1.5 text-xs text-green-400/60">
                        <CheckCircle size={12} />
                        Paid {payment.transferCompletedAt
                          ? new Date(payment.transferCompletedAt).toLocaleDateString('en-NG', { day: 'numeric', month: 'short' })
                          : ''}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ── Mark as Paid Modal ─────────────────────────────────────────────── */}
      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(8px)' }}
          onClick={() => setModal(null)}>
          <div className="w-full max-w-md rounded-3xl p-7"
            style={{ background: '#080f0a', border: '1px solid rgba(255,255,255,0.1)', boxShadow: '0 24px 64px rgba(0,0,0,0.5)' }}
            onClick={e => e.stopPropagation()}>

            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center"
                  style={{ background: 'rgba(74,222,128,0.12)' }}>
                  <CheckCircle size={18} className="text-green-400" />
                </div>
                <div>
                  <p className="text-sm font-bold text-white">Mark as Paid</p>
                  <p className="text-xs text-white/35">{modal.providerId?.name}</p>
                </div>
              </div>
              <button onClick={() => setModal(null)}
                className="p-1.5 rounded-lg text-white/30 hover:text-white/60 transition">
                <X size={18} />
              </button>
            </div>

            {/* Checklist */}
            <div className="p-4 rounded-xl mb-5 space-y-2"
              style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
              <p className="text-xs font-semibold uppercase tracking-widest text-white/30 mb-3">
                Before confirming — make sure you have:
              </p>
              {[
                `Transferred ₦${modal.providerShare?.toLocaleString()} to ${modal.providerId?.name}`,
                `Bank: ${modal.providerId?.bankDetails?.bankName || '—'}`,
                `Account: ${modal.providerId?.bankDetails?.accountNumber || '—'}`,
                `Account Name: ${modal.providerId?.bankDetails?.accountName || '—'}`,
              ].map((item, i) => (
                <div key={i} className="flex items-start gap-2 text-xs text-white/40">
                  <span className="text-green-400 mt-0.5">□</span>
                  <span>{item}</span>
                </div>
              ))}
            </div>

            {/* Optional note */}
            <div className="mb-5">
              <label className="block text-xs font-semibold uppercase tracking-widest text-white/30 mb-2">
                Transfer note (optional)
              </label>
              <input
                type="text"
                value={note}
                onChange={e => setNote(e.target.value)}
                placeholder="e.g. Sent via GTB mobile app at 2:30pm"
                className="w-full px-4 py-3 rounded-xl text-sm text-white placeholder-white/20 outline-none"
                style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}
                onFocus={e => e.target.style.borderColor = 'rgba(74,222,128,0.5)'}
                onBlur={e  => e.target.style.borderColor = 'rgba(255,255,255,0.1)'}
              />
            </div>

            {/* Buttons */}
            <div className="flex gap-3">
              <button onClick={() => setModal(null)}
                className="flex-1 py-3 rounded-xl text-sm font-semibold text-white/50"
                style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>
                Cancel
              </button>
              <button onClick={handleMarkPaid} disabled={releasing}
                className="flex-1 py-3 rounded-xl text-sm font-semibold text-white disabled:opacity-50 flex items-center justify-center gap-2"
                style={{ background: 'linear-gradient(135deg,#16a34a,#15803d)', boxShadow: '0 4px 16px rgba(22,163,74,0.3)' }}>
                {releasing
                  ? <><Loader2 size={15} className="animate-spin" /> Confirming...</>
                  : <><CheckCircle size={15} /> Confirm Payment Sent</>
                }
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}