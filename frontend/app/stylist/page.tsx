"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { API_BASE_URL, getImageUrl } from "@/lib/api";
import { getStoredUser, getAuthHeaders, User } from "@/lib/auth";

type WardrobeItem = {
  id: number;
  user_id: number;
  category: string;
  color: string;
  fit: string | null;
  pattern: string | null;
  style: string | null;
  image_url: string | null;
};

type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  recommended_items?: WardrobeItem[];
  occasion?: string | null;
  timestamp: string;
};

const QUICK_PROMPTS = [
  "What should I wear to a dinner date?",
  "I have an interview, help me dress sharp and professional.",
  "Give me an effortless casual campus look.",
  "What's a stylish outfit for a weekend party?",
  "How should I style my sneakers with what I have?",
];

export default function StylistPage() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [wardrobeCount, setWardrobeCount] = useState<number | null>(null);
  const [savingOutfitId, setSavingOutfitId] = useState<string | null>(null);
  const [savedSuccessId, setSavedSuccessId] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto scroll to bottom of chat
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  useEffect(() => {
    const user = getStoredUser();
    if (!user) {
      router.push("/login");
      return;
    }
    setCurrentUser(user);

    // Initial greeting
    setMessages([
      {
        id: "welcome",
        role: "assistant",
        content: `Hi **${user.name}**! 👋 I'm your **WearWise Personal Stylist**.\n\nI have real-time access to your wardrobe and style preferences. Ask me for outfit recommendations for any occasion, advice on pairing colors, or how to wear a specific item from your closet.`,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      },
    ]);

    // Fetch wardrobe count to provide contextual alerts
    const fetchWardrobeCount = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/wardrobe/${user.id}`, {
          headers: getAuthHeaders(),
        });
        if (res.ok) {
          const items: WardrobeItem[] = await res.json();
          setWardrobeCount(items.length);
        }
      } catch (err) {
        console.error("Could not check wardrobe status:", err);
      }
    };

    fetchWardrobeCount();
  }, [router]);

  const sendMessage = async (textToSend?: string) => {
    const messageContent = (textToSend || input).trim();
    if (!messageContent || loading || !currentUser) return;

    setInput("");

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: "user",
      content: messageContent,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    setLoading(true);

    try {
      // Build history payload (last 6 messages, exclude welcome message id)
      const historyPayload = updatedMessages
        .filter((m) => m.id !== "welcome")
        .slice(-6)
        .map((m) => ({
          role: m.role,
          content: m.content,
        }));

      const res = await fetch(`${API_BASE_URL}/stylist/chat`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({
          message: messageContent,
          history: historyPayload.slice(0, -1), // previous history excluding the current message
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.detail || "Stylist service encountered an issue.");
      }

      const data = await res.json();

      const assistantMessage: ChatMessage = {
        id: `assistant-${Date.now()}`,
        role: "assistant",
        content: data.reply || "Here is what I recommend for your look.",
        recommended_items: data.recommended_items || [],
        occasion: data.occasion || null,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (err: unknown) {
      console.error(err);
      const errorMessage: ChatMessage = {
        id: `error-${Date.now()}`,
        role: "assistant",
        content:
          err instanceof Error
            ? `⚠️ ${err.message}`
            : "⚠️ I couldn't process that styling request right now. Please verify your connection and try again.",
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setLoading(false);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  // Helper to save a complete 3-piece look directly to Lookbook
  const saveRecommendedLook = async (
    items: WardrobeItem[],
    occasion: string | null | undefined,
    messageId: string
  ) => {
    if (!currentUser || items.length < 3) return;

    const top = items.find((i) =>
      ["tshirt", "t-shirt", "shirt", "top", "blazer", "polo", "sweater", "hoodie"].includes(
        i.category.toLowerCase()
      )
    );
    const bottom = items.find((i) =>
      ["jeans", "pants", "trousers", "chinos", "shorts", "bottom", "joggers"].includes(
        i.category.toLowerCase()
      )
    );
    const shoes = items.find((i) =>
      ["shoes", "sneakers", "boots", "loafers", "footwear"].includes(i.category.toLowerCase())
    );

    if (!top || !bottom || !shoes) {
      alert("A complete look requires a top, bottom, and footwear to save to your Lookbook.");
      return;
    }

    setSavingOutfitId(messageId);
    try {
      const res = await fetch(`${API_BASE_URL}/outfits/${currentUser.id}/save`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({
          top_id: top.id,
          bottom_id: bottom.id,
          shoes_id: shoes.id,
          occasion: occasion || "casual",
          style_vibe: top.style || null,
          score: 95,
          explanation: `Curated by AI Stylist: ${top.color} ${top.category} + ${bottom.color} ${bottom.category} + ${shoes.color} ${shoes.category}`,
        }),
      });

      if (!res.ok) throw new Error("Could not save outfit to lookbook");

      setSavedSuccessId(messageId);
      setTimeout(() => setSavedSuccessId(null), 4000);
    } catch (err) {
      console.error(err);
      alert("Failed to save outfit to Lookbook. Please try again.");
    } finally {
      setSavingOutfitId(null);
    }
  };

  return (
    <main className="flex min-h-[calc(100vh-65px)] flex-col bg-[#f7f7f5]">
      {/* Top Banner / Header */}
      <div className="border-b border-gray-200 bg-white px-5 py-4 sm:px-8">
        <div className="mx-auto flex max-w-5xl items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-black text-xl text-white shadow-sm">
              ✨
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-bold tracking-tight text-gray-950 sm:text-xl">
                  WearWise Stylist
                </h1>
                <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider text-emerald-700 border border-emerald-200">
                  Online
                </span>
              </div>
              <p className="text-xs text-gray-500">
                Personalized advice tailored to your closet and profile
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {wardrobeCount !== null && (
              <Link
                href="/wardrobe"
                className="hidden rounded-xl border border-gray-200 bg-gray-50 px-3.5 py-1.5 text-xs font-semibold text-gray-700 transition hover:bg-gray-100 sm:inline-flex items-center gap-1.5"
              >
                <span>👕 {wardrobeCount} pieces in closet</span>
              </Link>
            )}
            <Link
              href="/saved"
              className="rounded-xl border border-gray-200 bg-white px-3.5 py-1.5 text-xs font-semibold text-gray-700 transition hover:bg-gray-50 hover:text-black"
            >
              Saved Looks →
            </Link>
          </div>
        </div>
      </div>

      {/* Wardrobe Reminder Alert if Empty */}
      {wardrobeCount === 0 && (
        <div className="mx-auto mt-4 max-w-5xl px-4 sm:px-6 w-full">
          <div className="flex items-center justify-between gap-4 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-xs text-amber-900 shadow-sm">
            <div className="flex items-center gap-2.5">
              <span className="text-lg">💡</span>
              <span>
                Your wardrobe is currently empty! Add a few tops, bottoms, and shoes in your{" "}
                <strong>Wardrobe</strong> so I can recommend your actual clothes.
              </span>
            </div>
            <Link
              href="/wardrobe"
              className="shrink-0 rounded-lg bg-amber-900 px-3 py-1.5 font-semibold text-white transition hover:bg-amber-950"
            >
              + Add Clothes
            </Link>
          </div>
        </div>
      )}

      {/* Chat Messages Area */}
      <div className="mx-auto flex-1 w-full max-w-5xl px-4 py-6 sm:px-6">
        <div className="space-y-6">
          {messages.map((message) => {
            const isUser = message.role === "user";
            return (
              <div
                key={message.id}
                className={`flex gap-3.5 ${isUser ? "justify-end" : "justify-start"}`}
              >
                {!isUser && (
                  <div className="flex h-9 w-9 shrink-0 select-none items-center justify-center rounded-2xl bg-black text-sm text-white shadow-sm mt-0.5">
                    ✦
                  </div>
                )}

                <div className={`max-w-[88%] sm:max-w-[78%] ${isUser ? "items-end" : "items-start"}`}>
                  {/* Occasion pill if present */}
                  {!isUser && message.occasion && (
                    <div className="mb-1.5 flex items-center gap-2">
                      <span className="rounded-full bg-gray-100 px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider text-gray-700 border border-gray-200">
                        {message.occasion} Vibe
                      </span>
                    </div>
                  )}

                  {/* Message bubble */}
                  <div
                    className={`rounded-3xl px-5 py-4 shadow-sm text-sm leading-relaxed ${
                      isUser
                        ? "bg-black text-white rounded-tr-none"
                        : "bg-white text-gray-900 border border-gray-200 rounded-tl-none"
                    }`}
                  >
                    <FormattedMessage content={message.content} isUser={isUser} />
                  </div>

                  {/* Recommended wardrobe pieces embedded */}
                  {!isUser && message.recommended_items && message.recommended_items.length > 0 && (
                    <div className="mt-3 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
                      <div className="flex items-center justify-between mb-3">
                        <p className="text-xs font-bold uppercase tracking-wider text-gray-500">
                          Recommended Pieces From Your Closet
                        </p>
                        {message.recommended_items.length >= 3 && (
                          <button
                            onClick={() =>
                              saveRecommendedLook(
                                message.recommended_items!,
                                message.occasion,
                                message.id
                              )
                            }
                            disabled={
                              savingOutfitId === message.id || savedSuccessId === message.id
                            }
                            className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition ${
                              savedSuccessId === message.id
                                ? "bg-emerald-100 text-emerald-800"
                                : "bg-black text-white hover:bg-gray-800 disabled:opacity-50"
                            }`}
                          >
                            {savingOutfitId === message.id
                              ? "Saving..."
                              : savedSuccessId === message.id
                              ? "✓ Saved to Lookbook"
                              : "★ Save Look"}
                          </button>
                        )}
                      </div>

                      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                        {message.recommended_items.map((item) => (
                          <div
                            key={item.id}
                            className="rounded-xl border border-gray-100 bg-[#f9f9f8] p-3 text-center transition hover:border-gray-300"
                          >
                            <div className="mx-auto mb-2 aspect-[4/4.5] overflow-hidden rounded-lg bg-gray-100">
                              {item.image_url ? (
                                <img
                                  src={getImageUrl(item.image_url) || ""}
                                  alt={`${item.color} ${item.category}`}
                                  className="h-full w-full object-cover"
                                />
                              ) : (
                                <div className="flex h-full items-center justify-center text-3xl">
                                  👕
                                </div>
                              )}
                            </div>
                            <p className="truncate text-xs font-bold capitalize text-gray-900">
                              {item.color} {item.category}
                            </p>
                            <div className="mt-1 flex items-center justify-center gap-1 text-[11px] text-gray-500 capitalize">
                              {item.fit && <span>{item.fit}</span>}
                              {item.style && <span>· {item.style}</span>}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Timestamp */}
                  <p
                    className={`mt-1 text-[10px] text-gray-400 px-1 ${
                      isUser ? "text-right" : "text-left"
                    }`}
                  >
                    {message.timestamp}
                  </p>
                </div>
              </div>
            );
          })}

          {/* Typing indicator */}
          {loading && (
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-black text-sm text-white shadow-sm">
                ✦
              </div>
              <div className="rounded-3xl rounded-tl-none border border-gray-200 bg-white px-5 py-4 shadow-sm">
                <div className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-gray-400 animate-bounce" />
                  <span className="h-2 w-2 rounded-full bg-gray-400 animate-bounce [animation-delay:0.15s]" />
                  <span className="h-2 w-2 rounded-full bg-gray-400 animate-bounce [animation-delay:0.3s]" />
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Quick suggestions row */}
      <div className="border-t border-gray-200 bg-white/70 backdrop-blur px-4 pt-3 pb-2 sm:px-6">
        <div className="mx-auto max-w-5xl">
          <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
            <span className="text-xs font-semibold text-gray-400 shrink-0">Try asking:</span>
            {QUICK_PROMPTS.map((prompt, idx) => (
              <button
                key={idx}
                onClick={() => sendMessage(prompt)}
                disabled={loading}
                className="shrink-0 rounded-full border border-gray-200 bg-white px-3.5 py-1.5 text-xs font-medium text-gray-700 transition hover:border-gray-400 hover:bg-gray-50 active:scale-95 disabled:opacity-50"
              >
                {prompt}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Chat input box */}
      <div className="border-t border-gray-200 bg-white px-4 py-4 sm:px-6">
        <div className="mx-auto max-w-5xl">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              sendMessage();
            }}
            className="flex items-center gap-3"
          >
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask your stylist (e.g., 'What can I pair with my blue jeans?')..."
              disabled={loading}
              className="h-12 flex-1 rounded-2xl border border-gray-200 bg-gray-50 px-4 text-sm text-gray-900 placeholder:text-gray-400 outline-none transition focus:border-black focus:bg-white focus:ring-1 focus:ring-black"
            />
            <button
              type="submit"
              disabled={!input.trim() || loading}
              className="h-12 rounded-2xl bg-black px-6 text-sm font-semibold text-white shadow-sm transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Send
            </button>
          </form>
          <p className="mt-2 text-center text-[11px] text-gray-400">
            WearWise Stylist provides customized advice based on the clothes in your digital closet.
          </p>
        </div>
      </div>
    </main>
  );
}

