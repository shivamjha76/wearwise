"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

// ================= TYPEWRITER HEADLINE HOOK =================
const TYPEWRITER_PHRASES = [
  "what you already own.",
  "effortless color harmony.",
  "zero morning stress.",
  "pieces in your closet.",
];

function useTypewriter(phrases: string[], typingSpeed = 70, deletingSpeed = 35, pauseDuration = 2000) {
  const [displayText, setDisplayText] = useState(phrases[0]);
  const [phraseIndex, setPhraseIndex] = useState(0);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    const currentPhrase = phrases[phraseIndex];

    if (!isDeleting) {
      if (displayText.length < currentPhrase.length) {
        timer = setTimeout(() => {
          setDisplayText(currentPhrase.slice(0, displayText.length + 1));
        }, typingSpeed);
      } else {
        timer = setTimeout(() => {
          setIsDeleting(true);
        }, pauseDuration);
      }
    } else {
      if (displayText.length > 0) {
        timer = setTimeout(() => {
          setDisplayText(currentPhrase.slice(0, displayText.length - 1));
        }, deletingSpeed);
      } else {
        setIsDeleting(false);
        setPhraseIndex((prev) => (prev + 1) % phrases.length);
      }
    }

    return () => clearTimeout(timer);
  }, [displayText, isDeleting, phraseIndex, phrases, typingSpeed, deletingSpeed, pauseDuration]);

  return displayText;
}

// ================= HERO INTERACTIVE OUTFIT POOLS =================
const TOPS_POOL = [
  { role: "Top", name: "Heavyweight Boxy Tee", bg: "bg-[#f4efe6]", icon: "👕", tag: "Ecru Cotton" },
  { role: "Top", name: "Crisp Poplin Shirt", bg: "bg-[#f3f3f1]", icon: "👔", tag: "Chalk White" },
  { role: "Top", name: "Merino Knit Polo", bg: "bg-[#e7e7e7]", icon: "✨", tag: "Midnight Black" },
  { role: "Top", name: "Canvas Overshirt", bg: "bg-[#e4eae2]", icon: "🧥", tag: "Sage Olive" },
];

const BOTTOMS_POOL = [
  { role: "Bottom", name: "Straight-Leg Denim", bg: "bg-[#dbe6f0]", icon: "👖", tag: "Washed Indigo" },
  { role: "Bottom", name: "Pleated Trousers", bg: "bg-[#e8ebed]", icon: "👖", tag: "Deep Charcoal" },
  { role: "Bottom", name: "Tailored Chinos", bg: "bg-[#e2e6df]", icon: "👖", tag: "Rich Olive" },
  { role: "Bottom", name: "Linen Drawstring", bg: "bg-[#ece7de]", icon: "👖", tag: "Sand Stone" },
];

const FOOTWEAR_POOL = [
  { role: "Footwear", name: "Retro Court Lows", bg: "bg-[#efece6]", icon: "👟", tag: "Off-White" },
  { role: "Footwear", name: "Derby Shoes", bg: "bg-[#e5e5e5]", icon: "👞", tag: "Matte Black" },
  { role: "Footwear", name: "Penny Loafers", bg: "bg-[#ebdcd1]", icon: "👞", tag: "Dark Mahogany" },
  { role: "Footwear", name: "Minimalist Runner", bg: "bg-[#e9e9e9]", icon: "👟", tag: "Slate Gray" },
];

const OCCASIONS = [
  { key: "casual", label: "Casual", top: 0, bottom: 0, shoes: 0, match: "98% Match", vibe: "Clean, relaxed daily style" },
  { key: "work", label: "Work", top: 1, bottom: 1, shoes: 1, match: "99% Match", vibe: "Structured & sharp" },
  { key: "evening", label: "Evening", top: 2, bottom: 2, shoes: 2, match: "100% Match", vibe: "Understated sophistication" },
];

const WEATHER_TIPS: Record<string, { label: string; tip: string }> = {
  mild: {
    label: "☀️ 22°C Mild",
    tip: "A lightweight cotton overshirt adds structure for breezy afternoons.",
  },
  crisp: {
    label: "🍂 16°C Crisp",
    tip: "Layer a merino crewneck over the shoulders for effortless warmth.",
  },
  cool: {
    label: "🌧️ 11°C Cool",
    tip: "Add an unstructured wool car coat to keep the clean silhouette insulated.",
  },
};

