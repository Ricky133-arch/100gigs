'use client';
import { useSession } from 'next-auth/react';
import { useState, useEffect, useRef } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { MessageCircle, Send, ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';
import { Suspense } from 'react';

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
  const messagesEndRef = useRef(null);
  const pollRef = useRef(null);
  const longPressTimer = useRef(null);
  const inputRef = useRef(null);

  const getConversationId = (id1, id2) => [id1, id2].sort().join('_');
  const conversationId = activeChat
    ? getConversationId(session?.user?.id, activeChat.otherId)
    : null;

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/login');
  }, [status]);

  useEffect(() => {
    if (!session) return;
    const to = searchParams.get('to');
    const name = searchParams.get('name');
    if (to && name) setActiveChat({ otherId: to, otherName: decodeURIComponent(name), otherAvatar: null });
    fetchConversations();
  }, [session]);

  useEffect(() => {
    if (conversationId) {
      fetchMessages();
      pollRef.current = setInterval(fetchMessages, 3000);
    }
    return () => clearInterval(pollRef.current);
  }, [conversationId]);

  // Track the message container + whether the user is near the bottom
  const messagesContainerRef = useRef(null);
  const prevMessageCountRef = useRef(0);
  const isNearBottomRef = useRef(true);

  const checkIfNearBottom = () => {
    const el = messagesContainerRef.current;
    if (!el) return true;
    const threshold = 120; // px from bottom counts as "at the bottom"
    return el.scrollHeight - el.scrollTop - el.clientHeight < threshold;
  };

  const handleMessagesScroll = () => {
    isNearBottomRef.current = checkIfNearBottom();
  };

  useEffect(() => {
    const isNewMessage = messages.length > prevMessageCountRef.current;
    prevMessageCountRef.current = messages.length;

    // Only auto-scroll if a message was actually added AND the user
    // was already near the bottom (i.e. not reading older history).
    if (isNewMessage && isNearBottomRef.current) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  // Reset bottom-tracking whenever the active conversation changes
  useEffect(() => {
    isNearBottomRef.current = true;
    prevMessageCountRef.current = 0;
  }, [conversationId]);

  // Clear reply when switching conversations
  useEffect(() => { setReplyTo(null); }, [activeChat]);

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
      setMessages(Array.isArray(data) ? data : []);
    } catch (err) { console.error(err); }
  };

  // Long press handlers
  const handleLongPressStart = (msg) => {
    longPressTimer.current = setTimeout(() => {
      setReplyTo(msg);
      inputRef.current?.focus();
    }, 500);
  };

  const handleLongPressEnd = () => {
    clearTimeout(longPressTimer.current);
  };

  const cancelReply = () => setReplyTo(null);

  // ── Jump to the original message when tapping a quoted reply ───────
  const [highlightedId, setHighlightedId] = useState(null);
  const jumpToMessage = (id) => {
    if (!id) return;
    const el = document.getElementById(`msg-${id}`);
    if (!el) return; // original message not in the currently loaded list
    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    setHighlightedId(id);
    setTimeout(() => setHighlightedId(null), 1200);
  };

  const sendMessage = async (e) => {
    e.preventDefault();
    const content = newMessage.trim();
    if (!content || !activeChat) return;

    // Snapshot the reply being sent before clearing state
    const replySnapshot = replyTo ? {
      _id: replyTo._id,
      content: replyTo.content,
      senderName: replyTo.sender?.name || (replyTo.sender?._id === session?.user?.id ? 'You' : activeChat.otherName),
    } : null;

    // ── Optimistic UI: show the message immediately, before the server responds ──
    const tempId = `temp-${Date.now()}`;
    const optimisticMsg = {
      _id: tempId,
      conversationId,
      sender: { _id: session.user.id, name: session.user.name },
      receiver: activeChat.otherId,
      content,
      createdAt: new Date().toISOString(),
      replyTo: replySnapshot,
      seen: false,
      _optimistic: true,
    };

    setMessages(prev => [...prev, optimisticMsg]);
    setNewMessage('');
    setReplyTo(null);
    setSending(true);
    // Sending your own message should always snap you to the bottom
    isNearBottomRef.current = true;

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          receiverId: activeChat.otherId,
          content,
          conversationId,
          replyTo: replySnapshot,
        }),
      });

      if (!res.ok) {
        toast.error('Failed to send message');
        // Roll back the optimistic message on failure
        setMessages(prev => prev.filter(m => m._id !== tempId));
        return;
      }

      const saved = await res.json();

      // Swap the optimistic message for the real saved one
      setMessages(prev => prev.map(m => m._id === tempId ? saved : m));

      // Refresh conversations list in the background — don't block the UI on it
      fetchConversations();
    } catch {
      toast.error('Something went wrong');
      setMessages(prev => prev.filter(m => m._id !== tempId));
    } finally {
      setSending(false);
    }
  };

  const openConversation = (conv) => {
    const other = conv.sender?._id === session?.user?.id ? conv.receiver : conv.sender;
    if (!other) return;
    setActiveChat({ otherId: other._id, otherName: other.name, otherAvatar: other.avatar });
  };

  if (status === 'loading') {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#080f0a]">
        <div className="w-10 h-10 rounded-full border-2 border-green-500/20 border-t-green-500 animate-spin" />
      </div>
    );
  }

  if (!session) return null;

  const glassPanel = {
    background: 'rgba(255,255,255,0.04)',
    border: '1px solid rgba(255,255,255,0.08)',
    backdropFilter: 'blur(16px)',
    WebkitBackdropFilter: 'blur(16px)',
  };

  return (
    <div className="min-h-screen bg-[#080f0a] relative overflow-hidden">
      <style>{`
        @keyframes drift {
          0%,100% { transform:translate(0,0) scale(1); }
          33% { transform:translate(30px,-20px) scale(1.05); }
          66% { transform:translate(-20px,15px) scale(0.97); }
        }
        .drift { animation: drift 14s ease-in-out infinite; }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 4px; }
      `}</style>

      {/* Background orbs */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-10%] left-[-5%] w-[500px] h-[500px] rounded-full drift"
          style={{ background: 'radial-gradient(circle, rgba(22,163,74,0.12) 0%, transparent 70%)' }} />
        <div className="absolute bottom-[-10%] right-[-5%] w-[500px] h-[500px] rounded-full drift"
          style={{ background: 'radial-gradient(circle, rgba(16,185,129,0.1) 0%, transparent 70%)', animationDelay: '5s' }} />
        <div className="absolute inset-0 opacity-[0.025]" style={{
          backgroundImage: 'linear-gradient(rgba(255,255,255,0.8) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.8) 1px, transparent 1px)',
          backgroundSize: '72px 72px',
        }} />
      </div>

      <div className="relative max-w-6xl mx-auto px-4 py-8 h-screen flex flex-col">

        {/* Header */}
        <div className="mb-5 flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl flex items-center justify-center"
            style={{ background: 'rgba(74,222,128,0.12)' }}>
            <MessageCircle size={16} className="text-green-400" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">Messages</h1>
            <p className="text-xs text-white/30">Your conversations</p>
          </div>
        </div>

        {/* Chat layout */}
        <div className="flex-1 grid lg:grid-cols-12 gap-4 min-h-0">

          {/* Sidebar */}
          <div
            className={`lg:col-span-4 rounded-2xl flex flex-col overflow-hidden ${activeChat ? 'hidden lg:flex' : 'flex'}`}
            style={glassPanel}
          >
            <div className="px-4 py-3.5 border-b" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
              <p className="text-xs font-semibold uppercase tracking-widest text-white/30">Conversations</p>
            </div>

            <div className="flex-1 overflow-y-auto">
              {activeChat && !conversations.find(c => {
                const other = c.sender?._id === session?.user?.id ? c.receiver : c.sender;
                return other?._id === activeChat.otherId;
              }) && (
                <button onClick={() => setActiveChat(activeChat)}
                  className="w-full px-4 py-3.5 flex items-center gap-3 text-left border-b"
                  style={{ background: 'rgba(74,222,128,0.08)', borderColor: 'rgba(255,255,255,0.05)' }}>
                  <div className="w-9 h-9 rounded-full bg-green-500 flex items-center justify-center text-white text-sm font-bold shrink-0">
                    {activeChat.otherName?.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-white">{activeChat.otherName}</p>
                    <p className="text-xs text-white/30">New conversation</p>
                  </div>
                </button>
              )}

              {loading ? (
                <div className="p-4 space-y-4">
                  {[1,2,3].map(i => (
                    <div key={i} className="flex gap-3 animate-pulse">
                      <div className="w-9 h-9 rounded-full shrink-0" style={{ background: 'rgba(255,255,255,0.06)' }} />
                      <div className="flex-1 space-y-2">
                        <div className="h-3 rounded-lg w-3/4" style={{ background: 'rgba(255,255,255,0.06)' }} />
                        <div className="h-2 rounded-lg w-1/2" style={{ background: 'rgba(255,255,255,0.04)' }} />
                      </div>
                    </div>
                  ))}
                </div>
              ) : conversations.length === 0 && !activeChat ? (
                <div className="flex flex-col items-center justify-center h-full text-center px-6 py-16">
                  <MessageCircle size={32} className="mb-3" style={{ color: 'rgba(255,255,255,0.1)' }} />
                  <p className="text-sm text-white/30">No conversations yet</p>
                  <p className="text-xs text-white/20 mt-1">Start a chat from a job application</p>
                </div>
              ) : (
                conversations.map(conv => {
                  const other = conv.sender?._id === session?.user?.id ? conv.receiver : conv.sender;
                  if (!other) return null;
                  const isActive = activeChat?.otherId === other._id;
                  const unread = conv.unreadCount || 0;
                  const hasUnread = unread > 0 && !isActive;

                  return (
                    <button key={conv._id} onClick={() => openConversation(conv)}
                      className="w-full px-4 py-3.5 flex items-center gap-3 text-left border-b transition-all relative"
                      style={{
                        borderColor: 'rgba(255,255,255,0.05)',
                        background: isActive ? 'rgba(74,222,128,0.08)' : hasUnread ? 'rgba(74,222,128,0.07)' : 'transparent',
                        borderLeft: hasUnread ? '3px solid #16a34a' : '3px solid transparent',
                      }}
                      onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = hasUnread ? 'rgba(74,222,128,0.11)' : 'rgba(255,255,255,0.03)'; }}
                      onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = hasUnread ? 'rgba(74,222,128,0.07)' : 'transparent'; }}
                    >
                      <div className="relative shrink-0">
                        <div className="w-9 h-9 rounded-full bg-green-500 flex items-center justify-center text-white text-sm font-bold overflow-hidden">
                          {other.avatar ? (
                            <img src={other.avatar} alt={other.name} className="w-full h-full object-cover" />
                          ) : (
                            other.name?.charAt(0).toUpperCase()
                          )}
                        </div>
                        <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 bg-green-400"
                          style={{ borderColor: 'rgba(8,15,10,1)' }} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between mb-0.5">
                          <p className="text-sm truncate"
                            style={{ color: hasUnread ? '#4ade80' : 'rgba(255,255,255,0.85)', fontWeight: hasUnread ? '700' : '500' }}>
                            {other.name}
                          </p>
                          <p className="text-[11px] shrink-0 ml-2"
                            style={{ color: hasUnread ? 'rgba(74,222,128,0.6)' : 'rgba(255,255,255,0.2)' }}>
                            {formatDistanceToNow(new Date(conv.createdAt), { addSuffix: false })}
                          </p>
                        </div>
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-xs truncate"
                            style={{ color: hasUnread ? 'rgba(255,255,255,0.75)' : 'rgba(255,255,255,0.3)', fontWeight: hasUnread ? '600' : '400' }}>
                            {conv.content}
                          </p>
                          {hasUnread && (
                            <span className="shrink-0 min-w-[18px] h-[18px] rounded-full flex items-center justify-center text-[10px] font-bold text-white px-1"
                              style={{ background: '#16a34a', boxShadow: '0 0 0 2px rgba(8,15,10,0.8)' }}>
                              {unread > 99 ? '99+' : unread}
                            </span>
                          )}
                        </div>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>

          {/* Chat window */}
          <div
            className={`lg:col-span-8 rounded-2xl flex flex-col overflow-hidden ${activeChat ? 'flex' : 'hidden lg:flex'}`}
            style={glassPanel}
          >
            {activeChat ? (
              <>
                {/* Chat header */}
<div className="px-4 py-3.5 flex items-center gap-3 border-b" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
  <button onClick={() => setActiveChat(null)}
    className="lg:hidden p-1.5 rounded-lg transition"
    style={{ color: 'rgba(255,255,255,0.4)' }}
    onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.06)'}
    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
    <ArrowLeft size={16} />
  </button>

  <button
    onClick={() => router.push(`/profile/${activeChat.otherId}`)}
    className="flex items-center gap-3 flex-1 text-left hover:opacity-80 transition group"
  >
    <div className="w-9 h-9 rounded-full bg-green-500 flex items-center justify-center text-white font-bold text-sm overflow-hidden shrink-0">
      {activeChat.otherAvatar ? (
        <img src={activeChat.otherAvatar} alt={activeChat.otherName} className="w-full h-full object-cover" />
      ) : (
        activeChat.otherName?.charAt(0).toUpperCase()
      )}
    </div>
    <div>
      <p className="text-sm font-semibold text-white group-hover:text-green-400 transition-colors">
        {activeChat.otherName}
      </p>
      <div className="flex items-center gap-1.5">
        <span className="w-1.5 h-1.5 rounded-full bg-green-400" />
        <p className="text-xs text-green-400">Tap to view profile</p>
      </div>
    </div>
  </button>
</div>

                {/* Messages */}
                <div
                  ref={messagesContainerRef}
                  onScroll={handleMessagesScroll}
                  className="flex-1 overflow-y-auto px-4 py-4 space-y-3"
                >
                  {messages.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-center">
                      <div className="w-12 h-12 rounded-2xl flex items-center justify-center mb-3"
                        style={{ background: 'rgba(74,222,128,0.08)', border: '1px solid rgba(74,222,128,0.15)' }}>
                        <MessageCircle size={20} className="text-green-400" />
                      </div>
                      <p className="text-white/40 text-sm">Say hello to {activeChat.otherName}!</p>
                    </div>
                  ) : (
                    messages.map(msg => {
                      const isMe = msg.sender?._id === session?.user?.id || msg.sender === session?.user?.id;
                      const isSelected = replyTo?._id === msg._id;
                      return (
                        <div key={msg._id}
                          id={`msg-${msg._id}`}
                          className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}
                          onMouseDown={() => handleLongPressStart(msg)}
                          onMouseUp={handleLongPressEnd}
                          onMouseLeave={handleLongPressEnd}
                          onTouchStart={() => handleLongPressStart(msg)}
                          onTouchEnd={handleLongPressEnd}
                          onTouchCancel={handleLongPressEnd}
                        >
                          <div
                            className="max-w-[70%] rounded-2xl text-sm overflow-hidden transition-all duration-150 select-none"
                            style={{
                              opacity: msg._optimistic ? 0.7 : 1,
                              ...(isMe ? {
                                background: 'linear-gradient(135deg, #16a34a, #15803d)',
                                borderBottomRightRadius: '4px',
                                boxShadow: isSelected
                                  ? '0 0 0 2px #4ade80, 0 2px 12px rgba(22,163,74,0.25)'
                                  : highlightedId === msg._id
                                  ? '0 0 0 2px #fbbf24, 0 2px 12px rgba(22,163,74,0.25)'
                                  : '0 2px 12px rgba(22,163,74,0.25)',
                              } : {
                                background: highlightedId === msg._id ? 'rgba(251,191,36,0.15)' : 'rgba(255,255,255,0.07)',
                                border: isSelected
                                  ? '1px solid rgba(74,222,128,0.6)'
                                  : highlightedId === msg._id
                                  ? '1px solid rgba(251,191,36,0.6)'
                                  : '1px solid rgba(255,255,255,0.08)',
                                borderBottomLeftRadius: '4px',
                              }),
                              transform: isSelected ? 'scale(0.97)' : 'scale(1)',
                            }}
                          >
                            {/* Quoted reply inside bubble — tap to jump to original */}
                            {msg.replyTo && (
                              <div
                                onClick={(e) => { e.stopPropagation(); jumpToMessage(msg.replyTo._id); }}
                                className="px-3 pt-2.5 pb-1.5 mx-2 mt-2 rounded-xl cursor-pointer transition hover:brightness-125"
                                style={{ background: 'rgba(0,0,0,0.2)', borderLeft: '2px solid rgba(74,222,128,0.7)' }}>
                                <p className="text-[11px] font-semibold text-green-400 mb-0.5">{msg.replyTo.senderName}</p>
                                <p className="text-[11px] text-white/50 truncate">{msg.replyTo.content}</p>
                              </div>
                            )}
                            <div className="px-4 py-2.5">
                              <p className="text-white leading-relaxed">{msg.content}</p>
                              <p className="text-[11px] mt-1" style={{ color: isMe ? 'rgba(255,255,255,0.5)' : 'rgba(255,255,255,0.25)' }}>
                                {msg._optimistic ? 'Sending...' : formatDistanceToNow(new Date(msg.createdAt), { addSuffix: true })}
                              </p>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                  <div ref={messagesEndRef} />
                </div>

                {/* Input area */}
                <div className="border-t" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
                  {/* Reply preview bar */}
                  {replyTo && (
                    <div className="px-4 pt-3 flex items-center gap-3">
                      <div className="flex-1 px-3 py-2 rounded-xl"
                        style={{ background: 'rgba(74,222,128,0.08)', borderLeft: '2px solid #4ade80' }}>
                        <p className="text-[11px] font-semibold text-green-400 mb-0.5">
                          Replying to {replyTo.sender?.name || (replyTo.sender?._id === session?.user?.id ? 'yourself' : activeChat.otherName)}
                        </p>
                        <p className="text-[11px] text-white/40 truncate">{replyTo.content}</p>
                      </div>
                      <button onClick={cancelReply}
                        className="w-6 h-6 rounded-full flex items-center justify-center text-white/30 hover:text-white/70 transition shrink-0 text-xs"
                        style={{ background: 'rgba(255,255,255,0.06)' }}>
                        ✕
                      </button>
                    </div>
                  )}
                  <form onSubmit={sendMessage} className="px-4 py-3.5 flex gap-3">
                    <input
                      ref={inputRef}
                      type="text"
                      value={newMessage}
                      onChange={e => setNewMessage(e.target.value)}
                      placeholder={replyTo ? `Reply to ${replyTo.sender?.name || 'message'}...` : `Message ${activeChat.otherName}...`}
                      className="flex-1 px-4 py-3 rounded-xl text-sm text-white placeholder-white/20 outline-none transition"
                      style={{
                        background: 'rgba(255,255,255,0.06)',
                        border: '1px solid rgba(255,255,255,0.08)',
                      }}
                      onFocus={e => e.target.style.borderColor = 'rgba(74,222,128,0.4)'}
                      onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.08)'}
                    />
                    <button type="submit" disabled={!newMessage.trim()}
                      className="w-11 h-11 rounded-xl flex items-center justify-center text-white transition-all active:scale-95 disabled:opacity-40 shrink-0"
                      style={{
                        background: newMessage.trim() ? 'linear-gradient(135deg,#16a34a,#15803d)' : 'rgba(255,255,255,0.06)',
                        boxShadow: newMessage.trim() ? '0 4px 16px rgba(22,163,74,0.3)' : 'none',
                      }}>
                      <Send size={16} />
                    </button>
                  </form>
                </div>
              </>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-center px-8">
                <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4"
                  style={{ background: 'rgba(74,222,128,0.08)', border: '1px solid rgba(74,222,128,0.15)' }}>
                  <MessageCircle size={28} className="text-green-400" />
                </div>
                <h3 className="font-semibold text-white mb-2">Your Messages</h3>
                <p className="text-white/30 text-sm max-w-xs">
                  Select a conversation or start a new chat from a job application.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ChatPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-screen bg-[#080f0a]">
        <div className="w-10 h-10 rounded-full border-2 border-green-500/20 border-t-green-500 animate-spin" />
      </div>
    }>
      <ChatContent />
    </Suspense>
  );
}