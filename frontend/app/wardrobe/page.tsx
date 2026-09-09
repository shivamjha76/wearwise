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
  const cameraInputRef = useRef<HTMLInputElement | null>(null);

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
      let finalCategory = form.category || "tshirt";
      let finalColor = form.color || "black";
      let finalFit = form.fit || "regular";
      let finalPattern = form.pattern || "solid";
      let finalStyle = form.style || "casual";

      if (imageMode === "upload") {
        if (!file) {
          setNotification({ type: "error", message: "Please click a photo or choose an image file first." });
          setUploading(false);
          return;
        }

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

        if (uploadData.tags) {
          if (uploadData.tags.category) finalCategory = uploadData.tags.category;
          if (uploadData.tags.color) finalColor = uploadData.tags.color;
          if (uploadData.tags.fit) finalFit = uploadData.tags.fit;
          if (uploadData.tags.pattern) finalPattern = uploadData.tags.pattern;
          if (uploadData.tags.style) finalStyle = uploadData.tags.style;
        }
      } else if (imageMode === "url") {
        const trimmedUrl = form.image_url.trim();
        if (!trimmedUrl) {
          setNotification({ type: "error", message: "Please enter a valid image URL." });
          setUploading(false);
          return;
        }
        finalImageUrl = trimmedUrl;

        // Intelligent deduction from URL string
        const urlLower = trimmedUrl.toLowerCase();
        if (urlLower.includes("shirt") && !urlLower.includes("t-shirt") && !urlLower.includes("tshirt")) finalCategory = "shirt";
        else if (urlLower.includes("jean")) finalCategory = "jeans";
        else if (urlLower.includes("pant") || urlLower.includes("trouser") || urlLower.includes("chino")) finalCategory = "pants";
        else if (urlLower.includes("sneaker")) finalCategory = "sneakers";
        else if (urlLower.includes("shoe") || urlLower.includes("boot") || urlLower.includes("loafer")) finalCategory = "shoes";
        else if (urlLower.includes("tshirt") || urlLower.includes("tee")) finalCategory = "tshirt";

        for (const c of ["white", "black", "grey", "beige", "blue", "green", "olive", "brown", "maroon"]) {
          if (urlLower.includes(c)) {
            finalColor = c;
            break;
          }
        }
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
        throw new Error("Failed to add item");
      }

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
                Directly click a photo, upload an image, or use a URL.
              </p>
            </div>

            <form onSubmit={addItem} className="mt-5 space-y-4">
              {/* Upload Mode Selector */}
              <div className="flex rounded-xl bg-[#f0f1f3] p-1 text-xs font-semibold">
                <button
                  type="button"
                  onClick={() => setImageMode("upload")}
                  className={`flex-1 rounded-lg py-2 transition cursor-pointer flex items-center justify-center gap-1.5 ${
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
                  className={`flex-1 rounded-lg py-2 transition cursor-pointer flex items-center justify-center gap-1.5 ${
                    imageMode === "url"
                      ? "bg-white text-black shadow-2xs font-bold"
                      : "text-gray-500 hover:text-black"
                  }`}
                >
                  <span>🔗</span>
                  <span>Image URL</span>
                </button>
              </div>

              {/* Mode: Photo Upload / Camera Click */}
              {imageMode === "upload" ? (
                <div>
                  {previewUrl ? (
                    <div className="relative overflow-hidden rounded-2xl border border-gray-200 bg-[#fbfbf9] p-3">
                      <div className="relative aspect-[4/5] w-full overflow-hidden rounded-xl bg-[#f7f7f5] flex items-center justify-center">
                        <img
                          src={previewUrl}
                          alt="Garment preview"
                          className="h-full w-full object-contain object-center"
                        />
                      </div>
                      
                      <div className="mt-2.5 flex items-center justify-between px-1">
                        <span className="truncate text-xs font-medium text-gray-600 max-w-[200px]">
                          {file?.name || "Garment Photo"}
                        </span>
                        <button
                          type="button"
                          onClick={handleClearFile}
                          className="text-xs font-semibold text-red-600 hover:underline cursor-pointer"
                        >
                          Remove
                        </button>
                      </div>

                      {/* AI Scanning Status Indicator */}
                      {analyzingImage && (
                        <div className="mt-2.5 flex items-center gap-2 rounded-xl bg-amber-50 border border-amber-200 px-3 py-2 text-xs text-amber-900 animate-pulse">
                          <span className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-amber-700 border-t-transparent" />
                          <span className="font-semibold">✨ AI scanning garment...</span>
                        </div>
                      )}

                      {aiDetectedInfo && !analyzingImage && (
                        <div className="mt-2.5 rounded-xl bg-emerald-50 border border-emerald-200 p-2.5 text-xs text-emerald-950 animate-pop-in">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-1.5">
                              <span>✨</span>
                              <span className="font-bold">
                                Auto-detected: <span className="capitalize">{aiDetectedInfo.color} {aiDetectedInfo.category}</span>
                              </span>
                            </div>
                            {aiDetectedInfo.confidence && (
                              <span className="rounded-full bg-emerald-200/80 px-1.5 py-0.2 text-[9px] font-bold text-emerald-900">
                                {Math.round(aiDetectedInfo.confidence * 100)}%
                              </span>
                            )}
                          </div>
                          {aiDetectedInfo.fit && (
                            <p className="mt-1 text-[11px] text-emerald-800">
                              Fit: <span className="capitalize font-semibold">{aiDetectedInfo.fit}</span>
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {/* Drag & Drop or Click Area */}
                      <div
                        onDragEnter={handleDrag}
                        onDragLeave={handleDrag}
                        onDragOver={handleDrag}
                        onDrop={handleDrop}
                        onClick={() => fileInputRef.current?.click()}
                        className={`flex flex-col items-center justify-center rounded-2xl border-2 border-dashed p-6 text-center cursor-pointer transition ${
                          dragActive
                            ? "border-black bg-gray-50 scale-102"
                            : "border-[#e2e4e7] bg-[#fbfbf9] hover:border-gray-400 hover:bg-white"
                        }`}
                      >
                        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white shadow-2xs text-2xl">
                          📸
                        </div>
                        <p className="mt-2 text-xs font-bold text-gray-900">
                          Click to upload or drag & drop
                        </p>
                        <p className="mt-0.5 text-[11px] text-gray-400">
                          PNG, JPG, WebP up to 10MB
                        </p>
                      </div>

                      {/* Direct Action Buttons: Camera Click vs Choose File */}
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => cameraInputRef.current?.click()}
                          className="flex items-center justify-center gap-1.5 rounded-xl border border-gray-200 bg-[#fbfbf9] py-2.5 text-xs font-semibold text-gray-800 hover:bg-white hover:border-gray-400 transition cursor-pointer active:scale-98"
                        >
                          <span>📷</span>
                          <span>Click Photo</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          className="flex items-center justify-center gap-1.5 rounded-xl border border-gray-200 bg-[#fbfbf9] py-2.5 text-xs font-semibold text-gray-800 hover:bg-white hover:border-gray-400 transition cursor-pointer active:scale-98"
                        >
                          <span>📁</span>
                          <span>Upload File</span>
                        </button>
                      </div>

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
                      <input
                        ref={cameraInputRef}
                        type="file"
                        accept="image/*"
                        capture="environment"
                        onChange={(e) => {
                          if (e.target.files?.[0]) {
                            handleFileSelect(e.target.files[0]);
                          }
                        }}
                        className="hidden"
                      />
                    </div>
                  )}
                </div>
              ) : (
                /* Mode: URL */
                <div className="space-y-3">
                  <div>
                    <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-gray-700">
                      Garment Image URL
                    </label>
                    <input
                      name="image_url"
                      type="url"
                      placeholder="https://example.com/item.jpg"
                      value={form.image_url}
                      onChange={(e) => setForm({ ...form, image_url: e.target.value })}
                      className="w-full rounded-xl border border-[#e2e4e7] bg-[#fbfbf9] p-3 text-xs font-medium text-gray-900 placeholder:text-gray-400 outline-none focus:border-black"
                    />
                  </div>

                  {form.image_url.trim() && (
                    <div className="relative aspect-[4/5] w-full overflow-hidden rounded-2xl border border-gray-200 bg-[#f7f7f5] p-2 flex items-center justify-center">
                      <img
                        src={form.image_url}
                        alt="URL preview"
                        className="h-full w-full object-contain"
                        onError={(e) => {
                          (e.currentTarget as HTMLElement).style.display = "none";
                        }}
                      />
                    </div>
                  )}
                </div>
              )}

              {/* Submit Button */}
              <button
                type="submit"
                disabled={uploading || (imageMode === "upload" && !file) || (imageMode === "url" && !form.image_url.trim())}
                className="w-full rounded-xl bg-[#171717] px-5 py-3.5 text-xs font-bold text-white transition hover:bg-black active:scale-98 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer shadow-sm"
              >
                {uploading ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                    <span>Adding to Wardrobe...</span>
                  </span>
                ) : (
                  "+ Add to Wardrobe"
                )}
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
