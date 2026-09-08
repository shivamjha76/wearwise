"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type Product = {
    id: number;
    name: string;
    category: string;
    color: string;
    fit: string;
    price: number;
    brand: string;
    image: string;
};

type Recommendation = {
    category: string;
    color: string;
    score: number;
    new_outfit_combinations: number;
    reason: string;
    products: Product[];
};

export default function NextPurchasePage() {
    const router = useRouter();

    const [recommendations, setRecommendations] = useState<
        Recommendation[]
    >([]);

    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const userId = localStorage.getItem("wearwise_user_id");

        if (!userId) {
            router.push("/profile");
            return;
        }

        const fetchRecommendations = async () => {
            try {
                const response = await fetch(
                    `http://localhost:8000/wardrobe/${userId}/next-purchase`
                );

                console.log("USER ID:", userId);
                console.log("API URL:", response.url);
                console.log("STATUS:", response.status);

                if (!response.ok) {
                    throw new Error("Failed to fetch recommendations");
                }
                const responseText = await response.text();

                console.log("API RESPONSE:", responseText);

                if (!response.ok) {
                    throw new Error(`API Error ${response.status}: ${responseText}`);
                }

                const data = JSON.parse(responseText);

                console.log("NEXT PURCHASE API RESPONSE:", data);
                console.log("RECOMMENDATIONS:", data.recommendations);

                setRecommendations(data.recommendations || []);
            } catch (error) {
                console.error(error);
            } finally {
                setLoading(false);
            }
        };

        fetchRecommendations();
    }, [router]);

    if (loading) {
        return (
            <main className="flex min-h-screen items-center justify-center bg-gray-50">
                <p>Analyzing your wardrobe...</p>
            </main>
        );
    }

    return (
        <main className="min-h-screen bg-gray-50 px-6 py-10">
            <div className="mx-auto max-w-6xl">

                {/* Header */}
                <div className="text-center">
                    <p className="text-sm font-semibold uppercase tracking-wider text-gray-500">
                        WearWise
                    </p>

                    <h1 className="mt-3 text-4xl font-bold text-gray-900">
                        Complete Your Wardrobe 🛍️
                    </h1>

                    <p className="mx-auto mt-3 max-w-2xl text-gray-600">
                        We analyzed your existing wardrobe and found what could
                        add the most value to your style.
                    </p>
                </div>

                {/* Recommendations */}
                {recommendations.length === 0 ? (
                    <div className="mt-10 rounded-2xl bg-white p-10 text-center shadow">
                        <p className="text-xl font-semibold">
                            Your wardrobe is already looking good.
                        </p>

                        <p className="mt-2 text-gray-500">
                            Add more clothing items to discover new recommendations.
                        </p>
                    </div>
                ) : (
                    <div className="mt-10 space-y-8">

                        {recommendations.map((recommendation, index) => (
                            <div
                                key={recommendation.color}
                                className="rounded-2xl bg-white p-6 shadow"
                            >

                                {/* Recommendation header */}
                                <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">

                                    <div>
                                        <p className="text-sm font-semibold uppercase tracking-wider text-gray-400">
                                            Recommendation #{index + 1}
                                        </p>

                                        <h2 className="mt-1 text-3xl font-bold capitalize">
                                            {recommendation.color} {recommendation.category}
                                        </h2>

                                        <p className="mt-2 text-gray-600">
                                            {recommendation.reason}
                                        </p>
                                    </div>

                                    <div className="rounded-xl bg-gray-100 px-5 py-3 text-center">
                                        <p className="text-2xl font-bold">
                                            {recommendation.new_outfit_combinations}
                                        </p>

                                        <p className="text-xs text-gray-500">
                                            New combinations
                                        </p>
                                    </div>

                                </div>

                                {/* Products */}
                                <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">

                                    {recommendation.products.map((product) => (
                                        <div
                                            key={product.id}
                                            className="overflow-hidden rounded-xl border"
                                        >

                                            <div className="flex h-52 items-center justify-center bg-gray-100">
                                                <span className="text-7xl">👕</span>
                                            </div>

                                            <div className="p-4">

                                                <p className="text-xs uppercase tracking-wider text-gray-400">
                                                    {product.brand}
                                                </p>

                                                <h3 className="mt-1 text-lg font-semibold">
                                                    {product.name}
                                                </h3>

                                                <p className="mt-1 text-sm capitalize text-gray-500">
                                                    {product.fit} fit · {product.color}
                                                </p>

                                                <div className="mt-4 flex items-center justify-between">
                                                    <p className="text-xl font-bold">
                                                        ₹{product.price}
                                                    </p>

                                                    <button
                                                        onClick={() =>
                                                            alert(
                                                                "Product shopping link will be connected here."
                                                            )
                                                        }
                                                        className="rounded-lg bg-black px-4 py-2 text-sm font-semibold text-white hover:bg-gray-800"
                                                    >
                                                        View Product
                                                    </button>
                                                </div>

                                            </div>
                                        </div>
                                    ))}

                                </div>

                            </div>
                        ))}

                    </div>
                )}

                {/* Back */}
                <button
                    onClick={() => router.push("/wardrobe")}
                    className="mt-8 w-full rounded-xl border border-gray-300 bg-white px-6 py-4 font-semibold hover:bg-gray-100"
                >
                    ← Back to My Wardrobe
                </button>

            </div>
        </main>
    );
}