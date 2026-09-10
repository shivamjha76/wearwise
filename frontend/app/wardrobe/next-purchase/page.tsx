"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Search,
  ChevronDown,
  ChevronUp,
  Heart,
  Filter,
  X,
  ExternalLink,
  Sparkles,
  ShoppingBag,
  Star,
  Check,
  RotateCcw
} from "lucide-react";
import { API_BASE_URL } from "@/lib/api";
import { getStoredUser, getAuthHeaders } from "@/lib/auth";

type Product = {
  id: string | number;
  name: string;
  category: string;
  group?: string;
  color: string;
  fit?: string;
  price: number;
  original_price?: number;
  discount_percent?: number;
  rating?: number;
  reviews_count?: number;
  brand?: string;
  image: string;
  store?: string;
  store_url?: string;
  badge?: string;
  reason?: string;
  is_wardrobe_match?: boolean;
  multiplier?: number | null;
};

type Recommendation = {
  category: string;
  color: string;
  score: number;
  new_outfit_combinations: number;
  reason: string;
  products: Product[];
};

const CATEGORY_OPTIONS = [
  "Topwear",
  "Bottomwear",
  "Footwear",
  "Outerwear",
  "Accessories",
];

const COLOR_SWATCHES = [
  { name: "black", hex: "#111111", border: "border-transparent" },
  { name: "white", hex: "#ffffff", border: "border-gray-300" },
  { name: "grey", hex: "#94a3b8", border: "border-transparent" },
  { name: "blue", hex: "#1e3a8a", border: "border-transparent" },
  { name: "olive", hex: "#556b2f", border: "border-transparent" },
  { name: "maroon", hex: "#7f1d1d", border: "border-transparent" },
  { name: "beige", hex: "#d4b996", border: "border-transparent" },
];

const POPULAR_BRANDS = [
  "H&M",
  "The Souled Store",
  "Snitch",
  "Red Tape",
  "Max",
  "Roadster",
  "Kotty",
  "El Paso",
  "Kraus",
  "Timex",
  "Cava",
  "Calvin Klein",
  "Mast & Harbour",
  "Liberty",
  "Uniqlo",
  "Levi's",
  "Zara",
  "Nike",
  "Fossil",
];

