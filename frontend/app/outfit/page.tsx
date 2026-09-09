"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type Recommendation = {
    top: number;
    bottom: number;
    shoes: number;
    score: number;
    top_id?: number;
    bottom_id?: number;
    shoes_id?: number;
};

type OutfitData = {
    user_id: number;
    occasion: string;
    recommendation?: Recommendation;
    recommendations?: Recommendation[];
    explanation?: string;
};

type WardrobeItem = {
    id: number;
    category: string;
    color: string;
    fit: string | null;
    pattern: string | null;
    style: string | null;
    image_url: string | null;
};

export default function OutfitPage() {
    const router = useRouter();

    const [data, setData] = useState<OutfitData | null>(null);
    const [items, setItems] = useState<WardrobeItem[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const savedRecommendation = localStorage.getItem(
            "wearwise_recommendation"
        );

        const userId = localStorage.getItem("wearwise_user_id");

        if (!savedRecommendation || !userId) {
            router.push("/style");
            return;
        }

        const recommendationData = JSON.parse(savedRecommendation) as OutfitData;
        setData(recommendationData);

        const fetchWardrobe = async () => {
            try {
                const response = await fetch(
                    `http://127.0.0.1:8000/wardrobe/${userId}`
                );

                if (!response.ok) {
                    throw new Error("Failed to fetch wardrobe");
                }

                const wardrobe = await response.json();
                setItems(wardrobe);
            } catch (error) {
                console.error(error);
            } finally {
                setLoading(false);
            }
        };

        fetchWardrobe();
    }, [router]);

    const recommendation =
        data?.recommendation ??
        data?.recommendations?.[0] ??
        null;

    const explanation = data?.explanation ?? "AI explanation unavailable";

    if (loading || !data || !recommendation) {
        return (
            <main className="flex min-h-screen items-center justify-center bg-gray-50">
                <p>Creating your outfit...</p>
            </main>
        );
    }

    const getItem = (id: number | undefined) => {
        if (id === undefined) return undefined;
        return items.find((item) => item.id === id);
    };

    const topId = recommendation.top_id ?? recommendation.top;
    const bottomId = recommendation.bottom_id ?? recommendation.bottom;
    const shoesId = recommendation.shoes_id ?? recommendation.shoes;

    const top = getItem(topId);
    const bottom = getItem(bottomId);
    const shoes = getItem(shoesId);

    return (
        <main className="min-h-screen bg-gray-50 px-6 py-10">
            <div className="mx-auto max-w-5xl">

                <div className="text-center">
                    <p className="text-sm font-semibold uppercase tracking-wider text-gray-500">
                        WearWise
                    </p>

                    <h1 className="mt-3 text-4xl font-bold text-gray-900">
                        Your Recommended Look ✨
                    </h1>

                    <p className="mt-2 capitalize text-gray-600">
                        Perfect for your {data.occasion}
                    </p>
                </div>

                {/* Outfit */}
                <div className="mt-10 grid gap-5 md:grid-cols-3">

                    <ClothingCard
                        emoji="👕"
                        title="Top"
                        item={top}
                    />

                    <ClothingCard
                        emoji="👖"
                        title="Bottom"
                        item={bottom}
                    />

                    <ClothingCard
                        emoji="👟"
                        title="Shoes"
                        item={shoes}
                    />

                </div>

                {/* Score */}
                <div className="mt-8 rounded-2xl bg-white p-8 text-center shadow">
                    <p className="text-sm font-medium uppercase tracking-wider text-gray-500">
                        Compatibility Score
                    </p>

                    <p className="mt-2 text-6xl font-bold text-gray-900">
                        {recommendation.score}
                        <span className="text-2xl text-gray-400">/100</span>
                    </p>

                    <div className="mx-auto mt-5 h-3 max-w-md overflow-hidden rounded-full bg-gray-200">
                        <div
                            className="h-full rounded-full bg-black"
                            style={{
                                width: `${recommendation.score}%`,
                            }}
                        />
                    </div>
                </div>

                {/* AI Explanation */}
                <div className="mt-6 rounded-2xl bg-black p-8 text-white">
                    <p className="text-sm font-semibold uppercase tracking-wider text-gray-400">
                        AI Style Assistant
                    </p>

                    <h2 className="mt-2 text-2xl font-bold">
                        Why this outfit?
                    </h2>

                    <p className="mt-4 leading-7 text-gray-300">
                        {explanation}
                    </p>
                </div>

                {/* Actions */}
                <div className="mt-8 grid gap-4 sm:grid-cols-2">

                    <button
                        onClick={() => router.push("/style")}
                        className="rounded-xl border border-gray-300 bg-white px-6 py-4 font-semibold hover:bg-gray-100"
                    >
                        ← Try Another Occasion
                    </button>

                    <button
                        onClick={() => router.push("/wardrobe/next-purchase")}
                        className="rounded-xl bg-black px-6 py-4 font-semibold text-white hover:bg-gray-800"
                    >
                        Complete My Wardrobe →
                    </button>

                </div>

            </div>
        </main>
    );
}


function ClothingCard({
    emoji,
    title,
    item,
}: {
    emoji: string;
    title: string;
    item: WardrobeItem | undefined;
}) {
    if (!item) {
        return (
            <div className="rounded-2xl bg-white p-6 text-center shadow">
                <div className="text-5xl">{emoji}</div>
                <h2 className="mt-4 text-xl font-semibold">{title}</h2>
                <p className="mt-2 text-gray-500">
                    Item unavailable
                </p>
            </div>
        );
    }

    return (
        <div className="rounded-2xl bg-white p-6 text-center shadow">
            <div className="mb-4 overflow-hidden rounded-xl bg-gray-100">
                {item.image_url ? (
                    <img
                        src={item.image_url}
                        alt={`${item.color} ${item.category}`}
                        className="h-56 w-full object-cover"
                    />
                ) : (
                    <div className="flex h-56 items-center justify-center text-6xl">
                        {emoji}
                    </div>
                )}
            </div>

            <p className="text-sm uppercase tracking-wider text-gray-400">
                {title}
            </p>

            <h2 className="mt-2 text-2xl font-bold capitalize">
                {item.color} {item.category}
            </h2>

            <p className="mt-2 capitalize text-gray-500">
                {item.fit} · {item.style}
            </p>
        </div>
    );
}
