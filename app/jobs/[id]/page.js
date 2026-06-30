'use client';
import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import {
  MapPin, Clock, MessageCircle, Users, CheckCircle, XCircle,
  Star, ArrowRight, Loader2, Briefcase, CreditCard, ShieldCheck,
  PartyPopper,
} from 'lucide-react';
import { toast } from 'sonner';
import Link from 'next/link';
import VerifiedBadge from '@/components/VerifiedBadge';

const glass = {
  background:          'rgba(255,255,255,0.04)',
  border:              '1px solid rgba(255,255,255,0.08)',
  backdropFilter:      'blur(12px)',
  WebkitBackdropFilter:'blur(12px)',
};

const inputStyle = {
  background: 'rgba(255,255,255,0.06)',
  border:     '1px solid rgba(255,255,255,0.1)',
  color:      'white',
};

const onFocus = e => e.target.style.borderColor = 'rgba(74,222,128,0.5)';
const onBlur  = e => e.target.style.borderColor = 'rgba(255,255,255,0.1)';

const canManageApplications = (role) => role === 'client' || role === 'admin';

export default function JobDetails() {
  const { id }            = useParams();
  const { data: session } = useSession();
  const router            = useRouter();

  const [job,              setJob]              = useState(null);
  const [applications,     setApplications]     = useState([]);
  const [loading,          setLoading]          = useState(true);
  const [applying,         setApplying]         = useState(false);
  const [coverLetter,      setCoverLetter]      = useState('');
  const [proposedRate,     setProposedRate]     = useState('');
  const [updatingStatus,   setUpdatingStatus]   = useState(null);

  // Rating
  const [showRatingModal,  setShowRatingModal]  = useState(false);
  const [ratingTarget,     setRatingTarget]     = useState(null);
  const [ratingValue,      setRatingValue]      = useState(0);
  const [reviewText,       setReviewText]       = useState('');
  const [submittingRating, setSubmittingRating] = useState(false);

  // Mark complete
  const [showCompleteModal,  setShowCompleteModal]  = useState(false);
  const [completeTarget,     setCompleteTarget]     = useState(null);
  const [markingComplete,    setMarkingComplete]    = useState(false);

  // Payment
  const [showPaymentModal,   setShowPaymentModal]   = useState(false);
  const [paymentTarget,      setPaymentTarget]      = useState(null);
  const [payAmount,          setPayAmount]          = useState('');
  const [initiatingPayment,  setInitiatingPayment]  = useState(false);

  useEffect(() => { fetchJob(); }, [id, session]);

  const fetchJob = async () => {
    try {
      const res  = await fetch(`/api/jobs/${id}`);
      if (!res.ok) throw new Error('Failed');
      const data = await res.json();
      setJob(data);
      if (canManageApplications(session?.user?.role)) await fetchApplications();
    } catch { toast.error('Failed to load job'); }
    finally { setLoading(false); }
  };

  const fetchApplications = async () => {
    try {
      const res = await fetch(`/api/jobs/${id}/applications`);
      if (res.ok) setApplications(await res.json());
    } catch (err) { console.error(err); }
  };

  const handleApply = async () => {
    if (!session)                         { toast.error('Please login to apply'); router.push('/login'); return; }
    if (session.user.role !== 'provider') { toast.error('Only service providers can apply'); return; }
    if (!coverLetter.trim())              { toast.error('Please write a cover letter'); return; }

    setApplying(true);
    try {
      const res  = await fetch('/api/applications', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ jobId: id, coverLetter, proposedRate: proposedRate ? Number(proposedRate) : null }),
      });
      const data = await res.json();
      if (res.ok) { toast.success('Application sent!'); setCoverLetter(''); setProposedRate(''); }
      else toast.error(data.error || 'Failed to apply');
    } catch { toast.error('Something went wrong'); }
    finally { setApplying(false); }
  };

  const updateApplicationStatus = async (applicationId, status) => {
    setUpdatingStatus(applicationId);
    try {
      const res = await fetch(`/api/jobs/${id}/applications`, {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ applicationId, status }),
      });
      if (res.ok) {
        toast.success(
          status === 'accepted'  ? 'Application accepted!' :
          status === 'rejected'  ? 'Application rejected'  :
          status === 'completed' ? 'Job marked as completed!' : 'Updated'
        );
        await fetchJob(); // refresh both job status and applications
      } else {
        const d = await res.json();
        toast.error(d.error || 'Failed');
      }
    } catch { toast.error('Something went wrong'); }
    finally { setUpdatingStatus(null); }
  };

  const startChat = (applicant) => {
    if (!applicant) return;
    router.push(`/chat?to=${applicant._id}&name=${encodeURIComponent(applicant.name)}`);
  };

  const openRatingModal = (provider) => {
    setRatingTarget(provider); setRatingValue(0); setReviewText(''); setShowRatingModal(true);
  };

  const submitRating = async () => {
    if (!ratingValue) { toast.error('Please select a rating'); return; }
    setSubmittingRating(true);
    try {
      const res  = await fetch('/api/ratings', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ providerId: ratingTarget._id, jobId: id, rating: ratingValue, review: reviewText }),
      });
      const data = await res.json();
      if (res.ok) { toast.success('Rating submitted!'); setShowRatingModal(false); await fetchApplications(); }
      else toast.error(data.error || 'Failed to submit rating');
    } catch { toast.error('Something went wrong'); }
    finally { setSubmittingRating(false); }
  };

  // ── Mark as complete ───────────────────────────────────────────────────────
  const confirmComplete = (app) => {
    setCompleteTarget(app);
    setShowCompleteModal(true);
  };

  const handleMarkComplete = async () => {
    if (!completeTarget) return;
    setMarkingComplete(true);
    try {
      await updateApplicationStatus(completeTarget._id, 'completed');
      setShowCompleteModal(false);
      // After marking complete, open payment modal
      setPaymentTarget(completeTarget);
      setPayAmount(completeTarget.proposedRate || job?.budgetMax || '');
      setShowPaymentModal(true);
    } catch {
      toast.error('Something went wrong');
    } finally {
      setMarkingComplete(false);
    }
  };

  // ── Payment ────────────────────────────────────────────────────────────────
  const initiatePayment = async () => {
    if (!payAmount || Number(payAmount) < 100) {
      toast.error('Please enter a valid amount (min ₦100)');
      return;
    }
    setInitiatingPayment(true);
    try {
      const res  = await fetch('/api/payment/initialize', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          jobId:         id,
          applicationId: paymentTarget._id,
          amount:        Number(payAmount),
          providerId:    paymentTarget.applicant._id,
        }),
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error || 'Failed to initialize payment'); return; }
      window.location.href = data.authorizationUrl;
    } catch { toast.error('Something went wrong'); }
    finally { setInitiatingPayment(false); }
  };

  const statusStyle = (status) => ({
    accepted:  { background: 'rgba(74,222,128,0.1)',  border: '1px solid rgba(74,222,128,0.2)',  color: '#4ade80' },
    rejected:  { background: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.2)', color: '#f87171' },
    pending:   { background: 'rgba(251,191,36,0.1)',  border: '1px solid rgba(251,191,36,0.2)',  color: '#fbbf24' },
    completed: { background: 'rgba(74,222,128,0.1)',  border: '1px solid rgba(74,222,128,0.2)',  color: '#4ade80' },
  }[status] || {});

  if (loading) return (
    <div className="flex items-center justify-center min-h-screen bg-[#080f0a]">
      <div className="w-10 h-10 rounded-full border-2 border-green-500/20 border-t-green-500 animate-spin" />
    </div>
  );

  if (!job) return (
    <div className="flex items-center justify-center min-h-screen bg-[#080f0a]">
      <p className="text-white/40">Job not found</p>
    </div>
  );

  const labelClass      = "block text-xs font-semibold uppercase tracking-widest text-white/40 mb-2";
  const commission      = payAmount ? Math.round(Number(payAmount) * 0.10) : 0;
  const providerGets    = payAmount ? Number(payAmount) - commission : 0;
  const acceptedApp     = applications.find(a => a.status === 'accepted');
  const completedApp    = applications.find(a => a.status === 'completed');
  const isJobCompleted  = job.status === 'completed';

  return (
    <div className="min-h-screen bg-[#080f0a] relative overflow-x-hidden">
      <style>{`
        @keyframes drift {
          0%,100% { transform:translate(0,0) scale(1); }
          33% { transform:translate(30px,-20px) scale(1.05); }
          66% { transform:translate(-20px,15px) scale(0.97); }
        }
        .drift { animation: drift 14s ease-in-out infinite; }
      `}</style>

      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-10%] right-[-5%] w-[500px] h-[500px] rounded-full drift"
          style={{ background: 'radial-gradient(circle, rgba(22,163,74,0.12) 0%, transparent 70%)' }} />
        <div className="absolute bottom-[-10%] left-[-5%] w-[400px] h-[400px] rounded-full drift"
          style={{ background: 'radial-gradient(circle, rgba(16,185,129,0.1) 0%, transparent 70%)', animationDelay: '5s' }} />
        <div className="absolute inset-0 opacity-[0.025]" style={{
          backgroundImage: 'linear-gradient(rgba(255,255,255,0.8) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.8) 1px, transparent 1px)',
          backgroundSize: '72px 72px',
        }} />
      </div>

      <div className="relative max-w-3xl mx-auto px-4 py-10 space-y-4">

        {/* Job header */}
        <div className="p-7 rounded-3xl" style={glass}>
          <div className="flex justify-between items-start mb-4 gap-4">
            <div className="min-w-0">
              <span className="text-xs font-semibold px-2.5 py-1 rounded-full inline-block mb-3"
                style={{ background: 'rgba(74,222,128,0.1)', border: '1px solid rgba(74,222,128,0.2)', color: '#4ade80' }}>
                {job.category}
              </span>
              <h1 className="text-2xl font-bold text-white leading-snug">{job.title}</h1>
            </div>
            <span className="text-xs px-2.5 py-1 rounded-full shrink-0 font-semibold capitalize"
              style={statusStyle(job.status) || { background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.4)', border: '1px solid rgba(255,255,255,0.08)' }}>
              {job.status}
            </span>
          </div>

          <p className="text-2xl font-bold text-green-400 mb-5">
            ₦{job.budgetMin?.toLocaleString()} — ₦{job.budgetMax?.toLocaleString()}
          </p>

          <div className="flex flex-wrap gap-4 text-xs text-white/35">
            <span className="flex items-center gap-1.5"><MapPin size={12} />{job.location}</span>
            <span className="flex items-center gap-1.5"><Clock size={12} />Posted {new Date(job.createdAt).toLocaleDateString()}</span>
            {job.deadline && (
              <span className="flex items-center gap-1.5" style={{ color: 'rgba(248,113,113,0.7)' }}>
                <Clock size={12} />Deadline: {new Date(job.deadline).toLocaleDateString()}
              </span>
            )}
          </div>
        </div>

        {/* Description */}
        <div className="p-6 rounded-2xl" style={glass}>
          <p className="text-xs font-semibold uppercase tracking-widest text-white/30 mb-4">Description</p>
          <p className="text-white/70 leading-relaxed whitespace-pre-wrap text-sm">{job.description}</p>
        </div>

        {/* Images */}
        {job.images?.length > 0 && (
          <div className="p-6 rounded-2xl" style={glass}>
            <p className="text-xs font-semibold uppercase tracking-widest text-white/30 mb-4">Photos</p>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {job.images.map((img, i) => (
                <img key={i} src={img} alt={`Job photo ${i + 1}`}
                  className="rounded-xl w-full h-40 object-cover"
                  style={{ border: '1px solid rgba(255,255,255,0.08)' }} />
              ))}
            </div>
          </div>
        )}

        {/* ── Job completed banner ─────────────────────────────────────────── */}
        {isJobCompleted && (
          <div className="p-5 rounded-2xl"
            style={{ background: 'rgba(74,222,128,0.06)', border: '1px solid rgba(74,222,128,0.2)' }}>
            <div className="flex items-center gap-3 mb-4">
              <CheckCircle size={20} className="text-green-400 shrink-0" />
              <div>
                <p className="text-sm font-bold text-green-400">Job Completed!</p>
                <p className="text-xs text-white/40 mt-0.5">
                  You marked this job as done. Pay the provider through 100Gigs for a secure transaction.
                </p>
              </div>
            </div>
            {completedApp && !completedApp.paidAt && (
              <button
                onClick={() => {
                  setPaymentTarget(completedApp);
                  setPayAmount(completedApp.proposedRate || job?.budgetMax || '');
                  setShowPaymentModal(true);
                }}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white transition active:scale-95"
                style={{ background: 'linear-gradient(135deg,#16a34a,#15803d)', boxShadow: '0 4px 16px rgba(22,163,74,0.3)' }}
              >
                <CreditCard size={15} /> Pay via 100Gigs
              </button>
            )}
            {completedApp?.paidAt && (
              <p className="text-xs text-green-400 flex items-center gap-1.5">
                <CheckCircle size={12} /> Payment sent through 100Gigs
              </p>
            )}
          </div>
        )}

        {/* Provider — Apply */}
        {session?.user?.role === 'provider' && (
          <div className="p-6 rounded-2xl" style={glass}>
            <div className="flex items-center gap-2.5 mb-5">
              <div className="w-7 h-7 rounded-lg flex items-center justify-center"
                style={{ background: 'rgba(74,222,128,0.12)' }}>
                <Briefcase size={14} className="text-green-400" />
              </div>
              <p className="text-sm font-semibold text-white">Apply for this Job</p>
            </div>
            <div className="space-y-4">
              <div>
                <label className={labelClass}>Cover Letter <span className="text-red-400">*</span></label>
                <textarea value={coverLetter} onChange={e => setCoverLetter(e.target.value)}
                  placeholder="Your experience, availability, why you're the best fit..."
                  rows={4} className="w-full px-4 py-3.5 rounded-xl text-sm outline-none resize-none transition placeholder-white/20"
                  style={inputStyle} onFocus={onFocus} onBlur={onBlur} />
              </div>
              <div>
                <label className={labelClass}>Proposed Rate (₦) <span className="text-white/20 normal-case tracking-normal font-normal">optional</span></label>
                <input type="number" value={proposedRate} onChange={e => setProposedRate(e.target.value)}
                  placeholder="Your proposed rate"
                  className="w-full px-4 py-3.5 rounded-xl text-sm outline-none transition placeholder-white/20"
                  style={inputStyle} onFocus={onFocus} onBlur={onBlur} />
              </div>
              <button onClick={handleApply} disabled={applying || !coverLetter.trim()}
                className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl font-semibold text-sm text-white transition-all active:scale-[0.99] disabled:opacity-50 group"
                style={{ background: 'linear-gradient(135deg,#16a34a,#15803d)', boxShadow: '0 4px 20px rgba(22,163,74,0.3)' }}>
                {applying
                  ? <><Loader2 size={16} className="animate-spin" /> Sending...</>
                  : <>Send Application <ArrowRight size={15} className="group-hover:translate-x-0.5 transition-transform" /></>
                }
              </button>
            </div>
          </div>
        )}

        {/* Client / Admin — Applications */}
        {canManageApplications(session?.user?.role) && (
          <div className="p-6 rounded-2xl" style={glass}>
            <div className="flex items-center gap-2.5 mb-5">
              <div className="w-7 h-7 rounded-lg flex items-center justify-center"
                style={{ background: 'rgba(74,222,128,0.12)' }}>
                <Users size={14} className="text-green-400" />
              </div>
              <p className="text-sm font-semibold text-white">
                Applications <span className="text-white/30 font-normal">({applications.length})</span>
              </p>
            </div>

            {applications.length === 0 ? (
              <div className="text-center py-10">
                <Users size={28} className="mx-auto mb-3" style={{ color: 'rgba(255,255,255,0.1)' }} />
                <p className="text-white/30 text-sm">No applications yet. Share this job to get responses.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {applications.map(app => (
                  <div key={app._id} className="p-5 rounded-2xl"
                    style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <Link href={`/profile/${app.applicant?._id}`}
                          className="font-semibold text-white hover:text-green-400 transition text-sm inline-flex items-center gap-1.5">
                          {app.applicant?.name}
                          {app.applicant?.verificationStatus === 'verified' && <VerifiedBadge size={14} />}
                        </Link>
                        {app.applicant?.phone && (
                          <p className="text-xs text-green-400 mt-0.5">{app.applicant.phone}</p>
                        )}
                      </div>
                      <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full capitalize"
                        style={statusStyle(app.status)}>
                        {app.status}
                      </span>
                    </div>

                    <p className="text-white/50 text-sm leading-relaxed mb-3">{app.coverLetter}</p>

                    {app.proposedRate && (
                      <p className="text-green-400 text-sm font-semibold mb-3">
                        Proposed: ₦{app.proposedRate?.toLocaleString()}
                      </p>
                    )}

                    <div className="flex flex-wrap gap-2 pt-3"
                      style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>

                      <button onClick={() => startChat(app.applicant)}
                        className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold transition"
                        style={{ background: 'rgba(74,222,128,0.15)', border: '1px solid rgba(74,222,128,0.25)', color: '#4ade80' }}>
                        <MessageCircle size={13} /> Chat
                      </button>

                      {app.status === 'pending' && (
                        <>
                          <button onClick={() => updateApplicationStatus(app._id, 'accepted')}
                            disabled={updatingStatus === app._id}
                            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold transition disabled:opacity-50"
                            style={{ background: 'rgba(96,165,250,0.15)', border: '1px solid rgba(96,165,250,0.25)', color: '#60a5fa' }}>
                            <CheckCircle size={13} />
                            {updatingStatus === app._id ? 'Updating...' : 'Accept'}
                          </button>
                          <button onClick={() => updateApplicationStatus(app._id, 'rejected')}
                            disabled={updatingStatus === app._id}
                            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold transition disabled:opacity-50"
                            style={{ background: 'rgba(248,113,113,0.12)', border: '1px solid rgba(248,113,113,0.2)', color: '#f87171' }}>
                            <XCircle size={13} /> Reject
                          </button>
                        </>
                      )}

                      {/* ── Mark as Complete button (accepted apps only) ── */}
                      {app.status === 'accepted' && !isJobCompleted && (
                        <button onClick={() => confirmComplete(app)}
                          disabled={updatingStatus === app._id}
                          className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold transition disabled:opacity-50"
                          style={{ background: 'rgba(74,222,128,0.15)', border: '1px solid rgba(74,222,128,0.3)', color: '#4ade80' }}>
                          <CheckCircle size={13} /> Mark as Complete
                        </button>
                      )}

                      {/* ── Pay button (completed, not yet paid) ── */}
                      {app.status === 'completed' && !app.paidAt && (
                        <button onClick={() => {
                          setPaymentTarget(app);
                          setPayAmount(app.proposedRate || job?.budgetMax || '');
                          setShowPaymentModal(true);
                        }}
                          className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold transition"
                          style={{ background: 'linear-gradient(135deg,rgba(22,163,74,0.3),rgba(21,128,61,0.3))', border: '1px solid rgba(74,222,128,0.4)', color: '#4ade80' }}>
                          <CreditCard size={13} /> Pay via 100Gigs
                        </button>
                      )}

                      {app.status === 'completed' && app.paidAt && (
                        <span className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold"
                          style={{ background: 'rgba(74,222,128,0.08)', color: '#4ade80' }}>
                          <CheckCircle size={13} /> Paid
                        </span>
                      )}

                      {(app.status === 'accepted' || app.status === 'completed') && (
                        <button onClick={() => openRatingModal(app.applicant)}
                          className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold transition"
                          style={{ background: 'rgba(251,191,36,0.12)', border: '1px solid rgba(251,191,36,0.2)', color: '#fbbf24' }}>
                          <Star size={13} /> Rate Provider
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Mark as Complete Modal ────────────────────────────────────────── */}
      {showCompleteModal && completeTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(8px)' }}
          onClick={() => setShowCompleteModal(false)}>
          <div className="w-full max-w-md rounded-3xl p-7"
            style={{ background: '#080f0a', border: '1px solid rgba(255,255,255,0.1)', boxShadow: '0 24px 64px rgba(0,0,0,0.5)' }}
            onClick={e => e.stopPropagation()}>

            <div className="text-center mb-6">
              <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4"
                style={{ background: 'rgba(74,222,128,0.12)' }}>
                <PartyPopper size={32} className="text-green-400" />
              </div>
              <h2 className="text-xl font-bold text-white mb-2">Job Done?</h2>
              <p className="text-white/40 text-sm leading-relaxed">
                Confirm that <strong className="text-white/70">{completeTarget.applicant?.name}</strong> has
                completed the work to your satisfaction. This will mark the job as done and
                you'll be prompted to pay through 100Gigs.
              </p>
            </div>

            <div className="p-4 rounded-xl mb-5"
              style={{ background: 'rgba(251,191,36,0.06)', border: '1px solid rgba(251,191,36,0.15)' }}>
              <p className="text-xs text-yellow-400/80 leading-relaxed">
                ⚠️ Only mark as complete if you are satisfied with the work. Once marked, the job
                cannot be reopened.
              </p>
            </div>

            <div className="flex gap-3">
              <button onClick={() => setShowCompleteModal(false)}
                className="flex-1 py-3 rounded-xl text-sm font-semibold text-white/50"
                style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>
                Not Yet
              </button>
              <button onClick={handleMarkComplete} disabled={markingComplete}
                className="flex-1 py-3 rounded-xl text-sm font-semibold text-white disabled:opacity-50 flex items-center justify-center gap-2"
                style={{ background: 'linear-gradient(135deg,#16a34a,#15803d)', boxShadow: '0 4px 16px rgba(22,163,74,0.3)' }}>
                {markingComplete
                  ? <><Loader2 size={15} className="animate-spin" /> Confirming...</>
                  : <><CheckCircle size={15} /> Yes, Job is Done</>
                }
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Payment Modal ─────────────────────────────────────────────────── */}
      {showPaymentModal && paymentTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(8px)' }}
          onClick={() => setShowPaymentModal(false)}>
          <div className="w-full max-w-md rounded-3xl p-7"
            style={{ background: '#080f0a', border: '1px solid rgba(255,255,255,0.1)', boxShadow: '0 24px 64px rgba(0,0,0,0.5)' }}
            onClick={e => e.stopPropagation()}>

            <div className="flex items-center gap-3 mb-6">
              <div className="w-11 h-11 rounded-xl flex items-center justify-center"
                style={{ background: 'rgba(74,222,128,0.12)' }}>
                <CreditCard size={20} className="text-green-400" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-white">Pay via 100Gigs</h2>
                <p className="text-xs text-white/35">Paying {paymentTarget.applicant?.name}</p>
              </div>
            </div>

            <div className="mb-4">
              <label className="block text-xs font-semibold uppercase tracking-widest text-white/40 mb-2">
                Amount to Pay (₦)
              </label>
              <input
                type="number"
                value={payAmount}
                onChange={e => setPayAmount(e.target.value)}
                placeholder="Enter amount"
                className="w-full px-4 py-3.5 rounded-xl text-sm outline-none transition text-white placeholder-white/20 text-lg font-semibold"
                style={inputStyle}
                onFocus={onFocus}
                onBlur={onBlur}
              />
            </div>

            {payAmount && Number(payAmount) >= 100 && (
              <div className="p-4 rounded-xl mb-5 space-y-2.5"
                style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                <p className="text-xs font-semibold uppercase tracking-widest text-white/30 mb-3">Breakdown</p>
                {[
                  { label: 'You pay',                                        value: `₦${Number(payAmount).toLocaleString()}`,  color: 'text-white'   },
                  { label: '100Gigs fee (10%)',                              value: `₦${commission.toLocaleString()}`,         color: 'text-red-400' },
                  { label: `${paymentTarget.applicant?.name} receives`,      value: `₦${providerGets.toLocaleString()}`,       color: 'text-green-400' },
                ].map(row => (
                  <div key={row.label} className="flex items-center justify-between">
                    <span className="text-xs text-white/40">{row.label}</span>
                    <span className={`text-sm font-semibold ${row.color}`}>{row.value}</span>
                  </div>
                ))}
              </div>
            )}

            <div className="flex items-start gap-2 mb-5 p-3 rounded-xl"
              style={{ background: 'rgba(74,222,128,0.05)', border: '1px solid rgba(74,222,128,0.1)' }}>
              <ShieldCheck size={14} className="text-green-400 shrink-0 mt-0.5" />
              <p className="text-xs text-white/40 leading-relaxed">
                Powered by Paystack. Your payment is secure. The provider is notified immediately after payment.
              </p>
            </div>

            <div className="flex gap-3">
              <button onClick={() => setShowPaymentModal(false)}
                className="flex-1 py-3 rounded-xl text-sm font-semibold text-white/50"
                style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>
                Maybe Later
              </button>
              <button
                onClick={initiatePayment}
                disabled={initiatingPayment || !payAmount || Number(payAmount) < 100}
                className="flex-1 py-3 rounded-xl text-sm font-semibold text-white disabled:opacity-50 flex items-center justify-center gap-2"
                style={{ background: 'linear-gradient(135deg,#16a34a,#15803d)', boxShadow: '0 4px 16px rgba(22,163,74,0.3)' }}>
                {initiatingPayment
                  ? <><Loader2 size={15} className="animate-spin" /> Redirecting...</>
                  : <><CreditCard size={15} /> Pay ₦{Number(payAmount || 0).toLocaleString()}</>
                }
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Rating Modal */}
      {showRatingModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(8px)' }}>
          <div className="w-full max-w-md rounded-3xl p-7"
            style={{ background: 'rgba(8,12,10,0.95)', border: '1px solid rgba(255,255,255,0.1)', boxShadow: '0 24px 64px rgba(0,0,0,0.5)' }}>
            <h2 className="text-xl font-bold text-white mb-1">Rate {ratingTarget?.name}</h2>
            <p className="text-white/35 text-sm mb-6">How was your experience with this provider?</p>

            <div className="flex justify-center gap-3 mb-6">
              {[1,2,3,4,5].map(star => (
                <button key={star} onClick={() => setRatingValue(star)}
                  className="text-4xl transition-transform hover:scale-110"
                  style={{ color: ratingValue >= star ? '#fbbf24' : 'rgba(255,255,255,0.1)' }}>
                  ★
                </button>
              ))}
            </div>

            <textarea value={reviewText} onChange={e => setReviewText(e.target.value)}
              placeholder="Write a review (optional)"
              rows={3} className="w-full px-4 py-3.5 rounded-xl text-sm outline-none resize-none transition placeholder-white/20 mb-5"
              style={inputStyle} onFocus={onFocus} onBlur={onBlur} />

            <div className="flex gap-3">
              <button onClick={() => setShowRatingModal(false)}
                className="flex-1 py-3 rounded-xl text-sm font-semibold text-white/50"
                style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>
                Cancel
              </button>
              <button onClick={submitRating} disabled={submittingRating || !ratingValue}
                className="flex-1 py-3 rounded-xl text-sm font-semibold text-white disabled:opacity-50"
                style={{ background: 'linear-gradient(135deg,#16a34a,#15803d)', boxShadow: '0 4px 16px rgba(22,163,74,0.3)' }}>
                {submittingRating ? 'Submitting...' : 'Submit Rating'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}