'use client';
/**
 * app/forgot-password/page.js
 * User enters their email and we send a reset link.
 */
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Mail, ArrowRight, Loader2, ArrowLeft, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';

export default function ForgotPassword() {
  const [email,   setEmail]   = useState('');
  const [loading, setLoading] = useState(false);
  const [sent,    setSent]    = useState(false);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 50);
    return () => clearTimeout(t);
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email.trim()) return;

    setLoading(true);
    try {
      const res  = await fetch('/api/auth/forgot-password', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ email }),
      });
      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || 'Something went wrong');
        return;
      }

      setSent(true);
    } catch {
      toast.error('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#080f0a] relative overflow-hidden px-4 py-12">
      <style>{`
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(20px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes drift {
          0%,100% { transform: translate(0,0) scale(1); }
          33%     { transform: translate(30px,-20px) scale(1.05); }
          66%     { transform: translate(-20px,15px) scale(0.97); }
        }
        .anim-fade-up { animation: fadeUp 0.6s cubic-bezier(.22,1,.36,1) forwards; }
        .anim-drift   { animation: drift 12s ease-in-out infinite; }
        .hidden-init  { opacity: 0; }
        .d1 { animation-delay: 0.05s; }
        .d2 { animation-delay: 0.15s; }
        .d3 { animation-delay: 0.25s; }
      `}</style>

      {/* Background orbs */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-[-10%] left-[-5%] w-[500px] h-[500px] rounded-full anim-drift"
          style={{ background: 'radial-gradient(circle, rgba(22,163,74,0.2) 0%, transparent 70%)' }} />
        <div className="absolute bottom-[-15%] right-[-5%] w-[600px] h-[600px] rounded-full anim-drift"
          style={{ background: 'radial-gradient(circle, rgba(16,185,129,0.15) 0%, transparent 70%)', animationDelay: '4s' }} />
        <div className="absolute inset-0 opacity-[0.03]" style={{
          backgroundImage: 'linear-gradient(rgba(255,255,255,0.8) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.8) 1px, transparent 1px)',
          backgroundSize: '72px 72px',
        }} />
      </div>

      {/* Card */}
      <div
        className={`relative w-full max-w-md rounded-3xl p-8 ${visible ? 'anim-fade-up hidden-init' : 'hidden-init'}`}
        style={{
          background:          'rgba(255,255,255,0.04)',
          backdropFilter:      'blur(32px) saturate(180%)',
          WebkitBackdropFilter:'blur(32px) saturate(180%)',
          border:              '1px solid rgba(255,255,255,0.1)',
          boxShadow:           '0 24px 64px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.08)',
        }}
      >
        {/* Logo */}
        <div className="mb-8">
          <Link href="/" className="text-2xl font-bold tracking-tight">
            <span className="text-green-400">100</span><span className="text-white">Gigs</span>
          </Link>
        </div>

        {sent ? (
          /* ── Success state ───────────────────────────────────────── */
          <div className="text-center py-4">
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-6"
              style={{ background: 'rgba(74,222,128,0.12)' }}>
              <CheckCircle size={32} className="text-green-400" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-3">Check your email</h2>
            <p className="text-white/40 text-sm leading-relaxed mb-2">
              If an account exists for <strong className="text-white/70">{email}</strong>, we've
              sent a password reset link.
            </p>
            <p className="text-white/30 text-xs mb-8">
              The link expires in 1 hour. Check your spam folder if you don't see it.
            </p>
            <Link
              href="/login"
              className="flex items-center justify-center gap-2 w-full py-3.5 rounded-xl text-sm font-semibold text-white transition"
              style={{ background: 'linear-gradient(135deg,#16a34a,#15803d)', boxShadow: '0 4px 24px rgba(22,163,74,0.35)' }}
            >
              Back to Sign In
            </Link>
          </div>
        ) : (
          /* ── Form ────────────────────────────────────────────────── */
          <>
            <div className={`mb-8 ${visible ? 'anim-fade-up hidden-init d1' : 'hidden-init'}`}>
              <h1 className="text-3xl font-bold text-white mb-1">Forgot password?</h1>
              <p className="text-white/40 text-sm">
                Enter your email and we'll send you a reset link.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className={`${visible ? 'anim-fade-up hidden-init d2' : 'hidden-init'}`}>
                <label className="block text-xs font-semibold uppercase tracking-widest text-white/40 mb-2">
                  Email address
                </label>
                <div className="relative">
                  <Mail size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/25" />
                  <input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    required
                    className="w-full pl-11 pr-4 py-3.5 rounded-xl text-sm text-white placeholder-white/20 outline-none transition"
                    style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}
                    onFocus={e => e.target.style.borderColor = 'rgba(74,222,128,0.5)'}
                    onBlur={e  => e.target.style.borderColor = 'rgba(255,255,255,0.1)'}
                  />
                </div>
              </div>

              <div className={`pt-2 ${visible ? 'anim-fade-up hidden-init d3' : 'hidden-init'}`}>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl font-semibold text-sm text-white transition-all active:scale-[0.98] disabled:opacity-50 group"
                  style={{
                    background:  loading ? 'rgba(22,163,74,0.6)' : 'linear-gradient(135deg,#16a34a,#15803d)',
                    boxShadow:   loading ? 'none' : '0 4px 24px rgba(22,163,74,0.35)',
                  }}
                >
                  {loading
                    ? <><Loader2 size={17} className="animate-spin" /> Sending...</>
                    : <>Send Reset Link <ArrowRight size={17} className="group-hover:translate-x-0.5 transition-transform" /></>
                  }
                </button>
              </div>
            </form>

            <div className="mt-6 text-center">
              <Link
                href="/login"
                className="inline-flex items-center gap-1.5 text-sm text-white/30 hover:text-white/60 transition"
              >
                <ArrowLeft size={14} /> Back to Sign In
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
}