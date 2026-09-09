"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { API_BASE_URL, getImageUrl } from "@/lib/api";
import { getStoredUser, getAuthHeaders, setSession, getStoredToken, clearSession, User } from "@/lib/auth";

const SKIN_TONES = [
  { value: "fair", label: "Fair", hex: "#fae2d6" },
  { value: "light", label: "Light", hex: "#edd0b7" },
  { value: "medium", label: "Medium", hex: "#cfa47e" },
  { value: "deep", label: "Deep", hex: "#7d5537" },
] as const;

const GENDER_OPTIONS = [
  { value: "male", label: "Male" },
  { value: "female", label: "Female" },
  { value: "other", label: "Other" },
] as const;

const TOP_SIZES = ["XS", "S", "M", "L", "XL", "2XL", "3XL"] as const;
const BOTTOM_SIZES = ["28", "30", "32", "34", "36", "38", "40", "42"] as const;
const SHOE_SIZES = ["UK 6", "UK 7", "UK 8", "UK 9", "UK 10", "UK 11", "UK 12"] as const;

// Preset quick measurements in inches
const MALE_CHEST_PRESETS = ["36", "38", "40", "42", "44", "46"];
const MALE_WAIST_PRESETS = ["28", "30", "32", "34", "36", "38", "40"];
const MALE_HIP_PRESETS = ["36", "38", "40", "42", "44", "46"];

const FEMALE_BUST_PRESETS = ["30", "32", "34", "36", "38", "40", "42", "44"];
const FEMALE_WAIST_PRESETS = ["26", "28", "30", "32", "34", "36", "38", "40"];
const FEMALE_HIP_PRESETS = ["32", "34", "36", "38", "40", "42", "44", "46"];

