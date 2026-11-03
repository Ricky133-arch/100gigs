'use client';
import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { ArrowLeft, ArrowRight, Loader2, X } from 'lucide-react';
import { toast } from 'sonner';
import Link from 'next/link';
import VerifiedBadge from '@/components/VerifiedBadge';

/* ── helpers ─────────────────────────────────────────────── */

const canManageApplications = (role) => role === 'client' || role === 'admin';
const safeJson = (res) => res.json().catch(() => ({}));
const naira = (n) => `₦${Number(n || 0).toLocaleString('en-NG')}`;

function budget(job) {
  const { budgetMin: lo, budgetMax: hi } = job;
  if (typeof lo === 'number' && typeof hi === 'number' && lo !== hi) return `${naira(lo)} – ${naira(hi)}`;
  if (typeof lo === 'number') return naira(lo);
  if (typeof hi === 'number') return naira(hi);
  return 'Budget open';
}

function timeAgo(date) {
  if (!date) return '';
  const s = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
  if (s < 60) return 'just now';
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d ago`;
  return new Date(date).toLocaleDateString('en-NG', { day: 'numeric', month: 'short' });
}

const fmtDate = (d) => new Date(d).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' });

const STATUS = {
  open: { dot: 'bg-green-400', text: 'text-green-400', label: 'Open' },
  pending: { dot: 'bg-amber-300', text: 'text-amber-300', label: 'Pending' },
  accepted: { dot: 'bg-green-400', text: 'text-green-400', label: 'Hired' },
  rejected: { dot: 'bg-red-400', text: 'text-red-400', label: 'Declined' },
  completed: { dot: 'bg-green-400', text: 'text-green-400', label: 'Completed' },
  closed: { dot: 'bg-white/30', text: 'text-white/40', label: 'Closed' },
};

function Status({ value }) {
  const s = STATUS[value] || { dot: 'bg-white/30', text: 'text-white/40', label: value || '—' };
  return (
    <span className={`mono inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.12em] ${s.text}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${s.dot}`} />{s.label}
    </span>
  );
}

const label = 'mono mb-3 block text-[10px] uppercase tracking-[0.16em] text-white/35';
const underlineInput =
  'w-full border-b border-white/15 bg-transparent pb-3 text-[15px] text-white outline-none transition-colors placeholder:text-white/20 focus:border-green-400';
const btnPrimary =
  'inline-flex items-center justify-center gap-2 rounded-full bg-green-400 px-5 py-3 text-[14px] font-medium text-[#080f0a] transition hover:bg-green-300 active:scale-[0.99] disabled:bg-white/[0.06] disabled:text-white/30';
const btnGhost =
  'inline-flex items-center justify-center gap-2 rounded-full border border-white/15 px-4 py-2 text-[13px] text-white/75 transition hover:border-white/40 hover:text-white disabled:opacity-40';

function Modal({ open, onClose, children }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = ''; };
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/70 p-0 sm:items-center sm:p-4" onClick={onClose}>
      <div role="dialog" aria-modal="true"
        className="relative w-full max-w-md border border-white/10 bg-[#0b150e] p-7 sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}>
        <button onClick={onClose} aria-label="Close"
          className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full text-white/40 transition hover:bg-white/[0.06] hover:text-white">
          <X size={16} />
        </button>
        {children}
      </div>
    </div>
  );
}

/* ── page ────────────────────────────────────────────────── */

export default function JobDetails() {
  const { id } = useParams();
  const { data: session, status: authStatus } = useSession();
  const router = useRouter();

  const [job, setJob] = useState(null);
  const [applications, setApplications] = useState([]);
  const [canSeeApplications, setCanSeeApplications] = useState(false);
  const [loading, setLoading] = useState(true);
  const [applying, setApplying] = useState(false);
  const [applied, setApplied] = useState(false);
  const [coverLetter, setCoverLetter] = useState('');
  const [proposedRate, setProposedRate] = useState('');
  const [updatingStatus, setUpdatingStatus] = useState(null);

  // Rating
  const [showRatingModal, setShowRatingModal] = useState(false);
  const [ratingTarget, setRatingTarget] = useState(null);
  const [ratingValue, setRatingValue] = useState(0);
  const [hoverValue, setHoverValue] = useState(0);
  const [reviewText, setReviewText] = useState('');
  const [submittingRating, setSubmittingRating] = useState(false);

  // Mark complete
  const [showCompleteModal, setShowCompleteModal] = useState(false);
  const [completeTarget, setCompleteTarget] = useState(null);
  const [markingComplete, setMarkingComplete] = useState(false);

  // Payment
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentTarget, setPaymentTarget] = useState(null);
  const [payAmount, setPayAmount] = useState('');
  const [initiatingPayment, setInitiatingPayment] = useState(false);

  const role = session?.user?.role;

  useEffect(() => {
    if (authStatus === 'loading') return; // wait so we only fetch once
    fetchJob();
  }, [id, authStatus]); // eslint-disable-line react-hooks/exhaustive-deps

  const fetchJob = async () => {
    try {
      const res = await fetch(`/api/jobs/${id}`);
      if (!res.ok) throw new Error('Failed');
      setJob(await res.json());
      if (canManageApplications(role)) await fetchApplications();
    } catch {
      setJob(null);
    } finally {
      setLoading(false);
    }
  };

  // Only show the applications section if the server lets this user see them
  // (i.e. they own the job), not to every client who opens the page
  const fetchApplications = async () => {
    try {
      const res = await fetch(`/api/jobs/${id}/applications`);
      if (res.ok) {
        const data = await res.json();
        setApplications(Array.isArray(data) ? data : []);
        setCanSeeApplications(true);
      } else {
        setCanSeeApplications(false);
      }
    } catch (err) { console.error(err); }
  };

  const handleApply = async (e) => {
    e?.preventDefault();
    if (!session) { router.push(`/login?callbackUrl=${encodeURIComponent(`/jobs/${id}`)}`); return; }
    if (role !== 'provider') { toast.error('Only service providers can apply'); return; }
    if (!coverLetter.trim()) { toast.error('Write a short note to the client'); return; }

    setApplying(true);
    try {
      const res = await fetch('/api/applications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jobId: id, coverLetter, proposedRate: proposedRate ? Number(proposedRate) : null }),
      });
      const data = await safeJson(res);
      if (res.ok) {
        toast.success('Application sent');
        setApplied(true); // replace the form so it can't be sent twice
        setCoverLetter('');
        setProposedRate('');
      } else {
        toast.error(data.error || 'Failed to apply');
      }
    } catch { toast.error('Something went wrong'); }
    finally { setApplying(false); }
  };

  // Returns true/false so callers know whether it actually worked
  const updateApplicationStatus = async (applicationId, status) => {
    setUpdatingStatus(applicationId);
    try {
      const res = await fetch(`/api/jobs/${id}/applications`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ applicationId, status }),
      });
      if (res.ok) {
        toast.success(
          status === 'accepted' ? 'Provider hired' :
          status === 'rejected' ? 'Application declined' :
          status === 'completed' ? 'Job marked as done' : 'Updated'
        );
        await fetchJob();
        return true;
      }
      const d = await safeJson(res);
      toast.error(d.error || 'Failed');
      return false;
    } catch {
      toast.error('Something went wrong');
      return false;
    } finally {
      setUpdatingStatus(null);
    }
  };

  const startChat = (applicant) => {
    if (!applicant) return;
    router.push(`/chat?to=${applicant._id}&name=${encodeURIComponent(applicant.name)}`);
  };

  const openRatingModal = (provider) => {
    setRatingTarget(provider); setRatingValue(0); setHoverValue(0); setReviewText(''); setShowRatingModal(true);
  };

  const submitRating = async () => {
    if (!ratingValue) { toast.error('Pick a rating first'); return; }
    setSubmittingRating(true);
    try {
      const res = await fetch('/api/ratings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ providerId: ratingTarget._id, jobId: id, rating: ratingValue, review: reviewText }),
      });
      const data = await safeJson(res);
      if (res.ok) { toast.success('Thanks for the rating'); setShowRatingModal(false); await fetchApplications(); }
      else toast.error(data.error || 'Failed to submit rating');
    } catch { toast.error('Something went wrong'); }
    finally { setSubmittingRating(false); }
  };

  const confirmComplete = (app) => { setCompleteTarget(app); setShowCompleteModal(true); };

  const openPayment = (app) => {
    setPaymentTarget(app);
    setPayAmount(String(app.proposedRate || job?.budgetMax || ''));
    setShowPaymentModal(true);
  };

  const handleMarkComplete = async () => {
    if (!completeTarget) return;
    setMarkingComplete(true);
    const ok = await updateApplicationStatus(completeTarget._id, 'completed');
    setMarkingComplete(false);
    if (!ok) return; // don't jump to payment if marking failed
    setShowCompleteModal(false);
    openPayment(completeTarget);
  };

  const initiatePayment = async () => {
    if (!payAmount || Number(payAmount) < 100) { toast.error('Enter at least ₦100'); return; }
    setInitiatingPayment(true);
    try {
      const res = await fetch('/api/payment/initialize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jobId: id,
          applicationId: paymentTarget._id,
          amount: Number(payAmount),
          providerId: paymentTarget.applicant._id,
        }),
      });
      const data = await safeJson(res);
      if (!res.ok || !data.authorizationUrl) { toast.error(data.error || 'Couldn’t start payment'); setInitiatingPayment(false); return; }
      window.location.href = data.authorizationUrl; // keep spinner while redirecting
    } catch {
      toast.error('Something went wrong');
      setInitiatingPayment(false);
    }
  };

  /* ── render ───────────────────────────────────────────── */

  const shell = (children) => (
    <div className="jd min-h-screen bg-[#080f0a] text-[#e9efe9] antialiased">
      <style>{`
        .jd { font-family: var(--font-sans), ui-sans-serif, system-ui, sans-serif; }
        .serif { font-family: var(--font-serif), Georgia, serif; font-weight: 400; letter-spacing: -0.01em; }
        .mono { font-family: var(--font-mono), ui-monospace, monospace; }
        .jd input[type=number]::-webkit-inner-spin-button { -webkit-appearance: none; }
      `}</style>
      {children}
    </div>
  );

  if (loading) {
    return shell(
      <div className="flex min-h-screen items-center justify-center">
        <p className="mono text-[11px] uppercase tracking-[0.18em] text-white/35">Loading job…</p>
      </div>
    );
  }

  if (!job) {
    return shell(
      <div className="mx-auto flex min-h-screen max-w-5xl flex-col justify-center px-5 md:px-8">
        <p className="serif text-5xl leading-none">This job isn’t here.</p>
        <p className="mt-4 max-w-sm text-[15px] text-white/50">It may have been removed, or the link is wrong.</p>
        <Link href="/browse" className={`${btnPrimary} mt-8 w-max`}>See open jobs <ArrowRight size={15} /></Link>
      </div>
    );
  }

  const commission = payAmount ? Math.round(Number(payAmount) * 0.10) : 0;
  const providerGets = payAmount ? Number(payAmount) - commission : 0;
  const completedApp = applications.find((a) => a.status === 'completed');
  const isJobCompleted = job.status === 'completed';
  const isOpen = job.status === 'open';
  const ownerView = canSeeApplications;

  const meta = [job.category, job.location, `Posted ${timeAgo(job.createdAt)}`].filter(Boolean);

  return shell(
    <>
      <div className="mx-auto max-w-5xl px-5 pb-20 pt-8 md:px-8 md:pt-12">

        <button onClick={() => (window.history.length > 1 ? router.back() : router.push('/browse'))}
          className="mb-10 inline-flex items-center gap-1.5 text-[13px] text-white/45 transition hover:text-white">
          <ArrowLeft size={14} /> Back
        </button>

        {/* ─── Header ─── */}
        <header className="mb-12 border-b border-white/10 pb-10">
          <div className="mb-5 flex flex-wrap items-center gap-x-4 gap-y-2">
            <Status value={job.status} />
            <span className="mono text-[11px] text-white/35">{meta.join(' · ')}</span>
          </div>
          <h1 className="serif max-w-3xl text-4xl leading-[1.02] md:text-6xl">{job.title}</h1>
          <div className="mt-8 flex flex-wrap items-end gap-x-12 gap-y-4">
            <div>
              <p className="text-[12px] text-white/40">Budget</p>
              <p className="mono mt-1 text-2xl text-green-400 md:text-3xl">{budget(job)}</p>
            </div>
            {job.deadline && (
              <div>
                <p className="text-[12px] text-white/40">Needed by</p>
                <p className="mono mt-1 text-xl text-white">{fmtDate(job.deadline)}</p>
              </div>
            )}
          </div>
        </header>

        <div className="grid gap-14 lg:grid-cols-[1fr_340px] lg:gap-16">

          {/* ─── Left: details ─── */}
          <div className="min-w-0 space-y-12">
            <section>
              <p className={label}>The job</p>
              <p className="whitespace-pre-wrap text-[16px] leading-[1.75] text-white/75">{job.description}</p>
            </section>

            {job.images?.length > 0 && (
              <section>
                <p className={label}>Photos</p>
                <div className="grid grid-cols-2 gap-2 md:grid-cols-3">
                  {job.images.map((img, i) => (
                    <a key={i} href={img} target="_blank" rel="noopener noreferrer"
                      className="group block overflow-hidden border border-white/10">
                      <img src={img} alt={`Job photo ${i + 1}`}
                        className="h-40 w-full object-cover transition duration-500 group-hover:scale-[1.03]" />
                    </a>
                  ))}
                </div>
              </section>
            )}
          </div>

          {/* ─── Right: action panel ─── */}
          <aside className="lg:sticky lg:top-8 lg:self-start">
            {/* Provider — apply */}
            {role === 'provider' && (
              <div className="border border-white/10 bg-[#0b150e] p-6">
                {applied ? (
                  <>
                    <p className="mono mb-3 text-[10px] uppercase tracking-[0.16em] text-green-400">Sent</p>
                    <p className="serif text-3xl leading-tight">You’ve applied.</p>
                    <p className="mt-3 text-[13px] leading-relaxed text-white/50">
                      The client will see your note and rate. If they’re interested, they’ll message you.
                    </p>
                    <Link href="/dashboard" className="mt-6 inline-flex items-center gap-1.5 text-[13px] text-green-400 hover:underline underline-offset-4">
                      Track it on your dashboard <ArrowRight size={13} />
                    </Link>
                  </>
                ) : !isOpen ? (
                  <>
                    <p className="serif text-3xl leading-tight">No longer taking applications.</p>
                    <Link href="/browse" className="mt-6 inline-flex items-center gap-1.5 text-[13px] text-green-400 hover:underline underline-offset-4">
                      Find other jobs <ArrowRight size={13} />
                    </Link>
                  </>
                ) : (
                  <form onSubmit={handleApply}>
                    <p className="serif mb-6 text-3xl leading-tight">Apply for this job</p>
                    <label htmlFor="cover" className={label}>Your note to the client</label>
                    <textarea id="cover" value={coverLetter} onChange={(e) => setCoverLetter(e.target.value)}
                      rows={5} maxLength={1500}
                      placeholder="Similar jobs you’ve done, when you can come, anything you’d need to know."
                      className={`${underlineInput} resize-none leading-relaxed`} />
                    <p className="mono mt-1 text-right text-[10px] text-white/25">{coverLetter.length}/1500</p>

                    <label htmlFor="rate" className={`${label} mt-5`}>Your rate (₦) <span className="normal-case tracking-normal text-white/25">· optional</span></label>
                    <input id="rate" type="number" inputMode="numeric" min="0" value={proposedRate}
                      onChange={(e) => setProposedRate(e.target.value)}
                      placeholder={job.budgetMax ? Number(job.budgetMax).toLocaleString() : '15,000'}
                      className={`${underlineInput} mono`} />

                    <button type="submit" disabled={applying || !coverLetter.trim()} className={`${btnPrimary} mt-8 w-full`}>
                      {applying ? <><Loader2 size={16} className="animate-spin" /> Sending…</> : <>Send application <ArrowRight size={15} /></>}
                    </button>
                  </form>
                )}
              </div>
            )}

            {/* Logged-out visitor */}
            {!session && isOpen && (
              <div className="border border-white/10 bg-[#0b150e] p-6">
                <p className="serif text-3xl leading-tight">Can you do this job?</p>
                <p className="mt-3 text-[13px] leading-relaxed text-white/50">
                  Create a free provider account to apply, send your rate and chat with the client.
                </p>
                <div className="mt-6 flex flex-col gap-3">
                  <Link href={`/signup?callbackUrl=${encodeURIComponent(`/jobs/${id}`)}`} className={btnPrimary}>Sign up to apply <ArrowRight size={15} /></Link>
                  <Link href={`/login?callbackUrl=${encodeURIComponent(`/jobs/${id}`)}`} className="text-center text-[13px] text-white/50 transition hover:text-white">I already have an account</Link>
                </div>
              </div>
            )}

            {/* Owner — summary */}
            {ownerView && (
              <div className="border border-white/10 bg-[#0b150e] p-6">
                <p className={label}>Your job</p>
                <p className="text-[14px] leading-relaxed text-white/70">
                  {isJobCompleted
                    ? completedApp?.paidAt
                      ? 'Done and paid. Thanks for using 100Gigs.'
                      : 'Done. Pay the provider through 100Gigs to close it out.'
                    : applications.some((a) => a.status === 'accepted')
                      ? 'You’ve hired someone. Mark the job as done when the work is finished.'
                      : applications.length
                        ? `${applications.length} ${applications.length === 1 ? 'person has' : 'people have'} applied. Review them below.`
                        : 'No applications yet. They usually come in within a day.'}
                </p>
                {isJobCompleted && completedApp && !completedApp.paidAt && (
                  <button onClick={() => openPayment(completedApp)} className={`${btnPrimary} mt-6 w-full`}>
                    Pay {completedApp.applicant?.name?.split(' ')[0]} <ArrowRight size={15} />
                  </button>
                )}
                {applications.length > 0 && !isJobCompleted && (
                  <a href="#applications" className="mt-5 inline-flex items-center gap-1.5 text-[13px] text-green-400 hover:underline underline-offset-4">
                    See applications <ArrowRight size={13} />
                  </a>
                )}
              </div>
            )}
          </aside>
        </div>

        {/* ─── Applications (job owner only) ─── */}
        {ownerView && (
          <section id="applications" className="mt-20 scroll-mt-8">
            <div className="mb-2 flex items-baseline gap-4">
              <h2 className="serif text-4xl leading-none">Applications</h2>
              <span className="mono text-[13px] text-white/35">{applications.length}</span>
            </div>

            <div className="border-t border-white/10">
              {applications.length === 0 ? (
                <p className="py-12 text-[15px] text-white/45">
                  Nobody yet. Share the link to this page in your WhatsApp groups to get faster responses.
                </p>
              ) : (
                <ul>
                  {applications.map((app) => {
                    const busy = updatingStatus === app._id;
                    const a = app.applicant;
                    return (
                      <li key={app._id} className="border-b border-white/[0.07] py-8">
                        <div className="grid gap-6 md:grid-cols-[1fr_auto] md:gap-10">
                          <div className="min-w-0">
                            <div className="mb-3 flex flex-wrap items-center gap-x-4 gap-y-2">
                              <Link href={`/profile/${a?._id}`}
                                className="inline-flex items-center gap-1.5 text-[17px] font-medium text-white transition hover:text-green-400">
                                {a?.name}
                                {a?.verificationStatus === 'verified' && <VerifiedBadge size={14} />}
                              </Link>
                              <Status value={app.status} />
                              <span className="mono text-[11px] text-white/30">{timeAgo(app.createdAt)}</span>
                            </div>
                            <p className="max-w-2xl whitespace-pre-wrap text-[15px] leading-relaxed text-white/60">{app.coverLetter}</p>
                            {a?.phone && <p className="mono mt-3 text-[13px] text-white/45">{a.phone}</p>}
                          </div>
                          {app.proposedRate ? (
                            <div className="md:text-right">
                              <p className="text-[12px] text-white/40">Their rate</p>
                              <p className="mono mt-1 text-xl text-green-400">{naira(app.proposedRate)}</p>
                            </div>
                          ) : null}
                        </div>

                        <div className="mt-6 flex flex-wrap items-center gap-2">
                          {app.status === 'pending' && isOpen && (
                            <>
                              <button onClick={() => updateApplicationStatus(app._id, 'accepted')} disabled={busy}
                                className="inline-flex items-center gap-2 rounded-full bg-green-400 px-4 py-2 text-[13px] font-medium text-[#080f0a] transition hover:bg-green-300 disabled:opacity-50">
                                {busy && <Loader2 size={13} className="animate-spin" />} Hire
                              </button>
                              <button onClick={() => updateApplicationStatus(app._id, 'rejected')} disabled={busy} className={btnGhost}>
                                Decline
                              </button>
                            </>
                          )}

                          {app.status === 'accepted' && !isJobCompleted && (
                            <button onClick={() => confirmComplete(app)} disabled={busy}
                              className="inline-flex items-center gap-2 rounded-full bg-green-400 px-4 py-2 text-[13px] font-medium text-[#080f0a] transition hover:bg-green-300 disabled:opacity-50">
                              Mark job as done
                            </button>
                          )}

                          {app.status === 'completed' && !app.paidAt && (
                            <button onClick={() => openPayment(app)}
                              className="inline-flex items-center gap-2 rounded-full bg-green-400 px-4 py-2 text-[13px] font-medium text-[#080f0a] transition hover:bg-green-300">
                              Pay via 100Gigs
                            </button>
                          )}
                          {app.status === 'completed' && app.paidAt && (
                            <span className="mono px-2 text-[11px] uppercase tracking-[0.12em] text-green-400">Paid ✓</span>
                          )}

                          <button onClick={() => startChat(a)} className={btnGhost}>Message</button>

                          {(app.status === 'accepted' || app.status === 'completed') && (
                            <button onClick={() => openRatingModal(a)} className={btnGhost}>Rate</button>
                          )}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </section>
        )}
      </div>

      {/* ─── Mark complete ─── */}
      <Modal open={showCompleteModal && !!completeTarget} onClose={() => !markingComplete && setShowCompleteModal(false)}>
        <p className="mono mb-4 text-[10px] uppercase tracking-[0.16em] text-white/35">Confirm</p>
        <h2 className="serif pr-8 text-3xl leading-tight">Is the job done?</h2>
        <p className="mt-4 text-[14px] leading-relaxed text-white/60">
          Only confirm if <span className="text-white">{completeTarget?.applicant?.name}</span> has finished the work and you’re happy with it.
          Next, you’ll pay them through 100Gigs.
        </p>
        <p className="mt-4 border-l-2 border-amber-300 pl-3 text-[13px] leading-relaxed text-amber-200/80">
          This can’t be undone. The job closes once it’s marked done.
        </p>
        <div className="mt-8 flex flex-col-reverse gap-3 sm:flex-row">
          <button onClick={() => setShowCompleteModal(false)} disabled={markingComplete} className={`${btnGhost} flex-1 py-3`}>Not yet</button>
          <button onClick={handleMarkComplete} disabled={markingComplete} className={`${btnPrimary} flex-1`}>
            {markingComplete ? <><Loader2 size={15} className="animate-spin" /> Confirming…</> : 'Yes, it’s done'}
          </button>
        </div>
      </Modal>

      {/* ─── Payment ─── */}
      <Modal open={showPaymentModal && !!paymentTarget} onClose={() => !initiatingPayment && setShowPaymentModal(false)}>
        <p className="mono mb-4 text-[10px] uppercase tracking-[0.16em] text-white/35">Payment</p>
        <h2 className="serif pr-8 text-3xl leading-tight">Pay {paymentTarget?.applicant?.name?.split(' ')[0]}</h2>

        <label htmlFor="amt" className={`${label} mt-8`}>Amount (₦)</label>
        <input id="amt" type="number" inputMode="numeric" min="100" value={payAmount}
          onChange={(e) => setPayAmount(e.target.value)} placeholder="0"
          className="mono w-full border-b border-white/15 bg-transparent pb-3 text-3xl text-white outline-none transition-colors placeholder:text-white/20 focus:border-green-400" />

        {payAmount && Number(payAmount) >= 100 && (
          <dl className="mt-6 space-y-2.5 text-[13px]">
            <div className="flex justify-between"><dt className="text-white/45">You pay</dt><dd className="mono text-white">{naira(payAmount)}</dd></div>
            <div className="flex justify-between"><dt className="text-white/45">100Gigs fee (10%)</dt><dd className="mono text-white/60">− {naira(commission)}</dd></div>
            <div className="flex justify-between border-t border-white/10 pt-2.5">
              <dt className="text-white/70">{paymentTarget?.applicant?.name?.split(' ')[0]} receives</dt>
              <dd className="mono text-green-400">{naira(providerGets)}</dd>
            </div>
          </dl>
        )}

        <p className="mt-6 text-[12px] leading-relaxed text-white/35">
          Secure checkout by Paystack. The provider is notified as soon as payment goes through.
        </p>

        <div className="mt-8 flex flex-col-reverse gap-3 sm:flex-row">
          <button onClick={() => setShowPaymentModal(false)} disabled={initiatingPayment} className={`${btnGhost} flex-1 py-3`}>Later</button>
          <button onClick={initiatePayment} disabled={initiatingPayment || !payAmount || Number(payAmount) < 100} className={`${btnPrimary} flex-1`}>
            {initiatingPayment ? <><Loader2 size={15} className="animate-spin" /> Opening Paystack…</> : <>Pay {naira(payAmount)}</>}
          </button>
        </div>
      </Modal>

      {/* ─── Rating ─── */}
      <Modal open={showRatingModal} onClose={() => !submittingRating && setShowRatingModal(false)}>
        <p className="mono mb-4 text-[10px] uppercase tracking-[0.16em] text-white/35">Review</p>
        <h2 className="serif pr-8 text-3xl leading-tight">How did {ratingTarget?.name?.split(' ')[0]} do?</h2>

        <div className="mt-8 flex gap-2" onMouseLeave={() => setHoverValue(0)}>
          {[1, 2, 3, 4, 5].map((star) => {
            const lit = (hoverValue || ratingValue) >= star;
            return (
              <button key={star} type="button" aria-label={`${star} star${star > 1 ? 's' : ''}`}
                onClick={() => setRatingValue(star)} onMouseEnter={() => setHoverValue(star)}
                className={`text-4xl leading-none transition ${lit ? 'text-amber-300' : 'text-white/15 hover:text-white/30'}`}>
                ★
              </button>
            );
          })}
        </div>
        <p className="mono mt-3 h-4 text-[11px] text-white/40">
          {['', 'Poor', 'Below expectations', 'Okay', 'Good', 'Excellent'][hoverValue || ratingValue]}
        </p>

        <label htmlFor="review" className={`${label} mt-6`}>Review <span className="normal-case tracking-normal text-white/25">· optional</span></label>
        <textarea id="review" value={reviewText} onChange={(e) => setReviewText(e.target.value)} rows={3}
          placeholder="Were they on time? Was the work clean? Would you hire them again?"
          className={`${underlineInput} resize-none leading-relaxed`} />

        <div className="mt-8 flex flex-col-reverse gap-3 sm:flex-row">
          <button onClick={() => setShowRatingModal(false)} disabled={submittingRating} className={`${btnGhost} flex-1 py-3`}>Cancel</button>
          <button onClick={submitRating} disabled={submittingRating || !ratingValue} className={`${btnPrimary} flex-1`}>
            {submittingRating ? <><Loader2 size={15} className="animate-spin" /> Sending…</> : 'Submit review'}
          </button>
        </div>
      </Modal>
    </>
  );
}