// ================= MULTIPLIER STAPLES =================
const MULTIPLIER_STAPLES = [
  { id: "shirt", name: "White Poplin Shirt", icon: "👔", role: "Top" },
  { id: "denim", name: "Raw Selvedge Denim", icon: "👖", role: "Bottom" },
  { id: "loafers", name: "Penny Loafers", icon: "👞", role: "Footwear" },
  { id: "overshirt", name: "Camel Wool Overshirt", icon: "🧥", role: "Layer" },
];

// ================= WHY WEARWISE PILLARS =================
const PILLARS = [
  {
    tag: "Everyday Curation",
    title: "Instant Daily Looks",
    description: "Balanced outfits tailored to your day, style, and weather.",
    badge: "99% Match",
    image: "/products/classic_white_shirt.png",
    alt: "Classic White Shirt",
    icon: "✨",
  },
  {
    tag: "Color Theory",
    title: "Cohesive Palettes",
    description: "Tonal and contrast harmony with zero clashing.",
    badge: "Harmonic Contrast",
    image: "/products/black_casual_shirt.png",
    alt: "Black Casual Shirt",
    icon: "🎨",
  },
  {
    tag: "Smart Shopping",
    title: "Next Purchase Value",
    description: "Spot the exact item that unlocks 6+ new combinations.",
    badge: "+6 Outfits Unlocked",
    image: "/products/olive_green_shirt.png",
    alt: "Olive Green Shirt",
    icon: "📈",
  },
];

const COLOR_PALETTES = [
  { name: "Ivory & Slate", hex: "#eae7df", note: "Soft tonal morning balance" },
  { name: "Monochrome Black", hex: "#1c1c1c", note: "High contrast architectural look" },
  { name: "Olive Earth", hex: "#5c6b54", note: "Subtle nature-inspired grounding" },
  { name: "Washed Navy", hex: "#3b4856", note: "Timeless maritime everyday tone" },
];

