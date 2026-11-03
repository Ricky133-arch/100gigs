'use client';
import { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Search, SlidersHorizontal, X, ArrowRight, ArrowUpRight } from 'lucide-react';

const CATEGORIES = [
  'Plumbing', 'Electrical', 'Carpentry', 'Makeup & Hair',
  'Cleaning', 'Painting', 'Car Repair', 'Tailoring',
  'Graphic Design', 'Photography', 'Tutoring', 'Delivery',
  'Event Planning', 'AC Repair', 'Other',
];

const LOCATIONS = [
  'GRA Phase 1', 'GRA Phase 2', 'Trans Amadi', 'Woji',
  'Elelenwo', 'Rumuomasi', 'Rumuola', 'Diobu', 'Borokiri',
  'D-Line', 'Rumuigbo', 'Ozuoba', 'Choba', 'Ada George',
  'Rukpokwu', 'Eneka', 'Mgbuoba', 'Port Harcourt City', 'Other',
];

const SORTS = [
  ['newest', 'Newest'],
  ['oldest', 'Oldest'],
  ['budget-high', 'Highest budget'],
  ['budget-low', 'Lowest budget'],
];

/* ── helpers ─────────────────────────────────────────────── */

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

const fieldLabel = 'mono mb-2 block text-[10px] uppercase tracking-[0.16em] text-white/35';
const fieldInput =
  'w-full border-b border-white/15 bg-transparent pb-2 text-[15px] text-white outline-none transition-colors placeholder:text-white/20 focus:border-green-400';

/* ── page ────────────────────────────────────────────────── */

