'use client';
import { useState, useEffect } from 'react';
import { Bell, BellOff } from 'lucide-react';
import { toast } from 'sonner';

export default function NotificationBell() {
  const [subscribed, setSubscribed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [supported, setSupported] = useState(false);

  useEffect(() => {
    // Check if push notifications are supported
    if ('serviceWorker' in navigator && 'PushManager' in window) {
      setSupported(true);
      checkSubscription();
    }
  }, []);

  const checkSubscription = async () => {
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      setSubscribed(!!sub);
    } catch (error) {
      console.error(error);
    }
  };

  const subscribe = async () => {
    setLoading(true);
    try {
      // Register service worker
      const reg = await navigator.serviceWorker.register('/sw.js');
      await navigator.serviceWorker.ready;

      // Request permission
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        toast.error('Notification permission denied');
        setLoading(false);
        return;
      }

      // Subscribe to push
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(
          process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
        ),
      });

      // Save to server
      const res = await fetch('/api/notifications/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subscription: sub }),
      });

      if (res.ok) {
        setSubscribed(true);
        toast.success('Push notifications enabled!');
      } else {
        toast.error('Failed to enable notifications');
      }
    } catch (error) {
      console.error(error);
      toast.error('Failed to enable notifications');
    } finally {
      setLoading(false);
    }
  };

  const unsubscribe = async () => {
    setLoading(true);
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) await sub.unsubscribe();

      await fetch('/api/notifications/subscribe', { method: 'DELETE' });

      setSubscribed(false);
      toast.success('Push notifications disabled');
    } catch (error) {
      console.error(error);
      toast.error('Failed to disable notifications');
    } finally {
      setLoading(false);
    }
  };

  // Helper to convert VAPID key
  function urlBase64ToUint8Array(base64String) {
    const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding)
      .replace(/-/g, '+')
      .replace(/_/g, '/');
    const rawData = window.atob(base64);
    return Uint8Array.from([...rawData].map((char) => char.charCodeAt(0)));
  }

  if (!supported) return null;

  return (
    <button
      onClick={subscribed ? unsubscribe : subscribe}
      disabled={loading}
      title={subscribed ? 'Disable notifications' : 'Enable notifications'}
      className={`p-2 rounded-lg transition ${
        subscribed
          ? 'text-green-600 bg-green-50 dark:bg-green-900/20 hover:bg-green-100'
          : 'text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800'
      } disabled:opacity-50`}
    >
      {subscribed
        ? <Bell size={18} className="fill-green-600" />
        : <BellOff size={18} />
      }
    </button>
  );
}