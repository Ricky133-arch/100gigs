'use client';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { ArrowLeft, ArrowRight, ArrowUpRight, Check, Share2 } from 'lucide-react';
import VerifiedBadge from '@/components/VerifiedBadge';
import { toast } from 'sonner';

/* ── social links ────────────────────────────────────────── */

// Only link to the platform's own site. A full URL is accepted only if it
// points at that platform, so a profile can't disguise a scam link as "Instagram".
const SOCIAL_PLATFORMS = [
  { key: 'instagram', label: 'Instagram', hosts: ['instagram.com'], build: (h) => `https://www.instagram.com/${h}/` },
  { key: 'facebook', label: 'Facebook', hosts: ['facebook.com', 'fb.com'], build: (h) => `https://www.facebook.com/${h}` },
  { key: 'twitter', label: 'X', hosts: ['x.com', 'twitter.com'], build: (h) => `https://x.com/${h}` },
  { key: 'tiktok', label: 'TikTok', hosts: ['tiktok.com'], build: (h) => `https://www.tiktok.com/@${h}` },
  { key: 'linkedin', label: 'LinkedIn', hosts: ['linkedin.com'], build: (h) => `https://www.linkedin.com/in/${h}` },
  { key: 'youtube', label: 'YouTube', hosts: ['youtube.com', 'youtu.be'], build: (h) => `https://www.youtube.com/@${h}` },
];

function socialUrl(platform, raw) {
  const v = String(raw || '').trim();
  if (!v) return null;
  if (/^https?:\/\//i.test(v)) {
    try {
      const host = new URL(v).hostname.replace(/^www\.|^m\./, '');
      return platform.hosts.some((h) => host === h || host.endsWith(`.${h}`)) ? v : null;
    } catch { return null; }
  }
  const handle = v.replace(/^@/, '').replace(/[^\w.\-]/g, '');
  return handle ? platform.build(handle) : null;
}

/* ── helpers ─────────────────────────────────────────────── */

function Stars({ rating, className = 'text-[15px]' }) {
  const r = Math.round(rating || 0);
  return (
    <span className={`tracking-[0.1em] ${className}`} aria-label={`${rating} out of 5`}>
      {[1, 2, 3, 4, 5].map((s) => (
        <span key={s} className={s <= r ? 'text-amber-300' : 'text-white/15'}>★</span>
      ))}
    </span>
  );
}

const fmtAvg = (n) => (Number.isFinite(Number(n)) ? Number(n).toFixed(1) : '0.0');
const fmtDate = (d) => new Date(d).toLocaleDateString('en-NG', { month: 'short', year: 'numeric' });

/* ── page ────────────────────────────────────────────────── */

