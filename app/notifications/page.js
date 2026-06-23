'use client';
import { useSession } from 'next-auth/react';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Bell, ShieldCheck, ShieldX, MessageCircle,
  Briefcase, CheckCircle, XCircle, AlertTriangle, Info,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

const glass = {
  background:          'rgba(255,255,255,0.04)',
  border:              '1px solid rgba(255,255,255,0.08)',
  backdropFilter:      'blur(12px)',
  WebkitBackdropFilter:'blur(12px)',
};

// Icon and color per notification type
const TYPE_CONFIG = {
  new_application:       { icon: Briefcase,     color: '#60a5fa', bg: 'rgba(96,165,250,0.12)'  },
  application_accepted:  { icon: CheckCircle,   color: '#4ade80', bg: 'rgba(74,222,128,0.12)'  },
  application_rejected:  { icon: XCircle,       color: '#f87171', bg: 'rgba(248,113,113,0.12)' },
  new_message:           { icon: MessageCircle, color: '#a78bfa', bg: 'rgba(167,139,250,0.12)' },
  job_posted:            { icon: Briefcase,     color: '#4ade80', bg: 'rgba(74,222,128,0.12)'  },
  verification_approved: { icon: ShieldCheck,   color: '#4ade80', bg: 'rgba(74,222,128,0.12)'  },
  verification_rejected: { icon: ShieldX,       color: '#f87171', bg: 'rgba(248,113,113,0.12)' },
  account_suspended:     { icon: AlertTriangle, color: '#f87171', bg: 'rgba(248,113,113,0.12)' },
  account_reinstated:    { icon: CheckCircle,   color: '#4ade80', bg: 'rgba(74,222,128,0.12)'  },
  system:                { icon: Info,          color: '#facc15', bg: 'rgba(250,204,21,0.12)'  },
};

export default function NotificationsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [notifications, setNotifications] = useState([]);
  const [loading,        setLoading]       = useState(true);

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/login');
  }, [status]);

  useEffect(() => {
    if (!session) return;
    fetchNotifications();
  }, [session]);

  const fetchNotifications = async () => {
    try {
      const res = await fetch('/api/notifications');
      if (!res.ok) return;
      const data = await res.json();
      setNotifications(data.notifications || []);

      // Mark all as read
      fetch('/api/notifications', { method: 'PATCH' }).catch(console.error);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (status === 'loading' || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#080f0a]">
        <div className="w-10 h-10 rounded-full border-2 border-green-500/20 border-t-green-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#080f0a] relative overflow-x-hidden">
      <style>{`
        @keyframes drift {
          0%,100% { transform:translate(0,0) scale(1); }
          33% { transform:translate(30px,-20px) scale(1.05); }
          66% { transform:translate(-20px,15px) scale(0.97); }
        }
        .drift { animation: drift 14s ease-in-out infinite; }
      `}</style>

      {/* Orbs */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-10%] left-[-5%] w-[500px] h-[500px] rounded-full drift"
          style={{ background: 'radial-gradient(circle, rgba(22,163,74,0.12) 0%, transparent 70%)' }} />
        <div className="absolute bottom-[-10%] right-[-5%] w-[500px] h-[500px] rounded-full drift"
          style={{ background: 'radial-gradient(circle, rgba(16,185,129,0.1) 0%, transparent 70%)', animationDelay: '5s' }} />
      </div>

      <div className="relative max-w-2xl mx-auto px-4 py-10">

        {/* Header */}
        <div className="mb-6">
          <p className="text-xs font-semibold uppercase tracking-widest text-green-400/60 mb-1">Activity</p>
          <h1 className="text-3xl font-bold text-white">Notifications</h1>
          <p className="text-white/30 text-sm mt-1">Your recent activity and updates</p>
        </div>

        {/* List */}
        {notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center" style={glass}>
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4"
              style={{ background: 'rgba(74,222,128,0.08)', border: '1px solid rgba(74,222,128,0.15)' }}>
              <Bell size={28} className="text-green-400/50" />
            </div>
            <p className="text-white/30 text-sm">No notifications yet</p>
            <p className="text-white/20 text-xs mt-1">
              You'll see job updates, messages, and more here
            </p>
          </div>
        ) : (
          <div className="rounded-2xl overflow-hidden" style={glass}>
            {notifications.map((notif, i) => {
              const config = TYPE_CONFIG[notif.type] || TYPE_CONFIG.system;
              const Icon   = config.icon;
              const isLast = i === notifications.length - 1;

              return (
                <Link
                  key={notif._id}
                  href={notif.url || '/'}
                  className="flex items-start gap-4 px-5 py-4 transition hover:bg-white/5"
                  style={{
                    borderBottom: isLast ? 'none' : '1px solid rgba(255,255,255,0.05)',
                    background: notif.isRead ? 'transparent' : 'rgba(74,222,128,0.03)',
                  }}
                >
                  {/* Icon */}
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 mt-0.5"
                    style={{ background: config.bg }}>
                    <Icon size={18} style={{ color: config.color }} />
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm font-semibold text-white leading-snug">{notif.title}</p>
                      {!notif.isRead && (
                        <span className="w-2 h-2 rounded-full bg-green-400 shrink-0 mt-1.5" />
                      )}
                    </div>
                    <p className="text-xs text-white/45 mt-0.5 leading-relaxed">{notif.body}</p>
                    <p className="text-[11px] text-white/20 mt-1.5">
                      {formatDistanceToNow(new Date(notif.createdAt), { addSuffix: true })}
                    </p>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}