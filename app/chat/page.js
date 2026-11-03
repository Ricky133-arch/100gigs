'use client';
import { useSession } from 'next-auth/react';
import { useState, useEffect, useRef, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { ArrowLeft, ArrowUp, CornerUpLeft, X } from 'lucide-react';
import { toast } from 'sonner';

/* ── helpers ─────────────────────────────────────────────── */

function shortAgo(date) {
  if (!date) return '';
  const s = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
  if (s < 60) return 'now';
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d`;
  return new Date(date).toLocaleDateString('en-NG', { day: 'numeric', month: 'short' });
}

const clock = (date) =>
  new Date(date).toLocaleTimeString('en-NG', { hour: 'numeric', minute: '2-digit' });

function dayLabel(date) {
  const d = new Date(date);
  const today = new Date();
  const yest = new Date(); yest.setDate(today.getDate() - 1);
  const same = (a, b) => a.toDateString() === b.toDateString();
  if (same(d, today)) return 'Today';
  if (same(d, yest)) return 'Yesterday';
  return d.toLocaleDateString('en-NG', {
    weekday: 'short', day: 'numeric', month: 'short',
    year: d.getFullYear() === today.getFullYear() ? undefined : 'numeric',
  });
}

function Avatar({ name, src, size = 36 }) {
  return (
    <div
      className="flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-green-400 font-semibold text-[#080f0a]"
      style={{ width: size, height: size, fontSize: size * 0.4 }}
    >
      {src ? <img src={src} alt={name} className="h-full w-full object-cover" /> : name?.charAt(0).toUpperCase()}
    </div>
  );
}

/* ── page ────────────────────────────────────────────────── */

function ChatContent() {
  const { data: session, status } = useSession();
  const searchParams = useSearchParams();
  const router = useRouter();

  const [conversations, setConversations] = useState([]);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [activeChat, setActiveChat] = useState(null);
  const [replyTo, setReplyTo] = useState(null);
  const [highlightedId, setHighlightedId] = useState(null);

  const messagesEndRef = useRef(null);
  const messagesContainerRef = useRef(null);
  const pollRef = useRef(null);
  const longPressTimer = useRef(null);
  const inputRef = useRef(null);
  const prevMessageCountRef = useRef(0);
  const isNearBottomRef = useRef(true);

  const myId = session?.user?.id;
  const getConversationId = (id1, id2) => [id1, id2].sort().join('_');
  const conversationId = activeChat ? getConversationId(myId, activeChat.otherId) : null;

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/login');
  }, [status]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!session) return;
    const to = searchParams.get('to');
    const name = searchParams.get('name');
    if (to && name) setActiveChat({ otherId: to, otherName: decodeURIComponent(name), otherAvatar: null });
    fetchConversations();
  }, [session]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (conversationId) {
      fetchMessages();
      pollRef.current = setInterval(fetchMessages, 3000);
    }
    return () => clearInterval(pollRef.current);
  }, [conversationId]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Scroll handling ───────────────────────────────────────
  const handleMessagesScroll = () => {
    const el = messagesContainerRef.current;
    if (!el) return;
    isNearBottomRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < 120;
  };

  useEffect(() => {
    const isNew = messages.length > prevMessageCountRef.current;
    const firstLoad = prevMessageCountRef.current === 0;
    prevMessageCountRef.current = messages.length;
    if (isNew && isNearBottomRef.current) {
      messagesEndRef.current?.scrollIntoView({ behavior: firstLoad ? 'auto' : 'smooth' });
    }
  }, [messages]);

  useEffect(() => {
    isNearBottomRef.current = true;
    prevMessageCountRef.current = 0;
    setMessages([]); // don't flash the previous conversation's messages
  }, [conversationId]);

  useEffect(() => { setReplyTo(null); }, [activeChat]);

  // ── Data ──────────────────────────────────────────────────
  const fetchConversations = async () => {
    try {
      const res = await fetch('/api/chat');
      if (!res.ok) return;
      const data = await res.json();
      setConversations(Array.isArray(data) ? data : (data.conversations || []));
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const fetchMessages = async () => {
    if (!conversationId) return;
    try {
      const res = await fetch(`/api/chat/${conversationId}`);
      if (!res.ok) return;
      const data = await res.json();
      if (!Array.isArray(data)) return;
      // Keep any message still being sent, so a poll doesn't make it vanish
      setMessages((prev) => {
        const pending = prev.filter((m) => m._optimistic);
        return pending.length ? [...data, ...pending] : data;
      });
    } catch (err) { console.error(err); }
  };

  // ── Reply: long-press on mobile, button on desktop ───────
  const startReply = (msg) => {
    setReplyTo(msg);
    inputRef.current?.focus();
  };
  const handleLongPressStart = (msg) => {
    longPressTimer.current = setTimeout(() => startReply(msg), 500);
  };
  const handleLongPressEnd = () => clearTimeout(longPressTimer.current);

  const jumpToMessage = (id) => {
    if (!id) return;
    const el = document.getElementById(`msg-${id}`);
    if (!el) return;
    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    setHighlightedId(id);
    setTimeout(() => setHighlightedId(null), 1400);
  };

  const senderNameOf = (msg) =>
    msg.sender?._id === myId || msg.sender === myId ? 'You' : msg.sender?.name || activeChat?.otherName;

  // ── Send ──────────────────────────────────────────────────
  const sendMessage = async (e) => {
    e.preventDefault();
    const content = newMessage.trim();
    if (!content || !activeChat || sending) return;

    const replySnapshot = replyTo
      ? { _id: replyTo._id, content: replyTo.content, senderName: senderNameOf(replyTo) }
      : null;

    const tempId = `temp-${Date.now()}`;
    const optimisticMsg = {
      _id: tempId,
      conversationId,
      sender: { _id: myId, name: session.user.name },
      receiver: activeChat.otherId,
      content,
      createdAt: new Date().toISOString(),
      replyTo: replySnapshot,
      seen: false,
      _optimistic: true,
    };

    setMessages((prev) => [...prev, optimisticMsg]);
    setNewMessage('');
    setReplyTo(null);
    setSending(true);
    isNearBottomRef.current = true;

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ receiverId: activeChat.otherId, content, conversationId, replyTo: replySnapshot }),
      });
      if (!res.ok) {
        toast.error('Message not sent. Try again.');
        setMessages((prev) => prev.filter((m) => m._id !== tempId));
        setNewMessage(content); // give the text back so nothing is lost
        return;
      }
      const saved = await res.json();
      setMessages((prev) => {
        const withoutTemp = prev.filter((m) => m._id !== tempId);
        return withoutTemp.some((m) => m._id === saved._id) ? withoutTemp : [...withoutTemp, saved];
      });
      fetchConversations();
    } catch {
      toast.error('Something went wrong');
      setMessages((prev) => prev.filter((m) => m._id !== tempId));
      setNewMessage(content);
    } finally {
      setSending(false);
    }
  };

  const openConversation = (conv) => {
    const other = conv.sender?._id === myId ? conv.receiver : conv.sender;
    if (!other) return;
    setActiveChat({ otherId: other._id, otherName: other.name, otherAvatar: other.avatar });
  };

  if (status === 'loading') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#080f0a]">
        <p className="text-[11px] uppercase tracking-[0.18em] text-white/35" style={{ fontFamily: 'var(--font-mono), monospace' }}>
          Loading…
        </p>
      </div>
    );
  }
  if (!session) return null;

  const isNewThread = activeChat && !conversations.some((c) => {
    const other = c.sender?._id === myId ? c.receiver : c.sender;
    return other?._id === activeChat.otherId;
  });

  return (
    <div className="ch bg-[#080f0a] text-[#e9efe9] antialiased">
      <style>{`
        .ch { font-family: var(--font-sans), ui-sans-serif, system-ui, sans-serif; }
        .serif { font-family: var(--font-serif), Georgia, serif; font-weight: 400; letter-spacing: -0.01em; }
        .mono { font-family: var(--font-mono), ui-monospace, monospace; }
        .ch ::-webkit-scrollbar { width: 6px; }
        .ch ::-webkit-scrollbar-track { background: transparent; }
        .ch ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.08); border-radius: 6px; }
        @keyframes flash { 0%,100% { box-shadow: 0 0 0 0 rgba(74,222,128,0); } 25% { box-shadow: 0 0 0 3px rgba(74,222,128,0.55); } }
        .flash { animation: flash 1.4s ease; }
      `}</style>

      {/* Height leaves room for the floating bottom nav (6rem) */}
      <div className="mx-auto flex h-[calc(100dvh-6rem)] max-w-6xl flex-col md:px-8 md:pt-8">

        {/* Page header — hidden on mobile while a chat is open */}
        <div className={`px-5 pb-6 pt-8 md:px-0 md:pt-0 ${activeChat ? 'hidden md:block' : ''}`}>
          <h1 className="serif text-5xl leading-none md:text-6xl">Messages</h1>
        </div>

        <div className="grid min-h-0 flex-1 border-white/10 md:grid-cols-[320px_1fr] md:border lg:grid-cols-[360px_1fr]">

          {/* ─── Conversation list ─── */}
          <aside className={`min-h-0 flex-col border-white/10 md:border-r ${activeChat ? 'hidden md:flex' : 'flex'}`}>
            <div className="mono border-b border-t border-white/10 px-5 py-3 text-[10px] uppercase tracking-[0.16em] text-white/35 md:border-t-0">
              Conversations
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto">
              {isNewThread && (
                <div className="flex items-center gap-3 border-b border-white/[0.07] bg-white/[0.03] px-5 py-4">
                  <Avatar name={activeChat.otherName} src={activeChat.otherAvatar} />
                  <div className="min-w-0">
                    <p className="truncate text-[14px] font-medium text-white">{activeChat.otherName}</p>
                    <p className="mono text-[11px] text-green-400">New conversation</p>
                  </div>
                </div>
              )}

              {loading ? (
                <ul>
                  {[0, 1, 2, 3].map((i) => (
                    <li key={i} className="flex gap-3 border-b border-white/[0.07] px-5 py-4">
                      <div className="h-9 w-9 shrink-0 animate-pulse rounded-full bg-white/[0.06]" />
                      <div className="flex-1 space-y-2 pt-1">
                        <div className="h-3 w-1/2 animate-pulse bg-white/[0.07]" />
                        <div className="h-3 w-3/4 animate-pulse bg-white/[0.04]" />
                      </div>
                    </li>
                  ))}
                </ul>
              ) : conversations.length === 0 && !activeChat ? (
                <div className="px-5 py-16">
                  <p className="serif text-3xl leading-tight">No messages yet.</p>
                  <p className="mt-2 max-w-xs text-[14px] leading-relaxed text-white/45">
                    Conversations start from a job — message someone who applied, or reply to a client from a job you applied to.
                  </p>
                </div>
              ) : (
                <ul>
                  {conversations.map((conv) => {
                    const other = conv.sender?._id === myId ? conv.receiver : conv.sender;
                    if (!other) return null;
                    const isActive = activeChat?.otherId === other._id;
                    const unread = conv.unreadCount || 0;
                    const hasUnread = unread > 0 && !isActive;
                    const fromMe = conv.sender?._id === myId;

                    return (
                      <li key={conv._id}>
                        <button
                          onClick={() => openConversation(conv)}
                          className={`relative flex w-full items-center gap-3 border-b border-white/[0.07] px-5 py-4 text-left transition-colors ${
                            isActive ? 'bg-white/[0.04]' : 'hover:bg-white/[0.02]'
                          }`}
                        >
                          {isActive && <span className="absolute inset-y-0 left-0 w-0.5 bg-green-400" />}
                          <Avatar name={other.name} src={other.avatar} />
                          <div className="min-w-0 flex-1">
                            <div className="mb-0.5 flex items-baseline justify-between gap-3">
                              <p className={`truncate text-[14px] ${hasUnread ? 'font-semibold text-white' : 'font-medium text-white/85'}`}>
                                {other.name}
                              </p>
                              <span className={`mono shrink-0 text-[11px] ${hasUnread ? 'text-green-400' : 'text-white/30'}`}>
                                {shortAgo(conv.createdAt)}
                              </span>
                            </div>
                            <div className="flex items-center justify-between gap-3">
                              <p className={`truncate text-[13px] ${hasUnread ? 'text-white/75' : 'text-white/40'}`}>
                                {fromMe && <span className="text-white/30">You: </span>}
                                {conv.content}
                              </p>
                              {hasUnread && (
                                <span className="mono flex h-[18px] min-w-[18px] shrink-0 items-center justify-center rounded-full bg-green-400 px-1 text-[10px] text-[#080f0a]">
                                  {unread > 99 ? '99+' : unread}
                                </span>
                              )}
                            </div>
                          </div>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </aside>

          {/* ─── Thread ─── */}
          <section className={`min-h-0 flex-col ${activeChat ? 'flex' : 'hidden md:flex'}`}>
            {activeChat ? (
              <>
                {/* Thread header */}
                <div className="flex items-center gap-2 border-b border-white/10 px-3 py-3 md:px-5">
                  <button onClick={() => setActiveChat(null)} aria-label="Back to conversations"
                    className="flex h-9 w-9 items-center justify-center rounded-full text-white/50 transition hover:bg-white/[0.05] hover:text-white md:hidden">
                    <ArrowLeft size={18} />
                  </button>
                  <button onClick={() => router.push(`/profile/${activeChat.otherId}`)}
                    className="group flex flex-1 items-center gap-3 text-left">
                    <Avatar name={activeChat.otherName} src={activeChat.otherAvatar} size={34} />
                    <div className="min-w-0">
                      <p className="truncate text-[15px] font-medium text-white transition-colors group-hover:text-green-400">
                        {activeChat.otherName}
                      </p>
                      <p className="mono text-[10px] uppercase tracking-[0.14em] text-white/35">View profile</p>
                    </div>
                  </button>
                </div>

                {/* Messages */}
                <div ref={messagesContainerRef} onScroll={handleMessagesScroll}
                  className="min-h-0 flex-1 overflow-y-auto px-4 py-6 md:px-6">
                  {messages.length === 0 ? (
                    <div className="flex h-full flex-col items-center justify-center text-center">
                      <Avatar name={activeChat.otherName} src={activeChat.otherAvatar} size={56} />
                      <p className="serif mt-5 text-3xl">Say hello to {activeChat.otherName?.split(' ')[0]}.</p>
                      <p className="mt-2 max-w-xs text-[13px] leading-relaxed text-white/40">
                        Be specific about the job — what, where in town, and when you need it done.
                      </p>
                    </div>
                  ) : (
                    messages.map((msg, i) => {
                      const isMe = msg.sender?._id === myId || msg.sender === myId;
                      const prev = messages[i - 1];
                      const next = messages[i + 1];
                      const prevIsMe = prev && (prev.sender?._id === myId || prev.sender === myId);
                      const nextIsMe = next && (next.sender?._id === myId || next.sender === myId);
                      const newDay = !prev || new Date(prev.createdAt).toDateString() !== new Date(msg.createdAt).toDateString();
                      const groupedWithPrev = !newDay && prev && prevIsMe === isMe;
                      const groupedWithNext = next && nextIsMe === isMe &&
                        new Date(next.createdAt).toDateString() === new Date(msg.createdAt).toDateString();
                      const isSelected = replyTo?._id === msg._id;
                      const isHighlighted = highlightedId === msg._id;

                      return (
                        <div key={msg._id}>
                          {newDay && (
                            <div className="my-6 flex items-center gap-4 first:mt-0">
                              <span className="h-px flex-1 bg-white/[0.07]" />
                              <span className="mono text-[10px] uppercase tracking-[0.16em] text-white/30">{dayLabel(msg.createdAt)}</span>
                              <span className="h-px flex-1 bg-white/[0.07]" />
                            </div>
                          )}

                          <div
                            id={`msg-${msg._id}`}
                            className={`group flex items-end gap-2 ${isMe ? 'flex-row-reverse' : ''} ${groupedWithPrev ? 'mt-1' : 'mt-4'}`}
                            onTouchStart={() => handleLongPressStart(msg)}
                            onTouchEnd={handleLongPressEnd}
                            onTouchMove={handleLongPressEnd}
                            onTouchCancel={handleLongPressEnd}
                          >
                            <div
                              className={`max-w-[78%] select-none overflow-hidden text-[14.5px] leading-relaxed transition-transform md:max-w-[65%] md:select-text ${
                                isMe ? 'bg-green-400 text-[#080f0a]' : 'border border-white/10 bg-[#0f1c13] text-white/90'
                              } ${isHighlighted ? 'flash' : ''} ${isSelected ? 'scale-[0.98] ring-2 ring-green-400/70 ring-offset-2 ring-offset-[#080f0a]' : ''}`}
                              style={{
                                opacity: msg._optimistic ? 0.65 : 1,
                                borderRadius: 18,
                                ...(isMe
                                  ? { borderBottomRightRadius: groupedWithNext ? 18 : 4 }
                                  : { borderBottomLeftRadius: groupedWithNext ? 18 : 4 }),
                              }}
                            >
                              {msg.replyTo && (
                                <button type="button"
                                  onClick={(e) => { e.stopPropagation(); jumpToMessage(msg.replyTo._id); }}
                                  className={`mx-1.5 mt-1.5 block w-[calc(100%-0.75rem)] rounded-xl border-l-2 px-3 py-2 text-left transition ${
                                    isMe ? 'border-[#080f0a]/50 bg-[#080f0a]/10 hover:bg-[#080f0a]/15' : 'border-green-400 bg-white/[0.04] hover:bg-white/[0.07]'
                                  }`}>
                                  <p className={`text-[11px] font-semibold ${isMe ? 'text-[#080f0a]/80' : 'text-green-400'}`}>
                                    {msg.replyTo.senderName}
                                  </p>
                                  <p className={`truncate text-[12px] ${isMe ? 'text-[#080f0a]/60' : 'text-white/45'}`}>
                                    {msg.replyTo.content}
                                  </p>
                                </button>
                              )}
                              <p className="whitespace-pre-wrap break-words px-3.5 py-2">{msg.content}</p>
                            </div>

                            {/* Desktop reply button + time */}
                            <div className={`mb-1 flex shrink-0 items-center gap-2 ${isMe ? 'flex-row-reverse' : ''}`}>
                              <button type="button" onClick={() => startReply(msg)} aria-label="Reply"
                                className="hidden h-7 w-7 items-center justify-center rounded-full text-white/30 opacity-0 transition hover:bg-white/[0.06] hover:text-white group-hover:opacity-100 md:flex">
                                <CornerUpLeft size={14} />
                              </button>
                              {!groupedWithNext && (
                                <span className="mono text-[10px] text-white/30">
                                  {msg._optimistic ? 'sending' : clock(msg.createdAt)}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                  <div ref={messagesEndRef} />
                </div>

                {/* Composer */}
                <div className="border-t border-white/10">
                  {replyTo && (
                    <div className="flex items-center gap-3 px-4 pt-3 md:px-6">
                      <div className="min-w-0 flex-1 border-l-2 border-green-400 pl-3">
                        <p className="text-[11px] font-semibold text-green-400">
                          Replying to {senderNameOf(replyTo) === 'You' ? 'yourself' : senderNameOf(replyTo)}
                        </p>
                        <p className="truncate text-[12px] text-white/45">{replyTo.content}</p>
                      </div>
                      <button onClick={() => setReplyTo(null)} aria-label="Cancel reply"
                        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-white/40 transition hover:bg-white/[0.06] hover:text-white">
                        <X size={14} />
                      </button>
                    </div>
                  )}
                  <form onSubmit={sendMessage} className="flex items-center gap-3 px-4 py-3 md:px-6 md:py-4">
                    <input
                      ref={inputRef}
                      type="text"
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      placeholder={`Message ${activeChat.otherName?.split(' ')[0] || ''}`}
                      className="min-w-0 flex-1 rounded-full border border-white/10 bg-white/[0.03] px-5 py-3 text-[14.5px] text-white outline-none transition placeholder:text-white/25 focus:border-green-400/60"
                    />
                    <button type="submit" disabled={!newMessage.trim()} aria-label="Send"
                      className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-green-400 text-[#080f0a] transition hover:bg-green-300 active:scale-95 disabled:bg-white/[0.06] disabled:text-white/25">
                      <ArrowUp size={18} strokeWidth={2.2} />
                    </button>
                  </form>
                </div>
              </>
            ) : (
              <div className="flex h-full flex-col justify-center px-10">
                <p className="serif text-4xl leading-tight text-white/90">Pick a conversation.</p>
                <p className="mt-2 max-w-sm text-[14px] leading-relaxed text-white/40">
                  Choose someone on the left to pick up where you left off.
                </p>
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}

export default function ChatPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center bg-[#080f0a]">
        <p className="text-[11px] uppercase tracking-[0.18em] text-white/35" style={{ fontFamily: 'var(--font-mono), monospace' }}>
          Loading…
        </p>
      </div>
    }>
      <ChatContent />
    </Suspense>
  );
}