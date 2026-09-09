"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

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

type Recommendation = {
    top_id: number;
    bottom_id: number;
    shoes_id: number;
    score: number;
};

type OutfitResponse = {
    user_id: number;
    occasion: string;
    recommendation: Recommendation;
    explanation?: string;
};

const occasions = [
    {
        value: "college",
        label: "College",
        icon: "▣",
    },
    {
        value: "casual",
        label: "Casual",
        icon: "□",
    },
    {
        value: "party",
        label: "Party",
        icon: "✦",
    },
    {
        value: "interview",
        label: "Interview",
        icon: "▤",
    },
    {
        value: "date",
        label: "Date",
        icon: "♡",
    },
];

const weatherOptions = [
    {
        value: "warm",
        label: "Warm",
        icon: "☼",
    },
    {
        value: "cool",
        label: "Cool",
        icon: "◌",
    },
    {
        value: "cold",
        label: "Cold",
        icon: "❄",
    },
];

const styleOptions = [
    {
        value: "minimal",
        label: "Clean & Minimal",
        icon: "♧",
    },
    {
        value: "casual",
        label: "Casual",
        icon: "□",
    },
    {
        value: "streetwear",
        label: "Streetwear",
        icon: "◇",
    },
    {
        value: "formal",
        label: "Smart & Formal",
        icon: "✦",
    },
];

function getImage(item: WardrobeItem) {
    if (item.image_url) {
        return item.image_url;
    }

    const text = `${item.color}+${item.category}`;

    return `https://placehold.co/600x700/f7f7f5/111111?text=${encodeURIComponent(
        text
    )}`;
}

function getItemType(category: string) {
    const value = category.toLowerCase();

    if (
        value === "jeans" ||
        value === "pants" ||
        value === "trousers" ||
        value === "bottom"
    ) {
        return "Bottom";
    }

    if (value === "shoes" || value === "sneakers") {
        return "Footwear";
    }

    return "Top";
}

function ClothingCard({
    item,
    title,
}: {
    item: WardrobeItem;
    title: string;
}) {
    return (
        <div className="min-w-0">
            <div className="aspect-[4/4.7] overflow-hidden rounded-xl bg-[#f6f6f4]">
                <img
                    src={getImage(item)}
                    alt={`${item.color} ${item.category}`}
                    className="h-full w-full object-cover"
                />
            </div>

            <h3 className="mt-3 truncate text-[15px] font-semibold text-gray-950">
                {item.color} {item.category}
            </h3>

            <div className="mt-2 flex flex-wrap gap-1.5">
                <span className="rounded-full bg-[#f0f1f2] px-2.5 py-1 text-[12px] text-gray-700">
                    {getItemType(item.category)}
                </span>

                {item.style && (
                    <span className="rounded-full bg-[#f0f1f2] px-2.5 py-1 text-[12px] capitalize text-gray-700">
                        {item.style}
                    </span>
                )}

                {item.fit && (
                    <span className="rounded-full bg-[#f0f1f2] px-2.5 py-1 text-[12px] capitalize text-gray-700">
                        {item.fit}
                    </span>
                )}
            </div>
        </div>
    );
}

