'use client';
import { useSession } from 'next-auth/react';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Briefcase, MessageCircle, Clock, Plus,
  Users, CheckCircle, XCircle, MapPin, ArrowRight, Sparkles,
  ShieldCheck, ShieldAlert
} from 'lucide-react';

export default function Dashboard() {
  const { data: session, status } = useSession();
  const [myJobs, setMyJobs] = useState([]);
  const [myApplications, setMyApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [verification, setVerification] = useState(null);

  useEffect(() => {
    if (session) fetchDashboardData();
  }, [session]);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      if (session.user.role === 'client' || session.user.role === 'admin') {
        const res = await fetch('/api/jobs/my-jobs');
        if (!res.ok) { setMyJobs([]); return; }
        const data = await res.json();
        setMyJobs(Array.isArray(data) ? data : []);
      } else {
        const res = await fetch('/api/applications/my-applications');
        if (!res.ok) { setMyApplications([]); return; }
        const data = await res.json();
        setMyApplications(Array.isArray(data) ? data : []);

        // Fetch verification status for providers
        const vRes = await fetch('/api/verification/upload');
        if (vRes.ok) setVerification(await vRes.json());
      }
    } catch (err) {
      console.error('Failed to load dashboard', err);
    } finally {
      setLoading(false);
    }
  };

  if (status === 'loading') {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#080f0a]">
        <div className="w-10 h-10 rounded-full border-2 border-green-500/20 border-t-green-500 animate-spin" />
      </div>
    );
  }

  if (!session) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-[#080f0a] gap-4">
        <p className="text-white/40">Please login to view your dashboard</p>
        <Link href="/login" className="bg-green-600 text-white px-6 py-3 rounded-xl hover:bg-green-500 transition">
          Go to Login
        </Link>
      </div>
    );
  }

  const totalApplicants = myJobs.reduce((sum, job) => sum + (job.applicants?.length || 0), 0);
  const openJobs        = myJobs.filter(j => j.status === 'open').length;
  const acceptedApps    = myApplications.filter(a => a.status === 'accepted').length;
  const pendingApps     = myApplications.filter(a => a.status === 'pending').length;

  const glassCard = {
    background: 'rgba(255,255,255,0.04)',
    border: '1px solid rgba(255,255,255,0.08)',
    backdropFilter: 'blur(12px)',
    WebkitBackdropFilter: 'blur(12px)',
  };

  const isClientLike = session.user.role === 'client' || session.user.role === 'admin';

  const statCards = isClientLike ? [
    { icon: Briefcase,      label: 'Total Jobs',       value: myJobs.length,    color: 'rgba(74,222,128,0.15)',  iconColor: '#4ade80' },
    { icon: CheckCircle,    label: 'Open Jobs',        value: openJobs,         color: 'rgba(96,165,250,0.15)',  iconColor: '#60a5fa' },
    { icon: Users,          label: 'Total Applicants', value: totalApplicants,  color: 'rgba(251,191,36,0.15)',  iconColor: '#fbbf24' },
    { icon: MessageCircle,  label: 'Messages',         value: '→',              color: 'rgba(167,139,250,0.15)', iconColor: '#a78bfa', href: '/chat' },
  ] : [
    { icon: Briefcase,      label: 'Applied',  value: myApplications.length, color: 'rgba(74,222,128,0.15)',  iconColor: '#4ade80' },
    { icon: Clock,          label: 'Pending',  value: pendingApps,           color: 'rgba(251,191,36,0.15)',  iconColor: '#fbbf24' },
    { icon: CheckCircle,    label: 'Accepted', value: acceptedApps,          color: 'rgba(74,222,128,0.15)',  iconColor: '#4ade80' },
    { icon: MessageCircle,  label: 'Messages', value: '→',                   color: 'rgba(167,139,250,0.15)', iconColor: '#a78bfa', href: '/chat' },
  ];

  // Only nudge providers who haven't successfully verified yet
  const showVerificationPrompt =
    session.user.role === 'provider' &&
    verification &&
    verification.verificationStatus !== 'verified';

  const verificationBannerContent = () => {
    const s = verification?.verificationStatus;
    if (s === 'pending') {
      return {
        icon: Clock,
        color: '#facc15',
        bg: 'rgba(250,204,21,0.08)',
        border: 'rgba(250,204,21,0.2)',
        title: 'Verification pending review',
        body: 'An admin is reviewing your submitted document. This usually takes 1-2 business days.',
        cta: 'View Status',
      };
    }
    if (s === 'rejected') {
      return {
        icon: ShieldAlert,
        color: '#f87171',
        bg: 'rgba(248,113,113,0.08)',
        border: 'rgba(248,113,113,0.2)',
        title: 'Verification needs attention',
        body: verification?.verificationRejectionReason || 'Your document was rejected. Please re-submit.',
        cta: 'Re-submit',
      };
    }
    // unsubmitted
    return {
      icon: ShieldCheck,
      color: '#4ade80',
      bg: 'rgba(74,222,128,0.08)',
      border: 'rgba(74,222,128,0.2)',
      title: 'Get verified to stand out',
      body: 'Clients trust verified providers more. Upload a quick ID check to earn your badge.',
      cta: 'Get Verified',
    };
  };

  return (
    <div className="min-h-screen bg-[#080f0a] relative overflow-x-hidden">
      <style>{`
        @keyframes fadeUp { from { opacity:0; transform:translateY(16px); } to { opacity:1; transform:translateY(0); } }
        @keyframes drift {
          0%,100% { transform:translate(0,0) scale(1); }
          33% { transform:translate(30px,-20px) scale(1.05); }
          66% { transform:translate(-20px,15px) scale(0.97); }
        }
        .fade-up { animation: fadeUp 0.5s cubic-bezier(.22,1,.36,1) forwards; }
        .drift { animation: drift 14s ease-in-out infinite; }
        .d1{animation-delay:.05s} .d2{animation-delay:.1s} .d3{animation-delay:.15s}
        .d4{animation-delay:.2s}  .d5{animation-delay:.25s} .d6{animation-delay:.3s}
      `}</style>

      {/* Background orbs */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-10%] left-[-5%] w-[500px] h-[500px] rounded-full drift"
          style={{ background: 'radial-gradient(circle, rgba(22,163,74,0.12) 0%, transparent 70%)' }} />
        <div className="absolute bottom-[-10%] right-[-5%] w-[500px] h-[500px] rounded-full drift"
          style={{ background: 'radial-gradient(circle, rgba(16,185,129,0.1) 0%, transparent 70%)', animationDelay: '5s' }} />
        <div className="absolute inset-0 opacity-[0.025]" style={{
          backgroundImage: 'linear-gradient(rgba(255,255,255,0.8) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.8) 1px, transparent 1px)',
          backgroundSize: '72px 72px',
        }} />
      </div>

      <div className="relative max-w-6xl mx-auto px-4 py-10">

        {/* Header */}
        <div className="mb-8 opacity-0 fade-up">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-semibold uppercase tracking-widest text-green-400/60">Dashboard</span>
          </div>
          <h1 className="text-3xl md:text-4xl font-bold text-white">
            Hey, {session.user.name?.split(' ')[0]} 👋
          </h1>
          <p className="text-white/30 text-sm mt-1 capitalize">{session.user.role} account</p>
        </div>

        {/* ── Verification banner (providers only, unless verified) ── */}
        {showVerificationPrompt && (() => {
          const banner = verificationBannerContent();
          const Icon = banner.icon;
          return (
            <Link href="/verification"
              className="flex items-center gap-4 p-5 rounded-2xl mb-6 opacity-0 fade-up transition hover:brightness-110"
              style={{ background: banner.bg, border: `1px solid ${banner.border}` }}>
              <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                style={{ background: `${banner.color}22` }}>
                <Icon size={20} style={{ color: banner.color }} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-white">{banner.title}</p>
                <p className="text-xs text-white/40 mt-0.5">{banner.body}</p>
              </div>
              <span className="flex items-center gap-1 text-xs font-semibold shrink-0"
                style={{ color: banner.color }}>
                {banner.cta} <ArrowRight size={13} />
              </span>
            </Link>
          );
        })()}

        {/* Stat Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
          {statCards.map((s, i) => (
            <div
              key={i}
              className={`p-5 rounded-2xl opacity-0 fade-up d${i + 1}`}
              style={glassCard}
            >
              <div className="w-9 h-9 rounded-xl flex items-center justify-center mb-3"
                style={{ background: s.color }}>
                <s.icon size={17} style={{ color: s.iconColor }} />
              </div>
              <p className="text-xs text-white/35 font-medium mb-1">{s.label}</p>
              {s.href ? (
                <Link href={s.href} className="text-2xl font-bold text-white hover:text-green-400 transition">{s.value}</Link>
              ) : (
                <p className="text-2xl font-bold text-white">{s.value}</p>
              )}
            </div>
          ))}
        </div>

        {/* Main grid */}
        <div className="grid md:grid-cols-12 gap-6">

          {/* Main content */}
          <div className="md:col-span-8 opacity-0 fade-up d3">
            {isClientLike ? (
              <>
                <div className="flex justify-between items-center mb-5">
                  <h2 className="text-lg font-semibold text-white">My Posted Jobs</h2>
                  <Link href="/post-job"
                    className="flex items-center gap-2 text-xs font-semibold px-4 py-2 rounded-xl text-white transition"
                    style={{ background: 'linear-gradient(135deg,#16a34a,#15803d)', boxShadow: '0 4px 16px rgba(22,163,74,0.3)' }}>
                    <Plus size={14} /> Post New Job
                  </Link>
                </div>

                {loading ? (
                  <div className="space-y-3">
                    {[1,2,3].map(i => (
                      <div key={i} className="p-6 rounded-2xl animate-pulse" style={glassCard}>
                        <div className="h-4 rounded-lg w-3/4 mb-3" style={{ background: 'rgba(255,255,255,0.06)' }} />
                        <div className="h-3 rounded-lg w-1/4" style={{ background: 'rgba(255,255,255,0.04)' }} />
                      </div>
                    ))}
                  </div>
                ) : myJobs.length === 0 ? (
                  <div className="p-14 rounded-2xl text-center" style={glassCard}>
                    <Briefcase size={36} className="mx-auto mb-4" style={{ color: 'rgba(255,255,255,0.15)' }} />
                    <p className="text-white/40 mb-5 text-sm">No jobs posted yet.</p>
                    <Link href="/post-job"
                      className="inline-flex items-center gap-2 text-sm font-semibold px-6 py-3 rounded-xl text-white transition"
                      style={{ background: 'linear-gradient(135deg,#16a34a,#15803d)', boxShadow: '0 4px 16px rgba(22,163,74,0.3)' }}>
                      Post Your First Job
                    </Link>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {myJobs.map(job => (
                      <div key={job._id} className="p-5 rounded-2xl transition-all hover:border-white/15 group"
                        style={{ ...glassCard, transition: 'border-color 0.2s' }}>
                        <div className="flex justify-between items-start mb-2">
                          <h3 className="font-semibold text-white text-base group-hover:text-green-400 transition-colors">{job.title}</h3>
                          <span className={`text-[11px] px-2.5 py-1 rounded-full font-semibold capitalize ${
                            job.status === 'open'
                              ? 'text-green-400 bg-green-400/10 border border-green-400/20'
                              : 'text-white/30 bg-white/5 border border-white/10'
                          }`}>
                            {job.status}
                          </span>
                        </div>
                        <p className="text-green-400 font-semibold text-sm mb-3">
                          ₦{job.budgetMin?.toLocaleString()} — ₦{job.budgetMax?.toLocaleString()}
                        </p>
                        <div className="flex items-center gap-4 text-xs text-white/30">
                          <span className="flex items-center gap-1"><MapPin size={11} />{job.location}</span>
                          <span className="flex items-center gap-1"><Clock size={11} />{new Date(job.createdAt).toLocaleDateString()}</span>
                        </div>
                        <div className="flex items-center justify-between mt-4 pt-4 border-t border-white/5">
                          <span className={`flex items-center gap-1.5 text-xs font-medium ${job.applicants?.length > 0 ? 'text-green-400' : 'text-white/25'}`}>
                            <Users size={13} />
                            {job.applicants?.length || 0} applicant{job.applicants?.length !== 1 ? 's' : ''}
                          </span>
                          <Link href={`/jobs/${job._id}`}
                            className="flex items-center gap-1 text-xs font-semibold text-green-400 hover:text-green-300 transition">
                            View & Manage <ArrowRight size={13} />
                          </Link>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            ) : (
              <>
                <div className="flex justify-between items-center mb-5">
                  <h2 className="text-lg font-semibold text-white">My Applications</h2>
                  <Link href="/browse" className="flex items-center gap-1 text-xs font-semibold text-green-400 hover:text-green-300 transition">
                    Browse More <ArrowRight size={13} />
                  </Link>
                </div>

                {loading ? (
                  <div className="space-y-3">
                    {[1,2,3].map(i => (
                      <div key={i} className="p-6 rounded-2xl animate-pulse" style={glassCard}>
                        <div className="h-4 rounded-lg w-3/4 mb-3" style={{ background: 'rgba(255,255,255,0.06)' }} />
                        <div className="h-3 rounded-lg w-1/4" style={{ background: 'rgba(255,255,255,0.04)' }} />
                      </div>
                    ))}
                  </div>
                ) : myApplications.length === 0 ? (
                  <div className="p-14 rounded-2xl text-center" style={glassCard}>
                    <Clock size={36} className="mx-auto mb-4" style={{ color: 'rgba(255,255,255,0.15)' }} />
                    <p className="text-white/40 mb-5 text-sm">No applications yet.</p>
                    <Link href="/browse"
                      className="inline-flex items-center gap-2 text-sm font-semibold px-6 py-3 rounded-xl text-white"
                      style={{ background: 'linear-gradient(135deg,#16a34a,#15803d)', boxShadow: '0 4px 16px rgba(22,163,74,0.3)' }}>
                      Browse Jobs
                    </Link>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {myApplications.map(app => (
                      <div key={app._id} className="p-5 rounded-2xl group transition-all hover:border-white/15"
                        style={{ ...glassCard, transition: 'border-color 0.2s' }}>
                        <div className="flex justify-between items-start mb-2">
                          <h3 className="font-semibold text-white group-hover:text-green-400 transition-colors">
                            {app.job?.title || 'Job no longer available'}
                          </h3>
                          <span className={`text-[11px] px-2.5 py-1 rounded-full font-semibold capitalize ${
                            app.status === 'accepted' ? 'text-green-400 bg-green-400/10 border border-green-400/20'
                            : app.status === 'rejected' ? 'text-red-400 bg-red-400/10 border border-red-400/20'
                            : 'text-yellow-400 bg-yellow-400/10 border border-yellow-400/20'
                          }`}>
                            {app.status}
                          </span>
                        </div>
                        {app.job && (
                          <>
                            <p className="text-green-400 font-semibold text-sm mb-2">
                              ₦{app.job.budgetMin?.toLocaleString()} — ₦{app.job.budgetMax?.toLocaleString()}
                            </p>
                            <div className="flex items-center gap-4 text-xs text-white/30">
                              <span className="flex items-center gap-1"><MapPin size={11} />{app.job.location}</span>
                              <span className="flex items-center gap-1 capitalize"><Briefcase size={11} />{app.job.category}</span>
                            </div>
                          </>
                        )}
                        <div className="flex items-center justify-between mt-4 pt-4 border-t border-white/5">
                          <span className="text-xs text-white/25">
                            Applied {new Date(app.createdAt).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' })}
                          </span>
                          {app.job && (
                            <Link href={`/jobs/${app.job._id}`}
                              className="flex items-center gap-1 text-xs font-semibold text-green-400 hover:text-green-300 transition">
                              View Job <ArrowRight size={13} />
                            </Link>
                          )}
                        </div>
                        {app.status === 'accepted' && (
                          <div className="mt-3 p-3 rounded-xl flex items-center gap-2 text-xs text-green-400"
                            style={{ background: 'rgba(74,222,128,0.08)', border: '1px solid rgba(74,222,128,0.2)' }}>
                            <CheckCircle size={14} />
                            Congratulations! Your application was accepted. Contact the client to get started.
                          </div>
                        )}
                        {app.status === 'rejected' && (
                          <div className="mt-3 p-3 rounded-xl flex items-center gap-2 text-xs text-red-400"
                            style={{ background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.2)' }}>
                            <XCircle size={14} />
                            This application wasn't accepted. Keep applying to other jobs!
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>

          {/* Sidebar */}
          <div className="md:col-span-4 space-y-4 opacity-0 fade-up d4">

            {/* Quick Actions */}
            <div className="p-5 rounded-2xl" style={glassCard}>
              <p className="text-xs font-semibold uppercase tracking-widest text-white/30 mb-4">Quick Actions</p>
              <div className="space-y-1">
                {isClientLike ? (
                  <>
                    <Link href="/post-job" className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-white/70 hover:text-white hover:bg-white/5 transition">
                      <Plus size={16} className="text-green-400" /> Post a New Job
                    </Link>
                    <Link href="/browse" className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-white/70 hover:text-white hover:bg-white/5 transition">
                      <Briefcase size={16} className="text-green-400" /> Browse All Jobs
                    </Link>
                  </>
                ) : (
                  <>
                    <Link href="/browse" className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-white/70 hover:text-white hover:bg-white/5 transition">
                      <Briefcase size={16} className="text-green-400" /> Find New Jobs
                    </Link>
                    <Link href="/profile" className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-white/70 hover:text-white hover:bg-white/5 transition">
                      <Users size={16} className="text-green-400" /> Update Profile
                    </Link>
                    <Link href="/verification" className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-white/70 hover:text-white hover:bg-white/5 transition">
                      <ShieldCheck size={16} className="text-green-400" />
                      Get Verified
                      {verification?.verificationStatus === 'verified' && (
                        <span className="ml-auto text-[10px] font-semibold px-2 py-0.5 rounded-full"
                          style={{ background: 'rgba(74,222,128,0.15)', color: '#4ade80', border: '1px solid rgba(74,222,128,0.25)' }}>
                          Done
                        </span>
                      )}
                    </Link>
                  </>
                )}
                <Link href="/chat" className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-white/70 hover:text-white hover:bg-white/5 transition">
                  <MessageCircle size={16} className="text-green-400" /> Go to Messages
                </Link>
              </div>
            </div>

            {/* Messages CTA */}
            <div className="p-5 rounded-2xl relative overflow-hidden"
              style={{ background: 'linear-gradient(135deg, rgba(22,163,74,0.2) 0%, rgba(5,150,105,0.15) 100%)', border: '1px solid rgba(74,222,128,0.2)' }}>
              <div className="absolute top-[-20px] right-[-20px] w-24 h-24 rounded-full"
                style={{ background: 'radial-gradient(circle, rgba(74,222,128,0.15) 0%, transparent 70%)' }} />
              <MessageCircle size={20} className="text-green-400 mb-3" />
              <p className="text-white font-semibold text-sm mb-1">Messages</p>
              <p className="text-white/40 text-xs mb-4">
                View your conversations with {isClientLike ? 'service providers' : 'clients'}.
              </p>
              <Link href="/chat"
                className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl text-sm font-semibold text-white transition"
                style={{ background: 'rgba(74,222,128,0.2)', border: '1px solid rgba(74,222,128,0.3)' }}>
                Open Messages <ArrowRight size={14} />
              </Link>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}