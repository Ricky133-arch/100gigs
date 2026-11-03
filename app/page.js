'use client';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowRight, ArrowUpRight, Search } from 'lucide-react';

/* ────────────────────────────────────────────────────────────
   Data
   ──────────────────────────────────────────────────────────── */

const CATEGORIES = [
  { name: 'Plumbing', note: 'Leaks, borehole pumps, bathroom fittings' },
  { name: 'Electrical', note: 'Wiring, inverters, prepaid meters, faults' },
  { name: 'Makeup & Hair', note: 'Bridal, owambe glam, braids, wigs' },
  { name: 'Carpentry', note: 'Furniture, doors, roofing woodwork' },
  { name: 'Car Repair', note: 'Mechanics, panel beating, diagnostics' },
  { name: 'Cleaning', note: 'Homes, offices, post-construction' },
  { name: 'AC Repair', note: 'Servicing, gas refill, installation' },
  { name: 'Photography', note: 'Events, portraits, product shoots' },
  { name: 'Graphic Design', note: 'Logos, flyers, social content' },
  { name: 'Tutoring', note: 'WAEC, JAMB, home lessons' },
  { name: 'Event Planning', note: 'Decor, ushers, coordination' },
  { name: 'Delivery', note: 'Dispatch riders, errands, moving' },
];

const AREAS = [
  'GRA Phase 2', 'Rumuola', 'Trans-Amadi', 'D-Line', 'Eliozu', 'Rumuokoro',
  'Woji', 'Ada George', 'Peter Odili', 'Rumuibekwe', 'Old GRA', 'Choba',
  'Elekahia', 'Rumuigbo', 'Mile 3', 'Borokiri',
];

const STEPS = {
  client: [
    { title: 'Describe the job', desc: 'What needs doing, roughly what you can pay, and which part of town you’re in. Takes about two minutes.' },
    { title: 'Compare who applies', desc: 'Providers send a short note and their rate. Open their profile, see past work and ratings.' },
    { title: 'Chat, then hire', desc: 'Ask your questions in the app, agree on the details, and pick the person you trust.' },
  ],
  provider: [
    { title: 'Set up your profile', desc: 'Your trade, your area, a few photos of past work. This is your shopfront — make it honest.' },
    { title: 'Apply to nearby jobs', desc: 'Browse jobs close to you. Write a short, specific note and name your price.' },
    { title: 'Do good work, get known', desc: 'Every finished job adds to your rating. Good reviews bring the next client to you.' },
  ],
};

/* ────────────────────────────────────────────────────────────
   Helpers
   ──────────────────────────────────────────────────────────── */

function useReveal(threshold = 0.12) {
  const ref = useRef(null);
  const [shown, setShown] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { setShown(true); io.disconnect(); } },
      { threshold }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [threshold]);
  return [ref, shown];
}

const naira = (n) => (typeof n === 'number' ? `₦${n.toLocaleString('en-NG')}` : null);

