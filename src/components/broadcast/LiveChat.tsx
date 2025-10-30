'use client';

import { useState, useEffect, useRef } from 'react';
import { useSession } from 'next-auth/react';
import Image from 'next/image';

interface ChatMessage {
  id: string;
  message: string;
  userId: string;
  user: {
    id: string;
    name?: string;
    image?: string;
  };
  createdAt: string;
  isDeleted: boolean;
}

interface LiveChatProps {
  broadcastId: string;
  isPublisher?: boolean;
}

export default function LiveChat({ broadcastId, isPublisher = false }: LiveChatProps) {
  const { data: session } = useSession();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Scroll to bottom of messages
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Load initial messages
  const loadMessages = async () => {
    try {
      const response = await fetch(`/api/chat?broadcastId=${broadcastId}`);
      if (response.ok) {
        const data = await response.json();
        setMessages(data);
        scrollToBottom();
      }
    } catch (error) {
      console.error('Error loading messages:', error);
    }
  };

  // Poll for new messages
  useEffect(() => {
    loadMessages();

    // Poll every 2 seconds for new messages
    pollIntervalRef.current = setInterval(loadMessages, 2000);

    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
    };
  }, [broadcastId]);

  // Send message
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!newMessage.trim() || isSending || !session) return;

    setIsSending(true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          broadcastId,
          message: newMessage.trim(),
        }),
      });

      if (response.ok) {
        const sentMessage = await response.json();
        setMessages((prev) => [...prev, sentMessage]);
        setNewMessage('');
        scrollToBottom();
      } else {
        const error = await response.json();
        console.error('Error sending message:', error);
      }
    } catch (error) {
      console.error('Error sending message:', error);
    } finally {
      setIsSending(false);
    }
  };

  // Delete message
  const handleDeleteMessage = async (messageId: string) => {
    try {
      const response = await fetch(`/api/chat?id=${messageId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === messageId ? { ...msg, isDeleted: true } : msg
          )
        );
      }
    } catch (error) {
      console.error('Error deleting message:', error);
    }
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900">Live Chat</h3>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-2">
        {messages.length === 0 ? (
          <div className="text-center text-gray-500 py-8">
            <p>No messages yet</p>
            <p className="text-sm">Be the first to say hello!</p>
          </div>
        ) : (
          <div className="space-y-3">
            {messages.map((msg) => (
              <div key={msg.id} className="flex items-start gap-2">
                {msg.user.image ? (
                  <Image
                    src={msg.user.image}
                    alt={msg.user.name || 'User'}
                    width={32}
                    height={32}
                    className="rounded-full"
                  />
                ) : (
                  <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center text-xs font-medium text-gray-600">
                    {msg.user.name?.[0]?.toUpperCase() || 'U'}
                  </div>
                )}

                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline gap-2">
                    <span className="font-medium text-sm text-gray-900">
                      {msg.user.name || 'Anonymous'}
                    </span>
                    <span className="text-xs text-gray-500">
                      {formatTime(msg.createdAt)}
                    </span>
                  </div>
                  {msg.isDeleted ? (
                    <p className="text-sm text-gray-400 italic">Message deleted</p>
                  ) : (
                    <p className="text-sm text-gray-700 break-words">{msg.message}</p>
                  )}
                </div>

                {/* Delete button for message owner or broadcaster */}
                {!msg.isDeleted &&
                  session &&
                  (msg.userId === session.user.id || isPublisher) && (
                    <button
                      onClick={() => handleDeleteMessage(msg.id)}
                      className="text-gray-400 hover:text-red-500 p-1"
                      title="Delete message"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  )}
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Message input */}
      {session ? (
        <form onSubmit={handleSendMessage} className="p-4 border-t border-gray-200">
          <div className="flex gap-2">
            <input
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Type a message..."
              maxLength={500}
              disabled={isSending}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent disabled:opacity-50"
            />
            <button
              type="submit"
              disabled={isSending || !newMessage.trim()}
              className="px-4 py-2 bg-black text-white rounded-md hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Send
            </button>
          </div>
        </form>
      ) : (
        <div className="p-4 border-t border-gray-200 text-center">
          <p className="text-sm text-gray-500">
            <button
              onClick={() => window.location.href = '/login'}
              className="text-black hover:underline"
            >
              Sign in
            </button>
            {' '}to chat
          </p>
        </div>
      )}
    </div>
  );
}