'use client';
import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import {
  Loader2, ShieldCheck, ShieldX, Clock, Users, Briefcase,
  ExternalLink, X, ShieldAlert, Search, Ban, CheckCircle,
  Trash2, ChevronDown, Filter, TrendingUp, AlertTriangle,
  Eye, RefreshCw, UserCheck, UserX, CreditCard,
} from 'lucide-react';
import Link from 'next/link';

// ── Styles ────────────────────────────────────────────────────────────────────
const glass = {
  background:          'rgba(255,255,255,0.04)',
  border:              '1px solid rgba(255,255,255,0.08)',
  backdropFilter:      'blur(12px)',
  WebkitBackdropFilter:'blur(12px)',
};

const STATUS_STYLES = {
  verified:    { color: '#4ade80', bg: 'rgba(74,222,128,0.12)',   label: 'Verified',       icon: ShieldCheck  },
  pending:     { color: '#facc15', bg: 'rgba(250,204,21,0.12)',   label: 'Pending Review', icon: Clock        },
  rejected:    { color: '#f87171', bg: 'rgba(248,113,113,0.12)', label: 'Rejected',       icon: ShieldX      },
  unsubmitted: { color: '#ffffff40', bg: 'rgba(255,255,255,0.06)', label: 'Not Submitted', icon: ShieldAlert  },
};

// ── Small reusable components ─────────────────────────────────────────────────
function StatusPill({ status }) {
  const s = STATUS_STYLES[status] || STATUS_STYLES.unsubmitted;
  const Icon = s.icon;
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold"
      style={{ background: s.bg, color: s.color }}>
      <Icon size={11} /> {s.label}
    </span>
  );
}