export default function StylePage() {
    const router = useRouter();

    const [occasion, setOccasion] = useState("casual");
    const [weather, setWeather] = useState("warm");
    const [styleVibe, setStyleVibe] = useState("minimal");

    const [outfit, setOutfit] = useState<OutfitResponse | null>(null);
    const [wardrobe, setWardrobe] = useState<WardrobeItem[]>([]);

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const generateOutfit = async () => {
        const userId = localStorage.getItem("wearwise_user_id");

        if (!userId) {
            router.push("/profile");
            return;
        }

        setLoading(true);
        setError("");

        try {
            const [outfitResponse, wardrobeResponse] = await Promise.all([
                fetch(
                    `http://127.0.0.1:8000/outfits/${userId}?occasion=${occasion}&style_vibe=${styleVibe}`,
                    {
                        method: "POST",
                    }
                ),

                fetch(`http://127.0.0.1:8000/wardrobe/${userId}`),
            ]);

            if (!outfitResponse.ok) {
                throw new Error("Could not generate outfit");
            }

            if (!wardrobeResponse.ok) {
                throw new Error("Could not load wardrobe");
            }

            const outfitData = await outfitResponse.json();
            const wardrobeData = await wardrobeResponse.json();

            setOutfit(outfitData);
            setWardrobe(wardrobeData);

            localStorage.setItem(
                "wearwise_recommendation",
                JSON.stringify(outfitData)
            );

            localStorage.setItem(
                "wearwise_style_preferences",
                JSON.stringify({
                    weather,
                    styleVibe,
                })
            );
        } catch (err) {
            console.error(err);
            setError("Something went wrong while creating your outfit.");
        } finally {
            setLoading(false);
        }
    };

    const getWardrobeItem = (id: number) => {
        return wardrobe.find((item) => item.id === id);
    };

    const top = outfit?.recommendation
        ? getWardrobeItem(outfit.recommendation.top_id)
        : undefined;

    const bottom = outfit?.recommendation
        ? getWardrobeItem(outfit.recommendation.bottom_id)
        : undefined;

    const shoes = outfit?.recommendation
        ? getWardrobeItem(outfit.recommendation.shoes_id)
        : undefined;

    return (
        <main className="min-h-screen bg-white">
            <div className="mx-auto max-w-[1320px] px-6 py-10 lg:px-8">

                {/* PAGE HEADER */}
                <div className="mb-7">
                    <p className="text-[14px] font-bold uppercase tracking-[0.16em] text-[#45546a]">
                        Style Me
                    </p>

                    <h1 className="mt-3 text-[46px] font-bold leading-[1.05] tracking-[-0.04em] text-black sm:text-[52px]">
                        Get Your Outfit
                    </h1>

                    <p className="mt-3 text-[18px] text-[#45546a]">
                        Tell us the occasion and we&apos;ll create a stylish outfit from
                        your wardrobe.
                    </p>
                </div>

                {/* FILTER ROW */}
                <div className="grid gap-5 lg:grid-cols-[1fr_1fr_1fr_1.05fr]">

                    {/* Occasion */}
                    <div>
                        <label className="mb-2 block text-[15px] font-semibold text-black">
                            Occasion
                        </label>

                        <div className="relative">
                            <span className="pointer-events-none absolute left-5 top-1/2 -translate-y-1/2 text-[22px] text-black">
                                {occasions.find((x) => x.value === occasion)?.icon}
                            </span>

                            <select
                                value={occasion}
                                onChange={(e) => setOccasion(e.target.value)}
                                className="h-[52px] w-full appearance-none rounded-xl border border-[#d9dde3] bg-white pl-14 pr-10 text-[16px] font-medium text-black outline-none transition focus:border-black"
                            >
                                {occasions.map((item) => (
                                    <option key={item.value} value={item.value}>
                                        {item.label}
                                    </option>
                                ))}
                            </select>

                            <span className="pointer-events-none absolute right-5 top-1/2 -translate-y-1/2 text-gray-600">
                                ⌄
                            </span>
                        </div>
                    </div>

                    {/* Weather */}
                    <div>
                        <label className="mb-2 block text-[15px] font-semibold text-black">
                            Weather
                        </label>

                        <div className="relative">
                            <span className="pointer-events-none absolute left-5 top-1/2 -translate-y-1/2 text-[25px] text-black">
                                {weatherOptions.find((x) => x.value === weather)?.icon}
                            </span>

                            <select
                                value={weather}
                                onChange={(e) => setWeather(e.target.value)}
                                className="h-[52px] w-full appearance-none rounded-xl border border-[#d9dde3] bg-white pl-14 pr-10 text-[16px] font-medium text-black outline-none transition focus:border-black"
                            >
                                {weatherOptions.map((item) => (
                                    <option key={item.value} value={item.value}>
                                        {item.label}
                                    </option>
                                ))}
                            </select>

                            <span className="pointer-events-none absolute right-5 top-1/2 -translate-y-1/2 text-gray-600">
                                ⌄
                            </span>
                        </div>
                    </div>

                    {/* Style */}
                    <div>
                        <label className="mb-2 block text-[15px] font-semibold text-black">
                            Style Vibe{" "}
                            <span className="font-normal text-gray-500">
                                (Optional)
                            </span>
                        </label>

                        <div className="relative">
                            <span className="pointer-events-none absolute left-5 top-1/2 -translate-y-1/2 text-[23px] text-black">
                                {styleOptions.find((x) => x.value === styleVibe)?.icon}
                            </span>

                            <select
                                value={styleVibe}
                                onChange={(e) => setStyleVibe(e.target.value)}
                                className="h-[52px] w-full appearance-none rounded-xl border border-[#d9dde3] bg-white pl-14 pr-10 text-[16px] font-medium text-black outline-none transition focus:border-black"
                            >
                                {styleOptions.map((item) => (
                                    <option key={item.value} value={item.value}>
                                        {item.label}
                                    </option>
                                ))}
                            </select>

                            <span className="pointer-events-none absolute right-5 top-1/2 -translate-y-1/2 text-gray-600">
                                ⌄
                            </span>
                        </div>
                    </div>

                    {/* Generate */}
                    <div className="flex items-end">
                        <button
                            onClick={generateOutfit}
                            disabled={loading}
                            className="h-[52px] w-full rounded-xl bg-[#171717] px-6 text-[16px] font-semibold text-white transition hover:bg-black disabled:cursor-not-allowed disabled:opacity-60"
                        >
                            {loading ? "Creating Your Outfit..." : "Generate Outfit  ✦"}
                        </button>
                    </div>
                </div>

                {/* ERROR */}
                {error && (
                    <div className="mt-5 rounded-xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700">
                        {error}
                    </div>
                )}

                {/* RESULT */}
                {outfit && top && bottom && shoes && (
                    <>
                        <div className="mt-7 grid gap-5 lg:grid-cols-[minmax(0,2.2fr)_minmax(320px,1fr)]">

                            {/* OUTFIT CARD */}
                            <section className="rounded-2xl border border-[#e4e5e7] bg-white p-6 shadow-[0_2px_12px_rgba(0,0,0,0.03)]">

                                <div className="flex items-start justify-between gap-4">
                                    <div>
                                        <h2 className="text-[27px] font-bold tracking-tight text-black">
                                            Your Outfit
                                        </h2>

                                        <p className="mt-1 text-[16px] text-[#45546a]">
                                            A clean, comfortable and versatile look for a{" "}
                                            {outfit.occasion} day.
                                        </p>
                                    </div>

                                    <div className="shrink-0 rounded-full bg-[#fff4d7] px-3.5 py-2 text-[13px] font-medium text-[#5d4a18]">
                                        ⭐ AI Recommended
                                    </div>
                                </div>

                                {/* CLOTHES */}
                                <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
                                    <ClothingCard item={top} title="Top" />
                                    <ClothingCard item={bottom} title="Bottom" />
                                    <ClothingCard item={shoes} title="Footwear" />
                                </div>

                            </section>

                            {/* WHY THIS WORKS */}
                            <section className="rounded-2xl border border-[#e4e5e7] bg-white p-6 shadow-[0_2px_12px_rgba(0,0,0,0.03)]">

                                <div className="flex items-center gap-3">
                                    <span className="text-[25px]">♧</span>

                                    <h2 className="text-[21px] font-bold text-black">
                                        Why this works?
                                    </h2>
                                </div>

                                <p className="mt-5 text-[16px] leading-7 text-[#45546a]">
                                    {outfit.explanation ||
                                        "This outfit balances your selected occasion, personal style and the items already available in your wardrobe."}
                                </p>

                                <div className="my-5 border-t border-[#e3e5e8]" />

                                <div className="space-y-5">

                                    <div className="flex gap-4">
                                        <span className="text-[24px]">◉</span>

                                        <div>
                                            <h3 className="font-semibold text-black">
                                                Color match
                                            </h3>

                                            <p className="mt-1 text-sm text-[#526075]">
                                                Colors that work well together
                                            </p>
                                        </div>
                                    </div>

                                    <div className="flex gap-4">
                                        <span className="text-[24px]">♧</span>

                                        <div>
                                            <h3 className="font-semibold text-black">
                                                Style match
                                            </h3>

                                            <p className="mt-1 text-sm text-[#526075]">
                                                Matches your style preference
                                            </p>
                                        </div>
                                    </div>

                                    <div className="flex gap-4">
                                        <span className="text-[24px]">☼</span>

                                        <div>
                                            <h3 className="font-semibold text-black">
                                                Weather friendly
                                            </h3>

                                            <p className="mt-1 text-sm text-[#526075]">
                                                Selected for your preferred weather
                                            </p>
                                        </div>
                                    </div>

                                    <div className="flex gap-4">
                                        <span className="text-[24px]">✓</span>

                                        <div>
                                            <h3 className="font-semibold text-black">
                                                From your wardrobe
                                            </h3>

                                            <p className="mt-1 text-sm text-[#526075]">
                                                Items are selected from your existing collection
                                            </p>
                                        </div>
                                    </div>

                                </div>
                            </section>
                        </div>

                        {/* ACTION BUTTONS */}
                        <div className="mt-6 grid gap-5 md:grid-cols-2">

                            <button
                                onClick={generateOutfit}
                                className="h-[72px] rounded-xl border border-[#cfd3d8] bg-white text-[16px] font-semibold text-black transition hover:bg-gray-50"
                            >
                                ⟳ &nbsp; Try Another Outfit
                            </button>

                            <button
                                onClick={() => router.push("/wardrobe/next-purchase")}
                                className="h-[72px] rounded-xl bg-[#171717] text-left text-white transition hover:bg-black"
                            >
                                <div className="flex items-center justify-center gap-4">
                                    <span className="text-[25px]">♧</span>

                                    <div>
                                        <p className="text-[16px] font-semibold">
                                            Complete My Wardrobe →
                                        </p>

                                        <p className="mt-1 text-sm text-gray-300">
                                            See what you&apos;re missing
                                        </p>
                                    </div>
                                </div>
                            </button>

                        </div>

                        {/* BOTTOM INFO */}
                        <div className="mt-6 flex flex-col gap-5 rounded-2xl bg-gradient-to-r from-[#f0f0ff] to-[#f8edfb] px-7 py-6 md:flex-row md:items-center md:justify-between">

                            <div className="flex items-center gap-5">
                                <div className="text-[35px]">🪄</div>

                                <div>
                                    <h3 className="text-[17px] font-bold text-black">
                                        Want more outfit ideas?
                                    </h3>

                                    <p className="mt-1 text-sm text-[#526075]">
                                        Add more items to your wardrobe and get even better
                                        recommendations.
                                    </p>
                                </div>
                            </div>

                            <button
                                onClick={() => router.push("/wardrobe")}
                                className="shrink-0 text-sm font-semibold text-black underline underline-offset-4"
                            >
                                Go to My Wardrobe →
                            </button>
                        </div>
                    </>
                )}

                {/* INITIAL STATE */}
                {!outfit && !loading && (
                    <div className="mt-7 rounded-2xl border border-[#e4e5e7] bg-white px-6 py-16 text-center">
                        <div className="text-5xl">✨</div>

                        <h2 className="mt-5 text-2xl font-bold text-black">
                            Ready to find your look?
                        </h2>

                        <p className="mx-auto mt-2 max-w-lg text-[#526075]">
                            Choose your occasion above and let WearWise create an
                            outfit using the clothes you already own.
                        </p>
                    </div>
                )}

            </div>
        </main>
    );
}