function BrowseContent() {
  const searchParams = useSearchParams();
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showFilters, setShowFilters] = useState(false);

  // Read both ?category= and ?search= so the homepage search actually lands here
  const [search, setSearch] = useState(searchParams.get('search') || '');
  const [category, setCategory] = useState(searchParams.get('category') || '');
  const [location, setLocation] = useState('');
  const [minBudget, setMinBudget] = useState('');
  const [maxBudget, setMaxBudget] = useState('');
  const [sortBy, setSortBy] = useState('newest');

  // Pass overrides when state hasn't updated yet (e.g. right after clearing)
  const fetchJobs = async (overrides = {}) => {
    const q = { category, location, search, ...overrides };
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (q.category) params.set('category', q.category);
      if (q.location) params.set('location', q.location);
      if (q.search) params.set('search', q.search);
      const res = await fetch(`/api/jobs?${params.toString()}`);
      if (!res.ok) throw new Error('Failed to fetch');
      const data = await res.json();
      setJobs(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Failed to fetch jobs', error);
      setJobs([]);
    } finally {
      setLoading(false);
    }
  };

  // Category and location refetch immediately; search waits for submit
  useEffect(() => { fetchJobs(); }, [category, location]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSearch = (e) => {
    e.preventDefault();
    fetchJobs();
  };

  const clearSearch = () => {
    setSearch('');
    fetchJobs({ search: '' });
  };

  const clearFilters = () => {
    const needsRefetch = !category && !location; // otherwise the effect refetches
    setSearch('');
    setCategory('');
    setLocation('');
    setMinBudget('');
    setMaxBudget('');
    setSortBy('newest');
    if (needsRefetch) fetchJobs({ search: '', category: '', location: '' });
  };

  const filteredJobs = jobs
    .filter((job) =>
      (!minBudget || job.budgetMax >= Number(minBudget)) &&
      (!maxBudget || job.budgetMin <= Number(maxBudget))
    )
    .sort((a, b) => {
      if (sortBy === 'newest') return new Date(b.createdAt) - new Date(a.createdAt);
      if (sortBy === 'oldest') return new Date(a.createdAt) - new Date(b.createdAt);
      if (sortBy === 'budget-high') return (b.budgetMax || 0) - (a.budgetMax || 0);
      if (sortBy === 'budget-low') return (a.budgetMin || 0) - (b.budgetMin || 0);
      return 0;
    });

  const extraFilters = [location, minBudget, maxBudget].filter(Boolean).length + (sortBy !== 'newest' ? 1 : 0);
  const hasActiveFilters = search || category || location || minBudget || maxBudget;

  return (
    <div className="bh min-h-screen bg-[#080f0a] text-[#e9efe9] antialiased">
      <style>{`
        .bh { font-family: var(--font-sans), ui-sans-serif, system-ui, sans-serif; }
        .serif { font-family: var(--font-serif), Georgia, serif; font-weight: 400; letter-spacing: -0.01em; }
        .mono { font-family: var(--font-mono), ui-monospace, monospace; }
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { scrollbar-width: none; }
        .bh select option { background: #0b150e; color: #fff; }
        .bh input[type=number]::-webkit-inner-spin-button { -webkit-appearance: none; }
      `}</style>

      <div className="mx-auto max-w-6xl px-5 pb-16 pt-10 md:px-8 md:pt-16">

        {/* Header */}
        <div className="mb-10 flex items-end justify-between gap-6">
          <div>
            <h1 className="serif text-5xl leading-none md:text-7xl">Open jobs</h1>
            <p className="mono mt-4 text-[12px] text-white/40">
              {loading
                ? 'Loading…'
                : `${filteredJobs.length} ${filteredJobs.length === 1 ? 'job' : 'jobs'}${category ? ` in ${category}` : ''}`}
            </p>
          </div>
          <Link href="/post-job"
            className="group hidden items-center gap-2 rounded-full bg-green-400 px-5 py-2.5 text-[13px] font-medium text-[#080f0a] transition hover:bg-green-300 md:inline-flex">
            Post a job <ArrowRight size={15} className="transition-transform group-hover:translate-x-0.5" />
          </Link>
        </div>

        {/* Search */}
        <form onSubmit={handleSearch} className="mb-8 flex items-center gap-3">
          <div className="group flex flex-1 items-center border-b border-white/20 pb-3 transition-colors focus-within:border-green-400">
            <Search size={18} className="mr-3 shrink-0 text-white/35 group-focus-within:text-green-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by title or description"
              className="min-w-0 flex-1 bg-transparent text-lg text-white outline-none placeholder:text-white/25"
            />
            {search && (
              <button type="button" onClick={clearSearch} aria-label="Clear search"
                className="ml-2 text-white/30 transition hover:text-white">
                <X size={16} />
              </button>
            )}
            <button type="submit" aria-label="Search"
              className="ml-3 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-green-400 text-[#080f0a] transition hover:bg-green-300 active:scale-95">
              <ArrowRight size={18} />
            </button>
          </div>
          <button
            type="button"
            onClick={() => setShowFilters(!showFilters)}
            aria-expanded={showFilters}
            className={`relative flex h-10 items-center gap-2 rounded-full border px-4 text-[13px] transition ${
              showFilters ? 'border-green-400 text-green-400' : 'border-white/15 text-white/60 hover:text-white'
            }`}
          >
            <SlidersHorizontal size={15} />
            <span className="hidden sm:inline">Filters</span>
            {extraFilters > 0 && (
              <span className="mono flex h-4 min-w-[16px] items-center justify-center rounded-full bg-green-400 px-1 text-[9px] text-[#080f0a]">
                {extraFilters}
              </span>
            )}
          </button>
        </form>

        {/* Category tabs */}
        <div className="no-scrollbar -mx-5 mb-2 overflow-x-auto px-5 md:mx-0 md:px-0">
          <div className="flex w-max gap-6 border-b border-white/10 text-[13px]">
            {['', ...CATEGORIES].map((c) => {
              const active = category === c;
              return (
                <button key={c || 'all'} onClick={() => setCategory(c)}
                  className={`relative whitespace-nowrap pb-3 transition-colors ${active ? 'text-white' : 'text-white/40 hover:text-white/80'}`}>
                  {c || 'All'}
                  {active && <span className="absolute -bottom-px left-0 right-0 h-px bg-green-400" />}
                </button>
              );
            })}
          </div>
        </div>

        {/* Filters panel */}
        {showFilters && (
          <div className="grid gap-6 border-b border-white/10 py-8 sm:grid-cols-2 md:grid-cols-4">
            <div>
              <label className={fieldLabel}>Area</label>
              <select value={location} onChange={(e) => setLocation(e.target.value)} className={fieldInput}>
                <option value="">Anywhere in PH</option>
                {LOCATIONS.map((l) => <option key={l} value={l}>{l}</option>)}
              </select>
            </div>
            <div>
              <label className={fieldLabel}>Min budget (₦)</label>
              <input type="number" inputMode="numeric" value={minBudget}
                onChange={(e) => setMinBudget(e.target.value)} placeholder="5,000" className={`${fieldInput} mono`} />
            </div>
            <div>
              <label className={fieldLabel}>Max budget (₦)</label>
              <input type="number" inputMode="numeric" value={maxBudget}
                onChange={(e) => setMaxBudget(e.target.value)} placeholder="50,000" className={`${fieldInput} mono`} />
            </div>
            <div>
              <label className={fieldLabel}>Sort by</label>
              <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} className={fieldInput}>
                {SORTS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </div>
          </div>
        )}

        {/* Active filters */}
        {hasActiveFilters && (
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 py-4 text-[12px]">
            {[
              category && { label: category, clear: () => setCategory('') },
              location && { label: location, clear: () => setLocation('') },
              search && { label: `“${search}”`, clear: clearSearch },
              minBudget && { label: `from ${naira(Number(minBudget))}`, clear: () => setMinBudget('') },
              maxBudget && { label: `up to ${naira(Number(maxBudget))}`, clear: () => setMaxBudget('') },
            ].filter(Boolean).map((f) => (
              <button key={f.label} onClick={f.clear}
                className="group inline-flex items-center gap-1.5 text-green-400 transition hover:text-green-300">
                {f.label} <X size={12} className="opacity-60 group-hover:opacity-100" />
              </button>
            ))}
            <button onClick={clearFilters} className="mono ml-auto text-[11px] uppercase tracking-[0.14em] text-white/35 transition hover:text-white">
              Clear all
            </button>
          </div>
        )}

        {/* Results */}
        {loading ? (
          <ul className="mt-2">
            {[0, 1, 2, 3, 4].map((i) => (
              <li key={i} className="border-b border-white/[0.07] py-6">
                <div className="mb-3 h-3 w-40 animate-pulse bg-white/[0.06]" />
                <div className="mb-2 h-5 w-2/3 animate-pulse bg-white/[0.08]" />
                <div className="h-3 w-1/2 animate-pulse bg-white/[0.05]" />
              </li>
            ))}
          </ul>
        ) : filteredJobs.length === 0 ? (
          <div className="py-24">
            <p className="serif text-4xl leading-tight md:text-5xl">Nothing here yet.</p>
            <p className="mt-3 max-w-sm text-[14px] leading-relaxed text-white/45">
              {hasActiveFilters
                ? 'No jobs match those filters. Try a wider area or budget, or clear everything and look again.'
                : 'No open jobs right now. Check back later, or be the first to post one.'}
            </p>
            <div className="mt-8 flex flex-wrap gap-6 text-[14px]">
              {hasActiveFilters && (
                <button onClick={clearFilters} className="border-b border-green-400 pb-0.5 text-white transition hover:text-green-400">
                  Clear filters
                </button>
              )}
              <Link href="/post-job" className="inline-flex items-center gap-2 text-green-400 hover:underline underline-offset-4">
                Post a job <ArrowRight size={14} />
              </Link>
            </div>
          </div>
        ) : (
          <ul className="mt-2">
            {filteredJobs.map((job) => (
              <li key={job._id}>
                <Link href={`/jobs/${job._id}`}
                  className="group grid gap-3 border-b border-white/[0.07] py-6 transition-colors hover:bg-white/[0.02] md:grid-cols-[1fr_auto] md:items-center md:gap-10 md:px-3">
                  <div className="min-w-0">
                    <p className="mono mb-2 text-[11px] text-white/35">
                      <span className="text-white/55">{job.category}</span>
                      {job.location && <> · {job.location}</>}
                      {' · '}{timeAgo(job.createdAt)}
                    </p>
                    <h2 className="mb-1.5 line-clamp-1 text-[17px] font-medium text-white transition-colors group-hover:text-green-400 md:text-lg">
                      {job.title}
                    </h2>
                    {job.description && (
                      <p className="line-clamp-1 max-w-2xl text-[14px] text-white/40">{job.description}</p>
                    )}
                  </div>
                  <div className="flex items-center justify-between gap-6 md:justify-end">
                    <p className="mono text-[15px] text-green-400">{budget(job)}</p>
                    <span className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 text-white/40 transition group-hover:border-green-400 group-hover:bg-green-400 group-hover:text-[#080f0a]">
                      <ArrowUpRight size={16} />
                    </span>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}

        {/* Mobile post button */}
        <Link href="/post-job"
          className="mt-10 flex items-center justify-center gap-2 rounded-full bg-green-400 py-3.5 text-[14px] font-medium text-[#080f0a] md:hidden">
          Post a job <ArrowRight size={15} />
        </Link>
      </div>
    </div>
  );
}

export default function BrowsePage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center bg-[#080f0a]">
        <p className="mono text-[11px] uppercase tracking-[0.18em] text-white/35"
          style={{ fontFamily: 'var(--font-mono), monospace' }}>Loading jobs…</p>
      </div>
    }>
      <BrowseContent />
    </Suspense>
  );
}