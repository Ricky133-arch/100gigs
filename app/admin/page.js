'use client';
import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import {
  Loader2, ShieldCheck, ShieldX, Clock, Users, Briefcase,
  ExternalLink, X, ShieldAlert,
} from 'lucide-react';

const glassCard = {
  background: 'rgba(255,255,255,0.04)',
  border: '1px solid rgba(255,255,255,0.08)',
  backdropFilter: 'blur(12px)',
  WebkitBackdropFilter: 'blur(12px)',
};

const STATUS_STYLES = {
  verified: { color: '#4ade80', bg: 'rgba(74,222,128,0.12)', label: 'Verified', icon: ShieldCheck },
  pending:  { color: '#facc15', bg: 'rgba(250,204,21,0.12)', label: 'Pending Review', icon: Clock },
  rejected: { color: '#f87171', bg: 'rgba(248,113,113,0.12)', label: 'Rejected', icon: ShieldX },
  unsubmitted: { color: 'rgba(255,255,255,0.35)', bg: 'rgba(255,255,255,0.06)', label: 'Not Submitted', icon: ShieldAlert },
};

function StatusPill({ status }) {
  const s = STATUS_STYLES[status] || STATUS_STYLES.unsubmitted;
  const Icon = s.icon;
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold"
      style={{ background: s.bg, color: s.color }}>
      <Icon size={12} /> {s.label}
    </span>
  );
}

