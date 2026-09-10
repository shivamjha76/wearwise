"use client";

import { useEffect, useState, useMemo, useRef } from "react";
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

// 4 to 5 words animated taglines with typewriter effect
const WARDROBE_TAGLINES = [
  "Your closet, curated effortlessly.",
  "Smart styling for your closet.",
  "Organize clothes, unlock better looks.",
  "Everyday fashion, effortlessly organized.",
];

function AnimatedWardrobeTagline() {
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
        setIndex((prev) => (prev + 1) % WARDROBE_TAGLINES.length);
        return;
      }
      const deleteTimer = setTimeout(() => {
        setSubIndex((prev) => prev - 1);
      }, 35);
      return () => clearTimeout(deleteTimer);
    }

    if (subIndex === WARDROBE_TAGLINES[index].length) {
      setIsPaused(true);
      return;
    }

    const typeTimer = setTimeout(() => {
      setSubIndex((prev) => prev + 1);
    }, 75);

    return () => clearTimeout(typeTimer);
  }, [subIndex, index, isDeleting, isPaused]);

  return (
    <div className="mt-2.5 flex items-center min-h-[28px]">
      <p className="text-sm sm:text-base font-medium text-gray-500 tracking-tight flex items-center gap-1.5">
        <span className="text-neutral-400 text-xs sm:text-sm">✨</span>
        <span className="text-neutral-900 font-semibold tracking-tight">
          {WARDROBE_TAGLINES[index].substring(0, subIndex)}
        </span>
        <span className="inline-block w-[2px] h-4 sm:h-[18px] bg-black align-middle animate-pulse" />
      </p>
    </div>
  );
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
  const fileInputRef = useRef<HTMLInputElement | null>(null);

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

  const analyzeUrl = async (urlToAnalyze: string) => {
    const trimmed = urlToAnalyze.trim();
    if (!trimmed || (!trimmed.startsWith("http://") && !trimmed.startsWith("https://"))) {
      return;
    }

    setAnalyzingImage(true);
    setAiDetectedInfo(null);
    try {
      const token = typeof window !== "undefined" ? localStorage.getItem("wearwise_token") : null;
      const res = await fetch(`${API_BASE_URL}/wardrobe/analyze-url`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ url: trimmed }),
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
          message: `✨ AI detected: ${data.color} ${data.category}`,
        });
      }
    } catch (err) {
      console.error("URL analysis error:", err);
    } finally {
      setAnalyzingImage(false);
    }
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

      const data: WardrobeItem[] = await response.json();
      setItems(data);
      try {
        localStorage.setItem(`wearwise_wardrobe_${targetUserId}`, JSON.stringify(data));
      } catch {}
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

    // Instant local cache restoration so clothes don't disappear on refresh
    try {
      const cached = localStorage.getItem(`wearwise_wardrobe_${user.id}`);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setItems(parsed);
          setLoading(false);
        }
      }
    } catch {}

    fetchWardrobe(user.id);
  }, [router]);

  const addItem = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!currentUser) return;
    setUploading(true);

    try {
      let finalImageUrl: string | null = null;
      let finalCategory = form.category || "tshirt";
      let finalColor = form.color || "black";
      let finalFit = form.fit || "regular";
      let finalPattern = form.pattern || "solid";
      let finalStyle = form.style || "casual";

      if (imageMode === "upload") {
        if (file) {

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

        // User confirmed form.category and form.color take precedence
        finalCategory = form.category || uploadData.tags?.category || "tshirt";
        finalColor = form.color || uploadData.tags?.color || "black";
        finalFit = form.fit || uploadData.tags?.fit || "regular";
        finalPattern = form.pattern || uploadData.tags?.pattern || "solid";
        finalStyle = form.style || uploadData.tags?.style || "casual";
        }
      } else if (imageMode === "url") {
        const trimmedUrl = form.image_url.trim();
        if (!trimmedUrl) {
          setNotification({ type: "error", message: "Please enter a valid image URL." });
          setUploading(false);
          return;
        }
        finalImageUrl = trimmedUrl;

        // If not already analyzed, analyze via backend AI now
        if (!aiDetectedInfo) {
          try {
            const token = typeof window !== "undefined" ? localStorage.getItem("wearwise_token") : null;
            const analyzeRes = await fetch(`${API_BASE_URL}/wardrobe/analyze-url`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                ...(token ? { Authorization: `Bearer ${token}` } : {}),
              },
              body: JSON.stringify({ url: trimmedUrl }),
            });
            if (analyzeRes.ok) {
              const data = await analyzeRes.json();
              if (data.category && !form.category) finalCategory = data.category;
              if (data.color && !form.color) finalColor = data.color;
              if (data.fit && !form.fit) finalFit = data.fit;
              if (data.pattern && !form.pattern) finalPattern = data.pattern;
              if (data.style && !form.style) finalStyle = data.style;
            }
          } catch (e) {
            console.warn("Direct URL analyze during add failed, using form values:", e);
          }
        }

        finalCategory = form.category || finalCategory || "tshirt";
        finalColor = form.color || finalColor || "black";
        finalFit = form.fit || finalFit || "regular";
        finalPattern = form.pattern || "solid";
        finalStyle = form.style || "casual";
      }

      const response = await fetch(`${API_BASE_URL}/wardrobe/${currentUser.id}`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({
          category: finalCategory,
          color: finalColor,
          fit: finalFit,
          pattern: finalPattern,
          style: finalStyle,
          image_url: finalImageUrl,
        }),
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.detail || "Failed to add clothing item");
      }

      const createdItem: WardrobeItem = await response.json();
      setItems((prev) => {
        const next = [createdItem, ...prev.filter((x) => x.id !== createdItem.id)];
        try {
          localStorage.setItem(`wearwise_wardrobe_${currentUser.id}`, JSON.stringify(next));
        } catch {}
        return next;
      });

      handleClearFile();
      setForm((prev) => ({ ...prev, image_url: "" }));
      await fetchWardrobe(currentUser.id);
      setNotification({ type: "success", message: `Added ${finalColor} ${finalCategory} to your wardrobe!` });
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
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.detail || "Failed to delete item");
      }

      if (currentUser) {
        setItems((prev) => {
          const next = prev.filter((i) => i.id !== itemId);
          try {
            localStorage.setItem(`wearwise_wardrobe_${currentUser.id}`, JSON.stringify(next));
          } catch {}
          return next;
        });
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

      <div className="mx-auto max-w-7xl">
        
        {/* ================= HEADER ================= */}
        <div className="mb-8 border-b border-[#e2e4e7] pb-8">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight text-gray-950 sm:text-4xl">
              My Digital Closet
            </h1>
            <AnimatedWardrobeTagline />
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

        {/* ================= 1. FULL-WIDTH HORIZONTAL ADD CLOTHING STUDIO ================= */}
        <section className="mb-8 rounded-3xl border border-[#e2e4e7] bg-white p-6 sm:p-7 shadow-[0_10px_30px_rgba(27,35,43,0.04)]">
          <form onSubmit={addItem} className="space-y-4">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
              
              {/* Left Side: + Icon + Title + Subtitle */}
              <div className="flex items-start gap-3.5 max-w-sm shrink-0">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-black text-white shrink-0 font-extrabold text-sm shadow-xs">
                  +
                </div>
                <div>
                  <h2 className="text-base sm:text-lg font-bold text-gray-950 leading-tight">
                    Add Clothing
                  </h2>
                  <p className="mt-1 text-xs text-gray-500 leading-relaxed">
                    Upload a photo, use an image URL, or drag & drop to add new items to your wardrobe.
                  </p>
                </div>
              </div>

              {/* Right Side: Mode Toggle & (Upload Dropzone / URL Input + Submit Button) */}
              <div className="flex-1 flex flex-col items-stretch lg:items-end gap-3 w-full lg:max-w-2xl">
                
                {/* Upload Mode Selector */}
                <div className="inline-flex rounded-xl bg-[#f0f1f3] p-1 text-xs font-semibold self-start lg:self-center">
                  <button
                    type="button"
                    onClick={() => setImageMode("upload")}
                    className={`rounded-lg px-4 py-1.5 transition flex items-center gap-1.5 cursor-pointer ${
                      imageMode === "upload"
                        ? "bg-white text-black shadow-2xs font-bold"
                        : "text-gray-500 hover:text-black"
                    }`}
                  >
                    <span>📸</span>
                    <span>Photo / Upload</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setImageMode("url")}
                    className={`rounded-lg px-4 py-1.5 transition flex items-center gap-1.5 cursor-pointer ${
                      imageMode === "url"
                        ? "bg-white text-black shadow-2xs font-bold"
                        : "text-gray-500 hover:text-black"
                    }`}
                  >
                    <span>🔗</span>
                    <span>Image URL</span>
                  </button>
                </div>

                {/* Input Capsule Row + Add to Wardrobe Button */}
                <div className="flex flex-col sm:flex-row items-stretch gap-3 w-full">
                  
                  {/* Mode: Photo Upload */}
                  {imageMode === "upload" ? (
                    previewUrl ? (
                      /* Active Preview Box */
                      <div className="flex-1 flex items-center gap-3.5 rounded-2xl border border-gray-200 bg-[#fbfbf9] p-2.5 h-16 min-w-0">
                        <div className="relative h-11 w-11 rounded-xl overflow-hidden bg-white border border-gray-200 shrink-0 flex items-center justify-center">
                          <img
                            src={previewUrl}
                            alt="Preview"
                            className="h-full w-full object-contain"
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-bold text-gray-900 truncate">
                            {file?.name || "Garment Photo"}
                          </p>
                          {analyzingImage ? (
                            <p className="text-[11px] font-semibold text-amber-700 animate-pulse flex items-center gap-1">
                              <span className="inline-block h-2 w-2 animate-spin rounded-full border border-amber-600 border-t-transparent" />
                              <span>Scanning with AI...</span>
                            </p>
                          ) : aiDetectedInfo ? (
                            <p className="text-[11px] font-semibold text-emerald-700 truncate">
                              ✨ {aiDetectedInfo.color} {aiDetectedInfo.category} ({aiDetectedInfo.fit || "regular"})
                            </p>
                          ) : (
                            <p className="text-[11px] text-gray-400">Ready to save</p>
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={handleClearFile}
                          className="text-xs font-semibold text-red-600 hover:underline px-2 py-1 shrink-0 cursor-pointer"
                        >
                          Remove
                        </button>
                      </div>
                    ) : (
                      /* Empty Dropzone Matching Image 2 */
                      <div
                        onDragEnter={handleDrag}
                        onDragLeave={handleDrag}
                        onDragOver={handleDrag}
                        onDrop={handleDrop}
                        onClick={() => fileInputRef.current?.click()}
                        className={`flex-1 flex items-center justify-center gap-3.5 rounded-2xl border-2 border-dashed px-4 py-2 text-center cursor-pointer transition h-16 ${
                          dragActive
                            ? "border-black bg-gray-50 scale-[1.01]"
                            : "border-[#e2e4e7] bg-[#fbfbf9] hover:border-gray-400 hover:bg-white"
                        }`}
                      >
                        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white shadow-2xs text-lg shrink-0">
                          📸
                        </div>
                        <div className="text-left">
                          <p className="text-xs font-bold text-gray-900 leading-tight">
                            Click to upload or drag & drop
                          </p>
                          <p className="mt-0.5 text-[10px] text-gray-400">
                            PNG, JPG, WebP up to 10MB
                          </p>
                        </div>
                      </div>
                    )
                  ) : (
                    /* Mode: Image URL */
                    <div className="flex-1 relative flex items-center h-16 rounded-2xl border border-[#e2e4e7] bg-[#fbfbf9] px-3.5">
                      <span className="text-gray-400 mr-2 text-xs">🔗</span>
                      <input
                        name="image_url"
                        type="url"
                        placeholder="Paste image URL (https://...)"
                        value={form.image_url}
                        onChange={(e) => {
                          const val = e.target.value;
                          setForm((prev) => ({ ...prev, image_url: val }));
                        }}
                        onPaste={(e) => {
                          const pasted = e.clipboardData.getData("text").trim();
                          if (pasted.startsWith("http://") || pasted.startsWith("https://")) {
                            setForm((prev) => ({ ...prev, image_url: pasted }));
                            setTimeout(() => analyzeUrl(pasted), 50);
                          }
                        }}
                        onBlur={(e) => {
                          if (e.target.value.trim().startsWith("http") && !aiDetectedInfo) {
                            analyzeUrl(e.target.value);
                          }
                        }}
                        className="w-full bg-transparent text-xs font-medium text-gray-900 placeholder:text-gray-400 outline-none pr-8"
                      />
                      {form.image_url && (
                        <button
                          type="button"
                          onClick={() => {
                            setForm((prev) => ({ ...prev, image_url: "" }));
                            setAiDetectedInfo(null);
                          }}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400 hover:text-black"
                        >
                          ✕
                        </button>
                      )}
                    </div>
                  )}

                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      if (e.target.files?.[0]) {
                        handleFileSelect(e.target.files[0]);
                      }
                    }}
                    className="hidden"
                  />

                  {/* + Add to Wardrobe Button */}
                  <button
                    type="submit"
                    disabled={uploading || (imageMode === "upload" && !file) || (imageMode === "url" && !form.image_url.trim())}
                    className="h-16 px-6 sm:px-8 rounded-2xl bg-[#171717] hover:bg-black text-white text-xs sm:text-sm font-bold shadow-sm whitespace-nowrap active:scale-98 disabled:opacity-40 disabled:cursor-not-allowed transition cursor-pointer shrink-0 flex items-center justify-center gap-2"
                  >
                    {uploading ? (
                      <>
                        <span className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                        <span>Adding...</span>
                      </>
                    ) : (
                      <span>+ Add to Wardrobe</span>
                    )}
                  </button>

                </div>

              </div>

            </div>

            {/* Category & Color Confirmation Bar (Reveals when image or URL is present) */}
            {(previewUrl || (imageMode === "url" && form.image_url.trim())) && (
              <div className="pt-3.5 border-t border-[#eceef0] flex flex-col md:flex-row items-start md:items-center justify-between gap-4 animate-pop-in">
                {/* Category Selection */}
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-gray-500 mr-1">
                    Category:
                  </span>
                  {[
                    { id: "tshirt", label: "👕 T-Shirt" },
                    { id: "shirt", label: "👔 Shirt" },
                    { id: "jeans", label: "👖 Jeans" },
                    { id: "pants", label: "🩳 Pants" },
                    { id: "shoes", label: "👞 Shoes" },
                    { id: "sneakers", label: "👟 Sneakers" },
                  ].map((cat) => {
                    const isSelected = (form.category || "tshirt") === cat.id;
                    return (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => setForm((prev) => ({ ...prev, category: cat.id }))}
                        className={`rounded-xl px-2.5 py-1.5 text-xs font-semibold transition cursor-pointer border flex items-center gap-1 ${
                          isSelected
                            ? "border-black bg-black text-white shadow-xs font-bold"
                            : "border-gray-200 bg-white text-gray-700 hover:border-gray-300 hover:bg-gray-50"
                        }`}
                      >
                        {cat.label}
                      </button>
                    );
                  })}
                </div>

                {/* Color Selection */}
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-gray-500 mr-1">
                    Color: <span className="capitalize font-bold text-black">{form.color || "black"}</span>
                  </span>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {[
                      { id: "black", bg: "#171717" },
                      { id: "white", bg: "#ffffff" },
                      { id: "grey", bg: "#9ca3af" },
                      { id: "beige", bg: "#d4c5a9" },
                      { id: "blue", bg: "#2563eb" },
                      { id: "green", bg: "#16a34a" },
                      { id: "olive", bg: "#556b2f" },
                      { id: "brown", bg: "#78350f" },
                      { id: "maroon", bg: "#881337" },
                    ].map((c) => {
                      const isSelected = (form.color || "black") === c.id;
                      return (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => setForm((prev) => ({ ...prev, color: c.id }))}
                          title={c.id}
                          className={`flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] capitalize transition cursor-pointer border ${
                            isSelected
                              ? "border-black ring-1 ring-black font-bold shadow-xs bg-white text-black"
                              : "border-gray-200 bg-white hover:bg-gray-50 text-gray-600"
                          }`}
                        >
                          <span
                            className="h-2.5 w-2.5 rounded-full border border-black/20 shrink-0"
                            style={{ backgroundColor: c.bg }}
                          />
                          <span>{c.id}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
          </form>
        </section>

        {/* ================= 2. WARDROBE GALLERY ================= */}
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
              <div className="grid gap-5 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
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
    </main>
  );
}