export default function ProfilePage() {
  const router = useRouter();

  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    gender: "male",
    height: "",
    weight: "",
    skin_tone: "",
    style_preference: "casual",
    fit_preference: "regular",
    chest_bust: "",
    waist_size: "",
    hip_size: "",
    top_size: "M",
    bottom_size: "32",
    shoe_size: "UK 8",
  });

  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [loading, setLoading] = useState(false);
  const [fetchingProfile, setFetchingProfile] = useState(true);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletingAccount, setDeletingAccount] = useState(false);

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
    setAvatarUrl(user.avatar_url || null);
    setForm((prev) => ({
      ...prev,
      name: user.name,
      email: user.email,
    }));

    const loadProfile = async () => {
      try {
        const token = getStoredToken();

        // 1. Fetch latest user details including avatar
        const userRes = await fetch(`${API_BASE_URL}/users/me`, {
          headers: getAuthHeaders(),
        });
        if (userRes.ok) {
          const freshUser: User = await userRes.json();
          setCurrentUser(freshUser);
          setAvatarUrl(freshUser.avatar_url || null);
          setForm((prev) => ({
            ...prev,
            name: freshUser.name || prev.name,
            email: freshUser.email || prev.email,
            phone: freshUser.phone || prev.phone,
          }));
          if (token) {
            setSession(token, freshUser);
          }
        } else if (userRes.status === 401) {
          clearSession();
          router.push("/login");
          return;
        }

        // 2. Fetch style profile & sizing
        const res = await fetch(`${API_BASE_URL}/users/${user.id}/style-profile`, {
          headers: getAuthHeaders(),
        });
        if (res.ok) {
          const data = await res.json();
          setForm((prev) => ({
            ...prev,
            gender: data.gender || prev.gender,
            height: data.height != null ? String(data.height) : "",
            weight: data.weight != null ? String(data.weight) : "",
            skin_tone: data.skin_tone || prev.skin_tone,
            style_preference: data.style_preference || prev.style_preference,
            fit_preference: data.fit_preference || prev.fit_preference,
            chest_bust: data.chest_bust || "",
            waist_size: data.waist_size || "",
            hip_size: data.hip_size || "",
            top_size: data.top_size || prev.top_size,
            bottom_size: data.bottom_size || prev.bottom_size,
            shoe_size: data.shoe_size || prev.shoe_size,
          }));
        }
      } catch (err) {
        console.error("Could not fetch existing style profile", err);
      } finally {
        setFetchingProfile(false);
      }
    };

    loadProfile();
  }, [router]);

  const handleAvatarSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      setToastMessage("Image size must be under 5MB");
      return;
    }

    const validTypes = ["image/jpeg", "image/png", "image/webp", "image/jpg", "image/gif"];
    if (!validTypes.includes(file.type)) {
      setToastMessage("Please upload a JPG, PNG, or WebP image");
      return;
    }

    // Instant local preview
    const previewUrl = URL.createObjectURL(file);
    setAvatarUrl(previewUrl);

    setUploadingAvatar(true);
    const formData = new FormData();
    formData.append("file", file);

    try {
      const token = getStoredToken();
      const res = await fetch(`${API_BASE_URL}/users/profile-picture`, {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: formData,
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.detail || "Failed to upload profile picture");
      }

      const updatedUser: User = await res.json();
      setCurrentUser(updatedUser);
      setAvatarUrl(updatedUser.avatar_url || null);
      if (token) {
        setSession(token, updatedUser);
      }

      if (updatedUser.skin_tone) {
        setForm((prev) => ({ ...prev, skin_tone: updatedUser.skin_tone || "" }));
        const toneLabel = updatedUser.skin_tone.charAt(0).toUpperCase() + updatedUser.skin_tone.slice(1);
        setToastMessage(`Photo updated! ✨ AI calibrated skin tone: ${toneLabel}`);
      } else {
        setForm((prev) => ({ ...prev, skin_tone: "" }));
        setToastMessage("Photo updated. No human face detected — skin tone unset.");
      }
    } catch (err: unknown) {
      console.error(err);
      const msg = err instanceof Error ? err.message : "Failed to upload photo";
      setToastMessage(msg);
      setAvatarUrl(currentUser?.avatar_url || null);
    } finally {
      setUploadingAvatar(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleRemoveAvatar = async () => {
    if (!avatarUrl || uploadingAvatar) return;

    setUploadingAvatar(true);
    try {
      const token = getStoredToken();
      const res = await fetch(`${API_BASE_URL}/users/profile-picture`, {
        method: "DELETE",
        headers: getAuthHeaders(),
      });

      if (!res.ok) {
        throw new Error("Failed to remove profile picture");
      }

      const updatedUser: User = await res.json();
      setCurrentUser(updatedUser);
      setAvatarUrl(null);
      setForm((prev) => ({ ...prev, skin_tone: "" }));
      if (token) {
        setSession(token, updatedUser);
      }
      setToastMessage("Profile picture removed. Skin tone reset.");
    } catch (err: unknown) {
      console.error(err);
      setToastMessage("Could not remove profile picture.");
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setForm({
      ...form,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const user = getStoredUser();
    if (!user) {
      router.push("/login");
      return;
    }

    try {
      // 1. Update User info (name, mobile number)
      const userRes = await fetch(`${API_BASE_URL}/users/me`, {
        method: "PUT",
        headers: getAuthHeaders(),
        body: JSON.stringify({
          name: form.name,
          phone: form.phone || null,
        }),
      });

      if (userRes.ok) {
        const freshUser: User = await userRes.json();
        setCurrentUser(freshUser);
        const token = getStoredToken();
        if (token) setSession(token, freshUser);
      }

      // 2. Update Style Profile with measurements & sizes
      const profileResponse = await fetch(`${API_BASE_URL}/users/${user.id}/style-profile`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({
          height: form.height ? Number(form.height) : null,
          weight: form.weight ? Number(form.weight) : null,
          gender: form.gender || null,
          skin_tone: form.skin_tone || null,
          style_preference: form.style_preference || "casual",
          fit_preference: form.fit_preference || "regular",
          chest_bust: form.chest_bust || null,
          waist_size: form.waist_size || null,
          hip_size: form.hip_size || null,
          top_size: form.top_size || null,
          bottom_size: form.bottom_size || null,
          shoe_size: form.shoe_size || null,
        }),
      });

      if (!profileResponse.ok) {
        throw new Error("Failed to save style profile");
      }

      setToastMessage("Profile & measurements updated successfully! ✨");
      setTimeout(() => {
        router.push("/wardrobe");
      }, 700);
    } catch (error) {
      console.error(error);
      setToastMessage("Something went wrong saving your profile.");
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    clearSession();
    router.push("/login");
  };

  const handleDeleteAccount = async () => {
    setDeletingAccount(true);
    try {
      const res = await fetch(`${API_BASE_URL}/users/me`, {
        method: "DELETE",
        headers: getAuthHeaders(),
      });

      if (!res.ok) {
        throw new Error("Failed to delete account");
      }

      clearSession();
      router.push("/");
    } catch (err: unknown) {
      console.error(err);
      setToastMessage("Failed to delete account. Please try again.");
      setDeletingAccount(false);
      setShowDeleteModal(false);
    }
  };

  const currentToneObj = SKIN_TONES.find(
    (tone) => tone.value.toLowerCase() === (form.skin_tone || "").toLowerCase()
  );

  const isFemale = form.gender === "female";
  const chestBustPresets = isFemale ? FEMALE_BUST_PRESETS : MALE_CHEST_PRESETS;
  const waistPresets = isFemale ? FEMALE_WAIST_PRESETS : MALE_WAIST_PRESETS;
  const hipPresets = isFemale ? FEMALE_HIP_PRESETS : MALE_HIP_PRESETS;

  if (fetchingProfile) {
    return (
      <main className="flex min-h-[calc(100vh-65px)] items-center justify-center bg-[#f7f7f5] px-6">
        <div className="text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-[#171717] text-white shadow-2xs">
            🧬
          </div>
          <div className="mx-auto mt-5 h-8 w-8 animate-spin rounded-full border-2 border-gray-300 border-t-black" />
          <p className="mt-4 text-xs font-bold uppercase tracking-widest text-gray-500">
            Loading your style DNA...
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="relative min-h-[calc(100vh-65px)] overflow-hidden bg-[#f7f7f5] px-5 py-8 sm:px-8 sm:py-12 text-[#111111]">
      {/* Ambient lighting glow */}
      <div className="pointer-events-none absolute -top-40 left-1/2 -z-10 h-[500px] w-[900px] -translate-x-1/2 rounded-full bg-gradient-to-b from-[#e8ebe4]/50 via-[#fcfbf7]/40 to-transparent blur-3xl" />

      {/* Floating Toast */}
      {toastMessage && (
        <div className="fixed top-20 right-6 z-50 animate-pop-in">
          <div className="flex items-center gap-2 rounded-2xl border border-black/10 bg-[#171717] px-4 py-2.5 text-xs font-semibold text-white shadow-lg backdrop-blur-md">
            <span>⚠️</span>
            <span>{toastMessage}</span>
          </div>
        </div>
      )}

      <div className="mx-auto max-w-4xl">
        
        {/* ================= HEADER ================= */}
        <div className="mb-8 border-b border-[#e2e4e7] pb-8">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-[#dedad0] bg-white/90 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-[#45546a] shadow-2xs backdrop-blur-md">
                <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                <span>Style DNA Studio</span>
              </div>
              <h1 className="mt-3 text-3xl font-extrabold tracking-tight text-gray-950 sm:text-4xl">
                Your Style Identity
              </h1>
              <p className="mt-1 max-w-xl text-xs sm:text-sm text-gray-600">
                Calibrate your physical proportions and aesthetic preferences for precision outfit matchmaking.
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
                href="/saved"
                className="inline-flex h-11 items-center justify-center rounded-xl bg-white border border-[#d4d6da] px-4 text-xs font-semibold text-gray-800 shadow-2xs transition hover:bg-gray-50 active:scale-95"
              >
                <span>★ Lookbook</span>
              </Link>
            </div>
          </div>
        </div>

        {/* ================= PROFILE FORM CONTAINER ================= */}
        <form
          onSubmit={handleSubmit}
          className="rounded-3xl border border-[#e2e4e7] bg-white p-6 sm:p-9 shadow-[0_10px_30px_rgba(27,35,43,0.04)] space-y-8 animate-pop-in"
        >
          
          {/* Section 1: Member Identity */}
          <div>
            <h2 className="text-sm font-bold uppercase tracking-wider text-gray-900 border-b border-[#eceef0] pb-2.5">
              1. Member Identity
            </h2>

            {/* Profile Avatar Card */}
            <div className="mt-4 flex flex-col sm:flex-row items-start sm:items-center gap-5 p-4 sm:p-5 rounded-2xl border border-[#ebece8] bg-[#fafaf8]">
              <div className="relative group">
                <div className="relative h-20 w-20 sm:h-24 sm:w-24 overflow-hidden rounded-full border-2 border-white shadow-md bg-gradient-to-br from-neutral-800 to-neutral-950 flex items-center justify-center text-white text-2xl sm:text-3xl font-bold uppercase select-none">
                  {avatarUrl ? (
                    <img
                      src={getImageUrl(avatarUrl) || avatarUrl}
                      alt={form.name || "Profile Photo"}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <span>{form.name ? form.name.charAt(0) : "👤"}</span>
                  )}
                  {uploadingAvatar && (
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center">
                      <div className="h-6 w-6 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    </div>
                  )}
                </div>

                {/* Camera icon button */}
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadingAvatar}
                  className="absolute bottom-0 right-0 h-8 w-8 rounded-full bg-black text-white flex items-center justify-center shadow-md hover:bg-neutral-800 transition active:scale-90 disabled:opacity-50 text-xs"
                  title="Upload profile photo"
                >
                  📷
                </button>
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold text-gray-900">Profile Photo</h3>
                  {uploadingAvatar && (
                    <span className="text-[11px] font-semibold text-emerald-600 animate-pulse">
                      Uploading...
                    </span>
                  )}
                </div>

                <div className="mt-2 flex items-center gap-2">
                  {currentToneObj ? (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-bold text-emerald-800 border border-emerald-200">
                      <span className="h-2 w-2 rounded-full" style={{ backgroundColor: currentToneObj.hex }} />
                      <span>AI Skin Tone: {currentToneObj.label}</span>
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-2.5 py-1 text-[11px] font-semibold text-amber-800 border border-amber-200">
                      <span>⚠️ Skin Tone: Undefined (No face detected)</span>
                    </span>
                  )}
                </div>

                <div className="mt-3 flex flex-wrap items-center gap-2.5">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/gif"
                    className="hidden"
                    onChange={handleAvatarSelect}
                  />

                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploadingAvatar}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-gray-300 bg-white px-3.5 py-2 text-xs font-semibold text-gray-800 shadow-2xs hover:bg-gray-50 active:scale-95 transition disabled:opacity-50"
                  >
                    <span>{avatarUrl ? "Change Photo" : "Upload Photo"}</span>
                  </button>

                  {avatarUrl && (
                    <button
                      type="button"
                      onClick={handleRemoveAvatar}
                      disabled={uploadingAvatar}
                      className="inline-flex items-center gap-1 rounded-xl border border-red-200 bg-red-50/70 px-3 py-2 text-xs font-semibold text-red-600 hover:bg-red-100/80 transition active:scale-95 disabled:opacity-50"
                    >
                      <span>Remove</span>
                    </button>
                  )}
                </div>
              </div>
            </div>

            <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div>
                <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-gray-700">
                  Full Name
                </label>
                <div className="relative">
                  <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 text-sm">
                    👤
                  </span>
                  <input
                    name="name"
                    value={form.name}
                    onChange={handleChange}
                    required
                    className="w-full rounded-xl border border-[#e2e4e7] bg-[#fbfbf9] py-3 pl-10 pr-3.5 text-xs sm:text-sm text-gray-900 outline-none transition focus:border-black focus:bg-white focus:ring-1 focus:ring-black"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-gray-700">
                  Email Address
                </label>
                <div className="relative">
                  <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 text-sm">
                    ✉️
                  </span>
                  <input
                    name="email"
                    type="email"
                    value={form.email}
                    readOnly
                    className="w-full rounded-xl border border-[#e2e4e7] bg-gray-100/70 py-3 pl-10 pr-3.5 text-xs sm:text-sm text-gray-600 cursor-not-allowed outline-none"
                    title="Email is fixed for account security"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-gray-700">
                  Mobile Number
                </label>
                <div className="relative">
                  <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 text-sm">
                    📱
                  </span>
                  <input
                    name="phone"
                    type="tel"
                    placeholder="+91 98765 43210"
                    value={form.phone}
                    onChange={handleChange}
                    className="w-full rounded-xl border border-[#e2e4e7] bg-[#fbfbf9] py-3 pl-10 pr-3.5 text-xs sm:text-sm text-gray-900 outline-none transition focus:border-black focus:bg-white focus:ring-1 focus:ring-black"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-gray-700">
                  Gender
                </label>
                <div className="relative">
                  <select
                    name="gender"
                    value={form.gender}
                    onChange={handleChange}
                    className="w-full appearance-none rounded-xl border border-[#e2e4e7] bg-[#fbfbf9] py-3 pl-4 pr-10 text-xs sm:text-sm text-gray-900 outline-none transition focus:border-black focus:bg-white focus:ring-1 focus:ring-black cursor-pointer"
                  >
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="other">Other</option>
                  </select>
                  <span className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 text-xs">
                    ▼
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Section 2: Body Proportions */}
          <div>
            <h2 className="text-sm font-bold uppercase tracking-wider text-gray-900 border-b border-[#eceef0] pb-2.5">
              2. Body Proportions
            </h2>

            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-gray-700">
                  Height
                </label>
                <div className="relative">
                  <input
                    name="height"
                    type="number"
                    placeholder="175"
                    value={form.height}
                    onChange={handleChange}
                    className="w-full rounded-xl border border-[#e2e4e7] bg-[#fbfbf9] py-3 pl-4 pr-12 text-xs sm:text-sm text-gray-900 outline-none transition focus:border-black focus:bg-white focus:ring-1 focus:ring-black"
                  />
                  <span className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-gray-400">
                    cm
                  </span>
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-gray-700">
                  Weight
                </label>
                <div className="relative">
                  <input
                    name="weight"
                    type="number"
                    placeholder="68"
                    value={form.weight}
                    onChange={handleChange}
                    className="w-full rounded-xl border border-[#e2e4e7] bg-[#fbfbf9] py-3 pl-4 pr-12 text-xs sm:text-sm text-gray-900 outline-none transition focus:border-black focus:bg-white focus:ring-1 focus:ring-black"
                  />
                  <span className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-gray-400">
                    kg
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Section 3: Size Chart & Precision Measurements */}
          <div>
            <h2 className="text-sm font-bold uppercase tracking-wider text-gray-900 border-b border-[#eceef0] pb-2.5">
              3. Size Chart & Fit Measurements
            </h2>

            {/* Body Measurements Chips */}
            <div className="mt-4 grid gap-4 sm:grid-cols-3">
              
              {/* Chest / Bust */}
              <div className="rounded-2xl border border-gray-200 bg-[#fafaf8] p-4">
                <label className="text-xs font-bold text-gray-900 block mb-2.5">
                  {isFemale ? "Bust / Breast Size" : "Chest Size"}
                </label>
                
                <div className="flex flex-wrap gap-1.5">
                  {chestBustPresets.map((size) => (
                    <button
                      key={size}
                      type="button"
                      onClick={() => setForm({ ...form, chest_bust: form.chest_bust === size ? "" : size })}
                      className={`h-8 px-2.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                        form.chest_bust === size
                          ? "bg-black text-white shadow-xs"
                          : "bg-white border border-gray-200 text-gray-700 hover:border-gray-400"
                      }`}
                    >
                      {size}&quot;
                    </button>
                  ))}
                </div>
              </div>

              {/* Waist */}
              <div className="rounded-2xl border border-gray-200 bg-[#fafaf8] p-4">
                <label className="text-xs font-bold text-gray-900 block mb-2.5">
                  Waist Size
                </label>

                <div className="flex flex-wrap gap-1.5">
                  {waistPresets.map((size) => (
                    <button
                      key={size}
                      type="button"
                      onClick={() => setForm({ ...form, waist_size: form.waist_size === size ? "" : size })}
                      className={`h-8 px-2.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                        form.waist_size === size
                          ? "bg-black text-white shadow-xs"
                          : "bg-white border border-gray-200 text-gray-700 hover:border-gray-400"
                      }`}
                    >
                      {size}&quot;
                    </button>
                  ))}
                </div>
              </div>

              {/* Hip Size */}
              <div className="rounded-2xl border border-gray-200 bg-[#fafaf8] p-4">
                <label className="text-xs font-bold text-gray-900 block mb-2.5">
                  Hip Size
                </label>

                <div className="flex flex-wrap gap-1.5">
                  {hipPresets.map((size) => (
                    <button
                      key={size}
                      type="button"
                      onClick={() => setForm({ ...form, hip_size: form.hip_size === size ? "" : size })}
                      className={`h-8 px-2.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                        form.hip_size === size
                          ? "bg-black text-white shadow-xs"
                          : "bg-white border border-gray-200 text-gray-700 hover:border-gray-400"
                      }`}
                    >
                      {size}&quot;
                    </button>
                  ))}
                </div>
              </div>

            </div>

            {/* Standard Garment Sizes (Top, Bottom, Shoe) */}
            <div className="mt-5 space-y-4 pt-4 border-t border-gray-100">
              
              {/* Top Size */}
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-gray-700 block mb-2">
                  Top Size (Upperwear)
                </label>
                <div className="flex flex-wrap gap-2">
                  {TOP_SIZES.map((size) => {
                    const isSelected = form.top_size === size;
                    return (
                      <button
                        key={size}
                        type="button"
                        onClick={() => setForm({ ...form, top_size: size })}
                        className={`h-9 min-w-11 px-3 rounded-xl text-xs font-bold transition cursor-pointer ${
                          isSelected
                            ? "bg-[#171717] text-white shadow-xs"
                            : "bg-[#fbfbf9] border border-gray-200 text-gray-800 hover:bg-white hover:border-gray-400"
                        }`}
                      >
                        {size}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Bottom Size */}
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-gray-700 block mb-2">
                  Bottom Size (Pants / Jeans)
                </label>
                <div className="flex flex-wrap gap-2">
                  {BOTTOM_SIZES.map((size) => {
                    const isSelected = form.bottom_size === size;
                    return (
                      <button
                        key={size}
                        type="button"
                        onClick={() => setForm({ ...form, bottom_size: size })}
                        className={`h-9 min-w-11 px-3 rounded-xl text-xs font-bold transition cursor-pointer ${
                          isSelected
                            ? "bg-[#171717] text-white shadow-xs"
                            : "bg-[#fbfbf9] border border-gray-200 text-gray-800 hover:bg-white hover:border-gray-400"
                        }`}
                      >
                        {size}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Shoe Size */}
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-gray-700 block mb-2">
                  Shoe Size (Footwear)
                </label>
                <div className="flex flex-wrap gap-2">
                  {SHOE_SIZES.map((size) => {
                    const isSelected = form.shoe_size === size;
                    return (
                      <button
                        key={size}
                        type="button"
                        onClick={() => setForm({ ...form, shoe_size: size })}
                        className={`h-9 px-3 rounded-xl text-xs font-bold transition cursor-pointer ${
                          isSelected
                            ? "bg-[#171717] text-white shadow-xs"
                            : "bg-[#fbfbf9] border border-gray-200 text-gray-800 hover:bg-white hover:border-gray-400"
                        }`}
                      >
                        {size}
                      </button>
                    );
                  })}
                </div>
              </div>

            </div>

          </div>

          {/* Submit Action */}
          <div className="border-t border-[#eceef0] pt-6">
            <button
              type="submit"
              disabled={loading}
              className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#171717] px-6 text-xs sm:text-sm font-bold text-white shadow-sm transition hover:bg-black active:scale-98 disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer"
            >
              {loading ? (
                <>
                  <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                  <span>Saving Profile & Sizing...</span>
                </>
              ) : (
                <>
                  <span>Save Profile & Go to Wardrobe</span>
                  <span>→</span>
                </>
              )}
            </button>
          </div>

        </form>

        {/* ================= 5. ACCOUNT MANAGEMENT & DANGER ZONE ================= */}
        <div className="rounded-3xl border border-[#e2e4e7] bg-white p-6 sm:p-8 shadow-[0_10px_30px_rgba(27,35,43,0.03)] space-y-6">
          <div className="flex items-center justify-between border-b border-[#eceef0] pb-3">
            <div>
              <h2 className="text-sm font-bold uppercase tracking-wider text-gray-900">
                Account Management
              </h2>
              <p className="text-xs text-gray-500 mt-0.5">
                Session controls and permanent account deletion.
              </p>
            </div>
            <span className="text-xs font-semibold text-gray-400">
              {form.email}
            </span>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
            
            {/* Logout Action */}
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={handleLogout}
                className="inline-flex items-center gap-2 rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-xs font-bold text-gray-800 shadow-2xs hover:bg-gray-50 hover:border-gray-400 transition active:scale-95 cursor-pointer"
              >
                <span>🚪</span>
                <span>Log Out of WearWise</span>
              </button>
              <span className="text-[11px] text-gray-500 hidden md:inline">
                Safely sign out on this browser.
              </span>
            </div>

            {/* Delete Account Action */}
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setShowDeleteModal(true)}
                className="inline-flex items-center gap-2 rounded-xl border border-red-200 bg-red-50/70 px-4 py-2.5 text-xs font-bold text-red-600 hover:bg-red-100/80 transition active:scale-95 cursor-pointer"
              >
                <span>🗑️</span>
                <span>Delete Account</span>
              </button>
            </div>

          </div>
        </div>

      </div>

      {/* ================= DELETE CONFIRMATION MODAL ================= */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-pop-in">
          <div className="max-w-md w-full rounded-3xl border border-gray-200 bg-white p-6 sm:p-7 shadow-2xl">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-red-100 text-red-600 text-xl mx-auto">
              ⚠️
            </div>

            <h3 className="mt-4 text-center text-lg font-bold text-gray-900">
              Permanently Delete Account?
            </h3>

            <p className="mt-2 text-center text-xs sm:text-sm text-gray-600 leading-relaxed">
              Are you sure you want to delete your account? This action <strong className="text-gray-900">cannot be undone</strong>. All your style calibrations, wardrobe items, photos, and saved outfits will be permanently removed.
            </p>

            <div className="mt-6 flex flex-col sm:flex-row items-center gap-3">
              <button
                type="button"
                disabled={deletingAccount}
                onClick={() => setShowDeleteModal(false)}
                className="w-full sm:w-1/2 rounded-xl border border-gray-300 bg-white py-2.5 text-xs font-bold text-gray-700 hover:bg-gray-50 transition cursor-pointer disabled:opacity-50"
              >
                Cancel
              </button>

              <button
                type="button"
                disabled={deletingAccount}
                onClick={handleDeleteAccount}
                className="w-full sm:w-1/2 rounded-xl bg-red-600 py-2.5 text-xs font-bold text-white shadow-xs hover:bg-red-700 transition active:scale-95 cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {deletingAccount ? (
                  <>
                    <span className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                    <span>Deleting...</span>
                  </>
                ) : (
                  <span>Yes, Delete Account</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

    </main>
  );
}