export default function PublicProfile() {
  const { id } = useParams();
  const router = useRouter();
  const { data: session } = useSession();

  const [user, setUser] = useState(null);
  const [ratingsData, setRatingsData] = useState({ ratings: [], average: 0, total: 0 });
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [showPhone, setShowPhone] = useState(false);
  const [showAllReviews, setShowAllReviews] = useState(false);

  useEffect(() => {
    setLoading(true);
    setShowPhone(false);
    fetchProfile();
    fetchRatings();
  }, [id]); // eslint-disable-line react-hooks/exhaustive-deps

  const fetchProfile = async () => {
    try {
      const res = await fetch(`/api/users/${id}`);
      if (!res.ok) throw new Error('Not found');
      setUser(await res.json());
    } catch (err) {
      console.error(err);
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  const fetchRatings = async () => {
    try {
      const res = await fetch(`/api/ratings/${id}`);
      if (res.ok) {
        const data = await res.json();
        setRatingsData({ ratings: data.ratings || [], average: data.average || 0, total: data.total || 0 });
      }
    } catch (err) { console.error(err); }
  };

  // Use the phone's share sheet when available (WhatsApp etc.), otherwise copy
  const share = async () => {
    const url = window.location.href;
    const title = `${user?.name} on 100Gigs`;
    if (navigator.share) {
      try { await navigator.share({ title, text: `${title} — hire skilled hands in Port Harcourt`, url }); return; }
      catch (e) { if (e?.name === 'AbortError') return; }
    }
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      toast.success('Link copied');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Couldn’t copy. Copy the link from your address bar.');
    }
  };

  const goBack = () => (window.history.length > 1 ? router.back() : router.push('/'));

  const shell = (children) => (
    <div className="pp min-h-screen bg-[#080f0a] text-[#e9efe9] antialiased">
      <style>{`
        .pp { font-family: var(--font-sans), ui-sans-serif, system-ui, sans-serif; }
        .serif { font-family: var(--font-serif), Georgia, serif; font-weight: 400; letter-spacing: -0.01em; }
        .mono { font-family: var(--font-mono), ui-monospace, monospace; }
      `}</style>
      {children}
    </div>
  );

  if (loading) {
    return shell(
      <div className="flex min-h-screen items-center justify-center">
        <p className="mono text-[11px] uppercase tracking-[0.18em] text-white/35">Loading profile…</p>
      </div>
    );
  }

  if (!user) {
    return shell(
      <div className="mx-auto flex min-h-screen max-w-5xl flex-col justify-center px-5 md:px-8">
        <p className="serif text-5xl leading-none">This profile isn’t here.</p>
        <p className="mt-4 max-w-sm text-[15px] text-white/50">The account may have been removed, or the link is wrong.</p>
        <Link href="/"
          className="mt-8 inline-flex w-max items-center gap-2 rounded-full bg-green-400 px-6 py-3 text-[14px] font-medium text-[#080f0a] transition hover:bg-green-300">
          Go to 100Gigs <ArrowRight size={15} />
        </Link>
      </div>
    );
  }

  const isSelf = session?.user?.id === user._id || session?.user?.id === id;
  const isVerified = user.verificationStatus === 'verified';
  const firstName = user.name?.split(' ')[0];
  const socials = SOCIAL_PLATFORMS
    .map((p) => ({ ...p, url: socialUrl(p, user.socialLinks?.[p.key]) }))
    .filter((p) => p.url);
  const reviews = showAllReviews ? ratingsData.ratings : ratingsData.ratings.slice(0, 5);
  const telHref = user.phone ? `tel:${String(user.phone).replace(/[^\d+]/g, '')}` : null;
  const chatHref = `/chat?to=${user._id || id}&name=${encodeURIComponent(user.name || '')}`;

  return shell(
    <div className="mx-auto max-w-5xl px-5 pb-20 pt-8 md:px-8 md:pt-12">
      <button onClick={goBack}
        className="mb-10 inline-flex items-center gap-1.5 text-[13px] text-white/45 transition hover:text-white">
        <ArrowLeft size={14} /> Back
      </button>

      {/* ─── Header ─── */}
      <header className="mb-14 grid gap-8 border-b border-white/10 pb-12 md:grid-cols-[auto_1fr] md:items-end md:gap-10">
        <div className="h-28 w-28 overflow-hidden rounded-full bg-green-400 md:h-36 md:w-36">
          {user.avatar
            ? <img src={user.avatar} alt={user.name} className="h-full w-full object-cover" />
            : <div className="serif flex h-full w-full items-center justify-center text-6xl text-[#080f0a]">{user.name?.charAt(0).toUpperCase()}</div>}
        </div>

        <div className="min-w-0">
          <p className="mono mb-4 text-[11px] uppercase tracking-[0.16em] text-white/40">
            {user.role === 'provider' ? 'Service provider' : user.role}
            {user.location && <> · {user.location}</>}
            {user.createdAt && <> · Joined {fmtDate(user.createdAt)}</>}
          </p>
          <h1 className="serif flex flex-wrap items-center gap-3 text-5xl leading-[0.95] md:text-7xl">
            <span>{user.name}</span>
            {isVerified && <VerifiedBadge size={26} />}
          </h1>
          <div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-2">
            {ratingsData.total > 0 ? (
              <a href="#reviews" className="group inline-flex items-center gap-3">
                <span className="mono text-2xl text-white">{fmtAvg(ratingsData.average)}</span>
                <Stars rating={ratingsData.average} />
                <span className="text-[13px] text-white/40 transition group-hover:text-white">
                  {ratingsData.total} {ratingsData.total === 1 ? 'review' : 'reviews'}
                </span>
              </a>
            ) : (
              <span className="text-[13px] text-white/40">No reviews yet</span>
            )}
            {isVerified && (
              <span className="mono text-[11px] uppercase tracking-[0.14em] text-green-400">ID verified</span>
            )}
          </div>
        </div>
      </header>

      <div className="grid gap-16 lg:grid-cols-[1fr_320px] lg:gap-16">

        {/* ─── Left ─── */}
        <div className="min-w-0 space-y-14">
          {user.bio && (
            <section>
              <p className="mono mb-4 text-[10px] uppercase tracking-[0.16em] text-white/35">About</p>
              <p className="whitespace-pre-wrap text-[17px] leading-[1.7] text-white/80">{user.bio}</p>
            </section>
          )}

          {user.skills?.length > 0 && (
            <section>
              <p className="mono mb-4 text-[10px] uppercase tracking-[0.16em] text-white/35">Services</p>
              <ul className="flex flex-wrap gap-2">
                {user.skills.map((skill) => (
                  <li key={skill}>
                    <Link href={`/browse?category=${encodeURIComponent(skill)}`}
                      className="inline-block rounded-full border border-white/15 px-4 py-2 text-[13px] text-white/80 transition hover:border-green-400 hover:text-green-400">
                      {skill}
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          )}

          <section id="reviews" className="scroll-mt-8">
            <div className="mb-2 flex items-baseline gap-4">
              <h2 className="serif text-4xl leading-none">Reviews</h2>
              {ratingsData.total > 0 && <span className="mono text-[13px] text-white/35">{ratingsData.total}</span>}
            </div>

            <div className="border-t border-white/10">
              {ratingsData.total === 0 ? (
                <p className="py-10 text-[15px] text-white/45">
                  {isSelf
                    ? 'Reviews appear here after clients rate your work. Finish a few jobs and ask happy clients to leave one.'
                    : `${firstName} hasn’t been reviewed yet. Everyone starts somewhere.`}
                </p>
              ) : (
                <>
                  <ul>
                    {reviews.map((r) => (
                      <li key={r._id} className="border-b border-white/[0.07] py-7">
                        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                          <Stars rating={r.rating} className="text-[13px]" />
                          <span className="mono text-[11px] text-white/30">{fmtDate(r.createdAt)}</span>
                        </div>
                        {r.review
                          ? <p className="serif text-2xl leading-snug text-white/90">“{r.review}”</p>
                          : <p className="text-[14px] italic text-white/35">No written review.</p>}
                        <p className="mt-3 text-[13px] text-white/45">
                          {r.client?.name || 'A client'}
                          {r.job?.title && <span className="text-white/30"> · {r.job.title}</span>}
                        </p>
                      </li>
                    ))}
                  </ul>
                  {ratingsData.ratings.length > 5 && !showAllReviews && (
                    <button onClick={() => setShowAllReviews(true)}
                      className="mt-6 border-b border-white/20 pb-0.5 text-[14px] text-white/70 transition hover:border-green-400 hover:text-green-400">
                      Show all {ratingsData.ratings.length} reviews
                    </button>
                  )}
                </>
              )}
            </div>
          </section>
        </div>

        {/* ─── Right: contact ─── */}
        <aside className="lg:sticky lg:top-8 lg:self-start">
          <div className="border border-white/10 bg-[#0b150e] p-6">
            {isSelf ? (
              <>
                <p className="mono mb-3 text-[10px] uppercase tracking-[0.16em] text-white/35">Your public profile</p>
                <p className="text-[14px] leading-relaxed text-white/60">This is what clients see. Share it on WhatsApp and Instagram to get more work.</p>
                <Link href="/profile"
                  className="mt-6 flex w-full items-center justify-center gap-2 rounded-full bg-green-400 py-3 text-[14px] font-medium text-[#080f0a] transition hover:bg-green-300">
                  Edit profile
                </Link>
              </>
            ) : (
              <>
                <p className="serif mb-5 text-3xl leading-tight">Work with {firstName}</p>
                {session ? (
                  <Link href={chatHref}
                    className="group flex w-full items-center justify-center gap-2 rounded-full bg-green-400 py-3 text-[14px] font-medium text-[#080f0a] transition hover:bg-green-300">
                    Send a message <ArrowRight size={15} className="transition-transform group-hover:translate-x-0.5" />
                  </Link>
                ) : (
                  <Link href={`/login?callbackUrl=${encodeURIComponent(`/profile/${id}`)}`}
                    className="group flex w-full items-center justify-center gap-2 rounded-full bg-green-400 py-3 text-[14px] font-medium text-[#080f0a] transition hover:bg-green-300">
                    Log in to message <ArrowRight size={15} className="transition-transform group-hover:translate-x-0.5" />
                  </Link>
                )}

                {telHref && (
                  showPhone ? (
                    <a href={telHref}
                      className="mono mt-3 flex w-full items-center justify-center rounded-full border border-green-400/50 py-3 text-[14px] text-green-400 transition hover:bg-green-400/10">
                      {user.phone}
                    </a>
                  ) : (
                    <button onClick={() => setShowPhone(true)}
                      className="mt-3 flex w-full items-center justify-center rounded-full border border-white/15 py-3 text-[14px] text-white/75 transition hover:border-white/40 hover:text-white">
                      Show phone number
                    </button>
                  )
                )}
              </>
            )}

            <button onClick={share}
              className="mt-6 inline-flex items-center gap-2 text-[13px] text-white/50 transition hover:text-white">
              {copied ? <><Check size={14} className="text-green-400" /> Link copied</> : <><Share2 size={14} /> Share this profile</>}
            </button>
          </div>

          {socials.length > 0 && (
            <nav className="mt-10">
              <p className="mono mb-3 text-[10px] uppercase tracking-[0.16em] text-white/35">Elsewhere</p>
              <ul className="border-t border-white/10">
                {socials.map((p) => (
                  <li key={p.key}>
                    <a href={p.url} target="_blank" rel="noopener noreferrer nofollow"
                      className="group flex items-center justify-between border-b border-white/10 py-3.5 text-[14px] text-white/75 transition hover:text-green-400">
                      {p.label}
                      <ArrowUpRight size={15} className="text-white/25 transition group-hover:text-green-400" />
                    </a>
                  </li>
                ))}
              </ul>
              <p className="mt-3 text-[12px] leading-relaxed text-white/30">Check their past work before you hire.</p>
            </nav>
          )}
        </aside>
      </div>

      {/* Footer — for people arriving from a shared link */}
      <footer className="mt-24 border-t border-white/10 pt-8">
        <p className="text-[13px] text-white/40">
          Looking for someone else?{' '}
          <Link href="/" className="text-white transition hover:text-green-400">
            <span className="text-green-400">100</span>Gigs
          </Link>{' '}
          connects you with skilled hands across Port Harcourt.
        </p>
      </footer>
    </div>
  );
}