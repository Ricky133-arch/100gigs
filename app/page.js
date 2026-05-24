'use client';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
  MapPin, Users, Briefcase, Star, ArrowRight, CheckCircle,
  Clock, Shield, Zap, Wrench, Hammer, Car, Wind, Camera,
  Palette, BookOpen, PartyPopper, Truck, Sparkles, Search,
} from 'lucide-react';

const CATEGORIES = [
  { name: 'Plumbing', icon: <Wrench size={24} />, color: 'bg-blue-50 dark:bg-blue-900/20', iconColor: 'text-blue-500' },
  { name: 'Electrical', icon: <Zap size={24} />, color: 'bg-yellow-50 dark:bg-yellow-900/20', iconColor: 'text-yellow-500' },
  { name: 'Makeup & Hair', icon: <Sparkles size={24} />, color: 'bg-pink-50 dark:bg-pink-900/20', iconColor: 'text-pink-500' },
  { name: 'Carpentry', icon: <Hammer size={24} />, color: 'bg-orange-50 dark:bg-orange-900/20', iconColor: 'text-orange-500' },
  { name: 'Car Repair', icon: <Car size={24} />, color: 'bg-red-50 dark:bg-red-900/20', iconColor: 'text-red-500' },
  { name: 'Cleaning', icon: <Sparkles size={24} />, color: 'bg-cyan-50 dark:bg-cyan-900/20', iconColor: 'text-cyan-500' },
  { name: 'AC Repair', icon: <Wind size={24} />, color: 'bg-sky-50 dark:bg-sky-900/20', iconColor: 'text-sky-500' },
  { name: 'Photography', icon: <Camera size={24} />, color: 'bg-purple-50 dark:bg-purple-900/20', iconColor: 'text-purple-500' },
  { name: 'Graphic Design', icon: <Palette size={24} />, color: 'bg-violet-50 dark:bg-violet-900/20', iconColor: 'text-violet-500' },
  { name: 'Tutoring', icon: <BookOpen size={24} />, color: 'bg-green-50 dark:bg-green-900/20', iconColor: 'text-green-500' },
  { name: 'Event Planning', icon: <PartyPopper size={24} />, color: 'bg-rose-50 dark:bg-rose-900/20', iconColor: 'text-rose-500' },
  { name: 'Delivery', icon: <Truck size={24} />, color: 'bg-amber-50 dark:bg-amber-900/20', iconColor: 'text-amber-500' },
];

const HOW_IT_WORKS_CLIENT = [
  { step: '01', title: 'Post Your Job', desc: 'Describe what you need, set your budget, and pick your location in Port Harcourt.' },
  { step: '02', title: 'Receive Applications', desc: 'Skilled providers apply with cover letters and proposed rates. View their full profiles.' },
  { step: '03', title: 'Chat & Hire', desc: 'Message applicants directly, accept the best one, and get your job done.' },
];

const HOW_IT_WORKS_PROVIDER = [
  { step: '01', title: 'Build Your Profile', desc: 'Add your skills, bio, and location so clients can find and trust you.' },
  { step: '02', title: 'Browse & Apply', desc: 'Find jobs in your area, write a strong cover letter, and propose your rate.' },
  { step: '03', title: 'Get Hired & Earn', desc: 'Chat with clients, complete the work, earn money, and grow your reputation.' },
];

function useInView(threshold = 0.15) {
  const ref = useRef(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setInView(true); },
      { threshold }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);
  return [ref, inView];
}

function AnimatedCounter({ target, duration = 1500 }) {
  const [count, setCount] = useState(0);
  const [ref, inView] = useInView(0.5);
  useEffect(() => {
    if (!inView || target === 0) return;
    let start = 0;
    const step = target / (duration / 16);
    const timer = setInterval(() => {
      start += step;
      if (start >= target) { setCount(target); clearInterval(timer); }
      else setCount(Math.floor(start));
    }, 16);
    return () => clearInterval(timer);
  }, [inView, target]);
  return <span ref={ref}>{target === 0 ? '—' : count}</span>;
}

