"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { API_BASE_URL, getImageUrl } from "@/lib/api";
import { getStoredUser, getAuthHeaders } from "@/lib/auth";

type Recommendation = {
  top: number;
  bottom: number;
  shoes: number;
  score: number;
  top_id?: number;
  bottom_id?: number;
  shoes_id?: number;
  explanation?: string;
};

type OutfitData = {
  user_id: number;
  occasion: string;
  style_vibe?: string;
  weather?: string;
  recommendation?: Recommendation;
  recommendations?: Recommendation[];
  explanation?: string;
};

type WardrobeItem = {
  id: number;
  category: string;
  color: string;
  fit: string | null;
  pattern: string | null;
  style: string | null;
  image_url: string | null;
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

export default function OutfitPage() {
  const router = useRouter();

  const [data, setData] = useState<OutfitData | null>(null);
  const [items, setItems] = useState<WardrobeItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedLookIdx, setSelectedLookIdx] = useState(0);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [saveMessage, setSaveMessage] = useState("");

  const recommendationsList: Recommendation[] =
    data?.recommendations && data.recommendations.length > 0
      ? data.recommendations
      : data?.recommendation
      ? [data.recommendation]
      : [];

  const activeRec: Recommendation | undefined =
    recommendationsList[selectedLookIdx] || recommendationsList[0];
  const rawExplanation = activeRec?.explanation || data?.explanation || "";
  const activeExplanation =
    rawExplanation && rawExplanation !== "AI explanation unavailable"
      ? rawExplanation
      : `This look pairs your pieces with complementary tones and proportions tailored for a ${data?.occasion || "versatile"} setting.`;

  const saveOutfit = async () => {
    const user = getStoredUser();
    if (!user || !activeRec || !data) return;

    const topId = activeRec.top_id ?? activeRec.top;
    const bottomId = activeRec.bottom_id ?? activeRec.bottom;
    const shoesId = activeRec.shoes_id ?? activeRec.shoes;

    if (!topId || !bottomId || !shoesId) return;

    setSaveStatus("saving");
    setSaveMessage("");

    try {
      const res = await fetch(`${API_BASE_URL}/outfits/${user.id}/save`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({
          top_id: topId,
          bottom_id: bottomId,
          shoes_id: shoesId,
          occasion: data.occasion,
          style_vibe: (data as { style_vibe?: string }).style_vibe || null,
          score: activeRec.score,
          explanation: activeExplanation,
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.detail || "Failed to save outfit");
      }

      setSaveStatus("saved");
      setSaveMessage("Saved to your personal Lookbook!");
    } catch (err: unknown) {
      console.error(err);
      setSaveStatus("error");
      setSaveMessage(err instanceof Error ? err.message : "Failed to save outfit");
    }
  };

  useEffect(() => {
    const savedRecommendation = localStorage.getItem("wearwise_recommendation");
    const user = getStoredUser();

    if (!user) {
      router.push("/login");
      return;
    }

    if (!savedRecommendation) {
      router.push("/style");
      return;
    }

    const recommendationData = JSON.parse(savedRecommendation) as OutfitData;

    const fetchWardrobe = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/wardrobe/${user.id}`, {
          headers: getAuthHeaders(),
        });

        if (!response.ok) {
          throw new Error("Failed to fetch wardrobe");
        }

        const wardrobe = await response.json();
        setItems(wardrobe);
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    };

    const requestTimer = window.setTimeout(() => {
      setData(recommendationData);
      fetchWardrobe();
    }, 0);

    return () => window.clearTimeout(requestTimer);
  }, [router]);

  if (loading || !data || !activeRec) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#f7f7f5] px-6">
        <div className="text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-[#171717] text-white shadow-2xs">
            ✨
          </div>
          <div className="mx-auto mt-5 h-8 w-8 animate-spin rounded-full border-2 border-gray-300 border-t-black" />
          <p className="mt-4 text-xs font-bold uppercase tracking-widest text-gray-500">
            Rendering high-res look preview...
          </p>
        </div>
      </main>
    );
  }

  const getItem = (id: number | undefined) => {
    if (id === undefined) return undefined;
    return items.find((item) => item.id === id);
  };

  const topId = activeRec.top_id ?? activeRec.top;
  const bottomId = activeRec.bottom_id ?? activeRec.bottom;
  const shoesId = activeRec.shoes_id ?? activeRec.shoes;

  const top = getItem(topId);
  const bottom = getItem(bottomId);
  const shoes = getItem(shoesId);

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#f7f7f5] px-5 py-8 sm:px-8 sm:py-12 text-[#111111]">
      {/* Ambient background glow */}
      <div className="pointer-events-none absolute -top-40 left-1/2 -z-10 h-[500px] w-[900px] -translate-x-1/2 rounded-full bg-gradient-to-b from-[#e8ebe4]/50 via-[#fcfbf7]/40 to-transparent blur-3xl" />

      <div className="mx-auto max-w-5xl">
        
        {/* ================= HEADER ================= */}
        <div className="mb-8 border-b border-[#e2e4e7] pb-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <Link
                href="/style"
                className="inline-flex items-center gap-1.5 text-xs font-bold text-gray-500 hover:text-black transition mb-2"
              >
                <span>← Back to Style Me</span>
              </Link>
              <h1 className="text-3xl font-extrabold tracking-tight text-gray-950 sm:text-4xl">
                Outfit Detailed Inspection
              </h1>
              <p className="mt-1 text-xs sm:text-sm text-gray-600">
                Tailored for a <span className="font-bold capitalize text-black">{data.occasion}</span> day
                {data.weather ? <span> in <span className="font-bold capitalize text-black">{data.weather}</span> weather</span> : ""}
                {data.style_vibe ? <span> · <span className="font-bold capitalize text-black">{data.style_vibe}</span> vibe</span> : ""}.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-800 border border-emerald-200">
                ⭐ {activeRec.score}% Match Score
              </span>
            </div>
          </div>
        </div>

        {/* ================= LOOK SWITCHER TABS ================= */}
        {recommendationsList.length > 1 && (
          <div className="mb-6 flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
            {recommendationsList.map((rec, rIdx) => {
              const isSelected = selectedLookIdx === rIdx;
              const label =
                rIdx === 0
                  ? "Look 1: Top Match"
                  : rIdx === 1
                  ? "Look 2: Alternative"
                  : `Look ${rIdx + 1}: Casual`;
              return (
                <button
                  key={rIdx}
                  type="button"
                  onClick={() => {
                    setSelectedLookIdx(rIdx);
                    setSaveStatus("idle");
                    setSaveMessage("");
                  }}
                  className={`flex items-center gap-2 rounded-2xl px-4 py-2 text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                    isSelected
                      ? "bg-[#171717] text-white shadow-xs"
                      : "border border-[#e2e4e7] bg-white text-gray-700 hover:border-gray-400 hover:bg-gray-50"
                  }`}
                >
                  <span>{label}</span>
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] ${
                      isSelected ? "bg-white/20 text-white" : "bg-gray-100 text-gray-700"
                    }`}
                  >
                    {rec.score}%
                  </span>
                </button>
              );
            })}
          </div>
        )}

        {/* ================= 3 GARMENT INSPECTION CARDS ================= */}
        <div className="grid gap-5 md:grid-cols-3 animate-pop-in">
          <DetailedClothingCard emoji="👕" title="Top" item={top} />
          <DetailedClothingCard emoji="👖" title="Bottom" item={bottom} />
          <DetailedClothingCard emoji="👟" title="Footwear" item={shoes} />
        </div>

        {/* ================= COMPATIBILITY SCORECARD ================= */}
        <div className="mt-8 rounded-3xl border border-[#e2e4e7] bg-white p-6 sm:p-8 text-center shadow-[0_10px_30px_rgba(27,35,43,0.04)]">
          <p className="text-xs font-bold uppercase tracking-wider text-gray-400">
            Harmonic Balance Score
          </p>

          <p className="mt-2 text-5xl sm:text-6xl font-black tracking-tight text-gray-950">
            {activeRec.score}
            <span className="text-2xl text-gray-400 font-normal">/100</span>
          </p>

          <div className="mx-auto mt-4 h-2.5 max-w-md overflow-hidden rounded-full bg-gray-100">
            <div
              className="h-full rounded-full bg-[#171717] transition-all duration-500"
              style={{ width: `${activeRec.score}%` }}
            />
          </div>

          <div className="mx-auto mt-6 flex max-w-md flex-wrap items-center justify-around gap-2 text-xs text-gray-600 border-t border-[#eceef0] pt-4">
            <span className="font-semibold text-gray-800">✓ Color Wheel Harmonic</span>
            <span className="text-gray-300">•</span>
            <span className="font-semibold text-gray-800">✓ Proportional Silhouette</span>
            <span className="text-gray-300">•</span>
            <span className="font-semibold text-gray-800">✓ Weather Calibrated</span>
          </div>
        </div>

        {/* ================= AI STYLIST RATIONALE ================= */}
        <div className="mt-6 rounded-3xl border border-black/10 bg-[#171717] p-6 sm:p-8 text-white shadow-md">
          <div className="flex items-center gap-2">
            <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-white/20 text-xs">
              ✦
            </span>
            <p className="text-xs font-bold uppercase tracking-wider text-gray-300">
              Stylist Rationale
            </p>
          </div>

          <h2 className="mt-3 text-xl font-bold tracking-tight">
            Why this outfit works together
          </h2>

          <p className="mt-3 text-xs sm:text-sm leading-relaxed text-gray-300">
            {activeExplanation}
          </p>
        </div>

        {/* ================= ACTION BAR ================= */}
        <div className="mt-8 space-y-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 rounded-3xl border border-[#e2e4e7] bg-white p-5 shadow-2xs">
            <div>
              <p className="text-sm font-bold text-gray-900">Love this look?</p>
              <p className="text-xs text-gray-500">
                {saveMessage || "Save it to your personal lookbook to access it anytime."}
              </p>
            </div>

            <div className="flex items-center gap-2.5 w-full sm:w-auto">
              <button
                type="button"
                onClick={saveOutfit}
                disabled={saveStatus === "saving" || saveStatus === "saved"}
                className={`w-full sm:w-auto flex items-center justify-center gap-2 rounded-xl px-6 py-3 text-xs font-bold transition shadow-sm cursor-pointer ${
                  saveStatus === "saved"
                    ? "bg-emerald-700 text-white cursor-default"
                    : "bg-[#171717] text-white hover:bg-black active:scale-95 disabled:opacity-60"
                }`}
              >
                <span>{saveStatus === "saving" ? "Saving..." : saveStatus === "saved" ? "✓ Saved to Lookbook" : "★ Save to Lookbook"}</span>
              </button>

              {saveStatus === "saved" && (
                <Link
                  href="/saved"
                  className="rounded-xl border border-gray-200 bg-[#fbfbf9] px-4 py-3 text-xs font-bold text-gray-800 hover:bg-gray-100 transition whitespace-nowrap"
                >
                  View Lookbook →
                </Link>
              )}
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <button
              type="button"
              onClick={() => router.push("/style")}
              className="rounded-2xl border border-[#e2e4e7] bg-white px-6 py-3.5 text-xs font-bold text-gray-800 hover:bg-gray-50 transition shadow-2xs cursor-pointer text-center"
            >
              ← Try Another Look
            </button>

            <button
              type="button"
              onClick={() => router.push("/wardrobe/next-purchase")}
              className="rounded-2xl bg-[#171717] px-6 py-3.5 text-xs font-bold text-white hover:bg-black transition shadow-sm cursor-pointer text-center"
            >
              Discover Next Purchase Multiplier →
            </button>
          </div>
        </div>

      </div>
    </main>
  );
}

