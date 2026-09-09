"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { API_BASE_URL, getImageUrl } from "@/lib/api";
import { getStoredUser, getAuthHeaders } from "@/lib/auth";

type WardrobePiece = {
  id: number;
  category: string;
  color: string;
  fit: string | null;
  pattern: string | null;
  style: string | null;
  image_url: string | null;
};

type SavedOutfit = {
  id: number;
  user_id: number;
  top_id: number;
  bottom_id: number;
  shoes_id: number;
  occasion: string;
  style_vibe: string | null;
  score: number | null;
  explanation: string | null;
  created_at: string;
  top?: WardrobePiece | null;
  bottom?: WardrobePiece | null;
  shoes?: WardrobePiece | null;
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

export default function SavedOutfitsPage() {
  const router = useRouter();
  const [outfits, setOutfits] = useState<SavedOutfit[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [activeFilter, setActiveFilter] = useState<string>("all");
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!toastMessage) return;
    const t = setTimeout(() => setToastMessage(null), 3500);
    return () => clearTimeout(t);
  }, [toastMessage]);

  const fetchSavedOutfits = async (userId: number) => {
    try {
      const res = await fetch(`${API_BASE_URL}/outfits/${userId}/saved`, {
        headers: getAuthHeaders(),
      });

      if (!res.ok) {
        throw new Error("Failed to load saved outfits");
      }

      const data = await res.json();
      setOutfits(data);
    } catch (err) {
      console.error(err);
      setToastMessage("Could not load lookbook.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const user = getStoredUser();
    if (!user) {
      router.push("/login");
      return;
    }
    fetchSavedOutfits(user.id);
  }, [router]);

  const handleDelete = async (outfitId: number) => {
    if (!confirm("Are you sure you want to remove this look from your lookbook?")) {
      return;
    }

    setDeletingId(outfitId);
    try {
      const res = await fetch(`${API_BASE_URL}/outfits/saved/${outfitId}`, {
        method: "DELETE",
        headers: getAuthHeaders(),
      });

      if (!res.ok) {
        throw new Error("Failed to delete outfit");
      }

      setOutfits((prev) => prev.filter((o) => o.id !== outfitId));
      setToastMessage("Look removed from Lookbook.");
    } catch (err) {
      console.error(err);
      setToastMessage("Failed to remove outfit.");
    } finally {
      setDeletingId(null);
    }
  };

  // Filtered Outfits
  const filteredOutfits = useMemo(() => {
    if (activeFilter === "all") return outfits;
    return outfits.filter((o) => o.occasion.toLowerCase() === activeFilter.toLowerCase());
  }, [outfits, activeFilter]);

  // Occasions list with count
  const occasionFilters = useMemo(() => {
    const counts: Record<string, number> = { all: outfits.length };
    outfits.forEach((o) => {
      const occ = o.occasion.toLowerCase();
      counts[occ] = (counts[occ] || 0) + 1;
    });

    const uniqueOccasions = Array.from(new Set(outfits.map((o) => o.occasion.toLowerCase())));

    return [
      { key: "all", label: "All Looks", count: outfits.length },
      ...uniqueOccasions.map((occ) => ({
        key: occ,
        label: occ.charAt(0).toUpperCase() + occ.slice(1),
        count: counts[occ] || 0,
      })),
    ];
  }, [outfits]);

  if (loading) {
    return (
      <main className="flex min-h-[calc(100vh-73px)] items-center justify-center bg-[#f7f7f5] px-6">
        <div className="text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-[#171717] text-white shadow-2xs">
            ★
          </div>
          <div className="mx-auto mt-5 h-8 w-8 animate-spin rounded-full border-2 border-gray-300 border-t-black" />
          <p className="mt-4 text-xs font-bold uppercase tracking-widest text-gray-500">
            Loading your personal lookbook...
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="relative min-h-[calc(100vh-73px)] overflow-hidden bg-[#f7f7f5] px-5 py-8 sm:px-8 sm:py-12 text-[#111111]">
      {/* Ambient background glow */}
      <div className="pointer-events-none absolute -top-40 left-1/2 -z-10 h-[500px] w-[900px] -translate-x-1/2 rounded-full bg-gradient-to-b from-[#e8ebe4]/50 via-[#fcfbf7]/40 to-transparent blur-3xl" />

      {/* Floating Toast */}
      {toastMessage && (
        <div className="fixed top-20 right-6 z-50 animate-pop-in">
          <div className="flex items-center gap-2 rounded-2xl border border-black/10 bg-[#171717] px-4 py-2.5 text-xs font-semibold text-white shadow-lg backdrop-blur-md">
            <span>✦</span>
            <span>{toastMessage}</span>
          </div>
        </div>
      )}

      <div className="mx-auto max-w-6xl">
        
        {/* ================= HEADER ================= */}
        <div className="mb-8 border-b border-[#e2e4e7] pb-8">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-[#dedad0] bg-white/90 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-[#45546a] shadow-2xs backdrop-blur-md">
                <span className="flex h-2 w-2 rounded-full bg-amber-500" />
                <span>Personal Lookbook</span>
              </div>
              <h1 className="mt-3 text-3xl font-extrabold tracking-tight text-gray-950 sm:text-4xl">
                Curated Saved Looks
              </h1>
              <p className="mt-1 max-w-xl text-xs sm:text-sm text-gray-600">
                Your archive of saved 3-piece coordinate formulas ready to wear on demand.
              </p>
            </div>

            <div className="flex items-center gap-2.5">
              <span className="rounded-xl border border-gray-200 bg-white px-3.5 py-2 text-xs font-bold text-gray-800 shadow-2xs">
                {outfits.length} {outfits.length === 1 ? "Saved Look" : "Saved Looks"}
              </span>
              <Link
                href="/style"
                className="inline-flex h-11 items-center justify-center rounded-xl bg-[#171717] px-5 text-xs font-semibold text-white shadow-sm transition hover:bg-black active:scale-95"
              >
                <span>+ Style New Look</span>
              </Link>
            </div>
          </div>

          {/* Occasion Filter Tabs */}
          {outfits.length > 0 && (
            <div className="mt-6 flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
              {occasionFilters.map((tab) => {
                const isActive = activeFilter === tab.key;
                return (
                  <button
                    key={tab.key}
                    type="button"
                    onClick={() => setActiveFilter(tab.key)}
                    className={`flex items-center gap-1.5 rounded-xl px-3.5 py-1.5 text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
                      isActive
                        ? "bg-[#171717] text-white shadow-2xs"
                        : "border border-gray-200 bg-white text-gray-700 hover:border-gray-300 hover:bg-gray-50"
                    }`}
                  >
                    <span>{tab.label}</span>
                    <span
                      className={`rounded-full px-1.5 py-0.2 text-[10px] ${
                        isActive ? "bg-white/20 text-white" : "bg-gray-100 text-gray-500"
                      }`}
                    >
                      {tab.count}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* ================= OUTFITS DISPLAY ================= */}
        {outfits.length === 0 ? (
          /* Empty Lookbook State */
          <div className="rounded-3xl border border-dashed border-[#dedad0] bg-white p-14 text-center shadow-2xs">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-[#f7f7f5] text-3xl shadow-inner text-amber-600">
              ★
            </div>
            <h2 className="mt-4 text-xl font-extrabold text-gray-950">
              Your Lookbook is empty
            </h2>
            <p className="mx-auto mt-1 max-w-md text-xs sm:text-sm text-gray-500 leading-relaxed">
              Whenever you generate an outfit you love in <strong>Style Me</strong> or via the <strong>AI Stylist</strong>, tap <span className="font-semibold text-black">&quot;Save Outfit&quot;</span> to keep it archived here.
            </p>
            <div className="mt-6">
              <Link
                href="/style"
                className="inline-flex rounded-xl bg-[#171717] px-6 py-3 text-xs font-bold text-white shadow-sm transition hover:bg-black active:scale-95"
              >
                Start Styling Now →
              </Link>
            </div>
          </div>
        ) : filteredOutfits.length === 0 ? (
          /* Empty Filter State */
          <div className="rounded-3xl border border-dashed border-[#dedad0] bg-white p-12 text-center shadow-2xs">
            <p className="text-2xl">🔍</p>
            <h3 className="mt-2 text-sm font-bold text-gray-900">
              No saved looks found for this occasion
            </h3>
            <p className="mt-1 text-xs text-gray-500">
              Try selecting &quot;All Looks&quot; or styling a new outfit for this occasion.
            </p>
            <button
              type="button"
              onClick={() => setActiveFilter("all")}
              className="mt-3 text-xs font-semibold text-black underline cursor-pointer"
            >
              Reset filter
            </button>
          </div>
        ) : (
          /* Outfits Grid */
          <div className="grid gap-6 lg:grid-cols-2 animate-pop-in">
            {filteredOutfits.map((outfit) => (
              <div
                key={outfit.id}
                className="group flex flex-col justify-between rounded-3xl border border-[#e2e4e7] bg-white p-6 shadow-[0_10px_30px_rgba(27,35,43,0.04)] transition-all duration-200 hover:-translate-y-1 hover:shadow-md"
              >
                <div>
                  {/* Top Header Row */}
                  <div className="flex items-center justify-between border-b border-[#eceef0] pb-3.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-full bg-black/5 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-gray-800 border border-black/10">
                        {outfit.occasion}
                      </span>
                      {outfit.style_vibe && (
                        <span className="rounded-full bg-blue-50 px-2.5 py-0.5 text-[10px] font-semibold capitalize text-blue-700 border border-blue-100">
                          {outfit.style_vibe}
                        </span>
                      )}
                    </div>

                    {outfit.score && (
                      <span className="rounded-full bg-amber-50 px-2.5 py-0.5 text-[10px] font-bold text-amber-800 border border-amber-200">
                        ⭐ {outfit.score}% Match
                      </span>
                    )}
                  </div>

                  {/* 3 Pieces Thumbnail Row with Zero-Crop Portrait Framing */}
                  <div className="mt-4 grid grid-cols-3 gap-3">
                    <PieceThumbnail label="Top" item={outfit.top} fallbackEmoji="👕" />
                    <PieceThumbnail label="Bottom" item={outfit.bottom} fallbackEmoji="👖" />
                    <PieceThumbnail label="Footwear" item={outfit.shoes} fallbackEmoji="👟" />
                  </div>

                  {/* Stylist Rationale */}
                  {outfit.explanation && (
                    <div className="mt-4 rounded-2xl bg-[#fffaf0] border border-[#f5e3ba] p-3 text-xs text-amber-950 leading-relaxed">
                      <span className="font-bold block mb-0.5 text-amber-900">Stylist Rationale:</span>
                      {outfit.explanation}
                    </div>
                  )}
                </div>

                {/* Footer Row */}
                <div className="mt-5 flex items-center justify-between border-t border-[#eceef0] pt-3.5 text-xs text-gray-500">
                  <span className="text-[11px] text-gray-400">
                    Saved on{" "}
                    {new Date(outfit.created_at).toLocaleDateString(undefined, {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </span>

                  <button
                    type="button"
                    onClick={() => handleDelete(outfit.id)}
                    disabled={deletingId === outfit.id}
                    className="font-semibold text-red-600 hover:text-red-800 transition disabled:opacity-50 cursor-pointer text-[11px]"
                  >
                    {deletingId === outfit.id ? "Removing..." : "Remove Look"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

      </div>
    </main>
  );
}

function PieceThumbnail({
  label,
  item,
  fallbackEmoji,
}: {
  label: string;
  item?: WardrobePiece | null;
  fallbackEmoji: string;
}) {
  if (!item) {
    return (
      <div className="rounded-2xl border border-[#eceef0] bg-[#fbfbf9] p-3 text-center">
        <div className="text-2xl">{fallbackEmoji}</div>
        <p className="mt-1 text-[10px] font-bold uppercase tracking-wider text-gray-400">{label}</p>
        <p className="text-[10px] text-gray-400">Unavailable</p>
      </div>
    );
  }

  const hex = COLOR_MAP[item.color.toLowerCase()] || "#9ca3af";

  return (
    <div className="group/piece rounded-2xl border border-[#eceef0] bg-[#fbfbf9] p-2.5 text-center transition hover:border-black/30 hover:bg-white">
      {/* Zero-crop portrait image container */}
      <div className="relative mx-auto mb-2 aspect-[4/5] w-full overflow-hidden rounded-xl bg-[#f7f7f5] border border-[#eceef0] p-2 flex items-center justify-center">
        {item.image_url ? (
          <img
            src={getImageUrl(item.image_url) || item.image_url}
            alt={item.category}
            className="h-full w-full object-contain object-center transition duration-200 group-hover/piece:scale-105"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-3xl">
            {fallbackEmoji}
          </div>
        )}
        <div className="absolute top-1.5 left-1.5">
          <span className="rounded-full bg-black/75 px-1.5 py-0.2 text-[8px] font-bold uppercase tracking-wider text-white">
            {label}
          </span>
        </div>
      </div>

      <div className="flex items-center justify-center gap-1.5">
        <span
          className="h-2 w-2 rounded-full border border-black/10"
          style={{ backgroundColor: hex }}
        />
        <p className="truncate text-xs font-bold capitalize text-gray-950">
          {item.color} {item.category}
        </p>
      </div>
    </div>
  );
}
