'use client';
import { useState, useEffect } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { toast } from 'sonner';
import { Mail, Lock, ArrowRight, Loader2, Eye, EyeOff } from 'lucide-react';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [visible, setVisible] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 50);
    return () => clearTimeout(t);
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    const result = await signIn('credentials', { email, password, redirect: false });
    if (result?.error) {
      toast.error('Invalid email or password');
    } else {
      toast.success('Welcome back!');
      router.push('/dashboard');
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#080f0a] relative overflow-hidden px-4 py-12">
      <style>{`
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes drift {
          0%, 100% { transform: translate(0, 0) scale(1); }
          33% { transform: translate(30px, -20px) scale(1.05); }
          66% { transform: translate(-20px, 15px) scale(0.97); }
        }
        .anim-fade-up { animation: fadeUp 0.6s cubic-bezier(.22,1,.36,1) forwards; }
        .anim-drift { animation: drift 12s ease-in-out infinite; }
        .hidden-init { opacity: 0; }
        .d1 { animation-delay: 0.05s; }
        .d2 { animation-delay: 0.15s; }
        .d3 { animation-delay: 0.25s; }
        .d4 { animation-delay: 0.35s; }
        .d5 { animation-delay: 0.45s; }
      `}</style>

      {/* Background orbs */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-[-10%] left-[-5%] w-[500px] h-[500px] rounded-full anim-drift"
          style={{ background: 'radial-gradient(circle, rgba(22,163,74,0.2) 0%, transparent 70%)' }} />
        <div className="absolute bottom-[-15%] right-[-5%] w-[600px] h-[600px] rounded-full anim-drift"
          style={{ background: 'radial-gradient(circle, rgba(16,185,129,0.15) 0%, transparent 70%)', animationDelay: '4s' }} />
        {/* Grid */}
        <div className="absolute inset-0 opacity-[0.03]" style={{
          backgroundImage: 'linear-gradient(rgba(255,255,255,0.8) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.8) 1px, transparent 1px)',
          backgroundSize: '72px 72px',
        }} />
        {/* Noise */}
        <div className="absolute inset-0 opacity-[0.03]" style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
          backgroundSize: '200px 200px',
        }} />
      </div>

      {/* Card */}
      <div
        className={`relative w-full max-w-md rounded-3xl p-8 ${visible ? 'anim-fade-up hidden-init' : 'hidden-init'}`}
        style={{
          background: 'rgba(255,255,255,0.04)',
          backdropFilter: 'blur(32px) saturate(180%)',
          WebkitBackdropFilter: 'blur(32px) saturate(180%)',
          border: '1px solid rgba(255,255,255,0.1)',
          boxShadow: '0 24px 64px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.08)',
        }}
      >
        {/* Logo */}
        <div className={`mb-8 ${visible ? 'anim-fade-up hidden-init' : 'hidden-init'}`}>
          <Link href="/" className="text-2xl font-bold tracking-tight">
            <span className="text-green-400">100</span><span className="text-white">Gigs</span>
          </Link>
        </div>

        {/* Heading */}
        <div className={`mb-8 ${visible ? 'anim-fade-up hidden-init d1' : 'hidden-init'}`}>
          <h1 className="text-3xl font-bold text-white mb-1">Welcome back</h1>
          <p className="text-white/40 text-sm">Sign in to continue to your account</p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">

          {/* Email */}
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
                style={{
                  background: 'rgba(255,255,255,0.06)',
                  border: '1px solid rgba(255,255,255,0.1)',
                }}
                onFocus={e => e.target.style.borderColor = 'rgba(74,222,128,0.5)'}
                onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.1)'}
              />
            </div>
          </div>

          {/* Password */}
<div className={`${visible ? 'anim-fade-up hidden-init d3' : 'hidden-init'}`}>
  <div className="flex items-center justify-between mb-2">
    <label className="text-xs font-semibold uppercase tracking-widest text-white/40">
      Password
    </label>
    <Link href="/forgot-password" className="text-xs text-green-400/70 hover:text-green-400 transition">
      Forgot password?
    </Link>
  </div>
            <div className="relative">
              <Lock size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/25" />
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Enter your password"
                required
                className="w-full pl-11 pr-12 py-3.5 rounded-xl text-sm text-white placeholder-white/20 outline-none transition"
                style={{
                  background: 'rgba(255,255,255,0.06)',
                  border: '1px solid rgba(255,255,255,0.1)',
                }}
                onFocus={e => e.target.style.borderColor = 'rgba(74,222,128,0.5)'}
                onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.1)'}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-white/25 hover:text-white/60 transition"
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {/* Submit */}
          <div className={`pt-2 ${visible ? 'anim-fade-up hidden-init d4' : 'hidden-init'}`}>
            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl font-semibold text-sm text-white transition-all active:scale-[0.98] disabled:opacity-50 group"
              style={{
                background: loading
                  ? 'rgba(22,163,74,0.6)'
                  : 'linear-gradient(135deg, #16a34a 0%, #15803d 100%)',
                boxShadow: loading ? 'none' : '0 4px 24px rgba(22,163,74,0.35)',
              }}
            >
              {loading ? (
                <><Loader2 size={17} className="animate-spin" /> Signing in...</>
              ) : (
                <>Sign In <ArrowRight size={17} className="group-hover:translate-x-0.5 transition-transform" /></>
              )}
            </button>
          </div>
        </form>

        {/* Divider */}
        <div className={`flex items-center gap-3 my-6 ${visible ? 'anim-fade-up hidden-init d5' : 'hidden-init'}`}>
          <div className="flex-1 h-px" style={{ background: 'rgba(255,255,255,0.08)' }} />
          <span className="text-xs text-white/25 font-medium">New to 100Gigs?</span>
          <div className="flex-1 h-px" style={{ background: 'rgba(255,255,255,0.08)' }} />
        </div>

        {/* Sign up link */}
        <div className={`${visible ? 'anim-fade-up hidden-init d5' : 'hidden-init'}`}>
          <Link
            href="/signup"
            className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl text-sm font-semibold transition-all active:scale-[0.98]"
            style={{
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.1)',
              color: 'rgba(255,255,255,0.7)',
            }}
          >
            Create a free account
          </Link>
        </div>
      </div>
    </div>
  );
}