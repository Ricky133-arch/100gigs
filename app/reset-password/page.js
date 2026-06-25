'use client';
/**
 * app/reset-password/page.js
 * User lands here from the email link, enters new password.
 * URL format: /reset-password?token=xxx&email=user@email.com
 */
import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Lock, ArrowRight, Loader2, Eye, EyeOff, CheckCircle, XCircle } from 'lucide-react';
import { toast } from 'sonner';

function ResetPasswordContent() {
  const searchParams = useSearchParams();
  const router       = useRouter();

  const token = searchParams.get('token');
  const email = searchParams.get('email');

  const [password,        setPassword]        = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword,    setShowPassword]    = useState(false);
  const [loading,         setLoading]         = useState(false);
  const [done,            setDone]            = useState(false);
  const [visible,         setVisible]         = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 50);
    return () => clearTimeout(t);
  }, []);

  // Invalid link — no token or email in URL
  if (!token || !email) {
    return (
      <div className="text-center py-8">
        <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-6"
          style={{ background: 'rgba(248,113,113,0.12)' }}>
          <XCircle size={32} className="text-red-400" />
        </div>
        <h2 className="text-xl font-bold text-white mb-3">Invalid reset link</h2>
        <p className="text-white/40 text-sm mb-6">
          This link is missing required information. Please request a new reset link.
        </p>
        <Link href="/forgot-password"
          className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-semibold text-white"
          style={{ background: 'linear-gradient(135deg,#16a34a,#15803d)' }}>
          Request New Link
        </Link>
      </div>
    );
  }

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (password.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }
    if (password !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    setLoading(true);
    try {
      const res  = await fetch('/api/auth/reset-password', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ token, email, password }),
      });
      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || 'Failed to reset password');
        return;
      }

      setDone(true);
      // Redirect to login after 3 seconds
      setTimeout(() => router.push('/login'), 3000);
    } catch {
      toast.error('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const passwordStrength = () => {
    if (password.length === 0) return null;
    if (password.length < 6)  return { label: 'Too short',  color: '#f87171', width: '25%' };
    if (password.length < 8)  return { label: 'Weak',       color: '#facc15', width: '50%' };
    if (password.length < 12) return { label: 'Good',       color: '#4ade80', width: '75%' };
    return                           { label: 'Strong',     color: '#4ade80', width: '100%' };
  };

  const strength = passwordStrength();

  return (
    <>
      {done ? (
        /* ── Success ──────────────────────────────────────────────── */
        <div className="text-center py-4">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-6"
            style={{ background: 'rgba(74,222,128,0.12)' }}>
            <CheckCircle size={32} className="text-green-400" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-3">Password reset!</h2>
          <p className="text-white/40 text-sm mb-2">
            Your password has been changed successfully.
          </p>
          <p className="text-white/25 text-xs mb-8">Redirecting you to sign in...</p>
          <Link
            href="/login"
            className="flex items-center justify-center gap-2 w-full py-3.5 rounded-xl text-sm font-semibold text-white"
            style={{ background: 'linear-gradient(135deg,#16a34a,#15803d)', boxShadow: '0 4px 24px rgba(22,163,74,0.35)' }}
          >
            Sign In Now
          </Link>
        </div>
      ) : (
        /* ── Form ─────────────────────────────────────────────────── */
        <>
          <div className={`mb-8 ${visible ? 'anim-fade-up hidden-init d1' : 'hidden-init'}`}>
            <h1 className="text-3xl font-bold text-white mb-1">New password</h1>
            <p className="text-white/40 text-sm">
              Choose a strong password for your 100Gigs account.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* New password */}
            <div className={`${visible ? 'anim-fade-up hidden-init d2' : 'hidden-init'}`}>
              <label className="block text-xs font-semibold uppercase tracking-widest text-white/40 mb-2">
                New Password
              </label>
              <div className="relative">
                <Lock size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/25" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Min. 6 characters"
                  required
                  className="w-full pl-11 pr-12 py-3.5 rounded-xl text-sm text-white placeholder-white/20 outline-none transition"
                  style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}
                  onFocus={e => e.target.style.borderColor = 'rgba(74,222,128,0.5)'}
                  onBlur={e  => e.target.style.borderColor = 'rgba(255,255,255,0.1)'}
                />
                <button type="button" onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-white/25 hover:text-white/60 transition">
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>

              {/* Strength bar */}
              {strength && (
                <div className="mt-2">
                  <div className="h-1 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.08)' }}>
                    <div className="h-full rounded-full transition-all duration-300"
                      style={{ width: strength.width, background: strength.color }} />
                  </div>
                  <p className="text-xs mt-1" style={{ color: strength.color }}>{strength.label}</p>
                </div>
              )}
            </div>

            {/* Confirm password */}
            <div className={`${visible ? 'anim-fade-up hidden-init d2' : 'hidden-init'}`}>
              <label className="block text-xs font-semibold uppercase tracking-widest text-white/40 mb-2">
                Confirm Password
              </label>
              <div className="relative">
                <Lock size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/25" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  placeholder="Repeat your password"
                  required
                  className="w-full pl-11 pr-4 py-3.5 rounded-xl text-sm text-white placeholder-white/20 outline-none transition"
                  style={{
                    background:  'rgba(255,255,255,0.06)',
                    border:      `1px solid ${
                      confirmPassword && password !== confirmPassword
                        ? 'rgba(248,113,113,0.5)'
                        : confirmPassword && password === confirmPassword
                        ? 'rgba(74,222,128,0.5)'
                        : 'rgba(255,255,255,0.1)'
                    }`,
                  }}
                  onFocus={e => e.target.style.borderColor = 'rgba(74,222,128,0.5)'}
                  onBlur={e  => {
                    e.target.style.borderColor =
                      confirmPassword && password !== confirmPassword
                        ? 'rgba(248,113,113,0.5)'
                        : 'rgba(255,255,255,0.1)';
                  }}
                />
              </div>
              {confirmPassword && password !== confirmPassword && (
                <p className="text-xs text-red-400 mt-1">Passwords do not match</p>
              )}
            </div>

            {/* Submit */}
            <div className={`pt-2 ${visible ? 'anim-fade-up hidden-init d3' : 'hidden-init'}`}>
              <button
                type="submit"
                disabled={loading || (confirmPassword && password !== confirmPassword)}
                className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl font-semibold text-sm text-white transition-all active:scale-[0.98] disabled:opacity-50 group"
                style={{
                  background: loading ? 'rgba(22,163,74,0.6)' : 'linear-gradient(135deg,#16a34a,#15803d)',
                  boxShadow:  loading ? 'none' : '0 4px 24px rgba(22,163,74,0.35)',
                }}
              >
                {loading
                  ? <><Loader2 size={17} className="animate-spin" /> Resetting...</>
                  : <>Reset Password <ArrowRight size={17} className="group-hover:translate-x-0.5 transition-transform" /></>
                }
              </button>
            </div>
          </form>
        </>
      )}
    </>
  );
}

export default function ResetPasswordPage() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 50);
    return () => clearTimeout(t);
  }, []);

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
        <div className="mb-8">
          <Link href="/" className="text-2xl font-bold tracking-tight">
            <span className="text-green-400">100</span><span className="text-white">Gigs</span>
          </Link>
        </div>

        <Suspense fallback={
          <div className="flex justify-center py-12">
            <div className="w-8 h-8 rounded-full border-2 border-green-500/20 border-t-green-500 animate-spin" />
          </div>
        }>
          <ResetPasswordContent />
        </Suspense>
      </div>
    </div>
  );
}