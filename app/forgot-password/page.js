'use client';
/**
 * app/forgot-password/page.js
 * User enters their email and we send a reset link.
 */
import { useState } from 'react';
import Link from 'next/link';
import { ArrowRight, ArrowLeft, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const sendLink = async () => {
    const value = email.trim();
    if (!value) return;
    setLoading(true);
    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: value }),
      });
      // A server error page isn't JSON — don't let that crash the form
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(data.error || 'Something went wrong. Please try again.');
        return false;
      }
      setSent(true);
      return true;
    } catch {
      toast.error('Couldn’t reach the server. Check your connection and try again.');
      return false;
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    sendLink();
  };

  const resend = async () => {
    if (await sendLink()) toast.success('Sent again. Give it a minute.');
  };

  return (
    <div className="fp flex min-h-screen flex-col bg-[#080f0a] text-[#e9efe9] antialiased">
      <style>{`
        .fp { font-family: var(--font-sans), ui-sans-serif, system-ui, sans-serif; }
        .serif { font-family: var(--font-serif), Georgia, serif; font-weight: 400; letter-spacing: -0.01em; }
        .mono { font-family: var(--font-mono), ui-monospace, monospace; }
        @keyframes rise { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: none; } }
        .rise { animation: rise .7s cubic-bezier(.2,.7,.2,1) both; }
        @media (prefers-reduced-motion: reduce) { .rise { animation: none; } }
      `}</style>

      {/* Top bar */}
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
        <div className="mx-auto w-full max-w-6xl px-5 py-16 md:px-8">
          <div key={sent ? 'sent' : 'form'} className="rise max-w-md">
            {sent ? (
              <>
                <p className="mono mb-6 text-[11px] uppercase tracking-[0.18em] text-green-400">Link sent</p>
                <h1 className="serif text-5xl leading-[0.95] md:text-6xl">
                  Check your<br /><em className="text-green-400">inbox.</em>
                </h1>
                <p className="mt-6 text-[15px] leading-relaxed text-white/55">
                  If there’s an account for <span className="text-white">{email.trim()}</span>, a reset link is on its way.
                  It works for one hour.
                </p>
                <p className="mt-3 text-[13px] leading-relaxed text-white/35">
                  Nothing after a few minutes? Look in your spam or promotions folder.
                </p>

                <Link href="/login"
                  className="group mt-10 flex w-full items-center justify-center gap-2 rounded-full bg-green-400 py-3.5 text-[14px] font-medium text-[#080f0a] transition hover:bg-green-300 sm:w-max sm:px-8">
                  Back to log in <ArrowRight size={16} className="transition-transform group-hover:translate-x-0.5" />
                </Link>

                <div className="mt-8 flex flex-wrap gap-x-6 gap-y-3 text-[13px]">
                  <button onClick={resend} disabled={loading}
                    className="inline-flex items-center gap-2 border-b border-white/20 pb-0.5 text-white/70 transition hover:border-green-400 hover:text-green-400 disabled:opacity-50">
                    {loading && <Loader2 size={13} className="animate-spin" />}
                    Send it again
                  </button>
                  <button onClick={() => setSent(false)}
                    className="border-b border-white/20 pb-0.5 text-white/70 transition hover:border-green-400 hover:text-green-400">
                    Use a different email
                  </button>
                </div>
              </>
            ) : (
              <>
                <h1 className="serif text-5xl leading-[0.95] md:text-6xl">
                  Forgot your<br /><em className="text-green-400">password?</em>
                </h1>
                <p className="mt-6 text-[15px] leading-relaxed text-white/55">
                  It happens. Enter the email you signed up with and we’ll send you a link to set a new one.
                </p>

                <form onSubmit={handleSubmit} className="mt-10">
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
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="w-full border-b border-white/20 bg-transparent pb-3 text-lg text-white outline-none transition-colors placeholder:text-white/20 focus:border-green-400"
                  />

                  <button type="submit" disabled={loading || !email.trim()}
                    className="group mt-10 flex w-full items-center justify-center gap-2 rounded-full bg-green-400 py-3.5 text-[14px] font-medium text-[#080f0a] transition hover:bg-green-300 active:scale-[0.99] disabled:bg-white/[0.06] disabled:text-white/30">
                    {loading ? (
                      <><Loader2 size={16} className="animate-spin" /> Sending…</>
                    ) : (
                      <>Send reset link <ArrowRight size={16} className="transition-transform group-hover:translate-x-0.5" /></>
                    )}
                  </button>
                </form>

                <p className="mt-8 text-[13px] text-white/40">
                  Remembered it?{' '}
                  <Link href="/login" className="text-white underline decoration-white/20 underline-offset-4 transition hover:text-green-400 hover:decoration-green-400">
                    Log in
                  </Link>
                </p>
              </>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}