export default function Home() {
  // Typewriter hook for hero headline
  const typedTagline = useTypewriter(TYPEWRITER_PHRASES);

  // Hero interactive outfit state
  const [activeOccasion, setActiveOccasion] = useState<string>("casual");
  const [topIdx, setTopIdx] = useState<number>(0);
  const [bottomIdx, setBottomIdx] = useState<number>(0);
  const [footwearIdx, setFootwearIdx] = useState<number>(0);
  const [activeWeather, setActiveWeather] = useState<"mild" | "crisp" | "cool">("mild");
  const [isShuffling, setIsShuffling] = useState<boolean>(false);
  const [swapAnimationKey, setSwapAnimationKey] = useState<number>(0);

  // Multiplier interactive state
  const [selectedStaples, setSelectedStaples] = useState<string[]>(["shirt", "denim", "loafers", "overshirt"]);

  // Pillar 2 interactive color swatch state
  const [selectedColorIdx, setSelectedColorIdx] = useState<number>(0);

  // When occasion tab is clicked, update default coordinates
  const handleSelectOccasion = (key: string) => {
    setActiveOccasion(key);
    const found = OCCASIONS.find((o) => o.key === key);
    if (found) {
      setTopIdx(found.top);
      setBottomIdx(found.bottom);
      setFootwearIdx(found.shoes);
      setSwapAnimationKey((prev) => prev + 1);
    }
  };

  // Shuffle generator
  const handleShuffleLook = () => {
    setIsShuffling(true);
    setSwapAnimationKey((prev) => prev + 1);

    const randomTop = Math.floor(Math.random() * TOPS_POOL.length);
    const randomBottom = Math.floor(Math.random() * BOTTOMS_POOL.length);
    const randomShoes = Math.floor(Math.random() * FOOTWEAR_POOL.length);

    setTopIdx(randomTop);
    setBottomIdx(randomBottom);
    setFootwearIdx(randomShoes);

    setTimeout(() => {
      setIsShuffling(false);
    }, 450);
  };

  // Cycle individual piece on click
  const handleCycleTop = () => {
    setTopIdx((prev) => (prev + 1) % TOPS_POOL.length);
    setSwapAnimationKey((prev) => prev + 1);
  };

  const handleCycleBottom = () => {
    setBottomIdx((prev) => (prev + 1) % BOTTOMS_POOL.length);
    setSwapAnimationKey((prev) => prev + 1);
  };

  const handleCycleFootwear = () => {
    setFootwearIdx((prev) => (prev + 1) % FOOTWEAR_POOL.length);
    setSwapAnimationKey((prev) => prev + 1);
  };

  // Current active pieces
  const currentTop = TOPS_POOL[topIdx];
  const currentBottom = BOTTOMS_POOL[bottomIdx];
  const currentFootwear = FOOTWEAR_POOL[footwearIdx];

  // Dynamic compatibility score
  const harmonicScore = 95 + ((topIdx * 2 + bottomIdx * 3 + footwearIdx) % 6);

  // Multiplier calculation
  const toggleStaple = (id: string) => {
    setSelectedStaples((prev) =>
      prev.includes(id) ? (prev.length > 1 ? prev.filter((item) => item !== id) : prev) : [...prev, id]
    );
  };

  const stapleCount = selectedStaples.length;
  const combinationsUnlocked = stapleCount === 1 ? 1 : stapleCount === 2 ? 4 : stapleCount === 3 ? 9 : 16;
  const efficiencyPercent = Math.min(100, stapleCount * 25);

  return (
    <main className="relative overflow-hidden bg-[#f7f7f5] text-[#111111]">
      {/* Ambient lighting glow */}
      <div className="pointer-events-none absolute -top-40 left-1/2 -z-10 h-[500px] w-[900px] -translate-x-1/2 rounded-full bg-gradient-to-b from-[#e7ebe3]/60 via-[#fcfbf7]/40 to-transparent blur-3xl" />

      {/* ================= HERO SECTION ================= */}
      <section className="relative border-b border-[#e4e5e7] px-5 pb-16 pt-12 sm:px-8 sm:pb-24 sm:pt-16 lg:pt-20">
        <div className="mx-auto max-w-6xl">
          <div className="grid items-center gap-12 lg:grid-cols-[1.05fr_0.95fr] lg:gap-14">
            
            {/* Left Copy */}
            <div className="max-w-2xl">
              <div className="inline-flex items-center gap-2 rounded-full border border-[#dedad0] bg-white/95 px-3.5 py-1.5 shadow-2xs backdrop-blur-md">
                <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#45546a]">
                  Personal Style Intelligence
                </span>
              </div>

              {/* Dynamic Typewriter Headline */}
              <h1 className="mt-5 text-4xl font-extrabold tracking-[-0.04em] text-[#111111] sm:text-5xl lg:text-[3.9rem] lg:leading-[1.06]">
                Dress better with{" "}
                <span className="relative inline-block min-h-[1.25em] text-[#2c3540]">
                  <span>{typedTagline}</span>
                  <span className="inline-block w-[3px] h-[0.8em] ml-1 bg-amber-600 animate-cursor-blink align-middle" />
                </span>
              </h1>

              {/* Action Buttons */}
              <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
                <Link
                  href="/register"
                  className="group inline-flex h-12 items-center justify-center rounded-xl bg-[#171717] px-7 text-sm font-semibold text-white shadow-sm transition-all duration-200 hover:bg-black hover:shadow-md active:scale-[0.98]"
                >
                  <span>Build My Wardrobe</span>
                  <span className="ml-2 transition-transform duration-200 group-hover:translate-x-1">→</span>
                </Link>

                <Link
                  href="/style"
                  className="inline-flex h-12 items-center justify-center rounded-xl border border-[#d4d6da] bg-white px-6 text-sm font-semibold text-gray-800 shadow-2xs transition-all duration-200 hover:bg-gray-50 active:scale-[0.98]"
                >
                  Explore Outfits
                </Link>
              </div>
            </div>

            {/* Right Interactive Hero Card */}
            <div className="relative mx-auto w-full max-w-lg lg:max-w-none">
              <div className="rounded-3xl border border-[#e2e4e7] bg-white p-5 shadow-[0_16px_40px_rgba(27,35,43,0.07)] sm:p-6 transition-all">
                
                {/* Header & Tabs */}
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#eceef0] pb-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-gray-400">
                        Interactive Outfit Lab
                      </p>
                      <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[9px] font-semibold text-emerald-700 border border-emerald-200">
                        Tap pieces to swap ↻
                      </span>
                    </div>
                    <p className="text-base font-bold tracking-tight text-gray-900 mt-0.5">
                      {OCCASIONS.find((o) => o.key === activeOccasion)?.vibe || "Tailored Harmony"}
                    </p>
                  </div>

                  {/* Clean Tab Switcher */}
                  <div className="flex rounded-xl bg-[#f5f6f7] p-1">
                    {OCCASIONS.map((look) => {
                      const isActive = look.key === activeOccasion;
                      return (
                        <button
                          key={look.key}
                          type="button"
                          onClick={() => handleSelectOccasion(look.key)}
                          className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition-all ${
                            isActive
                              ? "bg-white text-black shadow-2xs"
                              : "text-gray-500 hover:text-black"
                          }`}
                        >
                          {look.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* 3 Clickable Outfit Pieces */}
                <div key={swapAnimationKey} className="mt-4 grid grid-cols-3 gap-3 animate-pop-in">
                  
                  {/* Top Piece */}
                  <button
                    type="button"
                    onClick={handleCycleTop}
                    className="group relative flex flex-col rounded-2xl border border-[#eceef0] bg-[#fafafa] p-3 text-center transition-all hover:border-black/30 hover:bg-white hover:shadow-xs active:scale-95 text-left cursor-pointer"
                    title="Click to swap top"
                  >
                    <div
                      className={`flex aspect-[4/5] items-center justify-center rounded-xl ${currentTop.bg} text-3xl shadow-inner transition-transform duration-200 group-hover:scale-105`}
                    >
                      {currentTop.icon}
                    </div>
                    <p className="mt-2 text-[10px] font-bold uppercase tracking-wider text-gray-400 flex items-center justify-between">
                      <span>{currentTop.role}</span>
                      <span className="text-[9px] text-gray-400 group-hover:text-black">↻</span>
                    </p>
                    <p className="mt-0.5 line-clamp-1 text-xs font-bold text-gray-900">
                      {currentTop.name}
                    </p>
                    <span className="mt-1 inline-block truncate rounded bg-white px-1.5 py-0.5 text-[9px] font-medium text-gray-500 border border-gray-200">
                      {currentTop.tag}
                    </span>
                  </button>

                  {/* Bottom Piece */}
                  <button
                    type="button"
                    onClick={handleCycleBottom}
                    className="group relative flex flex-col rounded-2xl border border-[#eceef0] bg-[#fafafa] p-3 text-center transition-all hover:border-black/30 hover:bg-white hover:shadow-xs active:scale-95 text-left cursor-pointer"
                    title="Click to swap bottom"
                  >
                    <div
                      className={`flex aspect-[4/5] items-center justify-center rounded-xl ${currentBottom.bg} text-3xl shadow-inner transition-transform duration-200 group-hover:scale-105`}
                    >
                      {currentBottom.icon}
                    </div>
                    <p className="mt-2 text-[10px] font-bold uppercase tracking-wider text-gray-400 flex items-center justify-between">
                      <span>{currentBottom.role}</span>
                      <span className="text-[9px] text-gray-400 group-hover:text-black">↻</span>
                    </p>
                    <p className="mt-0.5 line-clamp-1 text-xs font-bold text-gray-900">
                      {currentBottom.name}
                    </p>
                    <span className="mt-1 inline-block truncate rounded bg-white px-1.5 py-0.5 text-[9px] font-medium text-gray-500 border border-gray-200">
                      {currentBottom.tag}
                    </span>
                  </button>

                  {/* Footwear Piece */}
                  <button
                    type="button"
                    onClick={handleCycleFootwear}
                    className="group relative flex flex-col rounded-2xl border border-[#eceef0] bg-[#fafafa] p-3 text-center transition-all hover:border-black/30 hover:bg-white hover:shadow-xs active:scale-95 text-left cursor-pointer"
                    title="Click to swap footwear"
                  >
                    <div
                      className={`flex aspect-[4/5] items-center justify-center rounded-xl ${currentFootwear.bg} text-3xl shadow-inner transition-transform duration-200 group-hover:scale-105`}
                    >
                      {currentFootwear.icon}
                    </div>
                    <p className="mt-2 text-[10px] font-bold uppercase tracking-wider text-gray-400 flex items-center justify-between">
                      <span>{currentFootwear.role}</span>
                      <span className="text-[9px] text-gray-400 group-hover:text-black">↻</span>
                    </p>
                    <p className="mt-0.5 line-clamp-1 text-xs font-bold text-gray-900">
                      {currentFootwear.name}
                    </p>
                    <span className="mt-1 inline-block truncate rounded bg-white px-1.5 py-0.5 text-[9px] font-medium text-gray-500 border border-gray-200">
                      {currentFootwear.tag}
                    </span>
                  </button>
                </div>

                {/* Weather Context & Smart Tip */}
                <div className="mt-4 rounded-2xl bg-[#fffaf0] border border-[#f5e3ba] p-3.5">
                  <div className="flex items-center justify-between border-b border-[#faecc5] pb-2 mb-2">
                    <div className="flex items-center gap-1.5">
                      <span className="text-amber-700 text-xs">✦</span>
                      <span className="text-[11px] font-bold uppercase tracking-wider text-amber-900">
                        Weather Layering
                      </span>
                    </div>

                    {/* Weather Switcher */}
                    <div className="flex items-center gap-1">
                      {(["mild", "crisp", "cool"] as const).map((wKey) => (
                        <button
                          key={wKey}
                          type="button"
                          onClick={() => setActiveWeather(wKey)}
                          className={`rounded-md px-2 py-0.5 text-[10px] font-semibold transition-all cursor-pointer ${
                            activeWeather === wKey
                              ? "bg-amber-900 text-white shadow-2xs"
                              : "bg-white/70 text-amber-800 hover:bg-white"
                          }`}
                        >
                          {WEATHER_TIPS[wKey].label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <p className="text-xs text-gray-700 leading-relaxed">
                    {WEATHER_TIPS[activeWeather].tip}
                  </p>
                </div>

                {/* Footer Controls with Shuffle Button */}
                <div className="mt-4 flex items-center justify-between border-t border-[#f0f1f3] pt-3 text-xs">
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center rounded-full bg-black/5 px-2.5 py-1 font-bold text-gray-900 border border-black/10">
                      Harmonic Match: {harmonicScore}%
                    </span>
                    <button
                      type="button"
                      onClick={handleShuffleLook}
                      className="inline-flex items-center gap-1 rounded-full border border-gray-200 bg-white px-2.5 py-1 font-semibold text-gray-700 hover:border-black/30 hover:text-black transition-all active:scale-95 shadow-2xs cursor-pointer"
                      title="Generate surprise combination"
                    >
                      <span className={`inline-block transition-transform duration-500 ${isShuffling ? "animate-spin-once" : ""}`}>🎲</span>
                      <span>Shuffle</span>
                    </button>
                  </div>

                  <Link href="/style" className="font-semibold text-black hover:underline">
                    Try Style Me →
                  </Link>
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* ================= INTERACTIVE WARDROBE MULTIPLIER ================= */}
      <section className="border-b border-[#e2e4e7] bg-[#fbfbf9] px-5 py-14 sm:px-8 sm:py-16">
        <div className="mx-auto max-w-5xl">
          <div className="text-center max-w-xl mx-auto">
            <div className="inline-flex items-center gap-2 rounded-full border border-[#dedad0] bg-white px-3 py-1 shadow-2xs">
              <span className="text-amber-600 text-xs">⚡</span>
              <span className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#45546a]">
                Interactive Sandbox
              </span>
            </div>
            <h2 className="mt-3 text-2xl font-bold tracking-tight text-black sm:text-3xl">
              The Wardrobe Multiplier
            </h2>
            <p className="mt-2 text-xs sm:text-sm text-gray-600">
              Tap staples below. See how few conscious pieces generate exponential daily looks.
            </p>
          </div>

          {/* Interactive Staples Bar */}
          <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {MULTIPLIER_STAPLES.map((staple) => {
              const isSelected = selectedStaples.includes(staple.id);
              return (
                <button
                  key={staple.id}
                  type="button"
                  onClick={() => toggleStaple(staple.id)}
                  className={`flex flex-col items-center justify-center rounded-2xl border p-4 text-center transition-all duration-200 active:scale-98 cursor-pointer ${
                    isSelected
                      ? "border-black bg-white shadow-sm ring-1 ring-black/10"
                      : "border-gray-200 bg-gray-50/70 text-gray-400 opacity-60 hover:opacity-100"
                  }`}
                >
                  <span className="text-2xl">{staple.icon}</span>
                  <span className="mt-2 text-xs font-bold text-gray-900">
                    {staple.name}
                  </span>
                  <span className="mt-1 text-[10px] font-medium text-gray-500">
                    {staple.role}
                  </span>
                  <span
                    className={`mt-2 rounded-full px-2 py-0.5 text-[9px] font-bold ${
                      isSelected
                        ? "bg-emerald-100 text-emerald-800"
                        : "bg-gray-200 text-gray-600"
                    }`}
                  >
                    {isSelected ? "Active Piece ✓" : "Tap to Add +"}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Dynamic Calculated Output */}
          <div className="mt-6 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-[#e2e4e7] bg-white p-4 sm:p-5 shadow-2xs">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#171717] text-xl font-black text-white shadow-2xs">
                {combinationsUnlocked}
              </div>
              <div>
                <p className="text-sm font-bold text-gray-900">
                  {combinationsUnlocked} Cohesive Combinations Unlocked
                </p>
                <p className="text-xs text-gray-500">
                  from {stapleCount} versatile {stapleCount === 1 ? "staple" : "staples"} in your rotation
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="text-right">
                <span className="text-xs font-bold text-emerald-700">
                  {efficiencyPercent}% Closet Efficiency
                </span>
                <p className="text-[11px] text-gray-400">$0 New Spend Required</p>
              </div>
              <Link
                href="/register"
                className="rounded-xl bg-black px-4 py-2 text-xs font-semibold text-white hover:bg-gray-800 transition"
              >
                Scan Your Closet →
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ================= THREE CORE PILLARS ================= */}
      <section className="border-y border-[#e2e4e7] bg-white px-5 py-16 sm:px-8 sm:py-20">
        <div className="mx-auto max-w-6xl">
          <div className="text-center max-w-xl mx-auto">
            <p className="text-[12px] font-bold uppercase tracking-[0.18em] text-[#45546a]">
              Why WearWise
            </p>
            <h2 className="mt-2.5 text-3xl font-bold tracking-tight text-black sm:text-4xl">
              Less guessing. More wearing.
            </h2>
          </div>

          <div className="mt-12 grid gap-6 md:grid-cols-3">
            {/* Card 1: Everyday Curation */}
            <div className="group relative flex flex-col rounded-3xl border border-[#e2e4e7] bg-[#fbfbf9] p-4 transition-all duration-200 hover:-translate-y-1 hover:shadow-md">
              <div className="relative aspect-[4/5] w-full overflow-hidden rounded-2xl bg-[#f7f7f5] border border-[#eceef0] p-3 sm:p-4 flex items-center justify-center">
                <img
                  src={PILLARS[0].image}
                  alt={PILLARS[0].alt}
                  className="h-full w-full object-contain object-center transition-transform duration-300 group-hover:scale-105"
                />
                <div className="absolute top-3 right-3 flex items-center gap-1.5 rounded-full bg-black/80 backdrop-blur-md px-2.5 py-1 text-[10px] font-semibold text-white shadow-sm">
                  <span>{PILLARS[0].icon}</span>
                  <span>{PILLARS[0].badge}</span>
                </div>
              </div>

              <div className="p-3 pt-4">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#677485]">
                  {PILLARS[0].tag}
                </span>
                <h3 className="mt-1 text-lg font-bold text-gray-900">
                  {PILLARS[0].title}
                </h3>
                <p className="mt-1 text-xs leading-relaxed text-gray-600">
                  {PILLARS[0].description}
                </p>
              </div>
            </div>

            {/* Card 2: Color Theory with Interactive Swatches */}
            <div className="group relative flex flex-col rounded-3xl border border-[#e2e4e7] bg-[#fbfbf9] p-4 transition-all duration-200 hover:-translate-y-1 hover:shadow-md">
              <div className="relative aspect-[4/5] w-full overflow-hidden rounded-2xl bg-[#f7f7f5] border border-[#eceef0] p-3 sm:p-4 flex items-center justify-center">
                <img
                  src={PILLARS[1].image}
                  alt={PILLARS[1].alt}
                  className="h-full w-full object-contain object-center transition-transform duration-300 group-hover:scale-105"
                />
                <div className="absolute top-3 right-3 flex items-center gap-1.5 rounded-full bg-black/80 backdrop-blur-md px-2.5 py-1 text-[10px] font-semibold text-white shadow-sm">
                  <span>{PILLARS[1].icon}</span>
                  <span>{PILLARS[1].badge}</span>
                </div>
              </div>

              <div className="p-3 pt-4">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#677485]">
                    {PILLARS[1].tag}
                  </span>
                  <span className="text-[9px] font-semibold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
                    Interactive Swatch
                  </span>
                </div>
                <h3 className="mt-1 text-lg font-bold text-gray-900">
                  {PILLARS[1].title}
                </h3>
                <p className="mt-1 text-xs leading-relaxed text-gray-600">
                  {PILLARS[1].description}
                </p>

                {/* Interactive Palette Dots */}
                <div className="mt-3 flex items-center gap-1.5 border-t border-[#eceef0] pt-2.5">
                  {COLOR_PALETTES.map((palette, pIdx) => (
                    <button
                      key={palette.name}
                      type="button"
                      onClick={() => setSelectedColorIdx(pIdx)}
                      className={`h-5 w-5 rounded-full border transition-all cursor-pointer ${
                        selectedColorIdx === pIdx
                          ? "ring-2 ring-black scale-110 border-white"
                          : "border-gray-300 opacity-70 hover:opacity-100"
                      }`}
                      style={{ backgroundColor: palette.hex }}
                      title={palette.name}
                    />
                  ))}
                  <span className="ml-1 text-[10px] font-medium text-gray-600 truncate">
                    {COLOR_PALETTES[selectedColorIdx].note}
                  </span>
                </div>
              </div>
            </div>

            {/* Card 3: Smart Shopping */}
            <div className="group relative flex flex-col rounded-3xl border border-[#e2e4e7] bg-[#fbfbf9] p-4 transition-all duration-200 hover:-translate-y-1 hover:shadow-md">
              <div className="relative aspect-[4/5] w-full overflow-hidden rounded-2xl bg-[#f7f7f5] border border-[#eceef0] p-3 sm:p-4 flex items-center justify-center">
                <img
                  src={PILLARS[2].image}
                  alt={PILLARS[2].alt}
                  className="h-full w-full object-contain object-center transition-transform duration-300 group-hover:scale-105"
                />
                <div className="absolute top-3 right-3 flex items-center gap-1.5 rounded-full bg-black/80 backdrop-blur-md px-2.5 py-1 text-[10px] font-semibold text-white shadow-sm">
                  <span>{PILLARS[2].icon}</span>
                  <span>{PILLARS[2].badge}</span>
                </div>
              </div>

              <div className="p-3 pt-4">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#677485]">
                  {PILLARS[2].tag}
                </span>
                <h3 className="mt-1 text-lg font-bold text-gray-900">
                  {PILLARS[2].title}
                </h3>
                <p className="mt-1 text-xs leading-relaxed text-gray-600">
                  {PILLARS[2].description}
                </p>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* ================= CLEAN CLOSING CTA ================= */}
      <section className="px-5 py-16 sm:px-8 sm:py-24">
        <div className="mx-auto max-w-6xl rounded-3xl bg-[#171717] px-6 py-14 text-center text-white shadow-xl sm:px-12 sm:py-18">
          <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-gray-400">
            Start Today
          </p>
          <h2 className="mx-auto mt-3 max-w-xl text-3xl font-bold tracking-tight sm:text-4xl">
            Start with what&apos;s already in your closet.
          </h2>
          <p className="mx-auto mt-4 max-w-lg text-sm leading-relaxed text-gray-300">
            Build your wardrobe profile in 2 minutes and let your clothes guide your next look.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              href="/register"
              className="inline-flex h-12 items-center justify-center rounded-xl bg-white px-7 text-sm font-semibold text-black transition hover:bg-gray-100"
            >
              Get Started Free →
            </Link>
            <Link
              href="/login"
              className="inline-flex h-12 items-center justify-center rounded-xl border border-gray-700 bg-transparent px-6 text-sm font-semibold text-gray-300 transition hover:border-gray-500 hover:text-white"
            >
              Log in
            </Link>
          </div>
        </div>
      </section>

      {/* ================= CLEAN PROFESSIONAL FOOTER ================= */}
      <footer className="border-t border-[#e2e4e7] bg-white px-5 py-8 sm:px-8">
        <div className="mx-auto max-w-6xl flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-gray-500">
          <div className="flex items-center gap-2">
            <Link href="/" className="font-bold text-gray-900 text-sm hover:opacity-80 transition">
              WearWise
            </Link>
            <span className="text-gray-400">•</span>
            <span>Digital Wardrobe Intelligence</span>
          </div>

          <div className="flex items-center gap-6 font-medium text-gray-600">
            <Link href="/login" className="hover:text-black transition">
              Log In
            </Link>
            <Link href="/register" className="hover:text-black transition">
              Create Account
            </Link>
          </div>

          <p>© {new Date().getFullYear()} WearWise. All rights reserved.</p>
        </div>
      </footer>
    </main>
  );
}
