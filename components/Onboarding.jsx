'use client';
import { useState } from 'react';
import { ArrowRight, Briefcase, MessageCircle, Star, ShieldCheck, Camera, MapPin, Zap } from 'lucide-react';

const SLIDES = [
  {
    icon: Briefcase,
    color: '#4ade80',
    bg: 'rgba(74,222,128,0.1)',
    title: 'Find Local Gigs',
    subtitle: 'Browse hundreds of jobs posted by clients right here in Port Harcourt — from plumbing to photography.',
    tag: 'For Everyone',
  },
  {
    icon: Camera,
    color: '#a78bfa',
    bg: 'rgba(167,139,250,0.1)',
    title: 'Build Your Profile',
    subtitle: 'Upload a profile photo, add your skills and bio so clients can find and trust you instantly.',
    tag: 'Your Identity',
  },
  {
    icon: ShieldCheck,
    color: '#60a5fa',
    bg: 'rgba(96,165,250,0.1)',
    title: 'Get Verified',
    subtitle: 'Service providers can submit ID verification to earn a verified badge — boosting trust and getting hired faster.',
    tag: 'For Providers',
  },
  {
    icon: Star,
    color: '#fbbf24',
    bg: 'rgba(251,191,36,0.1)',
    title: 'Ratings & Reviews',
    subtitle: 'After every job, clients rate providers. Build your reputation over time and stand out from the crowd.',
    tag: 'Build Trust',
  },
  {
    icon: MessageCircle,
    color: '#34d399',
    bg: 'rgba(52,211,153,0.1)',
    title: 'Chat & Get it Done',
    subtitle: 'Message clients or providers directly, agree on a rate, and get notified in real time — no middlemen.',
    tag: 'Stay Connected',
  },
  {
    icon: MapPin,
    color: '#f87171',
    bg: 'rgba(248,113,113,0.1)',
    title: 'Hyper Local',
    subtitle: 'Every job and provider is in Port Harcourt. No wasted time on out-of-town results. Just your city.',
    tag: 'Port Harcourt Only',
  },
  {
    icon: Zap,
    color: '#fb923c',
    bg: 'rgba(251,146,60,0.1)',
    title: "You're Ready!",
    subtitle: 'Join the fastest growing gig community in PH. Post a job, apply, or explore — your next opportunity awaits.',
    tag: "Let's Go 🚀",
  },
];

