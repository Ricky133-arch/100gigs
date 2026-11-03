'use client';
import { useEffect, useRef, useState } from 'react';

const SEEN_KEY = '100gigs:splash-seen';
const HOLD_MS = 1100;   // how long the wordmark stays before fading
const FADE_MS = 400;

export default function SplashScreen({ onComplete }) {
  const [phase, setPhase] = useState('in'); // 'in' | 'out' | 'skip'
  const doneRef = useRef(onComplete);
  doneRef.current = onComplete; // always call the latest onComplete
  const finished = useRef(false);

  const finish = () => {
    if (finished.current) return;
    finished.current = true;
    doneRef.current?.();
  };

  const leave = () => {
    if (phase === 'out') return;
    setPhase('out');
    setTimeout(finish, FADE_MS);
  };

  useEffect(() => {
    // Only show once per visit: reopening a tab or navigating back shouldn't
    // make people sit through it again.
    let seen = false;
    try { seen = sessionStorage.getItem(SEEN_KEY) === '1'; sessionStorage.setItem(SEEN_KEY, '1'); } catch {}
    const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

    if (seen) { setPhase('skip'); finish(); return; }

    const hold = setTimeout(leave, reduced ? 500 : HOLD_MS);
    return () => clearTimeout(hold);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  if (phase === 'skip') return null;

  return (
    <div
      role="presentation"
      onClick={leave}
      className="fixed inset-0 z-[100] flex items-center justify-center bg-[#080f0a]"
      style={{ opacity: phase === 'out' ? 0 : 1, transition: `opacity ${FADE_MS}ms ease` }}
    >
      <style>{`
        @keyframes splash-rise { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: none; } }
        @keyframes splash-line { from { transform: scaleX(0); } to { transform: scaleX(1); } }
        .splash-word { animation: splash-rise .6s cubic-bezier(.2,.7,.2,1) both; }
        .splash-line { transform-origin: left; animation: splash-line ${HOLD_MS}ms cubic-bezier(.4,0,.2,1) .15s both; }
        @media (prefers-reduced-motion: reduce) {
          .splash-word, .splash-line { animation: none; }
        }
      `}</style>

      <div className="flex flex-col items-start">
        <p
          className="splash-word text-[2.6rem] font-semibold leading-none tracking-tight text-white"
          style={{ fontFamily: 'var(--font-sans), ui-sans-serif, system-ui, sans-serif' }}
        >
          <span className="text-green-400">100</span>Gigs
        </p>
        <div className="mt-4 h-px w-full overflow-hidden bg-white/10">
          <div className="splash-line h-full w-full bg-green-400" />
        </div>
      </div>
    </div>
  );
}