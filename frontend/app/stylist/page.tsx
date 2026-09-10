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

// Exactly 3 style prompts for perfect symmetry
const STYLE_PROMPTS = [
  {
    label: "Style an outfit for tonight",
    icon: "✨",
    prompt: "Can you curate a stylish outfit from my closet for going out tonight?",
  },
  {
    label: "Smart casual office look",
    icon: "💼",
    prompt: "Style a sharp, smart casual outfit suitable for a workday meeting.",
  },
  {
    label: "Color harmony for brown loafers",
    icon: "👞",
    prompt: "What shirt and trouser color combinations work best with brown footwear?",
  },
];

// 4-5 words taglines for Veya AI with typewriter animation
const STYLIST_TAGLINES = [
  "Your personal aesthetic, curated daily.",
  "Effortless style for every occasion.",
  "Your closet, styled with precision.",
  "Smart fashion tailored to you.",
  "Color harmony and outfit formulas.",
];

function AnimatedStylistTagline() {
  const [index, setIndex] = useState(0);
  const [subIndex, setSubIndex] = useState(0);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isPaused, setIsPaused] = useState(false);

  useEffect(() => {
    if (isPaused) {
      const pauseTimer = setTimeout(() => {
        setIsPaused(false);
        setIsDeleting(true);
      }, 2200);
      return () => clearTimeout(pauseTimer);
    }

    if (isDeleting) {
      if (subIndex === 0) {
        setIsDeleting(false);
        setIndex((prev) => (prev + 1) % STYLIST_TAGLINES.length);
        return;
      }
      const deleteTimer = setTimeout(() => {
        setSubIndex((prev) => prev - 1);
      }, 35);
      return () => clearTimeout(deleteTimer);
    }

    if (subIndex === STYLIST_TAGLINES[index].length) {
      setIsPaused(true);
      return;
    }

    const typeTimer = setTimeout(() => {
      setSubIndex((prev) => prev + 1);
    }, 70);

    return () => clearTimeout(typeTimer);
  }, [subIndex, index, isDeleting, isPaused]);

  return (
    <div className="flex items-center justify-center min-h-[28px]">
      <p className="text-xs sm:text-sm font-medium text-[#736b5e] tracking-tight flex items-center justify-center gap-1.5">
        <span className="text-neutral-400 text-xs">✨</span>
        <span className="text-[#2b261f] font-semibold tracking-tight">
          {STYLIST_TAGLINES[index].substring(0, subIndex)}
        </span>
        <span className="inline-block w-[2px] h-3.5 sm:h-4 bg-[#171717] align-middle animate-pulse" />
      </p>
    </div>
  );
}