export default function Home() {
  const { data: session } = useSession();
  const router = useRouter();
  const [featuredJobs, setFeaturedJobs] = useState([]);
  const [jobsLoading, setJobsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [stats, setStats] = useState({ jobs: 0, users: 0, categories: 12 });
  const [heroVisible, setHeroVisible] = useState(false);

  const [categoriesRef, categoriesInView] = useInView();
  const [howItWorksRef, howItWorksInView] = useInView();
  const [jobsRef, jobsInView] = useInView();
  const [whyRef, whyInView] = useInView();

  useEffect(() => {
    const t = setTimeout(() => setHeroVisible(true), 100);
    fetchFeaturedJobs();
    fetchStats();
    return () => clearTimeout(t);
  }, []);

  const fetchFeaturedJobs = async () => {
    try {
      const res = await fetch('/api/jobs');
      if (!res.ok) return;
      const data = await res.json();
      setFeaturedJobs(Array.isArray(data) ? data.slice(0, 6) : []);
    } catch (e) { console.error(e); }
    finally { setJobsLoading(false); }
  };

  const fetchStats = async () => {
    try {
      const res = await fetch('/api/stats');
      if (!res.ok) return;
      const data = await res.json();
      setStats(data);
    } catch (e) { console.error(e); }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    router.push(searchQuery.trim()
      ? `/browse?search=${encodeURIComponent(searchQuery.trim())}`
      : '/browse'
    );
  };

  return (
    <div className="min-h-screen overflow-x-hidden">
      <style>{`
        @keyframes fadeUp { from { opacity:0; transform:translateY(24px); } to { opacity:1; transform:translateY(0); } }
        @keyframes fadeIn { from { opacity:0; } to { opacity:1; } }
        @keyframes slideRight { from { opacity:0; transform:translateX(-30px); } to { opacity:1; transform:translateX(0); } }
        @keyframes slideLeft { from { opacity:0; transform:translateX(30px); } to { opacity:1; transform:translateX(0); } }
        @keyframes scaleIn { from { opacity:0; transform:scale(0.93); } to { opacity:1; transform:scale(1); } }
        @keyframes float { 0%,100% { transform:translateY(0); } 50% { transform:translateY(-12px); } }
        @keyframes drift { 0%,100% { transform:translate(0,0) scale(1); } 33% { transform:translate(30px,-20px) scale(1.05); } 66% { transform:translate(-20px,15px) scale(0.97); } }
        .animate-fade-up { animation: fadeUp 0.65s cubic-bezier(.22,1,.36,1) forwards; }
        .animate-fade-in { animation: fadeIn 0.65s ease forwards; }
        .animate-slide-right { animation: slideRight 0.65s cubic-bezier(.22,1,.36,1) forwards; }
        .animate-slide-left { animation: slideLeft 0.65s cubic-bezier(.22,1,.36,1) forwards; }
        .animate-scale-in { animation: scaleIn 0.5s cubic-bezier(.22,1,.36,1) forwards; }
        .animate-float { animation: float 4s ease-in-out infinite; }
        .animate-drift { animation: drift 10s ease-in-out infinite; }
        .opacity-0 { opacity: 0; }
        .delay-100 { animation-delay: 0.1s; } .delay-200 { animation-delay: 0.2s; }
        .delay-300 { animation-delay: 0.3s; } .delay-400 { animation-delay: 0.4s; }
        .delay-500 { animation-delay: 0.5s; } .delay-600 { animation-delay: 0.6s; }
        .delay-700 { animation-delay: 0.7s; } .delay-800 { animation-delay: 0.8s; }
      `}</style>

      {/* ─── HERO ─── */}
      <section className="relative min-h-[92vh] flex flex-col bg-[#080f0a] text-white overflow-hidden">

        {/* Background layers */}
        <div className="absolute inset-0 pointer-events-none">
          {/* Noise texture */}
          <div className="absolute inset-0 opacity-[0.035]" style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
            backgroundSize: '200px 200px',
          }} />
          {/* Glow orbs */}
          <div className="absolute top-[-15%] left-[-5%] w-[600px] h-[600px] rounded-full animate-drift"
            style={{ background: 'radial-gradient(circle, rgba(22,163,74,0.18) 0%, transparent 70%)' }} />
          <div className="absolute bottom-[-20%] right-[-10%] w-[700px] h-[700px] rounded-full animate-drift"
            style={{ background: 'radial-gradient(circle, rgba(16,185,129,0.12) 0%, transparent 70%)', animationDelay: '3s' }} />
          <div className="absolute top-[35%] right-[25%] w-[300px] h-[300px] rounded-full animate-float"
            style={{ background: 'radial-gradient(circle, rgba(74,222,128,0.08) 0%, transparent 70%)', animationDelay: '1.5s' }} />
          {/* Subtle grid */}
          <div className="absolute inset-0 opacity-[0.04]" style={{
            backgroundImage: 'linear-gradient(rgba(255,255,255,0.8) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.8) 1px, transparent 1px)',
            backgroundSize: '72px 72px',
          }} />
          {/* Bottom fade */}
          <div className="absolute bottom-0 left-0 right-0 h-40"
            style={{ background: 'linear-gradient(to bottom, transparent, #080f0a)' }} />
        </div>

        {/* Top bar — logo + auth */}
        <div className={`relative z-10 flex items-center justify-between px-5 pt-5 pb-2 ${heroVisible ? 'animate-fade-in' : 'opacity-0'}`}>
          <Link href="/" className="text-2xl font-bold tracking-tight">
            <span className="text-green-400">100</span><span className="text-white">Gigs</span>
          </Link>
          {!session && (
            <div className="flex items-center gap-2">
              <Link href="/login"
                className="text-sm px-4 py-2 rounded-xl text-white/60 hover:text-white transition font-medium">
                Log In
              </Link>
              <Link href="/signup"
                className="text-sm px-4 py-2 rounded-xl bg-green-500 hover:bg-green-400 text-white transition font-semibold shadow-lg shadow-green-900/40">
                Sign Up
              </Link>
            </div>
          )}
        </div>

        {/* Hero content */}
        <div className="relative z-10 flex-1 flex flex-col items-center justify-center px-5 pb-16 pt-8 text-center">

          {/* Pill badge */}
          <div className={`inline-flex items-center gap-2 mb-7 px-4 py-1.5 rounded-full text-xs font-semibold tracking-wide border ${heroVisible ? 'animate-fade-up' : 'opacity-0'}`}
            style={{ background: 'rgba(22,163,74,0.12)', borderColor: 'rgba(74,222,128,0.25)', color: '#4ade80' }}>
            <span className="relative flex h-1.5 w-1.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-green-400" />
            </span>
            Port Harcourt · Rivers State
          </div>

          {/* Headline */}
          <h1 className={`text-[2.75rem] sm:text-6xl md:text-7xl font-bold leading-[1.05] tracking-tight mb-5 max-w-3xl ${heroVisible ? 'animate-fade-up delay-100' : 'opacity-0'}`}>
            Hire Skilled Hands
            <br />
            <span style={{
              background: 'linear-gradient(135deg, #4ade80 0%, #34d399 50%, #6ee7b7 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}>
              in Your City.
            </span>
          </h1>

          {/* Subheadline */}
          <p className={`text-base sm:text-lg text-white/50 max-w-md mb-10 leading-relaxed ${heroVisible ? 'animate-fade-up delay-200' : 'opacity-0'}`}>
            The go-to app for local gigs in PH — no middlemen, no stress, just results.
          </p>

          {/* Search */}
          <form onSubmit={handleSearch}
            className={`w-full max-w-lg mb-8 ${heroVisible ? 'animate-fade-up delay-300' : 'opacity-0'}`}>
            <div className="flex items-center gap-2 p-1.5 rounded-2xl"
              style={{
                background: 'rgba(255,255,255,0.06)',
                border: '1px solid rgba(255,255,255,0.1)',
                backdropFilter: 'blur(12px)',
              }}>
              <Search size={17} className="ml-3 text-white/30 shrink-0" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="plumbing, makeup, AC repair…"
                className="flex-1 bg-transparent text-white placeholder-white/25 outline-none text-sm py-2.5 min-w-0"
              />
              <button type="submit"
                className="bg-green-500 hover:bg-green-400 active:scale-95 text-white text-sm font-semibold px-5 py-2.5 rounded-xl transition shadow-lg shadow-green-900/40 shrink-0">
                Search
              </button>
            </div>
          </form>

          {/* Quick category pills */}
          <div className={`flex flex-wrap justify-center gap-2 mb-12 ${heroVisible ? 'animate-fade-up delay-400' : 'opacity-0'}`}>
            {['Plumbing', 'Electrical', 'Makeup & Hair', 'Car Repair', 'AC Repair'].map(term => (
              <button key={term} onClick={() => router.push(`/browse?category=${encodeURIComponent(term)}`)}
                className="text-xs px-3.5 py-1.5 rounded-full font-medium transition"
                style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.55)' }}
                onMouseEnter={e => { e.currentTarget.style.background = 'rgba(74,222,128,0.12)'; e.currentTarget.style.color = '#4ade80'; e.currentTarget.style.borderColor = 'rgba(74,222,128,0.3)'; }}
                onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.07)'; e.currentTarget.style.color = 'rgba(255,255,255,0.55)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'; }}>
                {term}
              </button>
            ))}
          </div>

          {/* CTAs */}
          <div className={`flex flex-col sm:flex-row gap-3 ${heroVisible ? 'animate-fade-up delay-500' : 'opacity-0'}`}>
            <Link href="/browse"
              className="group flex items-center justify-center gap-2 bg-green-500 hover:bg-green-400 text-white font-semibold px-7 py-3.5 rounded-2xl transition shadow-xl shadow-green-900/40 text-sm">
              <Briefcase size={17} /> Browse Jobs
              <ArrowRight size={15} className="group-hover:translate-x-0.5 transition-transform" />
            </Link>
            {!session && (
              <Link href="/signup"
                className="group flex items-center justify-center gap-2 font-semibold px-7 py-3.5 rounded-2xl transition text-sm"
                style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.8)' }}>
                Get Started Free
                <ArrowRight size={15} className="group-hover:translate-x-0.5 transition-transform" />
              </Link>
            )}
            {session?.user?.role === 'client' && (
              <Link href="/post-job"
                className="group flex items-center justify-center gap-2 font-semibold px-7 py-3.5 rounded-2xl transition text-sm"
                style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.8)' }}>
                Post a Job
                <ArrowRight size={15} className="group-hover:translate-x-0.5 transition-transform" />
              </Link>
            )}
          </div>
        </div>

        {/* Stats strip at bottom of hero */}
        <div className={`relative z-10 border-t mx-5 mb-6 pt-6 grid grid-cols-3 gap-4 text-center ${heroVisible ? 'animate-fade-up delay-600' : 'opacity-0'}`}
          style={{ borderColor: 'rgba(255,255,255,0.07)' }}>
          {[
            { value: stats.jobs, label: 'Jobs Posted', suffix: '+' },
            { value: stats.users, label: 'Members', suffix: '+' },
            { value: stats.categories, label: 'Categories', suffix: '+' },
          ].map((s, i) => (
            <div key={i}>
              <p className="text-2xl font-bold text-green-400">
                <AnimatedCounter target={s.value} />{s.value > 0 && s.suffix}
              </p>
              <p className="text-[11px] text-white/35 mt-0.5 font-medium">{s.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ─── CATEGORIES ─── */}
      <section className="py-24 bg-gray-50 dark:bg-gray-950" ref={categoriesRef}>
        <div className="max-w-6xl mx-auto px-4">
          <div className={`text-center mb-14 ${categoriesInView ? 'animate-fade-up' : 'opacity-0'}`}>
            <p className="text-green-600 font-semibold text-sm uppercase tracking-widest mb-3">What we offer</p>
            <h2 className="text-4xl md:text-5xl font-bold mb-4">Popular Services in PH</h2>
            <p className="text-gray-500 dark:text-gray-400 max-w-xl mx-auto">
              From plumbing to photography — every service you need, right here in Port Harcourt.
            </p>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {CATEGORIES.map((cat, i) => (
              <Link key={cat.name} href={`/browse?category=${encodeURIComponent(cat.name)}`}
                className={`${cat.color} p-5 rounded-2xl border border-gray-100 dark:border-gray-800 hover:shadow-lg transition-all duration-300 hover:-translate-y-2 hover:border-green-200 dark:hover:border-green-800 group cursor-pointer ${categoriesInView ? 'animate-scale-in' : 'opacity-0'}`}
                style={{ animationDelay: `${i * 0.05}s` }}>
                <div className={`${cat.iconColor} mb-3 group-hover:scale-110 transition-transform duration-300`}>{cat.icon}</div>
                <p className="font-semibold text-sm group-hover:text-green-600 transition-colors">{cat.name}</p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ─── HOW IT WORKS ─── */}
      <section className="py-24 bg-white dark:bg-gray-900" ref={howItWorksRef}>
        <div className="max-w-6xl mx-auto px-4">
          <div className={`text-center mb-16 ${howItWorksInView ? 'animate-fade-up' : 'opacity-0'}`}>
            <p className="text-green-600 font-semibold text-sm uppercase tracking-widest mb-3">Simple process</p>
            <h2 className="text-4xl md:text-5xl font-bold mb-4">How 100Gigs Works</h2>
            <p className="text-gray-500 dark:text-gray-400 max-w-xl mx-auto">
              Get started in minutes — whether you need work done or want to earn money.
            </p>
          </div>
          <div className="grid md:grid-cols-2 gap-8">
            <div className={`bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/10 rounded-3xl p-8 border border-green-100 dark:border-green-900/30 ${howItWorksInView ? 'animate-slide-right' : 'opacity-0'}`}>
              <div className="flex items-center gap-3 mb-8">
                <div className="w-11 h-11 bg-green-600 rounded-xl flex items-center justify-center shadow-lg shadow-green-200 dark:shadow-none">
                  <Briefcase size={20} className="text-white" />
                </div>
                <div>
                  <h3 className="text-xl font-bold">For Clients</h3>
                  <p className="text-green-600 text-xs">Post jobs and hire locally</p>
                </div>
              </div>
              <div className="space-y-5">
                {HOW_IT_WORKS_CLIENT.map((item, i) => (
                  <div key={i} className="flex gap-4 group">
                    <div className="flex-shrink-0 w-11 h-11 bg-green-600 rounded-xl flex items-center justify-center font-bold text-white text-sm shadow-md group-hover:scale-110 transition-transform">{item.step}</div>
                    <div>
                      <h4 className="font-semibold mb-1">{item.title}</h4>
                      <p className="text-gray-500 dark:text-gray-400 text-sm leading-relaxed">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
              <Link href={session ? '/post-job' : '/signup'}
                className="mt-8 inline-flex items-center gap-2 bg-green-600 text-white px-6 py-3 rounded-xl hover:bg-green-700 transition font-medium group shadow-lg shadow-green-200 dark:shadow-none">
                Post a Job <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
              </Link>
            </div>
            <div className={`bg-gradient-to-br from-gray-50 to-slate-50 dark:from-gray-800/50 dark:to-slate-800/30 rounded-3xl p-8 border border-gray-100 dark:border-gray-700 ${howItWorksInView ? 'animate-slide-left delay-200' : 'opacity-0'}`}>
              <div className="flex items-center gap-3 mb-8">
                <div className="w-11 h-11 bg-gray-900 dark:bg-white rounded-xl flex items-center justify-center shadow-lg">
                  <Users size={20} className="text-white dark:text-gray-900" />
                </div>
                <div>
                  <h3 className="text-xl font-bold">For Providers</h3>
                  <p className="text-gray-500 text-xs">Find work and earn money</p>
                </div>
              </div>
              <div className="space-y-5">
                {HOW_IT_WORKS_PROVIDER.map((item, i) => (
                  <div key={i} className="flex gap-4 group">
                    <div className="flex-shrink-0 w-11 h-11 bg-gray-900 dark:bg-white rounded-xl flex items-center justify-center font-bold text-white dark:text-gray-900 text-sm shadow-md group-hover:scale-110 transition-transform">{item.step}</div>
                    <div>
                      <h4 className="font-semibold mb-1">{item.title}</h4>
                      <p className="text-gray-500 dark:text-gray-400 text-sm leading-relaxed">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
              <Link href={session ? '/browse' : '/signup'}
                className="mt-8 inline-flex items-center gap-2 bg-gray-900 dark:bg-white text-white dark:text-gray-900 px-6 py-3 rounded-xl hover:opacity-90 transition font-medium group shadow-lg">
                Find Work <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ─── FEATURED JOBS ─── */}
      <section className="py-24 bg-gray-50 dark:bg-gray-950" ref={jobsRef}>
        <div className="max-w-6xl mx-auto px-4">
          <div className={`flex justify-between items-end mb-14 ${jobsInView ? 'animate-fade-up' : 'opacity-0'}`}>
            <div>
              <p className="text-green-600 font-semibold text-sm uppercase tracking-widest mb-3">Fresh opportunities</p>
              <h2 className="text-4xl md:text-5xl font-bold mb-2">Latest Jobs</h2>
              <p className="text-gray-500 dark:text-gray-400">Posted in Port Harcourt — updated in real time</p>
            </div>
            <Link href="/browse" className="hidden md:flex items-center gap-2 text-green-600 font-medium hover:underline group">
              View all <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>
          {jobsLoading ? (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1,2,3,4,5,6].map(i => (
                <div key={i} className="bg-white dark:bg-gray-900 p-6 rounded-2xl animate-pulse">
                  <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/3 mb-4" />
                  <div className="h-5 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mb-3" />
                  <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-full mb-2" />
                  <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-2/3 mb-6" />
                  <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2" />
                </div>
              ))}
            </div>
          ) : featuredJobs.length === 0 ? (
            <div className="text-center py-20 bg-white dark:bg-gray-900 rounded-3xl border border-gray-100 dark:border-gray-800">
              <Briefcase size={48} className="mx-auto text-gray-300 mb-4" />
              <p className="text-gray-500 mb-2 font-medium">No jobs posted yet</p>
              <p className="text-sm text-gray-400 mb-6">Be the first to post a job!</p>
              <Link href="/post-job" className="inline-block bg-green-600 text-white px-6 py-3 rounded-xl hover:bg-green-700 transition">Post a Job</Link>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {featuredJobs.map((job, i) => (
                <Link key={job._id} href={`/jobs/${job._id}`}
                  className={`bg-white dark:bg-gray-900 p-6 rounded-2xl border border-gray-100 dark:border-gray-800 hover:shadow-xl hover:-translate-y-2 transition-all duration-300 group ${jobsInView ? 'animate-scale-in' : 'opacity-0'}`}
                  style={{ animationDelay: `${i * 0.08}s` }}>
                  <div className="flex justify-between items-start mb-4">
                    <span className="text-xs bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-300 px-3 py-1 rounded-full font-medium">{job.category}</span>
                    <span className="text-xs text-gray-400">{new Date(job.createdAt).toLocaleDateString('en-NG', { day: 'numeric', month: 'short' })}</span>
                  </div>
                  <h3 className="font-bold text-lg mb-2 group-hover:text-green-600 transition-colors line-clamp-2 leading-snug">{job.title}</h3>
                  <p className="text-gray-500 dark:text-gray-400 text-sm mb-5 line-clamp-2 leading-relaxed">{job.description}</p>
                  <div className="flex items-center justify-between pt-4 border-t dark:border-gray-800">
                    <p className="text-green-600 font-bold">₦{job.budgetMin?.toLocaleString()} — ₦{job.budgetMax?.toLocaleString()}</p>
                    <div className="flex items-center gap-1 text-xs text-gray-400"><MapPin size={11} />{job.location}</div>
                  </div>
                </Link>
              ))}
            </div>
          )}
          <div className="text-center mt-10 md:hidden">
            <Link href="/browse" className="inline-flex items-center gap-2 text-green-600 font-medium">View all jobs <ArrowRight size={16} /></Link>
          </div>
        </div>
      </section>

      {/* ─── WHY 100GIGS ─── */}
      <section className="py-24 bg-white dark:bg-gray-900" ref={whyRef}>
        <div className="max-w-6xl mx-auto px-4">
          <div className={`text-center mb-14 ${whyInView ? 'animate-fade-up' : 'opacity-0'}`}>
            <p className="text-green-600 font-semibold text-sm uppercase tracking-widest mb-3">Our advantage</p>
            <h2 className="text-4xl md:text-5xl font-bold mb-4">Why Choose 100Gigs?</h2>
            <p className="text-gray-500 dark:text-gray-400 max-w-xl mx-auto">
              Built specifically for Port Harcourt — not a copy-paste generic platform.
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              { icon: <MapPin size={28} className="text-green-600" />, title: 'Hyper Local', desc: 'Every job and provider is in Port Harcourt. No wasted time on out-of-town results.', bg: 'bg-green-50 dark:bg-green-900/20', border: 'border-green-100 dark:border-green-900/30', delay: '0s' },
              { icon: <Shield size={28} className="text-blue-600" />, title: 'Trusted Community', desc: 'Real profiles, real ratings, real people from PH. Build your reputation over time.', bg: 'bg-blue-50 dark:bg-blue-900/20', border: 'border-blue-100 dark:border-blue-900/30', delay: '0.15s' },
              { icon: <Zap size={28} className="text-yellow-600" />, title: 'Fast & Simple', desc: 'Post a job in 2 minutes. Apply in seconds. No complicated process — just results.', bg: 'bg-yellow-50 dark:bg-yellow-900/20', border: 'border-yellow-100 dark:border-yellow-900/30', delay: '0.3s' },
            ].map((item, i) => (
              <div key={i} className={`${item.bg} p-8 rounded-3xl border ${item.border} hover:shadow-lg transition-all duration-300 hover:-translate-y-1 ${whyInView ? 'animate-scale-in' : 'opacity-0'}`} style={{ animationDelay: item.delay }}>
                <div className="w-14 h-14 bg-white dark:bg-gray-900 rounded-2xl flex items-center justify-center mb-6 shadow-md">{item.icon}</div>
                <h3 className="text-xl font-bold mb-3">{item.title}</h3>
                <p className="text-gray-500 dark:text-gray-400 leading-relaxed text-sm">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}