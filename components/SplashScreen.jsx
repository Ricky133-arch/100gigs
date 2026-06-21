'use client';
import { useEffect, useState } from 'react';

export default function SplashScreen({ onComplete }) {
  const [phase, setPhase] = useState('in'); // 'in' | 'hold' | 'out'

  useEffect(() => {
    // Fade in → hold → fade out
    const holdTimer = setTimeout(() => setPhase('out'), 1800);
    const doneTimer = setTimeout(() => onComplete(), 2400);
    return () => { clearTimeout(holdTimer); clearTimeout(doneTimer); };
  }, []);

  return (
    <div
      className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-[#080f0a]"
      style={{
        opacity: phase === 'out' ? 0 : 1,
        transition: 'opacity 0.6s ease',
      }}
    >
      <style>{`
        @keyframes pulse-ring {
          0% { transform: scale(0.8); opacity: 0.6; }
          100% { transform: scale(1.6); opacity: 0; }
        }
        @keyframes logo-in {
          from { opacity: 0; transform: scale(0.8); }
          to { opacity: 1; transform: scale(1); }
        }
        @keyframes drift {
          0%,100% { transform:translate(0,0) scale(1); }
          33% { transform:translate(30px,-20px) scale(1.05); }
          66% { transform:translate(-20px,15px) scale(0.97); }
        }
        .logo-anim { animation: logo-in 0.6s cubic-bezier(.22,1,.36,1) forwards; }
        .drift { animation: drift 10s ease-in-out infinite; }
        .pulse-ring { animation: pulse-ring 1.5s ease-out infinite; }
      `}</style>

      {/* Background orbs */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-10%] left-[-5%] w-[500px] h-[500px] rounded-full drift"
          style={{ background: 'radial-gradient(circle, rgba(22,163,74,0.18) 0%, transparent 70%)' }} />
        <div className="absolute bottom-[-10%] right-[-5%] w-[500px] h-[500px] rounded-full drift"
          style={{ background: 'radial-gradient(circle, rgba(16,185,129,0.14) 0%, transparent 70%)', animationDelay: '3s' }} />
        <div className="absolute inset-0 opacity-[0.03]" style={{
          backgroundImage: 'linear-gradient(rgba(255,255,255,0.8) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.8) 1px, transparent 1px)',
          backgroundSize: '72px 72px',
        }} />
      </div>

      {/* Logo */}
      <div className="relative logo-anim flex flex-col items-center">
        {/* Pulse rings */}
        <div className="absolute w-24 h-24 rounded-full pulse-ring"
          style={{ background: 'rgba(74,222,128,0.15)' }} />
        <div className="absolute w-24 h-24 rounded-full pulse-ring"
          style={{ background: 'rgba(74,222,128,0.1)', animationDelay: '0.5s' }} />

        {/* Icon circle */}
        <div className="w-24 h-24 rounded-3xl flex items-center justify-center mb-6 relative z-10"
          style={{
            background: 'linear-gradient(135deg, #16a34a, #15803d)',
            boxShadow: '0 0 60px rgba(22,163,74,0.4), 0 20px 40px rgba(0,0,0,0.3)',
          }}>
          <span className="text-white font-black text-3xl tracking-tight">G</span>
        </div>

        {/* Wordmark */}
        <p className="text-3xl font-black tracking-tight">
          <span className="text-green-400">100</span>
          <span className="text-white">Gigs</span>
        </p>
        <p className="text-white/30 text-sm mt-2 tracking-widest uppercase font-medium">
          Port Harcourt
        </p>
      </div>
    </div>
  );
}