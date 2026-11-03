'use client';
/**
 * app/reset-password/page.js
 * User lands here from the email link, enters new password.
 * URL format: /reset-password?token=xxx&email=user@email.com
 */
import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowRight, ArrowLeft, Loader2, Eye, EyeOff, Check } from 'lucide-react';

const MIN_LENGTH = 6; // must match the server's rule
const REDIRECT_SECONDS = 5;

// Rough strength: length plus a mix of letters, numbers and symbols
function strengthOf(pw) {
  if (!pw) return null;
  if (pw.length < MIN_LENGTH) return { label: `At least ${MIN_LENGTH} characters`, level: 0 };
  let score = 0;
  if (pw.length >= 8) score++;
  if (pw.length >= 12) score++;
  if (/[a-z]/.test(pw) && /[A-Z]/.test(pw)) score++;
  if (/\d/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  if (score <= 1) return { label: 'Weak — easy to guess', level: 1 };
  if (score <= 3) return { label: 'Good', level: 2 };
  return { label: 'Strong', level: 3 };
}

const LEVEL_COLOR = ['bg-red-400', 'bg-amber-300', 'bg-green-400', 'bg-green-400'];
const LEVEL_TEXT = ['text-red-300', 'text-amber-200', 'text-green-400', 'text-green-400'];

// Words that suggest the link itself is the problem, not the password
const LINK_PROBLEM = /expired|invalid|used|token|not found/i;

function ResetPasswordContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const token = searchParams.get('token');
  const email = searchParams.get('email');

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');
  const [linkBroken, setLinkBroken] = useState(false);
  const [countdown, setCountdown] = useState(REDIRECT_SECONDS);

  // Countdown to login after success; cancelled if the user leaves first
  useEffect(() => {
    if (!done) return;
    if (countdown <= 0) { router.push('/login'); return; }
    const t = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [done, countdown]); // eslint-disable-line react-hooks/exhaustive-deps

  const strength = strengthOf(password);
  const mismatch = confirmPassword.length > 0 && password !== confirmPassword;
  const matches = confirmPassword.length > 0 && password === confirmPassword;
  const canSubmit = password.length >= MIN_LENGTH && matches && !loading;

  // ── Link is missing its token or email, or the server said it's no good ──
  if (!token || !email || linkBroken) {
    return (
      <div className="max-w-md">
        <p className="mono mb-6 text-[11px] uppercase tracking-[0.18em] text-red-400">Link not valid</p>
        <h1 className="serif text-5xl leading-[0.95] md:text-6xl">
          This link has<br /><em className="text-white/80">run out.</em>
        </h1>
        <p className="mt-6 text-[15px] leading-relaxed text-white/55">
          {linkBroken
            ? 'Reset links work once and only for an hour. This one has expired or was already used.'
            : 'This link is missing some information — it may have been cut off when you copied it.'}
          {' '}Ask for a fresh one and it’ll be in your inbox in a minute.
        </p>
        <Link href="/forgot-password"
          className="group mt-10 flex w-full items-center justify-center gap-2 rounded-full bg-green-400 py-3.5 text-[14px] font-medium text-[#080f0a] transition hover:bg-green-300 sm:w-max sm:px-8">
          Send me a new link <ArrowRight size={16} className="transition-transform group-hover:translate-x-0.5" />
        </Link>
      </div>
    );
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (password.length < MIN_LENGTH) { setError(`Use at least ${MIN_LENGTH} characters.`); return; }
    if (password !== confirmPassword) { setError('The two passwords don’t match.'); return; }

    setLoading(true);
    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, email, password }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const msg = data.error || '';
        if (LINK_PROBLEM.test(msg) || res.status === 410) { setLinkBroken(true); return; }
        setError(msg || 'Couldn’t reset your password. Please try again.');
        return;
      }
      setDone(true);
    } catch {
      setError('Couldn’t reach the server. Check your connection and try again.');
    } finally {
      setLoading(false);
    }
  };

  // ── Success ──
  if (done) {
    return (
      <div className="max-w-md">
        <p className="mono mb-6 text-[11px] uppercase tracking-[0.18em] text-green-400">Password changed</p>
        <h1 className="serif text-5xl leading-[0.95] md:text-6xl">
          You’re all<br /><em className="text-green-400">set.</em>
        </h1>
        <p className="mt-6 text-[15px] leading-relaxed text-white/55">
          Your new password is saved. Log in with <span className="text-white">{email}</span> and your new password.
        </p>
        <Link href="/login"
          className="group mt-10 flex w-full items-center justify-center gap-2 rounded-full bg-green-400 py-3.5 text-[14px] font-medium text-[#080f0a] transition hover:bg-green-300 sm:w-max sm:px-8">
          Log in now <ArrowRight size={16} className="transition-transform group-hover:translate-x-0.5" />
        </Link>
        <p className="mono mt-4 text-[11px] text-white/30">Taking you there in {countdown}s</p>
      </div>
    );
  }

  // ── Form ──
  return (
    <div className="max-w-md">
      <h1 className="serif text-5xl leading-[0.95] md:text-6xl">
        Choose a new<br /><em className="text-green-400">password.</em>
      </h1>
      <p className="mt-6 text-[15px] leading-relaxed text-white/55">
        For <span className="text-white">{email}</span>. Pick something you don’t use on other sites.
      </p>

      <form onSubmit={handleSubmit} className="mt-10 space-y-8">
        {/* Lets password managers save the new password against the right account */}
        <input type="email" name="username" autoComplete="username" value={email} readOnly hidden />

        <div>
          <label htmlFor="new-password" className="mono mb-3 block text-[11px] uppercase tracking-[0.18em] text-white/35">
            New password
          </label>
          <div className="flex items-center border-b border-white/20 pb-3 transition-colors focus-within:border-green-400">
            <input
              id="new-password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="new-password"
              autoFocus
              required
              minLength={MIN_LENGTH}
              value={password}
              onChange={(e) => { setPassword(e.target.value); setError(''); }}
              placeholder={`At least ${MIN_LENGTH} characters`}
              className="min-w-0 flex-1 bg-transparent text-lg text-white outline-none placeholder:text-white/20"
            />
            <button type="button" onClick={() => setShowPassword(!showPassword)}
              aria-label={showPassword ? 'Hide passwords' : 'Show passwords'}
              className="ml-3 text-white/30 transition hover:text-white">
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
          {strength && (
            <div className="mt-3">
              <div className="flex gap-1">
                {[0, 1, 2].map((i) => (
                  <span key={i} className={`h-px flex-1 transition-colors ${i < Math.max(1, strength.level) ? LEVEL_COLOR[strength.level] : 'bg-white/10'}`} />
                ))}
              </div>
              <p className={`mono mt-2 text-[11px] ${LEVEL_TEXT[strength.level]}`}>{strength.label}</p>
            </div>
          )}
        </div>

        <div>
          <label htmlFor="confirm-password" className="mono mb-3 block text-[11px] uppercase tracking-[0.18em] text-white/35">
            Type it again
          </label>
          <div className={`flex items-center border-b pb-3 transition-colors focus-within:border-green-400 ${mismatch ? 'border-red-400/70' : 'border-white/20'}`}>
            <input
              id="confirm-password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="new-password"
              required
              value={confirmPassword}
              onChange={(e) => { setConfirmPassword(e.target.value); setError(''); }}
              placeholder="Same password"
              className="min-w-0 flex-1 bg-transparent text-lg text-white outline-none placeholder:text-white/20"
            />
            {matches && <Check size={18} className="ml-3 text-green-400" aria-label="Passwords match" />}
          </div>
          {mismatch && <p className="mt-2 text-[12px] text-red-300">These don’t match yet.</p>}
        </div>

        {error && (
          <p role="alert" className="border-l-2 border-red-400 pl-3 text-[13px] leading-relaxed text-red-300">{error}</p>
        )}

        <button type="submit" disabled={!canSubmit}
          className="group flex w-full items-center justify-center gap-2 rounded-full bg-green-400 py-3.5 text-[14px] font-medium text-[#080f0a] transition hover:bg-green-300 active:scale-[0.99] disabled:bg-white/[0.06] disabled:text-white/30">
          {loading
            ? <><Loader2 size={16} className="animate-spin" /> Saving…</>
            : <>Save new password <ArrowRight size={16} className="transition-transform group-hover:translate-x-0.5" /></>}
        </button>
      </form>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="rp flex min-h-screen flex-col bg-[#080f0a] text-[#e9efe9] antialiased">
      <style>{`
        .rp { font-family: var(--font-sans), ui-sans-serif, system-ui, sans-serif; }
        .serif { font-family: var(--font-serif), Georgia, serif; font-weight: 400; letter-spacing: -0.01em; }
        .mono { font-family: var(--font-mono), ui-monospace, monospace; }
        @keyframes rise { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: none; } }
        .rise { animation: rise .7s cubic-bezier(.2,.7,.2,1) both; }
        @media (prefers-reduced-motion: reduce) { .rise { animation: none; } }
      `}</style>

      <header className="border-b border-white/[0.07]">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5 md:px-8">
          <Link href="/" className="text-[1.35rem] font-semibold tracking-tight">
            <span className="text-green-400">100</span>Gigs
          </Link>
          <Link href="/login" className="inline-flex items-center gap-1.5 text-[13px] text-white/50 transition hover:text-white">
            <ArrowLeft size={14} /> Log in
          </Link>
        </div>
      </header>

      <main className="flex flex-1 items-center">
        <div className="rise mx-auto w-full max-w-6xl px-5 py-16 md:px-8">
          <Suspense fallback={
            <p className="mono text-[11px] uppercase tracking-[0.18em] text-white/35">Loading…</p>
          }>
            <ResetPasswordContent />
          </Suspense>
        </div>
      </main>
    </div>
  );
}