export default function AdminDashboard() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [tab, setTab] = useState('providers'); // providers | clients
  const [users, setUsers] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [docModal, setDocModal] = useState(null); // user being reviewed
  const [rejectReason, setRejectReason] = useState('');
  const [showRejectInput, setShowRejectInput] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/login');
  }, [status]);

  useEffect(() => {
    if (!session) return;
    if (session.user.role !== 'admin') return;
    fetchUsers();
  }, [session, tab]);

  const fetchUsers = async () => {
    setLoadingUsers(true);
    try {
      const res = await fetch(`/api/admin/users?role=${tab === 'providers' ? 'provider' : 'client'}`);
      if (res.ok) {
        const data = await res.json();
        setUsers(data);
      }
    } catch (e) {
      console.error(e);
      toast.error('Failed to load users');
    } finally {
      setLoadingUsers(false);
    }
  };

  if (status === 'loading') {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#080f0a]">
        <div className="w-10 h-10 rounded-full border-2 border-green-500/20 border-t-green-500 animate-spin" />
      </div>
    );
  }

  if (!session) return null;

  if (session.user.role !== 'admin') {
    return (
      <div className="min-h-screen bg-[#080f0a] flex items-center justify-center px-4">
        <div className="text-center p-10 rounded-3xl max-w-md w-full" style={glassCard}>
          <ShieldAlert size={36} className="mx-auto mb-4" style={{ color: 'rgba(255,255,255,0.2)' }} />
          <h2 className="text-xl font-bold text-white mb-2">Admins Only</h2>
          <p className="text-white/40 text-sm">You don't have permission to view this page.</p>
        </div>
      </div>
    );
  }

  const handleVerify = async (userId, action, reason) => {
    setActionLoading(true);
    try {
      const res = await fetch(`/api/admin/users/${userId}/verify`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, reason }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || 'Action failed');
        return;
      }
      toast.success(data.message);
      setUsers(prev => prev.map(u => u._id === userId ? data.user : u));
      setDocModal(null);
      setShowRejectInput(false);
      setRejectReason('');
    } catch {
      toast.error('Something went wrong');
    } finally {
      setActionLoading(false);
    }
  };

  const pendingCount = users.filter(u => u.verificationStatus === 'pending').length;

  return (
    <div className="min-h-screen bg-[#080f0a] relative overflow-x-hidden">
      <div className="relative max-w-5xl mx-auto px-4 py-12">

        {/* Header */}
        <div className="mb-8">
          <p className="text-xs font-semibold uppercase tracking-widest text-green-400/60 mb-2">Admin</p>
          <h1 className="text-3xl font-bold text-white mb-1">User Management</h1>
          <p className="text-white/35 text-sm">Oversee registered clients and providers, and verify provider documents.</p>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6">
          <button onClick={() => setTab('providers')}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition"
            style={{
              background: tab === 'providers' ? 'rgba(74,222,128,0.12)' : 'rgba(255,255,255,0.04)',
              color: tab === 'providers' ? '#4ade80' : 'rgba(255,255,255,0.5)',
              border: `1px solid ${tab === 'providers' ? 'rgba(74,222,128,0.25)' : 'rgba(255,255,255,0.08)'}`,
            }}>
            <Briefcase size={15} /> Providers
            {pendingCount > 0 && tab === 'providers' && (
              <span className="ml-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold text-white" style={{ background: '#16a34a' }}>
                {pendingCount} pending
              </span>
            )}
          </button>
          <button onClick={() => setTab('clients')}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition"
            style={{
              background: tab === 'clients' ? 'rgba(74,222,128,0.12)' : 'rgba(255,255,255,0.04)',
              color: tab === 'clients' ? '#4ade80' : 'rgba(255,255,255,0.5)',
              border: `1px solid ${tab === 'clients' ? 'rgba(74,222,128,0.25)' : 'rgba(255,255,255,0.08)'}`,
            }}>
            <Users size={15} /> Clients
          </button>
        </div>

        {/* User list */}
        <div className="rounded-2xl overflow-hidden" style={glassCard}>
          {loadingUsers ? (
            <div className="p-12 flex items-center justify-center">
              <Loader2 size={24} className="animate-spin text-green-400" />
            </div>
          ) : users.length === 0 ? (
            <div className="p-12 text-center">
              <p className="text-white/30 text-sm">No {tab} registered yet.</p>
            </div>
          ) : (
            <div className="divide-y" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
              {users.map(u => (
                <div key={u._id}
                  className="px-5 py-4 flex items-center gap-4 flex-wrap"
                  style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
                  <div className="w-10 h-10 rounded-full bg-green-500 flex items-center justify-center text-white font-bold text-sm shrink-0">
                    {u.name?.charAt(0).toUpperCase()}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold text-white truncate">{u.name}</p>
                      {tab === 'providers' && u.verificationStatus === 'verified' && (
                        <ShieldCheck size={14} className="text-green-400 shrink-0" />
                      )}
                    </div>
                    <p className="text-xs text-white/30 truncate">{u.email}</p>
                  </div>

                  {tab === 'providers' && (
                    <div className="flex items-center gap-3 shrink-0">
                      <StatusPill status={u.verificationStatus} />
                      {u.verificationDoc && (
                        <button onClick={() => setDocModal(u)}
                          className="px-3 py-1.5 rounded-lg text-xs font-semibold transition"
                          style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.7)' }}>
                          Review
                        </button>
                      )}
                    </div>
                  )}

                  {tab === 'clients' && (
                    <p className="text-xs text-white/20 shrink-0">
                      Joined {new Date(u.createdAt).toLocaleDateString()}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Document review modal */}
      {docModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.7)' }}
          onClick={() => { setDocModal(null); setShowRejectInput(false); setRejectReason(''); }}>
          <div className="w-full max-w-lg rounded-2xl overflow-hidden"
            style={{ background: '#0d1410', border: '1px solid rgba(255,255,255,0.1)' }}
            onClick={e => e.stopPropagation()}>

            <div className="px-5 py-4 flex items-center justify-between border-b" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
              <div>
                <p className="text-sm font-semibold text-white">{docModal.name}</p>
                <p className="text-xs text-white/30">{docModal.email}</p>
              </div>
              <button onClick={() => { setDocModal(null); setShowRejectInput(false); setRejectReason(''); }}
                className="p-1.5 rounded-lg" style={{ color: 'rgba(255,255,255,0.4)' }}>
                <X size={18} />
              </button>
            </div>

            <div className="p-5">
              <p className="text-xs font-semibold uppercase tracking-widest text-white/30 mb-3">Submitted Document</p>
              <a href={docModal.verificationDoc} target="_blank" rel="noopener noreferrer" className="block relative group">
                <img src={docModal.verificationDoc} alt="Verification document"
                  className="w-full max-h-80 object-contain rounded-xl"
                  style={{ border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.02)' }} />
                <div className="absolute top-2 right-2 p-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition"
                  style={{ background: 'rgba(0,0,0,0.6)' }}>
                  <ExternalLink size={14} className="text-white" />
                </div>
              </a>

              {showRejectInput ? (
                <div className="mt-5">
                  <label className="block text-xs font-semibold uppercase tracking-widest text-white/40 mb-2">
                    Reason for rejection
                  </label>
                  <textarea value={rejectReason} onChange={e => setRejectReason(e.target.value)}
                    rows={3} placeholder="e.g. Document is blurry, please re-upload a clearer photo"
                    className="w-full px-4 py-3 rounded-xl text-sm outline-none resize-none"
                    style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: 'white' }} />
                  <div className="flex gap-3 mt-3">
                    <button onClick={() => setShowRejectInput(false)}
                      className="flex-1 py-2.5 rounded-xl text-sm font-semibold"
                      style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.6)' }}>
                      Cancel
                    </button>
                    <button onClick={() => handleVerify(docModal._id, 'reject', rejectReason)}
                      disabled={actionLoading || !rejectReason.trim()}
                      className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-50"
                      style={{ background: 'rgba(239,68,68,0.85)' }}>
                      {actionLoading ? <Loader2 size={16} className="animate-spin mx-auto" /> : 'Confirm Rejection'}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex gap-3 mt-5">
                  <button onClick={() => setShowRejectInput(true)}
                    disabled={actionLoading}
                    className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition disabled:opacity-50"
                    style={{ background: 'rgba(239,68,68,0.12)', color: '#f87171', border: '1px solid rgba(239,68,68,0.25)' }}>
                    <ShieldX size={15} /> Reject
                  </button>
                  <button onClick={() => handleVerify(docModal._id, 'verify')}
                    disabled={actionLoading}
                    className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold text-white transition disabled:opacity-50"
                    style={{ background: 'linear-gradient(135deg,#16a34a,#15803d)' }}>
                    {actionLoading ? <Loader2 size={16} className="animate-spin" /> : <><ShieldCheck size={15} /> Verify</>}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}