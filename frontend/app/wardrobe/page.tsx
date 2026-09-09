"use client";

import { useEffect, useState, useMemo } from "react";
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

// ================= OPTIONS CONFIG =================
const CATEGORY_OPTIONS = [
  { value: "tshirt", label: "T-Shirt", icon: "👕", group: "top" },
  { value: "shirt", label: "Shirt", icon: "👔", group: "top" },
  { value: "jeans", label: "Jeans", icon: "👖", group: "bottom" },
  { value: "pants", label: "Pants", icon: "🩳", group: "bottom" },
  { value: "sneakers", label: "Sneakers", icon: "👟", group: "footwear" },
  { value: "shoes", label: "Shoes", icon: "👞", group: "footwear" },
] as const;

type ColorOption = {
  value: string;
  label: string;
  hex: string;
  border?: boolean;
};

const COLOR_OPTIONS: ColorOption[] = [
  { value: "white", label: "White", hex: "#ffffff", border: true },
  { value: "black", label: "Black", hex: "#171717" },
  { value: "grey", label: "Grey", hex: "#71717a" },
  { value: "beige", label: "Beige", hex: "#d4c5a9" },
  { value: "blue", label: "Blue", hex: "#2563eb" },
  { value: "green", label: "Green", hex: "#16a34a" },
  { value: "olive", label: "Olive", hex: "#556b2f" },
  { value: "brown", label: "Brown", hex: "#78350f" },
  { value: "maroon", label: "Maroon", hex: "#881337" },
];

const FIT_OPTIONS = ["regular", "oversized", "relaxed", "slim"] as const;
const PATTERN_OPTIONS = ["solid", "striped", "printed", "checked"] as const;
const STYLE_OPTIONS = ["casual", "streetwear", "formal", "minimal"] as const;

function getItemGroup(category: string): "top" | "bottom" | "footwear" {
  const cat = category.toLowerCase();
  if (cat === "tshirt" || cat === "shirt") return "top";
  if (cat === "jeans" || cat === "pants") return "bottom";
  if (cat === "shoes" || cat === "sneakers") return "footwear";
  return "top";
}

function getColorHex(colorName: string): string {
  const found = COLOR_OPTIONS.find((c) => c.value === colorName.toLowerCase());
  return found ? found.hex : "#9ca3af";
}

