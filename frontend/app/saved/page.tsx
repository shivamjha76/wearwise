"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { API_BASE_URL } from "@/lib/api";
import { getStoredUser, getAuthHeaders } from "@/lib/auth";

type WardrobePiece = {
    id: number;
    category: string;
    color: string;
    fit: string | null;
    pattern: string | null;
    style: string | null;
    image_url: string | null;
};

type SavedOutfit = {
    id: number;
    user_id: number;
    top_id: number;
    bottom_id: number;
    shoes_id: number;
    occasion: string;
    style_vibe: string | null;
    score: number | null;
    explanation: string | null;
    created_at: string;
    top?: WardrobePiece | null;
    bottom?: WardrobePiece | null;
    shoes?: WardrobePiece | null;
};

export default function SavedOutfitsPage() {
    const router = useRouter();
    const [outfits, setOutfits] = useState<SavedOutfit[]>([]);
    const [loading, setLoading] = useState(true);
    const [deletingId, setDeletingId] = useState<number | null>(null);

    const fetchSavedOutfits = async (userId: number) => {
        try {
            const res = await fetch(`${API_BASE_URL}/outfits/${userId}/saved`, {
                headers: getAuthHeaders(),
            });

            if (!res.ok) {
                throw new Error("Failed to load saved outfits");
            }

            const data = await res.json();
            setOutfits(data);
        } catch (err) {
            console.error(err);
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
        fetchSavedOutfits(user.id);
    }, [router]);

    const handleDelete = async (outfitId: number) => {
        if (!confirm("Are you sure you want to remove this look from your lookbook?")) {
            return;
        }

        setDeletingId(outfitId);
        try {
            const res = await fetch(`${API_BASE_URL}/outfits/saved/${outfitId}`, {
                method: "DELETE",
                headers: getAuthHeaders(),
            });

            if (!res.ok) {
                throw new Error("Failed to delete outfit");
            }

            setOutfits((prev) => prev.filter((o) => o.id !== outfitId));
        } catch (err) {
            console.error(err);
            alert("Could not remove this outfit. Please try again.");
        } finally {
            setDeletingId(null);
        }
    };

    if (loading) {
        return (
            <main className="flex min-h-[calc(100vh-73px)] items-center justify-center bg-[#f7f7f5] px-6">
                <div className="text-center">
                    <p className="text-sm font-bold uppercase tracking-[0.18em] text-[#45546a]">WearWise</p>
                    <div className="mx-auto mt-5 h-9 w-9 animate-spin rounded-full border-2 border-gray-200 border-t-black" />
                    <p className="mt-5 text-base font-medium text-gray-700">Loading your lookbook...</p>
                </div>
            </main>
        );
    }

    return (
        <main className="min-h-[calc(100vh-73px)] bg-[#f7f7f5] px-5 py-10 sm:px-8">
            <div className="mx-auto max-w-6xl">
                {/* Header */}
                <div className="mb-10 flex flex-col justify-between gap-4 border-b border-gray-200 pb-8 sm:flex-row sm:items-end">
                    <div>
                        <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#45546a]">
                            Personal Style System
                        </p>
                        <h1 className="mt-2 text-3xl font-bold tracking-tight text-gray-950 sm:text-4xl">
                            Saved Looks
                        </h1>
                        <p className="mt-2 text-sm text-gray-600">
                            Your curated outfit combinations saved from WearWise recommendations.
                        </p>
                    </div>

                    <div className="flex items-center gap-3">
                        <span className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-gray-700 shadow-sm border border-gray-100">
                            {outfits.length} {outfits.length === 1 ? "saved look" : "saved looks"}
                        </span>
                        <Link
                            href="/style"
                            className="rounded-xl bg-black px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-gray-800"
                        >
                            + Style New Look
                        </Link>
                    </div>
                </div>

                {/* Empty State */}
                {outfits.length === 0 ? (
                    <div className="rounded-3xl border border-dashed border-gray-300 bg-white p-12 text-center shadow-sm sm:p-16">
                        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-gray-100 text-3xl text-gray-400">
                            ★
                        </div>
                        <h2 className="mt-5 text-xl font-bold text-gray-900">Your lookbook is empty</h2>
                        <p className="mx-auto mt-2 max-w-md text-sm text-gray-500">
                            When you style an outfit you love, click &quot;Save Outfit&quot; to keep it handy in your personal lookbook.
                        </p>
                        <div className="mt-6">
                            <Link
                                href="/style"
                                className="inline-flex rounded-xl bg-black px-6 py-3.5 text-sm font-semibold text-white transition hover:bg-gray-800"
                            >
                                Get Styled Now →
                            </Link>
                        </div>
                    </div>
                ) : (
                    /* Outfits Grid */
                    <div className="grid gap-8 lg:grid-cols-2">
                        {outfits.map((outfit) => (
                            <div
                                key={outfit.id}
                                className="flex flex-col justify-between rounded-3xl border border-gray-200 bg-white p-6 shadow-sm transition hover:shadow-md"
                            >
                                <div>
                                    {/* Top Metadata row */}
                                    <div className="flex items-center justify-between border-b border-gray-100 pb-4">
                                        <div className="flex flex-wrap items-center gap-2">
                                            <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-bold uppercase tracking-wider text-gray-800">
                                                {outfit.occasion}
                                            </span>
                                            {outfit.style_vibe && (
                                                <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold capitalize text-blue-700">
                                                    {outfit.style_vibe}
                                                </span>
                                            )}
                                        </div>

                                        {outfit.score && (
                                            <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-bold text-amber-800 border border-amber-200/50">
                                                ★ {outfit.score}% Match
                                            </span>
                                        )}
                                    </div>

                                    {/* Outfit Pieces Grid */}
                                    <div className="mt-5 grid grid-cols-3 gap-3">
                                        <PieceThumbnail
                                            label="Top"
                                            item={outfit.top}
                                            fallbackEmoji="👕"
                                        />
                                        <PieceThumbnail
                                            label="Bottom"
                                            item={outfit.bottom}
                                            fallbackEmoji="👖"
                                        />
                                        <PieceThumbnail
                                            label="Shoes"
                                            item={outfit.shoes}
                                            fallbackEmoji="👟"
                                        />
                                    </div>

                                    {/* Explanation */}
                                    {outfit.explanation && (
                                        <div className="mt-5 rounded-2xl bg-gray-50 p-4 text-xs leading-relaxed text-gray-600 border border-gray-100">
                                            <span className="font-semibold text-gray-900 block mb-1">Stylist Rationale:</span>
                                            {outfit.explanation}
                                        </div>
                                    )}
                                </div>

                                {/* Footer row */}
                                <div className="mt-6 flex items-center justify-between border-t border-gray-100 pt-4 text-xs text-gray-500">
                                    <span>
                                        Saved {new Date(outfit.created_at).toLocaleDateString(undefined, {
                                            month: "short",
                                            day: "numeric",
                                            year: "numeric"
                                        })}
                                    </span>

                                    <button
                                        onClick={() => handleDelete(outfit.id)}
                                        disabled={deletingId === outfit.id}
                                        className="font-medium text-red-600 hover:text-red-800 transition disabled:opacity-50"
                                    >
                                        {deletingId === outfit.id ? "Removing..." : "Remove Look"}
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </main>
    );
}

function PieceThumbnail({
    label,
    item,
    fallbackEmoji,
}: {
    label: string;
    item?: WardrobePiece | null;
    fallbackEmoji: string;
}) {
    if (!item) {
        return (
            <div className="rounded-2xl border border-gray-100 bg-gray-50 p-3 text-center">
                <div className="text-2xl">{fallbackEmoji}</div>
                <p className="mt-1 text-[11px] font-bold text-gray-400">{label}</p>
                <p className="text-[11px] text-gray-400">Unavailable</p>
            </div>
        );
    }

    return (
        <div className="rounded-2xl border border-gray-100 bg-gray-50 p-3 text-center">
            {item.image_url ? (
                <img
                    src={item.image_url}
                    alt={item.category}
                    className="mx-auto h-20 w-full rounded-xl object-cover"
                />
            ) : (
                <div className="flex h-20 items-center justify-center text-3xl">
                    {fallbackEmoji}
                </div>
            )}
            <p className="mt-2 text-[10px] font-bold uppercase tracking-wider text-gray-400">
                {label}
            </p>
            <p className="truncate text-xs font-semibold text-gray-900 capitalize">
                {item.color} {item.category}
            </p>
        </div>
    );
}
