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
  const messagesEndRef = useRef(null);
  const pollRef = useRef(null);

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
    if (to && name) setActiveChat({ otherId: to, otherName: decodeURIComponent(name) });
    fetchConversations();
  }, [session]);

  useEffect(() => {
    if (conversationId) {
      fetchMessages();
      pollRef.current = setInterval(fetchMessages, 3000);
    }
    return () => clearInterval(pollRef.current);
  }, [conversationId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const fetchConversations = async () => {
    try {
      const res = await fetch('/api/chat');
      if (!res.ok) return;
      const data = await res.json();
      setConversations(Array.isArray(data) ? data : []);
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

  const sendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !activeChat) return;
    setSending(true);
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ receiverId: activeChat.otherId, content: newMessage.trim(), conversationId }),
      });
      if (!res.ok) { toast.error('Failed to send message'); return; }
      setNewMessage('');
      await fetchMessages();
      await fetchConversations();
    } catch { toast.error('Something went wrong'); }
    finally { setSending(false); }
  };

  const openConversation = (conv) => {
    const other = conv.sender?._id === session?.user?.id ? conv.receiver : conv.sender;
    if (!other) return;
    setActiveChat({ otherId: other._id, otherName: other.name });
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
              {/* Active new chat from URL params */}
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
                  return (
                    <button key={conv._id} onClick={() => openConversation(conv)}
                      className="w-full px-4 py-3.5 flex items-center gap-3 text-left border-b transition-all"
                      style={{
                        borderColor: 'rgba(255,255,255,0.05)',
                        background: isActive ? 'rgba(74,222,128,0.08)' : 'transparent',
                      }}
                      onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = 'rgba(255,255,255,0.03)'; }}
                      onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = 'transparent'; }}
                    >
                      <div className="w-9 h-9 rounded-full bg-green-500 flex items-center justify-center text-white text-sm font-bold shrink-0">
                        {other.name?.charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-white truncate">{other.name}</p>
                        <p className="text-xs truncate" style={{ color: 'rgba(255,255,255,0.3)' }}>{conv.content}</p>
                      </div>
                      <p className="text-[11px] shrink-0" style={{ color: 'rgba(255,255,255,0.2)' }}>
                        {formatDistanceToNow(new Date(conv.createdAt), { addSuffix: true })}
                      </p>
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
                  <div className="w-9 h-9 rounded-full bg-green-500 flex items-center justify-center text-white font-bold text-sm">
                    {activeChat.otherName?.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-white">{activeChat.otherName}</p>
                    <div className="flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-green-400" />
                      <p className="text-xs text-green-400">Active</p>
                    </div>
                  </div>
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
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
                      return (
                        <div key={msg._id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                          <div
                            className="max-w-[70%] px-4 py-2.5 rounded-2xl text-sm"
                            style={isMe ? {
                              background: 'linear-gradient(135deg, #16a34a, #15803d)',
                              borderBottomRightRadius: '4px',
                              boxShadow: '0 2px 12px rgba(22,163,74,0.25)',
                            } : {
                              background: 'rgba(255,255,255,0.07)',
                              border: '1px solid rgba(255,255,255,0.08)',
                              borderBottomLeftRadius: '4px',
                            }}
                          >
                            <p className="text-white leading-relaxed">{msg.content}</p>
                            <p className="text-[11px] mt-1" style={{ color: isMe ? 'rgba(255,255,255,0.5)' : 'rgba(255,255,255,0.25)' }}>
                              {formatDistanceToNow(new Date(msg.createdAt), { addSuffix: true })}
                            </p>
                          </div>
                        </div>
                      );
                    })
                  )}
                  <div ref={messagesEndRef} />
                </div>

                {/* Input */}
                <form onSubmit={sendMessage} className="px-4 py-3.5 flex gap-3 border-t"
                  style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
                  <input
                    type="text"
                    value={newMessage}
                    onChange={e => setNewMessage(e.target.value)}
                    placeholder={`Message ${activeChat.otherName}...`}
                    disabled={sending}
                    className="flex-1 px-4 py-3 rounded-xl text-sm text-white placeholder-white/20 outline-none transition"
                    style={{
                      background: 'rgba(255,255,255,0.06)',
                      border: '1px solid rgba(255,255,255,0.08)',
                    }}
                    onFocus={e => e.target.style.borderColor = 'rgba(74,222,128,0.4)'}
                    onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.08)'}
                  />
                  <button type="submit" disabled={sending || !newMessage.trim()}
                    className="w-11 h-11 rounded-xl flex items-center justify-center text-white transition-all active:scale-95 disabled:opacity-40 shrink-0"
                    style={{
                      background: newMessage.trim()
                        ? 'linear-gradient(135deg,#16a34a,#15803d)'
                        : 'rgba(255,255,255,0.06)',
                      boxShadow: newMessage.trim() ? '0 4px 16px rgba(22,163,74,0.3)' : 'none',
                    }}>
                    <Send size={16} />
                  </button>
                </form>
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

// === ONLY ONE EXPORT DEFAULT ===
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