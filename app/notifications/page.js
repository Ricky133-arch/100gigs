'use client';
import { useSession } from 'next-auth/react';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';

/* ── helpers ─────────────────────────────────────────────── */

// Short label + tone per notification type
const TYPE = {
  new_application:       { tag: 'Application',  tone: 'text-white/55' },
  application_accepted:  { tag: 'Hired',        tone: 'text-green-400' },
  application_rejected:  { tag: 'Not selected', tone: 'text-white/40' },
  new_message:           { tag: 'Message',      tone: 'text-white/55' },
  job_posted:            { tag: 'Job posted',   tone: 'text-green-400' },
  verification_approved: { tag: 'Verified',     tone: 'text-green-400' },
  verification_rejected: { tag: 'Verification', tone: 'text-red-400' },
  account_suspended:     { tag: 'Account',      tone: 'text-red-400' },
  account_reinstated:    { tag: 'Account',      tone: 'text-green-400' },
  system:                { tag: 'Update',       tone: 'text-amber-300' },
};

function timeAgo(date) {
  if (!date) return '';
  const s = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
  if (s < 60) return 'just now';
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d ago`;
  return new Date(date).toLocaleDateString('en-NG', { day: 'numeric', month: 'short' });
}

function groupLabel(date) {
  const d = new Date(date);
  const now = new Date();
  const yest = new Date(); yest.setDate(now.getDate() - 1);
  if (d.toDateString() === now.toDateString()) return 'Today';
  if (d.toDateString() === yest.toDateString()) return 'Yesterday';
  if (now - d < 7 * 864e5) return 'This week';
  return 'Earlier';
}

/* ── page ────────────────────────────────────────────────── */

export default function NotificationsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/login?callbackUrl=%2Fnotifications');
  }, [status]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (session) fetchNotifications();
  }, [session]); // eslint-disable-line react-hooks/exhaustive-deps

  const fetchNotifications = async () => {
    setFailed(false);
    setLoading(true);
    try {
      const res = await fetch('/api/notifications');
      if (!res.ok) throw new Error('Failed');
      const data = await res.json();
      setNotifications(data.notifications || []);
      // Mark all as read on the server; the unread dots stay visible
      // for this visit so people can still see what's new
      fetch('/api/notifications', { method: 'PATCH' }).catch(console.error);
    } catch (err) {
      console.error(err);
      setFailed(true);
    } finally {
      setLoading(false);
    }
  };

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  // Group into Today / Yesterday / This week / Earlier, keeping order
  const groups = [];
  for (const n of notifications) {
    const g = groupLabel(n.createdAt);
    const last = groups[groups.length - 1];
    if (last && last.label === g) last.items.push(n);
    else groups.push({ label: g, items: [n] });
  }

  return (
    <div className="nt min-h-screen bg-[#080f0a] text-[#e9efe9] antialiased">
      <style>{`
        .nt { font-family: var(--font-sans), ui-sans-serif, system-ui, sans-serif; }
        .serif { font-family: var(--font-serif), Georgia, serif; font-weight: 400; letter-spacing: -0.01em; }
        .mono { font-family: var(--font-mono), ui-monospace, monospace; }
      `}</style>

      <div className="mx-auto max-w-3xl px-5 pb-16 pt-10 md:px-8 md:pt-16">
        <header className="mb-12">
          <h1 className="serif text-5xl leading-none md:text-7xl">Notifications</h1>
          {!loading && !failed && (
            <p className="mono mt-4 text-[12px] text-white/40">
              {notifications.length === 0
                ? 'Nothing yet'
                : unreadCount > 0
                  ? <><span className="text-green-400">{unreadCount} new</span> · {notifications.length} total</>
                  : 'All caught up'}
            </p>
          )}
        </header>

        {status === 'loading' || loading ? (
          <ul className="border-t border-white/10">
            {[0, 1, 2, 3, 4].map((i) => (
              <li key={i} className="border-b border-white/[0.07] py-5">
                <div className="mb-2.5 h-3 w-24 animate-pulse bg-white/[0.06]" />
                <div className="mb-2 h-4 w-2/3 animate-pulse bg-white/[0.08]" />
                <div className="h-3 w-1/2 animate-pulse bg-white/[0.05]" />
              </li>
            ))}
          </ul>
        ) : failed ? (
          <div className="border-t border-white/10 py-14">
            <p className="text-[15px] text-white/60">Couldn’t load your notifications.</p>
            <button onClick={fetchNotifications}
              className="mt-5 border-b border-green-400 pb-0.5 text-[15px] text-white transition hover:text-green-400">
              Try again
            </button>
          </div>
        ) : notifications.length === 0 ? (
          <div className="border-t border-white/10 py-14">
            <p className="serif text-3xl leading-tight">Quiet for now.</p>
            <p className="mt-3 max-w-sm text-[14px] leading-relaxed text-white/45">
              When someone applies, messages you, or hires you, you’ll see it here.
            </p>
            <Link href="/browse" className="mt-6 inline-flex items-center gap-1.5 text-[14px] text-green-400 hover:underline underline-offset-4">
              Browse open jobs <ArrowUpRight size={14} />
            </Link>
          </div>
        ) : (
          <div className="space-y-12">
            {groups.map((group) => (
              <section key={group.label}>
                <p className="mono mb-3 text-[10px] uppercase tracking-[0.16em] text-white/35">{group.label}</p>
                <ul className="border-t border-white/10">
                  {group.items.map((n) => {
                    const t = TYPE[n.type] || TYPE.system;
                    const unread = !n.isRead;
                    const Row = n.url ? Link : 'div';
                    return (
                      <li key={n._id}>
                        <Row {...(n.url ? { href: n.url } : {})}
                          className={`group relative grid grid-cols-[1fr_auto] gap-6 border-b border-white/[0.07] py-5 pl-5 pr-1 ${
                            n.url ? 'transition-colors hover:bg-white/[0.02]' : ''
                          }`}>
                          {unread && <span className="absolute left-0 top-[1.6rem] h-1.5 w-1.5 rounded-full bg-green-400" aria-label="Unread" />}
                          <div className="min-w-0">
                            <p className="mono mb-1.5 text-[11px]">
                              <span className={t.tone}>{t.tag}</span>
                              <span className="text-white/30"> · {timeAgo(n.createdAt)}</span>
                            </p>
                            <p className={`text-[15px] leading-snug ${unread ? 'font-medium text-white' : 'text-white/80'} ${n.url ? 'transition-colors group-hover:text-green-400' : ''}`}>
                              {n.title}
                            </p>
                            {n.body && <p className="mt-1 text-[13px] leading-relaxed text-white/45">{n.body}</p>}
                          </div>
                          {n.url && (
                            <ArrowUpRight size={16} className="mt-1 text-white/20 transition group-hover:text-green-400" />
                          )}
                        </Row>
                      </li>
                    );
                  })}
                </ul>
              </section>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}