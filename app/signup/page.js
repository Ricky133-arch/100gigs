'use client';
import { useState, Suspense } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { toast } from 'sonner';
import { ArrowRight, ArrowLeft, Loader2, Eye, EyeOff, Check } from 'lucide-react';

const MIN_PASSWORD = 6; // keep in step with the reset-password page and the server

// Only allow redirects back into this site (same rule as the login page)
function safeCallback(url) {
  if (!url || typeof url !== 'string') return null;
  if (!url.startsWith('/') || url.startsWith('//') || url.startsWith('/\\')) return null;
  if (url.startsWith('/login') || url.startsWith('/signup')) return null;
  return url;
}

// Guess the role from where they came from, so "Sign up to apply" is one less tap
function roleFromContext(param, callbackUrl) {
  if (param === 'client' || param === 'provider') return param;
  if (callbackUrl?.startsWith('/jobs/')) return 'provider';
  if (callbackUrl?.startsWith('/post-job')) return 'client';
  return '';
}

const ROLES = [
  { value: 'client', title: 'I need something done', sub: 'Post jobs and hire local providers' },
  { value: 'provider', title: 'I offer a service', sub: 'Find jobs near you and get paid' },
];

function SignupForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = safeCallback(searchParams.get('callbackUrl'));

  const [formData, setFormData] = useState({
    name: '', email: '', password: '', phone: '',
    role: roleFromContext(searchParams.get('role'), callbackUrl),
  });
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [accountExists, setAccountExists] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const set = (name, value) => {
    setFormData((f) => ({ ...f, [name]: value }));
    setError('');
    setAccountExists(false);
  };

  const fieldErrors = {
    role: !formData.role && 'Choose one to continue.',
    name: formData.name.trim().length < 2 && 'Enter your name.',
    email: !/^\S+@\S+\.\S+$/.test(formData.email.trim()) && 'Enter a valid email address.',
    password: formData.password.length < MIN_PASSWORD && `At least ${MIN_PASSWORD} characters.`,
  };
  const show = (k) => submitted && fieldErrors[k];

  const loginHref = `/login${callbackUrl ? `?callbackUrl=${encodeURIComponent(callbackUrl)}` : ''}`;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitted(true);
    setError('');
    if (Object.values(fieldErrors).some(Boolean)) return;

    const payload = {
      ...formData,
      name: formData.name.trim(),
      email: formData.email.trim().toLowerCase(),
      phone: formData.phone.trim(),
    };

    setLoading(true);
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const msg = data.error || '';
        if (/exist|already|registered|taken/i.test(msg) || res.status === 409) setAccountExists(true);
        else setError(msg || 'Couldn’t create your account. Please try again.');
        setLoading(false);
        return;
      }

      // Log them straight in instead of making them type everything again
      const login = await signIn('credentials', { email: payload.email, password: payload.password, redirect: false });
      if (login?.error) {
        toast.success('Account created. Please log in.');
        router.push(loginHref);
        return;
      }
      toast.success('Welcome to 100Gigs');
      const next = callbackUrl || (payload.role === 'provider' ? '/profile' : '/post-job');
      router.replace(next);
      router.refresh();
    } catch {
      setError('Couldn’t reach the server. Check your connection and try again.');
      setLoading(false);
    }
  };

  const label = 'mono mb-3 block text-[11px] uppercase tracking-[0.18em] text-white/35';
  const line = (bad) => `border-b pb-3 transition-colors focus-within:border-green-400 ${bad ? 'border-red-400/70' : 'border-white/20'}`;
  const inputCls = 'w-full min-w-0 flex-1 bg-transparent text-lg text-white outline-none placeholder:text-white/20';
  const Err = ({ k }) => (show(k) ? <p className="mt-2 text-[12px] text-red-300">{fieldErrors[k]}</p> : null);

  return (
    <div className="max-w-md">
      <h1 className="serif text-5xl leading-[0.95] md:text-6xl">
        Join<br /><em className="text-green-400">100Gigs.</em>
      </h1>
      <p className="mt-6 text-[15px] leading-relaxed text-white/55">
        Free to join. Hire skilled people near you, or get hired for what you do best.
      </p>

      <form onSubmit={handleSubmit} noValidate className="mt-10 space-y-8">
        {/* Role */}
        <fieldset>
          <legend className={label}>What brings you here?</legend>
          <div className="space-y-2" role="radiogroup">
            {ROLES.map(({ value, title, sub }) => {
              const on = formData.role === value;
              return (
                <button key={value} type="button" role="radio" aria-checked={on} onClick={() => set('role', value)}
                  className={`flex w-full items-center gap-4 border px-5 py-4 text-left transition ${
                    on ? 'border-green-400 bg-green-400/[0.06]' : show('role') ? 'border-red-400/60' : 'border-white/10 hover:border-white/30'}`}>
                  <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border ${on ? 'border-green-400 bg-green-400' : 'border-white/25'}`}>
                    {on && <Check size={12} strokeWidth={3} className="text-[#080f0a]" />}
                  </span>
                  <span>
                    <span className={`block text-[15px] ${on ? 'text-white' : 'text-white/80'}`}>{title}</span>
                    <span className="mt-0.5 block text-[13px] text-white/40">{sub}</span>
                  </span>
                </button>
              );
            })}
          </div>
          <Err k="role" />
        </fieldset>

        <div>
          <label htmlFor="name" className={label}>Full name</label>
          <div className={line(show('name'))}>
            <input id="name" autoComplete="name" value={formData.name} onChange={(e) => set('name', e.target.value)}
              placeholder="As clients will see it" className={inputCls} maxLength={60} />
          </div>
          <Err k="name" />
        </div>

        <div>
          <label htmlFor="email" className={label}>Email address</label>
          <div className={line(show('email') || accountExists)}>
            <input id="email" type="email" autoComplete="email" inputMode="email" autoCapitalize="none"
              value={formData.email} onChange={(e) => set('email', e.target.value)}
              placeholder="you@example.com" className={inputCls} />
          </div>
          <Err k="email" />
          {accountExists && (
            <p className="mt-2 text-[12px] leading-relaxed text-red-300">
              There’s already an account with this email.{' '}
              <Link href={loginHref} className="text-white underline underline-offset-4 hover:text-green-400">Log in</Link>
              {' '}or{' '}
              <Link href="/forgot-password" className="text-white underline underline-offset-4 hover:text-green-400">reset your password</Link>.
            </p>
          )}
        </div>

        <div>
          <label htmlFor="phone" className={label}>
            Phone number <span className="normal-case tracking-normal text-white/25">· optional</span>
          </label>
          <div className={line(false)}>
            <input id="phone" type="tel" autoComplete="tel" inputMode="tel" value={formData.phone}
              onChange={(e) => set('phone', e.target.value)} placeholder="0801 234 5678" className={`${inputCls} mono`} />
          </div>
          <p className="mt-2 text-[12px] text-white/30">So the people you work with can call you.</p>
        </div>

        <div>
          <label htmlFor="password" className={label}>Password</label>
          <div className={`flex items-center ${line(show('password'))}`}>
            <input id="password" type={showPassword ? 'text' : 'password'} autoComplete="new-password"
              value={formData.password} onChange={(e) => set('password', e.target.value)}
              placeholder={`At least ${MIN_PASSWORD} characters`} className={inputCls} />
            <button type="button" onClick={() => setShowPassword(!showPassword)}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
              className="ml-3 text-white/30 transition hover:text-white">
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
          <Err k="password" />
        </div>

        {error && (
          <p role="alert" className="border-l-2 border-red-400 pl-3 text-[13px] leading-relaxed text-red-300">{error}</p>
        )}

        <button type="submit" disabled={loading}
          className="group flex w-full items-center justify-center gap-2 rounded-full bg-green-400 py-3.5 text-[14px] font-medium text-[#080f0a] transition hover:bg-green-300 active:scale-[0.99] disabled:bg-white/[0.06] disabled:text-white/30">
          {loading
            ? <><Loader2 size={16} className="animate-spin" /> Creating your account…</>
            : <>Create account <ArrowRight size={16} className="transition-transform group-hover:translate-x-0.5" /></>}
        </button>
      </form>

      <p className="mt-10 border-t border-white/10 pt-8 text-[14px] text-white/45">
        Already on 100Gigs?{' '}
        <Link href={loginHref}
          className="text-white underline decoration-white/20 underline-offset-4 transition hover:text-green-400 hover:decoration-green-400">
          Log in
        </Link>
      </p>
    </div>
  );
}

export default function Signup() {
  return (
    <div className="su flex min-h-screen flex-col bg-[#080f0a] text-[#e9efe9] antialiased">
      <style>{`
        .su { font-family: var(--font-sans), ui-sans-serif, system-ui, sans-serif; }
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
          <Link href="/" className="inline-flex items-center gap-1.5 text-[13px] text-white/50 transition hover:text-white">
            <ArrowLeft size={14} /> Home
          </Link>
        </div>
      </header>

      <main className="flex flex-1 items-center">
        <div className="rise mx-auto w-full max-w-6xl px-5 py-16 md:px-8">
          <Suspense fallback={null}>
            <SignupForm />
          </Suspense>
        </div>
      </main>
    </div>
  );
}