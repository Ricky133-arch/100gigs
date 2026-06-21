'use client';
import { useEffect } from 'react';
import { useSession } from 'next-auth/react';

export default function ServiceWorkerRegister() {
  const { data: session } = useSession();

  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker
        .register('/sw.js')
        .then(reg => console.log('SW registered:', reg.scope))
        .catch(err => console.error('SW registration failed:', err));
    }
  }, []);

  // ── Update app icon badge with unread count ────────────────────────────
  useEffect(() => {
    if (!session) return;

    const updateBadge = async () => {
      try {
        const res = await fetch('/api/chat');
        if (!res.ok) return;
        const { totalUnread } = await res.json();

        if ('setAppBadge' in navigator) {
          if (totalUnread > 0) {
            await navigator.setAppBadge(totalUnread);
          } else {
            await navigator.clearAppBadge();
          }
        }
      } catch (err) {
        console.error('Badge update failed:', err);
      }
    };

    updateBadge();
    const interval = setInterval(updateBadge, 15000);
    return () => clearInterval(interval);
  }, [session]);

  return null;
}