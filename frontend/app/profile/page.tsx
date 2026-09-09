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
  { value: "male", label: "Male", icon: "👨", desc: "Men's style & silhouettes" },
  { value: "female", label: "Female", icon: "👩", desc: "Women's style & silhouettes" },
  { value: "unisex", label: "Non-Binary / Unisex", icon: "✨", desc: "Fluid & gender-neutral style" },
] as const;

export default function ProfilePage() {
  const router = useRouter();

  const [form, setForm] = useState({
    name: "",
    email: "",
    gender: "male",
    height: "",
    weight: "",
    skin_tone: "",
    style_preference: "casual",
    fit_preference: "regular",
  });

  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [loading, setLoading] = useState(false);
  const [fetchingProfile, setFetchingProfile] = useState(true);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

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
          }));
          if (token) {
            setSession(token, freshUser);
          }
        } else if (userRes.status === 401) {
          clearSession();
          router.push("/login");
          return;
        }

        // 2. Fetch style profile
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
        }),
      });

      if (!profileResponse.ok) {
        throw new Error("Failed to save style profile");
      }

      router.push("/wardrobe");
    } catch (error) {
      console.error(error);
      setToastMessage("Something went wrong saving your style profile.");
    } finally {
      setLoading(false);
    }
  };

  const currentToneObj = SKIN_TONES.find(
    (tone) => tone.value.toLowerCase() === (form.skin_tone || "").toLowerCase()
  );

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

            <div className="mt-5 grid gap-4 sm:grid-cols-2">
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
                    onChange={handleChange}
                    required
                    className="w-full rounded-xl border border-[#e2e4e7] bg-[#fbfbf9] py-3 pl-10 pr-3.5 text-xs sm:text-sm text-gray-900 outline-none transition focus:border-black focus:bg-white focus:ring-1 focus:ring-black"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Section 2: Gender Identity */}
          <div>
            <div className="flex items-center justify-between border-b border-[#eceef0] pb-2.5">
              <h2 className="text-sm font-bold uppercase tracking-wider text-gray-900">
                2. Gender Identity
              </h2>
              <span className="text-xs font-semibold text-gray-500 capitalize">
                Selected: {GENDER_OPTIONS.find((g) => g.value === form.gender)?.label || form.gender}
              </span>
            </div>

            <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
              {GENDER_OPTIONS.map((gender) => {
                const isSelected = form.gender === gender.value;
                return (
                  <button
                    key={gender.value}
                    type="button"
                    onClick={() => setForm({ ...form, gender: gender.value })}
                    className={`flex items-center sm:flex-col sm:items-start gap-3.5 p-4 rounded-2xl border transition-all cursor-pointer text-left ${
                      isSelected
                        ? "border-black bg-[#171717] text-white shadow-md ring-1 ring-black"
                        : "border-gray-200 bg-[#fbfbf9] text-gray-900 hover:border-gray-400 hover:bg-white"
                    }`}
                  >
                    <span className="text-2xl sm:text-3xl">{gender.icon}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs sm:text-sm font-bold">{gender.label}</span>
                        {isSelected && (
                          <span className="inline-flex h-2 w-2 rounded-full bg-emerald-400" />
                        )}
                      </div>
                      <p
                        className={`text-[11px] mt-0.5 line-clamp-1 ${
                          isSelected ? "text-gray-300" : "text-gray-500"
                        }`}
                      >
                        {gender.desc}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Section 3: Body Proportions */}
          <div>
            <h2 className="text-sm font-bold uppercase tracking-wider text-gray-900 border-b border-[#eceef0] pb-2.5">
              3. Body Proportions
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
                  <span>Saving Profile...</span>
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

      </div>
    </main>
  );
}