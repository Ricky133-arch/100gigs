'use client';
import { useEffect, useState } from 'react';
import { X, Download, Share, Plus } from 'lucide-react';

const DISMISSED_KEY = '100gigs_install_dismissed';
const DISMISS_DAYS  = 3;

export default function InstallBanner() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [show, setShow]                     = useState(false);
  const [isIOS, setIsIOS]                   = useState(false);
  const [isIOSReady, setIsIOSReady]         = useState(false);

  useEffect(() => {
    // Don't show if already installed (standalone mode)
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      window.navigator.standalone === true;
    if (isStandalone) return;

    // Don't show if dismissed recently
    const dismissed = localStorage.getItem(DISMISSED_KEY);
    if (dismissed) {
      const daysAgo = (Date.now() - parseInt(dismissed)) / (1000 * 60 * 60 * 24);
      if (daysAgo < DISMISS_DAYS) return;
    }

    // Detect iOS Safari
    const ua    = window.navigator.userAgent;
    const iosDevice = /iphone|ipad|ipod/i.test(ua);
    const safari    = /safari/i.test(ua) && !/chrome|crios|fxios/i.test(ua);

    if (iosDevice && safari) {
      setIsIOS(true);
      // Show iOS instructions after a short delay
      setTimeout(() => setIsIOSReady(true), 3000);
      return;
    }

    // Android / Desktop — listen for the install prompt
    const handler = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      // Show banner after 4 seconds on the page
      setTimeout(() => setShow(true), 4000);
    };

    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  // Show iOS banner after delay
  useEffect(() => {
    if (isIOSReady) setShow(true);
  }, [isIOSReady]);

  const dismiss = () => {
    setShow(false);
    localStorage.setItem(DISMISSED_KEY, Date.now().toString());
  };

  const install = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setShow(false);
      localStorage.setItem(DISMISSED_KEY, Date.now().toString());
    }
    setDeferredPrompt(null);
  };

  if (!show) return null;

  return (
    <>
      {/* Backdrop blur on iOS (since we show step instructions) */}
      {isIOS && (
        <div
          className="fixed inset-0 z-[80] bg-black/40 backdrop-blur-sm"
          onClick={dismiss}
        />
      )}

      {/* Banner */}
      <div
        className="fixed z-[85] left-0 right-0 mx-auto px-4"
        style={{
          bottom:   isIOS ? '0' : '96px', // above navbar on non-iOS
          maxWidth: '480px',
          animation: 'slideUp 0.4s cubic-bezier(.22,1,.36,1) forwards',
        }}
      >
        <style>{`
          @keyframes slideUp {
            from { opacity: 0; transform: translateY(24px); }
            to   { opacity: 1; transform: translateY(0); }
          }
        `}</style>

        <div
          className="w-full rounded-2xl overflow-hidden"
          style={{
            background:       'rgba(13, 20, 13, 0.96)',
            border:           '1px solid rgba(74,222,128,0.25)',
            boxShadow:        '0 -4px 40px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.05) inset',
            backdropFilter:   'blur(24px)',
            paddingBottom:    isIOS ? '32px' : '0',
          }}
        >
          {/* ── Android / Desktop banner ── */}
          {!isIOS && (
            <div className="flex items-center gap-4 p-4">
              {/* App icon */}
              <div
                className="w-14 h-14 rounded-2xl flex items-center justify-center shrink-0"
                style={{ background: 'linear-gradient(135deg,#16a34a,#15803d)', boxShadow: '0 4px 16px rgba(22,163,74,0.35)' }}
              >
                <span className="text-white font-black text-2xl">G</span>
              </div>

              {/* Text */}
              <div className="flex-1 min-w-0">
                <p className="text-white font-bold text-sm leading-tight">Add 100Gigs to Home Screen</p>
                <p className="text-white/40 text-xs mt-0.5 leading-relaxed">
                  Get instant notifications for new jobs & messages
                </p>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={dismiss}
                  className="w-8 h-8 rounded-full flex items-center justify-center text-white/30 hover:text-white/60 hover:bg-white/5 transition"
                >
                  <X size={16} />
                </button>
                <button
                  onClick={install}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold text-white transition active:scale-95"
                  style={{ background: 'linear-gradient(135deg,#16a34a,#15803d)', boxShadow: '0 4px 12px rgba(22,163,74,0.4)' }}
                >
                  <Download size={14} /> Install
                </button>
              </div>
            </div>
          )}

          {/* ── iOS instructions ── */}
          {isIOS && (
            <div className="p-5">
              {/* Header */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div
                    className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0"
                    style={{ background: 'linear-gradient(135deg,#16a34a,#15803d)' }}
                  >
                    <span className="text-white font-black text-xl">G</span>
                  </div>
                  <div>
                    <p className="text-white font-bold text-sm">Install 100Gigs</p>
                    <p className="text-white/40 text-xs">Works like a real app</p>
                  </div>
                </div>
                <button
                  onClick={dismiss}
                  className="w-8 h-8 rounded-full flex items-center justify-center text-white/30 hover:text-white/60 transition"
                >
                  <X size={16} />
                </button>
              </div>

              {/* Steps */}
              <div className="space-y-3">
                <Step number={1} icon={Share} color="#60a5fa">
                  Tap the <strong className="text-white">Share</strong> button
                  <span className="text-white/40"> at the bottom of your browser</span>
                </Step>
                <Step number={2} icon={Plus} color="#4ade80">
                  Scroll down and tap{' '}
                  <strong className="text-white">"Add to Home Screen"</strong>
                </Step>
                <Step number={3} icon={Download} color="#a78bfa">
                  Tap <strong className="text-white">Add</strong>
                  <span className="text-white/40"> — done! Open it from your home screen</span>
                </Step>
              </div>

              {/* Arrow pointing down to the share button */}
              <div className="flex justify-center mt-4">
                <div className="flex flex-col items-center gap-1 text-white/20">
                  <span className="text-xs">Share button is down here</span>
                  <span className="text-lg">↓</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

// ── Small step component for iOS instructions ────────────────────────────────
function Step({ number, icon: Icon, color, children }) {
  return (
    <div className="flex items-start gap-3">
      <div
        className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 mt-0.5"
        style={{ background: `${color}20`, border: `1px solid ${color}40` }}
      >
        <span className="text-xs font-bold" style={{ color }}>{number}</span>
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-white/50 text-sm leading-relaxed">{children}</p>
      </div>
      <Icon size={16} style={{ color }} className="shrink-0 mt-1" />
    </div>
  );
}