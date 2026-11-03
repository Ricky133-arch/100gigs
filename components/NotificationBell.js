'use client';
/**
 * components/NotificationBell.jsx
 * Phone alerts on/off switch. Used in the profile menu ("Phone alerts").
 */
import { useState, useEffect } from 'react';
import { Loader2, BellRing } from 'lucide-react';
import { toast } from 'sonner';

const VAPID = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = window.atob(base64);
  return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)));
}

async function getRegistration() {
  // ServiceWorkerRegister usually registers it already; register here only if it hasn't
  return (await navigator.serviceWorker.getRegistration()) || navigator.serviceWorker.register('/sw.js');
}

const saveOnServer = (sub) =>
  fetch('/api/notifications/subscribe', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ subscription: sub }),
  });

export default function NotificationBell({ className = '', asRow = false }) {
  const [state, setState] = useState('checking'); // checking | unsupported | blocked | off | on
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window) || !VAPID) {
      setState('unsupported');
      return;
    }
    if (Notification.permission === 'denied') { setState('blocked'); return; }
    (async () => {
      try {
        const reg = await navigator.serviceWorker.ready;
        const sub = await reg.pushManager.getSubscription();
        setState(sub ? 'on' : 'off');
        // Make sure the server still has this phone (it can lose it after a reinstall)
        if (sub) saveOnServer(sub).catch(() => {});
      } catch {
        setState('off');
      }
    })();
  }, []);

  const turnOn = async () => {
    setLoading(true);
    try {
      const permission = await Notification.requestPermission();
      if (permission === 'denied') {
        setState('blocked');
        toast.error('Alerts are blocked. Allow notifications for this site in your browser settings.');
        return;
      }
      if (permission !== 'granted') return; // dismissed the prompt — leave it off quietly

      const reg = await getRegistration();
      await navigator.serviceWorker.ready;
      const sub = (await reg.pushManager.getSubscription()) || await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID),
      });

      const res = await saveOnServer(sub);
      if (!res.ok) throw new Error('save');
      setState('on');
      toast.success('Phone alerts on');
    } catch (err) {
      console.error(err);
      toast.error('Couldn’t turn on alerts. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const turnOff = async () => {
    setLoading(true);
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      // Tell the server which phone to forget, so other devices keep their alerts
      await fetch('/api/notifications/subscribe', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ endpoint: sub?.endpoint }),
      }).catch(() => {});
      if (sub) await sub.unsubscribe();
      setState('off');
      toast.success('Phone alerts off');
    } catch (err) {
      console.error(err);
      toast.error('Couldn’t turn off alerts. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const onClick = (e) => {
    // Never let a tap here trigger a surrounding link or menu
    e.preventDefault();
    e.stopPropagation();
    if (loading) return;
    if (state === 'blocked') {
      toast('Alerts are blocked for 100Gigs', {
        description: 'Open your browser’s site settings, allow notifications, then come back.',
      });
      return;
    }
    if (state === 'on') turnOff(); else if (state === 'off') turnOn();
  };

  if (state === 'unsupported' || state === 'checking') return null;

  const on = state === 'on';
  const toggle = (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={state === 'blocked' ? 'Phone alerts blocked' : on ? 'Turn off phone alerts' : 'Turn on phone alerts'}
      onClick={onClick}
      disabled={loading}
      className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors disabled:opacity-60 ${
        on ? 'bg-green-400' : state === 'blocked' ? 'bg-red-400/30' : 'bg-white/15'
      } ${className}`}
    >
      <span className={`flex h-4 w-4 items-center justify-center rounded-full bg-[#080f0a] shadow transition-transform ${on ? 'translate-x-[18px]' : 'translate-x-0.5'}`}>
        {loading && <Loader2 size={10} className="animate-spin text-white/70" />}
      </span>
    </button>
  );

  if (!asRow) return toggle;

  // Full menu row: label + status + switch. Hidden entirely where alerts aren't possible.
  return (
    <div className="flex items-center gap-3 px-4 py-2.5 text-[13px] text-white/75">
      <BellRing size={15} strokeWidth={1.5} className="text-green-400" />
      <span className="flex-1">
        Phone alerts
        {state === 'blocked' && <span className="block text-[11px] text-red-300/80">Blocked in browser settings</span>}
      </span>
      {toggle}
    </div>
  );
}