'use client';
import { useSession } from 'next-auth/react';
import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Loader2, Check, ArrowUpRight, Share2 } from 'lucide-react';
import { toast } from 'sonner';
import VerifiedBadge from '@/components/VerifiedBadge';

const SKILLS = [
  'Plumbing', 'Electrical', 'Carpentry', 'Makeup & Hair',
  'Cleaning', 'Painting', 'Car Repair', 'Tailoring',
  'Graphic Design', 'Photography', 'Tutoring', 'Delivery',
  'Event Planning', 'AC Repair', 'Other',
];

// Same list as Post a Job, so providers and jobs use matching area names
const LOCATIONS = [
  'GRA Phase 1', 'GRA Phase 2', 'Trans Amadi', 'Woji',
  'Elelenwo', 'Rumuomasi', 'Rumuola', 'Diobu', 'Borokiri',
  'D-Line', 'Rumuigbo', 'Ozuoba', 'Choba', 'Ada George',
  'Rukpokwu', 'Eneka', 'Mgbuoba',
  'Port Harcourt City', 'Asari-Toru', 'Other',
];

const SOCIAL_PLATFORMS = [
  { key: 'instagram', label: 'Instagram', placeholder: '@yourhandle', hint: 'Photos of your work build trust fast.', hosts: ['instagram.com'], build: (h) => `https://www.instagram.com/${h}/` },
  { key: 'tiktok', label: 'TikTok', placeholder: '@yourhandle', hint: 'Short videos of jobs you’ve done.', hosts: ['tiktok.com'], build: (h) => `https://www.tiktok.com/@${h}` },
  { key: 'facebook', label: 'Facebook', placeholder: 'Full profile or page link', hint: 'Paste the full link to your page.', hosts: ['facebook.com', 'fb.com'], build: (h) => `https://www.facebook.com/${h}` },
  { key: 'twitter', label: 'X', placeholder: '@yourhandle', hosts: ['x.com', 'twitter.com'], build: (h) => `https://x.com/${h}` },
  { key: 'linkedin', label: 'LinkedIn', placeholder: 'your-name', hint: 'Useful for office and corporate clients.', hosts: ['linkedin.com'], build: (h) => `https://www.linkedin.com/in/${h}` },
  { key: 'youtube', label: 'YouTube', placeholder: '@yourchannel', hosts: ['youtube.com', 'youtu.be'], build: (h) => `https://www.youtube.com/@${h}` },
];

// A full URL only counts if it really points at that platform
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

const label = 'mono mb-3 block text-[10px] uppercase tracking-[0.16em] text-white/35';
const input = 'w-full border-b border-white/15 bg-transparent pb-3 text-[16px] text-white outline-none transition-colors placeholder:text-white/20 focus:border-green-400';

// Defined outside the page component so inputs inside keep focus while typing
function Section({ n, title, hint, children }) {
  return (
    <section className="border-t border-white/10 pt-8">
      <div className="mb-8 flex items-baseline gap-4">
        <span className="mono text-[11px] text-green-400">{String(n).padStart(2, '0')}</span>
        <div>
          <h2 className="text-[17px] font-medium text-white">{title}</h2>
          {hint && <p className="mt-1 text-[13px] text-white/40">{hint}</p>}
        </div>
      </div>
      {children}
    </section>
  );
}

const EMPTY_SOCIALS = { instagram: '', facebook: '', twitter: '', tiktok: '', linkedin: '', youtube: '' };
const editable = (p) => JSON.stringify({
  name: p.name, phone: p.phone, bio: p.bio, location: p.location,
  skills: [...p.skills].sort(), username: p.username, socialLinks: p.socialLinks,
});