export default function WardrobePage() {
  const router = useRouter();

  const [items, setItems] = useState<WardrobeItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  // Gallery Filters
  const [activeFilter, setActiveFilter] = useState<"all" | "top" | "bottom" | "footwear">("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Form State
  const [form, setForm] = useState({
    category: "tshirt",
    color: "white",
    fit: "regular",
    pattern: "solid",
    style: "casual",
    image_url: "",
  });

  const [imageMode, setImageMode] = useState<"upload" | "url">("upload");
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [analyzingImage, setAnalyzingImage] = useState(false);
  const [aiDetectedInfo, setAiDetectedInfo] = useState<{
    description?: string;
    category?: string;
    color?: string;
    fit?: string;
    confidence?: number;
    engine?: string;
  } | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [notification, setNotification] = useState<{ type: "success" | "error"; message: string } | null>(null);

  // Auto-dismiss toast notifications
  useEffect(() => {
    if (!notification) return;
    const timer = setTimeout(() => setNotification(null), 4000);
    return () => clearTimeout(timer);
  }, [notification]);

  useEffect(() => {
    return () => {
      if (previewUrl && previewUrl.startsWith("blob:")) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  const handleFileSelect = async (selectedFile: File) => {
    if (!selectedFile.type.startsWith("image/")) {
      setNotification({ type: "error", message: "Please select an image file (JPG, PNG, WebP)." });
      return;
    }
    if (selectedFile.size > 10 * 1024 * 1024) {
      setNotification({ type: "error", message: "Image size must be under 10MB." });
      return;
    }
    if (previewUrl && previewUrl.startsWith("blob:")) {
      URL.revokeObjectURL(previewUrl);
    }
    setFile(selectedFile);
    setPreviewUrl(URL.createObjectURL(selectedFile));

    // Trigger AI Vision Auto-Tagging
    setAnalyzingImage(true);
    setAiDetectedInfo(null);
    try {
      const formData = new FormData();
      formData.append("file", selectedFile);
      const token = typeof window !== "undefined" ? localStorage.getItem("wearwise_token") : null;
      const res = await fetch(`${API_BASE_URL}/wardrobe/analyze`, {
        method: "POST",
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: formData,
      });

      if (res.ok) {
        const data = await res.json();
        setForm((prev) => ({
          ...prev,
          category: data.category || prev.category,
          color: data.color || prev.color,
          fit: data.fit || prev.fit,
          pattern: data.pattern || prev.pattern,
          style: data.style || prev.style,
        }));
        setAiDetectedInfo({
          description: data.description,
          category: data.category,
          color: data.color,
          fit: data.fit,
          confidence: data.confidence,
          engine: data.engine,
        });
        setNotification({
          type: "success",
          message: `✨ AI auto-tagged: ${data.color} ${data.category} (${data.fit} fit)`,
        });
      }
    } catch (err) {
      console.error("AI vision auto-tagging error:", err);
    } finally {
      setAnalyzingImage(false);
    }
  };

  const handleClearFile = () => {
    if (previewUrl && previewUrl.startsWith("blob:")) {
      URL.revokeObjectURL(previewUrl);
    }
    setFile(null);
    setPreviewUrl(null);
    setAiDetectedInfo(null);
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  };

  const fetchWardrobe = async (targetUserId: number) => {
    try {
      const response = await fetch(`${API_BASE_URL}/wardrobe/${targetUserId}`, {
        headers: getAuthHeaders(),
      });

      if (!response.ok) {
        throw new Error("Failed to fetch wardrobe");
      }

      const data = await response.json();
      setItems(data);
    } catch (error) {
      console.error(error);
      setNotification({ type: "error", message: "Failed to load wardrobe items." });
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
    setCurrentUser(user);
    fetchWardrobe(user.id);
  }, [router]);

  const addItem = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!currentUser) return;
    setUploading(true);

    try {
      let finalImageUrl: string | null = null;

      if (imageMode === "upload" && file) {
        const formData = new FormData();
        formData.append("file", file);

        const token =
          typeof window !== "undefined"
            ? localStorage.getItem("wearwise_token")
            : null;
        const uploadRes = await fetch(`${API_BASE_URL}/wardrobe/upload`, {
          method: "POST",
          headers: {
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: formData,
        });

        if (!uploadRes.ok) {
          const errData = await uploadRes.json().catch(() => ({}));
          throw new Error(errData.detail || "Failed to upload image");
        }

        const uploadData = await uploadRes.json();
        finalImageUrl = uploadData.image_url;
      } else if (imageMode === "url" && form.image_url.trim()) {
        finalImageUrl = form.image_url.trim();
      }

      const response = await fetch(`${API_BASE_URL}/wardrobe/${currentUser.id}`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({
          category: form.category,
          color: form.color,
          fit: form.fit,
          pattern: form.pattern,
          style: form.style,
          image_url: finalImageUrl,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to add item");
      }

      handleClearFile();
      setForm((prev) => ({ ...prev, image_url: "" }));
      await fetchWardrobe(currentUser.id);
      setNotification({ type: "success", message: `Added ${form.color} ${form.category} to your wardrobe!` });
    } catch (error: unknown) {
      console.error(error);
      const msg = error instanceof Error ? error.message : "Could not add clothing item.";
      setNotification({ type: "error", message: msg });
    } finally {
      setUploading(false);
    }
  };

  const deleteItem = async (itemId: number) => {
    setDeletingId(itemId);
    try {
      const response = await fetch(`${API_BASE_URL}/wardrobe/${itemId}`, {
        method: "DELETE",
        headers: getAuthHeaders(),
      });

      if (!response.ok) {
        throw new Error("Failed to delete item");
      }

      if (currentUser) {
        await fetchWardrobe(currentUser.id);
      }
      setNotification({ type: "success", message: "Garment removed from wardrobe." });
    } catch (error) {
      console.error(error);
      setNotification({ type: "error", message: "Failed to delete item." });
    } finally {
      setDeletingId(null);
    }
  };

  // Live Category Counts
  const counts = useMemo(() => {
    const topCount = items.filter((i) => getItemGroup(i.category) === "top").length;
    const bottomCount = items.filter((i) => getItemGroup(i.category) === "bottom").length;
    const footwearCount = items.filter((i) => getItemGroup(i.category) === "footwear").length;
    return { all: items.length, top: topCount, bottom: bottomCount, footwear: footwearCount };
  }, [items]);

  // Filtered Items
  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      const matchesCategory = activeFilter === "all" || getItemGroup(item.category) === activeFilter;
      const matchesSearch =
        searchQuery.trim() === "" ||
        item.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.color.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (item.fit && item.fit.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (item.style && item.style.toLowerCase().includes(searchQuery.toLowerCase()));
      return matchesCategory && matchesSearch;
    });
  }, [items, activeFilter, searchQuery]);

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#f7f7f5]">
        <div className="text-center">
          <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-gray-300 border-t-black" />
          <p className="mt-4 text-xs font-semibold uppercase tracking-widest text-gray-500">
            Loading your wardrobe...
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#f7f7f5] px-5 py-8 sm:px-8 sm:py-12 text-[#111111]">
      {/* Ambient background glow */}
      <div className="pointer-events-none absolute -top-40 left-1/2 -z-10 h-[450px] w-[800px] -translate-x-1/2 rounded-full bg-gradient-to-b from-[#e8ebe4]/50 via-[#fcfbf7]/40 to-transparent blur-3xl" />

      {/* Floating Toast Notification */}
      {notification && (
        <div className="fixed bottom-6 right-6 z-50 animate-pop-in">
          <div
            className={`flex items-center gap-2.5 rounded-2xl px-4 py-3 shadow-lg backdrop-blur-md text-xs font-semibold ${
              notification.type === "success"
                ? "border border-emerald-200 bg-emerald-900/90 text-white"
                : "border border-red-200 bg-red-900/90 text-white"
            }`}
          >
            <span>{notification.type === "success" ? "✓" : "⚠️"}</span>
            <span>{notification.message}</span>
            <button
              type="button"
              onClick={() => setNotification(null)}
              className="ml-2 text-white/70 hover:text-white"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      <div className="mx-auto max-w-6xl">
        
        {/* ================= HEADER ================= */}
        <div className="mb-8 border-b border-[#e2e4e7] pb-8">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-[#dedad0] bg-white/90 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-[#45546a] shadow-2xs backdrop-blur-md">
                <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                <span>Wardrobe Vault</span>
              </div>
              <h1 className="mt-3 text-3xl font-extrabold tracking-tight text-gray-950 sm:text-4xl">
                My Digital Closet
              </h1>
              <p className="mt-1 max-w-xl text-xs sm:text-sm text-gray-600">
                Organize your garments, spot wardrobe gaps, and let WearWise unlock effortless looks.
              </p>
            </div>

            {/* Direct App Actions */}
            <div className="flex items-center gap-2.5">
              <Link
                href="/wardrobe/next-purchase"
                className="inline-flex h-11 items-center justify-center rounded-xl border border-[#d4d6da] bg-white px-4 text-xs font-semibold text-gray-800 shadow-2xs transition hover:bg-gray-50 active:scale-95"
              >
                <span>📈 Gap Analysis</span>
              </Link>
              <Link
                href="/style"
                className="inline-flex h-11 items-center justify-center rounded-xl bg-[#171717] px-5 text-xs font-semibold text-white shadow-sm transition hover:bg-black active:scale-95"
              >
                <span>✨ Style Me →</span>
              </Link>
            </div>
          </div>

          {/* Closet Breakdown Counters */}
          <div className="mt-6 flex flex-wrap items-center gap-2">
            <span className="rounded-xl border border-gray-200 bg-white px-3.5 py-1.5 text-xs font-bold text-gray-900 shadow-2xs">
              {counts.all} {counts.all === 1 ? "Item" : "Total Items"}
            </span>
            <span className="rounded-xl border border-gray-200 bg-white/80 px-3 py-1.5 text-xs font-medium text-gray-600">
              👕 {counts.top} Tops
            </span>
            <span className="rounded-xl border border-gray-200 bg-white/80 px-3 py-1.5 text-xs font-medium text-gray-600">
              👖 {counts.bottom} Bottoms
            </span>
            <span className="rounded-xl border border-gray-200 bg-white/80 px-3 py-1.5 text-xs font-medium text-gray-600">
              👟 {counts.footwear} Footwear
            </span>
          </div>
        </div>

        {/* ================= MAIN TWO-COLUMN STUDIO ================= */}
        <div className="grid gap-8 lg:grid-cols-[380px_1fr]">

          {/* Left Column: Add Clothing Studio */}
          <section className="h-fit rounded-3xl border border-[#e2e4e7] bg-white p-6 shadow-[0_10px_30px_rgba(27,35,43,0.04)]">
            <div className="border-b border-[#eceef0] pb-4">
              <div className="flex items-center gap-2">
                <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-black text-xs text-white">
                  +
                </span>
                <h2 className="text-xl font-bold text-gray-950">
                  Add Clothing
                </h2>
              </div>
              <p className="mt-1 text-xs text-gray-500">
                Register a piece to expand your daily outfit matrix.
              </p>
            </div>

            <form onSubmit={addItem} className="mt-5 space-y-5">
              
              {/* Visual Category Picker */}
              <div>
                <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-gray-700">
                  Category
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {CATEGORY_OPTIONS.map((cat) => {
                    const isSelected = form.category === cat.value;
                    return (
                      <button
                        key={cat.value}
                        type="button"
                        onClick={() => setForm({ ...form, category: cat.value })}
                        className={`flex flex-col items-center justify-center rounded-xl border p-2.5 text-center transition-all cursor-pointer ${
                          isSelected
                            ? "border-black bg-[#171717] text-white shadow-xs"
                            : "border-gray-200 bg-[#fbfbf9] text-gray-700 hover:border-gray-400 hover:bg-white"
                        }`}
                      >
                        <span className="text-xl">{cat.icon}</span>
                        <span className="mt-1 text-[11px] font-semibold">{cat.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Visual Color Palette Picker */}
              <div>
                <div className="mb-2 flex items-center justify-between">
                  <label className="text-xs font-bold uppercase tracking-wider text-gray-700">
                    Color
                  </label>
                  <span className="text-xs font-semibold capitalize text-gray-900">
                    {form.color}
                  </span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {COLOR_OPTIONS.map((c) => {
                    const isSelected = form.color === c.value;
                    return (
                      <button
                        key={c.value}
                        type="button"
                        onClick={() => setForm({ ...form, color: c.value })}
                        title={c.label}
                        className={`relative flex h-7 w-7 items-center justify-center rounded-full transition-transform cursor-pointer ${
                          isSelected ? "ring-2 ring-black ring-offset-2 scale-110" : "hover:scale-105"
                        } ${c.border ? "border border-gray-300" : ""}`}
                        style={{ backgroundColor: c.hex }}
                      >
                        {isSelected && (
                          <span
                            className={`text-[10px] font-bold ${
                              c.value === "white" || c.value === "beige" ? "text-black" : "text-white"
                            }`}
                          >
                            ✓
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Fit Segmented Control */}
              <div>
                <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-gray-700">
                  Fit
                </label>
                <div className="grid grid-cols-4 gap-1.5 rounded-xl bg-[#f4f5f6] p-1">
                  {FIT_OPTIONS.map((fit) => {
                    const isSelected = form.fit === fit;
                    return (
                      <button
                        key={fit}
                        type="button"
                        onClick={() => setForm({ ...form, fit })}
                        className={`rounded-lg py-1.5 text-center text-xs font-semibold capitalize transition-all cursor-pointer ${
                          isSelected
                            ? "bg-white text-black shadow-2xs"
                            : "text-gray-500 hover:text-black"
                        }`}
                      >
                        {fit}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Style & Pattern Controls */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-gray-700">
                    Style
                  </label>
                  <select
                    name="style"
                    value={form.style}
                    onChange={(e) => setForm({ ...form, style: e.target.value })}
                    className="w-full rounded-xl border border-[#e2e4e7] bg-[#fbfbf9] p-2.5 text-xs font-medium text-gray-900 outline-none focus:border-black cursor-pointer"
                  >
                    {STYLE_OPTIONS.map((s) => (
                      <option key={s} value={s}>
                        {s.charAt(0).toUpperCase() + s.slice(1)}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-gray-700">
                    Pattern
                  </label>
                  <select
                    name="pattern"
                    value={form.pattern}
                    onChange={(e) => setForm({ ...form, pattern: e.target.value })}
                    className="w-full rounded-xl border border-[#e2e4e7] bg-[#fbfbf9] p-2.5 text-xs font-medium text-gray-900 outline-none focus:border-black cursor-pointer"
                  >
                    {PATTERN_OPTIONS.map((p) => (
                      <option key={p} value={p}>
                        {p.charAt(0).toUpperCase() + p.slice(1)}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Photo Section with Upload / URL toggle */}
              <div>
                <div className="mb-2 flex items-center justify-between">
                  <label className="text-xs font-bold uppercase tracking-wider text-gray-700">
                    Garment Photo
                    <span className="ml-1 font-normal text-gray-400">(Optional)</span>
                  </label>

                  <div className="flex rounded-lg bg-[#f0f1f3] p-0.5 text-[11px] font-semibold">
                    <button
                      type="button"
                      onClick={() => setImageMode("upload")}
                      className={`rounded-md px-2.5 py-0.5 transition cursor-pointer ${
                        imageMode === "upload" ? "bg-white text-black shadow-2xs" : "text-gray-500 hover:text-black"
                      }`}
                    >
                      Upload
                    </button>
                    <button
                      type="button"
                      onClick={() => setImageMode("url")}
                      className={`rounded-md px-2.5 py-0.5 transition cursor-pointer ${
                        imageMode === "url" ? "bg-white text-black shadow-2xs" : "text-gray-500 hover:text-black"
                      }`}
                    >
                      URL
                    </button>
                  </div>
                </div>

                {imageMode === "upload" ? (
                  <div>
                    {previewUrl ? (
                      <div className="relative overflow-hidden rounded-2xl border border-gray-200 bg-[#fbfbf9] p-2.5">
                        <div className="relative aspect-[4/5] w-full overflow-hidden rounded-xl bg-[#f7f7f5] flex items-center justify-center">
                          <img
                            src={previewUrl}
                            alt="Item preview"
                            className="h-full w-full object-contain object-center"
                          />
                        </div>
                        <div className="mt-2.5 flex items-center justify-between px-1">
                          <span className="truncate text-xs font-medium text-gray-600 max-w-[200px]">
                            {file?.name}
                          </span>
                          <button
                            type="button"
                            onClick={handleClearFile}
                            className="text-xs font-semibold text-red-600 hover:underline cursor-pointer"
                          >
                            Remove
                          </button>
                        </div>

                        {/* AI Vision Status Indicator */}
                        {analyzingImage && (
                          <div className="mt-2.5 flex items-center gap-2 rounded-xl bg-amber-50 border border-amber-200 px-3 py-2 text-xs text-amber-900 animate-pulse">
                            <span className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-amber-700 border-t-transparent" />
                            <span className="font-semibold">✨ AI Vision scanning garment features...</span>
                          </div>
                        )}

                        {aiDetectedInfo && !analyzingImage && (
                          <div className="mt-2.5 flex items-center justify-between rounded-xl bg-emerald-50 border border-emerald-200 px-3 py-2 text-xs text-emerald-950 animate-pop-in">
                            <div className="flex items-center gap-1.5 truncate">
                              <span>✨</span>
                              <span className="font-bold truncate">
                                Auto-tagged: <span className="capitalize">{aiDetectedInfo.color} {aiDetectedInfo.category}</span>
                              </span>
                              {aiDetectedInfo.confidence && (
                                <span className="rounded-full bg-emerald-200/80 px-1.5 py-0.2 text-[9px] font-bold text-emerald-900">
                                  {Math.round(aiDetectedInfo.confidence * 100)}%
                                </span>
                              )}
                            </div>
                            <button
                              type="button"
                              onClick={() => setAiDetectedInfo(null)}
                              className="text-[10px] font-semibold text-emerald-800 hover:underline shrink-0 ml-2 cursor-pointer"
                            >
                              Dismiss
                            </button>
                          </div>
                        )}
                      </div>
                    ) : (
                      <label
                        onDragEnter={handleDrag}
                        onDragLeave={handleDrag}
                        onDragOver={handleDrag}
                        onDrop={handleDrop}
                        className={`flex flex-col items-center justify-center rounded-2xl border-2 border-dashed p-6 text-center cursor-pointer transition ${
                          dragActive
                            ? "border-black bg-gray-50 scale-102"
                            : "border-[#e2e4e7] bg-[#fbfbf9] hover:border-gray-400 hover:bg-white"
                        }`}
                      >
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white shadow-2xs text-base">
                          📸
                        </div>
                        <p className="mt-2 text-xs font-bold text-gray-800">
                          Click to upload or drag & drop
                        </p>
                        <p className="mt-0.5 text-[10px] text-gray-400">
                          JPG, PNG, WebP up to 10MB
                        </p>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => {
                            if (e.target.files?.[0]) {
                              handleFileSelect(e.target.files[0]);
                            }
                          }}
                          className="hidden"
                        />
                      </label>
                    )}
                  </div>
                ) : (
                  <input
                    name="image_url"
                    type="url"
                    placeholder="https://example.com/item.jpg"
                    value={form.image_url}
                    onChange={(e) => setForm({ ...form, image_url: e.target.value })}
                    className="w-full rounded-xl border border-[#e2e4e7] bg-[#fbfbf9] p-3 text-xs font-medium text-gray-900 placeholder:text-gray-400 outline-none focus:border-black"
                  />
                )}
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={uploading}
                className="w-full rounded-xl bg-[#171717] px-5 py-3.5 text-xs font-bold text-white transition hover:bg-black active:scale-98 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer shadow-sm"
              >
                {uploading ? "Registering Piece..." : "+ Add to Wardrobe"}
              </button>
            </form>
          </section>

          {/* Right Column: Wardrobe Gallery */}
          <section className="flex flex-col">
            
            {/* Gallery Control Bar: Category Tabs & Search */}
            <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              
              {/* Category Filter Tabs */}
              <div className="flex flex-wrap gap-1 rounded-2xl border border-[#e2e4e7] bg-white p-1 shadow-2xs">
                {(
                  [
                    { key: "all", label: "All", count: counts.all },
                    { key: "top", label: "Tops", count: counts.top },
                    { key: "bottom", label: "Bottoms", count: counts.bottom },
                    { key: "footwear", label: "Footwear", count: counts.footwear },
                  ] as const
                ).map((tab) => {
                  const isActive = activeFilter === tab.key;
                  return (
                    <button
                      key={tab.key}
                      type="button"
                      onClick={() => setActiveFilter(tab.key)}
                      className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold transition-all cursor-pointer ${
                        isActive
                          ? "bg-[#171717] text-white shadow-2xs"
                          : "text-gray-600 hover:text-black hover:bg-gray-50"
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

              {/* Search Bar */}
              <div className="relative max-w-xs w-full">
                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs">
                  🔍
                </span>
                <input
                  type="text"
                  placeholder="Filter by color or style..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full rounded-xl border border-[#e2e4e7] bg-white py-2 pl-8 pr-3 text-xs text-gray-900 placeholder:text-gray-400 outline-none focus:border-black shadow-2xs"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery("")}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-gray-400 hover:text-black"
                  >
                    ✕
                  </button>
                )}
              </div>
            </div>

            {/* Empty States */}
            {items.length === 0 ? (
              <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-[#dedad0] bg-white p-12 text-center shadow-2xs">
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[#f7f7f5] text-3xl shadow-inner">
                  👕
                </div>
                <h3 className="mt-4 text-lg font-bold text-gray-950">
                  Your wardrobe is empty
                </h3>
                <p className="mx-auto mt-1 max-w-sm text-xs text-gray-500">
                  Register your daily tops, trousers, and shoes on the left to start generating outfits.
                </p>
              </div>
            ) : filteredItems.length === 0 ? (
              <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-[#dedad0] bg-white p-10 text-center shadow-2xs">
                <p className="text-2xl">🔍</p>
                <h3 className="mt-2 text-sm font-bold text-gray-900">
                  No matching garments found
                </h3>
                <p className="mt-1 text-xs text-gray-500">
                  Try adjusting your search query or switching category filters.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setActiveFilter("all");
                    setSearchQuery("");
                  }}
                  className="mt-3 text-xs font-semibold text-black underline"
                >
                  Reset filters
                </button>
              </div>
            ) : (
              /* Garment Grid */
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {filteredItems.map((item) => {
                  const role = getItemGroup(item.category);
                  const isDeleting = deletingId === item.id;

                  return (
                    <div
                      key={item.id}
                      className="group relative flex flex-col rounded-3xl border border-[#e2e4e7] bg-white p-4 transition-all duration-200 hover:-translate-y-1 hover:shadow-md"
                    >
                      {/* Image Container with Perfect Portrait Framing */}
                      <div className="relative aspect-[4/5] w-full overflow-hidden rounded-2xl bg-[#f7f7f5] border border-[#eceef0] p-3 flex items-center justify-center">
                        {item.image_url ? (
                          <img
                            src={getImageUrl(item.image_url) || ""}
                            alt={`${item.color} ${item.category}`}
                            className="h-full w-full object-contain object-center transition-transform duration-300 group-hover:scale-105"
                            onError={(e) => {
                              (e.currentTarget as HTMLElement).style.display = "none";
                            }}
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center text-4xl">
                            {role === "top" ? "👕" : role === "bottom" ? "👖" : "👟"}
                          </div>
                        )}

                        {/* Top Action Bar: Role Pill & Delete Button */}
                        <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5">
                          <span className="rounded-full bg-black/80 backdrop-blur-md px-2.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-white shadow-xs">
                            {role}
                          </span>
                        </div>

                        <button
                          type="button"
                          onClick={() => deleteItem(item.id)}
                          disabled={isDeleting}
                          className="absolute top-2.5 right-2.5 flex h-7 w-7 items-center justify-center rounded-full bg-white/90 text-gray-400 backdrop-blur-md transition hover:bg-red-50 hover:text-red-600 shadow-2xs cursor-pointer disabled:opacity-50"
                          title="Remove item"
                        >
                          {isDeleting ? "…" : "🗑️"}
                        </button>
                      </div>

                      {/* Content & Details */}
                      <div className="mt-3.5 px-1">
                        <div className="flex items-center gap-2">
                          <span
                            className="h-3 w-3 rounded-full border border-black/10 shadow-2xs"
                            style={{ backgroundColor: getColorHex(item.color) }}
                          />
                          <h3 className="text-sm font-bold capitalize text-gray-950">
                            {item.color} {item.category}
                          </h3>
                        </div>

                        {/* Metadata Tags */}
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
                })}
              </div>
            )}

            {/* Bottom Style Me Banner */}
            {items.length > 0 && (
              <div className="mt-8 flex flex-col sm:flex-row items-center justify-between gap-4 rounded-2xl border border-[#e2e4e7] bg-[#fbfbf9] p-5 shadow-2xs">
                <div>
                  <h4 className="text-sm font-bold text-gray-900">
                    Ready to generate styled looks?
                  </h4>
                  <p className="text-xs text-gray-500">
                    Our AI will combine your {items.length} items for college, work, dates, and parties.
                  </p>
                </div>
                <Link
                  href="/style"
                  className="rounded-xl bg-[#171717] px-6 py-3 text-xs font-bold text-white shadow-sm transition hover:bg-black active:scale-95 text-center whitespace-nowrap"
                >
                  ✨ Open Style Me
                </Link>
              </div>
            )}

          </section>

        </div>
      </div>
    </main>
  );
}
