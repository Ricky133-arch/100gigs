'use client';
import { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { MapPin, Clock, Search, SlidersHorizontal, X, Briefcase, ChevronRight } from 'lucide-react';

const CATEGORIES = [
  'Plumbing', 'Electrical', 'Carpentry', 'Makeup & Hair',
  'Cleaning', 'Painting', 'Car Repair', 'Tailoring',
  'Graphic Design', 'Photography', 'Tutoring', 'Delivery',
  'Event Planning', 'AC Repair', 'Other'
];

const LOCATIONS = [
  'GRA Phase 1', 'GRA Phase 2', 'Trans Amadi', 'Woji',
  'Elelenwo', 'Rumuomasi', 'Rumuola', 'Diobu', 'Borokiri',
  'D-Line', 'Rumuigbo', 'Ozuoba', 'Choba', 'Ada George',
  'Rukpokwu', 'Eneka', 'Mgbuoba', 'Port Harcourt City', 'Other'
];

const glassPanel = {
  background: 'rgba(255,255,255,0.04)',
  border: '1px solid rgba(255,255,255,0.08)',
  backdropFilter: 'blur(16px)',
  WebkitBackdropFilter: 'blur(16px)',
};

const glassInput = {
  background: 'rgba(255,255,255,0.06)',
  border: '1px solid rgba(255,255,255,0.08)',
  color: 'white',
};

function BrowseContent() {
  const searchParams = useSearchParams();
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showFilters, setShowFilters] = useState(false);
  const [searchFocused, setSearchFocused] = useState(false);

  const [search, setSearch] = useState('');
  const [category, setCategory] = useState(searchParams.get('category') || '');
  const [location, setLocation] = useState('');
  const [minBudget, setMinBudget] = useState('');
  const [maxBudget, setMaxBudget] = useState('');
  const [sortBy, setSortBy] = useState('newest');

  useEffect(() => {
    fetchJobs();
  }, [category]);

  const fetchJobs = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (category) params.set('category', category);
      if (location) params.set('location', location);
      if (search) params.set('search', search);

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

  const handleSearch = (e) => {
    e.preventDefault();
    fetchJobs();
  };

  const clearFilters = () => {
    setSearch('');
    setCategory('');
    setLocation('');
    setMinBudget('');
    setMaxBudget('');
    setSortBy('newest');
  };

  const filteredJobs = jobs
    .filter(job => {
      const matchesBudget =
        (!minBudget || job.budgetMax >= Number(minBudget)) &&
        (!maxBudget || job.budgetMin <= Number(maxBudget));
      return matchesBudget;
    })
    .sort((a, b) => {
      if (sortBy === 'newest') return new Date(b.createdAt) - new Date(a.createdAt);
      if (sortBy === 'oldest') return new Date(a.createdAt) - new Date(b.createdAt);
      if (sortBy === 'budget-high') return b.budgetMax - a.budgetMax;
      if (sortBy === 'budget-low') return a.budgetMin - b.budgetMin;
      return 0;
    });

  const hasActiveFilters = search || category || location || minBudget || maxBudget;

  return (
    <div className="min-h-screen bg-[#080f0a] relative overflow-hidden">
      <style>{`
        @keyframes drift {
          0%,100% { transform:translate(0,0) scale(1); }
          33% { transform:translate(30px,-20px) scale(1.05); }
          66% { transform:translate(-20px,15px) scale(0.97); }
        }
        .drift { animation: drift 14s ease-in-out infinite; }
        .job-card { transition: all 0.2s ease; }
        .job-card:hover { background: rgba(255,255,255,0.06) !important; transform: translateY(-1px); }
        .glass-select option { background: #0f1a12; color: white; }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 4px; }
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

      <div className="relative max-w-6xl mx-auto px-4 py-8">

        {/* Header */}
        <div className="flex justify-between items-start mb-8">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest mb-2"
              style={{ color: 'rgba(74,222,128,0.7)' }}>
              Port Harcourt
            </p>
            <h1 className="text-3xl md:text-4xl font-bold text-white mb-1">Browse Jobs</h1>
            <p style={{ color: 'rgba(255,255,255,0.3)' }} className="text-sm">
              {loading ? 'Loading...' : `${filteredJobs.length} job${filteredJobs.length !== 1 ? 's' : ''} available`}
            </p>
          </div>
          <Link
            href="/post-job"
            className="hidden md:flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white transition-all active:scale-95"
            style={{ background: 'linear-gradient(135deg,#16a34a,#15803d)', boxShadow: '0 4px 16px rgba(22,163,74,0.3)' }}
          >
            Post a Job
          </Link>
        </div>

        {/* Search Bar */}
        <form onSubmit={handleSearch} className="flex gap-3 mb-4">
          <div className="flex-1 relative">
            <Search size={17} className="absolute left-4 top-1/2 -translate-y-1/2"
              style={{ color: searchFocused ? 'rgba(74,222,128,0.8)' : 'rgba(255,255,255,0.25)' }} />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onFocus={() => setSearchFocused(true)}
              onBlur={() => setSearchFocused(false)}
              placeholder="Search jobs by title or description..."
              className="w-full pl-11 pr-4 py-3 rounded-xl text-sm outline-none transition-all placeholder-white/20"
              style={{
                ...glassInput,
                borderColor: searchFocused ? 'rgba(74,222,128,0.4)' : 'rgba(255,255,255,0.08)',
              }}
            />
          </div>
          <button
            type="submit"
            className="px-6 py-3 rounded-xl text-white text-sm font-semibold transition-all active:scale-95"
            style={{ background: 'linear-gradient(135deg,#16a34a,#15803d)', boxShadow: '0 4px 12px rgba(22,163,74,0.25)' }}
          >
            Search
          </button>
          <button
            type="button"
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-medium transition-all"
            style={{
              background: showFilters ? 'rgba(74,222,128,0.12)' : 'rgba(255,255,255,0.06)',
              border: showFilters ? '1px solid rgba(74,222,128,0.3)' : '1px solid rgba(255,255,255,0.08)',
              color: showFilters ? 'rgba(74,222,128,1)' : 'rgba(255,255,255,0.5)',
            }}
          >
            <SlidersHorizontal size={17} />
            <span className="hidden md:block">Filters</span>
          </button>
        </form>

        {/* Filters Panel */}
        {showFilters && (
          <div className="rounded-2xl p-6 mb-5" style={glassPanel}>
            <div className="grid md:grid-cols-4 gap-4 mb-4">
              {/* Category */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider mb-2"
                  style={{ color: 'rgba(255,255,255,0.3)' }}>Category</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl text-sm outline-none glass-select"
                  style={glassInput}
                >
                  <option value="">All Categories</option>
                  {CATEGORIES.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>

              {/* Location */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider mb-2"
                  style={{ color: 'rgba(255,255,255,0.3)' }}>Location</label>
                <select
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl text-sm outline-none glass-select"
                  style={glassInput}
                >
                  <option value="">All Locations</option>
                  {LOCATIONS.map(loc => (
                    <option key={loc} value={loc}>{loc}</option>
                  ))}
                </select>
              </div>

              {/* Min Budget */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider mb-2"
                  style={{ color: 'rgba(255,255,255,0.3)' }}>Min Budget (₦)</label>
                <input
                  type="number"
                  value={minBudget}
                  onChange={(e) => setMinBudget(e.target.value)}
                  placeholder="e.g. 5000"
                  className="w-full px-3 py-2.5 rounded-xl text-sm outline-none placeholder-white/20"
                  style={glassInput}
                />
              </div>

              {/* Max Budget */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider mb-2"
                  style={{ color: 'rgba(255,255,255,0.3)' }}>Max Budget (₦)</label>
                <input
                  type="number"
                  value={maxBudget}
                  onChange={(e) => setMaxBudget(e.target.value)}
                  placeholder="e.g. 50000"
                  className="w-full px-3 py-2.5 rounded-xl text-sm outline-none placeholder-white/20"
                  style={glassInput}
                />
              </div>
            </div>

            <div className="flex items-center justify-between pt-4"
              style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
              <div className="flex items-center gap-3">
                <label className="text-xs font-semibold uppercase tracking-wider"
                  style={{ color: 'rgba(255,255,255,0.3)' }}>Sort</label>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="px-3 py-2 rounded-xl text-sm outline-none glass-select"
                  style={glassInput}
                >
                  <option value="newest">Newest First</option>
                  <option value="oldest">Oldest First</option>
                  <option value="budget-high">Highest Budget</option>
                  <option value="budget-low">Lowest Budget</option>
                </select>
              </div>
              <div className="flex gap-3 items-center">
                {hasActiveFilters && (
                  <button
                    onClick={clearFilters}
                    className="flex items-center gap-1.5 text-sm transition-colors"
                    style={{ color: 'rgba(239,68,68,0.7)' }}
                    onMouseEnter={e => e.currentTarget.style.color = 'rgba(239,68,68,1)'}
                    onMouseLeave={e => e.currentTarget.style.color = 'rgba(239,68,68,0.7)'}
                  >
                    <X size={13} />
                    Clear
                  </button>
                )}
                <button
                  onClick={fetchJobs}
                  className="px-5 py-2 rounded-xl text-white text-sm font-semibold transition-all active:scale-95"
                  style={{ background: 'linear-gradient(135deg,#16a34a,#15803d)' }}
                >
                  Apply
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Active Filter Tags */}
        {hasActiveFilters && (
          <div className="flex flex-wrap gap-2 mb-5">
            {category && (
              <span className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium"
                style={{ background: 'rgba(74,222,128,0.12)', border: '1px solid rgba(74,222,128,0.25)', color: 'rgba(74,222,128,1)' }}>
                {category}
                <button onClick={() => setCategory('')} className="hover:opacity-70 transition-opacity"><X size={11} /></button>
              </span>
            )}
            {location && (
              <span className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium"
                style={{ background: 'rgba(74,222,128,0.12)', border: '1px solid rgba(74,222,128,0.25)', color: 'rgba(74,222,128,1)' }}>
                {location}
                <button onClick={() => setLocation('')} className="hover:opacity-70 transition-opacity"><X size={11} /></button>
              </span>
            )}
            {search && (
              <span className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium"
                style={{ background: 'rgba(74,222,128,0.12)', border: '1px solid rgba(74,222,128,0.25)', color: 'rgba(74,222,128,1)' }}>
                "{search}"
                <button onClick={() => setSearch('')} className="hover:opacity-70 transition-opacity"><X size={11} /></button>
              </span>
            )}
          </div>
        )}

        {/* Jobs Grid */}
        {loading ? (
          <div className="grid md:grid-cols-2 gap-4">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="rounded-2xl p-6 animate-pulse" style={glassPanel}>
                <div className="flex gap-4">
                  <div className="w-12 h-12 rounded-2xl flex-shrink-0"
                    style={{ background: 'rgba(255,255,255,0.06)' }} />
                  <div className="flex-1 space-y-3">
                    <div className="h-4 rounded-lg w-3/4" style={{ background: 'rgba(255,255,255,0.06)' }} />
                    <div className="h-3 rounded-lg w-1/2" style={{ background: 'rgba(255,255,255,0.04)' }} />
                    <div className="h-3 rounded-lg w-2/3" style={{ background: 'rgba(255,255,255,0.04)' }} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : filteredJobs.length === 0 ? (
          <div className="rounded-2xl py-20 text-center" style={glassPanel}>
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4"
              style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
              <Search size={24} style={{ color: 'rgba(255,255,255,0.2)' }} />
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">No jobs found</h3>
            <p className="text-sm mb-6" style={{ color: 'rgba(255,255,255,0.3)' }}>
              Try adjusting your filters or search terms
            </p>
            <button
              onClick={clearFilters}
              className="px-6 py-2.5 rounded-xl text-white text-sm font-semibold transition-all active:scale-95"
              style={{ background: 'linear-gradient(135deg,#16a34a,#15803d)' }}
            >
              Clear All Filters
            </button>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 gap-4">
            {filteredJobs.map((job, i) => (
              <div
                key={job._id}
                className="job-card rounded-2xl p-5 group"
                style={glassPanel}
              >
                {/* Top row */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0"
                      style={{ background: 'rgba(74,222,128,0.12)', border: '1px solid rgba(74,222,128,0.2)' }}>
                      <Briefcase size={18} className="text-green-400" />
                    </div>
                    <div>
                      <span className="text-xs font-medium px-2.5 py-1 rounded-full"
                        style={{ background: 'rgba(74,222,128,0.12)', color: 'rgba(74,222,128,0.9)', border: '1px solid rgba(74,222,128,0.2)' }}>
                        {job.category}
                      </span>
                    </div>
                  </div>
                  <span className="text-xs" style={{ color: 'rgba(255,255,255,0.25)' }}>
                    {new Date(job.createdAt).toLocaleDateString('en-NG', { day: 'numeric', month: 'short' })}
                  </span>
                </div>

                {/* Title & Description */}
                <h3 className="font-bold text-base text-white mb-2 line-clamp-2 group-hover:text-green-400 transition-colors">
                  {job.title}
                </h3>
                <p className="text-sm mb-4 line-clamp-2 leading-relaxed"
                  style={{ color: 'rgba(255,255,255,0.35)' }}>
                  {job.description}
                </p>

                {/* Budget */}
                <p className="font-bold text-green-400 text-sm mb-4">
                  ₦{job.budgetMin?.toLocaleString()} — ₦{job.budgetMax?.toLocaleString()}
                </p>

                {/* Bottom row */}
                <div className="flex items-center justify-between pt-4"
                  style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                  <div className="flex items-center gap-4">
                    <span className="flex items-center gap-1.5 text-xs"
                      style={{ color: 'rgba(255,255,255,0.3)' }}>
                      <MapPin size={11} />
                      {job.location}
                    </span>
                    <span className="flex items-center gap-1.5 text-xs"
                      style={{ color: 'rgba(255,255,255,0.3)' }}>
                      <Clock size={11} />
                      {new Date(job.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  <Link
                    href={`/jobs/${job._id}`}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold text-white transition-all active:scale-95 group-hover:gap-2"
                    style={{ background: 'linear-gradient(135deg,#16a34a,#15803d)', boxShadow: '0 2px 8px rgba(22,163,74,0.2)' }}
                  >
                    View & Apply
                    <ChevronRight size={13} />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function BrowsePage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-screen bg-[#080f0a]">
        <div className="w-10 h-10 rounded-full border-2 border-green-500/20 border-t-green-500 animate-spin" />
      </div>
    }>
      <BrowseContent />
    </Suspense>
  );
}