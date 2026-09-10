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
  engine?: string | null;
  timestamp: string;
};

type EngineInfo = {
  engine: string;
  label: string;
  online: boolean;
};




const COLOR_MAP: Record<string, string> = {
  white: "#ffffff",
  black: "#171717",
  grey: "#71717a",
  beige: "#d4c5a9",
  blue: "#2563eb",
  green: "#16a34a",
  olive: "#556b2f",
  brown: "#78350f",
  maroon: "#881337",
};

function getItemRole(category: string): "Top" | "Bottom" | "Footwear" {
  const value = category.toLowerCase();
  if (value === "jeans" || value === "pants" || value === "trousers" || value === "bottom") {
    return "Bottom";
  }
  if (value === "shoes" || value === "sneakers" || value === "loafers" || value === "boots") {
    return "Footwear";
  }
  return "Top";
}

export default function StylistPage() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [wardrobeCount, setWardrobeCount] = useState<number | null>(null);
  const [savingOutfitId, setSavingOutfitId] = useState<string | null>(null);
  const [savedSuccessId, setSavedSuccessId] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [engineInfo, setEngineInfo] = useState<EngineInfo | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [showKeyModal, setShowKeyModal] = useState(false);
  const [apiKeyInput, setApiKeyInput] = useState("");
  const [selectedProvider, setSelectedProvider] = useState<"gemini" | "openai">("gemini");
  const [savingKey, setSavingKey] = useState(false);


  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  useEffect(() => {
    if (!toastMessage) return;
    const t = setTimeout(() => setToastMessage(null), 3500);
    return () => clearTimeout(t);
  }, [toastMessage]);

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
        content: `Hello **${user.name}**! 👋 I am **Veya**, your personal WearWise stylist.\n\nI'm powered with real-time access to your digital closet and style preferences. You can chat with me freely!\n\nAsk me for:\n• *Outfit recommendations for dates, interviews, or parties*\n• *What colors look best together*\n• *How to style specific pieces from your closet*\n• *General fashion tips, rules, and grooming advice*`,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      },
    ]);

    // Fetch wardrobe count for context
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

    // Fetch active AI engine status
    const fetchEngineStatus = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/stylist/status`, {
          headers: getAuthHeaders(),
        });
        if (res.ok) {
          const data: EngineInfo = await res.json();
          setEngineInfo(data);
        }
      } catch (err) {
        console.error("Could not fetch stylist engine status:", err);
      }
    };

    fetchWardrobeCount();
    fetchEngineStatus();
  }, [router]);

  const resetChat = () => {
    if (!currentUser) return;
    setMessages([
      {
        id: `welcome-${Date.now()}`,
        role: "assistant",
        content: `Hello **${currentUser.name}**! 👋 Veya is ready for a fresh styling session.\n\nAsk me for outfit formulas, color harmony advice, or what to wear today!`,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      },
    ]);
    setToastMessage("Started a fresh styling conversation!");
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setToastMessage("Advice copied to clipboard!");
    setTimeout(() => setCopiedId(null), 2500);
  };

  const handleSaveApiKey = async (e: React.FormEvent) => {
    e.preventDefault();
    const key = apiKeyInput.trim();
    if (!key) return;

    setSavingKey(true);
    try {
      const res = await fetch(`${API_BASE_URL}/stylist/api-key`, {
        method: "POST",
        headers: {
          ...getAuthHeaders(),
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          provider: selectedProvider,
          api_key: key,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || "Failed to activate API Key");
      }

      const updatedInfo: EngineInfo = await res.json();
      setEngineInfo(updatedInfo);
      setShowKeyModal(false);
      setApiKeyInput("");
      setToastMessage(`Connected successfully to ${updatedInfo.label}!`);

      // Add assistant confirmation message
      setMessages((prev) => [
        ...prev,
        {
          id: `engine-activated-${Date.now()}`,
          role: "assistant",
          content: `🎉 **${updatedInfo.label} is now active!**\n\nI am now directly connected to Google Gemini / ChatGPT. You can talk with me freely about literally **anything** — whether it's fashion, outfit ideas, general questions, stories, or chit-chat. What's on your mind?`,
          engine: updatedInfo.engine,
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        },
      ]);
    } catch (err: unknown) {
      console.error(err);
      setToastMessage(err instanceof Error ? err.message : "Failed to connect API Key.");
    } finally {
      setSavingKey(false);
    }
  };


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
      const historyPayload = updatedMessages
        .filter((m) => m.id !== "welcome" && !m.id.startsWith("welcome-"))
        .slice(-8)
        .map((m) => ({
          role: m.role,
          content: m.content,
        }));

      const res = await fetch(`${API_BASE_URL}/stylist/chat`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({
          message: messageContent,
          history: historyPayload.slice(0, -1),
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
        content: data.reply || "Here is my tailored recommendation for your look.",
        recommended_items: data.recommended_items || [],
        occasion: data.occasion || null,
        engine: data.engine || null,
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

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };


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
      setToastMessage("A complete look requires a top, bottom, and footwear.");
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
          explanation: `Curated by Veya: ${top.color} ${top.category} + ${bottom.color} ${bottom.category} + ${shoes.color} ${shoes.category}`,
        }),
      });

      if (!res.ok) throw new Error("Could not save outfit to lookbook");

      setSavedSuccessId(messageId);
      setToastMessage("Outfit successfully saved to your Lookbook!");
      setTimeout(() => setSavedSuccessId(null), 4000);
    } catch (err) {
      console.error(err);
      setToastMessage("Failed to save outfit to Lookbook.");
    } finally {
      setSavingOutfitId(null);
    }
  };

  return (
    <main className="relative flex min-h-[calc(100vh-65px)] flex-col overflow-hidden bg-[#f4f0ea] text-[#171513]">
      {/* Ambient warm background glow */}
      <div className="pointer-events-none absolute -top-40 left-1/2 -z-10 h-[500px] w-[900px] -translate-x-1/2 rounded-full bg-gradient-to-b from-[#e7ded1]/70 via-[#f5efe6]/40 to-transparent blur-3xl" />

      {/* Floating Toast Notification */}
      {toastMessage && (
        <div className="fixed top-20 right-6 z-50 animate-pop-in">
          <div className="flex items-center gap-2 rounded-2xl border border-black/10 bg-[#171717] px-4 py-2.5 text-xs font-semibold text-white shadow-lg backdrop-blur-md">
            <span>✦</span>
            <span>{toastMessage}</span>
          </div>
        </div>
      )}

      {/* ================= TOP HEADER ================= */}
      <header className="sticky top-0 z-30 border-b border-[#e5dfd5] bg-[#f4f0ea]/95 px-5 py-3.5 backdrop-blur-md sm:px-8">
        <div className="mx-auto flex max-w-5xl items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#171717] text-base text-white shadow-2xs">
              ✦
            </div>
            <div>
              <h1 className="text-base font-extrabold tracking-tight text-[#1a1714] sm:text-lg flex items-center gap-1.5">
                <span>Veya</span>
                <span className="rounded-full bg-black/10 px-2 py-0.5 text-[9px] font-bold tracking-wider uppercase text-neutral-800">
                  AI Stylist
                </span>
              </h1>
              {engineInfo && (
                <p className="text-[10px] font-medium text-gray-500">
                  Your Personal Stylist • Powered by {engineInfo.label}
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={resetChat}
              className="inline-flex items-center gap-1.5 rounded-xl border border-[#ded5c6] bg-white px-3.5 py-1.5 text-xs font-semibold text-[#524a3e] shadow-2xs transition hover:border-black/30 hover:bg-[#faf7f2] hover:text-black cursor-pointer"
              title="Start a fresh styling conversation"
            >
              <span>+</span>
              <span>New Chat</span>
            </button>
          </div>
        </div>
      </header>


      {/* Wardrobe Reminder Alert if Empty */}
      {wardrobeCount === 0 && (
        <div className="mx-auto mt-4 max-w-5xl px-4 sm:px-6 w-full">
          <div className="flex items-center justify-between gap-4 rounded-2xl border border-amber-200 bg-[#fffaf0] p-3.5 text-xs text-amber-900 shadow-2xs">
            <div className="flex items-center gap-2.5">
              <span className="text-base">💡</span>
              <span>
                Your closet is currently empty. Add clothes in your <strong>Wardrobe Vault</strong> so I can craft looks using your real clothes.
              </span>
            </div>
            <Link
              href="/wardrobe"
              className="shrink-0 rounded-xl bg-amber-900 px-3 py-1.5 font-bold text-white transition hover:bg-amber-950"
            >
              + Add Clothes
            </Link>
          </div>
        </div>
      )}

      {/* ================= CHAT STREAM ================= */}
      <div className="mx-auto flex-1 w-full max-w-5xl px-4 py-6 sm:px-6">
        <div className="space-y-6">
          {messages.map((message) => {
            const isUser = message.role === "user";
            return (
              <div
                key={message.id}
                className={`flex gap-3.5 animate-pop-in ${isUser ? "justify-end" : "justify-start"}`}
              >
                {!isUser && (
                  <div className="flex h-8 w-8 shrink-0 select-none items-center justify-center rounded-xl bg-[#171717] text-xs text-white shadow-2xs mt-0.5">
                    ✦
                  </div>
                )}

                <div className={`max-w-[92%] sm:max-w-[80%] ${isUser ? "items-end" : "items-start"}`}>
                  
                  {/* Top Bar for Assistant Bubble */}
                  {!isUser && (
                    <div className="mb-1.5 flex items-center justify-between gap-2 px-1">
                      <div className="flex items-center gap-2">
                        {message.occasion && (
                          <span className="rounded-full bg-black/5 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-gray-700 border border-black/10">
                            {message.occasion} Vibe
                          </span>
                        )}
                        {message.engine && (
                          <span className="text-[10px] font-medium text-gray-400 capitalize">
                            ✦ {message.engine === "gemini" ? "Veya (Gemini)" : message.engine === "openai" ? "Veya (OpenAI)" : "Veya AI"}
                          </span>
                        )}
                      </div>

                      <button
                        type="button"
                        onClick={() => copyToClipboard(message.content, message.id)}
                        className="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-medium text-gray-400 hover:text-gray-900 hover:bg-black/5 transition cursor-pointer"
                        title="Copy message text"
                      >
                        {copiedId === message.id ? (
                          <>
                            <span className="text-emerald-600">✓</span>
                            <span className="text-emerald-600 font-semibold">Copied</span>
                          </>
                        ) : (
                          <>
                            <span>📋</span>
                            <span>Copy</span>
                          </>
                        )}
                      </button>
                    </div>
                  )}

                  {/* Message Bubble */}
                  <div
                    className={`rounded-3xl px-5 py-4 shadow-sm text-xs sm:text-sm leading-relaxed ${
                      isUser
                        ? "bg-[#171717] text-white rounded-tr-none"
                        : "bg-white text-gray-900 border border-[#e2e4e7] rounded-tl-none"
                    }`}
                  >
                    <FormattedMessage content={message.content} isUser={isUser} />
                  </div>

                  {/* Recommended Garment Cards Embedded */}
                  {!isUser && message.recommended_items && message.recommended_items.length > 0 && (
                    <div className="mt-3.5 rounded-3xl border border-[#e2e4e7] bg-white p-4 shadow-2xs">
                      <div className="flex items-center justify-between border-b border-[#eceef0] pb-2.5 mb-3">
                        <p className="text-[11px] font-bold uppercase tracking-wider text-gray-500">
                          Recommended Pieces From Closet
                        </p>
                        {message.recommended_items.length >= 3 && (
                          <button
                            type="button"
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
                            className={`rounded-lg px-2.5 py-1 text-xs font-bold transition cursor-pointer ${
                              savedSuccessId === message.id
                                ? "bg-emerald-100 text-emerald-800"
                                : "bg-[#171717] text-white hover:bg-black active:scale-95 disabled:opacity-50"
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

                      {/* Embedded Garment Grid with Zero-Crop Framing */}
                      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                        {message.recommended_items.map((item) => {
                          const role = getItemRole(item.category);
                          const hex = COLOR_MAP[item.color.toLowerCase()] || "#9ca3af";

                          return (
                            <div
                              key={item.id}
                              className="group rounded-2xl border border-[#e2e4e7] bg-[#fbfbf9] p-2.5 text-center transition hover:border-black/30 hover:bg-white"
                            >
                              <div className="relative mx-auto mb-2 aspect-[4/5] w-full overflow-hidden rounded-xl bg-[#f7f7f5] border border-[#eceef0] p-2 flex items-center justify-center">
                                {item.image_url ? (
                                  <img
                                    src={getImageUrl(item.image_url) || item.image_url}
                                    alt={`${item.color} ${item.category}`}
                                    className="h-full w-full object-contain object-center transition duration-200 group-hover:scale-105"
                                  />
                                ) : (
                                  <div className="flex h-full items-center justify-center text-3xl">
                                    {role === "Top" ? "👕" : role === "Bottom" ? "👖" : "👟"}
                                  </div>
                                )}

                                <div className="absolute top-1.5 left-1.5">
                                  <span className="rounded-full bg-black/75 px-2 py-0.5 text-[8px] font-bold uppercase tracking-wider text-white">
                                    {role}
                                  </span>
                                </div>
                              </div>

                              <div className="flex items-center justify-center gap-1.5">
                                <span
                                  className="h-2.5 w-2.5 rounded-full border border-black/10"
                                  style={{ backgroundColor: hex }}
                                />
                                <p className="truncate text-xs font-bold capitalize text-gray-900">
                                  {item.color} {item.category}
                                </p>
                              </div>

                              <div className="mt-1 flex items-center justify-center gap-1 text-[10px] text-gray-500 capitalize">
                                {item.fit && <span>{item.fit}</span>}
                                {item.style && <span>· {item.style}</span>}
                              </div>
                            </div>
                          );
                        })}
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

          {/* Animated Typing Indicator */}
          {loading && (
            <div className="flex items-center gap-3 animate-pop-in">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-[#171717] text-xs text-white shadow-2xs">
                ✦
              </div>
              <div className="rounded-3xl rounded-tl-none border border-[#e2e4e7] bg-white px-5 py-3.5 shadow-sm">
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

      {/* ================= FLOATING INPUT BAR ================= */}
      <div className="border-t border-[#e5dfd5] bg-[#f4f0ea]/90 backdrop-blur-md px-4 py-3.5 sm:px-6">
        <div className="mx-auto max-w-5xl">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              sendMessage();
            }}
            className="flex items-end gap-3"
          >
            <div className="relative flex-1">
              <textarea
                ref={inputRef}
                rows={1}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask Veya anything (e.g. 'hey Veya', 'what goes with olive chinos?', 'style a date night look')..."
                disabled={loading}
                className="min-h-[48px] max-h-32 w-full resize-none rounded-2xl border border-[#e2dad0] bg-white px-4 py-3 text-xs sm:text-sm text-gray-900 placeholder:text-[#9e9588] outline-none transition focus:border-black focus:bg-white focus:ring-1 focus:ring-black leading-relaxed shadow-2xs"
              />
            </div>
            <button
              type="submit"
              disabled={!input.trim() || loading}
              className="inline-flex h-12 items-center justify-center gap-1.5 rounded-2xl bg-[#171717] px-6 text-xs sm:text-sm font-bold text-white shadow-sm transition hover:bg-black active:scale-95 disabled:cursor-not-allowed disabled:opacity-40 cursor-pointer shrink-0 mb-0.5"
            >
              <span>Send</span>
              <span>→</span>
            </button>
          </form>
        </div>
      </div>

      {/* ================= API KEY CONNECTION MODAL ================= */}
      {showKeyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs animate-fade-in">
          <div className="w-full max-w-md rounded-3xl border border-gray-200 bg-white p-6 shadow-2xl animate-pop-in">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <div className="flex items-center gap-2.5">
                <span className="text-xl">🔑</span>
                <div>
                  <h2 className="text-base font-extrabold text-gray-950">Connect Veya AI</h2>
                  <p className="text-[11px] text-gray-500">Enable real-time dynamic AI dialogue</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowKeyModal(false)}
                className="rounded-full h-8 w-8 flex items-center justify-center text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Provider selection tabs */}
            <div className="mt-4 flex rounded-xl bg-gray-100 p-1">
              <button
                type="button"
                onClick={() => setSelectedProvider("gemini")}
                className={`flex-1 rounded-lg py-1.5 text-xs font-bold transition cursor-pointer ${
                  selectedProvider === "gemini" ? "bg-white text-gray-950 shadow-xs" : "text-gray-500 hover:text-gray-950"
                }`}
              >
                ✦ Google Gemini (Free)
              </button>
              <button
                type="button"
                onClick={() => setSelectedProvider("openai")}
                className={`flex-1 rounded-lg py-1.5 text-xs font-bold transition cursor-pointer ${
                  selectedProvider === "openai" ? "bg-white text-gray-950 shadow-xs" : "text-gray-500 hover:text-gray-950"
                }`}
              >
                ✦ OpenAI (ChatGPT)
              </button>
            </div>

            {/* Instructions */}
            {selectedProvider === "gemini" ? (
              <div className="mt-4 rounded-2xl bg-sky-50 border border-sky-200 p-3.5 text-xs text-sky-950 space-y-2">
                <p className="font-bold flex items-center gap-1.5">
                  <span>✨</span>
                  <span>How to get your FREE Gemini API Key (10s):</span>
                </p>
                <ol className="list-decimal list-inside text-[11px] text-sky-900 space-y-1 pl-1">
                  <li>
                    Open{" "}
                    <a
                      href="https://aistudio.google.com/app/apikey"
                      target="_blank"
                      rel="noreferrer"
                      className="underline font-bold text-sky-700 hover:text-sky-900"
                    >
                      Google AI Studio (Click here)
                    </a>
                  </li>
                  <li>Sign in with your Google account & click <strong>Create API Key</strong></li>
                  <li>
                    Copy your key (starts with <code className="bg-sky-100 px-1 py-0.5 rounded text-[10px] font-mono">AIzaSy...</code>) and paste it below:
                  </li>
                </ol>
              </div>
            ) : (
              <div className="mt-4 rounded-2xl bg-emerald-50 border border-emerald-200 p-3.5 text-xs text-emerald-950 space-y-1.5">
                <p className="font-bold flex items-center gap-1.5">
                  <span>⚡</span>
                  <span>OpenAI API Key:</span>
                </p>
                <p className="text-[11px] text-emerald-900">
                  Paste your OpenAI secret key from{" "}
                  <a
                    href="https://platform.openai.com/api-keys"
                    target="_blank"
                    rel="noreferrer"
                    className="underline font-bold"
                  >
                    platform.openai.com
                  </a>{" "}
                  (starts with <code className="bg-emerald-100 px-1 py-0.5 rounded text-[10px] font-mono">sk-...</code>).
                </p>
              </div>
            )}

            {/* Key input form */}
            <form onSubmit={handleSaveApiKey} className="mt-4 space-y-3">
              <div>
                <label className="block text-[11px] font-bold text-gray-700 uppercase tracking-wider mb-1">
                  {selectedProvider === "gemini" ? "Gemini API Key" : "OpenAI API Key"}
                </label>
                <input
                  type="password"
                  value={apiKeyInput}
                  onChange={(e) => setApiKeyInput(e.target.value)}
                  placeholder={selectedProvider === "gemini" ? "AIzaSy..." : "sk-..."}
                  className="h-11 w-full rounded-xl border border-gray-200 bg-[#fbfbf9] px-3.5 text-xs font-mono text-gray-900 outline-none transition focus:border-black focus:bg-white"
                  autoFocus
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setShowKeyModal(false)}
                  className="flex-1 rounded-xl border border-gray-200 py-2.5 text-xs font-bold text-gray-600 hover:bg-gray-50 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!apiKeyInput.trim() || savingKey}
                  className="flex-1 rounded-xl bg-[#171717] py-2.5 text-xs font-bold text-white hover:bg-black transition disabled:opacity-50 cursor-pointer shadow-sm"
                >
                  {savingKey ? "Connecting..." : "Save & Connect"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}


/**
 * Enhanced Markdown formatter for bold text, headers, lists, and Stylist Pro-Tips
 */
function FormattedMessage({ content, isUser }: { content: string; isUser: boolean }) {
  if (isUser) {
    return <span className="whitespace-pre-wrap">{content}</span>;
  }

  const lines = content.split("\n");

  return (
    <div className="space-y-2.5">
      {lines.map((line, lineIdx) => {
        const trimmed = line.trim();
        if (!trimmed) {
          return <div key={lineIdx} className="h-0.5" />;
        }

        // Headings (### or ##)
        if (trimmed.startsWith("### ") || trimmed.startsWith("## ")) {
          const title = trimmed.replace(/^#{2,3}\s+/, "");
          return (
            <h3
              key={lineIdx}
              className="pt-2 pb-0.5 text-sm sm:text-base font-extrabold text-gray-950 tracking-tight flex items-center gap-1.5"
            >
              <span className="text-xs text-gray-400">✦</span>
              <RenderMarkdownLine line={title} />
            </h3>
          );
        }

        // Pro-Tip or Highlight Callout Box
        if (trimmed.includes("Stylist Pro-Tip:") || trimmed.includes("💡 **Tip:") || trimmed.startsWith("💡 ")) {
          return (
            <div
              key={lineIdx}
              className="my-3 rounded-2xl bg-[#fffaf0] border border-[#f5e3ba] p-3.5 text-xs sm:text-sm text-amber-950 font-medium leading-relaxed shadow-2xs"
            >
              <RenderMarkdownLine line={trimmed} />
            </div>
          );
        }

        // Numbered list item (e.g. "1. **Title:** Desc")
        const numberedMatch = trimmed.match(/^(\d+)\.\s+(.*)/);
        if (numberedMatch) {
          const num = numberedMatch[1];
          const rest = numberedMatch[2];
          return (
            <div key={lineIdx} className="flex items-start gap-2.5 pl-0.5 my-1 text-xs sm:text-sm">
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-black/5 text-[10px] font-bold text-gray-700 mt-0.5">
                {num}
              </span>
              <div className="flex-1 leading-relaxed">
                <RenderMarkdownLine line={rest} />
              </div>
            </div>
          );
        }

        // Unordered list item (e.g. "• Item" or "- Item" or "* Item")
        const bulletMatch = trimmed.match(/^([•\-\*])\s+(.*)/);
        if (bulletMatch) {
          const rest = bulletMatch[2];
          return (
            <div key={lineIdx} className="flex items-start gap-2.5 pl-1 my-1 text-xs sm:text-sm">
              <span className="h-1.5 w-1.5 rounded-full bg-gray-500 shrink-0 mt-2" />
              <div className="flex-1 leading-relaxed">
                <RenderMarkdownLine line={rest} />
              </div>
            </div>
          );
        }

        // Standard paragraph
        return (
          <p key={lineIdx} className="leading-relaxed text-xs sm:text-sm">
            <RenderMarkdownLine line={trimmed} />
          </p>
        );
      })}
    </div>
  );
}

function RenderMarkdownLine({ line }: { line: string }) {
  const parts = line.split(/(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`)/g);

  return (
    <>
      {parts.map((part, i) => {
        if (part.startsWith("**") && part.endsWith("**")) {
          return (
            <strong key={i} className="font-extrabold text-gray-950">
              {part.slice(2, -2)}
            </strong>
          );
        }
        if (part.startsWith("*") && part.endsWith("*") && part.length > 2) {
          return (
            <em key={i} className="italic text-gray-800">
              {part.slice(1, -1)}
            </em>
          );
        }
        if (part.startsWith("`") && part.endsWith("`") && part.length > 2) {
          return (
            <code key={i} className="rounded bg-black/5 px-1 py-0.5 text-[11px] font-mono text-gray-800">
              {part.slice(1, -1)}
            </code>
          );
        }
        return <span key={i}>{part}</span>;
      })}
    </>
  );
}

