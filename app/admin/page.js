'use client';
import { useState, useEffect, useCallback, useMemo } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import Link from 'next/link';
import { Loader2, Search, X, ChevronDown, RefreshCw, ArrowUpRight, ArrowRight } from 'lucide-react';

/* ── helpers ─────────────────────────────────────────────── */

const safeJson = (res) => res.json().catch(() => ({}));
const fmtDate = (d) => (d ? new Date(d).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' }) : '—');

const VSTATUS = {
  verified:    { dot: 'bg-green-400', text: 'text-green-400', label: 'Verified' },
  pending:     { dot: 'bg-amber-300', text: 'text-amber-300', label: 'To review' },
  rejected:    { dot: 'bg-red-400',   text: 'text-red-400',   label: 'Rejected' },
  unsubmitted: { dot: 'bg-white/25',  text: 'text-white/40',  label: 'Not submitted' },
};

function Status({ value }) {
  const s = VSTATUS[value] || VSTATUS.unsubmitted;
  return (
    <span className={`mono inline-flex items-center gap-2 whitespace-nowrap text-[11px] uppercase tracking-[0.12em] ${s.text}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${s.dot}`} />{s.label}
    </span>
  );
}

const REJECT_REASONS = [
  'The photo is blurry. Please upload a clearer one where every detail can be read.',
  'The name on the ID doesn’t match your profile name.',
  'This ID has expired. Please upload a valid one.',
  'We couldn’t accept this as a government ID. Use a NIN slip/card, driver’s licence, voter’s card or passport.',
  'Part of the ID is cut off. Please include all four corners.',
];

function Modal({ children, onClose, wide = false }) {
  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = ''; };
  }, [onClose]);
  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/70 sm:items-center sm:p-4" onClick={onClose}>
      <div role="dialog" aria-modal="true"
        className={`relative max-h-[92vh] w-full overflow-y-auto border border-white/10 bg-[#0b150e] sm:rounded-2xl ${wide ? 'max-w-2xl' : 'max-w-md'}`}
        onClick={(e) => e.stopPropagation()}>
        <button onClick={onClose} aria-label="Close"
          className="absolute right-4 top-4 z-10 flex h-8 w-8 items-center justify-center rounded-full text-white/40 transition hover:bg-white/[0.06] hover:text-white">
          <X size={16} />
        </button>
        {children}
      </div>
    </div>
  );
}

/* ── page ────────────────────────────────────────────────── */

