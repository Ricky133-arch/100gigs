'use client';
import { useEffect, useRef, useState } from 'react';
import { ArrowRight, ArrowLeft } from 'lucide-react';

// Three slides, one idea each: how hiring works, how you choose, how you pay.
const SLIDES = [
  {
    kicker: 'Post a job',
    title: <>Skilled hands, <em className="text-green-400">right around the corner.</em></>,
    body: 'Say what you need, from a leaking pipe to bridal makeup. Providers near you apply with their rate, usually within a day.',
  },
  {
    kicker: 'Choose',
    title: <>Hire someone you can <em className="text-green-400">trust.</em></>,
    body: 'Check their reviews, past work and verified ID. Chat in the app and agree on the details before anyone shows up.',
  },
  {
    kicker: 'Pay',
    title: <>Pay when the job is <em className="text-green-400">done.</em></>,
    body: 'Pay through 100Gigs once you’re happy with the work. Providers get paid straight into their bank account.',
  },
];

const SWIPE_PX = 50;

export default function Onboarding({ onComplete }) {
  const [current, setCurrent] = useState(0);
  const [direction, setDirection] = useState(1); // 1 = forward, -1 = back
  const touchX = useRef(null);
  const doneRef = useRef(onComplete);
  doneRef.current = onComplete;

  const isLast = current === SLIDES.length - 1;
  const slide = SLIDES[current];

  const go = (i) => {
    if (i < 0 || i >= SLIDES.length || i === current) return;
    setDirection(i > current ? 1 : -1);
    setCurrent(i);
  };
  const next = () => (isLast ? doneRef.current?.() : go(current + 1));
  const prev = () => go(current - 1);

  // Arrow keys on desktop
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'ArrowRight') next();
      else if (e.key === 'ArrowLeft') prev();
      else if (e.key === 'Escape') doneRef.current?.();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  // Swipe on phones
  const onTouchStart = (e) => { touchX.current = e.touches[0].clientX; };
  const onTouchEnd = (e) => {
    if (touchX.current == null) return;
    const dx = e.changedTouches[0].clientX - touchX.current;
    touchX.current = null;
    if (dx < -SWIPE_PX) next();
    else if (dx > SWIPE_PX) prev();
  };

  return (
    <div
      className="ob fixed inset-0 z-[90] flex flex-col bg-[#080f0a] text-[#e9efe9] antialiased"
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
      role="dialog"
      aria-label="Welcome to 100Gigs"
    >
      <style>{`
        .ob { font-family: var(--font-sans), ui-sans-serif, system-ui, sans-serif; }
        .serif { font-family: var(--font-serif), Georgia, serif; font-weight: 400; letter-spacing: -0.01em; }
        .mono { font-family: var(--font-mono), ui-monospace, monospace; }
        @keyframes ob-fwd { from { opacity: 0; transform: translateX(24px); } to { opacity: 1; transform: none; } }
        @keyframes ob-back { from { opacity: 0; transform: translateX(-24px); } to { opacity: 1; transform: none; } }
        .ob-fwd { animation: ob-fwd .5s cubic-bezier(.2,.7,.2,1) both; }
        .ob-back { animation: ob-back .5s cubic-bezier(.2,.7,.2,1) both; }
        @media (prefers-reduced-motion: reduce) { .ob-fwd, .ob-back { animation: none; } }
      `}</style>

      {/* Top: wordmark + skip */}
      <div className="mx-auto flex w-full max-w-xl items-center justify-between px-6 pt-[max(1.5rem,env(safe-area-inset-top))]">
        <p className="text-[1.2rem] font-semibold tracking-tight">
          <span className="text-green-400">100</span>Gigs
        </p>
        {!isLast && (
          <button onClick={() => doneRef.current?.()} className="py-2 text-[13px] text-white/45 transition hover:text-white">
            Skip
          </button>
        )}
      </div>

      {/* Slide */}
      <div className="mx-auto flex w-full max-w-xl flex-1 flex-col justify-center px-6">
        <div key={current} className={direction > 0 ? 'ob-fwd' : 'ob-back'}>
          <p className="serif mb-10 text-[5.5rem] leading-none text-green-400/90">
            {String(current + 1).padStart(2, '0')}
          </p>
          <p className="mono mb-4 text-[11px] uppercase tracking-[0.18em] text-white/40">{slide.kicker}</p>
          <h2 className="serif text-[2.6rem] leading-[1.02] sm:text-5xl">{slide.title}</h2>
          <p className="mt-6 max-w-md text-[16px] leading-relaxed text-white/55">{slide.body}</p>
        </div>
      </div>

      {/* Bottom: progress + buttons */}
      <div className="mx-auto w-full max-w-xl px-6 pb-[max(2.5rem,env(safe-area-inset-bottom))]">
        <div className="mb-8 flex gap-1.5" role="tablist" aria-label="Slides">
          {SLIDES.map((s, i) => (
            <button
              key={i}
              role="tab"
              aria-selected={i === current}
              aria-label={`Slide ${i + 1}: ${s.kicker}`}
              onClick={() => go(i)}
              className="h-6 flex-1"
            >
              <span className={`block h-px w-full transition-colors duration-300 ${i <= current ? 'bg-green-400' : 'bg-white/15'}`} />
            </button>
          ))}
        </div>

        <div className="flex items-center gap-3">
          {current > 0 && (
            <button onClick={prev} aria-label="Back"
              className="flex h-[52px] w-[52px] shrink-0 items-center justify-center rounded-full border border-white/15 text-white/60 transition hover:border-white/40 hover:text-white">
              <ArrowLeft size={18} />
            </button>
          )}
          <button onClick={next}
            className="group flex h-[52px] flex-1 items-center justify-center gap-2 rounded-full bg-green-400 text-[15px] font-medium text-[#080f0a] transition hover:bg-green-300 active:scale-[0.99]">
            {isLast ? 'Get started' : 'Next'}
            <ArrowRight size={17} className="transition-transform group-hover:translate-x-0.5" />
          </button>
        </div>
      </div>
    </div>
  );
}