function StatCard({ label, value, icon: Icon, color, sub }) {
  return (
    <div className="p-5 rounded-2xl flex flex-col gap-2" style={glass}>
      <div className="flex items-center justify-between">
        <p className="text-xs text-white/35 font-medium">{label}</p>
        <div className="w-8 h-8 rounded-lg flex items-center justify-center"
          style={{ background: `${color}20` }}>
          <Icon size={15} style={{ color }} />
        </div>
      </div>
      <p className="text-2xl font-bold text-white tabular-nums">{value ?? '—'}</p>
      {sub && <p className="text-xs text-white/25">{sub}</p>}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export default function AdminDashboard() {
  const { data: session, status } = useSession();
  const router = useRouter();

  // Data
  const [stats,        setStats]        = useState(null);
  const [users,        setUsers]        = useState([]);
  const [loadingStats, setLoadingStats] = useState(true);
  const [loadingUsers, setLoadingUsers] = useState(true);

  // Filters
  const [tab,                setTab]                = useState('providers'); // providers | clients | suspended
  const [search,             setSearch]             = useState('');
  const [verifFilter,        setVerifFilter]        = useState('');          // pending | verified | rejected | unsubmitted
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);

  // Modals
  const [docModal,         setDocModal]         = useState(null);
  const [confirmModal,     setConfirmModal]     = useState(null); // { user, action }
  const [rejectReason,     setRejectReason]     = useState('');
  const [suspendReason,    setSuspendReason]    = useState('');
  const [showRejectInput,  setShowRejectInput]  = useState(false);
  const [actionLoading,    setActionLoading]    = useState(false);

  // ── Auth guard ──────────────────────────────────────────────────────────────
  useEffect(() => {
    if (status === 'unauthenticated') router.push('/login');
  }, [status]);

  // ── Fetch stats ─────────────────────────────────────────────────────────────
  const fetchStats = useCallback(async () => {
    setLoadingStats(true);
    try {
      const res = await fetch('/api/admin/stats');
      if (res.ok) setStats(await res.json());
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingStats(false);
    }
  }, []);

  // ── Fetch users ─────────────────────────────────────────────────────────────
  const fetchUsers = useCallback(async () => {
    if (!session || session.user.role !== 'admin') return;
    setLoadingUsers(true);
    try {
      const params = new URLSearchParams();
      if (tab === 'providers')  params.set('role', 'provider');
      if (tab === 'clients')    params.set('role', 'client');
      if (tab === 'suspended')  params.set('isSuspended', 'true');
      if (verifFilter)          params.set('verificationStatus', verifFilter);

      const res = await fetch(`/api/admin/users?${params}`);
      if (res.ok) setUsers(await res.json());
    } catch (e) {
      toast.error('Failed to load users');
    } finally {
      setLoadingUsers(false);
    }
  }, [session, tab, verifFilter]);

  useEffect(() => { fetchStats(); }, [fetchStats]);
  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  // ── Search filter (client-side) ─────────────────────────────────────────────
  const filtered = users.filter(u => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      u.name?.toLowerCase().includes(q)  ||
      u.email?.toLowerCase().includes(q) ||
      u.phone?.toLowerCase().includes(q) ||
      u.location?.toLowerCase().includes(q)
    );
  });

  // ── Verification action ─────────────────────────────────────────────────────
  const handleVerify = async (userId, action, reason) => {
    setActionLoading(true);
    try {
      const res = await fetch(`/api/admin/users/${userId}/verify`, {
        method:  'PUT',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ action, reason }),
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error || 'Action failed'); return; }
      toast.success(data.message);
      setUsers(prev => prev.map(u => u._id === userId ? data.user : u));
      setDocModal(null);
      setShowRejectInput(false);
      setRejectReason('');
      fetchStats();
    } catch {
      toast.error('Something went wrong');
    } finally {
      setActionLoading(false);
    }
  };

  // ── Suspend / unsuspend / delete ────────────────────────────────────────────
  const handleUserAction = async (userId, action, reason) => {
    setActionLoading(true);
    try {
      const res = await fetch(`/api/admin/users/${userId}`, {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ action, reason }),
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error || 'Action failed'); return; }

      toast.success(data.message || 'Done');

      if (action === 'delete') {
        setUsers(prev => prev.filter(u => u._id !== userId));
      } else {
        setUsers(prev => prev.map(u => u._id === userId ? data.user : u));
      }

      setConfirmModal(null);
      setSuspendReason('');
      fetchStats();
    } catch {
      toast.error('Something went wrong');
    } finally {
      setActionLoading(false);
    }
  };

  // ── Guards ──────────────────────────────────────────────────────────────────
  if (status === 'loading') {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#080f0a]">
        <div className="w-10 h-10 rounded-full border-2 border-green-500/20 border-t-green-500 animate-spin" />
      </div>
    );
  }
  if (!session || session.user.role !== 'admin') return null;

  const pendingCount   = users.filter(u => u.verificationStatus === 'pending').length;
  const suspendedCount = users.filter(u => u.isSuspended).length;

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-[#080f0a] pb-32">
      <div className="max-w-5xl mx-auto px-4 py-10 space-y-8">

        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-green-400/60 mb-1">Admin Panel</p>
            <h1 className="text-3xl font-bold text-white">Dashboard</h1>
            <p className="text-white/30 text-sm mt-1">Manage users, verifications, and platform activity</p>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/admin/payments"
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition"
              style={{ background: 'rgba(74,222,128,0.12)', color: '#4ade80', border: '1px solid rgba(74,222,128,0.25)' }}>
              <CreditCard size={15} /> Payments
            </Link>
            <button onClick={() => { fetchStats(); fetchUsers(); }}
              className="p-2.5 rounded-xl transition hover:bg-white/5"
              style={{ color: 'rgba(255,255,255,0.4)' }}
              title="Refresh">
              <RefreshCw size={16} />
            </button>
          </div>
        </div>

        {/* ── Stats grid ──────────────────────────────────────────────────── */}
        {loadingStats ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="p-5 rounded-2xl animate-pulse h-24" style={glass} />
            ))}
          </div>
        ) : stats && (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <StatCard label="Total Users"      value={stats.totalUsers}      icon={Users}       color="#4ade80" sub={`+${stats.newUsersThisWeek} this week`} />
              <StatCard label="Clients"          value={stats.totalClients}    icon={Users}       color="#60a5fa" />
              <StatCard label="Providers"        value={stats.totalProviders}  icon={Briefcase}   color="#a78bfa" />
              <StatCard label="Suspended"        value={stats.suspendedUsers}  icon={Ban}         color="#f87171" />
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <StatCard label="Pending Review"   value={stats.pendingVerifications}  icon={Clock}       color="#facc15" sub="Need your attention" />
              <StatCard label="Verified"         value={stats.verifiedProviders}     icon={ShieldCheck} color="#4ade80" />
              <StatCard label="Rejected"         value={stats.rejectedVerifications} icon={ShieldX}     color="#f87171" />
              <StatCard label="Open Jobs"        value={stats.openJobs}             icon={TrendingUp}  color="#34d399" sub={`of ${stats.totalJobs} total`} />
            </div>

            {/* Pending verification alert */}
            {stats.pendingVerifications > 0 && (
              <button
                onClick={() => { setTab('providers'); setVerifFilter('pending'); }}
                className="w-full flex items-center gap-4 p-4 rounded-2xl transition hover:brightness-110 text-left"
                style={{ background: 'rgba(250,204,21,0.08)', border: '1px solid rgba(250,204,21,0.2)' }}>
                <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                  style={{ background: 'rgba(250,204,21,0.15)' }}>
                  <AlertTriangle size={18} style={{ color: '#facc15' }} />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-white">
                    {stats.pendingVerifications} provider{stats.pendingVerifications > 1 ? 's' : ''} waiting for verification
                  </p>
                  <p className="text-xs text-white/35 mt-0.5">
                    Click to filter and review submitted documents
                  </p>
                </div>
                <span className="text-yellow-400 text-xs font-semibold">Review →</span>
              </button>
            )}
          </>
        )}

        {/* ── Tabs ────────────────────────────────────────────────────────── */}
        <div className="flex flex-wrap gap-2">
          {[
            { id: 'providers', label: 'Providers', icon: Briefcase, badge: pendingCount > 0 ? `${pendingCount} pending` : null },
            { id: 'clients',   label: 'Clients',   icon: Users },
            { id: 'suspended', label: 'Suspended', icon: Ban, badge: suspendedCount > 0 ? suspendedCount : null },
          ].map(t => {
            const Icon    = t.icon;
            const active  = tab === t.id;
            return (
              <button key={t.id}
                onClick={() => { setTab(t.id); setVerifFilter(''); setSearch(''); }}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition"
                style={{
                  background: active ? 'rgba(74,222,128,0.12)' : 'rgba(255,255,255,0.04)',
                  color:      active ? '#4ade80' : 'rgba(255,255,255,0.5)',
                  border:     `1px solid ${active ? 'rgba(74,222,128,0.25)' : 'rgba(255,255,255,0.08)'}`,
                }}>
                <Icon size={14} />
                {t.label}
                {t.badge && (
                  <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold text-white"
                    style={{ background: '#16a34a' }}>
                    {t.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* ── Search + filter bar ──────────────────────────────────────────── */}
        <div className="flex gap-3 flex-wrap">
          {/* Search */}
          <div className="flex-1 min-w-[200px] relative">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
              style={{ color: 'rgba(255,255,255,0.25)' }} />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search name, email, phone, location…"
              className="w-full pl-9 pr-4 py-2.5 rounded-xl text-sm outline-none"
              style={{
                background:  'rgba(255,255,255,0.05)',
                border:      '1px solid rgba(255,255,255,0.1)',
                color:       'white',
              }}
            />
          </div>

          {/* Verification filter (providers only) */}
          {tab === 'providers' && (
            <div className="relative">
              <button
                onClick={() => setShowFilterDropdown(!showFilterDropdown)}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition"
                style={{
                  background: verifFilter ? 'rgba(74,222,128,0.1)' : 'rgba(255,255,255,0.05)',
                  border:     `1px solid ${verifFilter ? 'rgba(74,222,128,0.25)' : 'rgba(255,255,255,0.1)'}`,
                  color:      verifFilter ? '#4ade80' : 'rgba(255,255,255,0.5)',
                }}>
                <Filter size={14} />
                {verifFilter ? STATUS_STYLES[verifFilter]?.label : 'All statuses'}
                <ChevronDown size={13} />
              </button>
              {showFilterDropdown && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setShowFilterDropdown(false)} />
                  <div className="absolute right-0 top-full mt-2 z-20 w-48 rounded-xl overflow-hidden"
                    style={{ background: '#0d1410', border: '1px solid rgba(255,255,255,0.1)', boxShadow: '0 8px 32px rgba(0,0,0,0.4)' }}>
                    {[
                      { value: '',            label: 'All statuses' },
                      { value: 'pending',     label: 'Pending Review' },
                      { value: 'verified',    label: 'Verified' },
                      { value: 'rejected',    label: 'Rejected' },
                      { value: 'unsubmitted', label: 'Not Submitted' },
                    ].map(opt => (
                      <button key={opt.value}
                        onClick={() => { setVerifFilter(opt.value); setShowFilterDropdown(false); }}
                        className="w-full px-4 py-2.5 text-left text-sm transition hover:bg-white/5"
                        style={{ color: verifFilter === opt.value ? '#4ade80' : 'rgba(255,255,255,0.6)' }}>
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}

          {/* Result count */}
          <div className="flex items-center px-3 text-xs"
            style={{ color: 'rgba(255,255,255,0.25)' }}>
            {filtered.length} user{filtered.length !== 1 ? 's' : ''}
          </div>
        </div>

        {/* ── User list ────────────────────────────────────────────────────── */}
        <div className="rounded-2xl overflow-hidden" style={glass}>
          {loadingUsers ? (
            <div className="p-12 flex items-center justify-center">
              <Loader2 size={24} className="animate-spin text-green-400" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="p-12 text-center">
              <Users size={32} className="mx-auto mb-3" style={{ color: 'rgba(255,255,255,0.1)' }} />
              <p className="text-white/30 text-sm">No users found</p>
            </div>
          ) : (
            <div className="divide-y" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
              {filtered.map(u => (
                <UserRow
                  key={u._id}
                  user={u}
                  tab={tab}
                  onReview={() => setDocModal(u)}
                  onSuspend={() => { setConfirmModal({ user: u, action: 'suspend' }); }}
                  onUnsuspend={() => handleUserAction(u._id, 'unsuspend')}
                  onDelete={() => setConfirmModal({ user: u, action: 'delete' })}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Document review modal ────────────────────────────────────────── */}
      {docModal && (
        <Modal onClose={() => { setDocModal(null); setShowRejectInput(false); setRejectReason(''); }}>
          <div className="px-5 py-4 flex items-center justify-between border-b" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
            <div>
              <p className="text-sm font-semibold text-white">{docModal.name}</p>
              <p className="text-xs text-white/30">{docModal.email} · {docModal.phone || 'No phone'}</p>
            </div>
            <button onClick={() => { setDocModal(null); setShowRejectInput(false); setRejectReason(''); }}
              className="p-1.5 rounded-lg text-white/30 hover:text-white/60 transition">
              <X size={18} />
            </button>
          </div>

          <div className="p-5 space-y-4">
            {/* Provider info */}
            <div className="grid grid-cols-2 gap-3 text-xs">
              {[
                { label: 'Location', value: docModal.location || '—' },
                { label: 'Status',   value: <StatusPill status={docModal.verificationStatus} /> },
                { label: 'Skills',   value: docModal.skills?.join(', ') || '—' },
                { label: 'Submitted',value: docModal.verificationSubmittedAt
                    ? new Date(docModal.verificationSubmittedAt).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' })
                    : '—' },
              ].map(row => (
                <div key={row.label} className="p-3 rounded-xl" style={{ background: 'rgba(255,255,255,0.04)' }}>
                  <p className="text-white/30 mb-1">{row.label}</p>
                  <p className="text-white font-medium">{row.value}</p>
                </div>
              ))}
            </div>

            {/* Document image */}
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-white/30 mb-2">Submitted Document</p>
              <a href={docModal.verificationDoc} target="_blank" rel="noopener noreferrer"
                className="block relative group rounded-xl overflow-hidden"
                style={{ border: '1px solid rgba(255,255,255,0.1)' }}>
                <img src={docModal.verificationDoc} alt="Verification document"
                  className="w-full max-h-72 object-contain"
                  style={{ background: 'rgba(255,255,255,0.02)' }} />
                <div className="absolute top-2 right-2 p-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition"
                  style={{ background: 'rgba(0,0,0,0.7)' }}>
                  <ExternalLink size={13} className="text-white" />
                </div>
                <div className="absolute bottom-0 left-0 right-0 py-2 text-center text-xs text-white/50 opacity-0 group-hover:opacity-100 transition"
                  style={{ background: 'rgba(0,0,0,0.5)' }}>
                  Click to open full size ↗
                </div>
              </a>
            </div>

            {/* Previous rejection reason */}
            {docModal.verificationStatus === 'rejected' && docModal.verificationRejectionReason && (
              <div className="p-3 rounded-xl text-xs" style={{ background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.2)' }}>
                <p className="text-red-400/70 mb-1">Previous rejection reason:</p>
                <p className="text-red-300">{docModal.verificationRejectionReason}</p>
              </div>
            )}

            {/* Action buttons */}
            {showRejectInput ? (
              <div>
                <label className="block text-xs font-semibold uppercase tracking-widest text-white/40 mb-2">
                  Reason for rejection <span className="text-red-400">*</span>
                </label>
                <textarea
                  value={rejectReason}
                  onChange={e => setRejectReason(e.target.value)}
                  rows={3}
                  placeholder="e.g. Document is blurry. Please re-upload a clearer photo of your ID."
                  className="w-full px-4 py-3 rounded-xl text-sm outline-none resize-none"
                  style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: 'white' }}
                />
                <div className="flex gap-3 mt-3">
                  <button onClick={() => setShowRejectInput(false)}
                    className="flex-1 py-2.5 rounded-xl text-sm font-semibold"
                    style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.6)' }}>
                    Cancel
                  </button>
                  <button
                    onClick={() => handleVerify(docModal._id, 'reject', rejectReason)}
                    disabled={actionLoading || !rejectReason.trim()}
                    className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-50 flex items-center justify-center gap-2"
                    style={{ background: 'rgba(239,68,68,0.85)' }}>
                    {actionLoading ? <Loader2 size={15} className="animate-spin" /> : <><ShieldX size={15} /> Confirm Rejection</>}
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex gap-3">
                <button onClick={() => setShowRejectInput(true)} disabled={actionLoading}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition disabled:opacity-50"
                  style={{ background: 'rgba(239,68,68,0.12)', color: '#f87171', border: '1px solid rgba(239,68,68,0.25)' }}>
                  <ShieldX size={15} /> Reject
                </button>
                <button onClick={() => handleVerify(docModal._id, 'verify')} disabled={actionLoading}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold text-white transition disabled:opacity-50"
                  style={{ background: 'linear-gradient(135deg,#16a34a,#15803d)' }}>
                  {actionLoading ? <Loader2 size={15} className="animate-spin" /> : <><ShieldCheck size={15} /> Verify Provider</>}
                </button>
              </div>
            )}
          </div>
        </Modal>
      )}

      {/* ── Suspend / Delete confirm modal ───────────────────────────────── */}
      {confirmModal && (
        <Modal onClose={() => { setConfirmModal(null); setSuspendReason(''); }}>
          <div className="p-5">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center"
                style={{ background: confirmModal.action === 'delete' ? 'rgba(239,68,68,0.15)' : 'rgba(250,204,21,0.15)' }}>
                {confirmModal.action === 'delete'
                  ? <Trash2 size={18} style={{ color: '#f87171' }} />
                  : <Ban size={18} style={{ color: '#facc15' }} />
                }
              </div>
              <div>
                <p className="text-white font-semibold text-sm">
                  {confirmModal.action === 'delete' ? 'Delete' : 'Suspend'} {confirmModal.user.name}?
                </p>
                <p className="text-white/30 text-xs">{confirmModal.user.email}</p>
              </div>
            </div>

            <p className="text-white/40 text-sm mb-4">
              {confirmModal.action === 'delete'
                ? 'This is permanent and cannot be undone. All their data will be removed.'
                : 'The user will be blocked from logging in. You can unsuspend them at any time.'
              }
            </p>

            {confirmModal.action === 'suspend' && (
              <textarea
                value={suspendReason}
                onChange={e => setSuspendReason(e.target.value)}
                rows={2}
                placeholder="Reason for suspension (optional — sent to user)"
                className="w-full px-4 py-3 rounded-xl text-sm outline-none resize-none mb-4"
                style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: 'white' }}
              />
            )}

            <div className="flex gap-3">
              <button onClick={() => { setConfirmModal(null); setSuspendReason(''); }}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold"
                style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.6)' }}>
                Cancel
              </button>
              <button
                onClick={() => handleUserAction(
                  confirmModal.user._id,
                  confirmModal.action,
                  suspendReason
                )}
                disabled={actionLoading}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-50 flex items-center justify-center gap-2"
                style={{ background: confirmModal.action === 'delete' ? 'rgba(239,68,68,0.85)' : 'rgba(234,179,8,0.85)' }}>
                {actionLoading
                  ? <Loader2 size={15} className="animate-spin" />
                  : confirmModal.action === 'delete' ? 'Delete Permanently' : 'Suspend User'
                }
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ── User row ──────────────────────────────────────────────────────────────────
function UserRow({ user, tab, onReview, onSuspend, onUnsuspend, onDelete }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
      {/* Main row */}
      <div className="px-5 py-4 flex items-center gap-4">
        {/* Avatar */}
        <div className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm shrink-0"
          style={{ background: user.isSuspended ? '#374151' : 'linear-gradient(135deg,#16a34a,#15803d)' }}>
          {user.avatar
            ? <img src={user.avatar} alt="" className="w-10 h-10 rounded-full object-cover" />
            : user.name?.charAt(0).toUpperCase()
          }
        </div>

        {/* Name + email */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-sm font-semibold text-white truncate">{user.name}</p>
            {user.isSuspended && (
              <span className="text-[10px] px-2 py-0.5 rounded-full font-bold"
                style={{ background: 'rgba(239,68,68,0.15)', color: '#f87171' }}>
                SUSPENDED
              </span>
            )}
            {tab === 'providers' && user.verificationStatus === 'verified' && (
              <ShieldCheck size={13} className="text-green-400 shrink-0" />
            )}
          </div>
          <p className="text-xs text-white/30 truncate">{user.email}</p>
        </div>

        {/* Right side */}
        <div className="flex items-center gap-3 shrink-0">
          {tab === 'providers' && <StatusPill status={user.verificationStatus} />}

          {tab === 'clients' && (
            <span className="text-xs text-white/20">
              {new Date(user.createdAt).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' })}
            </span>
          )}

          {/* Expand button */}
          <button onClick={() => setExpanded(!expanded)}
            className="p-1.5 rounded-lg transition hover:bg-white/5"
            style={{ color: expanded ? '#4ade80' : 'rgba(255,255,255,0.3)' }}>
            <ChevronDown size={15} style={{ transform: expanded ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
          </button>
        </div>
      </div>

      {/* Expanded detail */}
      {expanded && (
        <div className="px-5 pb-4 space-y-3" style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
          {/* Info grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-3">
            {[
              { label: 'Phone',    value: user.phone    || '—' },
              { label: 'Location', value: user.location || '—' },
              { label: 'Joined',   value: new Date(user.createdAt).toLocaleDateString('en-NG') },
              { label: 'Role',     value: user.role },
            ].map(item => (
              <div key={item.label} className="p-2.5 rounded-lg" style={{ background: 'rgba(255,255,255,0.03)' }}>
                <p className="text-[10px] text-white/25 uppercase tracking-wider mb-1">{item.label}</p>
                <p className="text-xs text-white font-medium capitalize">{item.value}</p>
              </div>
            ))}
          </div>

          {/* Bio */}
          {user.bio && (
            <p className="text-xs text-white/40 leading-relaxed px-1">{user.bio}</p>
          )}

          {/* Skills */}
          {user.skills?.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {user.skills.map(s => (
                <span key={s} className="text-[11px] px-2 py-0.5 rounded-full"
                  style={{ background: 'rgba(74,222,128,0.1)', color: '#4ade80', border: '1px solid rgba(74,222,128,0.2)' }}>
                  {s}
                </span>
              ))}
            </div>
          )}

          {/* Suspension reason */}
          {user.isSuspended && user.suspendedReason && (
            <div className="p-3 rounded-xl text-xs" style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }}>
              <span className="text-red-400/70">Suspension reason: </span>
              <span className="text-red-300">{user.suspendedReason}</span>
            </div>
          )}

          {/* Action buttons */}
          <div className="flex flex-wrap gap-2 pt-1">
            {/* Review doc (providers with submitted doc) */}
            {tab === 'providers' && user.verificationDoc && (
              <button onClick={onReview}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition"
                style={{ background: 'rgba(255,255,255,0.07)', color: 'rgba(255,255,255,0.7)' }}>
                <Eye size={12} /> Review Document
              </button>
            )}

            {/* Suspend / Unsuspend */}
            {user.isSuspended ? (
              <button onClick={onUnsuspend}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition"
                style={{ background: 'rgba(74,222,128,0.1)', color: '#4ade80', border: '1px solid rgba(74,222,128,0.2)' }}>
                <UserCheck size={12} /> Unsuspend
              </button>
            ) : (
              <button onClick={onSuspend}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition"
                style={{ background: 'rgba(250,204,21,0.1)', color: '#facc15', border: '1px solid rgba(250,204,21,0.2)' }}>
                <Ban size={12} /> Suspend
              </button>
            )}

            {/* Delete */}
            <button onClick={onDelete}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition"
              style={{ background: 'rgba(239,68,68,0.1)', color: '#f87171', border: '1px solid rgba(239,68,68,0.2)' }}>
              <Trash2 size={12} /> Delete
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Modal wrapper ─────────────────────────────────────────────────────────────
function Modal({ children, onClose }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.75)' }}
      onClick={onClose}>
      <div className="w-full max-w-lg rounded-2xl overflow-hidden"
        style={{ background: '#0d1410', border: '1px solid rgba(255,255,255,0.1)', maxHeight: '90vh', overflowY: 'auto' }}
        onClick={e => e.stopPropagation()}>
        {children}
      </div>
    </div>
  );
}