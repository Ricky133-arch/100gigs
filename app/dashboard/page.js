'use client';
import { useSession } from 'next-auth/react';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, ArrowUpRight, Plus } from 'lucide-react';

/* ── helpers ─────────────────────────────────────────────── */

const naira = (n) => (typeof n === 'number' ? `₦${n.toLocaleString('en-NG')}` : null);

function budget(job) {
  const lo = naira(job?.budgetMin);
  const hi = naira(job?.budgetMax);
  if (lo && hi && job.budgetMin !== job.budgetMax) return `${lo} – ${hi}`;
  return lo || hi || 'Open';
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

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

const STATUS_STYLE = {
  open: { dot: 'bg-green-400', text: 'text-green-400', label: 'Open' },
  accepted: { dot: 'bg-green-400', text: 'text-green-400', label: 'Accepted' },
  pending: { dot: 'bg-amber-300', text: 'text-amber-300', label: 'Pending' },
  rejected: { dot: 'bg-red-400', text: 'text-red-400', label: 'Not selected' },
  'in-progress': { dot: 'bg-sky-300', text: 'text-sky-300', label: 'In progress' },
  completed: { dot: 'bg-green-400', text: 'text-green-400', label: 'Completed' },
  cancelled: { dot: 'bg-white/30', text: 'text-white/40', label: 'Cancelled' },
};

function Status({ value }) {
  const s = STATUS_STYLE[value] || { dot: 'bg-white/30', text: 'text-white/40', label: value || '—' };
  return (
    <span className={`mono inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.12em] ${s.text}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${s.dot}`} />
      {s.label}
    </span>
  );
}

function RowSkeleton() {
  return (
    <ul>
      {[0, 1, 2].map((i) => (
        <li key={i} className="border-b border-white/[0.07] py-6">
          <div className="mb-3 h-3 w-24 animate-pulse bg-white/[0.06]" />
          <div className="mb-2 h-5 w-2/3 animate-pulse bg-white/[0.08]" />
          <div className="h-3 w-1/3 animate-pulse bg-white/[0.05]" />
        </li>
      ))}
    </ul>
  );
}

/* ── page ────────────────────────────────────────────────── */

export default function Dashboard() {
  const { data: session, status } = useSession();
  const [myJobs, setMyJobs] = useState([]);
  const [myApplications, setMyApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [verification, setVerification] = useState(null);

  useEffect(() => {
    if (session) fetchDashboardData();
  }, [session]); // eslint-disable-line react-hooks/exhaustive-deps

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      if (session.user.role === 'client' || session.user.role === 'admin') {
        const res = await fetch('/api/jobs/my-jobs');
        const data = res.ok ? await res.json() : [];
        setMyJobs(Array.isArray(data) ? data : []);
      } else {
        // Load applications and verification side by side; one failing
        // no longer stops the other from loading
        const [appsRes, vRes] = await Promise.allSettled([
          fetch('/api/applications/my-applications'),
          fetch('/api/verification/upload'),
        ]);
        if (appsRes.status === 'fulfilled' && appsRes.value.ok) {
          const data = await appsRes.value.json();
          setMyApplications(Array.isArray(data) ? data : []);
        } else {
          setMyApplications([]);
        }
        if (vRes.status === 'fulfilled' && vRes.value.ok) {
          setVerification(await vRes.value.json());
        }
      }
    } catch (err) {
      console.error('Failed to load dashboard', err);
    } finally {
      setLoading(false);
    }
  };

  const shell = (children) => (
    <div className="db min-h-screen bg-[#080f0a] text-[#e9efe9] antialiased">
      <style>{`
        .db { font-family: var(--font-sans), ui-sans-serif, system-ui, sans-serif; }
        .serif { font-family: var(--font-serif), Georgia, serif; font-weight: 400; letter-spacing: -0.01em; }
        .mono { font-family: var(--font-mono), ui-monospace, monospace; }
      `}</style>
      {children}
    </div>
  );

  if (status === 'loading') {
    return shell(
      <div className="flex min-h-screen items-center justify-center">
        <p className="mono text-[11px] uppercase tracking-[0.18em] text-white/35">Loading…</p>
      </div>
    );
  }

  if (!session) {
    return shell(
      <div className="mx-auto flex min-h-screen max-w-6xl flex-col justify-center px-5 md:px-8">
        <p className="serif text-5xl leading-none">Log in to see your dashboard.</p>
        <Link href="/login"
          className="mt-8 inline-flex w-max items-center gap-2 rounded-full bg-green-400 px-6 py-3 text-[14px] font-medium text-[#080f0a] transition hover:bg-green-300">
          Log in <ArrowRight size={15} />
        </Link>
      </div>
    );
  }

  const isClientLike = session.user.role === 'client' || session.user.role === 'admin';
  const firstName = session.user.name?.split(' ')[0];

  const totalApplicants = myJobs.reduce((sum, job) => sum + (job.applicants?.length || 0), 0);
  const openJobs = myJobs.filter((j) => j.status === 'open').length;
  const acceptedApps = myApplications.filter((a) => a.status === 'accepted').length;
  const pendingApps = myApplications.filter((a) => a.status === 'pending').length;

  const stats = isClientLike
    ? [
        { label: 'Jobs posted', value: myJobs.length },
        { label: 'Still open', value: openJobs },
        { label: 'Applicants', value: totalApplicants, accent: totalApplicants > 0 },
      ]
    : [
        { label: 'Applied', value: myApplications.length },
        { label: 'Waiting', value: pendingApps },
        { label: 'Accepted', value: acceptedApps, accent: acceptedApps > 0 },
      ];

  // A one-line summary that tells people what to do next
  const summary = isClientLike
    ? myJobs.length === 0
      ? 'You haven’t posted a job yet.'
      : totalApplicants > 0
        ? `${totalApplicants} ${totalApplicants === 1 ? 'person has' : 'people have'} applied to your jobs.`
        : 'No applicants yet — they usually come in within a day.'
    : myApplications.length === 0
      ? 'You haven’t applied to anything yet.'
      : acceptedApps > 0
        ? `${acceptedApps} ${acceptedApps === 1 ? 'client has' : 'clients have'} accepted you. Get in touch.`
        : `${pendingApps} ${pendingApps === 1 ? 'application is' : 'applications are'} waiting on a reply.`;

  const vStatus = verification?.verificationStatus;
  const showVerification = session.user.role === 'provider' && verification && vStatus !== 'verified';
  const vCopy =
    vStatus === 'pending'
      ? { rule: 'border-amber-300', tag: 'text-amber-300', tagText: 'Under review', title: 'Your ID is being checked.', body: 'An admin is reviewing your document. This usually takes 1–2 business days.', cta: 'View status' }
      : vStatus === 'rejected'
        ? { rule: 'border-red-400', tag: 'text-red-400', tagText: 'Needs attention', title: 'Your verification was declined.', body: verification?.verificationRejectionReason || 'Please upload a clearer document and try again.', cta: 'Re-submit' }
        : { rule: 'border-green-400', tag: 'text-green-400', tagText: 'Not verified', title: 'Get your verified badge.', body: 'Clients pick verified providers first. A quick ID check is all it takes.', cta: 'Get verified' };

  const shortcuts = isClientLike
    ? [
        ['/post-job', 'Post a new job'],
        ['/browse', 'See all open jobs'],
        ['/chat', 'Messages'],
        ['/profile', 'Your profile'],
      ]
    : [
        ['/browse', 'Find new jobs'],
        ['/chat', 'Messages'],
        ['/profile', 'Update your profile'],
        ['/verification', vStatus === 'verified' ? 'Verification ✓' : 'Get verified'],
      ];

  return shell(
    <div className="mx-auto max-w-6xl px-5 pb-16 pt-10 md:px-8 md:pt-16">

      {/* Header */}
      <header className="mb-12">
        <p className="mono mb-5 text-[11px] uppercase tracking-[0.18em] text-white/35">
          {session.user.role} account
        </p>
        <h1 className="serif text-5xl leading-[0.95] md:text-7xl">
          {greeting()},<br /><em className="text-green-400">{firstName}.</em>
        </h1>
        {!loading && <p className="mt-6 max-w-lg text-[15px] leading-relaxed text-white/55">{summary}</p>}
      </header>

      {/* Stats */}
      <dl className="mb-16 grid grid-cols-3 border-y border-white/10">
        {stats.map((s, i) => (
          <div key={s.label} className={`py-6 ${i > 0 ? 'border-l border-white/10 pl-5 md:pl-8' : ''}`}>
            <dt className="text-[12px] text-white/40">{s.label}</dt>
            <dd className={`mono mt-2 text-3xl md:text-4xl ${s.accent ? 'text-green-400' : 'text-white'}`}>
              {loading ? '–' : s.value}
            </dd>
          </div>
        ))}
      </dl>

      <div className="grid gap-16 lg:grid-cols-[1fr_300px] lg:gap-14">

        {/* ─── Main list ─── */}
        <section>
          <div className="mb-2 flex items-end justify-between gap-6">
            <h2 className="serif text-4xl leading-none">{isClientLike ? 'Your jobs' : 'Your applications'}</h2>
            {isClientLike ? (
              <Link href="/post-job"
                className="inline-flex items-center gap-1.5 rounded-full bg-green-400 px-4 py-2 text-[13px] font-medium text-[#080f0a] transition hover:bg-green-300">
                <Plus size={14} /> New job
              </Link>
            ) : (
              <Link href="/browse" className="inline-flex items-center gap-1.5 text-[13px] text-white/55 transition hover:text-green-400">
                Find more <ArrowUpRight size={14} />
              </Link>
            )}
          </div>

          <div className="border-t border-white/10">
            {loading ? (
              <RowSkeleton />
            ) : isClientLike ? (
              myJobs.length === 0 ? (
                <div className="py-14">
                  <p className="text-[15px] text-white/60">Describe what you need and local providers will apply.</p>
                  <Link href="/post-job" className="mt-5 inline-flex items-center gap-2 border-b border-green-400 pb-0.5 text-[15px] text-white transition hover:text-green-400">
                    Post your first job <ArrowRight size={15} className="text-green-400" />
                  </Link>
                </div>
              ) : (
                <ul>
                  {myJobs.map((job) => {
                    const n = job.applicants?.length || 0;
                    return (
                      <li key={job._id}>
                        <Link href={`/jobs/${job._id}`}
                          className="group grid gap-3 border-b border-white/[0.07] py-6 transition-colors hover:bg-white/[0.02] md:grid-cols-[1fr_auto] md:items-center md:gap-8 md:px-3">
                          <div className="min-w-0">
                            <div className="mb-2 flex flex-wrap items-center gap-x-3 gap-y-1">
                              <Status value={job.status} />
                              <span className="mono text-[11px] text-white/30">
                                {job.location && `${job.location} · `}{timeAgo(job.createdAt)}
                              </span>
                            </div>
                            <h3 className="mb-1 line-clamp-1 text-[17px] font-medium text-white transition-colors group-hover:text-green-400">
                              {job.title}
                            </h3>
                            <p className="mono text-[13px] text-white/50">{budget(job)}</p>
                          </div>
                          <div className="flex items-center justify-between gap-6 md:justify-end">
                            <p className={`text-[13px] ${n > 0 ? 'text-green-400' : 'text-white/35'}`}>
                              <span className="mono text-lg">{n}</span> {n === 1 ? 'applicant' : 'applicants'}
                            </p>
                            <span className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 text-white/40 transition group-hover:border-green-400 group-hover:bg-green-400 group-hover:text-[#080f0a]">
                              <ArrowUpRight size={16} />
                            </span>
                          </div>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              )
            ) : myApplications.length === 0 ? (
              <div className="py-14">
                <p className="text-[15px] text-white/60">Find a job near you, send a short note and your rate.</p>
                <Link href="/browse" className="mt-5 inline-flex items-center gap-2 border-b border-green-400 pb-0.5 text-[15px] text-white transition hover:text-green-400">
                  Browse open jobs <ArrowRight size={15} className="text-green-400" />
                </Link>
              </div>
            ) : (
              <ul>
                {myApplications.map((app) => {
                  const job = app.job;
                  const Row = job ? Link : 'div';
                  return (
                    <li key={app._id} className="border-b border-white/[0.07]">
                      <Row {...(job ? { href: `/jobs/${job._id}` } : {})}
                        className={`group grid gap-3 py-6 md:grid-cols-[1fr_auto] md:items-center md:gap-8 md:px-3 ${job ? 'transition-colors hover:bg-white/[0.02]' : ''}`}>
                        <div className="min-w-0">
                          <div className="mb-2 flex flex-wrap items-center gap-x-3 gap-y-1">
                            <Status value={app.status} />
                            <span className="mono text-[11px] text-white/30">
                              Applied {timeAgo(app.createdAt)}
                              {job?.location && ` · ${job.location}`}
                            </span>
                          </div>
                          <h3 className={`mb-1 line-clamp-1 text-[17px] font-medium transition-colors ${job ? 'text-white group-hover:text-green-400' : 'text-white/35'}`}>
                            {job?.title || 'This job has been removed'}
                          </h3>
                          {job && (
                            <p className="mono text-[13px] text-white/50">
                              {budget(job)}{job.category && <span className="text-white/30"> · {job.category}</span>}
                            </p>
                          )}
                        </div>
                        {job && (
                          <span className="hidden h-9 w-9 items-center justify-center rounded-full border border-white/10 text-white/40 transition group-hover:border-green-400 group-hover:bg-green-400 group-hover:text-[#080f0a] md:flex">
                            <ArrowUpRight size={16} />
                          </span>
                        )}
                      </Row>

                      {app.status === 'accepted' && (
                        <div className="-mt-2 mb-6 flex flex-wrap items-center justify-between gap-3 border-l-2 border-green-400 pl-4 md:mx-3">
                          <p className="text-[13px] text-white/70">You got it. Message the client to agree on a time.</p>
                          <Link href="/chat" className="inline-flex items-center gap-1.5 text-[13px] text-green-400 hover:underline underline-offset-4">
                            Open messages <ArrowRight size={13} />
                          </Link>
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </section>

        {/* ─── Side ─── */}
        <aside className="space-y-12">
          {showVerification && (
            <Link href="/verification" className={`group block border-l-2 ${vCopy.rule} pl-5`}>
              <p className={`mono mb-3 text-[10px] uppercase tracking-[0.16em] ${vCopy.tag}`}>{vCopy.tagText}</p>
              <p className="serif text-2xl leading-tight text-white">{vCopy.title}</p>
              <p className="mt-2 text-[13px] leading-relaxed text-white/50">{vCopy.body}</p>
              <span className="mt-4 inline-flex items-center gap-1.5 text-[13px] text-white transition group-hover:text-green-400">
                {vCopy.cta} <ArrowRight size={14} className="transition-transform group-hover:translate-x-0.5" />
              </span>
            </Link>
          )}

          <nav>
            <p className="mono mb-3 text-[10px] uppercase tracking-[0.16em] text-white/35">Shortcuts</p>
            <ul className="border-t border-white/10">
              {shortcuts.map(([href, label]) => (
                <li key={href}>
                  <Link href={href}
                    className="group flex items-center justify-between border-b border-white/10 py-3.5 text-[14px] text-white/75 transition hover:text-green-400">
                    {label}
                    <ArrowUpRight size={15} className="text-white/25 transition group-hover:text-green-400" />
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </aside>
      </div>
    </div>
  );
}