"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { API_BASE_URL, getImageUrl } from "@/lib/api";
import { getStoredUser, getAuthHeaders } from "@/lib/auth";

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

type Recommendation = {
  top_id: number;
  bottom_id: number;
  shoes_id: number;
  score: number;
  explanation?: string;
};

type OutfitResponse = {
  user_id: number;
  occasion: string;
  recommendation: Recommendation;
  recommendations?: Recommendation[];
  explanation?: string;
};

type LiveWeatherData = {
  status: string;
  temperature: number;
  apparent_temperature: number;
  weather_category: "warm" | "cool" | "cold";
  condition: string;
  icon: string;
  styling_tip: string;
  humidity: number;
  wind_speed: number;
  city: string;
  is_precipitation: boolean;
};

// ================= CONFIGURATION =================
const OCCASIONS = [
  { value: "casual", label: "Casual", icon: "☕", desc: "Relaxed daily comfort" },
  { value: "college", label: "College", icon: "🎒", desc: "Effortless campus style" },
  { value: "party", label: "Party", icon: "🥂", desc: "Bold statement energy" },
  { value: "interview", label: "Interview", icon: "💼", desc: "Sharp professional polish" },
  { value: "date", label: "Date", icon: "🍷", desc: "Sophisticated understated charm" },
];

const WEATHER_OPTIONS = [
  { value: "warm", label: "Warm", icon: "☀️", temp: "22°C+" },
  { value: "cool", label: "Cool", icon: "🍂", temp: "14°C–21°C" },
  { value: "cold", label: "Cold", icon: "❄️", temp: "< 14°C" },
];

const STYLE_VIBES = [
  { value: "minimal", label: "Clean Minimal", icon: "♧" },
  { value: "casual", label: "Casual", icon: "□" },
  { value: "streetwear", label: "Streetwear", icon: "⚡" },
  { value: "formal", label: "Smart Formal", icon: "✦" },
];

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