export default function AdminDashboard() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const isAdmin = session?.user?.role === 'admin';
  const myId = session?.user?.id;

  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [loadingStats, setLoadingStats] = useState(true);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [usersFailed, setUsersFailed] = useState(false);

  const [tab, setTab] = useState('providers'); // providers | clients | suspended
  const [search, setSearch] = useState('');
  const [verifFilter, setVerifFilter] = useState('');
  const [expanded, setExpanded] = useState(null);

  const [docModal, setDocModal] = useState(null);
  const [docBroken, setDocBroken] = useState(false);
  const [showRejectInput, setShowRejectInput] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [confirmModal, setConfirmModal] = useState(null); // { user, action }
  const [suspendReason, setSuspendReason] = useState('');
  const [deleteTyped, setDeleteTyped] = useState('');
  const [busyId, setBusyId] = useState(null);

  // Send non-admins away instead of showing a blank page
  useEffect(() => {
    if (status === 'unauthenticated') router.replace('/login?callbackUrl=%2Fadmin');
    else if (status === 'authenticated' && !isAdmin) router.replace('/dashboard');
  }, [status, isAdmin]); // eslint-disable-line react-hooks/exhaustive-deps

  const fetchStats = useCallback(async () => {
    if (!isAdmin) return;
    setLoadingStats(true);
    try {
      const res = await fetch('/api/admin/stats');
      if (res.ok) setStats(await res.json());
    } catch (e) { console.error(e); }
    finally { setLoadingStats(false); }
  }, [isAdmin]);

  const fetchUsers = useCallback(async () => {
    if (!isAdmin) return;
    setLoadingUsers(true);
    setUsersFailed(false);
    try {
      const params = new URLSearchParams();
      if (tab === 'providers') params.set('role', 'provider');
      if (tab === 'clients') params.set('role', 'client');
      if (tab === 'suspended') params.set('isSuspended', 'true');
      if (verifFilter && tab === 'providers') params.set('verificationStatus', verifFilter);
      const res = await fetch(`/api/admin/users?${params}`);
      if (!res.ok) throw new Error('users');
      const data = await res.json();
      setUsers(Array.isArray(data) ? data : []);
    } catch {
      setUsersFailed(true);
      setUsers([]);
    } finally {
      setLoadingUsers(false);
    }
  }, [isAdmin, tab, verifFilter]);

  useEffect(() => { fetchStats(); }, [fetchStats]);
  useEffect(() => { fetchUsers(); setExpanded(null); }, [fetchUsers]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return users;
    return users.filter((u) =>
      [u.name, u.email, u.phone, u.location].some((v) => v?.toLowerCase().includes(q)));
  }, [users, search]);

  const closeDoc = () => { setDocModal(null); setShowRejectInput(false); setRejectReason(''); setDocBroken(false); };

  const openDoc = (u) => { setDocModal(u); setShowRejectInput(false); setRejectReason(''); setDocBroken(false); };

  // After a decision, jump straight to the next person waiting, so a queue can be cleared in one go
  const nextPendingAfter = (id) => {
    const queue = filtered.filter((u) => u.verificationStatus === 'pending' && u.verificationDoc && u._id !== id);
    const idx = filtered.findIndex((u) => u._id === id);
    return queue.find((u) => filtered.indexOf(u) > idx) || queue[0] || null;
  };

  const handleVerify = async (user, action, reason) => {
    setBusyId(user._id);
    try {
      const res = await fetch(`/api/admin/users/${user._id}/verify`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, reason }),
      });
      const data = await safeJson(res);
      if (!res.ok) { toast.error(data.error || 'That didn’t work'); return; }
      toast.success(data.message || (action === 'verify' ? `${user.name} verified` : `${user.name} rejected`));
      setUsers((prev) => prev.map((u) => (u._id === user._id ? (data.user || { ...u, verificationStatus: action === 'verify' ? 'verified' : 'rejected', verificationRejectionReason: reason }) : u)));
      fetchStats();
      const next = nextPendingAfter(user._id);
      if (next) openDoc(next); else closeDoc();
    } catch {
      toast.error('Something went wrong');
    } finally {
      setBusyId(null);
    }
  };

  const handleUserAction = async (user, action, reason) => {
    setBusyId(user._id);
    try {
      const res = await fetch(`/api/admin/users/${user._id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, reason }),
      });
      const data = await safeJson(res);
      if (!res.ok) { toast.error(data.error || 'That didn’t work'); return; }
      toast.success(data.message || 'Done');
      if (action === 'delete' || (tab === 'suspended' && action === 'unsuspend')) {
        setUsers((prev) => prev.filter((u) => u._id !== user._id));
      } else {
        setUsers((prev) => prev.map((u) => (u._id === user._id ? (data.user || { ...u, isSuspended: action === 'suspend', suspendedReason: reason }) : u)));
      }
      setConfirmModal(null);
      setSuspendReason('');
      setDeleteTyped('');
      fetchStats();
    } catch {
      toast.error('Something went wrong');
    } finally {
      setBusyId(null);
    }
  };

  /* ── render ───────────────────────────────────────────── */

  const shell = (children) => (
    <div className="ad min-h-screen bg-[#080f0a] text-[#e9efe9] antialiased">
      <style>{`
        .ad { font-family: var(--font-sans), ui-sans-serif, system-ui, sans-serif; }
        .serif { font-family: var(--font-serif), Georgia, serif; font-weight: 400; letter-spacing: -0.01em; }
        .mono { font-family: var(--font-mono), ui-monospace, monospace; }
        .ad select option { background: #0b150e; color: #fff; }
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

  const s = stats || {};
  const pendingTotal = s.pendingVerifications || 0;
  const TABS = [
    { id: 'providers', label: 'Providers', count: s.totalProviders },
    { id: 'clients', label: 'Clients', count: s.totalClients },
    { id: 'suspended', label: 'Suspended', count: s.suspendedUsers },
  ];

  const label = 'mono mb-3 block text-[10px] uppercase tracking-[0.16em] text-white/35';
  const btnGhost = 'inline-flex items-center justify-center gap-2 rounded-full border border-white/15 px-4 py-2 text-[13px] text-white/75 transition hover:border-white/40 hover:text-white disabled:opacity-40';

  return shell(
    <div className="mx-auto max-w-6xl px-5 pb-32 pt-10 md:px-8 md:pt-16">

      {/* Header */}
      <header className="mb-12 flex flex-wrap items-end justify-between gap-6">
        <div>
          <p className="mono mb-4 text-[11px] uppercase tracking-[0.18em] text-white/35">Admin</p>
          <h1 className="serif text-5xl leading-none md:text-7xl">Overview</h1>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/admin/payments" className={btnGhost}>Payments <ArrowUpRight size={14} /></Link>
          <Link href="/admin/announce" className={btnGhost}>Announce <ArrowUpRight size={14} /></Link>
          <button onClick={() => { fetchStats(); fetchUsers(); }} aria-label="Refresh"
            className="flex h-9 w-9 items-center justify-center rounded-full border border-white/15 text-white/60 transition hover:border-white/40 hover:text-white">
            <RefreshCw size={15} className={loadingStats || loadingUsers ? 'animate-spin' : ''} />
          </button>
        </div>
      </header>

      {/* Stats */}
      <dl className="mb-6 grid grid-cols-2 border-y border-white/10 md:grid-cols-4">
        {[
          ['Users', s.totalUsers, s.newUsersThisWeek != null ? `+${s.newUsersThisWeek} this week` : null],
          ['Providers', s.totalProviders, s.verifiedProviders != null ? `${s.verifiedProviders} verified` : null],
          ['Clients', s.totalClients, null],
          ['Open jobs', s.openJobs, s.totalJobs != null ? `of ${s.totalJobs} posted` : null],
        ].map(([t, v, sub], i) => (
          <div key={t} className={`py-6 ${i % 2 ? 'border-l border-white/10 pl-5 md:pl-8' : ''} ${i === 2 ? 'md:border-l md:border-white/10 md:pl-8' : ''} ${i >= 2 ? 'border-t border-white/10 md:border-t-0' : ''}`}>
            <dt className="text-[12px] text-white/40">{t}</dt>
            <dd className="mono mt-2 text-3xl text-white">{loadingStats ? '–' : (v ?? '—')}</dd>
            {sub && !loadingStats && <p className="mono mt-1 text-[11px] text-white/35">{sub}</p>}
          </div>
        ))}
      </dl>

      {/* Review queue */}
      {pendingTotal > 0 && (
        <button
          onClick={() => { setTab('providers'); setVerifFilter('pending'); setSearch(''); }}
          className="group mb-14 flex w-full items-center justify-between gap-4 border-l-2 border-amber-300 py-3 pl-5 text-left">
          <span>
            <span className="mono block text-[10px] uppercase tracking-[0.16em] text-amber-300">Needs you</span>
            <span className="mt-1 block text-[17px] text-white">
              {pendingTotal} {pendingTotal === 1 ? 'ID is' : 'IDs are'} waiting for review
            </span>
          </span>
          <span className="inline-flex items-center gap-1.5 text-[13px] text-white/60 transition group-hover:text-amber-300">
            Start reviewing <ArrowRight size={14} />
          </span>
        </button>
      )}

      {/* Tabs */}
      <div className="mb-6 flex gap-6 border-b border-white/10 text-[14px]">
        {TABS.map((t) => {
          const on = tab === t.id;
          return (
            <button key={t.id} onClick={() => { setTab(t.id); setVerifFilter(''); setSearch(''); }}
              className={`relative pb-3 transition-colors ${on ? 'text-white' : 'text-white/45 hover:text-white/80'}`}>
              {t.label}
              {t.count != null && <span className="mono ml-2 text-[11px] text-white/30">{t.count}</span>}
              {on && <span className="absolute -bottom-px left-0 right-0 h-px bg-green-400" />}
            </button>
          );
        })}
      </div>

      {/* Search + filter */}
      <div className="mb-2 flex flex-wrap items-end gap-6">
        <div className="group flex min-w-[220px] flex-1 items-center border-b border-white/15 pb-2.5 transition-colors focus-within:border-green-400">
          <Search size={16} className="mr-3 shrink-0 text-white/35 group-focus-within:text-green-400" />
          <input value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Name, email, phone or area"
            className="min-w-0 flex-1 bg-transparent text-[15px] text-white outline-none placeholder:text-white/25" />
          {search && (
            <button onClick={() => setSearch('')} aria-label="Clear search" className="ml-2 text-white/30 hover:text-white"><X size={15} /></button>
          )}
        </div>
        {tab === 'providers' && (
          <select value={verifFilter} onChange={(e) => setVerifFilter(e.target.value)}
            aria-label="Filter by verification"
            className="border-b border-white/15 bg-transparent pb-2.5 text-[14px] text-white/80 outline-none focus:border-green-400">
            <option value="">All statuses</option>
            <option value="pending">To review</option>
            <option value="verified">Verified</option>
            <option value="rejected">Rejected</option>
            <option value="unsubmitted">Not submitted</option>
          </select>
        )}
        <p className="mono pb-2.5 text-[11px] text-white/35">{filtered.length} shown</p>
      </div>

      {/* List */}
      <div className="border-t border-white/10">
        {loadingUsers ? (
          <ul>
            {[0, 1, 2, 3, 4].map((i) => (
              <li key={i} className="flex items-center gap-4 border-b border-white/[0.07] py-5">
                <div className="h-9 w-9 animate-pulse rounded-full bg-white/[0.06]" />
                <div className="flex-1 space-y-2"><div className="h-3 w-1/3 animate-pulse bg-white/[0.07]" /><div className="h-3 w-1/2 animate-pulse bg-white/[0.04]" /></div>
              </li>
            ))}
          </ul>
        ) : usersFailed ? (
          <div className="py-14">
            <p className="text-[15px] text-white/60">Couldn’t load users.</p>
            <button onClick={fetchUsers} className="mt-4 border-b border-green-400 pb-0.5 text-[14px] text-white hover:text-green-400">Try again</button>
          </div>
        ) : filtered.length === 0 ? (
          <p className="py-14 text-[15px] text-white/45">
            {search ? 'Nobody matches that search.' : verifFilter === 'pending' ? 'Queue’s clear. Nothing waiting for review.' : 'Nobody here yet.'}
          </p>
        ) : (
          <ul>
            {filtered.map((u) => {
              const open = expanded === u._id;
              const isMe = u._id === myId;
              const busy = busyId === u._id;
              return (
                <li key={u._id} className="border-b border-white/[0.07]">
                  <button onClick={() => setExpanded(open ? null : u._id)} aria-expanded={open}
                    className="flex w-full items-center gap-4 py-4 text-left transition-colors hover:bg-white/[0.02] md:px-2">
                    <div className={`flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full text-[13px] font-semibold ${u.isSuspended ? 'bg-white/10 text-white/50' : 'bg-green-400 text-[#080f0a]'}`}>
                      {u.avatar ? <img src={u.avatar} alt="" className="h-full w-full object-cover" /> : u.name?.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="flex items-center gap-2 truncate text-[15px] text-white">
                        <span className="truncate">{u.name}</span>
                        {isMe && <span className="mono text-[10px] uppercase tracking-[0.12em] text-white/35">You</span>}
                        {u.isSuspended && <span className="mono text-[10px] uppercase tracking-[0.12em] text-red-400">Suspended</span>}
                      </p>
                      <p className="truncate text-[13px] text-white/40">{u.email}</p>
                    </div>
                    <div className="hidden shrink-0 items-center gap-6 sm:flex">
                      {u.role === 'provider' ? <Status value={u.verificationStatus} /> : <span className="mono text-[11px] text-white/35">Joined {fmtDate(u.createdAt)}</span>}
                    </div>
                    <ChevronDown size={16} className={`shrink-0 text-white/30 transition-transform ${open ? 'rotate-180 text-green-400' : ''}`} />
                  </button>

                  {open && (
                    <div className="pb-6 md:px-2">
                      <div className="mb-4 sm:hidden">{u.role === 'provider' && <Status value={u.verificationStatus} />}</div>
                      <dl className="grid grid-cols-2 gap-x-6 gap-y-4 border-t border-white/[0.07] pt-5 sm:grid-cols-4">
                        {[['Phone', u.phone], ['Area', u.location], ['Joined', fmtDate(u.createdAt)], ['Role', u.role]].map(([k, v]) => (
                          <div key={k}>
                            <dt className="mono text-[10px] uppercase tracking-[0.14em] text-white/30">{k}</dt>
                            <dd className={`mt-1 text-[14px] capitalize text-white/85 ${k === 'Phone' ? 'mono normal-case' : ''}`}>{v || '—'}</dd>
                          </div>
                        ))}
                      </dl>
                      {u.bio && <p className="mt-5 max-w-2xl text-[14px] leading-relaxed text-white/55">{u.bio}</p>}
                      {u.skills?.length > 0 && <p className="mono mt-3 text-[12px] text-white/40">{u.skills.join(' · ')}</p>}
                      {u.isSuspended && u.suspendedReason && (
                        <p className="mt-4 border-l-2 border-red-400 pl-3 text-[13px] text-red-300">Suspended: {u.suspendedReason}</p>
                      )}

                      <div className="mt-6 flex flex-wrap items-center gap-2">
                        {u.role === 'provider' && u.verificationDoc && (
                          <button onClick={() => openDoc(u)}
                            className="inline-flex items-center gap-2 rounded-full bg-green-400 px-4 py-2 text-[13px] font-medium text-[#080f0a] transition hover:bg-green-300">
                            {u.verificationStatus === 'pending' ? 'Review ID' : 'View ID'}
                          </button>
                        )}
                        <Link href={`/profile/${u._id}`} className={btnGhost}>Public profile <ArrowUpRight size={13} /></Link>
                        {!isMe && u.role !== 'admin' && (
                          <>
                            {u.isSuspended ? (
                              <button onClick={() => handleUserAction(u, 'unsuspend')} disabled={busy} className={btnGhost}>
                                {busy && <Loader2 size={13} className="animate-spin" />} Unsuspend
                              </button>
                            ) : (
                              <button onClick={() => setConfirmModal({ user: u, action: 'suspend' })} className={btnGhost}>Suspend</button>
                            )}
                            <button onClick={() => { setConfirmModal({ user: u, action: 'delete' }); setDeleteTyped(''); }}
                              className="rounded-full px-3 py-2 text-[13px] text-red-400/80 transition hover:text-red-300">
                              Delete
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* ─── ID review ─── */}
      {docModal && (
        <Modal onClose={closeDoc} wide>
          <div className="p-6 md:p-8">
            <p className="mono mb-3 text-[10px] uppercase tracking-[0.16em] text-white/35">ID review</p>
            <h2 className="serif pr-8 text-3xl leading-tight">{docModal.name}</h2>
            <p className="mt-1 text-[13px] text-white/45">{docModal.email}{docModal.phone ? ` · ${docModal.phone}` : ''}</p>

            <dl className="mt-6 grid grid-cols-2 gap-x-6 gap-y-4 border-y border-white/10 py-5 sm:grid-cols-4">
              {[['Status', <Status key="s" value={docModal.verificationStatus} />], ['Submitted', fmtDate(docModal.verificationSubmittedAt)], ['Area', docModal.location || '—'], ['Services', docModal.skills?.join(', ') || '—']].map(([k, v]) => (
                <div key={k}>
                  <dt className="mono text-[10px] uppercase tracking-[0.14em] text-white/30">{k}</dt>
                  <dd className="mt-1 text-[13px] text-white/85">{v}</dd>
                </div>
              ))}
            </dl>

            <div className="mt-6">
              {docBroken ? (
                <div className="flex h-48 flex-col items-center justify-center border border-white/10 text-center">
                  <p className="text-[14px] text-white/55">Can’t preview this file here.</p>
                  <a href={docModal.verificationDoc} target="_blank" rel="noopener noreferrer"
                    className="mt-3 inline-flex items-center gap-1.5 text-[13px] text-green-400 hover:underline underline-offset-4">
                    Open it in a new tab <ArrowUpRight size={13} />
                  </a>
                </div>
              ) : (
                <a href={docModal.verificationDoc} target="_blank" rel="noopener noreferrer" className="group relative block border border-white/10 bg-white/[0.02]">
                  <img src={docModal.verificationDoc} alt={`ID submitted by ${docModal.name}`}
                    onError={() => setDocBroken(true)} className="mx-auto max-h-[22rem] w-auto object-contain" />
                  <span className="mono absolute bottom-2 right-2 bg-[#080f0a]/80 px-2 py-1 text-[10px] uppercase tracking-[0.12em] text-white/70 opacity-0 transition group-hover:opacity-100">
                    Full size ↗
                  </span>
                </a>
              )}
              <p className="mt-3 text-[12px] text-white/35">Check the name matches <span className="text-white/70">“{docModal.name}”</span> and the photo is clear and current.</p>
            </div>

            {docModal.verificationStatus === 'rejected' && docModal.verificationRejectionReason && (
              <p className="mt-5 border-l-2 border-red-400 pl-3 text-[13px] text-red-300">Last time: {docModal.verificationRejectionReason}</p>
            )}

            {showRejectInput ? (
              <div className="mt-8">
                <p className={label}>Why? This is sent to {docModal.name?.split(' ')[0]}</p>
                <div className="mb-4 flex flex-wrap gap-2">
                  {REJECT_REASONS.map((r) => (
                    <button key={r} type="button" onClick={() => setRejectReason(r)}
                      className={`rounded-full border px-3 py-1.5 text-left text-[12px] transition ${rejectReason === r ? 'border-red-400 text-red-300' : 'border-white/15 text-white/60 hover:border-white/40 hover:text-white'}`}>
                      {r.split('.')[0]}
                    </button>
                  ))}
                </div>
                <textarea value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} rows={3}
                  placeholder="Or write your own"
                  className="w-full resize-none border-b border-white/15 bg-transparent pb-3 text-[15px] leading-relaxed text-white outline-none placeholder:text-white/20 focus:border-green-400" />
                <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row">
                  <button onClick={() => setShowRejectInput(false)} className={`${btnGhost} flex-1 py-3`}>Back</button>
                  <button onClick={() => handleVerify(docModal, 'reject', rejectReason.trim())}
                    disabled={busyId === docModal._id || !rejectReason.trim()}
                    className="inline-flex flex-1 items-center justify-center gap-2 rounded-full bg-red-500 px-5 py-3 text-[14px] font-medium text-white transition hover:bg-red-400 disabled:opacity-40">
                    {busyId === docModal._id && <Loader2 size={15} className="animate-spin" />} Reject and notify
                  </button>
                </div>
              </div>
            ) : docModal.verificationStatus !== 'verified' ? (
              <div className="mt-8 flex flex-col-reverse gap-3 sm:flex-row">
                <button onClick={() => setShowRejectInput(true)} disabled={busyId === docModal._id} className={`${btnGhost} flex-1 py-3`}>Reject</button>
                <button onClick={() => handleVerify(docModal, 'verify')} disabled={busyId === docModal._id}
                  className="inline-flex flex-1 items-center justify-center gap-2 rounded-full bg-green-400 px-5 py-3 text-[14px] font-medium text-[#080f0a] transition hover:bg-green-300 disabled:opacity-50">
                  {busyId === docModal._id && <Loader2 size={15} className="animate-spin" />} Approve
                </button>
              </div>
            ) : (
              <div className="mt-8">
                <button onClick={() => setShowRejectInput(true)} className="text-[13px] text-red-400/80 transition hover:text-red-300">
                  Remove verification
                </button>
              </div>
            )}
          </div>
        </Modal>
      )}

      {/* ─── Suspend / delete ─── */}
      {confirmModal && (() => {
        const { user, action } = confirmModal;
        const isDelete = action === 'delete';
        const busy = busyId === user._id;
        const typedOk = deleteTyped.trim().toLowerCase() === (user.name || '').trim().toLowerCase();
        const close = () => { if (!busy) { setConfirmModal(null); setSuspendReason(''); setDeleteTyped(''); } };
        return (
          <Modal onClose={close}>
            <div className="p-7">
              <p className={`mono mb-4 text-[10px] uppercase tracking-[0.16em] ${isDelete ? 'text-red-400' : 'text-amber-300'}`}>{isDelete ? 'Delete account' : 'Suspend account'}</p>
              <h2 className="serif pr-8 text-3xl leading-tight">{isDelete ? 'Delete' : 'Suspend'} {user.name}?</h2>
              <p className="mt-1 text-[13px] text-white/40">{user.email}</p>
              <p className="mt-5 text-[14px] leading-relaxed text-white/60">
                {isDelete
                  ? 'Their account and data are removed for good. This can’t be undone. If you might want them back, suspend instead.'
                  : 'They won’t be able to log in until you unsuspend them. Nothing is deleted.'}
              </p>

              {isDelete ? (
                <div className="mt-6">
                  <label htmlFor="confirm-name" className={label}>Type their name to confirm</label>
                  <input id="confirm-name" value={deleteTyped} onChange={(e) => setDeleteTyped(e.target.value)} placeholder={user.name} autoComplete="off"
                    className="w-full border-b border-white/15 bg-transparent pb-3 text-[15px] text-white outline-none placeholder:text-white/20 focus:border-red-400" />
                </div>
              ) : (
                <div className="mt-6">
                  <label htmlFor="suspend-reason" className={label}>Reason <span className="normal-case tracking-normal text-white/25">· optional, sent to them</span></label>
                  <textarea id="suspend-reason" value={suspendReason} onChange={(e) => setSuspendReason(e.target.value)} rows={2}
                    placeholder="e.g. Several clients reported no-shows."
                    className="w-full resize-none border-b border-white/15 bg-transparent pb-3 text-[15px] text-white outline-none placeholder:text-white/20 focus:border-green-400" />
                </div>
              )}

              <div className="mt-8 flex flex-col-reverse gap-3 sm:flex-row">
                <button onClick={close} disabled={busy} className={`${btnGhost} flex-1 py-3`}>Cancel</button>
                <button onClick={() => handleUserAction(user, action, suspendReason.trim())}
                  disabled={busy || (isDelete && !typedOk)}
                  className={`inline-flex flex-1 items-center justify-center gap-2 rounded-full px-5 py-3 text-[14px] font-medium transition disabled:opacity-40 ${isDelete ? 'bg-red-500 text-white hover:bg-red-400' : 'bg-amber-300 text-[#080f0a] hover:bg-amber-200'}`}>
                  {busy && <Loader2 size={15} className="animate-spin" />} {isDelete ? 'Delete for good' : 'Suspend'}
                </button>
              </div>
            </div>
          </Modal>
        );
      })()}
    </div>
  );
}