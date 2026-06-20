'use client';
import Link from 'next/link';
import { useSession, signOut } from 'next-auth/react';
import { Home, LayoutDashboard, PlusCircle, User, MessageCircle, LogOut, Settings, Bell, ShieldCheck } from 'lucide-react';
import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import NotificationBell from './NotificationBell';

export default function Navbar() {
  const { data: session } = useSession();
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const pathname = usePathname();

const [totalUnread, setTotalUnread] = useState(0);

useEffect(() => {
  if (!session) return;
  fetchUnreadCount();
  // Poll every 10 seconds
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

  useEffect(() => setUserMenuOpen(false), [pathname]);
if (!session) return null
  const isActive = (href) => pathname === href;

  const TabItem = ({ href, icon: Icon, label }) => (
    <Link
      href={href}
      className="flex flex-col items-center justify-center gap-1 flex-1 py-2 transition-all duration-150 relative"
      style={{ color: isActive(href) ? 'var(--nav-icon-active)' : 'var(--nav-icon)' }}
    >
      {isActive(href) && (
        <span className="absolute top-0 left-1/2 -translate-x-1/2 w-6 h-0.5 rounded-full" style={{ background: 'var(--nav-indicator)' }} />
      )}
      <Icon size={22} strokeWidth={isActive(href) ? 2.2 : 1.6} />
      <span className="text-[10px] font-medium tracking-wide" style={{ color: isActive(href) ? 'var(--nav-label-active)' : 'var(--nav-label)' }}>
        {label}
      </span>
    </Link>
  );

  return (
    <>
      <style>{`
        :root, .dark {
          --nav-icon: rgba(255,255,255,0.45);
          --nav-icon-active: #4ade80;
          --nav-label: rgba(255,255,255,0.4);
          --nav-label-active: #4ade80;
          --nav-text: rgba(255,255,255,0.75);
          --nav-indicator: #4ade80;
        }
      `}</style>
      <nav
        className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 flex items-stretch h-16 rounded-2xl overflow-visible"
        style={{
          width: 'min(92vw, 520px)',
          background: 'rgba(20, 20, 28, 0.45)',
          backdropFilter: 'blur(32px) saturate(200%) brightness(1.1)',
          WebkitBackdropFilter: 'blur(32px) saturate(200%) brightness(1.1)',
          border: '1px solid rgba(255,255,255,0.15)',
          boxShadow: '0 8px 32px rgba(0,0,0,0.4), 0 1px 0 rgba(255,255,255,0.1) inset, 0 -1px 0 rgba(0,0,0,0.2) inset',
        }}
      >
        {session && <TabItem href="/" icon={Home} label="Home" />}

        {session && <TabItem href="/dashboard" icon={LayoutDashboard} label="Dashboard" />}

       {(session?.user?.role === 'client' || session?.user?.role === 'admin') && (
  <TabItem href="/post-job" icon={PlusCircle} label="Post Job" />
)}

        {session && (
          <Link
            href="/chat"
            className="flex flex-col items-center justify-center gap-1 flex-1 py-2 transition-all duration-150 relative"
            style={{ color: isActive('/chat') ? 'var(--nav-icon-active)' : 'var(--nav-icon)' }}
          >
            {isActive('/chat') && (
              <span className="absolute top-0 left-1/2 -translate-x-1/2 w-6 h-0.5 rounded-full"
                style={{ background: 'var(--nav-indicator)' }} />
            )}
            <div className="relative">
              <MessageCircle size={22} strokeWidth={isActive('/chat') ? 2.2 : 1.6} />
              {totalUnread > 0 && (
                <span className="absolute -top-1.5 -right-1.5 min-w-[16px] h-4 rounded-full flex items-center justify-center text-[9px] font-bold text-white px-1"
                  style={{ background: '#16a34a', boxShadow: '0 0 0 2px rgba(20,20,28,0.8)' }}>
                  {totalUnread > 99 ? '99+' : totalUnread}
                </span>
              )}
            </div>
            <span className="text-[10px] font-medium tracking-wide"
              style={{ color: isActive('/chat') ? 'var(--nav-label-active)' : 'var(--nav-label)' }}>
              Messages
            </span>
          </Link>
        )}

        {/* Profile / Auth */}
        {session ? (
          <div className="flex-1 flex flex-col items-center justify-center relative">
            <button
              onClick={() => setUserMenuOpen(!userMenuOpen)}
              className="flex flex-col items-center justify-center gap-1 w-full py-2 transition-all"
              style={{ color: userMenuOpen ? 'var(--nav-icon-active)' : 'var(--nav-icon)' }}
            >
              <div className="w-6 h-6 rounded-full bg-green-500 flex items-center justify-center text-white text-[10px] font-bold ring-2 ring-white/20">
                {session.user.name?.charAt(0).toUpperCase()}
              </div>
              <span className="text-[10px] font-medium tracking-wide">Profile</span>
            </button>

            {userMenuOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setUserMenuOpen(false)} />
                <div
                  className="absolute bottom-[calc(100%+12px)] right-0 z-50 w-60 rounded-2xl overflow-hidden"
                  style={{
                    background: 'rgba(20, 20, 28, 0.55)',
                    backdropFilter: 'blur(32px) saturate(200%) brightness(1.1)',
                    WebkitBackdropFilter: 'blur(32px) saturate(200%) brightness(1.1)',
                    border: '1px solid rgba(255,255,255,0.15)',
                    boxShadow: '0 8px 32px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.1)',
                  }}
                >
                  <div className="px-4 py-3 border-b border-white/10">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-green-500 flex items-center justify-center text-white font-bold text-sm shrink-0">
                        {session.user.name?.charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold truncate" style={{color:"var(--nav-text)".replace("0.6","1")}}>{session.user.name}</p>
                        <p className="text-xs truncate" style={{color:"var(--nav-label)"}}>{session.user.email}</p>
                      </div>
                    </div>
                    <span className="text-xs bg-green-500/20 text-green-400 border border-green-500/30 px-2 py-0.5 rounded-full mt-2 inline-block capitalize">
                      {session.user.role}
                    </span>
                  </div>

                  <div className="py-1">
                    <Link href="/profile" className="flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-white/10 transition" style={{color:"var(--nav-text)"}}>
                      <User size={15} className="text-green-400" /> My Profile
                    </Link>

                    {/* ── Get Verified — providers only ── */}
                    {session.user.role === 'provider' && (
                      <Link href="/verification" className="flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-white/10 transition" style={{color:"var(--nav-text)"}}>
                        <ShieldCheck size={15} className="text-green-400" /> Get Verified
                      </Link>
                    )}

                    {/* ── Admin dashboard — admins only ── */}
                    {session.user.role === 'admin' && (
                      <Link href="/admin" className="flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-white/10 transition" style={{color:"var(--nav-text)"}}>
                        <ShieldCheck size={15} className="text-green-400" /> Admin Dashboard
                      </Link>
                    )}

                    <div className="flex items-center gap-3 px-4 py-2.5 text-sm opacity-50 cursor-not-allowed" style={{color:"var(--nav-text)"}}>
                      <Settings size={15} className="text-green-400" />
                      <span>Settings</span>
                      <span className="ml-auto text-[10px] font-semibold px-2 py-0.5 rounded-full" style={{background:'rgba(74,222,128,0.15)', color:'#4ade80', border:'1px solid rgba(74,222,128,0.25)'}}>Soon</span>
                    </div>
                    <div className="flex items-center gap-3 px-4 py-2.5 text-sm" style={{color:"var(--nav-text)"}}>
                      <Bell size={15} className="text-green-400" />
                      <span>Notifications</span>
                      <div className="ml-auto"><NotificationBell /></div>
                    </div>

                  </div>

                  <div className="border-t border-white/10 py-1">
                    <button
                      onClick={() => signOut({ callbackUrl: '/' })}
                      className="flex items-center gap-3 px-4 py-2.5 text-sm text-red-400 hover:bg-red-500/10 w-full transition"
                    >
                      <LogOut size={15} /> Sign Out
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        ) : null}
      </nav>

      {/* Bottom spacer */}
      <div className="h-24" />
    </>
  );
}