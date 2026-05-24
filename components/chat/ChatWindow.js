'use client';
import { useState, useEffect, useRef } from 'react';
import { Send, ArrowLeft } from 'lucide-react';

export default function ChatWindow({ chatId, currentUserId, otherUserName, onBack }) {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [socket, setSocket] = useState(null);
  const messagesEndRef = useRef(null);

  // Auto scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    const socketInstance = new (require('socket.io-client').io)('http://localhost:3000');
    setSocket(socketInstance);

    socketInstance.emit('join_chat', chatId);

    socketInstance.on('receive_message', (message) => {
      setMessages(prev => [...prev, message]);
    });

    return () => socketInstance.disconnect();
  }, [chatId]);

  const sendMessage = () => {
    if (!newMessage.trim() || !socket) return;

    const messageData = {
      chatId,
      sender: currentUserId,
      message: newMessage.trim(),
      createdAt: new Date().toISOString(),
    };

    socket.emit('send_message', messageData);
    setMessages(prev => [...prev, messageData]);
    setNewMessage('');
  };

  return (
    <div className="flex flex-col h-[580px] bg-white dark:bg-gray-900 rounded-3xl overflow-hidden border dark:border-gray-800 shadow-sm">
      {/* Header */}
      <div className="px-6 py-4 border-b dark:border-gray-800 flex items-center gap-3 bg-gray-50 dark:bg-gray-950">
        {onBack && (
          <button onClick={onBack} className="lg:hidden p-2 -ml-2">
            <ArrowLeft size={22} />
          </button>
        )}
        <div className="w-10 h-10 rounded-full bg-green-600 flex items-center justify-center text-white font-semibold">
          {otherUserName?.charAt(0)}
        </div>
        <div>
          <p className="font-semibold">{otherUserName}</p>
          <p className="text-xs text-green-600">Online</p>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 p-6 overflow-y-auto space-y-6 bg-[#F8F9FA] dark:bg-gray-950">
        {messages.map((msg, index) => (
          <div
            key={index}
            className={`flex ${msg.sender === currentUserId ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[70%] px-5 py-3 rounded-3xl text-[15px] leading-relaxed ${
                msg.sender === currentUserId
                  ? 'bg-green-600 text-white rounded-br-none'
                  : 'bg-white dark:bg-gray-800 dark:text-white rounded-bl-none shadow-sm'
              }`}
            >
              {msg.message}
              <p className="text-[10px] mt-1 opacity-70 text-right">
                {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </p>
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="p-4 bg-white dark:bg-gray-900 border-t dark:border-gray-800">
        <div className="flex gap-3">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
            placeholder="Type a message..."
            className="flex-1 bg-gray-100 dark:bg-gray-800 rounded-full px-6 py-3 focus:outline-none focus:ring-2 focus:ring-green-500 text-[15px]"
          />
          <button
            onClick={sendMessage}
            disabled={!newMessage.trim()}
            className="bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white w-12 h-12 rounded-full flex items-center justify-center transition"
          >
            <Send size={20} />
          </button>
        </div>
      </div>
    </div>
  );
}