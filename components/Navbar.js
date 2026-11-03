'use client';
import Link from 'next/link';
import { useSession, signOut } from 'next-auth/react';
import { Home, LayoutDashboard, PlusCircle, User, MessageCircle, LogOut, Settings, Bell, ShieldCheck, Megaphone, CreditCard } from 'lucide-react';
import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import NotificationBell from './NotificationBell';

const SURFACE = '#0b150e';

export default function Navbar() {
  const { data: session } = useSession();
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const pathname = usePathname();

  const [totalUnread, setTotalUnread] = useState(0);
  const [unreadNotifications, setUnreadNotifications] = useState(0);

  // ── Poll unread message count ──────────────────────────────────────────
  useEffect(() => {
    if (!session) return;
    fetchUnreadCount();
    const interval = setInterval(fetchUnreadCount, 10000);
    return () => clearInterval(interval);
  }, [session]);

  const fetchUnreadCount = async () => {
    try {
      const res = await fetch('/api/chat');
      if (!res.ok) return;
      const data = await res.json();
      setTotalUnread(data.totalUnread || 0);
    } catch (e) { console.error(e); }
  };

  // ── Poll unread notification count ────────────────────────────────────
  useEffect(() => {
    if (!session) return;
    fetchUnreadNotifications();
    const interval = setInterval(fetchUnreadNotifications, 15000);
    return () => clearInterval(interval);
  }, [session]);

  const fetchUnreadNotifications = async () => {
    try {
      const res = await fetch('/api/notifications');
      if (!res.ok) return;
      const data = await res.json();
      setUnreadNotifications(data.unreadCount || 0);
    } catch (e) { console.error(e); }
  };

  // ── Mark notifications as read when opening the menu ─────────────────
  const handleMenuOpen = async () => {
    setUserMenuOpen(!userMenuOpen);
    if (!userMenuOpen && unreadNotifications > 0) {
      fetch('/api/notifications', { method: 'PATCH' }).catch(console.error);
      setUnreadNotifications(0);
    }
  };

  useEffect(() => setUserMenuOpen(false), [pathname]);

  if (!session) return null;

  const isActive = (href) => pathname === href;
  const fmt = (n) => (n > 99 ? '99+' : n);

  const Badge = ({ count }) => (
    <span
      className="nav-mono absolute -top-1.5 -right-2 min-w-[16px] h-4 rounded-full flex items-center justify-center text-[9px] font-medium text-[#080f0a] px-1 bg-green-400"
      style={{ boxShadow: `0 0 0 2px ${SURFACE}` }}
    >
      {fmt(count)}
    </span>
  );

  const Label = ({ active, children }) => (
    <span className={`nav-mono text-[9px] uppercase tracking-[0.12em] ${active ? 'text-green-400' : 'text-white/40'}`}>
      {children}
    </span>
  );

  const Dot = ({ active }) => (
    <span className={`absolute bottom-1.5 h-1 w-1 rounded-full bg-green-400 transition-opacity ${active ? 'opacity-100' : 'opacity-0'}`} />
  );

  const TabItem = ({ href, icon: Icon, label, badge = 0 }) => {
    const active = isActive(href);
    return (
      <Link
        href={href}
        aria-current={active ? 'page' : undefined}
        className={`relative flex flex-1 flex-col items-center justify-center gap-1.5 pb-2 pt-1 transition-colors ${active ? 'text-green-400' : 'text-white/50 hover:text-white'}`}
      >
        <span className="relative">
          <Icon size={20} strokeWidth={active ? 2 : 1.5} />
          {badge > 0 && <Badge count={badge} />}
        </span>
        <Label active={active}>{label}</Label>
        <Dot active={active} />
      </Link>
    );
  };

  const MenuLink = ({ href, icon: Icon, children }) => (
    <Link href={href} className="flex items-center gap-3 px-4 py-2.5 text-[13px] text-white/75 transition hover:bg-white/[0.04] hover:text-white">
      <Icon size={15} strokeWidth={1.5} className="text-green-400" /> {children}
    </Link>
  );

  const Avatar = ({ size }) => (
    <div
      className="flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-green-400 font-semibold text-[#080f0a]"
      style={{ width: size, height: size, fontSize: size * 0.42 }}
    >
      {session.user.avatar ? (
        <img src={session.user.avatar} alt={session.user.name} className="h-full w-full object-cover" />
      ) : (
        session.user.name?.charAt(0).toUpperCase()
      )}
    </div>
  );

  const isClientOrAdmin = session.user.role === 'client' || session.user.role === 'admin';

  return (
    <>
      <style>{`.nav-mono { font-family: var(--font-mono), ui-monospace, monospace; }`}</style>

      <nav
        className="fixed bottom-4 left-1/2 z-50 flex h-[60px] -translate-x-1/2 items-stretch rounded-xl border border-white/10"
        style={{
          width: 'min(92vw, 480px)',
          background: `${SURFACE}f2`,
          backdropFilter: 'blur(10px)',
          WebkitBackdropFilter: 'blur(10px)',
          boxShadow: '0 12px 40px rgba(0,0,0,0.55)',
        }}
      >
        <TabItem href="/" icon={Home} label="Home" />
        <TabItem href="/dashboard" icon={LayoutDashboard} label="Dashboard" />
        {isClientOrAdmin && <TabItem href="/post-job" icon={PlusCircle} label="Post" />}
        <TabItem href="/chat" icon={MessageCircle} label="Messages" badge={totalUnread} />

        {/* Profile + menu */}
        <div className="relative flex flex-1 flex-col items-center justify-center">
          <button
            onClick={handleMenuOpen}
            aria-expanded={userMenuOpen}
            className={`relative flex w-full flex-col items-center justify-center gap-1.5 pb-2 pt-1 transition-colors ${userMenuOpen ? 'text-green-400' : 'text-white/50 hover:text-white'}`}
          >
            <span className="relative">
              <span className={`block rounded-full ${userMenuOpen ? 'ring-1 ring-green-400 ring-offset-2 ring-offset-[#0b150e]' : ''}`}>
                <Avatar size={20} />
              </span>
              {unreadNotifications > 0 && <Badge count={unreadNotifications} />}
            </span>
            <Label active={userMenuOpen}>Profile</Label>
            <Dot active={userMenuOpen} />
          </button>

          {userMenuOpen && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setUserMenuOpen(false)} />
              <div
                className="absolute bottom-[calc(100%+12px)] right-0 z-50 w-64 overflow-hidden rounded-xl border border-white/10"
                style={{ background: SURFACE, boxShadow: '0 16px 48px rgba(0,0,0,0.6)' }}
              >
                <div className="border-b border-white/10 px-4 py-4">
                  <div className="flex items-center gap-3">
                    <Avatar size={36} />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-white">{session.user.name}</p>
                      <p className="truncate text-xs text-white/40">{session.user.email}</p>
                    </div>
                  </div>
                  <p className="nav-mono mt-3 text-[10px] uppercase tracking-[0.16em] text-green-400">
                    {session.user.role}
                  </p>
                </div>

                <div className="py-1">
                  <MenuLink href="/profile" icon={User}>My profile</MenuLink>

                  {session.user.role === 'provider' && (
                    <MenuLink href="/verification" icon={ShieldCheck}>Get verified</MenuLink>
                  )}

                  {session.user.role === 'admin' && (
                    <>
                      <MenuLink href="/admin" icon={ShieldCheck}>Admin dashboard</MenuLink>
                      <MenuLink href="/admin/payments" icon={CreditCard}>Payments & payouts</MenuLink>
                      <MenuLink href="/admin/announce" icon={Megaphone}>Send announcement</MenuLink>
                    </>
                  )}

                  <Link href="/notifications" className="flex items-center gap-3 px-4 py-2.5 text-[13px] text-white/75 transition hover:bg-white/[0.04] hover:text-white">
                    <Bell size={15} strokeWidth={1.5} className="text-green-400" />
                    <span>Notifications</span>
                    <span className="ml-auto flex items-center gap-2">
                      {unreadNotifications > 0 && (
                        <span className="nav-mono rounded-full bg-green-400 px-2 py-0.5 text-[10px] text-[#080f0a]">
                          {fmt(unreadNotifications)}
                        </span>
                      )}
                      <NotificationBell />
                    </span>
                  </Link>

                  <div className="flex cursor-not-allowed items-center gap-3 px-4 py-2.5 text-[13px] text-white/35">
                    <Settings size={15} strokeWidth={1.5} />
                    <span>Settings</span>
                    <span className="nav-mono ml-auto text-[10px] uppercase tracking-[0.14em] text-white/30">Soon</span>
                  </div>
                </div>

                <div className="border-t border-white/10 py-1">
                  <button
                    onClick={() => signOut({ callbackUrl: '/' })}
                    className="flex w-full items-center gap-3 px-4 py-2.5 text-[13px] text-red-400/90 transition hover:bg-red-500/[0.06]"
                  >
                    <LogOut size={15} strokeWidth={1.5} /> Sign out
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </nav>

      {/* Bottom spacer so content isn't hidden behind the bar */}
      <div className="h-24 bg-[#080f0a]" />
    </>
  );
}