export default function Onboarding({ onComplete }) {
  const [current, setCurrent] = useState(0);
  const [exiting, setExiting] = useState(false);
  const [direction, setDirection] = useState('next');

  const goTo = (index, dir = 'next') => {
    setDirection(dir);
    setExiting(true);
    setTimeout(() => {
      setCurrent(index);
      setExiting(false);
    }, 250);
  };

  const next = () => {
    if (current < SLIDES.length - 1) {
      goTo(current + 1, 'next');
    } else {
      onComplete();
    }
  };

  const prev = () => {
    if (current > 0) goTo(current - 1, 'prev');
  };

  const skip = () => onComplete();

  const slide = SLIDES[current];
  const Icon = slide.icon;
  const isLast = current === SLIDES.length - 1;
  const progress = ((current + 1) / SLIDES.length) * 100;

  return (
    <div className="fixed inset-0 z-[90] flex flex-col bg-[#080f0a]">
      <style>{`
        @keyframes slideUpIn {
          from { opacity: 0; transform: translateY(30px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes slideUpOut {
          from { opacity: 1; transform: translateY(0); }
          to { opacity: 0; transform: translateY(-20px); }
        }
        @keyframes slideDownIn {
          from { opacity: 0; transform: translateY(-30px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes drift {
          0%,100% { transform:translate(0,0) scale(1); }
          33% { transform:translate(30px,-20px) scale(1.05); }
          66% { transform:translate(-20px,15px) scale(0.97); }
        }
        @keyframes iconPop {
          0% { transform: scale(0.7); opacity: 0; }
          70% { transform: scale(1.1); }
          100% { transform: scale(1); opacity: 1; }
        }
        .slide-in-next { animation: slideUpIn 0.4s cubic-bezier(.22,1,.36,1) forwards; }
        .slide-in-prev { animation: slideDownIn 0.4s cubic-bezier(.22,1,.36,1) forwards; }
        .slide-out { animation: slideUpOut 0.25s ease forwards; }
        .icon-pop { animation: iconPop 0.5s cubic-bezier(.22,1,.36,1) forwards; }
        .drift { animation: drift 12s ease-in-out infinite; }
      `}</style>

      {/* Background */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-10%] left-[-5%] w-[500px] h-[500px] rounded-full drift"
          style={{ background: 'radial-gradient(circle, rgba(22,163,74,0.1) 0%, transparent 70%)' }} />
        <div className="absolute bottom-[-10%] right-[-5%] w-[400px] h-[400px] rounded-full drift"
          style={{
            background: `radial-gradient(circle, ${slide.bg.replace('0.1', '0.15')} 0%, transparent 70%)`,
            animationDelay: '3s',
            transition: 'background 0.6s ease',
          }} />
        <div className="absolute inset-0 opacity-[0.025]" style={{
          backgroundImage: 'linear-gradient(rgba(255,255,255,0.8) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.8) 1px, transparent 1px)',
          backgroundSize: '72px 72px',
        }} />
      </div>

      {/* Top bar — progress + skip */}
      <div className="relative z-10 px-6 pt-14 pb-4">
        {/* Progress bar */}
        <div className="w-full h-1 rounded-full mb-4" style={{ background: 'rgba(255,255,255,0.08)' }}>
          <div className="h-full rounded-full transition-all duration-500"
            style={{ width: `${progress}%`, background: slide.color }} />
        </div>
        <div className="flex items-center justify-between">
          <span className="text-xs text-white/25 font-medium">
            {current + 1} of {SLIDES.length}
          </span>
          {!isLast && (
            <button onClick={skip} className="text-white/30 text-sm font-medium hover:text-white/60 transition">
              Skip
            </button>
          )}
        </div>
      </div>

      {/* Slide content */}
      <div
        key={current}
        className={`relative z-10 flex-1 flex flex-col items-center justify-center px-8 text-center ${
          exiting ? 'slide-out' : direction === 'next' ? 'slide-in-next' : 'slide-in-prev'
        }`}
      >
        {/* Tag pill */}
        <span className="text-xs font-semibold px-3 py-1 rounded-full mb-8 tracking-wide uppercase"
          style={{ background: slide.bg, color: slide.color, border: `1px solid ${slide.color}30` }}>
          {slide.tag}
        </span>

        {/* Icon */}
        <div className="icon-pop w-32 h-32 rounded-3xl flex items-center justify-center mb-10"
          style={{
            background: slide.bg,
            border: `1px solid ${slide.color}25`,
            boxShadow: `0 0 80px ${slide.color}25, 0 20px 40px rgba(0,0,0,0.3)`,
          }}>
          <Icon size={60} style={{ color: slide.color }} strokeWidth={1.4} />
        </div>

        {/* Text */}
        <h2 className="text-3xl font-bold text-white mb-4 leading-tight">{slide.title}</h2>
        <p className="text-white/45 text-base leading-relaxed max-w-xs">{slide.subtitle}</p>
      </div>

      {/* Bottom */}
      <div className="relative z-10 px-6 pb-16 flex flex-col items-center gap-6">

        {/* Dot indicators */}
        <div className="flex items-center gap-2">
          {SLIDES.map((s, i) => (
            <button key={i} onClick={() => goTo(i, i > current ? 'next' : 'prev')}
              className="rounded-full transition-all duration-300"
              style={{
                width: i === current ? '28px' : '7px',
                height: '7px',
                background: i === current ? slide.color : 'rgba(255,255,255,0.12)',
              }} />
          ))}
        </div>

        {/* Buttons */}
        <div className="flex gap-3 w-full max-w-sm">
          {current > 0 && (
            <button onClick={prev}
              className="flex-1 py-4 rounded-2xl font-semibold text-white/50 transition-all active:scale-[0.98]"
              style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)' }}>
              Back
            </button>
          )}
          <button onClick={next}
            className="flex-1 flex items-center justify-center gap-2 py-4 rounded-2xl font-semibold text-white transition-all active:scale-[0.98] group"
            style={{
              background: `linear-gradient(135deg, #16a34a, #15803d)`,
              boxShadow: '0 4px 24px rgba(22,163,74,0.35)',
            }}>
            {isLast ? 'Get Started' : 'Next'}
            <ArrowRight size={18} className="group-hover:translate-x-0.5 transition-transform" />
          </button>
        </div>
      </div>
    </div>
  );
}