function getItemRole(category: string): "Top" | "Bottom" | "Footwear" {
  const value = category.toLowerCase();
  if (value === "jeans" || value === "pants" || value === "trousers" || value === "bottom" || value === "chinos") {
    return "Bottom";
  }
  if (value === "shoes" || value === "sneakers" || value === "loafers" || value === "boots" || value === "footwear") {
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
  const [speakingId, setSpeakingId] = useState<string | null>(null);
  const [isListening, setIsListening] = useState(false);

  // API Key Connection Modal
  const [showKeyModal, setShowKeyModal] = useState(false);
  const [apiKeyInput, setApiKeyInput] = useState("");
  const [selectedProvider, setSelectedProvider] = useState<"gemini" | "openai">("gemini");
  const [savingKey, setSavingKey] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const initialInputRef = useRef<HTMLInputElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recognitionRef = useRef<any>(null);

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
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
    setSpeakingId(null);
    setMessages([]);
    setInput("");
    setToastMessage("Cleared conversation. Ready for a new styling prompt!");
    setTimeout(() => initialInputRef.current?.focus(), 150);
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setToastMessage("Copied to clipboard!");
    setTimeout(() => setCopiedId(null), 2500);
  };

  const speakMessage = (id: string, text: string) => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) {
      setToastMessage("Text-to-speech is not supported in this browser.");
      return;
    }

    if (speakingId === id) {
      window.speechSynthesis.cancel();
      setSpeakingId(null);
      return;
    }

    window.speechSynthesis.cancel();

    // Strip markdown formatting characters for natural speech
    const cleanText = text
      .replace(/[*#`_~]/g, "")
      .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
      .trim();

    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.rate = 1.0;
    utterance.pitch = 1.0;
    utterance.onend = () => setSpeakingId(null);
    utterance.onerror = () => setSpeakingId(null);

    setSpeakingId(id);
    window.speechSynthesis.speak(utterance);
  };

  const toggleListening = () => {
    if (typeof window === "undefined") return;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const win = window as any;
    const SpeechRecognitionClass = win.SpeechRecognition || win.webkitSpeechRecognition;

    if (!SpeechRecognitionClass) {
      setToastMessage("Voice recognition is not supported in this browser.");
      return;
    }

    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
      return;
    }

    try {
      const recognition = new SpeechRecognitionClass();
      recognition.lang = "en-US";
      recognition.interimResults = true;
      recognition.continuous = false;

      recognition.onstart = () => setIsListening(true);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      recognition.onresult = (event: any) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const transcript = Array.from(event.results)
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          .map((r: any) => r[0].transcript)
          .join("");
        setInput(transcript);
      };
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      recognition.onerror = (e: any) => {
        console.error("Speech recognition error:", e);
        setIsListening(false);
      };
      recognition.onend = () => setIsListening(false);

      recognitionRef.current = recognition;
      recognition.start();
    } catch (err) {
      console.error(err);
      setIsListening(false);
    }
  };

  const handleRegenerate = (msgIndex: number) => {
    for (let i = msgIndex - 1; i >= 0; i--) {
      if (messages[i].role === "user") {
        sendMessage(messages[i].content);
        return;
      }
    }
    setToastMessage("No previous user question found to retry.");
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

      setMessages((prev) => [
        ...prev,
        {
          id: `engine-activated-${Date.now()}`,
          role: "assistant",
          content: `🎉 **${updatedInfo.label} is now active!**\n\nI am connected to Google Gemini. Ask me anything about outfits, color harmony, or styling your wardrobe!`,
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
    const messageContent = (textToSend !== undefined ? textToSend : input).trim();
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

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement | HTMLInputElement>) => {
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
    <main className="relative flex min-h-[calc(100vh-65px)] flex-col overflow-x-hidden bg-[#f4f0ea] text-[#171513]">
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

      {/* Subtle discreet engine settings button in top corner (replaces bulky header) */}
      <div className="absolute top-4 right-4 sm:right-8 z-20">
        <button
          type="button"
          onClick={() => setShowKeyModal(true)}
          className="inline-flex items-center gap-1.5 rounded-full border border-[#ded5c6] bg-white/70 px-3 py-1 text-[11px] font-medium text-neutral-500 hover:text-black hover:bg-white hover:border-black/30 transition shadow-2xs cursor-pointer backdrop-blur-xs"
          title="Configure AI Engine"
        >
          <span className="text-xs">⚙️</span>
          <span className="hidden sm:inline">Engine</span>
        </button>
      </div>

      {/* Wardrobe Reminder Alert if Closet is empty */}
      {wardrobeCount === 0 && (
        <div className="mx-auto mt-4 max-w-3xl px-4 w-full">
          <div className="flex items-center justify-between gap-4 rounded-2xl border border-amber-200 bg-[#fffaf0] p-3 text-xs text-amber-900 shadow-2xs">
            <div className="flex items-center gap-2">
              <span className="text-base">💡</span>
              <span>
                Your closet is currently empty. Add clothes in your <strong>Wardrobe Vault</strong> so Veya can craft looks using your real pieces.
              </span>
            </div>
            <Link
              href="/wardrobe"
              className="shrink-0 rounded-xl bg-amber-900 px-3 py-1 font-bold text-white transition hover:bg-amber-950 text-xs"
            >
              + Add Clothes
            </Link>
          </div>
        </div>
      )}

      {/* ================= MAIN CONTAINER: STATE A vs STATE B ================= */}
      {messages.length === 0 ? (
        /* ================= STATE A: LANDING / INITIAL VIEW ================= */
        <div className="flex flex-1 flex-col items-center justify-center px-4 py-12 sm:py-20 animate-fade-in">
          <div className="w-full max-w-2xl text-center space-y-6">
            
            {/* Title & Animated Typewriter Tagline */}
            <div className="space-y-2.5">
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-[#171717] font-serif">
                What&apos;s on your mind today?
              </h2>
              <AnimatedStylistTagline />
            </div>

            {/* Floating Capsule Input Bar */}
            <div className="pt-2">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  sendMessage();
                }}
                className="relative mx-auto flex items-center rounded-full border border-[#ded5c6] bg-white px-3 py-2 shadow-md transition hover:border-[#b8ad9c] focus-within:border-black focus-within:ring-2 focus-within:ring-black/10"
              >
                {/* Plus / Prompt button */}
                <button
                  type="button"
                  onClick={() => initialInputRef.current?.focus()}
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-gray-500 transition hover:bg-black/5 hover:text-black cursor-pointer"
                  title="Prompt options"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M12 4v16m8-8H4" />
                  </svg>
                </button>

                {/* Input Text Field */}
                <input
                  ref={initialInputRef}
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Ask anything..."
                  disabled={loading}
                  autoFocus
                  className="flex-1 bg-transparent px-3 text-xs sm:text-sm text-[#171717] placeholder:text-[#9e9588] outline-none font-medium"
                />

                {/* Voice / Mic Button */}
                <button
                  type="button"
                  onClick={toggleListening}
                  className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition cursor-pointer ${
                    isListening
                      ? "bg-red-500 text-white animate-pulse"
                      : "text-gray-500 hover:bg-black/5 hover:text-black"
                  }`}
                  title={isListening ? "Stop listening" : "Speak to Veya"}
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"
                    />
                  </svg>
                </button>

                {/* Submit / Arrow Button */}
                <button
                  type="submit"
                  disabled={!input.trim() || loading}
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#171717] text-white shadow-xs transition hover:bg-black active:scale-95 disabled:cursor-not-allowed disabled:opacity-30 cursor-pointer ml-1"
                  title="Send to Veya"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2.2}
                      d="M5 12h14M12 5l7 7-7 7"
                    />
                  </svg>
                </button>
              </form>
            </div>

            {/* Quick Suggestion Chips - Exactly 3 for perfect horizontal symmetry */}
            <div className="pt-2">
              <div className="flex flex-wrap items-center justify-center gap-2.5">
                {STYLE_PROMPTS.map((item, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => sendMessage(item.prompt)}
                    className="inline-flex items-center gap-1.5 rounded-full border border-[#ded5c6] bg-white/80 px-4 py-2 text-xs font-medium text-[#4a4237] shadow-2xs transition hover:border-black/30 hover:bg-white hover:text-black hover:scale-[1.02] active:scale-95 cursor-pointer backdrop-blur-xs"
                  >
                    <span>{item.icon}</span>
                    <span>{item.label}</span>
                  </button>
                ))}
              </div>
            </div>

          </div>
        </div>
      ) : (
        /* ================= STATE B: ACTIVE CHAT CONVERSATION ================= */
        <div className="flex flex-1 flex-col justify-between pb-32">
          {/* Active Chat Minimal Top Bar */}
          <div className="sticky top-0 z-20 border-b border-[#e5dfd5]/60 bg-[#f4f0ea]/80 px-4 py-2.5 backdrop-blur-md">
            <div className="mx-auto flex max-w-3xl items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-[#171717] text-xs text-white">
                  ✦
                </div>
                <span className="text-xs font-bold text-[#171717]">Veya Chat</span>
                {engineInfo && (
                  <span className="text-[10px] text-neutral-500 hidden sm:inline">
                    • {engineInfo.label}
                  </span>
                )}
              </div>
              <button
                type="button"
                onClick={resetChat}
                className="inline-flex items-center gap-1 rounded-xl border border-[#ded5c6] bg-white px-2.5 py-1 text-xs font-semibold text-[#524a3e] shadow-2xs hover:border-black/30 hover:bg-[#faf7f2] hover:text-black transition cursor-pointer"
                title="Start a new chat"
              >
                <span>+</span>
                <span>New Chat</span>
              </button>
            </div>
          </div>

          {/* Chat Stream Messages */}
          <div className="mx-auto w-full max-w-3xl px-4 py-6 sm:px-6 space-y-6">
            {messages.map((message, index) => {
              const isUser = message.role === "user";
              return (
                <div
                  key={message.id}
                  className={`flex flex-col animate-pop-in ${isUser ? "items-end" : "items-start"}`}
                >
                  {/* User Bubble */}
                  {isUser ? (
                    <div className="max-w-[85%] sm:max-w-[75%] rounded-3xl rounded-tr-none bg-[#171717] px-5 py-3.5 text-xs sm:text-sm leading-relaxed text-white shadow-sm">
                      <p className="whitespace-pre-wrap font-medium">{message.content}</p>
                      <p className="mt-1 text-right text-[10px] text-white/50">{message.timestamp}</p>
                    </div>
                  ) : (
                    /* Assistant Bubble & Action Buttons */
                    <div className="w-full max-w-[92%] sm:max-w-[85%] space-y-2">
                      {/* Badge / Engine Indicator */}
                      <div className="flex items-center gap-2 px-1">
                        <div className="flex h-5 w-5 items-center justify-center rounded-md bg-[#171717] text-[10px] text-white">
                          ✦
                        </div>
                        <span className="text-xs font-bold text-[#171717]">Veya</span>
                        {message.occasion && (
                          <span className="rounded-full bg-black/5 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-neutral-600 border border-black/10">
                            {message.occasion}
                          </span>
                        )}
                        <span className="text-[10px] text-neutral-400 ml-auto">{message.timestamp}</span>
                      </div>

                      {/* Assistant Text Bubble */}
                      <div className="rounded-3xl rounded-tl-none border border-[#ded5c6] bg-white px-5 py-4 text-xs sm:text-sm leading-relaxed text-gray-900 shadow-2xs">
                        <FormattedMessage content={message.content} isUser={false} />
                      </div>

                      {/* Embedded Recommended Garments (if any) */}
                      {message.recommended_items && message.recommended_items.length > 0 && (
                        <div className="rounded-3xl border border-[#ded5c6] bg-white p-4 shadow-2xs space-y-3">
                          <div className="flex items-center justify-between border-b border-[#eceef0] pb-2.5">
                            <p className="text-[11px] font-bold uppercase tracking-wider text-neutral-500">
                              Curated Look from Your Closet
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
                                className={`rounded-xl px-3 py-1 text-xs font-bold transition cursor-pointer ${
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

                                  <div className="mt-0.5 flex items-center justify-center gap-1 text-[10px] text-gray-500 capitalize">
                                    {item.fit && <span>{item.fit}</span>}
                                    {item.style && <span>· {item.style}</span>}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* Action Buttons Toolbar below Assistant response (Image 2 style) */}
                      <div className="flex items-center gap-1 px-1 pt-1 text-gray-500">
                        {/* Copy Button */}
                        <button
                          type="button"
                          onClick={() => copyToClipboard(message.content, message.id)}
                          className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium hover:bg-black/5 hover:text-black transition cursor-pointer"
                          title="Copy response"
                        >
                          {copiedId === message.id ? (
                            <>
                              <span className="text-emerald-600">✓</span>
                              <span className="text-emerald-600 font-semibold text-[11px]">Copied</span>
                            </>
                          ) : (
                            <>
                              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                                />
                              </svg>
                              <span className="text-[11px]">Copy</span>
                            </>
                          )}
                        </button>

                        {/* Read Aloud / Listen Button */}
                        <button
                          type="button"
                          onClick={() => speakMessage(message.id, message.content)}
                          className={`inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium transition cursor-pointer ${
                            speakingId === message.id
                              ? "bg-black text-white"
                              : "hover:bg-black/5 hover:text-black"
                          }`}
                          title={speakingId === message.id ? "Stop speaking" : "Listen to response"}
                        >
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z"
                            />
                          </svg>
                          <span className="text-[11px]">
                            {speakingId === message.id ? "Stop" : "Listen"}
                          </span>
                        </button>

                        {/* Retry / Regenerate Button */}
                        <button
                          type="button"
                          onClick={() => handleRegenerate(index)}
                          className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium hover:bg-black/5 hover:text-black transition cursor-pointer"
                          title="Regenerate this response"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                            />
                          </svg>
                          <span className="text-[11px]">Retry</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}

            {/* Typing Indicator */}
            {loading && (
              <div className="flex items-center gap-3 animate-pop-in">
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-xl bg-[#171717] text-xs text-white shadow-2xs">
                  ✦
                </div>
                <div className="rounded-3xl rounded-tl-none border border-[#ded5c6] bg-white px-5 py-3 shadow-2xs">
                  <div className="flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-neutral-400 animate-bounce" />
                    <span className="h-2 w-2 rounded-full bg-neutral-400 animate-bounce [animation-delay:0.15s]" />
                    <span className="h-2 w-2 rounded-full bg-neutral-400 animate-bounce [animation-delay:0.3s]" />
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Bottom Docked Floating Capsule Input Bar */}
          <div className="fixed bottom-0 left-0 right-0 z-20 bg-gradient-to-t from-[#f4f0ea] via-[#f4f0ea]/95 to-transparent pt-6 pb-4 px-4">
            <div className="mx-auto max-w-2xl space-y-2">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  sendMessage();
                }}
                className="relative flex items-center rounded-full border border-[#ded5c6] bg-white px-3 py-2 shadow-lg transition hover:border-[#b8ad9c] focus-within:border-black focus-within:ring-2 focus-within:ring-black/10"
              >
                {/* Plus / Clear Button */}
                <button
                  type="button"
                  onClick={resetChat}
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-gray-500 transition hover:bg-black/5 hover:text-black cursor-pointer"
                  title="New styling conversation"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M12 4v16m8-8H4" />
                  </svg>
                </button>

                {/* Input Text Field */}
                <input
                  ref={initialInputRef}
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Ask anything..."
                  disabled={loading}
                  className="flex-1 bg-transparent px-3 text-xs sm:text-sm text-[#171717] placeholder:text-[#9e9588] outline-none font-medium"
                />

                {/* Voice / Mic Button */}
                <button
                  type="button"
                  onClick={toggleListening}
                  className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition cursor-pointer ${
                    isListening
                      ? "bg-red-500 text-white animate-pulse"
                      : "text-gray-500 hover:bg-black/5 hover:text-black"
                  }`}
                  title={isListening ? "Stop listening" : "Voice input"}
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"
                    />
                  </svg>
                </button>

                {/* Submit / Arrow Button */}
                <button
                  type="submit"
                  disabled={!input.trim() || loading}
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#171717] text-white shadow-xs transition hover:bg-black active:scale-95 disabled:cursor-not-allowed disabled:opacity-30 cursor-pointer ml-1"
                  title="Send to Veya"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2.2}
                      d="M5 12h14M12 5l7 7-7 7"
                    />
                  </svg>
                </button>
              </form>

              {/* Disclaimer matching Image 2 */}
              <p className="text-center text-[10px] text-neutral-500 font-medium">
                Veya can make mistakes. Verify important style and sizing details.
              </p>
            </div>
          </div>
        </div>
      )}

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
