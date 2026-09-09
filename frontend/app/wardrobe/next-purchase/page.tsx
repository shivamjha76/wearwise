"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { API_BASE_URL } from "@/lib/api";
import { getStoredUser, getAuthHeaders } from "@/lib/auth";

type Product = { id: number; name: string; category: string; color: string; fit: string; price: number; brand: string; image: string };
type Recommendation = { category: string; color: string; score: number; new_outfit_combinations: number; reason: string; products: Product[] };

export default function NextPurchasePage() {
    const router = useRouter();
    const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);
    const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

    const fetchRecommendations = async () => {
        const user = getStoredUser();
        if (!user) {
            router.push("/login");
            return;
        }

        setLoading(true);
        setError(false);
        try {
            const response = await fetch(
                `${API_BASE_URL}/wardrobe/${user.id}/next-purchase`,
                {
                    headers: getAuthHeaders(),
                }
            );
            if (!response.ok) throw new Error("Failed to fetch recommendations");
            const data = await response.json();
            setRecommendations(data.recommendations || []);
        } catch (fetchError) {
            console.error(fetchError);
            setError(true);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        const requestTimer = window.setTimeout(fetchRecommendations, 0);

        return () => window.clearTimeout(requestTimer);
        // The user ID is read from local storage when this page loads.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [router]);

    if (loading) {
        return <main className="flex min-h-screen items-center justify-center bg-[#f7f7f5] px-6">
            <div className="text-center">
                <p className="text-sm font-bold uppercase tracking-[0.18em] text-[#45546a]">WearWise</p>
                <div className="mx-auto mt-5 h-9 w-9 animate-spin rounded-full border-2 border-gray-200 border-t-black" />
                <p className="mt-5 text-base font-medium text-gray-700">Analyzing your wardrobe...</p>
            </div>
        </main>;
    }

    return <main className="min-h-screen bg-[#f7f7f5] px-4 py-8 sm:px-6 sm:py-10">
        <div className="mx-auto max-w-6xl">
            <header className="max-w-3xl">
                <p className="text-[13px] font-bold uppercase tracking-[0.18em] text-[#45546a]">Smart Wardrobe</p>
                <h1 className="mt-3 text-4xl font-bold tracking-[-0.04em] text-black sm:text-5xl">Complete Your Wardrobe</h1>
                <p className="mt-4 max-w-2xl text-base leading-7 text-gray-600 sm:text-lg">Discover the next piece that can unlock more outfits from what you already own.</p>
            </header>

            {error ? (
                <section className="mt-10 rounded-2xl border border-[#e4e5e7] bg-white px-6 py-14 text-center shadow-[0_2px_12px_rgba(0,0,0,0.03)]">
                    <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-gray-100 text-xl">!</div>
                    <h2 className="mt-5 text-2xl font-bold tracking-tight text-black">We couldn&apos;t load your recommendations.</h2>
                    <p className="mx-auto mt-2 max-w-md text-gray-600">Please check your connection and try again.</p>
                    <button onClick={fetchRecommendations} className="mt-6 rounded-xl bg-[#171717] px-5 py-3 text-sm font-semibold text-white transition hover:bg-black">Try Again</button>
                </section>
            ) : recommendations.length === 0 ? (
                <section className="mt-10 rounded-2xl border border-[#e4e5e7] bg-white px-6 py-14 text-center shadow-[0_2px_12px_rgba(0,0,0,0.03)]">
                    <div className="text-4xl">✦</div>
                    <h2 className="mt-5 text-2xl font-bold tracking-tight text-black">Your wardrobe is already well balanced.</h2>
                    <p className="mx-auto mt-2 max-w-md text-gray-600">Add a few more items to discover new wardrobe opportunities.</p>
                    <button onClick={() => router.push("/wardrobe")} className="mt-6 rounded-xl bg-[#171717] px-5 py-3 text-sm font-semibold text-white transition hover:bg-black">Back to My Wardrobe</button>
                </section>
            ) : (
                <div className="mt-10 space-y-7">
                    {recommendations.map((recommendation, index) => (
                        <section key={`${recommendation.color}-${recommendation.category}-${index}`} className="rounded-2xl border border-[#e4e5e7] bg-white p-5 shadow-[0_2px_12px_rgba(0,0,0,0.03)] sm:p-7">
                            <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
                                <div className="max-w-3xl">
                                    <div className="flex flex-wrap items-center gap-3">
                                        <p className="text-xs font-bold uppercase tracking-[0.16em] text-gray-500">Recommendation #{index + 1}</p>
                                        <span className="rounded-full bg-[#fff4d7] px-3 py-1 text-[11px] font-bold uppercase tracking-[0.1em] text-[#5d4a18]">Wardrobe Gap</span>
                                    </div>
                                    <h2 className="mt-3 text-3xl font-bold capitalize tracking-tight text-black sm:text-4xl">{recommendation.color} {recommendation.category}</h2>
                                    <p className="mt-3 text-base leading-7 text-gray-600">{recommendation.reason}</p>
                                </div>
                                <div className="min-w-[190px] rounded-xl border border-[#e4e5e7] bg-[#f7f7f5] px-5 py-4 text-left md:text-center">
                                    <p className="text-4xl font-bold tracking-tight text-black">{recommendation.new_outfit_combinations}</p>
                                    <p className="mt-1 text-[11px] font-bold uppercase tracking-[0.12em] text-gray-500">New Outfit Combinations</p>
                                </div>
                            </div>

                            <div className="mt-7 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                                {recommendation.products.map((product) => (
                                    <article key={product.id} className="overflow-hidden rounded-xl border border-[#e4e5e7] bg-white shadow-[0_2px_10px_rgba(0,0,0,0.035)]">
                                        <div className="aspect-[3/4] bg-[#f6f6f4] p-3 sm:p-4">
                                            <img src={product.image} alt={product.name} className="h-full w-full object-contain object-center" />
                                        </div>
                                        <div className="p-4 sm:p-5">
                                            <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-gray-500">{product.brand}</p>
                                            <h3 className="mt-2 text-xl font-bold tracking-tight text-black">{product.name}</h3>
                                            <p className="mt-2 text-sm capitalize text-gray-600">{product.fit} fit · {product.color}</p>
                                            <div className="mt-5 flex items-center justify-between gap-3">
                                                <p className="text-xl font-bold text-black">₹{product.price}</p>
                                                <button onClick={() => setSelectedProduct(product)} className="shrink-0 rounded-lg bg-[#171717] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-black">View Product</button>
                                            </div>
                                        </div>
                                    </article>
                                ))}
                            </div>
                        </section>
                    ))}
                </div>
            )}

            {!error && recommendations.length > 0 && <button onClick={() => router.push("/wardrobe")} className="mt-8 w-full rounded-xl border border-[#d9dadd] bg-white px-6 py-4 font-semibold text-black transition hover:bg-gray-50">← Back to My Wardrobe</button>}
        </div>

        {selectedProduct && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4" role="dialog" aria-modal="true" aria-labelledby="product-dialog-title" onClick={() => setSelectedProduct(null)}>
                <section className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl" onClick={(event) => event.stopPropagation()}>
                    <div className="flex items-center justify-between border-b border-[#e4e5e7] px-5 py-4">
                        <p className="text-sm font-bold uppercase tracking-[0.14em] text-gray-500">Product Preview</p>
                        <button onClick={() => setSelectedProduct(null)} className="rounded-lg px-2 py-1 text-2xl leading-none text-gray-500 transition hover:bg-gray-100 hover:text-black" aria-label="Close product preview">×</button>
                    </div>
                    <div className="grid sm:grid-cols-2">
                        <div className="aspect-[3/4] bg-[#f6f6f4] p-5"><img src={selectedProduct.image} alt={selectedProduct.name} className="h-full w-full object-contain object-center" /></div>
                        <div className="flex flex-col p-5">
                            <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-gray-500">{selectedProduct.brand}</p>
                            <h2 id="product-dialog-title" className="mt-2 text-2xl font-bold tracking-tight text-black">{selectedProduct.name}</h2>
                            <p className="mt-3 text-sm capitalize text-gray-600">{selectedProduct.fit} fit · {selectedProduct.color}</p>
                            <p className="mt-4 text-2xl font-bold text-black">₹{selectedProduct.price}</p>
                            <p className="mt-auto pt-6 text-sm leading-6 text-gray-600">Shopping integration coming soon.</p>
                            <button onClick={() => setSelectedProduct(null)} className="mt-4 rounded-lg border border-[#d9dadd] px-4 py-2.5 text-sm font-semibold text-black transition hover:bg-gray-50">Close</button>
                        </div>
                    </div>
                </section>
            </div>
        )}
    </main>;
}