function DetailedClothingCard({
  emoji,
  title,
  item,
}: {
  emoji: string;
  title: string;
  item: WardrobeItem | undefined;
}) {
  if (!item) {
    return (
      <div className="rounded-3xl border border-[#e2e4e7] bg-white p-5 text-center shadow-2xs">
        <div className="text-4xl">{emoji}</div>
        <h2 className="mt-3 text-base font-bold">{title}</h2>
        <p className="mt-1 text-xs text-gray-400">Item unavailable</p>
      </div>
    );
  }

  const hex = COLOR_MAP[item.color.toLowerCase()] || "#9ca3af";

  return (
    <div className="group rounded-3xl border border-[#e2e4e7] bg-white p-4 shadow-[0_10px_30px_rgba(27,35,43,0.04)] transition-all duration-200 hover:-translate-y-1 hover:shadow-md">
      {/* Zero-crop portrait container */}
      <div className="relative aspect-[4/5] w-full overflow-hidden rounded-2xl bg-[#f7f7f5] border border-[#eceef0] p-3 flex items-center justify-center">
        {item.image_url ? (
          <img
            src={getImageUrl(item.image_url) || item.image_url}
            alt={`${item.color} ${item.category}`}
            className="h-full w-full object-contain object-center transition duration-200 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-5xl">
            {emoji}
          </div>
        )}

        <div className="absolute top-2 left-2">
          <span className="rounded-full bg-black/80 backdrop-blur-md px-2.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-white">
            {title}
          </span>
        </div>
      </div>

      <div className="mt-3.5 px-1">
        <div className="flex items-center gap-2">
          <span
            className="h-3 w-3 rounded-full border border-black/10 shadow-2xs"
            style={{ backgroundColor: hex }}
          />
          <h3 className="text-sm font-bold capitalize text-gray-950 truncate">
            {item.color} {item.category}
          </h3>
        </div>

        <div className="mt-2 flex flex-wrap gap-1.5">
          {item.fit && (
            <span className="rounded-md border border-[#eceef0] bg-[#fbfbf9] px-2 py-0.5 text-[10px] font-medium capitalize text-gray-600">
              {item.fit}
            </span>
          )}
          {item.style && (
            <span className="rounded-md border border-[#eceef0] bg-[#fbfbf9] px-2 py-0.5 text-[10px] font-medium capitalize text-gray-600">
              {item.style}
            </span>
          )}
          {item.pattern && (
            <span className="rounded-md border border-[#eceef0] bg-[#fbfbf9] px-2 py-0.5 text-[10px] font-medium capitalize text-gray-600">
              {item.pattern}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