export default function ProfilePage() {
  const { data: session, status, update: updateSession } = useSession();
  const router = useRouter();

  const [profile, setProfile] = useState({
    name: '', email: '', phone: '', bio: '', location: '', skills: [],
    avatar: '', verificationStatus: 'unsubmitted', username: '',
    socialLinks: { ...EMPTY_SOCIALS },
  });
  const [savedSnapshot, setSavedSnapshot] = useState(null); // last saved version
  const [savedUsername, setSavedUsername] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [copied, setCopied] = useState(false);
  const [usernameChecking, setUsernameChecking] = useState(false);
  const [usernameAvailable, setUsernameAvailable] = useState(null);
  const checkId = useRef(0);

  const role = session?.user?.role;
  const isProvider = role === 'provider';

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/login?callbackUrl=%2Fprofile');
  }, [status]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { if (session) fetchProfile(); }, [session?.user?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const fetchProfile = async () => {
    setLoadFailed(false);
    try {
      const res = await fetch('/api/users/profile');
      if (!res.ok) throw new Error('Failed');
      const data = await res.json();
      const p = {
        name: data.name || '',
        email: data.email || '',
        phone: data.phone || '',
        bio: data.bio || '',
        location: data.location || '',
        skills: data.skills || [],
        avatar: data.avatar || '',
        verificationStatus: data.verificationStatus || 'unsubmitted',
        username: data.username || '',
        socialLinks: { ...EMPTY_SOCIALS, ...(data.socialLinks || {}) },
      };
      setProfile(p);
      setSavedSnapshot(editable(p));
      setSavedUsername(p.username);
    } catch (err) {
      console.error(err);
      setLoadFailed(true);
    } finally {
      setLoading(false);
    }
  };

  const dirty = savedSnapshot !== null && editable(profile) !== savedSnapshot;

  // Warn before leaving with unsaved changes
  useEffect(() => {
    if (!dirty) return;
    const warn = (e) => { e.preventDefault(); e.returnValue = ''; };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty]);

  // Username availability (ignores stale answers and your own current name)
  useEffect(() => {
    const u = profile.username;
    if (!u || u.length < 3 || u === savedUsername) { setUsernameAvailable(null); setUsernameChecking(false); return; }
    const myId = ++checkId.current;
    setUsernameChecking(true);
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/users/check-username?username=${encodeURIComponent(u)}`);
        const data = await res.json();
        if (myId === checkId.current) setUsernameAvailable(!!data.available);
      } catch {
        if (myId === checkId.current) setUsernameAvailable(null);
      } finally {
        if (myId === checkId.current) setUsernameChecking(false);
      }
    }, 450);
    return () => clearTimeout(timer);
  }, [profile.username, savedUsername]);

  const set = (name, value) => setProfile((p) => ({ ...p, [name]: value }));
  const setSocial = (key, value) => setProfile((p) => ({ ...p, socialLinks: { ...p.socialLinks, [key]: value } }));
  const toggleSkill = (skill) => setProfile((p) => ({
    ...p,
    skills: p.skills.includes(skill) ? p.skills.filter((s) => s !== skill) : [...p.skills, skill],
  }));

  // The link uses the SAVED username, so it always works when shared
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const publicPath = savedUsername ? `/u/${savedUsername}` : `/profile/${session?.user?.id}`;
  const shareableLink = `${origin}${publicPath}`;

  const shareLink = async () => {
    if (navigator.share) {
      try { await navigator.share({ title: `${profile.name} on 100Gigs`, url: shareableLink }); return; }
      catch (e) { if (e?.name === 'AbortError') return; }
    }
    try {
      await navigator.clipboard.writeText(shareableLink);
      setCopied(true);
      toast.success('Link copied');
      setTimeout(() => setCopied(false), 2000);
    } catch { toast.error('Couldn’t copy the link'); }
  };

  // Uploading a photo saves ONLY the photo, not other half-finished edits
  const handleAvatarChange = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (!file.type.startsWith('image/')) { toast.error('Choose an image file'); return; }
    if (file.size > 10 * 1024 * 1024) { toast.error('That photo is over 10MB'); return; }

    setUploadingAvatar(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const up = await fetch('/api/upload', { method: 'POST', body: fd });
      if (!up.ok) throw new Error('upload');
      const { url } = await up.json();

      const res = await fetch('/api/users/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ avatar: url }),
      });
      if (!res.ok) throw new Error('save');

      setProfile((p) => ({ ...p, avatar: url }));
      await updateSession({ avatar: url });
      toast.success('Photo updated');
    } catch {
      toast.error('Couldn’t update your photo. Please try again.');
    } finally {
      setUploadingAvatar(false);
    }
  };

  const usernameTooShort = profile.username.length > 0 && profile.username.length < 3;
  const blockedByUsername = usernameTooShort || usernameAvailable === false || usernameChecking;

  const handleSave = async (e) => {
    e?.preventDefault();
    if (!profile.name.trim()) { toast.error('Your name can’t be empty'); return; }
    if (usernameTooShort) { toast.error('Usernames need at least 3 characters'); return; }
    if (usernameAvailable === false) { toast.error('That username is taken'); return; }

    setSaving(true);
    try {
      const body = {
        name: profile.name.trim(),
        phone: profile.phone.trim(),
        bio: profile.bio.trim(),
        location: profile.location,
        skills: profile.skills,
        username: profile.username,
        socialLinks: Object.fromEntries(Object.entries(profile.socialLinks).map(([k, v]) => [k, v.trim()])),
      };
      const res = await fetch('/api/users/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { toast.error(data.error || 'Couldn’t save your profile'); return; }

      const next = { ...profile, ...body };
      setProfile(next);
      setSavedSnapshot(editable(next));
      setSavedUsername(next.username);
      setUsernameAvailable(null);
      // Keep the name in the nav and menus in sync
      if (body.name !== session?.user?.name) await updateSession({ name: body.name });
      toast.success('Profile saved');
    } catch {
      toast.error('Something went wrong. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const discard = () => {
    if (!savedSnapshot) return;
    const s = JSON.parse(savedSnapshot);
    setProfile((p) => ({ ...p, ...s }));
  };

  /* ── profile strength (providers) ──────────────────────── */
  const checks = isProvider ? [
    ['Profile photo', !!profile.avatar],
    ['Bio of 80+ characters', profile.bio.trim().length >= 80],
    ['At least one service', profile.skills.length > 0],
    ['Your area', !!profile.location],
    ['Phone number', !!profile.phone.trim()],
    ['A social link', Object.values(profile.socialLinks).some((v) => v.trim())],
    ['ID verified', profile.verificationStatus === 'verified'],
  ] : [
    ['Profile photo', !!profile.avatar],
    ['Your area', !!profile.location],
    ['Phone number', !!profile.phone.trim()],
  ];
  const done = checks.filter(([, ok]) => ok).length;
  const pct = Math.round((done / checks.length) * 100);

  /* ── render ───────────────────────────────────────────── */

  const shell = (children) => (
    <div className="pf min-h-screen bg-[#080f0a] text-[#e9efe9] antialiased">
      <style>{`
        .pf { font-family: var(--font-sans), ui-sans-serif, system-ui, sans-serif; }
        .serif { font-family: var(--font-serif), Georgia, serif; font-weight: 400; letter-spacing: -0.01em; }
        .mono { font-family: var(--font-mono), ui-monospace, monospace; }
        .pf select option { background: #0b150e; color: #fff; }
      `}</style>
      {children}
    </div>
  );

  if (status === 'loading' || loading) {
    return shell(
      <div className="flex min-h-screen items-center justify-center">
        <p className="mono text-[11px] uppercase tracking-[0.18em] text-white/35">Loading profile…</p>
      </div>
    );
  }

  if (loadFailed) {
    return shell(
      <div className="mx-auto flex min-h-screen max-w-5xl flex-col justify-center px-5 md:px-8">
        <p className="serif text-5xl leading-none">Couldn’t load your profile.</p>
        <button onClick={() => { setLoading(true); fetchProfile(); }}
          className="mt-8 w-max border-b border-green-400 pb-0.5 text-[15px] text-white transition hover:text-green-400">
          Try again
        </button>
      </div>
    );
  }

  const vStatus = profile.verificationStatus;

  return shell(
    <div className="mx-auto max-w-6xl px-5 pb-40 pt-10 md:px-8 md:pt-16">

      {/* ─── Header ─── */}
      <header className="mb-14 grid gap-8 md:grid-cols-[auto_1fr] md:items-end md:gap-10">
        <label className="group relative block h-28 w-28 cursor-pointer md:h-32 md:w-32">
          <div className="h-full w-full overflow-hidden rounded-full bg-green-400">
            {profile.avatar
              ? <img src={profile.avatar} alt={profile.name} className="h-full w-full object-cover" />
              : <div className="serif flex h-full w-full items-center justify-center text-6xl text-[#080f0a]">{(profile.name || session?.user?.name)?.charAt(0).toUpperCase()}</div>}
          </div>
          <div className={`absolute inset-0 flex items-center justify-center rounded-full bg-black/55 transition ${uploadingAvatar ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
            {uploadingAvatar ? <Loader2 size={20} className="animate-spin text-white" /> : <span className="mono text-[10px] uppercase tracking-[0.14em] text-white">Change</span>}
          </div>
          <span className="mono absolute -bottom-2 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full border border-white/15 bg-[#080f0a] px-3 py-1 text-[10px] uppercase tracking-[0.12em] text-white/60 md:hidden">
            Change photo
          </span>
          <input type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} disabled={uploadingAvatar} />
        </label>

        <div className="min-w-0">
          <p className="mono mb-4 text-[11px] uppercase tracking-[0.16em] text-white/40">
            {isProvider ? 'Provider account' : `${role} account`} · {profile.email}
          </p>
          <h1 className="serif flex flex-wrap items-center gap-3 text-5xl leading-[0.95] md:text-7xl">
            <span className="truncate">{profile.name || 'Your profile'}</span>
            {vStatus === 'verified' && <VerifiedBadge size={24} />}
          </h1>
          {isProvider && vStatus !== 'verified' && (
            <Link href="/verification" className="mt-5 inline-flex items-center gap-1.5 text-[13px] text-amber-300 hover:underline underline-offset-4">
              {vStatus === 'pending' ? 'ID check under review' : vStatus === 'rejected' ? 'ID check needs attention' : 'Get your verified badge'}
              <ArrowUpRight size={13} />
            </Link>
          )}
        </div>
      </header>

      <div className="grid gap-16 lg:grid-cols-[1fr_320px] lg:gap-16">

        {/* ─── Form ─── */}
        <form onSubmit={handleSave} className="min-w-0 space-y-14" noValidate>
          <Section n={1} title="The basics">
            <div className="grid gap-8 sm:grid-cols-2">
              <div>
                <label htmlFor="name" className={label}>Full name</label>
                <input id="name" value={profile.name} onChange={(e) => set('name', e.target.value)}
                  autoComplete="name" maxLength={60} className={input} />
              </div>
              <div>
                <label className={label}>Email</label>
                <p className="border-b border-white/[0.07] pb-3 text-[16px] text-white/40">{profile.email}</p>
                <p className="mt-2 text-[12px] text-white/25">Email can’t be changed.</p>
              </div>
            </div>

            <div className="mt-8">
              <label htmlFor="username" className={label}>Profile link</label>
              <div className={`flex items-baseline border-b pb-3 transition-colors focus-within:border-green-400 ${
                usernameAvailable === false || usernameTooShort ? 'border-red-400/70' : 'border-white/15'}`}>
                <span className="mono shrink-0 text-[14px] text-white/30">100gigs.com/u/</span>
                <input id="username" value={profile.username} maxLength={30} placeholder="your-name"
                  autoCapitalize="none" autoCorrect="off" spellCheck={false}
                  onChange={(e) => set('username', e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, ''))}
                  className="mono min-w-0 flex-1 bg-transparent text-[16px] text-white outline-none placeholder:text-white/20" />
                <span className="ml-3 w-14 shrink-0 text-right text-[12px]">
                  {usernameChecking && <Loader2 size={14} className="ml-auto animate-spin text-white/30" />}
                  {!usernameChecking && usernameAvailable === true && <span className="text-green-400">Free</span>}
                  {!usernameChecking && usernameAvailable === false && <span className="text-red-300">Taken</span>}
                </span>
              </div>
              <p className={`mt-2 text-[12px] ${usernameTooShort || usernameAvailable === false ? 'text-red-300' : 'text-white/30'}`}>
                {usernameTooShort ? 'At least 3 characters.'
                  : usernameAvailable === false ? 'Someone has that one. Try adding your trade or area.'
                  : 'Letters, numbers, - and _ · 3–30 characters. Easy to type is best.'}
              </p>
            </div>
          </Section>

          <Section n={2} title="Contact and area" hint="Clients use your area to judge distance.">
            <div className="grid gap-8 sm:grid-cols-2">
              <div>
                <label htmlFor="phone" className={label}>Phone number</label>
                <input id="phone" type="tel" inputMode="tel" autoComplete="tel" value={profile.phone}
                  onChange={(e) => set('phone', e.target.value)} placeholder="0801 234 5678"
                  className={`${input} mono`} />
              </div>
              <div>
                <label htmlFor="location" className={label}>Area</label>
                <select id="location" value={profile.location} onChange={(e) => set('location', e.target.value)}
                  className={`${input} ${profile.location ? '' : 'text-white/30'}`}>
                  <option value="">Choose your area</option>
                  {LOCATIONS.map((l) => <option key={l} value={l}>{l}</option>)}
                  {profile.location && !LOCATIONS.includes(profile.location) && (
                    <option value={profile.location}>{profile.location}</option>
                  )}
                </select>
              </div>
            </div>
          </Section>

          <Section n={3} title="About you"
            hint={isProvider ? 'How long you’ve done this, what you’re best at, and why clients come back.' : 'A line or two so providers know who they’re working with.'}>
            <textarea id="bio" value={profile.bio} onChange={(e) => set('bio', e.target.value)} rows={5} maxLength={1000}
              placeholder={isProvider ? 'e.g. Electrician for 8 years. I handle wiring, inverter installs and prepaid meters across Rumuola and GRA. I show up on time and clean up after.' : ''}
              className={`${input} resize-none leading-relaxed`} />
            <div className="mt-2 flex justify-between text-[12px]">
              <span className={isProvider && profile.bio.trim().length >= 80 ? 'text-green-400' : 'text-white/30'}>
                {isProvider && (profile.bio.trim().length >= 80 ? 'Good length.' : `Aim for 80+ characters.`)}
              </span>
              <span className="mono text-white/25">{profile.bio.length}/1000</span>
            </div>
          </Section>

          {isProvider && (
            <Section n={4} title="Your services" hint="Pick everything you can do. You’ll show up when clients browse these.">
              <div className="flex flex-wrap gap-2">
                {SKILLS.map((skill) => {
                  const on = profile.skills.includes(skill);
                  return (
                    <button key={skill} type="button" onClick={() => toggleSkill(skill)} aria-pressed={on}
                      className={`inline-flex items-center gap-1.5 rounded-full border px-4 py-2 text-[13px] transition ${
                        on ? 'border-green-400 bg-green-400 text-[#080f0a]' : 'border-white/15 text-white/65 hover:border-white/40 hover:text-white'}`}>
                      {on && <Check size={13} strokeWidth={2.5} />}{skill}
                    </button>
                  );
                })}
              </div>
            </Section>
          )}

          <Section n={isProvider ? 5 : 4} title="Social links" hint="These appear on your public profile so clients can see your past work.">
            <div className="grid gap-x-8 gap-y-7 sm:grid-cols-2">
              {SOCIAL_PLATFORMS.map((p) => {
                const value = profile.socialLinks[p.key] || '';
                const url = socialUrl(p, value);
                const invalid = value.trim() && !url;
                return (
                  <div key={p.key}>
                    <label htmlFor={`s-${p.key}`} className={label}>{p.label}</label>
                    <div className={`flex items-baseline border-b pb-3 transition-colors focus-within:border-green-400 ${invalid ? 'border-red-400/70' : 'border-white/15'}`}>
                      <input id={`s-${p.key}`} value={value} onChange={(e) => setSocial(p.key, e.target.value)}
                        placeholder={p.placeholder} autoCapitalize="none" autoCorrect="off" spellCheck={false}
                        className="min-w-0 flex-1 bg-transparent text-[15px] text-white outline-none placeholder:text-white/20" />
                      {url && (
                        <a href={url} target="_blank" rel="noopener noreferrer" aria-label={`Open ${p.label}`}
                          className="ml-2 text-white/30 transition hover:text-green-400">
                          <ArrowUpRight size={15} />
                        </a>
                      )}
                    </div>
                    <p className={`mt-2 text-[12px] ${invalid ? 'text-red-300' : 'text-white/25'}`}>
                      {invalid ? `That link isn’t a ${p.label} link.` : p.hint || '\u00a0'}
                    </p>
                  </div>
                );
              })}
            </div>
          </Section>
        </form>

        {/* ─── Side ─── */}
        <aside className="space-y-10 lg:sticky lg:top-8 lg:self-start">
          <div className="border border-white/10 bg-[#0b150e] p-6">
            <p className={label}>Your public profile</p>
            <p className="mono break-all text-[13px] text-green-400">{shareableLink.replace(/^https?:\/\//, '')}</p>
            <p className="mt-3 text-[13px] leading-relaxed text-white/45">
              Put it in your WhatsApp status and Instagram bio. Clients see your services and reviews.
            </p>
            <div className="mt-6 flex flex-wrap gap-2">
              <button onClick={shareLink}
                className="inline-flex items-center gap-2 rounded-full bg-green-400 px-4 py-2 text-[13px] font-medium text-[#080f0a] transition hover:bg-green-300">
                {copied ? <><Check size={14} /> Copied</> : <><Share2 size={14} /> Share link</>}
              </button>
              <Link href={publicPath}
                className="inline-flex items-center gap-1.5 rounded-full border border-white/15 px-4 py-2 text-[13px] text-white/75 transition hover:border-white/40 hover:text-white">
                View <ArrowUpRight size={13} />
              </Link>
            </div>
            {dirty && <p className="mt-4 text-[12px] text-amber-200/70">Save first to see your changes on it.</p>}
          </div>

          <div>
            <div className="mb-3 flex items-baseline justify-between">
              <p className="mono text-[10px] uppercase tracking-[0.16em] text-white/35">Profile strength</p>
              <p className={`mono text-[13px] ${pct === 100 ? 'text-green-400' : 'text-white/60'}`}>{pct}%</p>
            </div>
            <div className="h-px w-full bg-white/10">
              <div className="h-px bg-green-400 transition-all duration-500" style={{ width: `${pct}%` }} />
            </div>
            <ul className="mt-5 space-y-2.5">
              {checks.map(([text, ok]) => (
                <li key={text} className={`flex items-center gap-3 text-[13px] ${ok ? 'text-white/40 line-through decoration-white/20' : 'text-white/75'}`}>
                  <span className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full border ${ok ? 'border-green-400 bg-green-400' : 'border-white/20'}`}>
                    {ok && <Check size={10} strokeWidth={3} className="text-[#080f0a]" />}
                  </span>
                  {text}
                </li>
              ))}
            </ul>
            {isProvider && pct < 100 && (
              <p className="mt-5 text-[12px] leading-relaxed text-white/35">Complete profiles get hired more often.</p>
            )}
          </div>
        </aside>
      </div>

      {/* ─── Save bar (sits above the bottom nav) ─── */}
      <div className={`fixed inset-x-0 bottom-24 z-40 px-4 transition-all duration-300 ${dirty || saving ? 'translate-y-0 opacity-100' : 'pointer-events-none translate-y-4 opacity-0'}`}>
        <div className="mx-auto flex max-w-[480px] items-center justify-between gap-3 rounded-xl border border-white/10 bg-[#0b150e]/95 py-2.5 pl-5 pr-2.5 shadow-[0_12px_40px_rgba(0,0,0,0.55)] backdrop-blur">
          <p className="text-[13px] text-white/70">Unsaved changes</p>
          <div className="flex items-center gap-1">
            <button type="button" onClick={discard} disabled={saving}
              className="rounded-full px-3 py-2 text-[13px] text-white/50 transition hover:text-white disabled:opacity-40">
              Discard
            </button>
            <button type="button" onClick={handleSave} disabled={saving || blockedByUsername}
              className="inline-flex items-center gap-2 rounded-full bg-green-400 px-5 py-2 text-[13px] font-medium text-[#080f0a] transition hover:bg-green-300 disabled:bg-white/[0.08] disabled:text-white/35">
              {saving ? <><Loader2 size={14} className="animate-spin" /> Saving…</> : 'Save'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}