// app/components/ChatbotSidebar.tsx
"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type Message = {
  id: string;
  text: string;
  isUser: boolean;
  timestamp: Date;
};

type Props = {
  /** Headlines from the page for context */
  articleTitles?: string[];
  /** Set to false to disable auto suggestions and provide your own */
  autoSuggest?: boolean;
  /** Desired number of suggestions (3–6) */
  suggestionCount?: number;
  /** Fallback suggestions if autoSuggest is false or API fails */
  suggestions?: string[];
  /** Tailwind class to control height */
  heightClass?: string;
};

/* ---------- Minimal Markdown rendering ---------- */
function escapeHtml(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
function formatInline(raw: string) {
  let t = escapeHtml(raw);
  t = t.replace(
    /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g,
    `<a href="$2" target="_blank" rel="noopener noreferrer" class="text-blue-600 underline hover:text-blue-800">$1</a>`
  );
  t = t.replace(
    /`([^`]+)`/g,
    `<code class="rounded bg-neutral-100 px-1 py-0.5 font-mono text-[0.85em]">$1</code>`
  );
  t = t.replace(
    /(\*\*|__)(.+?)\1/g,
    `<strong class="font-semibold">$2</strong>`
  );
  t = t.replace(/(^|[^_])_([^_]+)_/g, `$1<em class="italic">$2</em>`);
  t = t.replace(/\n/g, "<br/>");
  return t;
}
function renderRichText(text: string) {
  const lines = text.split("\n");
  const isBulleted = lines.every((l) => /^\s*[-*•]\s+/.test(l.trim()));
  const isOrdered = lines.every((l) => /^\s*\d+\.\s+/.test(l.trim()));
  if (isBulleted) {
    return (
      <ul className="ml-5 list-disc space-y-1">
        {lines.map((l, i) => {
          const cleaned = l.replace(/^\s*[-*•]\s+/, "");
          return (
            <li
              key={i}
              dangerouslySetInnerHTML={{ __html: formatInline(cleaned) }}
            />
          );
        })}
      </ul>
    );
  }
  if (isOrdered) {
    return (
      <ol className="ml-5 list-decimal space-y-1">
        {lines.map((l, i) => {
          const cleaned = l.replace(/^\s*\d+\.\s+/, "");
          return (
            <li
              key={i}
              dangerouslySetInnerHTML={{ __html: formatInline(cleaned) }}
            />
          );
        })}
      </ol>
    );
  }
  return <div dangerouslySetInnerHTML={{ __html: formatInline(text) }} />;
}
/* ----------------------------------------------- */

const FALLBACK_SUGGESTIONS = [
  "Summarize today’s top 5 events",
  "Compare left vs right on the top story",
  "Explain likely bias markers here",
  "What changed since yesterday?",
];

export default function ChatbotSidebar({
  articleTitles = [],
  autoSuggest = true,
  suggestionCount = 4,
  suggestions = FALLBACK_SUGGESTIONS,
  heightClass = "h-[clamp(420px,66vh,760px)]",
}: Props) {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      text: "Hi! I'm your Polao assistant. I can analyze bias, compare sources, and summarize events. Choose a suggestion below or ask anything.",
      isUser: false,
      timestamp: new Date(),
    },
  ]);
  const [showSuggestions, setShowSuggestions] = useState(true);
  const [suggestionsState, setSuggestionsState] =
    useState<string[]>(suggestions);
  const [suggestionsLoading, setSuggestionsLoading] = useState(false);

  const [inputText, setInputText] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "end",
    });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "0px";
    const newHeight = Math.min(160, el.scrollHeight);
    el.style.height = newHeight + "px";
  }, [inputText]);

  // Auto-fetch Gemini suggestions when titles change
  useEffect(() => {
    if (!autoSuggest) return;
    let cancelled = false;
    (async () => {
      try {
        setSuggestionsLoading(true);
        const res = await fetch("/api/chatbot/suggest", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            titles: articleTitles?.slice(0, 25) ?? [],
            count: suggestionCount,
          }),
        });
        const json = await res.json();
        if (
          !cancelled &&
          Array.isArray(json?.suggestions) &&
          json.suggestions.length
        ) {
          setSuggestionsState(json.suggestions.slice(0, suggestionCount));
        } else if (!cancelled) {
          setSuggestionsState(suggestions.slice(0, suggestionCount));
        }
      } catch {
        if (!cancelled)
          setSuggestionsState(suggestions.slice(0, suggestionCount));
      } finally {
        if (!cancelled) setSuggestionsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [autoSuggest, articleTitles, suggestionCount, suggestions]);

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
    setInputText("");
    setIsLoading(true);

    try {
      const response = await fetch("/api/chatbot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: text,
          context: "news analysis and bias detection",
          titles: articleTitles.slice(0, 25),
        }),
      });

      const data = await response.json();

      const botMessage: Message = {
        id: (Date.now() + 1).toString(),
        text:
          data.response ||
          "I'm sorry, I couldn't process your request. Please try again.",
        isUser: false,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, botMessage]);
    } catch (error) {
      console.error("Error calling chatbot API:", error);
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

  const handleSuggestionClick = (text: string) => {
    setShowSuggestions(false);
    sendMessage(text);
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.key === "Enter" || e.key === "NumpadEnter") && !e.shiftKey) {
      e.preventDefault();
      sendMessage(inputText);
    }
  };

  return (
    <div className="sticky top-4">
      <div
        className={`flex ${heightClass} w-full flex-col overflow-hidden py-6 px-2 bg-white shadow-sm ring-1 ring-gray-200/60`}
      >
        {/* header */}
        <div className="flex items-center justify-between px-3 py-2">
          <div className="min-w-0">
            <h3 className="truncate text-lg font-semibold text-gray-900">
              Polao Assistant
            </h3>
            <p className="text-[11px] text-gray-500">
              Bias & trends • Quick answers
            </p>
          </div>
          <button
            onClick={() => {
              setMessages((m) => (m.length ? [m[0]] : []));
              setShowSuggestions(true);
            }}
            className=" px-2 py-1 text-[11px] text-gray-600 ring-1 ring-gray-200 hover:bg-gray-50"
            title="New chat"
          >
            New
          </button>
        </div>

        {/* messages */}
        <div className="flex-1 space-y-2 overflow-y-auto bg-gray-50/60 p-3">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${
                message.isUser ? "justify-end" : "justify-start"
              }`}
            >
              <div
                className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm shadow-sm ${
                  message.isUser
                    ? "rounded-br-sm bg-blue-600 text-white"
                    : "rounded-bl-sm bg-[#f7f6f2] text-gray-900 ring-1 ring-gray-100"
                }`}
              >
                <div>{renderRichText(message.text)}</div>
                <p
                  className={`mt-1 text-[10px] ${
                    message.isUser ? "text-blue-100" : "text-gray-500"
                  }`}
                >
                  {message.timestamp.toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
              </div>
            </div>
          ))}

          {/* Suggestions inline (one-time) */}
          {showSuggestions && (
            <div className="flex justify-start">
              <div className="rounded-2xl px-3 py-2 text-sm text-gray-900 ring-1 ring-gray-100">
                <div className="mb-1 text-[11px] uppercase tracking-wide text-gray-500">
                  Suggested
                </div>

                {suggestionsLoading && !suggestionsState.length ? (
                  <div className="flex flex-wrap gap-2">
                    {Array.from({ length: 4 }).map((_, i) => (
                      <span
                        key={i}
                        className="h-7 w-40 animate-pulse rounded-full bg-gray-100"
                      />
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {(suggestionsState.length
                      ? suggestionsState
                      : FALLBACK_SUGGESTIONS
                    ).map((s, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => handleSuggestionClick(s)}
                        className="rounded-full bg-[#f7f6f2] px-3 py-1 text-xs text-gray-700 ring-1 ring-gray-200 hover:bg-[#f7f6f2]/90 hover:shadow-sm"
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {isLoading && (
            <div className="flex justify-start">
              <div className="rounded-2xl bg-white px-3 py-2 text-sm text-gray-700 ring-1 ring-gray-100">
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
        <div className="bg-white p-2">
          <form onSubmit={handleSubmit} className="flex items-end gap-2">
            <div className="flex-1">
              <label htmlFor="chat-input" className="sr-only">
                Message the assistant
              </label>
              <div className="relative">
                <textarea
                  id="chat-input"
                  ref={textareaRef}
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  onKeyDown={onKeyDown}
                  placeholder="Ask me about bias, trends, or news..."
                  rows={1}
                  className="block w-full resize-none overflow-hidden rounded-md border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 disabled:opacity-60"
                  disabled={isLoading}
                />
              </div>
            </div>
            <button
              type="submit"
              disabled={isLoading || !inputText.trim()}
              className="inline-flex h-9 items-center justify-center rounded-md bg-blue-600 px-3.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 disabled:cursor-not-allowed disabled:opacity-50 px-2"
            >
              Send
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
