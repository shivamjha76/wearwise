"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { API_BASE_URL } from "@/lib/api";
import { getStoredUser, getAuthHeaders } from "@/lib/auth";

export default function ProfilePage() {
    const router = useRouter();

    const [form, setForm] = useState({
        name: "",
        email: "",
        height: "",
        weight: "",
        skin_tone: "medium",
        style_preference: "casual",
        fit_preference: "regular",
        budget: "",
    });

    const [loading, setLoading] = useState(false);
    const [fetchingProfile, setFetchingProfile] = useState(true);

    useEffect(() => {
        const user = getStoredUser();
        if (!user) {
            router.push("/login");
            return;
        }

        setForm((prev) => ({
            ...prev,
            name: user.name,
            email: user.email,
        }));

        const loadProfile = async () => {
            try {
                const res = await fetch(`${API_BASE_URL}/users/${user.id}/style-profile`, {
                    headers: getAuthHeaders(),
                });
                if (res.ok) {
                    const data = await res.json();
                    setForm((prev) => ({
                        ...prev,
                        height: String(data.height ?? ""),
                        weight: String(data.weight ?? ""),
                        skin_tone: data.skin_tone || prev.skin_tone,
                        style_preference: data.style_preference || prev.style_preference,
                        fit_preference: data.fit_preference || prev.fit_preference,
                        budget: String(data.budget ?? ""),
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

    const handleChange = (
        e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
    ) => {
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
            const profileResponse = await fetch(
                `${API_BASE_URL}/users/${user.id}/style-profile`,
                {
                    method: "POST",
                    headers: getAuthHeaders(),
                    body: JSON.stringify({
                        height: Number(form.height),
                        weight: Number(form.weight),
                        skin_tone: form.skin_tone,
                        style_preference: form.style_preference,
                        fit_preference: form.fit_preference,
                        budget: Number(form.budget),
                    }),
                }
            );

            if (!profileResponse.ok) {
                throw new Error("Failed to save style profile");
            }

            router.push("/wardrobe");
        } catch (error) {
            console.error(error);
            alert("Something went wrong saving your style profile.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <main className="min-h-screen bg-[#f7f7f5] px-5 py-12">
            <div className="mx-auto max-w-3xl">

                {/* Header */}
                <div className="mb-10">
                    <p className="text-sm font-semibold uppercase tracking-[0.2em] text-gray-500">
                        WearWise
                    </p>

                    <h1 className="mt-3 text-4xl font-bold tracking-tight text-gray-950 sm:text-5xl">
                        Build your style profile.
                    </h1>

                    <p className="mt-4 max-w-xl text-gray-600">
                        Tell us a little about yourself so WearWise can make
                        recommendations that actually fit your style.
                    </p>
                </div>

                {/* Form */}
                <form
                    onSubmit={handleSubmit}
                    className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm sm:p-8"
                >

                    <div className="grid gap-6 sm:grid-cols-2">

                        {/* Name */}
                        <div>
                            <label className="mb-2 block text-sm font-medium">
                                Name
                            </label>

                            <input
                                name="name"
                                placeholder="Your name"
                                value={form.name}
                                onChange={handleChange}
                                required
                                className="w-full rounded-xl border border-gray-200 bg-gray-50 p-3.5 outline-none transition focus:border-black focus:bg-white"
                            />
                        </div>

                        {/* Email */}
                        <div>
                            <label className="mb-2 block text-sm font-medium">
                                Email
                            </label>

                            <input
                                name="email"
                                type="email"
                                placeholder="you@example.com"
                                value={form.email}
                                onChange={handleChange}
                                required
                                className="w-full rounded-xl border border-gray-200 bg-gray-50 p-3.5 outline-none transition focus:border-black focus:bg-white"
                            />
                        </div>

                        {/* Height */}
                        <div>
                            <label className="mb-2 block text-sm font-medium">
                                Height
                            </label>

                            <div className="relative">
                                <input
                                    name="height"
                                    type="number"
                                    placeholder="175"
                                    value={form.height}
                                    onChange={handleChange}
                                    required
                                    className="w-full rounded-xl border border-gray-200 bg-gray-50 p-3.5 pr-14 outline-none transition focus:border-black focus:bg-white"
                                />

                                <span className="absolute right-4 top-3.5 text-sm text-gray-400">
                                    cm
                                </span>
                            </div>
                        </div>

                        {/* Weight */}
                        <div>
                            <label className="mb-2 block text-sm font-medium">
                                Weight
                            </label>

                            <div className="relative">
                                <input
                                    name="weight"
                                    type="number"
                                    placeholder="65"
                                    value={form.weight}
                                    onChange={handleChange}
                                    required
                                    className="w-full rounded-xl border border-gray-200 bg-gray-50 p-3.5 pr-14 outline-none transition focus:border-black focus:bg-white"
                                />

                                <span className="absolute right-4 top-3.5 text-sm text-gray-400">
                                    kg
                                </span>
                            </div>
                        </div>

                        {/* Skin tone */}
                        <div>
                            <label className="mb-2 block text-sm font-medium">
                                Skin tone
                            </label>

                            <select
                                name="skin_tone"
                                value={form.skin_tone}
                                onChange={handleChange}
                                className="w-full rounded-xl border border-gray-200 bg-gray-50 p-3.5 outline-none focus:border-black"
                            >
                                <option value="fair">Fair</option>
                                <option value="light">Light</option>
                                <option value="medium">Medium</option>
                                <option value="deep">Deep</option>
                            </select>
                        </div>

                        {/* Budget */}
                        <div>
                            <label className="mb-2 block text-sm font-medium">
                                Fashion budget
                            </label>

                            <div className="relative">
                                <span className="absolute left-4 top-3.5 text-gray-400">
                                    ₹
                                </span>

                                <input
                                    name="budget"
                                    type="number"
                                    placeholder="5000"
                                    value={form.budget}
                                    onChange={handleChange}
                                    required
                                    className="w-full rounded-xl border border-gray-200 bg-gray-50 p-3.5 pl-8 outline-none focus:border-black"
                                />
                            </div>
                        </div>

                    </div>

                    {/* Preferences */}
                    <div className="mt-8 border-t border-gray-100 pt-8">

                        <h2 className="text-xl font-semibold">
                            Your preferences
                        </h2>

                        <p className="mt-1 text-sm text-gray-500">
                            These help WearWise understand your personal style.
                        </p>

                        <div className="mt-6 grid gap-6 sm:grid-cols-2">

                            <div>
                                <label className="mb-2 block text-sm font-medium">
                                    Preferred style
                                </label>

                                <select
                                    name="style_preference"
                                    value={form.style_preference}
                                    onChange={handleChange}
                                    className="w-full rounded-xl border border-gray-200 bg-gray-50 p-3.5 outline-none focus:border-black"
                                >
                                    <option value="casual">Casual</option>
                                    <option value="streetwear">Streetwear</option>
                                    <option value="formal">Formal</option>
                                    <option value="minimal">Minimal</option>
                                </select>
                            </div>

                            <div>
                                <label className="mb-2 block text-sm font-medium">
                                    Preferred fit
                                </label>

                                <select
                                    name="fit_preference"
                                    value={form.fit_preference}
                                    onChange={handleChange}
                                    className="w-full rounded-xl border border-gray-200 bg-gray-50 p-3.5 outline-none focus:border-black"
                                >
                                    <option value="regular">Regular</option>
                                    <option value="oversized">Oversized</option>
                                    <option value="relaxed">Relaxed</option>
                                    <option value="slim">Slim</option>
                                </select>
                            </div>

                        </div>
                    </div>

                    {/* Submit */}
                    <button
                        type="submit"
                        disabled={loading}
                        className="mt-8 w-full rounded-xl bg-black px-6 py-4 font-semibold text-white transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        {loading ? "Building Your Profile..." : "Continue to My Wardrobe →"}
                    </button>

                </form>

            </div>
        </main>
    );
}