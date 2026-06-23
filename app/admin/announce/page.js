// app/admin/announce/page.js
//
// Admin composes and sends announcements to all / clients / providers.

'use client';
import { useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Megaphone, Loader2, Users, Briefcase, UserCog, Send, ShieldAlert } from 'lucide-react';

const glassCard = {
  background: 'rgba(255,255,255,0.04)',
  border: '1px solid rgba(255,255,255,0.08)',
  backdropFilter: 'blur(12px)',
  WebkitBackdropFilter: 'blur(12px)',
};

const inputStyle = {
  background: 'rgba(255,255,255,0.06)',
  border: '1px solid rgba(255,255,255,0.1)',
  color: 'white',
};

const onFocus = e => e.target.style.borderColor = 'rgba(74,222,128,0.5)';
const onBlur  = e => e.target.style.borderColor = 'rgba(255,255,255,0.1)';

const AUDIENCES = [
  { value: 'all', label: 'Everyone', desc: 'All clients and providers', icon: Users },
  { value: 'client', label: 'Clients only', desc: 'Only client accounts', icon: UserCog },
  { value: 'provider', label: 'Providers only', desc: 'Only service provider accounts', icon: Briefcase },
];

export default function AnnouncePage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [url, setUrl] = useState('');
  const [audience, setAudience] = useState('all');
  const [sending, setSending] = useState(false);

  if (status === 'loading') {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#080f0a]">
        <div className="w-10 h-10 rounded-full border-2 border-green-500/20 border-t-green-500 animate-spin" />
      </div>
    );
  }

  if (!session) { router.push('/login'); return null; }

  if (session.user.role !== 'admin') {
    return (
      <div className="min-h-screen bg-[#080f0a] flex items-center justify-center px-4">
        <div className="text-center p-10 rounded-3xl max-w-md w-full" style={glassCard}>
          <ShieldAlert size={36} className="mx-auto mb-4" style={{ color: 'rgba(255,255,255,0.2)' }} />
          <h2 className="text-xl font-bold text-white mb-2">Admins Only</h2>
          <p className="text-white/40 text-sm">You don't have permission to view this page.</p>
        </div>
      </div>
    );
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim() || !body.trim()) {
      toast.error('Title and message are required');
      return;
    }
    setSending(true);
    try {
      const res = await fetch('/api/admin/announce', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, body, audience, url }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || 'Failed to send announcement');
        return;
      }
      toast.success(data.message);
      setTitle('');
      setBody('');
      setUrl('');
      setAudience('all');
    } catch {
      toast.error('Something went wrong');
    } finally {
      setSending(false);
    }
  };

  const labelClass = "block text-xs font-semibold uppercase tracking-widest text-white/40 mb-2";

  return (
    <div className="min-h-screen bg-[#080f0a] relative overflow-x-hidden">
      <div className="relative max-w-xl mx-auto px-4 py-12">

        <div className="mb-8">
          <p className="text-xs font-semibold uppercase tracking-widest text-green-400/60 mb-2">Admin</p>
          <h1 className="text-3xl font-bold text-white mb-1 flex items-center gap-2.5">
            <Megaphone size={26} className="text-green-400" /> Send Announcement
          </h1>
          <p className="text-white/35 text-sm">Notify clients, providers, or everyone about updates and news.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">

          {/* Audience selector */}
          <div className="p-6 rounded-2xl" style={glassCard}>
            <label className={labelClass}>Send to</label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-2">
              {AUDIENCES.map(a => {
                const Icon = a.icon;
                const active = audience === a.value;
                return (
                  <button
                    key={a.value}
                    type="button"
                    onClick={() => setAudience(a.value)}
                    className="p-4 rounded-xl text-left transition-all"
                    style={{
                      background: active ? 'rgba(74,222,128,0.12)' : 'rgba(255,255,255,0.04)',
                      border: `1px solid ${active ? 'rgba(74,222,128,0.4)' : 'rgba(255,255,255,0.08)'}`,
                    }}
                  >
                    <Icon size={18} className={active ? 'text-green-400' : 'text-white/40'} />
                    <p className="text-sm font-semibold mt-2" style={{ color: active ? '#4ade80' : 'white' }}>{a.label}</p>
                    <p className="text-[11px] text-white/30 mt-0.5">{a.desc}</p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Content */}
          <div className="p-6 rounded-2xl space-y-4" style={glassCard}>
            <div>
              <label className={labelClass}>Title <span className="text-red-400">*</span></label>
              <input type="text" value={title} onChange={e => setTitle(e.target.value)}
                placeholder="e.g. New feature: Provider verification badges!"
                className="w-full px-4 py-3.5 rounded-xl text-sm outline-none transition placeholder-white/20"
                style={inputStyle} onFocus={onFocus} onBlur={onBlur} required />
            </div>
            <div>
              <label className={labelClass}>Message <span className="text-red-400">*</span></label>
              <textarea value={body} onChange={e => setBody(e.target.value)}
                rows={4} placeholder="Describe the update or announcement..."
                className="w-full px-4 py-3.5 rounded-xl text-sm outline-none resize-none transition placeholder-white/20"
                style={inputStyle} onFocus={onFocus} onBlur={onBlur} required />
            </div>
            <div>
              <label className={labelClass}>
                Link <span className="text-white/20 normal-case tracking-normal font-normal">(optional — where tapping the notification goes)</span>
              </label>
              <input type="text" value={url} onChange={e => setUrl(e.target.value)}
                placeholder="/dashboard"
                className="w-full px-4 py-3.5 rounded-xl text-sm outline-none transition placeholder-white/20"
                style={inputStyle} onFocus={onFocus} onBlur={onBlur} />
            </div>
          </div>

          <button type="submit" disabled={sending}
            className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl font-semibold text-white transition-all active:scale-[0.99] disabled:opacity-50"
            style={{
              background: sending ? 'rgba(22,163,74,0.6)' : 'linear-gradient(135deg,#16a34a,#15803d)',
              boxShadow: sending ? 'none' : '0 4px 24px rgba(22,163,74,0.35)',
            }}>
            {sending ? <><Loader2 size={18} className="animate-spin" /> Sending...</> : <><Send size={18} /> Send Announcement</>}
          </button>
        </form>
      </div>
    </div>
  );
}