function GarmentCard({ item, role }: { item: WardrobeItem; role: string }) {
  const hex = COLOR_MAP[item.color.toLowerCase()] || "#9ca3af";

  return (
    <div className="group relative flex flex-col rounded-3xl border border-[#e2e4e7] bg-white p-4 shadow-xs transition-all duration-200 hover:-translate-y-1 hover:shadow-md">
      {/* Properly Framed Image */}
      <div className="relative aspect-[4/5] w-full overflow-hidden rounded-2xl bg-[#f7f7f5] border border-[#eceef0] p-3 flex items-center justify-center">
        {item.image_url ? (
          <img
            src={getImageUrl(item.image_url) || item.image_url}
            alt={`${item.color} ${item.category}`}
            className="h-full w-full object-contain object-center transition-transform duration-300 group-hover:scale-105"
            onError={(e) => {
              (e.currentTarget as HTMLElement).style.display = "none";
            }}
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-4xl">
            {role === "Top" ? "👕" : role === "Bottom" ? "👖" : "👟"}
          </div>
        )}

        {/* Role Pill */}
        <div className="absolute top-2.5 left-2.5">
          <span className="rounded-full bg-black/80 backdrop-blur-md px-2.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-white shadow-xs">
            {role}
          </span>
        </div>
      </div>

      {/* Details */}
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

        {/* Tags */}
        <div className="mt-2.5 flex flex-wrap gap-1.5">
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

export default function StylePage() {
  const router = useRouter();

  const [occasion, setOccasion] = useState("casual");
  const [weather, setWeather] = useState("warm");
  const [styleVibe, setStyleVibe] = useState("minimal");

  const [liveWeather, setLiveWeather] = useState<LiveWeatherData | null>(null);
  const [weatherLoading, setWeatherLoading] = useState(false);
  const [weatherError, setWeatherError] = useState("");

  const [outfit, setOutfit] = useState<OutfitResponse | null>(null);
  const [wardrobe, setWardrobe] = useState<WardrobeItem[]>([]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [saveMessage, setSaveMessage] = useState("");

  useEffect(() => {
    const user = getStoredUser();
    if (!user) {
      router.push("/login");
    }
  }, [router]);

  const detectLocalWeather = () => {
    if (typeof window === "undefined" || !navigator.geolocation) {
      setWeatherError("Geolocation is not supported by your browser.");
      return;
    }

    setWeatherLoading(true);
    setWeatherError("");

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const lat = pos.coords.latitude;
          const lon = pos.coords.longitude;
          const res = await fetch(`${API_BASE_URL}/weather/current?lat=${lat}&lon=${lon}`);
          if (!res.ok) {
            throw new Error("Failed to fetch weather forecast");
          }
          const data: LiveWeatherData = await res.json();
          setLiveWeather(data);
          if (data.weather_category) {
            setWeather(data.weather_category);
          }
        } catch (err) {
          console.error(err);
          setWeatherError("Could not retrieve live weather forecast.");
        } finally {
          setWeatherLoading(false);
        }
      },
      (geoErr) => {
        console.warn("Geolocation error:", geoErr);
        setWeatherLoading(false);
        if (geoErr.code === geoErr.PERMISSION_DENIED) {
          setWeatherError("Location access denied. You can select weather manually below.");
        } else {
          setWeatherError("Could not pinpoint location. Please pick weather manually below.");
        }
      },
      { timeout: 8000 }
    );
  };

  const generateOutfit = async () => {
    const user = getStoredUser();
    if (!user) {
      router.push("/login");
      return;
    }

    setLoading(true);
    setError("");
    setSaveStatus("idle");
    setSaveMessage("");

    try {
      const [outfitResponse, wardrobeResponse] = await Promise.all([
        fetch(
          `${API_BASE_URL}/outfits/${user.id}?occasion=${occasion}&style_vibe=${styleVibe}&weather=${weather}`,
          {
            method: "POST",
            headers: getAuthHeaders(),
          }
        ),
        fetch(`${API_BASE_URL}/wardrobe/${user.id}`, {
          headers: getAuthHeaders(),
        }),
      ]);

      if (!outfitResponse.ok) {
        throw new Error("Could not generate outfit");
      }

      if (!wardrobeResponse.ok) {
        throw new Error("Could not load wardrobe");
      }

      const outfitData = await outfitResponse.json();
      const wardrobeData = await wardrobeResponse.json();

      setOutfit(outfitData);
      setWardrobe(wardrobeData);

      localStorage.setItem("wearwise_recommendation", JSON.stringify(outfitData));
      localStorage.setItem(
        "wearwise_style_preferences",
        JSON.stringify({ weather, styleVibe })
      );
    } catch (err) {
      console.error(err);
      setError(
        "Could not generate an outfit. Make sure you have added at least one top, bottom, and footwear in your wardrobe."
      );
    } finally {
      setLoading(false);
    }
  };

  const [selectedLookIdx, setSelectedLookIdx] = useState(0);

  const getWardrobeItem = (id: number) => {
    return wardrobe.find((item) => item.id === id);
  };

  const recommendationsList: Recommendation[] =
    outfit?.recommendations && outfit.recommendations.length > 0
      ? outfit.recommendations
      : outfit?.recommendation
      ? [outfit.recommendation]
      : [];

  const activeRec: Recommendation | undefined =
    recommendationsList[selectedLookIdx] || recommendationsList[0];

  const top = activeRec ? getWardrobeItem(activeRec.top_id) : undefined;
  const bottom = activeRec ? getWardrobeItem(activeRec.bottom_id) : undefined;
  const shoes = activeRec ? getWardrobeItem(activeRec.shoes_id) : undefined;
  const activeExplanation =
    activeRec?.explanation || outfit?.explanation || "AI explanation unavailable";

  const saveOutfit = async () => {
    const user = getStoredUser();
    if (!user || !outfit || !activeRec || !top || !bottom || !shoes) return;

    setSaveStatus("saving");
    setSaveMessage("");

    try {
      const res = await fetch(`${API_BASE_URL}/outfits/${user.id}/save`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({
          top_id: top.id,
          bottom_id: bottom.id,
          shoes_id: shoes.id,
          occasion: outfit.occasion,
          style_vibe: styleVibe || null,
          score: activeRec.score,
          explanation: activeExplanation,
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.detail || "Failed to save outfit");
      }

      setSaveStatus("saved");
      setSaveMessage("Saved to your Lookbook!");
    } catch (err: unknown) {
      console.error(err);
      setSaveStatus("error");
      setSaveMessage(err instanceof Error ? err.message : "Failed to save outfit");
    }
  };

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
                <span>AI Outfit Architect</span>
              </div>
              <h1 className="mt-3 text-3xl font-extrabold tracking-tight text-gray-950 sm:text-4xl">
                Curate Today&apos;s Look
              </h1>
              <p className="mt-1 max-w-xl text-xs sm:text-sm text-gray-600">
                Select your context below. WearWise dynamically pairs your existing clothes for effortless harmony.
              </p>
            </div>

            <div className="flex items-center gap-2.5">
              <Link
                href="/wardrobe"
                className="inline-flex h-11 items-center justify-center rounded-xl border border-[#d4d6da] bg-white px-4 text-xs font-semibold text-gray-800 shadow-2xs transition hover:bg-gray-50 active:scale-95"
              >
                <span>👕 My Wardrobe</span>
              </Link>
              <Link
                href="/saved"
                className="inline-flex h-11 items-center justify-center rounded-xl bg-white border border-[#d4d6da] px-4 text-xs font-semibold text-gray-800 shadow-2xs transition hover:bg-gray-50 active:scale-95"
              >
                <span>★ Saved Looks</span>
              </Link>
            </div>
          </div>
        </div>

        {/* ================= TACTILE CONFIGURATION STUDIO ================= */}
        <section className="rounded-3xl border border-[#e2e4e7] bg-white p-6 shadow-[0_10px_30px_rgba(27,35,43,0.04)]">
          
          {/* Row 1: Occasion Chips */}
          <div>
            <label className="mb-2.5 block text-xs font-bold uppercase tracking-wider text-gray-700">
              1. Select Occasion
            </label>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
              {OCCASIONS.map((occ) => {
                const isSelected = occasion === occ.value;
                return (
                  <button
                    key={occ.value}
                    type="button"
                    onClick={() => setOccasion(occ.value)}
                    className={`flex flex-col items-start rounded-2xl border p-3 text-left transition-all cursor-pointer ${
                      isSelected
                        ? "border-black bg-[#171717] text-white shadow-xs"
                        : "border-gray-200 bg-[#fbfbf9] text-gray-800 hover:border-gray-400 hover:bg-white"
                    }`}
                  >
                    <span className="text-xl">{occ.icon}</span>
                    <span className="mt-2 text-xs font-bold">{occ.label}</span>
                    <span
                      className={`mt-0.5 text-[10px] line-clamp-1 ${
                        isSelected ? "text-gray-300" : "text-gray-500"
                      }`}
                    >
                      {occ.desc}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Live Real-Time Weather Integration Bar */}
          <div className="mt-6 rounded-2xl border border-[#eceef0] bg-[#fbfbf9] p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white text-lg shadow-2xs">
                  {liveWeather ? liveWeather.icon : "📍"}
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-xs font-bold text-gray-900">
                      {liveWeather ? (
                        <span>
                          {liveWeather.city} · {liveWeather.temperature}°C {liveWeather.condition}
                        </span>
                      ) : (
                        "Real-Time Weather Calibrator"
                      )}
                    </p>
                    {liveWeather && (
                      <span className="rounded-full bg-emerald-100 text-emerald-800 px-2 py-0.2 text-[9px] font-bold uppercase tracking-wider">
                        Calibrated ({liveWeather.weather_category}) ✓
                      </span>
                    )}
                  </div>
                  <p className="mt-0.5 text-[11px] text-gray-500 max-w-xl leading-relaxed">
                    {liveWeather
                      ? liveWeather.styling_tip
                      : "Detect your live local forecast to automatically calibrate fabric weights, layers, and footwear recommendations."}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={detectLocalWeather}
                disabled={weatherLoading}
                className="inline-flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-3.5 py-2 text-xs font-bold text-gray-800 shadow-2xs hover:bg-gray-50 transition active:scale-95 disabled:opacity-60 cursor-pointer shrink-0"
              >
                {weatherLoading ? (
                  <>
                    <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-gray-400 border-t-black" />
                    <span>Pinpointing...</span>
                  </>
                ) : (
                  <>
                    <span>{liveWeather ? "↻ Refresh Weather" : "📍 Detect Local Weather"}</span>
                  </>
                )}
              </button>
            </div>

            {weatherError && (
              <p className="mt-2 text-[11px] text-amber-800 font-medium">
                ⚠️ {weatherError}
              </p>
            )}
          </div>

          {/* Row 2: Weather & Style Segmented Controls + Action Button */}
          <div className="mt-6 grid gap-4 md:grid-cols-[1fr_1.3fr_auto] items-end border-t border-[#eceef0] pt-5">
            
            {/* Weather Pills */}
            <div>
              <div className="mb-1.5 flex items-center justify-between">
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-700">
                  2. Weather Context
                </label>
                {liveWeather && (
                  <span className="text-[10px] text-emerald-700 font-semibold">
                    {liveWeather.temperature}°C ({weather})
                  </span>
                )}
              </div>
              <div className="grid grid-cols-3 gap-1 rounded-xl bg-[#f4f5f6] p-1">
                {WEATHER_OPTIONS.map((w) => {
                  const isSelected = weather === w.value;
                  return (
                    <button
                      key={w.value}
                      type="button"
                      onClick={() => setWeather(w.value)}
                      className={`flex items-center justify-center gap-1 rounded-lg py-2 text-center text-xs font-semibold transition-all cursor-pointer ${
                        isSelected
                          ? "bg-white text-black shadow-2xs"
                          : "text-gray-500 hover:text-black"
                      }`}
                    >
                      <span>{w.icon}</span>
                      <span>{w.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Style Vibe Pills */}
            <div>
              <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-gray-700">
                3. Style Vibe
              </label>
              <div className="grid grid-cols-4 gap-1 rounded-xl bg-[#f4f5f6] p-1">
                {STYLE_VIBES.map((s) => {
                  const isSelected = styleVibe === s.value;
                  return (
                    <button
                      key={s.value}
                      type="button"
                      onClick={() => setStyleVibe(s.value)}
                      className={`flex items-center justify-center gap-1 rounded-lg py-2 text-center text-xs font-semibold transition-all cursor-pointer ${
                        isSelected
                          ? "bg-white text-black shadow-2xs"
                          : "text-gray-500 hover:text-black"
                      }`}
                    >
                      <span>{s.icon}</span>
                      <span className="truncate">{s.label.split(" ")[0]}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Primary Generate Button */}
            <div>
              <button
                type="button"
                onClick={generateOutfit}
                disabled={loading}
                className="flex h-11 w-full md:w-auto items-center justify-center gap-2 rounded-xl bg-[#171717] px-6 text-xs font-bold text-white shadow-sm transition hover:bg-black active:scale-98 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                {loading ? (
                  <>
                    <span className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                    <span>Styling...</span>
                  </>
                ) : (
                  <>
                    <span>Generate Outfit</span>
                    <span>✦</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </section>

        {/* Error Notification */}
        {error && (
          <div className="mt-6 flex items-center justify-between rounded-2xl border border-red-200 bg-red-50 p-4 text-xs font-medium text-red-800 animate-pop-in">
            <div className="flex items-center gap-2">
              <span>⚠️</span>
              <span>{error}</span>
            </div>
            <Link href="/wardrobe" className="font-bold underline">
              Add pieces in Wardrobe →
            </Link>
          </div>
        )}

        {/* ================= LOADING SKELETON ================= */}
        {loading && (
          <div className="mt-8 grid gap-6 md:grid-cols-3">
            {["Top", "Bottom", "Footwear"].map((role) => (
              <div
                key={role}
                className="flex flex-col rounded-3xl border border-[#e2e4e7] bg-white p-4 shadow-xs"
              >
                <div className="aspect-[4/5] w-full rounded-2xl bg-[#f4f5f6] animate-pulse flex flex-col items-center justify-center text-gray-300">
                  <span className="text-3xl">✦</span>
                  <span className="mt-2 text-xs font-medium">Harmonizing {role}...</span>
                </div>
                <div className="mt-3.5 space-y-2">
                  <div className="h-4 w-3/4 rounded bg-[#f4f5f6] animate-pulse" />
                  <div className="h-3 w-1/2 rounded bg-[#f4f5f6] animate-pulse" />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ================= OUTFIT RESULTS ================= */}
        {!loading && outfit && top && bottom && shoes && (
          <div className="mt-8 space-y-6 animate-pop-in">
            
            {/* Top Showcase Card */}
            <div className="grid gap-6 lg:grid-cols-[1.9fr_1.1fr]">
              
              {/* Left: 3 Garment Cards Grid */}
              <div className="rounded-3xl border border-[#e2e4e7] bg-white p-6 shadow-[0_10px_30px_rgba(27,35,43,0.04)]">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#eceef0] pb-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-[10px] font-bold text-emerald-800 border border-emerald-200">
                        ⭐ {activeRec?.score ?? outfit.recommendation.score}% Compatibility
                      </span>
                      <span className="rounded-full bg-gray-100 px-2.5 py-0.5 text-[10px] font-semibold text-gray-700 capitalize">
                        {outfit.occasion}
                      </span>
                    </div>
                    <h2 className="mt-1.5 text-xl font-extrabold text-gray-950">
                      Cohesive 3-Piece Formula
                    </h2>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={saveOutfit}
                      disabled={saveStatus === "saving" || saveStatus === "saved"}
                      className={`flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-bold transition shadow-2xs cursor-pointer ${
                        saveStatus === "saved"
                          ? "bg-emerald-700 text-white cursor-default"
                          : "bg-[#171717] text-white hover:bg-black active:scale-95 disabled:opacity-50"
                      }`}
                    >
                      <span>{saveStatus === "saved" ? "✓ Saved" : "★ Save Look"}</span>
                    </button>

                    <Link
                      href="/outfit"
                      className="rounded-xl border border-gray-200 bg-[#fbfbf9] px-3.5 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-100 transition"
                    >
                      Detailed View →
                    </Link>
                  </div>
                </div>

                {/* Multiple Look Formula Selector Tabs */}
                {recommendationsList.length > 1 && (
                  <div className="mt-4 flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none border-b border-[#eceef0] pb-3.5">
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
                          className={`flex items-center gap-2 rounded-xl px-3.5 py-1.5 text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                            isSelected
                              ? "bg-[#171717] text-white shadow-2xs"
                              : "border border-gray-200 bg-[#fbfbf9] text-gray-700 hover:border-gray-400 hover:bg-white"
                          }`}
                        >
                          <span>{label}</span>
                          <span
                            className={`rounded-full px-1.5 py-0.2 text-[10px] ${
                              isSelected ? "bg-white/20 text-white" : "bg-gray-200 text-gray-700"
                            }`}
                          >
                            {rec.score}%
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}

                {/* 3 Pieces Grid */}
                <div className="mt-6 grid gap-4 sm:grid-cols-3">
                  <GarmentCard item={top} role="Top" />
                  <GarmentCard item={bottom} role="Bottom" />
                  <GarmentCard item={shoes} role="Footwear" />
                </div>

                {/* Saved Notification */}
                {saveStatus === "saved" && (
                  <div className="mt-5 flex items-center justify-between rounded-xl bg-emerald-50 border border-emerald-200 px-4 py-3 text-xs text-emerald-900">
                    <span className="font-semibold">{saveMessage || "✓ Successfully saved to your Lookbook!"}</span>
                    <Link href="/saved" className="font-bold underline hover:text-emerald-950">
                      View Lookbook →
                    </Link>
                  </div>
                )}
              </div>

              {/* Right: AI Stylist Harmonic Breakdown */}
              <div className="rounded-3xl border border-[#e2e4e7] bg-white p-6 shadow-[0_10px_30px_rgba(27,35,43,0.04)] flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-2 border-b border-[#eceef0] pb-3">
                    <span className="text-amber-600 text-sm">✦</span>
                    <h3 className="text-sm font-bold uppercase tracking-wider text-gray-900">
                      Harmonic Breakdown
                    </h3>
                  </div>

                  {/* AI Explanation Quote */}
                  <div className="mt-4 rounded-2xl bg-[#fffaf0] border border-[#f5e3ba] p-4">
                    <p className="text-xs text-amber-900 font-bold mb-1">Stylist Rationale</p>
                    <p className="text-xs leading-relaxed text-gray-700">
                      &ldquo;{activeExplanation}&rdquo;
                    </p>
                  </div>

                  {/* 4 Architectural Metric Rows */}
                  <div className="mt-5 space-y-3.5 text-xs">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span>🎨</span>
                        <span className="font-semibold text-gray-800">Color Contrast</span>
                      </div>
                      <span className="font-bold text-emerald-700">Optimal Tonal Ratio</span>
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span>👔</span>
                        <span className="font-semibold text-gray-800">Silhouette Balance</span>
                      </div>
                      <span className="font-bold text-gray-900 capitalize">
                        {top.fit || "Relaxed"} / {bottom.fit || "Standard"}
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span>🌤️</span>
                        <span className="font-semibold text-gray-800">Weather Rating</span>
                      </div>
                      <span className="font-bold text-gray-900 capitalize">
                        {weather} Comfort
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span>🌿</span>
                        <span className="font-semibold text-gray-800">Wardrobe Owned</span>
                      </div>
                      <span className="font-bold text-emerald-700">100% In Closet</span>
                    </div>
                  </div>
                </div>

                {/* Next Purchase Shortcut */}
                <div className="mt-6 border-t border-[#eceef0] pt-4">
                  <Link
                    href="/wardrobe/next-purchase"
                    className="flex items-center justify-between rounded-xl bg-[#fbfbf9] p-3 text-xs border border-[#e2e4e7] hover:border-black/30 transition group"
                  >
                    <div>
                      <p className="font-bold text-gray-900">Want higher versatility?</p>
                      <p className="text-[11px] text-gray-500">Discover your next purchase multiplier</p>
                    </div>
                    <span className="text-sm transition-transform group-hover:translate-x-1">→</span>
                  </Link>
                </div>

              </div>

            </div>

            {/* Bottom Quick-Action Bar */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 rounded-2xl border border-[#e2e4e7] bg-white p-5 shadow-2xs">
              <div className="flex items-center gap-3">
                <span className="text-2xl">🪄</span>
                <div>
                  <p className="text-xs font-bold text-gray-900">
                    Looking for a different direction?
                  </p>
                  <p className="text-[11px] text-gray-500">
                    Switch the occasion or tap below to generate alternative combinations.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2.5">
                <button
                  type="button"
                  onClick={generateOutfit}
                  className="rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-xs font-bold text-gray-800 hover:bg-gray-50 transition cursor-pointer"
                >
                  ⟳ Re-shuffle Look
                </button>
                <Link
                  href="/stylist"
                  className="rounded-xl bg-[#171717] px-4 py-2.5 text-xs font-bold text-white hover:bg-black transition"
                >
                  Ask AI Stylist 💬
                </Link>
              </div>
            </div>

          </div>
        )}

        {/* ================= INITIAL EMPTY STATE ================= */}
        {!outfit && !loading && (
          <div className="mt-8 rounded-3xl border border-dashed border-[#dedad0] bg-white p-12 text-center shadow-2xs">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-[#f7f7f5] text-3xl shadow-inner">
              ✨
            </div>
            <h2 className="mt-4 text-xl font-extrabold text-gray-950">
              Ready to find your look?
            </h2>
            <p className="mx-auto mt-1 max-w-md text-xs sm:text-sm text-gray-600">
              Pick your occasion and weather above, then tap <strong className="text-black">Generate Outfit</strong>. WearWise will match clothes you already own with zero clashing.
            </p>

            <button
              type="button"
              onClick={generateOutfit}
              className="mt-6 inline-flex items-center gap-2 rounded-xl bg-[#171717] px-7 py-3 text-xs font-bold text-white shadow-sm transition hover:bg-black active:scale-95 cursor-pointer"
            >
              <span>Generate My Outfit</span>
              <span>✦</span>
            </button>
          </div>
        )}

      </div>
    </main>
  );
}