/**
 * Lightweight parser to format bold text (**word**), pro-tips, and line breaks cleanly
 */
function FormattedMessage({ content, isUser }: { content: string; isUser: boolean }) {
  if (isUser) {
    return <span>{content}</span>;
  }

  const lines = content.split("\n");

  return (
    <div className="space-y-2">
      {lines.map((line, lineIdx) => {
        if (!line.trim()) {
          return <div key={lineIdx} className="h-1" />;
        }

        // Highlight pro-tips with custom styling
        if (line.includes("Stylist Pro-Tip:")) {
          return (
            <div
              key={lineIdx}
              className="my-2 rounded-xl bg-amber-50/80 border border-amber-200/70 p-3 text-xs text-amber-950 font-medium"
            >
              <RenderMarkdownLine line={line} />
            </div>
          );
        }

        return (
          <p key={lineIdx} className="leading-relaxed">
            <RenderMarkdownLine line={line} />
          </p>
        );
      })}
    </div>
  );
}

function RenderMarkdownLine({ line }: { line: string }) {
  // Split on bold syntax: **bold text**
  const parts = line.split(/(\*\*[^*]+\*\*)/g);

  return (
    <>
      {parts.map((part, i) => {
        if (part.startsWith("**") && part.endsWith("**")) {
          return (
            <strong key={i} className="font-semibold text-gray-950">
              {part.slice(2, -2)}
            </strong>
          );
        }
        return <span key={i}>{part}</span>;
      })}
    </>
  );
}
