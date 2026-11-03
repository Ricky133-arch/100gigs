'use client';
import { useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { X, Share, Loader2 } from 'lucide-react';

const DISMISSED_KEY = '100gigs_install_dismissed';
const DISMISS_DAYS = 14;    // a "no" means leave them alone for two weeks
const SHOW_AFTER_MS = 8000; // let people look around before asking

// Pages where an install prompt would get in the way
const QUIET_PATHS = ['/login', '/signup', '/forgot-password', '/reset-password', '/payment', '/post-job', '/chat'];

const store = {
  get: (k) => { try { return localStorage.getItem(k); } catch { return null; } },
  set: (k, v) => { try { localStorage.setItem(k, v); } catch {} },
};

function recentlyDismissed() {
  const t = parseInt(store.get(DISMISSED_KEY) || '', 10);
  return Number.isFinite(t) && (Date.now() - t) / 864e5 < DISMISS_DAYS;
}

export default function InstallBanner() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [mode, setMode] = useState(null); // null | 'prompt' | 'ios'
  const [show, setShow] = useState(false);
  const [installing, setInstalling] = useState(false);
  const timer = useRef(null);

  useEffect(() => {
    const standalone =
      window.matchMedia?.('(display-mode: standalone)').matches || window.navigator.standalone === true;
    if (standalone || recentlyDismissed()) return;

    const ua = window.navigator.userAgent;
    // iPadOS pretends to be a Mac, so also check for a touch screen
    const iOS = /iphone|ipad|ipod/i.test(ua) || (/macintosh/i.test(ua) && navigator.maxTouchPoints > 1);
    const inAppBrowser = /FBAN|FBAV|Instagram|Line\/|Twitter|TikTok/i.test(ua);
    const safari = /safari/i.test(ua) && !/crios|fxios|edgios|opios/i.test(ua);

    if (iOS) {
      // Only Safari can add to the home screen on iPhone; in-app browsers can't
      if (!safari || inAppBrowser) return;
      setMode('ios');
      timer.current = setTimeout(() => setShow(true), SHOW_AFTER_MS);
      return () => clearTimeout(timer.current);
    }

    const onPrompt = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setMode('prompt');
      clearTimeout(timer.current);
      timer.current = setTimeout(() => setShow(true), SHOW_AFTER_MS);
    };
    const onInstalled = () => { setShow(false); setDeferredPrompt(null); store.set(DISMISSED_KEY, String(Date.now())); };

    window.addEventListener('beforeinstallprompt', onPrompt);
    window.addEventListener('appinstalled', onInstalled);
    return () => {
      clearTimeout(timer.current);
      window.removeEventListener('beforeinstallprompt', onPrompt);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  const dismiss = () => {
    setShow(false);
    store.set(DISMISSED_KEY, String(Date.now()));
  };

  const install = async () => {
    if (!deferredPrompt) return;
    setInstalling(true);
    try {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      setShow(false);
      if (outcome === 'accepted') store.set(DISMISSED_KEY, String(Date.now()));
      else dismiss();
    } catch {
      setShow(false);
    } finally {
      setDeferredPrompt(null);
      setInstalling(false);
    }
  };

  const quiet = QUIET_PATHS.some((p) => pathname?.startsWith(p));
  if (!show || !mode || quiet) return null;

  // Sit above the bottom nav when it's there (logged in); otherwise at the bottom
  const bottom = session ? 'calc(6rem + env(safe-area-inset-bottom))' : 'max(1rem, env(safe-area-inset-bottom))';

  return (
    <div
      role="dialog"
      aria-label="Install 100Gigs"
      className="ib fixed inset-x-0 z-[85] mx-auto px-4"
      style={{ bottom, maxWidth: 480 }}
    >
      <style>{`
        .ib { font-family: var(--font-sans), ui-sans-serif, system-ui, sans-serif; }
        .ib .mono { font-family: var(--font-mono), ui-monospace, monospace; }
        @keyframes ib-up { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: none; } }
        .ib-card { animation: ib-up .45s cubic-bezier(.2,.7,.2,1) both; }
        @media (prefers-reduced-motion: reduce) { .ib-card { animation: none; } }
      `}</style>

      <div className="ib-card relative rounded-xl border border-white/10 bg-[#0b150e]/95 text-[#e9efe9] shadow-[0_12px_40px_rgba(0,0,0,0.55)] backdrop-blur">
        <button onClick={dismiss} aria-label="Not now"
          className="absolute right-2.5 top-2.5 flex h-8 w-8 items-center justify-center rounded-full text-white/35 transition hover:bg-white/[0.06] hover:text-white">
          <X size={15} />
        </button>

        {mode === 'prompt' ? (
          <div className="flex items-center gap-4 py-4 pl-4 pr-12">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#080f0a] ring-1 ring-white/10">
              <span className="text-[13px] font-semibold tracking-tight"><span className="text-green-400">100</span>G</span>
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[14px] font-medium text-white">Put 100Gigs on your home screen</p>
              <p className="mt-0.5 text-[12px] leading-snug text-white/45">Opens faster, and you get alerts for new jobs and messages.</p>
            </div>
          </div>
        ) : (
          <div className="py-4 pl-4 pr-12">
            <p className="text-[14px] font-medium text-white">Put 100Gigs on your home screen</p>
            <p className="mt-0.5 text-[12px] leading-snug text-white/45">It opens like an app, and you get job and message alerts.</p>
            <ol className="mt-4 space-y-2.5 text-[13px] text-white/70">
              <li className="flex items-center gap-3">
                <span className="mono w-4 text-[11px] text-green-400">1</span>
                <span>Tap <Share size={14} className="mx-0.5 inline -translate-y-px text-white" aria-label="Share" /> <span className="text-white">Share</span> at the bottom of Safari</span>
              </li>
              <li className="flex items-center gap-3">
                <span className="mono w-4 text-[11px] text-green-400">2</span>
                <span>Choose <span className="text-white">Add to Home Screen</span></span>
              </li>
              <li className="flex items-center gap-3">
                <span className="mono w-4 text-[11px] text-green-400">3</span>
                <span>Tap <span className="text-white">Add</span></span>
              </li>
            </ol>
          </div>
        )}

        {mode === 'prompt' && (
          <div className="flex items-center justify-end gap-1 border-t border-white/10 px-2.5 py-2">
            <button onClick={dismiss} className="rounded-full px-3 py-2 text-[13px] text-white/50 transition hover:text-white">
              Not now
            </button>
            <button onClick={install} disabled={installing}
              className="inline-flex items-center gap-2 rounded-full bg-green-400 px-5 py-2 text-[13px] font-medium text-[#080f0a] transition hover:bg-green-300 disabled:opacity-60">
              {installing && <Loader2 size={13} className="animate-spin" />} Install
            </button>
          </div>
        )}
      </div>
    </div>
  );
}