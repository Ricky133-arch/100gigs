'use client';
import { useState, Suspense } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { toast } from 'sonner';
import { ArrowRight, ArrowLeft, Loader2, Eye, EyeOff } from 'lucide-react';

// Only allow redirects back into this site (blocks "//evil.com" style links)
function safeCallback(url) {
  if (!url || typeof url !== 'string') return '/dashboard';
  if (!url.startsWith('/') || url.startsWith('//') || url.startsWith('/\\')) return '/dashboard';
  if (url.startsWith('/login') || url.startsWith('/signup')) return '/dashboard';
  return url;
}

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = safeCallback(searchParams.get('callbackUrl'));

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const result = await signIn('credentials', {
        email: email.trim().toLowerCase(),
        password,
        redirect: false,
      });
      if (result?.error) {
        // Our server sends clear messages (suspended, too many attempts, wrong details);
        // "CredentialsSignin" is next-auth's generic fallback
        setError(
          result.error && result.error !== 'CredentialsSignin'
            ? result.error
            : 'That email and password don’t match. Check for typos and try again.'
        );
        setLoading(false);
        return;
      }
      toast.success('Welcome back');
      router.replace(callbackUrl); // keep the spinner while the next page loads
      router.refresh();
    } catch {
      setError('Couldn’t reach the server. Check your connection and try again.');
      setLoading(false);
    }
  };

  const signupHref = callbackUrl !== '/dashboard'
    ? `/signup?callbackUrl=${encodeURIComponent(callbackUrl)}`
    : '/signup';

  return (
    <div className="max-w-md">
      <h1 className="serif text-5xl leading-[0.95] md:text-6xl">
        Welcome<br /><em className="text-green-400">back.</em>
      </h1>
      <p className="mt-6 text-[15px] leading-relaxed text-white/55">
        Log in to check your jobs, messages and applications.
      </p>

      <form onSubmit={handleSubmit} className="mt-10 space-y-8" noValidate={false}>
        <div>
          <label htmlFor="email" className="mono mb-3 block text-[11px] uppercase tracking-[0.18em] text-white/35">
            Email address
          </label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            autoFocus
            required
            value={email}
            onChange={(e) => { setEmail(e.target.value); setError(''); }}
            placeholder="you@example.com"
            className="w-full border-b border-white/20 bg-transparent pb-3 text-lg text-white outline-none transition-colors placeholder:text-white/20 focus:border-green-400"
          />
        </div>

        <div>
          <div className="mb-3 flex items-baseline justify-between">
            <label htmlFor="password" className="mono text-[11px] uppercase tracking-[0.18em] text-white/35">
              Password
            </label>
            <Link href="/forgot-password" className="text-[12px] text-white/45 transition hover:text-green-400">
              Forgot it?
            </Link>
          </div>
          <div className="flex items-center border-b border-white/20 pb-3 transition-colors focus-within:border-green-400">
            <input
              id="password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => { setPassword(e.target.value); setError(''); }}
              placeholder="Your password"
              className="min-w-0 flex-1 bg-transparent text-lg text-white outline-none placeholder:text-white/20"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
              className="ml-3 text-white/30 transition hover:text-white"
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
        </div>

        {error && (
          <p role="alert" className="border-l-2 border-red-400 pl-3 text-[13px] leading-relaxed text-red-300">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={loading || !email.trim() || !password}
          className="group flex w-full items-center justify-center gap-2 rounded-full bg-green-400 py-3.5 text-[14px] font-medium text-[#080f0a] transition hover:bg-green-300 active:scale-[0.99] disabled:bg-white/[0.06] disabled:text-white/30"
        >
          {loading ? (
            <><Loader2 size={16} className="animate-spin" /> Logging in…</>
          ) : (
            <>Log in <ArrowRight size={16} className="transition-transform group-hover:translate-x-0.5" /></>
          )}
        </button>
      </form>

      <p className="mt-10 border-t border-white/10 pt-8 text-[14px] text-white/45">
        New to 100Gigs?{' '}
        <Link href={signupHref}
          className="text-white underline decoration-white/20 underline-offset-4 transition hover:text-green-400 hover:decoration-green-400">
          Create a free account
        </Link>
      </p>
    </div>
  );
}

export default function Login() {
  return (
    <div className="lg flex min-h-screen flex-col bg-[#080f0a] text-[#e9efe9] antialiased">
      <style>{`
        .lg { font-family: var(--font-sans), ui-sans-serif, system-ui, sans-serif; }
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
            <LoginForm />
          </Suspense>
        </div>
      </main>
    </div>
  );
}