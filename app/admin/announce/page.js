'use client';
// app/admin/announce/page.js
// Admin composes and sends announcements to all / clients / providers.

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { toast } from 'sonner';
import { Loader2, ArrowLeft, X } from 'lucide-react';

const TITLE_MAX = 60;   // phone notifications cut titles off around here
const BODY_MAX = 180;   // and show only a couple of lines of the message

const AUDIENCES = [
  { value: 'all', label: 'Everyone', statKey: 'totalUsers' },
  { value: 'client', label: 'Clients', statKey: 'totalClients' },
  { value: 'provider', label: 'Providers', statKey: 'totalProviders' },
];

// Where a tap on the notification can go. Internal pages only, so an
// announcement can never send people to an outside site.
const QUICK_LINKS = [
  ['', 'Nowhere'],
  ['/browse', 'Browse jobs'],
  ['/post-job', 'Post a job'],
  ['/profile', 'Their profile'],
  ['/verification', 'Get verified'],
];

const isInternalPath = (u) => !u || (/^\/[^/\\]/.test(u) || u === '/');

export default function AnnouncePage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const isAdmin = session?.user?.role === 'admin';

  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [url, setUrl] = useState('');
  const [audience, setAudience] = useState('all');
  const [stats, setStats] = useState(null);
  const [confirming, setConfirming] = useState(false);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(null); // { title, count }

  // Redirect in an effect, not during render
  useEffect(() => {
    if (status === 'unauthenticated') router.replace('/login?callbackUrl=%2Fadmin%2Fannounce');
    else if (status === 'authenticated' && !isAdmin) router.replace('/dashboard');
  }, [status, isAdmin]); // eslint-disable-line react-hooks/exhaustive-deps

  // Audience sizes, so the confirm step can say how many people this reaches
  useEffect(() => {
    if (!isAdmin) return;
    fetch('/api/admin/stats').then((r) => (r.ok ? r.json() : null)).then(setStats).catch(() => {});
  }, [isAdmin]);

  // Esc closes the confirm step
  useEffect(() => {
    if (!confirming) return;
    const onKey = (e) => e.key === 'Escape' && !sending && setConfirming(false);
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [confirming, sending]);

  const shell = (children) => (
    <div className="an min-h-screen bg-[#080f0a] text-[#e9efe9] antialiased">
      <style>{`
        .an { font-family: var(--font-sans), ui-sans-serif, system-ui, sans-serif; }
        .serif { font-family: var(--font-serif), Georgia, serif; font-weight: 400; letter-spacing: -0.01em; }
        .mono { font-family: var(--font-mono), ui-monospace, monospace; }
      `}</style>
      {children}
    </div>
  );

  if (status === 'loading' || !isAdmin) {
    return shell(
      <div className="flex min-h-screen items-center justify-center">
        <p className="mono text-[11px] uppercase tracking-[0.18em] text-white/35">Loading…</p>
      </div>
    );
  }

  const aud = AUDIENCES.find((a) => a.value === audience);
  const count = stats?.[aud.statKey];
  const countText = typeof count === 'number' ? `${count.toLocaleString()} ${count === 1 ? 'person' : 'people'}` : aud.label.toLowerCase();
  const urlOk = isInternalPath(url.trim());
  const ready = title.trim() && body.trim() && urlOk;

  const reset = () => { setTitle(''); setBody(''); setUrl(''); setAudience('all'); };

  const send = async () => {
    setSending(true);
    try {
      const res = await fetch('/api/admin/announce', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: title.trim(), body: body.trim(), audience, url: url.trim() }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { toast.error(data.error || 'Couldn’t send the announcement'); return; }
      toast.success(data.message || 'Announcement sent');
      setSent({ title: title.trim(), to: countText });
      setConfirming(false);
      reset();
    } catch {
      toast.error('Something went wrong. Nothing was sent.');
    } finally {
      setSending(false);
    }
  };

  const label = 'mono mb-3 block text-[10px] uppercase tracking-[0.16em] text-white/35';
  const input = 'w-full border-b border-white/15 bg-transparent pb-3 text-[16px] text-white outline-none transition-colors placeholder:text-white/20 focus:border-green-400';
  const counter = (n, max) => (
    <span className={`mono text-[10px] ${n > max ? 'text-amber-300' : 'text-white/25'}`}>{n}/{max}</span>
  );

  return shell(
    <div className="mx-auto max-w-5xl px-5 pb-32 pt-10 md:px-8 md:pt-16">
      <Link href="/admin" className="mb-10 inline-flex items-center gap-1.5 text-[13px] text-white/45 transition hover:text-white">
        <ArrowLeft size={14} /> Admin
      </Link>

      <header className="mb-14 max-w-2xl">
        <h1 className="serif text-5xl leading-[0.95] md:text-7xl">Send an <em className="text-green-400">announcement.</em></h1>
        <p className="mt-6 text-[15px] leading-relaxed text-white/55">
          Goes out as a notification in the app and, for people who allowed it, to their phone. Once sent, it can’t be taken back.
        </p>
      </header>

      {sent && (
        <div className="mb-12 flex items-start justify-between gap-4 border-l-2 border-green-400 pl-5">
          <div>
            <p className="mono text-[10px] uppercase tracking-[0.16em] text-green-400">Sent</p>
            <p className="mt-1 text-[15px] text-white">“{sent.title}” went to {sent.to}.</p>
          </div>
          <button onClick={() => setSent(null)} aria-label="Dismiss" className="text-white/35 hover:text-white"><X size={16} /></button>
        </div>
      )}

      <div className="grid gap-16 lg:grid-cols-[1fr_340px]">
        <form onSubmit={(e) => { e.preventDefault(); if (ready) setConfirming(true); }} className="min-w-0 space-y-10">
          <fieldset>
            <legend className={label}>Send to</legend>
            <div className="inline-flex rounded-full border border-white/15 p-1 text-[13px]" role="radiogroup">
              {AUDIENCES.map((a) => {
                const on = audience === a.value;
                const n = stats?.[a.statKey];
                return (
                  <button key={a.value} type="button" role="radio" aria-checked={on} onClick={() => setAudience(a.value)}
                    className={`rounded-full px-4 py-2 transition ${on ? 'bg-green-400 text-[#080f0a]' : 'text-white/60 hover:text-white'}`}>
                    {a.label}{typeof n === 'number' && <span className={`mono ml-1.5 text-[11px] ${on ? 'text-[#080f0a]/60' : 'text-white/30'}`}>{n}</span>}
                  </button>
                );
              })}
            </div>
          </fieldset>

          <div>
            <div className="mb-3 flex items-baseline justify-between">
              <label htmlFor="title" className="mono text-[10px] uppercase tracking-[0.16em] text-white/35">Title</label>
              {counter(title.length, TITLE_MAX)}
            </div>
            <input id="title" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={120}
              placeholder="e.g. Verified badges are here" className={input} />
            {title.length > TITLE_MAX && <p className="mt-2 text-[12px] text-amber-200/80">Phones may cut this off. Shorter titles read better.</p>}
          </div>

          <div>
            <div className="mb-3 flex items-baseline justify-between">
              <label htmlFor="body" className="mono text-[10px] uppercase tracking-[0.16em] text-white/35">Message</label>
              {counter(body.length, BODY_MAX)}
            </div>
            <textarea id="body" value={body} onChange={(e) => setBody(e.target.value)} rows={4} maxLength={500}
              placeholder="One or two short sentences. Say what changed and what to do."
              className={`${input} resize-none leading-relaxed`} />
          </div>

          <div>
            <p className={label}>When they tap it, open</p>
            <div className="mb-4 flex flex-wrap gap-2">
              {QUICK_LINKS.map(([v, l]) => (
                <button key={l} type="button" onClick={() => setUrl(v)}
                  className={`rounded-full border px-3.5 py-1.5 text-[12px] transition ${url === v ? 'border-green-400 bg-green-400 text-[#080f0a]' : 'border-white/15 text-white/60 hover:border-white/40 hover:text-white'}`}>
                  {l}
                </button>
              ))}
            </div>
            <input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="or type a page, e.g. /jobs/abc123"
              aria-label="Link path" className={`${input} mono text-[14px] ${urlOk ? '' : 'border-red-400/70'}`} />
            {!urlOk && <p className="mt-2 text-[12px] text-red-300">Use a page on 100Gigs, starting with “/”.</p>}
          </div>

          <button type="submit" disabled={!ready}
            className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-green-400 px-8 py-3.5 text-[14px] font-medium text-[#080f0a] transition hover:bg-green-300 disabled:bg-white/[0.06] disabled:text-white/30 sm:w-max">
            Review and send
          </button>
        </form>

        {/* Preview */}
        <aside className="lg:sticky lg:top-8 lg:self-start">
          <p className={label}>On their phone</p>
          <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-[11px] font-medium text-white/60"><span className="text-green-400">100</span>Gigs</span>
              <span className="text-[11px] text-white/30">now</span>
            </div>
            <p className={`line-clamp-1 text-[14px] font-semibold ${title.trim() ? 'text-white' : 'text-white/25'}`}>{title.trim() || 'Your title'}</p>
            <p className={`mt-0.5 line-clamp-2 text-[13px] leading-snug ${body.trim() ? 'text-white/70' : 'text-white/20'}`}>{body.trim() || 'Your message'}</p>
          </div>

          <p className={`${label} mt-10`}>In the app</p>
          <div className="border-y border-white/10 py-4 pl-5 relative">
            <span className="absolute left-0 top-[1.4rem] h-1.5 w-1.5 rounded-full bg-green-400" />
            <p className="mono mb-1.5 text-[11px]"><span className="text-amber-300">Update</span><span className="text-white/30"> · just now</span></p>
            <p className={`text-[15px] font-medium ${title.trim() ? 'text-white' : 'text-white/25'}`}>{title.trim() || 'Your title'}</p>
            <p className={`mt-1 text-[13px] leading-relaxed ${body.trim() ? 'text-white/45' : 'text-white/20'}`}>{body.trim() || 'Your message'}</p>
          </div>
        </aside>
      </div>

      {/* Confirm */}
      {confirming && (
        <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/70 sm:items-center sm:p-4" onClick={() => !sending && setConfirming(false)}>
          <div role="dialog" aria-modal="true" className="relative w-full max-w-md border border-white/10 bg-[#0b150e] p-7 sm:rounded-2xl" onClick={(e) => e.stopPropagation()}>
            <button onClick={() => setConfirming(false)} disabled={sending} aria-label="Close"
              className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full text-white/40 transition hover:bg-white/[0.06] hover:text-white">
              <X size={16} />
            </button>
            <p className="mono mb-4 text-[10px] uppercase tracking-[0.16em] text-amber-300">Final check</p>
            <h2 className="serif pr-8 text-3xl leading-tight">Send to {countText}?</h2>
            <div className="mt-6 border-l-2 border-white/15 pl-4">
              <p className="text-[15px] font-medium text-white">{title.trim()}</p>
              <p className="mt-1 text-[13px] leading-relaxed text-white/55">{body.trim()}</p>
              {url.trim() && <p className="mono mt-2 text-[11px] text-white/35">Opens {url.trim()}</p>}
            </div>
            <p className="mt-6 text-[13px] text-white/45">This can’t be unsent.</p>
            <div className="mt-8 flex flex-col-reverse gap-3 sm:flex-row">
              <button onClick={() => setConfirming(false)} disabled={sending}
                className="inline-flex flex-1 items-center justify-center rounded-full border border-white/15 px-4 py-3 text-[13px] text-white/75 transition hover:border-white/40 hover:text-white disabled:opacity-40">
                Edit
              </button>
              <button onClick={send} disabled={sending}
                className="inline-flex flex-1 items-center justify-center gap-2 rounded-full bg-green-400 px-5 py-3 text-[14px] font-medium text-[#080f0a] transition hover:bg-green-300 disabled:opacity-60">
                {sending ? <><Loader2 size={15} className="animate-spin" /> Sending…</> : 'Send now'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}