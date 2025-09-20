'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

interface Message {
  id: string;
  text: string;
  isUser: boolean;
  timestamp: Date;
}

interface TrendingTopic {
  id: string;
  title: string;
  category: string;
  bias: 'left' | 'center' | 'right' | string;
}

const trendingTopics: TrendingTopic[] = [
  { id: '1', title: 'Climate Summit Agreement', category: 'Environment', bias: 'center' },
  { id: '2', title: 'Tech Regulation Updates', category: 'Technology', bias: 'left' },
  { id: '3', title: 'Economic Growth Q3', category: 'Business', bias: 'right' },
  { id: '4', title: 'Medical Breakthrough', category: 'Health', bias: 'center' },
  { id: '5', title: 'Space Mission Launch', category: 'Science', bias: 'center' },
];

// 👇 add "sidebar" here
type Mode = 'overlay' | 'widget' | 'sidebar';

type Props = {
  /**
   * overlay: full-screen drawer with backdrop (uses isOpen/onClose)
   * widget: always-visible small window, bottom-right of the page
   * sidebar: always-visible panel for a layout column
   */
  mode?: Mode;
  isOpen?: boolean;
  onClose?: () => void;
};

export default function ChatbotSidebar({ mode = 'overlay', isOpen = false, onClose }: Props) {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      text:
        "Hi! I'm your Polao news assistant. I can help you analyze news bias, find trending topics, and answer questions about current events. What would you like to know?",
      isUser: false,
      timestamp: new Date(),
    },
  ]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, []);

  const getBiasColor = (bias: string) => {
    switch (bias) {
      case 'left':
        return 'bg-blue-100 text-blue-800 ring-blue-200';
      case 'right':
        return 'bg-red-100 text-red-800 ring-red-200';
      case 'center':
        return 'bg-green-100 text-green-800 ring-green-200';
      default:
        return 'bg-gray-100 text-gray-800 ring-gray-200';
    }
  };

  useEffect(() => {
    if (mode === 'overlay' && !isOpen) return;
    scrollToBottom();
  }, [messages, isOpen, mode, scrollToBottom]);

  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = '0px';
    const newHeight = Math.min(160, el.scrollHeight);
    el.style.height = newHeight + 'px';
  }, [inputText]);

  useEffect(() => {
    if (mode !== 'overlay' || !isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose?.();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, mode, onClose]);

  const sendMessage = async (textRaw: string) => {
    const text = textRaw.trim();
    if (!text) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      text,
      isUser: true,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputText('');
    setIsLoading(true);

    try {
      const response = await fetch('/api/chatbot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text, context: 'news analysis and bias detection' }),
      });

      const data = await response.json();

      const botMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: data.response || "I'm sorry, I couldn't process your request. Please try again.",
        isUser: false,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, botMessage]);
    } catch (error) {
      console.error('Error calling chatbot API:', error);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: "I'm sorry, I'm having trouble connecting right now. Please try again later.",
        isUser: false,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(inputText);
  };

  const handleTrendingClick = (topic: TrendingTopic) => {
    const message = `Tell me about the bias analysis for "${topic.title}" in the ${topic.category} category.`;
    sendMessage(message);
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.key === 'Enter' || e.key === 'NumpadEnter') && !e.shiftKey) {
      e.preventDefault();
      sendMessage(inputText);
    }
  };

  // ---------- SIDEBAR MODE (always open in a layout column) ----------
  if (mode === 'sidebar') {
    return (
      <div className="sticky top-4">
        <div className="flex h-[calc(100vh-8rem)] w-full flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
          {/* header */}
          <div className="flex items-center justify-between border-b bg-gray-50/80 px-3 py-2">
            <div className="min-w-0">
              <h3 className="truncate text-sm font-semibold text-gray-900">News Assistant</h3>
              <p className="text-[11px] text-gray-500">Bias & trend insights</p>
            </div>
            <button
              onClick={() => setMessages((m) => m.filter((x) => x.id === 'welcome'))}
              className="rounded-md border border-gray-200 px-2 py-1 text-[11px] text-gray-600 hover:bg-white hover:shadow-sm"
              title="New chat"
            >
              New
            </button>
          </div>

          {/* trending */}
          <div className="border-b bg-white/60 px-3 py-2">
            <div className="flex items-center justify-between">
              <h4 className="text-[12px] font-medium text-gray-900">Trending</h4>
              <span className="text-[10px] text-gray-500">Tap to ask</span>
            </div>
            <div className="mt-2 flex w-full snap-x snap-mandatory gap-2 overflow-x-auto pb-1">
              {trendingTopics.map((topic) => (
                <button
                  key={topic.id}
                  onClick={() => handleTrendingClick(topic)}
                  className="snap-start whitespace-nowrap rounded-full border border-gray-200 bg-gray-50 px-2.5 py-1 text-[11px] text-gray-700 hover:bg-white hover:shadow-sm"
                >
                  <span className="mr-2 truncate font-medium">{topic.title}</span>
                  <span className={`rounded-full px-2 py-0.5 text-[10px] ring-1 ${getBiasColor(topic.bias)}`}>
                    {topic.bias}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* messages */}
          <div className="flex-1 space-y-2 overflow-y-auto bg-gray-50/60 p-3">
            {messages.map((message) => (
              <div key={message.id} className={`flex ${message.isUser ? 'justify-end' : 'justify-start'}`}>
                <div
                  className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm shadow-sm ${
                    message.isUser
                      ? 'bg-blue-600 text-white rounded-br-sm'
                      : 'bg-white text-gray-900 border border-gray-100 rounded-bl-sm'
                  }`}
                >
                  <p className="whitespace-pre-wrap leading-relaxed">{message.text}</p>
                  <p className={`mt-1 text-[10px] ${message.isUser ? 'text-blue-100' : 'text-gray-500'}`}>
                    {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </div>
            ))}

            {isLoading && (
              <div className="flex justify-start">
                <div className="rounded-2xl border border-gray-100 bg-white px-3 py-2 text-sm text-gray-700 shadow-sm">
                  <div className="flex items-center gap-1">
                    <span className="h-2 w-2 animate-bounce rounded-full bg-gray-400 [animation-delay:-0.1s]" />
                    <span className="h-2 w-2 animate-bounce rounded-full bg-gray-400" />
                    <span className="h-2 w-2 animate-bounce rounded-full bg-gray-400 [animation-delay:0.1s]" />
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* input */}
          <div className="border-t bg-white/90 p-2.5">
            <form onSubmit={handleSubmit} className="flex items-end gap-2">
              <div className="flex-1">
                <label htmlFor="chat-input" className="sr-only">Message the assistant</label>
                <div className="relative">
                  <textarea
                    id="chat-input"
                    ref={textareaRef}
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    onKeyDown={onKeyDown}
                    placeholder="Ask about bias, sources, trends..."
                    rows={1}
                    className="block w-full resize-none rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30 disabled:opacity-60"
                    disabled={isLoading}
                  />
                  <div className="pointer-events-none absolute bottom-2 right-3 text-[10px] text-gray-400">
                    Enter ↵ • Shift+Enter = newline
                  </div>
                </div>
              </div>
              <button
                type="submit"
                disabled={isLoading || !inputText.trim()}
                className="inline-flex h-9 items-center justify-center rounded-xl bg-blue-600 px-3.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500/30 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Send
              </button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  // ---------- WIDGET MODE (floating bottom-right) ----------
  if (mode === 'widget') {
    return (
      <div className="pointer-events-auto fixed bottom-4 right-4 z-40">
        <div className="flex h-[520px] w-[360px] flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-2xl">
          {/* header */}
          <div className="flex items-center justify-between border-b bg-gray-50/80 px-3 py-2">
            <div className="min-w-0">
              <h3 className="truncate text-sm font-semibold text-gray-900">News Assistant</h3>
              <p className="text-[11px] text-gray-500">Bias & trend insights</p>
            </div>
            <button
              onClick={() => setMessages((m) => m.filter((x) => x.id === 'welcome'))}
              className="rounded-md border border-gray-200 px-2 py-1 text-[11px] text-gray-600 hover:bg-white hover:shadow-sm"
              title="New chat"
            >
              New
            </button>
          </div>

          {/* trending */}
          <div className="border-b bg-white/60 px-3 py-2">
            <div className="flex items-center justify-between">
              <h4 className="text-[12px] font-medium text-gray-900">Trending</h4>
              <span className="text-[10px] text-gray-500">Tap to ask</span>
            </div>
            <div className="mt-2 flex w-full snap-x snap-mandatory gap-2 overflow-x-auto pb-1">
              {trendingTopics.map((topic) => (
                <button
                  key={topic.id}
                  onClick={() => handleTrendingClick(topic)}
                  className="snap-start whitespace-nowrap rounded-full border border-gray-200 bg-gray-50 px-2.5 py-1 text-[11px] text-gray-700 hover:bg-white hover:shadow-sm"
                >
                  <span className="mr-2 truncate font-medium">{topic.title}</span>
                  <span className={`rounded-full px-2 py-0.5 text-[10px] ring-1 ${getBiasColor(topic.bias)}`}>
                    {topic.bias}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* messages */}
          <div className="flex-1 space-y-2 overflow-y-auto bg-gray-50/60 p-3">
            {messages.map((message) => (
              <div key={message.id} className={`flex ${message.isUser ? 'justify-end' : 'justify-start'}`}>
                <div
                  className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm shadow-sm ${
                    message.isUser
                      ? 'bg-blue-600 text-white rounded-br-sm'
                      : 'bg-white text-gray-900 border border-gray-100 rounded-bl-sm'
                  }`}
                >
                  <p className="whitespace-pre-wrap leading-relaxed">{message.text}</p>
                  <p className={`mt-1 text-[10px] ${message.isUser ? 'text-blue-100' : 'text-gray-500'}`}>
                    {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex justify-start">
                <div className="rounded-2xl border border-gray-100 bg-white px-3 py-2 text-sm text-gray-700 shadow-sm">
                  <div className="flex items-center gap-1">
                    <span className="h-2 w-2 animate-bounce rounded-full bg-gray-400 [animation-delay:-0.1s]" />
                    <span className="h-2 w-2 animate-bounce rounded-full bg-gray-400" />
                    <span className="h-2 w-2 animate-bounce rounded-full bg-gray-400 [animation-delay:0.1s]" />
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* input */}
          <div className="border-t bg-white/90 p-2.5">
            <form onSubmit={handleSubmit} className="flex items-end gap-2">
              <div className="flex-1">
                <label htmlFor="chat-input" className="sr-only">Message the assistant</label>
                <div className="relative">
                  <textarea
                    id="chat-input"
                    ref={textareaRef}
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    onKeyDown={onKeyDown}
                    placeholder="Ask about bias, sources, trends..."
                    rows={1}
                    className="block w-full resize-none rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30 disabled:opacity-60"
                    disabled={isLoading}
                  />
                  <div className="pointer-events-none absolute bottom-2 right-3 text-[10px] text-gray-400">
                    Enter ↵ • Shift+Enter = newline
                  </div>
                </div>
              </div>
              <button
                type="submit"
                disabled={isLoading || !inputText.trim()}
                className="inline-flex h-9 items-center justify-center rounded-xl bg-blue-600 px-3.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500/30 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Send
              </button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  // ---------- OVERLAY MODE (full-screen drawer) ----------
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50" aria-labelledby="chatbot-title" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-black/40 transition-opacity" onClick={onClose} />
      <div className="absolute right-0 top-0 h-full w-full max-w-md translate-x-0 animate-[slideIn_.2s_ease-out]">
        <div className="flex h-full flex-col bg-white shadow-2xl">
          <div className="flex items-center justify-between border-b bg-gray-50/80 px-4 py-3 backdrop-blur">
            <div className="min-w-0">
              <h3 id="chatbot-title" className="truncate text-lg font-semibold text-gray-900">
                News Assistant
              </h3>
              <p className="text-xs text-gray-500">Unbiased analysis • Fast answers</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setMessages((m) => m.filter((x) => x.id === 'welcome'))}
                className="rounded-md border border-gray-200 px-2 py-1 text-xs text-gray-600 hover:bg-white hover:shadow-sm"
                title="New chat"
              >
                New
              </button>
              <button
                onClick={onClose}
                className="rounded-md p-2 text-gray-400 hover:bg-gray-200 hover:text-gray-600"
                aria-label="Close chat"
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          {/* trending */}
          <div className="border-b bg-white/60 px-4 py-2">
            <div className="flex items-center justify-between">
              <h4 className="text-[13px] font-medium text-gray-900">Trending</h4>
              <span className="text-[11px] text-gray-500">Tap to ask</span>
            </div>
            <div className="mt-2 flex w-full snap-x snap-mandatory gap-2 overflow-x-auto pb-2">
              {trendingTopics.map((topic) => (
                <button
                  key={topic.id}
                  onClick={() => handleTrendingClick(topic)}
                  className="snap-start whitespace-nowrap rounded-full border border-gray-200 bg-gray-50 px-3 py-1 text-xs text-gray-700 hover:bg-white hover:shadow-sm"
                >
                  <span className="mr-2 truncate font-medium">{topic.title}</span>
                  <span className={`rounded-full px-2 py-0.5 text-[10px] ring-1 ${getBiasColor(topic.bias)}`}>
                    {topic.bias}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* messages */}
          <div className="flex-1 space-y-3 overflow-y-auto bg-gray-50/60 p-4">
            {messages.map((message) => (
              <div key={message.id} className={`flex ${message.isUser ? 'justify-end' : 'justify-start'}`}>
                <div
                  className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm shadow-sm ${
                    message.isUser
                      ? 'bg-blue-600 text-white rounded-br-sm'
                      : 'bg-white text-gray-900 border border-gray-100 rounded-bl-sm'
                  }`}
                >
                  <p className="whitespace-pre-wrap leading-relaxed">{message.text}</p>
                  <p className={`mt-1 text-[10px] ${message.isUser ? 'text-blue-100' : 'text-gray-500'}`}>
                    {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex justify-start">
                <div className="rounded-2xl border border-gray-100 bg-white px-3 py-2 text-sm text-gray-700 shadow-sm">
                  <div className="flex items-center gap-1">
                    <span className="h-2 w-2 animate-bounce rounded-full bg-gray-400 [animation-delay:-0.1s]" />
                    <span className="h-2 w-2 animate-bounce rounded-full bg-gray-400" />
                    <span className="h-2 w-2 animate-bounce rounded-full bg-gray-400 [animation-delay:0.1s]" />
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* input */}
          <div className="border-t bg-white/90 p-3">
            <form onSubmit={handleSubmit} className="flex items-end gap-2">
              <div className="flex-1">
                <label htmlFor="chat-input" className="sr-only">Message the assistant</label>
                <div className="relative">
                  <textarea
                    id="chat-input"
                    ref={textareaRef}
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    onKeyDown={onKeyDown}
                    placeholder="Ask about news bias, sources, or trends..."
                    rows={1}
                    className="block w-full resize-none rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30 disabled:opacity-60"
                    disabled={isLoading}
                  />
                  <div className="pointer-events-none absolute bottom-2 right-3 text-[11px] text-gray-400">
                    Enter ↵ • Shift+Enter = newline
                  </div>
                </div>
              </div>
              <button
                type="submit"
                disabled={isLoading || !inputText.trim()}
                className="inline-flex h-9 items-center justify-center rounded-xl bg-blue-600 px-4 text-sm font-medium text-white shadow-sm transition-colors hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500/30 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Send
              </button>
            </form>
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes slideIn {
          from {
            transform: translateX(100%);
          }
          to {
            transform: translateX(0%);
          }
        }
      `}</style>
    </div>
  );
}
