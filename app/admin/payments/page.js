'use client';
import { useEffect, useState, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { toast } from 'sonner';
import { Loader2, RefreshCw, X, ArrowLeft, Copy, Check, ArrowRight } from 'lucide-react';

/* ── helpers ─────────────────────────────────────────────── */

const naira = (n) => `₦${Number(n || 0).toLocaleString('en-NG')}`;
const fmtDate = (d, time = false) => (d
  ? new Date(d).toLocaleString('en-NG', { day: 'numeric', month: 'short', year: 'numeric', ...(time ? { hour: 'numeric', minute: '2-digit' } : {}) })
  : '—');

const TSTATUS = {
  awaiting_settlement: { dot: 'bg-amber-300', text: 'text-amber-300', label: 'To pay out' },
  pending:             { dot: 'bg-sky-300',   text: 'text-sky-300',   label: 'Transfer pending' },
  success:             { dot: 'bg-green-400', text: 'text-green-400', label: 'Paid out' },
  failed:              { dot: 'bg-red-400',   text: 'text-red-400',   label: 'Failed' },
};

function Status({ value }) {
  const s = TSTATUS[value] || TSTATUS.awaiting_settlement;
  return (
    <span className={`mono inline-flex items-center gap-2 whitespace-nowrap text-[11px] uppercase tracking-[0.12em] ${s.text}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${s.dot}`} />{s.label}
    </span>
  );
}

// Tap-to-copy for account numbers and amounts, so nothing gets mistyped in the bank app
function CopyValue({ value, display, className = '' }) {
  const [copied, setCopied] = useState(false);
  const copy = async (e) => {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(String(value));
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch { toast.error('Couldn’t copy'); }
  };
  return (
    <button type="button" onClick={copy} title="Copy"
      className={`group inline-flex items-center gap-2 text-left transition hover:text-green-400 ${className}`}>
      <span>{display ?? value}</span>
      {copied ? <Check size={13} className="shrink-0 text-green-400" /> : <Copy size={13} className="shrink-0 text-white/25 group-hover:text-green-400" />}
    </button>
  );
}

const FILTERS = [
  ['awaiting_settlement', 'To pay out'],
  ['', 'All'],
  ['success', 'Paid out'],
  ['failed', 'Failed'],
];

/* ── page ────────────────────────────────────────────────── */

export default function AdminPaymentsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const isAdmin = session?.user?.role === 'admin';

  const [payments, setPayments] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [failedLoad, setFailedLoad] = useState(false);
  const [filter, setFilter] = useState('awaiting_settlement');

  const [modal, setModal] = useState(null);
  const [note, setNote] = useState('');
  const [checks, setChecks] = useState({ amount: false, name: false });
  const [releasing, setReleasing] = useState(false);

  useEffect(() => {
    if (status === 'unauthenticated') router.replace('/login?callbackUrl=%2Fadmin%2Fpayments');
    else if (status === 'authenticated' && !isAdmin) router.replace('/dashboard');
  }, [status, isAdmin]); // eslint-disable-line react-hooks/exhaustive-deps

  const fetchPayments = useCallback(async () => {
    if (!isAdmin) return;
    setLoading(true);
    setFailedLoad(false);
    try {
      const res = await fetch(`/api/admin/payments${filter ? `?transferStatus=${filter}` : ''}`);
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error('payments');
      setPayments(data.payments || []);
      setStats(data.stats || null);
    } catch {
      setFailedLoad(true);
      setPayments([]);
    } finally {
      setLoading(false);
    }
  }, [isAdmin, filter]);

  useEffect(() => { fetchPayments(); }, [fetchPayments]);

  const openModal = (p) => { setModal(p); setNote(''); setChecks({ amount: false, name: false }); };
  const closeModal = () => { if (!releasing) setModal(null); };

  useEffect(() => {
    if (!modal) return;
    const onKey = (e) => e.key === 'Escape' && closeModal();
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = ''; };
  }); // eslint-disable-line react-hooks/exhaustive-deps

  const handleMarkPaid = async () => {
    if (!modal) return;
    setReleasing(true);
    try {
      const res = await fetch(`/api/admin/payments/${modal._id}/release`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ note: note.trim() }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { toast.error(data.error || 'Couldn’t mark this as paid'); return; }
      toast.success(data.message || `Marked as paid. ${modal.providerId?.name?.split(' ')[0] || 'The provider'} has been notified.`);
      setModal(null);
      fetchPayments();
    } catch {
      toast.error('Something went wrong. It hasn’t been marked as paid.');
    } finally {
      setReleasing(false);
    }
  };

  /* ── render ───────────────────────────────────────────── */

  const shell = (children) => (
    <div className="ap min-h-screen bg-[#080f0a] text-[#e9efe9] antialiased">
      <style>{`
        .ap { font-family: var(--font-sans), ui-sans-serif, system-ui, sans-serif; }
        .serif { font-family: var(--font-serif), Georgia, serif; font-weight: 400; letter-spacing: -0.01em; }
        .mono { font-family: var(--font-mono), ui-monospace, monospace; }
      `}</style>
      {children}
    </div>
  );

  if (status === 'loading' || !isAdmin) {
    return shell(
      <div className="flex min-h-screen items-center justify-center">
        <p className="mono text-[11px] uppercase tracking-[0.18em] text-white/35">Loading…</p>
      </div>
    );
  }

  const awaiting = stats?.awaitingPayout || 0;
  const bank = modal?.providerId?.bankDetails;

  return shell(
    <div className="mx-auto max-w-6xl px-5 pb-32 pt-10 md:px-8 md:pt-16">
      <Link href="/admin" className="mb-10 inline-flex items-center gap-1.5 text-[13px] text-white/45 transition hover:text-white">
        <ArrowLeft size={14} /> Admin
      </Link>

      <header className="mb-10 flex flex-wrap items-end justify-between gap-6">
        <h1 className="serif text-5xl leading-none md:text-7xl">Payouts</h1>
        <button onClick={fetchPayments} aria-label="Refresh"
          className="flex h-9 w-9 items-center justify-center rounded-full border border-white/15 text-white/60 transition hover:border-white/40 hover:text-white">
          <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
        </button>
      </header>

      <p className="mb-12 max-w-2xl border-l-2 border-white/15 pl-4 text-[13px] leading-relaxed text-white/50">
        <span className="text-white/80">Manual payouts.</span> When a client pays, send the provider’s share from your Paystack dashboard or bank app,
        then mark it paid here to notify them. This switches to automatic once the business account is verified.
      </p>

      {/* Stats */}
      <dl className="mb-6 grid grid-cols-2 border-y border-white/10 md:grid-cols-4">
        {[
          ['To pay out', stats && naira(awaiting), 'text-amber-300'],
          ['Paid to providers', stats && naira(stats.totalPaidOut), 'text-white'],
          ['100Gigs earnings', stats && naira(stats.totalCommission), 'text-green-400'],
          ['Payments', stats?.totalPayments, 'text-white'],
        ].map(([t, v, tone], i) => (
          <div key={t} className={`py-6 ${i % 2 ? 'border-l border-white/10 pl-5 md:pl-8' : ''} ${i === 2 ? 'md:border-l md:border-white/10 md:pl-8' : ''} ${i >= 2 ? 'border-t border-white/10 md:border-t-0' : ''}`}>
            <dt className="text-[12px] text-white/40">{t}</dt>
            <dd className={`mono mt-2 text-2xl md:text-3xl ${tone}`}>{loading && !stats ? '–' : (v ?? '—')}</dd>
          </div>
        ))}
      </dl>

      {/* Filters */}
      <div className="mb-2 mt-12 flex gap-6 border-b border-white/10 text-[14px]">
        {FILTERS.map(([v, l]) => {
          const on = filter === v;
          return (
            <button key={l} onClick={() => setFilter(v)}
              className={`relative pb-3 transition-colors ${on ? 'text-white' : 'text-white/45 hover:text-white/80'}`}>
              {l}
              {on && <span className="absolute -bottom-px left-0 right-0 h-px bg-green-400" />}
            </button>
          );
        })}
      </div>

      {/* List */}
      {loading ? (
        <ul>
          {[0, 1, 2].map((i) => (
            <li key={i} className="border-b border-white/[0.07] py-7">
              <div className="mb-3 h-4 w-1/3 animate-pulse bg-white/[0.08]" />
              <div className="h-3 w-1/2 animate-pulse bg-white/[0.05]" />
            </li>
          ))}
        </ul>
      ) : failedLoad ? (
        <div className="py-14">
          <p className="text-[15px] text-white/60">Couldn’t load payments.</p>
          <button onClick={fetchPayments} className="mt-4 border-b border-green-400 pb-0.5 text-[14px] text-white hover:text-green-400">Try again</button>
        </div>
      ) : payments.length === 0 ? (
        <p className="py-14 text-[15px] text-white/45">
          {filter === 'awaiting_settlement' ? 'All caught up. No one is waiting to be paid.' : 'No payments here yet. They appear when clients pay through 100Gigs.'}
        </p>
      ) : (
        <ul>
          {payments.map((p) => {
            const b = p.providerId?.bankDetails;
            const hasBank = !!b?.accountNumber;
            return (
              <li key={p._id} className="border-b border-white/[0.07] py-7">
                <div className="grid gap-6 md:grid-cols-[1fr_auto] md:items-start md:gap-10">
                  <div className="min-w-0">
                    <div className="mb-2 flex flex-wrap items-center gap-x-4 gap-y-1">
                      <Status value={p.transferStatus} />
                      <span className="mono text-[11px] text-white/30">Paid {fmtDate(p.paidAt, true)}</span>
                    </div>
                    <p className="truncate text-[17px] font-medium text-white">
                      {p.jobId?._id
                        ? <Link href={`/jobs/${p.jobId._id}`} className="transition hover:text-green-400">{p.jobId.title}</Link>
                        : (p.jobId?.title || 'Job removed')}
                    </p>
                    <p className="mt-1 text-[13px] text-white/45">
                      {p.clientId?.name || '—'} <span className="text-white/25">paid</span> {p.providerId?.name || '—'}
                    </p>
                    {hasBank ? (
                      <p className="mono mt-3 text-[12px] text-white/45">{b.bankName} · {b.accountName}</p>
                    ) : (
                      <p className="mt-3 border-l-2 border-red-400 pl-3 text-[12px] text-red-300">
                        No payout account yet. Ask {p.providerId?.name?.split(' ')[0] || 'them'} to add one on their verification page.
                      </p>
                    )}
                    {p.reference && <p className="mono mt-1 text-[11px] text-white/25">Ref {p.reference}</p>}
                  </div>

                  <div className="md:text-right">
                    <dl className="grid grid-cols-3 gap-4 md:block md:space-y-1">
                      <div className="md:flex md:items-baseline md:justify-end md:gap-3">
                        <dt className="text-[11px] text-white/35">Client paid</dt>
                        <dd className="mono text-[14px] text-white/70">{naira(p.totalAmount)}</dd>
                      </div>
                      <div className="md:flex md:items-baseline md:justify-end md:gap-3">
                        <dt className="text-[11px] text-white/35">Fee</dt>
                        <dd className="mono text-[14px] text-white/50">{naira(p.commission)}</dd>
                      </div>
                      <div className="md:flex md:items-baseline md:justify-end md:gap-3">
                        <dt className="text-[11px] text-white/35">To provider</dt>
                        <dd className="mono text-[18px] text-green-400">{naira(p.providerShare)}</dd>
                      </div>
                    </dl>

                    {p.transferStatus === 'awaiting_settlement' && (
                      <button onClick={() => openModal(p)} disabled={!hasBank}
                        className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-full bg-green-400 px-5 py-2.5 text-[13px] font-medium text-[#080f0a] transition hover:bg-green-300 disabled:bg-white/[0.06] disabled:text-white/30 md:w-auto">
                        Pay out <ArrowRight size={14} />
                      </button>
                    )}
                    {p.transferStatus === 'success' && (
                      <p className="mono mt-4 text-[11px] text-green-400/80">Sent {fmtDate(p.transferCompletedAt)}</p>
                    )}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {/* ─── Payout ─── */}
      {modal && (
        <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/70 sm:items-center sm:p-4" onClick={closeModal}>
          <div role="dialog" aria-modal="true" className="relative max-h-[92vh] w-full max-w-md overflow-y-auto border border-white/10 bg-[#0b150e] p-7 sm:rounded-2xl" onClick={(e) => e.stopPropagation()}>
            <button onClick={closeModal} disabled={releasing} aria-label="Close"
              className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full text-white/40 transition hover:bg-white/[0.06] hover:text-white">
              <X size={16} />
            </button>

            <p className="mono mb-4 text-[10px] uppercase tracking-[0.16em] text-white/35">Pay out</p>
            <h2 className="serif pr-8 text-3xl leading-tight">Send {modal.providerId?.name?.split(' ')[0]} their money</h2>
            <p className="mt-2 text-[13px] text-white/45">Send it from your bank app, then confirm here. Tap any value to copy it.</p>

            <dl className="mt-6 space-y-4 border-y border-white/10 py-5">
              <div>
                <dt className="mono text-[10px] uppercase tracking-[0.14em] text-white/35">Amount</dt>
                <dd className="mono mt-1 text-3xl text-green-400"><CopyValue value={modal.providerShare} display={naira(modal.providerShare)} /></dd>
              </div>
              <div>
                <dt className="mono text-[10px] uppercase tracking-[0.14em] text-white/35">Account number</dt>
                <dd className="mono mt-1 text-xl tracking-[0.08em] text-white"><CopyValue value={bank?.accountNumber} /></dd>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <dt className="mono text-[10px] uppercase tracking-[0.14em] text-white/35">Bank</dt>
                  <dd className="mt-1 text-[14px] text-white">{bank?.bankName || '—'}</dd>
                </div>
                <div>
                  <dt className="mono text-[10px] uppercase tracking-[0.14em] text-white/35">Account name</dt>
                  <dd className="mt-1 text-[14px] text-white">{bank?.accountName || '—'}</dd>
                </div>
              </div>
            </dl>

            <fieldset className="mt-6 space-y-3">
              <legend className="mono mb-3 text-[10px] uppercase tracking-[0.16em] text-white/35">Before you confirm</legend>
              {[
                ['amount', <>I sent exactly <span className="mono text-white">{naira(modal.providerShare)}</span></>],
                ['name', <>The bank app showed <span className="text-white">{bank?.accountName || 'the same name'}</span> before I sent it</>],
              ].map(([k, text]) => (
                <label key={k} className="flex cursor-pointer items-start gap-3 text-[14px] text-white/65">
                  <input type="checkbox" checked={checks[k]} onChange={(e) => setChecks((c) => ({ ...c, [k]: e.target.checked }))}
                    className="mt-0.5 h-4 w-4 shrink-0 accent-green-400" />
                  <span>{text}</span>
                </label>
              ))}
            </fieldset>

            <div className="mt-6">
              <label htmlFor="note" className="mono mb-3 block text-[10px] uppercase tracking-[0.16em] text-white/35">
                Transfer reference <span className="normal-case tracking-normal text-white/25">· optional, for your records</span>
              </label>
              <input id="note" value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. GTB session ID or time sent"
                className="w-full border-b border-white/15 bg-transparent pb-3 text-[15px] text-white outline-none placeholder:text-white/20 focus:border-green-400" />
            </div>

            <div className="mt-8 flex flex-col-reverse gap-3 sm:flex-row">
              <button onClick={closeModal} disabled={releasing}
                className="inline-flex flex-1 items-center justify-center rounded-full border border-white/15 px-4 py-3 text-[13px] text-white/75 transition hover:border-white/40 hover:text-white disabled:opacity-40">
                Not yet
              </button>
              <button onClick={handleMarkPaid} disabled={releasing || !checks.amount || !checks.name}
                className="inline-flex flex-1 items-center justify-center gap-2 rounded-full bg-green-400 px-5 py-3 text-[14px] font-medium text-[#080f0a] transition hover:bg-green-300 disabled:bg-white/[0.06] disabled:text-white/30">
                {releasing ? <><Loader2 size={15} className="animate-spin" /> Confirming…</> : 'Mark as paid'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}