function budget(job) {
  const lo = naira(job.budgetMin);
  const hi = naira(job.budgetMax);
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

/* ────────────────────────────────────────────────────────────
   Page
   ──────────────────────────────────────────────────────────── */

export default function Home() {
  const { data: session } = useSession();
  const router = useRouter();
  const [jobs, setJobs] = useState([]);
  const [jobsLoading, setJobsLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [stats, setStats] = useState({ jobs: 0, users: 0, categories: 12 });
  const [audience, setAudience] = useState('client');
  const [mounted, setMounted] = useState(false);

  const [catRef, catShown] = useReveal();
  const [howRef, howShown] = useReveal();
  const [boardRef, boardShown] = useReveal();
  const [whyRef, whyShown] = useReveal();

  useEffect(() => {
    setMounted(true);
    (async () => {
      try {
        const res = await fetch('/api/jobs');
        if (res.ok) {
          const data = await res.json();
          setJobs(Array.isArray(data) ? data.slice(0, 8) : []);
        }
      } catch (e) { console.error(e); }
      finally { setJobsLoading(false); }
    })();
    (async () => {
      try {
        const res = await fetch('/api/stats');
        if (res.ok) setStats(await res.json());
      } catch (e) { console.error(e); }
    })();
  }, []);

  const onSearch = (e) => {
    e.preventDefault();
    const q = query.trim();
    router.push(q ? `/browse?search=${encodeURIComponent(q)}` : '/browse');
  };

  const isClient = session?.user?.role === 'client';
  const primaryHref = !session ? '/signup' : isClient ? '/post-job' : '/browse';
  const primaryLabel = !session ? 'Post a job' : isClient ? 'Post a job' : 'Find work';

  return (
    <div className="hg min-h-screen overflow-x-hidden bg-[#080f0a] text-[#e9efe9] antialiased">
      <style>{`
        .hg { font-family: var(--font-sans), ui-sans-serif, system-ui, sans-serif; }
        .serif { font-family: var(--font-serif), Georgia, serif; font-weight: 400; letter-spacing: -0.01em; }
        .mono { font-family: var(--font-mono), ui-monospace, monospace; }
        .rise { opacity: 0; transform: translateY(14px); transition: opacity .8s cubic-bezier(.2,.7,.2,1), transform .8s cubic-bezier(.2,.7,.2,1); }
        .rise.on { opacity: 1; transform: none; }
        @keyframes ticker { from { transform: translateX(0); } to { transform: translateX(-50%); } }
        .ticker { animation: ticker 60s linear infinite; }
        .ticker:hover { animation-play-state: paused; }
        @media (prefers-reduced-motion: reduce) {
          .rise { opacity: 1; transform: none; transition: none; }
          .ticker { animation: none; }
        }
      `}</style>

      {/* ─── HEADER ─── */}
      <header className="relative z-20 border-b border-white/[0.07]">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-5 md:px-8">
          <Link href="/" className="text-[1.35rem] font-semibold tracking-tight">
            <span className="text-green-400">100</span>Gigs
          </Link>
          <nav className="hidden items-center gap-8 text-[13px] text-white/55 md:flex">
            <Link href="/browse" className="transition hover:text-white">Browse jobs</Link>
            <a href="#how" className="transition hover:text-white">How it works</a>
            <a href="#trades" className="transition hover:text-white">Trades</a>
          </nav>
          {!session ? (
            <div className="flex items-center gap-1 text-[13px]">
              <Link href="/login" className="px-3 py-2 text-white/60 transition hover:text-white">Log in</Link>
              <Link href="/signup" className="rounded-full bg-green-400 px-4 py-2 font-medium text-[#080f0a] transition hover:bg-green-300">
                Sign up
              </Link>
            </div>
          ) : (
            <Link href={primaryHref} className="rounded-full border border-white/15 px-4 py-2 text-[13px] transition hover:border-green-400 hover:text-green-400">
              {primaryLabel}
            </Link>
          )}
        </div>
      </header>

      {/* ─── HERO ─── */}
      <section className="relative">
        <div className="mx-auto grid max-w-7xl gap-14 px-5 pb-20 pt-14 md:px-8 md:pt-20 lg:grid-cols-[1.25fr_1fr] lg:gap-20 lg:pb-28">
          {/* Left */}
          <div>
            <p className={`mono mb-8 text-[11px] uppercase tracking-[0.18em] text-white/40 rise ${mounted ? 'on' : ''}`}>
              Port Harcourt <span className="text-green-400">/</span> Rivers State <span className="text-green-400">/</span> NG
            </p>

            <h1 className={`serif text-[3.4rem] leading-[0.95] sm:text-7xl lg:text-[6.25rem] rise ${mounted ? 'on' : ''}`}
              style={{ transitionDelay: '80ms' }}>
              Skilled hands,
              <br />
              <em className="text-green-400">right around</em>
              <br />
              the corner.
            </h1>

            <p className={`mt-8 max-w-md text-[15px] leading-relaxed text-white/55 rise ${mounted ? 'on' : ''}`}
              style={{ transitionDelay: '160ms' }}>
              Post a job, compare offers from local providers, and hire someone from your own side of town.
              No middlemen taking a cut of the conversation.
            </p>

            <form onSubmit={onSearch}
              className={`mt-10 max-w-lg rise ${mounted ? 'on' : ''}`}
              style={{ transitionDelay: '240ms' }}>
              <label htmlFor="q" className="mono mb-3 block text-[11px] uppercase tracking-[0.18em] text-white/35">
                What do you need done?
              </label>
              <div className="group flex items-center border-b border-white/20 pb-3 transition-colors focus-within:border-green-400">
                <Search size={18} className="mr-3 shrink-0 text-white/35 group-focus-within:text-green-400" />
                <input
                  id="q"
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Fix my inverter, bridal makeup Saturday…"
                  className="min-w-0 flex-1 bg-transparent text-lg text-white outline-none placeholder:text-white/25"
                />
                <button type="submit" aria-label="Search"
                  className="ml-3 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-green-400 text-[#080f0a] transition hover:bg-green-300 active:scale-95">
                  <ArrowRight size={18} />
                </button>
              </div>
              <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-[13px] text-white/40">
                <span className="text-white/25">Popular:</span>
                {['Plumbing', 'Electrical', 'AC Repair', 'Makeup & Hair'].map((t) => (
                  <button key={t} type="button"
                    onClick={() => router.push(`/browse?category=${encodeURIComponent(t)}`)}
                    className="underline decoration-white/15 underline-offset-4 transition hover:text-green-400 hover:decoration-green-400">
                    {t}
                  </button>
                ))}
              </div>
            </form>

            {(stats.jobs > 0 || stats.users > 0) && (
              <dl className={`mt-14 flex gap-10 rise ${mounted ? 'on' : ''}`} style={{ transitionDelay: '320ms' }}>
                {stats.jobs > 0 && (
                  <div>
                    <dt className="text-[12px] text-white/35">Jobs posted</dt>
                    <dd className="mono mt-1 text-2xl text-white">{stats.jobs.toLocaleString()}</dd>
                  </div>
                )}
                {stats.users > 0 && (
                  <div>
                    <dt className="text-[12px] text-white/35">Members</dt>
                    <dd className="mono mt-1 text-2xl text-white">{stats.users.toLocaleString()}</dd>
                  </div>
                )}
                <div>
                  <dt className="text-[12px] text-white/35">Trades</dt>
                  <dd className="mono mt-1 text-2xl text-white">{stats.categories}</dd>
                </div>
              </dl>
            )}
          </div>

          {/* Right — live board */}
          <aside className={`self-end rise ${mounted ? 'on' : ''}`} style={{ transitionDelay: '200ms' }}>
            <div className="border border-white/10 bg-[#0b150e]">
              <div className="flex items-center justify-between border-b border-white/10 px-5 py-3.5">
                <p className="mono text-[11px] uppercase tracking-[0.18em] text-white/50">Posted recently</p>
                <span className="mono flex items-center gap-2 text-[11px] text-green-400">
                  <span className="h-1.5 w-1.5 rounded-full bg-green-400" /> live
                </span>
              </div>

              {jobsLoading ? (
                <ul>
                  {[0, 1, 2, 3].map((i) => (
                    <li key={i} className="border-b border-white/[0.06] px-5 py-4 last:border-0">
                      <div className="mb-2 h-3 w-1/4 animate-pulse bg-white/[0.06]" />
                      <div className="h-4 w-3/4 animate-pulse bg-white/[0.08]" />
                    </li>
                  ))}
                </ul>
              ) : jobs.length === 0 ? (
                <div className="px-5 py-12">
                  <p className="serif text-3xl leading-tight text-white/90">Quiet morning.</p>
                  <p className="mt-2 text-sm text-white/45">No jobs on the board yet. Yours could be the first one people see today.</p>
                  <Link href="/post-job" className="mt-6 inline-flex items-center gap-2 text-sm text-green-400 hover:underline underline-offset-4">
                    Post a job <ArrowRight size={14} />
                  </Link>
                </div>
              ) : (
                <ul>
                  {jobs.slice(0, 4).map((job) => (
                    <li key={job._id} className="border-b border-white/[0.06] last:border-0">
                      <Link href={`/jobs/${job._id}`} className="group block px-5 py-4 transition-colors hover:bg-white/[0.025]">
                        <div className="mono mb-1.5 flex items-center justify-between text-[11px] text-white/35">
                          <span>{job.category}{job.location ? ` · ${job.location}` : ''}</span>
                          <span>{timeAgo(job.createdAt)}</span>
                        </div>
                        <div className="flex items-start justify-between gap-4">
                          <p className="line-clamp-1 text-[15px] text-white/90 transition-colors group-hover:text-green-400">{job.title}</p>
                          <p className="mono shrink-0 text-[13px] text-green-400/90">{budget(job)}</p>
                        </div>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}

              <Link href="/browse"
                className="flex items-center justify-between border-t border-white/10 px-5 py-3.5 text-[13px] text-white/60 transition hover:bg-green-400 hover:text-[#080f0a]">
                See every open job <ArrowUpRight size={15} />
              </Link>
            </div>
          </aside>
        </div>

        {/* Neighbourhood ticker */}
        <div className="overflow-hidden border-y border-white/[0.07] py-4">
          <div className="ticker flex w-max whitespace-nowrap">
            {[...AREAS, ...AREAS].map((a, i) => (
              <span key={i} className="serif flex items-center text-2xl italic text-white/30">
                {a}
                <span className="mx-8 text-[10px] not-italic text-green-400/60">●</span>
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ─── TRADES ─── */}
      <section id="trades" ref={catRef} className="mx-auto max-w-7xl px-5 py-24 md:px-8 md:py-32">
        <div className={`mb-14 grid gap-6 md:grid-cols-[1fr_1.4fr] md:items-end rise ${catShown ? 'on' : ''}`}>
          <h2 className="serif text-5xl leading-none md:text-6xl">
            Twelve trades,<br /><em className="text-green-400">one city.</em>
          </h2>
          <p className="max-w-md text-[15px] leading-relaxed text-white/50 md:justify-self-end">
            The jobs people in PH actually need doing — from the light that keeps tripping to the makeup for Saturday’s wedding.
          </p>
        </div>

        <ol className="grid border-t border-white/10 md:grid-cols-2 md:gap-x-12">
          {CATEGORIES.map((c, i) => (
            <li key={c.name} className={`rise ${catShown ? 'on' : ''}`} style={{ transitionDelay: `${i * 35}ms` }}>
              <Link href={`/browse?category=${encodeURIComponent(c.name)}`}
                className="group flex items-baseline gap-5 border-b border-white/10 py-5 transition-colors">
                <span className="mono w-6 shrink-0 text-[11px] text-white/25">{String(i + 1).padStart(2, '0')}</span>
                <span className="flex-1">
                  <span className="block text-xl text-white transition-colors group-hover:text-green-400 md:text-[1.4rem]">{c.name}</span>
                  <span className="mt-1 block text-[13px] text-white/40">{c.note}</span>
                </span>
                <ArrowUpRight size={18}
                  className="shrink-0 -translate-x-1 text-white/20 transition group-hover:translate-x-0 group-hover:text-green-400" />
              </Link>
            </li>
          ))}
        </ol>
      </section>

      {/* ─── HOW IT WORKS ─── */}
      <section id="how" ref={howRef} className="border-t border-white/[0.07] bg-[#0b150e]">
        <div className="mx-auto max-w-7xl px-5 py-24 md:px-8 md:py-32">
          <div className={`mb-16 flex flex-col gap-8 md:flex-row md:items-end md:justify-between rise ${howShown ? 'on' : ''}`}>
            <h2 className="serif text-5xl leading-none md:text-6xl">How it works</h2>
            <div role="tablist" className="inline-flex self-start rounded-full border border-white/15 p-1 text-[13px]">
              {[['client', 'I need help'], ['provider', 'I offer a service']].map(([key, label]) => (
                <button key={key} role="tab" aria-selected={audience === key}
                  onClick={() => setAudience(key)}
                  className={`rounded-full px-4 py-2 transition ${audience === key ? 'bg-green-400 text-[#080f0a]' : 'text-white/55 hover:text-white'}`}>
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid border-t border-white/10 md:grid-cols-3">
            {STEPS[audience].map((s, i) => (
              <div key={`${audience}-${i}`}
                className={`border-b border-white/10 py-10 md:border-b-0 md:px-8 md:first:pl-0 md:[&:not(:first-child)]:border-l rise ${howShown ? 'on' : ''}`}
                style={{ transitionDelay: `${i * 90}ms` }}>
                <p className="serif mb-8 text-7xl leading-none text-green-400">{i + 1}</p>
                <h3 className="mb-3 text-lg font-medium text-white">{s.title}</h3>
                <p className="max-w-xs text-[14px] leading-relaxed text-white/50">{s.desc}</p>
              </div>
            ))}
          </div>

          <Link href={audience === 'client' ? (session ? '/post-job' : '/signup') : (session ? '/browse' : '/signup')}
            className="group mt-12 inline-flex items-center gap-3 text-[15px] text-white">
            <span className="border-b border-green-400 pb-0.5 transition group-hover:text-green-400">
              {audience === 'client' ? 'Post your first job' : 'Start finding work'}
            </span>
            <ArrowRight size={16} className="text-green-400 transition-transform group-hover:translate-x-1" />
          </Link>
        </div>
      </section>

      {/* ─── JOB BOARD ─── */}
      {jobs.length > 0 && (
        <section ref={boardRef} className="mx-auto max-w-7xl px-5 py-24 md:px-8 md:py-32">
          <div className={`mb-12 flex items-end justify-between gap-6 rise ${boardShown ? 'on' : ''}`}>
            <div>
              <p className="mono mb-4 text-[11px] uppercase tracking-[0.18em] text-white/35">The board</p>
              <h2 className="serif text-5xl leading-none md:text-6xl">Open right now</h2>
            </div>
            <Link href="/browse" className="hidden items-center gap-2 text-[13px] text-white/55 transition hover:text-green-400 md:flex">
              All jobs <ArrowUpRight size={15} />
            </Link>
          </div>

          <div className="mono hidden grid-cols-[90px_150px_1fr_150px_170px] gap-6 border-b border-white/10 pb-3 text-[11px] uppercase tracking-[0.14em] text-white/30 md:grid">
            <span>Posted</span><span>Trade</span><span>Job</span><span>Area</span><span className="text-right">Budget</span>
          </div>

          <ul>
            {jobs.map((job, i) => (
              <li key={job._id} className={`rise ${boardShown ? 'on' : ''}`} style={{ transitionDelay: `${i * 40}ms` }}>
                <Link href={`/jobs/${job._id}`}
                  className="group grid grid-cols-1 gap-1 border-b border-white/[0.07] py-5 transition-colors hover:bg-white/[0.02] md:grid-cols-[90px_150px_1fr_150px_170px] md:items-center md:gap-6">
                  <span className="mono text-[12px] text-white/35">{timeAgo(job.createdAt)}</span>
                  <span className="text-[13px] text-white/55">{job.category}</span>
                  <span className="line-clamp-1 text-[16px] text-white transition-colors group-hover:text-green-400">{job.title}</span>
                  <span className="text-[13px] text-white/45">{job.location}</span>
                  <span className="mono text-[14px] text-green-400 md:text-right">{budget(job)}</span>
                </Link>
              </li>
            ))}
          </ul>

          <Link href="/browse" className="mt-8 inline-flex items-center gap-2 text-[13px] text-green-400 md:hidden">
            All jobs <ArrowRight size={14} />
          </Link>
        </section>
      )}

      {/* ─── WHY ─── */}
      <section ref={whyRef} className="border-t border-white/[0.07]">
        <div className="mx-auto grid max-w-7xl gap-16 px-5 py-24 md:px-8 md:py-32 lg:grid-cols-[1.3fr_1fr]">
          <p className={`serif text-4xl leading-[1.1] text-white md:text-[3.4rem] rise ${whyShown ? 'on' : ''}`}>
            Most platforms are built for everywhere, so they work nowhere in particular.
            <span className="text-green-400"> 100Gigs is built for Port Harcourt</span>
            <span className="text-white/40"> — the traffic, the areas, the way people here actually find someone they trust.</span>
          </p>

          <dl className="self-end border-t border-white/10">
            {[
              ['Local by default', 'Every job and every provider is in PH. Nobody quoting you from Abuja.'],
              ['Reputation that sticks', 'Ratings follow providers from job to job, so good work gets noticed.'],
              ['Two minutes to post', 'No long forms. Say what you need and the offers come to you.'],
            ].map(([t, d], i) => (
              <div key={t} className={`border-b border-white/10 py-6 rise ${whyShown ? 'on' : ''}`} style={{ transitionDelay: `${120 + i * 90}ms` }}>
                <dt className="mb-1.5 text-[15px] font-medium text-white">{t}</dt>
                <dd className="text-[14px] leading-relaxed text-white/50">{d}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      {/* ─── CTA ─── */}
      <section className="bg-green-400 text-[#080f0a]">
        <div className="mx-auto flex max-w-7xl flex-col gap-10 px-5 py-20 md:flex-row md:items-end md:justify-between md:px-8 md:py-24">
          <h2 className="serif text-5xl leading-[0.95] md:text-7xl">
            Got something<br /><em>that needs doing?</em>
          </h2>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Link href={session ? '/post-job' : '/signup'}
              className="group inline-flex items-center justify-center gap-2 rounded-full bg-[#080f0a] px-7 py-4 text-[14px] font-medium text-white transition hover:bg-black">
              Post a job <ArrowRight size={16} className="transition-transform group-hover:translate-x-1" />
            </Link>
            <Link href="/browse"
              className="inline-flex items-center justify-center rounded-full border border-[#080f0a]/30 px-7 py-4 text-[14px] font-medium transition hover:border-[#080f0a]">
              I’m looking for work
            </Link>
          </div>
        </div>
      </section>

      {/* ─── FOOTER ─── */}
      <footer className="border-t border-white/[0.07]">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-5 py-10 text-[13px] text-white/35 md:flex-row md:items-center md:justify-between md:px-8">
          <span className="text-base font-semibold text-white">
            <span className="text-green-400">100</span>Gigs
          </span>
          <span className="mono text-[11px] uppercase tracking-[0.18em]">Made in Port Harcourt · {new Date().getFullYear()}</span>
          <div className="flex gap-6">
            <Link href="/browse" className="hover:text-white">Browse</Link>
            <Link href="/signup" className="hover:text-white">Join</Link>
            <Link href="/login" className="hover:text-white">Log in</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}