export default function ShopPage() {
  const router = useRouter();
  const [products, setProducts] = useState<Product[]>([]);
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  // Filter States
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [maxPrice, setMaxPrice] = useState<number>(10000);
  const [selectedColor, setSelectedColor] = useState<string | null>(null);
  const [selectedBrand, setSelectedBrand] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<string>("recommended");

  // Accordion Toggles
  const [categoryOpen, setCategoryOpen] = useState(true);
  const [colorOpen, setColorOpen] = useState(true);
  const [brandOpen, setBrandOpen] = useState(false);

  // Mobile Filter Drawer
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);

  // Wishlist & Modal State
  const [wishlist, setWishlist] = useState<Set<string>>(new Set());
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  // Load wishlist from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem("wearwise_shop_wishlist");
      if (saved) {
        setWishlist(new Set(JSON.parse(saved)));
      }
    } catch {
      // ignore
    }
  }, []);

  const toggleWishlist = (id: string | number) => {
    const key = String(id);
    setWishlist((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      try {
        localStorage.setItem("wearwise_shop_wishlist", JSON.stringify(Array.from(next)));
      } catch {
        // ignore
      }
      return next;
    });
  };

  const [searchingLive, setSearchingLive] = useState(false);

  const fetchShopData = async (queryParam?: string) => {
    const user = getStoredUser();
    if (!user) {
      router.push("/login");
      return;
    }

    if (queryParam) {
      setSearchingLive(true);
    } else {
      setLoading(true);
    }
    setError(false);

    try {
      const url = new URL(`${API_BASE_URL}/wardrobe/${user.id}/next-purchase`);
      if (user.gender) {
        url.searchParams.set("gender", user.gender);
      }
      if (queryParam && queryParam.trim().length >= 3) {
        url.searchParams.set("q", queryParam.trim());
      }

      const response = await fetch(url.toString(), {
        headers: getAuthHeaders(),
      });
      if (!response.ok) throw new Error("Failed to fetch shop recommendations");
      const data = await response.json();
      setRecommendations(data.recommendations || []);
      setProducts(data.all_products || []);
    } catch (err) {
      console.error(err);
      setError(true);
    } finally {
      setLoading(false);
      setSearchingLive(false);
    }
  };

  useEffect(() => {
    fetchShopData();
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

  // Clear all filters
  const handleClearAll = () => {
    setSearchQuery("");
    setSelectedCategories([]);
    setMaxPrice(10000);
    setSelectedColor(null);
    setSelectedBrand(null);
    setSortBy("recommended");
  };

  // Toggle Category Checkbox
  const toggleCategory = (cat: string) => {
    setSelectedCategories((prev) =>
      prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat]
    );
  };

  // Filter and Sort Logic
  const filteredProducts = useMemo(() => {
    let list = [...products];

    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter((p) => {
        const text = `${p.name} ${p.brand || ""} ${p.category} ${p.color} ${p.group || ""}`.toLowerCase();
        return text.includes(q);
      });
    }

    // Category filter (Topwear, Bottomwear, Footwear, Outerwear, Accessories)
    if (selectedCategories.length > 0) {
      list = list.filter((p) => p.group && selectedCategories.includes(p.group));
    }

    // Price range slider
    list = list.filter((p) => p.price <= maxPrice);

    // Color swatch filter
    if (selectedColor) {
      const target = selectedColor.toLowerCase();
      list = list.filter((p) => {
        const c = (p.color || "").toLowerCase();
        if (target === "blue") return c.includes("blue") || c.includes("navy") || c.includes("indigo");
        if (target === "beige") return c.includes("beige") || c.includes("khaki") || c.includes("tan");
        if (target === "olive") return c.includes("olive") || c.includes("green");
        if (target === "grey") return c.includes("grey") || c.includes("charcoal");
        return c.includes(target);
      });
    }

    // Brand filter
    if (selectedBrand) {
      list = list.filter((p) => (p.brand || "").toLowerCase() === selectedBrand.toLowerCase());
    }

    // Sorting
    if (sortBy === "price_asc") {
      list.sort((a, b) => a.price - b.price);
    } else if (sortBy === "price_desc") {
      list.sort((a, b) => b.price - a.price);
    } else if (sortBy === "rating") {
      list.sort((a, b) => (b.rating || 0) - (a.rating || 0));
    } else if (sortBy === "recommended") {
      // Wardrobe gap matches first, then highest rating
      list.sort((a, b) => {
        if (a.is_wardrobe_match && !b.is_wardrobe_match) return -1;
        if (!a.is_wardrobe_match && b.is_wardrobe_match) return 1;
        return (b.rating || 4.5) - (a.rating || 4.5);
      });
    }

    return list;
  }, [products, searchQuery, selectedCategories, maxPrice, selectedColor, selectedBrand, sortBy]);

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#fbfbf9] px-6">
        <div className="text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#111111] text-white shadow-sm">
            <ShoppingBag className="h-6 w-6 animate-pulse" />
          </div>
          <div className="mx-auto mt-4 h-6 w-6 animate-spin rounded-full border-2 border-gray-300 border-t-black" />
          <p className="mt-4 text-xs font-bold uppercase tracking-widest text-gray-700">
            Curating Wardrobe Picks...
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#faf9f6] text-[#111111] pb-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-6">

        {/* ================= HERO BANNER ================= */}
        <div className="relative overflow-hidden rounded-2xl sm:rounded-3xl border border-[#ded9cf] bg-[#ede8e1] shadow-xs mb-8">
          <div className="grid grid-cols-1 md:grid-cols-12 items-center min-h-[140px] sm:min-h-[160px]">
            {/* Left Content */}
            <div className="p-6 sm:p-8 md:p-10 md:col-span-6 lg:col-span-5 z-10">
              <span className="text-[10px] sm:text-[11px] font-bold tracking-[0.2em] text-neutral-500 uppercase">
                SHOP SMARTER
              </span>
              <h1 className="mt-1.5 text-2xl sm:text-3xl lg:text-4xl font-black text-neutral-950 tracking-tight leading-tight">
                Find what fits your style
              </h1>
              <p className="mt-1 text-xs sm:text-sm text-neutral-600 font-medium">
                Curated picks to complete your wardrobe.
              </p>
            </div>

            {/* Right Flatlay Visual */}
            <div className="md:col-span-6 lg:col-span-7 h-36 md:h-full relative overflow-hidden flex items-center justify-end">
              <img
                src="/shop/banner_flatlay.png"
                alt="Curated wardrobe flatlay with sneakers and shirts"
                className="h-full w-full object-cover md:object-contain object-right"
              />
            </div>
          </div>
        </div>

        {/* ================= MAIN LAYOUT: SIDEBAR + GRID ================= */}
        <div className="flex flex-col lg:flex-row gap-8">

          {/* ================= DESKTOP SIDEBAR FILTERS ================= */}
          <aside className="hidden lg:block w-64 shrink-0 space-y-6 select-none">
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-gray-200">
              <h2 className="text-base font-extrabold text-neutral-950">Filters</h2>
              <button
                type="button"
                onClick={handleClearAll}
                className="text-xs font-semibold text-neutral-500 hover:text-black cursor-pointer transition"
              >
                Clear all
              </button>
            </div>

            {/* 1. Category Filter */}
            <div className="border-b border-gray-200 pb-5">
              <button
                type="button"
                onClick={() => setCategoryOpen(!categoryOpen)}
                className="flex w-full items-center justify-between text-sm font-bold text-neutral-900 cursor-pointer"
              >
                <span>Category</span>
                {categoryOpen ? <ChevronUp className="h-4 w-4 text-gray-500" /> : <ChevronDown className="h-4 w-4 text-gray-500" />}
              </button>

              {categoryOpen && (
                <div className="mt-3.5 space-y-2.5">
                  {CATEGORY_OPTIONS.map((cat) => {
                    const checked = selectedCategories.includes(cat);
                    return (
                      <label
                        key={cat}
                        className="flex items-center gap-2.5 text-xs font-medium text-neutral-700 cursor-pointer hover:text-black"
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleCategory(cat)}
                          className="h-4 w-4 rounded border-gray-300 text-black focus:ring-black cursor-pointer accent-black"
                        />
                        <span>{cat}</span>
                      </label>
                    );
                  })}
                </div>
              )}
            </div>

            {/* NOTE: GENDER FILTER IS INTENTIONALLY EXCLUDED AS REQUESTED BY USER */}

            {/* 2. Price Range Filter */}
            <div className="border-b border-gray-200 pb-5">
              <div className="flex items-center justify-between text-sm font-bold text-neutral-900">
                <span>Price Range</span>
              </div>
              <div className="mt-4">
                <input
                  type="range"
                  min={500}
                  max={10000}
                  step={200}
                  value={maxPrice}
                  onChange={(e) => setMaxPrice(Number(e.target.value))}
                  className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-black"
                />
                <div className="mt-2.5 flex items-center justify-between text-xs font-semibold text-neutral-600">
                  <span>₹0</span>
                  <span className="font-bold text-black">₹{maxPrice.toLocaleString("en-IN")}</span>
                </div>
              </div>
            </div>

            {/* 3. Color Filter */}
            <div className="border-b border-gray-200 pb-5">
              <button
                type="button"
                onClick={() => setColorOpen(!colorOpen)}
                className="flex w-full items-center justify-between text-sm font-bold text-neutral-900 cursor-pointer"
              >
                <span>Color</span>
                {colorOpen ? <ChevronUp className="h-4 w-4 text-gray-500" /> : <ChevronDown className="h-4 w-4 text-gray-500" />}
              </button>

              {colorOpen && (
                <div className="mt-3.5 flex flex-wrap items-center gap-2">
                  {COLOR_SWATCHES.map((swatch) => {
                    const isSelected = selectedColor === swatch.name;
                    return (
                      <button
                        key={swatch.name}
                        type="button"
                        onClick={() => setSelectedColor(isSelected ? null : swatch.name)}
                        title={swatch.name.toUpperCase()}
                        className={`h-6 w-6 rounded-full transition cursor-pointer relative shadow-2xs ${swatch.border} ${
                          isSelected ? "ring-2 ring-offset-2 ring-black scale-110" : "hover:scale-105"
                        }`}
                        style={{ backgroundColor: swatch.hex }}
                      >
                        {isSelected && (
                          <Check
                            className={`h-3 w-3 absolute inset-0 m-auto ${
                              swatch.name === "white" || swatch.name === "beige" ? "text-black" : "text-white"
                            }`}
                          />
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* 4. Brand Filter */}
            <div className="pb-4">
              <button
                type="button"
                onClick={() => setBrandOpen(!brandOpen)}
                className="flex w-full items-center justify-between text-sm font-bold text-neutral-900 cursor-pointer"
              >
                <span>Brand</span>
                {brandOpen ? <ChevronUp className="h-4 w-4 text-gray-500" /> : <ChevronDown className="h-4 w-4 text-gray-500" />}
              </button>

              {brandOpen && (
                <div className="mt-3.5 space-y-2 max-h-48 overflow-y-auto pr-1">
                  {POPULAR_BRANDS.map((brand) => {
                    const isSelected = selectedBrand === brand;
                    return (
                      <button
                        key={brand}
                        type="button"
                        onClick={() => setSelectedBrand(isSelected ? null : brand)}
                        className={`block w-full text-left text-xs px-2.5 py-1.5 rounded-lg font-medium transition cursor-pointer ${
                          isSelected ? "bg-black text-white font-bold" : "text-gray-700 hover:bg-gray-100"
                        }`}
                      >
                        {brand}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </aside>

          {/* ================= RIGHT MAIN CONTENT ================= */}
          <div className="flex-1 min-w-0">

            {/* Top Toolbar: Search + Sort + Mobile Filter Button */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
              
              {/* Search Bar */}
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (searchQuery.trim().length >= 3) {
                    fetchShopData(searchQuery.trim());
                  }
                }}
                className="relative flex-1 max-w-lg"
              >
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search shirts, jeans, sneakers... (Press Enter for live web)"
                  className="w-full rounded-xl border border-gray-200 bg-white pl-10 pr-24 py-2.5 text-xs text-neutral-900 placeholder:text-neutral-400 focus:border-black focus:outline-hidden shadow-2xs transition"
                />
                <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery("")}
                      className="p-1 text-neutral-400 hover:text-black cursor-pointer"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}
                  <button
                    type="submit"
                    disabled={searchingLive || searchQuery.trim().length < 3}
                    className="rounded-lg bg-neutral-950 px-2 py-1 text-[10px] font-bold text-white transition hover:bg-black disabled:opacity-40 cursor-pointer shadow-xs"
                    title="Search live on Myntra, Flipkart, Ajio"
                  >
                    {searchingLive ? "Searching..." : "Live"}
                  </button>
                </div>
              </form>

              {/* Mobile Filter Button & Desktop Sort Dropdown */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setMobileFiltersOpen(true)}
                  className="lg:hidden inline-flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-xs font-semibold text-neutral-800 shadow-2xs cursor-pointer hover:bg-gray-50"
                >
                  <Filter className="h-3.5 w-3.5 text-neutral-500" />
                  <span>Filters</span>
                </button>

                {/* Sort Dropdown */}
                <div className="relative flex items-center">
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                    className="rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-xs font-semibold text-neutral-800 shadow-2xs focus:border-black focus:outline-hidden cursor-pointer appearance-none pr-8"
                  >
                    <option value="recommended">Sort by: Recommended</option>
                    <option value="price_asc">Price: Low to High</option>
                    <option value="price_desc">Price: High to Low</option>
                    <option value="rating">Highest Rated</option>
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-2.5 h-3.5 w-3.5 text-neutral-500" />
                </div>
              </div>
            </div>

            {/* Live Search Status Banner */}
            {searchingLive && (
              <div className="flex items-center gap-2 mb-4 rounded-xl bg-[#fffaf0] border border-[#f5e3ba] px-4 py-2 text-xs text-amber-900 animate-pulse">
                <span className="h-2 w-2 rounded-full bg-amber-500 animate-ping" />
                <span className="font-semibold">Searching live deals across Myntra, Flipkart, and Ajio...</span>
              </div>
            )}

            {/* Active Filters Pill Row */}
            {(selectedCategories.length > 0 || selectedColor || selectedBrand || maxPrice < 10000 || searchQuery) && (
              <div className="flex flex-wrap items-center gap-2 mb-5">
                <span className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider">Active:</span>
                {selectedCategories.map((c) => (
                  <span
                    key={c}
                    className="inline-flex items-center gap-1 rounded-full bg-neutral-200/80 px-2.5 py-1 text-[11px] font-semibold text-neutral-800"
                  >
                    <span>{c}</span>
                    <button type="button" onClick={() => toggleCategory(c)} className="hover:text-black cursor-pointer">
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}
                {selectedColor && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-neutral-200/80 px-2.5 py-1 text-[11px] font-semibold text-neutral-800 capitalize">
                    <span>Color: {selectedColor}</span>
                    <button type="button" onClick={() => setSelectedColor(null)} className="hover:text-black cursor-pointer">
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                )}
                {selectedBrand && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-neutral-200/80 px-2.5 py-1 text-[11px] font-semibold text-neutral-800">
                    <span>{selectedBrand}</span>
                    <button type="button" onClick={() => setSelectedBrand(null)} className="hover:text-black cursor-pointer">
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                )}
                {maxPrice < 10000 && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-neutral-200/80 px-2.5 py-1 text-[11px] font-semibold text-neutral-800">
                    <span>Under ₹{maxPrice.toLocaleString("en-IN")}</span>
                    <button type="button" onClick={() => setMaxPrice(10000)} className="hover:text-black cursor-pointer">
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                )}
                <button
                  type="button"
                  onClick={handleClearAll}
                  className="text-[11px] font-bold text-red-600 hover:underline cursor-pointer ml-1"
                >
                  Reset all
                </button>
              </div>
            )}

            {/* Error or Empty State */}
            {error ? (
              <div className="rounded-3xl border border-red-200 bg-white p-12 text-center shadow-xs">
                <p className="text-sm font-bold text-red-600">Failed to load shop items</p>
                <button
                  type="button"
                  onClick={() => fetchShopData()}
                  className="mt-3 rounded-xl bg-black px-4 py-2 text-xs font-bold text-white cursor-pointer"
                >
                  Try Again
                </button>
              </div>
            ) : filteredProducts.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-gray-300 bg-white p-16 text-center shadow-2xs">
                <p className="text-base font-bold text-neutral-800">No products match your filters</p>
                <p className="text-xs text-neutral-500 mt-1">Try resetting some filters or searching for another term.</p>
                <button
                  type="button"
                  onClick={handleClearAll}
                  className="mt-4 rounded-xl bg-black px-4 py-2 text-xs font-bold text-white cursor-pointer hover:bg-neutral-800"
                >
                  Clear all filters
                </button>
              </div>
            ) : (
              /* ================= 4-COLUMN PRODUCT GRID ================= */
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-5 animate-pop-in">
                {filteredProducts.map((product) => {
                  const isWishlisted = wishlist.has(String(product.id));

                  return (
                    <article
                      key={product.id}
                      className="group flex flex-col rounded-2xl border border-gray-200/80 bg-white p-3 sm:p-3.5 shadow-2xs hover:shadow-md transition-all duration-200"
                    >
                      {/* Product Image Container */}
                      <div className="relative aspect-square w-full rounded-xl bg-[#f7f7f7] border border-gray-100 flex items-center justify-center p-3 overflow-hidden">
                        <img
                          src={product.image}
                          alt={product.name}
                          className="h-full w-full object-contain object-center transition duration-200 group-hover:scale-105"
                          loading="lazy"
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            if (!target.src.includes("/shop/banner_flatlay.png")) {
                              target.src = "/shop/banner_flatlay.png";
                            }
                          }}
                        />

                        {/* Heart Wishlist Button */}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleWishlist(product.id);
                          }}
                          className="absolute top-2.5 right-2.5 flex h-7 w-7 items-center justify-center rounded-full bg-white/90 backdrop-blur-xs text-gray-500 hover:text-red-500 transition shadow-xs cursor-pointer"
                          aria-label="Wishlist item"
                        >
                          <Heart
                            className={`h-4 w-4 transition ${
                              isWishlisted ? "fill-red-500 text-red-500 scale-110" : "text-neutral-500"
                            }`}
                          />
                        </button>

                        {/* AI Wardrobe Gap Match Badge */}
                        {product.is_wardrobe_match && (
                          <div className="absolute top-2.5 left-2.5">
                            <span className="rounded-full bg-black/85 backdrop-blur-md px-2 py-0.5 text-[9px] font-extrabold text-amber-300 shadow-xs flex items-center gap-1">
                              <Sparkles className="h-2.5 w-2.5 fill-amber-300" />
                              <span>Match</span>
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Product Meta */}
                      <div className="mt-3 flex flex-1 flex-col justify-between">
                        <div>
                          <p className="text-[11px] font-semibold text-neutral-500 uppercase tracking-wider">
                            {product.brand || "WearWise"}
                          </p>
                          <h3 className="mt-0.5 text-xs sm:text-sm font-bold text-neutral-950 truncate leading-tight">
                            {product.name}
                          </h3>
                          <p className="mt-1 text-sm sm:text-base font-extrabold text-neutral-950">
                            ₹{product.price.toLocaleString("en-IN")}
                          </p>
                        </div>

                        {/* View Product Button */}
                        <button
                          type="button"
                          onClick={() => setSelectedProduct(product)}
                          className="mt-3 w-full rounded-xl bg-[#111111] py-2.5 text-xs font-bold text-white transition hover:bg-black active:scale-98 cursor-pointer shadow-xs text-center"
                        >
                          View Product
                        </button>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ================= MOBILE FILTERS DRAWER ================= */}
      {mobileFiltersOpen && (
        <div
          className="fixed inset-0 z-50 flex bg-black/50 backdrop-blur-xs lg:hidden"
          onClick={() => setMobileFiltersOpen(false)}
        >
          <div
            className="w-80 max-w-[85vw] h-full bg-white p-6 shadow-2xl overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-4 border-b border-gray-200">
              <h2 className="text-lg font-black text-neutral-950">Filters</h2>
              <button
                type="button"
                onClick={() => setMobileFiltersOpen(false)}
                className="rounded-full p-1 text-gray-400 hover:text-black cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Categories */}
            <div className="py-4 border-b border-gray-200">
              <p className="text-sm font-bold text-neutral-900 mb-3">Category</p>
              <div className="space-y-2.5">
                {CATEGORY_OPTIONS.map((cat) => (
                  <label key={cat} className="flex items-center gap-2.5 text-xs font-medium text-neutral-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedCategories.includes(cat)}
                      onChange={() => toggleCategory(cat)}
                      className="h-4 w-4 rounded border-gray-300 text-black focus:ring-black cursor-pointer accent-black"
                    />
                    <span>{cat}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Price */}
            <div className="py-4 border-b border-gray-200">
              <p className="text-sm font-bold text-neutral-900 mb-3">Price Range</p>
              <input
                type="range"
                min={500}
                max={10000}
                step={200}
                value={maxPrice}
                onChange={(e) => setMaxPrice(Number(e.target.value))}
                className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-black"
              />
              <div className="mt-2 flex items-center justify-between text-xs font-semibold text-neutral-600">
                <span>₹0</span>
                <span className="font-bold text-black">₹{maxPrice.toLocaleString("en-IN")}</span>
              </div>
            </div>

            {/* Colors */}
            <div className="py-4 border-b border-gray-200">
              <p className="text-sm font-bold text-neutral-900 mb-3">Color</p>
              <div className="flex flex-wrap items-center gap-2.5">
                {COLOR_SWATCHES.map((swatch) => {
                  const isSelected = selectedColor === swatch.name;
                  return (
                    <button
                      key={swatch.name}
                      type="button"
                      onClick={() => setSelectedColor(isSelected ? null : swatch.name)}
                      className={`h-7 w-7 rounded-full shadow-2xs ${swatch.border} ${
                        isSelected ? "ring-2 ring-offset-2 ring-black scale-110" : ""
                      }`}
                      style={{ backgroundColor: swatch.hex }}
                    />
                  );
                })}
              </div>
            </div>

            {/* Actions */}
            <div className="mt-6 flex items-center gap-3">
              <button
                type="button"
                onClick={handleClearAll}
                className="flex-1 rounded-xl border border-gray-200 py-3 text-xs font-bold text-neutral-700 hover:bg-gray-50 cursor-pointer"
              >
                Clear all
              </button>
              <button
                type="button"
                onClick={() => setMobileFiltersOpen(false)}
                className="flex-1 rounded-xl bg-black py-3 text-xs font-bold text-white hover:bg-neutral-800 cursor-pointer"
              >
                Apply Filters
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= PRODUCT INSPECTOR MODAL ================= */}
      {selectedProduct && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs animate-pop-in"
          role="dialog"
          aria-modal="true"
          onClick={() => setSelectedProduct(null)}
        >
          <section
            className="w-full max-w-xl overflow-hidden rounded-3xl border border-white/20 bg-white shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
              <div className="flex items-center gap-2">
                <span className="text-sm">🛍️</span>
                <p className="text-xs font-bold uppercase tracking-wider text-gray-500">
                  {selectedProduct.brand || "WearWise"}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedProduct(null)}
                className="flex h-7 w-7 items-center justify-center rounded-full text-gray-400 hover:bg-gray-100 hover:text-black cursor-pointer"
                aria-label="Close modal"
              >
                ✕
              </button>
            </div>

            {/* Modal Body */}
            <div className="grid sm:grid-cols-2">
              {/* Product Visual */}
              <div className="relative aspect-square bg-[#f8f8f8] p-6 flex items-center justify-center border-b sm:border-b-0 sm:border-r border-gray-100">
                <img
                  src={selectedProduct.image}
                  alt={selectedProduct.name}
                  className="h-full w-full object-contain object-center"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    if (!target.src.includes("/shop/banner_flatlay.png")) {
                      target.src = "/shop/banner_flatlay.png";
                    }
                  }}
                />
              </div>

              {/* Product Details */}
              <div className="flex flex-col justify-between p-6">
                <div>
                  <span className="inline-block rounded-full bg-neutral-100 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-neutral-700">
                    {selectedProduct.group || selectedProduct.category}
                  </span>

                  <h2 className="mt-2 text-xl font-extrabold tracking-tight text-neutral-950">
                    {selectedProduct.name}
                  </h2>

                  <div className="mt-2 flex items-center gap-2 text-xs text-neutral-500 capitalize">
                    <span>{selectedProduct.color}</span>
                    {selectedProduct.fit && (
                      <>
                        <span>•</span>
                        <span>{selectedProduct.fit} fit</span>
                      </>
                    )}
                  </div>

                  <p className="mt-3 text-2xl font-black text-neutral-950">
                    ₹{selectedProduct.price.toLocaleString("en-IN")}
                  </p>

                  {/* Wardrobe Multiplier Callout */}
                  <div className="mt-4 rounded-2xl bg-[#fffaf0] border border-[#f5e3ba] p-3 text-xs text-amber-900">
                    <p className="font-bold flex items-center gap-1.5">
                      <Sparkles className="h-3.5 w-3.5 text-amber-600 fill-amber-500" />
                      <span>Why This Fits Your Style</span>
                    </p>
                    <p className="mt-1 text-neutral-700 leading-relaxed text-[11px]">
                      {selectedProduct.reason ||
                        "A foundational wardrobe multiplier piece designed to effortlessly pair with your existing rotation."}
                    </p>
                  </div>
                </div>

                {/* Modal Actions */}
                <div className="mt-6 flex items-center gap-2 border-t border-gray-100 pt-4">
                  <button
                    type="button"
                    onClick={() => toggleWishlist(selectedProduct.id)}
                    className="rounded-xl border border-gray-200 p-2.5 text-gray-600 hover:text-red-500 hover:bg-gray-50 cursor-pointer transition"
                    title="Wishlist item"
                  >
                    <Heart
                      className={`h-4 w-4 ${
                        wishlist.has(String(selectedProduct.id)) ? "fill-red-500 text-red-500" : ""
                      }`}
                    />
                  </button>

                  <a
                    href={selectedProduct.store_url || "#"}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl bg-black py-2.5 text-xs font-bold text-white hover:bg-neutral-800 transition active:scale-98 shadow-sm"
                  >
                    <span>View on Store</span>
                    <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                </div>
              </div>
            </div>
          </section>
        </div>
      )}
    </main>
  );
}
