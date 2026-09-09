"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { API_BASE_URL } from "@/lib/api";
import { getStoredUser, getAuthHeaders } from "@/lib/auth";

type Product = {
  id: number;
  name: string;
  category: string;
  color: string;
  fit: string;
  price: number;
  brand: string;
  image: string;
};

type Recommendation = {
  category: string;
  color: string;
  score: number;
  new_outfit_combinations: number;
  reason: string;
  products: Product[];
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

export default function NextPurchasePage() {
  const router = useRouter();
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  const fetchRecommendations = async () => {
    const user = getStoredUser();
    if (!user) {
      router.push("/login");
      return;
    }

    setLoading(true);
    setError(false);
    try {
      const response = await fetch(`${API_BASE_URL}/wardrobe/${user.id}/next-purchase`, {
        headers: getAuthHeaders(),
      });
      if (!response.ok) throw new Error("Failed to fetch recommendations");
      const data = await response.json();
      setRecommendations(data.recommendations || []);
    } catch (fetchError) {
      console.error(fetchError);
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = window.setTimeout(fetchRecommendations, 0);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router]);

  // Handle Escape key to dismiss modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && selectedProduct) {
        setSelectedProduct(null);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedProduct]);

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#f7f7f5] px-6">
        <div className="text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-[#171717] text-white shadow-2xs">
            📈
          </div>
          <div className="mx-auto mt-5 h-8 w-8 animate-spin rounded-full border-2 border-gray-300 border-t-black" />
          <p className="mt-4 text-xs font-bold uppercase tracking-widest text-gray-500">
            Analyzing closet gap matrix...
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#f7f7f5] px-5 py-8 sm:px-8 sm:py-12 text-[#111111]">
      {/* Ambient background glow */}
      <div className="pointer-events-none absolute -top-40 left-1/2 -z-10 h-[500px] w-[900px] -translate-x-1/2 rounded-full bg-gradient-to-b from-[#e8ebe4]/50 via-[#fcfbf7]/40 to-transparent blur-3xl" />

      <div className="mx-auto max-w-6xl">
        
        {/* ================= HEADER ================= */}
        <div className="mb-8 border-b border-[#e2e4e7] pb-8">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-[#dedad0] bg-white/90 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-[#45546a] shadow-2xs backdrop-blur-md">
                <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                <span>AI Wardrobe Multiplier</span>
              </div>
              <h1 className="mt-3 text-3xl font-extrabold tracking-tight text-gray-950 sm:text-4xl">
                Complete Your Wardrobe
              </h1>
              <p className="mt-1 max-w-xl text-xs sm:text-sm text-gray-600">
                Discover the single surgical addition that unlocks exponential new outfit combinations from what you already own.
              </p>
            </div>

            <div className="flex items-center gap-2.5">
              <Link
                href="/wardrobe"
                className="inline-flex h-11 items-center justify-center rounded-xl border border-[#d4d6da] bg-white px-4 text-xs font-semibold text-gray-800 shadow-2xs transition hover:bg-gray-50 active:scale-95"
              >
                <span>👕 Wardrobe Vault</span>
              </Link>
              <Link
                href="/style"
                className="inline-flex h-11 items-center justify-center rounded-xl bg-[#171717] px-5 text-xs font-semibold text-white shadow-sm transition hover:bg-black active:scale-95"
              >
                <span>✨ Style Me →</span>
              </Link>
            </div>
          </div>
        </div>

        {/* ================= ERROR STATE ================= */}
        {error ? (
          <section className="rounded-3xl border border-red-200 bg-white px-6 py-14 text-center shadow-xs">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-red-50 text-xl text-red-600">
              ⚠️
            </div>
            <h2 className="mt-4 text-xl font-bold text-gray-950">
              Could not load wardrobe gap analysis
            </h2>
            <p className="mx-auto mt-1 max-w-md text-xs text-gray-600">
              Please verify your backend connection and try again.
            </p>
            <button
              type="button"
              onClick={fetchRecommendations}
              className="mt-6 rounded-xl bg-[#171717] px-6 py-2.5 text-xs font-bold text-white transition hover:bg-black active:scale-95 cursor-pointer"
            >
              Try Again
            </button>
          </section>
        ) : recommendations.length === 0 ? (
          /* ================= WELL-BALANCED CLOSET ================= */
          <section className="rounded-3xl border border-dashed border-[#dedad0] bg-white px-6 py-14 text-center shadow-2xs">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-[#f7f7f5] text-3xl shadow-inner">
              ✦
            </div>
            <h2 className="mt-4 text-xl font-extrabold text-gray-950">
              Your wardrobe is already well balanced!
            </h2>
            <p className="mx-auto mt-1 max-w-md text-xs sm:text-sm text-gray-600">
              You currently have strong versatility across tops, bottoms, and footwear. Add more pieces in your Wardrobe Vault to uncover fresh synergy opportunities.
            </p>
            <button
              type="button"
              onClick={() => router.push("/wardrobe")}
              className="mt-6 inline-flex items-center gap-2 rounded-xl bg-[#171717] px-6 py-3 text-xs font-bold text-white shadow-sm transition hover:bg-black active:scale-95 cursor-pointer"
            >
              <span>Go to My Wardrobe</span>
              <span>→</span>
            </button>
          </section>
        ) : (
          /* ================= RECOMMENDATIONS STREAM ================= */
          <div className="space-y-8 animate-pop-in">
            {recommendations.map((recommendation, index) => {
              const hex = COLOR_MAP[recommendation.color.toLowerCase()] || "#9ca3af";

              return (
                <section
                  key={`${recommendation.color}-${recommendation.category}-${index}`}
                  className="rounded-3xl border border-[#e2e4e7] bg-white p-6 shadow-[0_10px_30px_rgba(27,35,43,0.04)] sm:p-8"
                >
                  {/* Gap Summary Banner */}
                  <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between border-b border-[#eceef0] pb-6">
                    <div className="max-w-2xl">
                      <div className="flex items-center gap-2">
                        <span className="rounded-full bg-amber-50 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-amber-900 border border-amber-200">
                          Priority Gap #{index + 1}
                        </span>
                        <span className="rounded-full bg-black/5 px-2.5 py-1 text-[10px] font-semibold text-gray-700">
                          High Versatility Index
                        </span>
                      </div>

                      <div className="mt-3 flex items-center gap-3">
                        <span
                          className="h-4 w-4 rounded-full border border-black/10 shadow-2xs shrink-0"
                          style={{ backgroundColor: hex }}
                        />
                        <h2 className="text-2xl font-extrabold capitalize text-gray-950 sm:text-3xl">
                          {recommendation.color} {recommendation.category}
                        </h2>
                      </div>

                      <p className="mt-2 text-xs sm:text-sm leading-relaxed text-gray-600">
                        {recommendation.reason}
                      </p>
                    </div>

                    {/* Multiplier Scoreboard */}
                    <div className="min-w-[200px] shrink-0 rounded-2xl border border-black/10 bg-[#171717] p-4 text-white shadow-sm text-center md:text-right">
                      <p className="text-3xl font-black text-white sm:text-4xl">
                        +{recommendation.new_outfit_combinations}
                      </p>
                      <p className="mt-1 text-[10px] font-bold uppercase tracking-wider text-gray-300">
                        New Outfits Unlocked
                      </p>
                      <span className="mt-2 inline-block rounded-full bg-white/10 px-2 py-0.5 text-[9px] font-medium text-emerald-300">
                        Multiplier ROI: High
                      </span>
                    </div>
                  </div>

                  {/* Product Cards Grid */}
                  <div className="mt-6">
                    <p className="mb-4 text-xs font-bold uppercase tracking-wider text-gray-400">
                      Curated Matching Garments
                    </p>

                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                      {recommendation.products.map((product) => (
                        <article
                          key={product.id}
                          className="group flex flex-col rounded-2xl border border-[#e2e4e7] bg-[#fbfbf9] p-3.5 transition-all duration-200 hover:-translate-y-1 hover:border-black/30 hover:bg-white hover:shadow-md"
                        >
                          {/* Image Container */}
                          <div className="relative aspect-[4/5] w-full overflow-hidden rounded-xl bg-[#f7f7f5] border border-[#eceef0] p-3 flex items-center justify-center">
                            <img
                              src={product.image}
                              alt={product.name}
                              className="h-full w-full object-contain object-center transition duration-200 group-hover:scale-105"
                            />
                            <div className="absolute top-2 left-2">
                              <span className="rounded-full bg-black/80 backdrop-blur-md px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-white">
                                {product.brand}
                              </span>
                            </div>
                          </div>

                          {/* Details */}
                          <div className="mt-3 flex flex-1 flex-col justify-between px-1">
                            <div>
                              <h3 className="text-sm font-bold text-gray-950 line-clamp-1">
                                {product.name}
                              </h3>
                              <p className="mt-1 text-[11px] capitalize text-gray-500">
                                {product.fit} fit · {product.color}
                              </p>
                            </div>

                            <div className="mt-4 flex items-center justify-between border-t border-[#eceef0] pt-3">
                              <p className="text-base font-extrabold text-gray-950">
                                ₹{product.price.toLocaleString("en-IN")}
                              </p>
                              <button
                                type="button"
                                onClick={() => setSelectedProduct(product)}
                                className="rounded-xl bg-[#171717] px-3.5 py-1.5 text-xs font-bold text-white transition hover:bg-black active:scale-95 cursor-pointer shadow-2xs"
                              >
                                View Piece
                              </button>
                            </div>
                          </div>
                        </article>
                      ))}
                    </div>
                  </div>
                </section>
              );
            })}

            {/* Back to Wardrobe Footer Button */}
            <div className="pt-4">
              <button
                type="button"
                onClick={() => router.push("/wardrobe")}
                className="w-full rounded-2xl border border-[#e2e4e7] bg-white px-6 py-4 text-xs font-bold text-gray-900 transition hover:bg-gray-50 shadow-2xs cursor-pointer"
              >
                ← Back to Wardrobe Vault
              </button>
            </div>
          </div>
        )}

      </div>

      {/* ================= LUXURY PRODUCT INSPECTOR MODAL ================= */}
      {selectedProduct && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs animate-pop-in"
          role="dialog"
          aria-modal="true"
          onClick={() => setSelectedProduct(null)}
        >
          <section
            className="w-full max-w-2xl overflow-hidden rounded-3xl border border-white/20 bg-white shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-[#eceef0] px-6 py-4">
              <div className="flex items-center gap-2">
                <span className="text-sm">🛍️</span>
                <p className="text-xs font-bold uppercase tracking-wider text-gray-500">
                  Product Inspector
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedProduct(null)}
                className="flex h-7 w-7 items-center justify-center rounded-full text-gray-400 transition hover:bg-gray-100 hover:text-black cursor-pointer"
                aria-label="Close modal"
              >
                ✕
              </button>
            </div>

            {/* Modal Body */}
            <div className="grid sm:grid-cols-[1fr_1.1fr]">
              {/* Product Visual */}
              <div className="relative aspect-[4/5] bg-[#f7f7f5] p-6 flex items-center justify-center border-b sm:border-b-0 sm:border-r border-[#eceef0]">
                <img
                  src={selectedProduct.image}
                  alt={selectedProduct.name}
                  className="h-full w-full object-contain object-center"
                />
              </div>

              {/* Product Info & Multiplier Context */}
              <div className="flex flex-col justify-between p-6">
                <div>
                  <span className="inline-block rounded-full bg-black/5 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-gray-600">
                    {selectedProduct.brand}
                  </span>

                  <h2 className="mt-2 text-xl font-extrabold tracking-tight text-gray-950">
                    {selectedProduct.name}
                  </h2>

                  <div className="mt-3 flex items-center gap-2 text-xs text-gray-600">
                    <span className="capitalize">{selectedProduct.fit} fit</span>
                    <span>•</span>
                    <span className="capitalize">{selectedProduct.color}</span>
                    <span>•</span>
                    <span className="capitalize">{selectedProduct.category}</span>
                  </div>

                  <p className="mt-4 text-2xl font-black text-gray-950">
                    ₹{selectedProduct.price.toLocaleString("en-IN")}
                  </p>

                  <div className="mt-5 rounded-2xl bg-[#fffaf0] border border-[#f5e3ba] p-3 text-xs text-amber-900">
                    <p className="font-bold">✦ Wardrobe Multiplier Impact</p>
                    <p className="mt-0.5 text-gray-700 leading-relaxed text-[11px]">
                      This piece pairs directly with your existing jeans, chinos, and shoes to multiply your weekly look options.
                    </p>
                  </div>
                </div>

                <div className="mt-6 border-t border-[#eceef0] pt-4">
                  <button
                    type="button"
                    onClick={() => setSelectedProduct(null)}
                    className="w-full rounded-xl bg-[#171717] py-3 text-xs font-bold text-white transition hover:bg-black cursor-pointer shadow-sm"
                  >
                    Close Preview
                  </button>
                </div>
              </div>
            </div>
          </section>
        </div>
      )}
    </main>
  );
}
