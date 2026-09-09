"use client";

import { useEffect, useState } from "react";
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

export default function WardrobePage() {
    const router = useRouter();

    const [items, setItems] = useState<WardrobeItem[]>([]);
    const [loading, setLoading] = useState(true);

    const [form, setForm] = useState({
        category: "tshirt",
        color: "white",
        fit: "regular",
        pattern: "solid",
        style: "casual",
        image_url: "",
    });

    const userId =
        typeof window !== "undefined"
            ? localStorage.getItem("wearwise_user_id")
            : null;

    const fetchWardrobe = async () => {
        if (!userId) {
            router.push("/profile");
            return;
        }

        try {
            const response = await fetch(
                `http://127.0.0.1:8000/wardrobe/${userId}`
            );

            if (!response.ok) {
                throw new Error("Failed to fetch wardrobe");
            }

            const data = await response.json();
            setItems(data);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchWardrobe();
    }, []);

    const handleChange = (
        e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
    ) => {
        setForm({
            ...form,
            [e.target.name]: e.target.value,
        });
    };

    const addItem = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!userId) return;

        try {
            const response = await fetch(
                `http://127.0.0.1:8000/wardrobe/${userId}`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        category: form.category,
                        color: form.color,
                        fit: form.fit,
                        pattern: form.pattern,
                        style: form.style,
                        image_url: form.image_url || null,
                    }),
                }
            );

            if (!response.ok) {
                throw new Error("Failed to add item");
            }

            await fetchWardrobe();
        } catch (error) {
            console.error(error);
            alert("Could not add clothing item.");
        }
    };

    const deleteItem = async (itemId: number) => {
        try {
            const response = await fetch(
                `http://127.0.0.1:8000/wardrobe/${itemId}`,
                {
                    method: "DELETE",
                }
            );

            if (!response.ok) {
                throw new Error("Failed to delete item");
            }

            await fetchWardrobe();
        } catch (error) {
            console.error(error);
        }
    };

    if (loading) {
        return (
            <main className="flex min-h-screen items-center justify-center">
                <p>Loading your wardrobe...</p>
            </main>
        );
    }

    return (
        <main className="min-h-screen bg-[#f7f7f5] px-5 py-10">
            <div className="mx-auto max-w-6xl">

                {/* Header */}
                <div className="mb-10">
                    <p className="text-sm font-semibold uppercase tracking-[0.2em] text-gray-500">
                        WearWise
                    </p>

                    <div className="mt-3 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
                        <div>
                            <h1 className="text-4xl font-bold tracking-tight text-gray-950 sm:text-5xl">
                                My Wardrobe
                            </h1>

                            <p className="mt-3 max-w-xl text-gray-600">
                                Add your clothes and let WearWise find combinations
                                that work for you.
                            </p>
                        </div>

                        <div className="rounded-full bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm">
                            {items.length} {items.length === 1 ? "item" : "items"}
                        </div>
                    </div>
                </div>

                <div className="grid gap-8 lg:grid-cols-[360px_1fr]">

                    {/* Add Clothing */}
                    <form
                        onSubmit={addItem}
                        className="h-fit rounded-3xl border border-gray-200 bg-white p-6 shadow-sm"
                    >
                        <h2 className="text-2xl font-bold text-gray-950">
                            Add clothing
                        </h2>

                        <p className="mt-1 text-sm text-gray-500">
                            Tell us about an item you own.
                        </p>

                        <div className="mt-6 space-y-5">

                            <div>
                                <label className="mb-2 block text-sm font-medium text-gray-900">
                                    Category
                                </label>

                                <select
                                    name="category"
                                    value={form.category}
                                    onChange={handleChange}
                                    className="w-full rounded-xl border border-gray-200 bg-gray-50 p-3.5 text-gray-900 outline-none focus:border-black"
                                >
                                    <option value="tshirt">T-Shirt</option>
                                    <option value="shirt">Shirt</option>
                                    <option value="jeans">Jeans</option>
                                    <option value="pants">Pants</option>
                                    <option value="shoes">Shoes</option>
                                    <option value="sneakers">Sneakers</option>
                                </select>
                            </div>

                            <div>
                                <label className="mb-2 block text-sm font-medium text-gray-900">
                                    Color
                                </label>

                                <select
                                    name="color"
                                    value={form.color}
                                    onChange={handleChange}
                                    className="w-full rounded-xl border border-gray-200 bg-gray-50 p-3.5 text-gray-900 outline-none focus:border-black"
                                >
                                    <option value="white">White</option>
                                    <option value="black">Black</option>
                                    <option value="blue">Blue</option>
                                    <option value="green">Green</option>
                                    <option value="maroon">Maroon</option>
                                    <option value="beige">Beige</option>
                                    <option value="olive">Olive</option>
                                    <option value="grey">Grey</option>
                                    <option value="brown">Brown</option>
                                </select>
                            </div>

                            <div>
                                <label className="mb-2 block text-sm font-medium text-gray-900">
                                    Fit
                                </label>

                                <select
                                    name="fit"
                                    value={form.fit}
                                    onChange={handleChange}
                                    className="w-full rounded-xl border border-gray-200 bg-gray-50 p-3.5 text-gray-900 outline-none focus:border-black"
                                >
                                    <option value="regular">Regular</option>
                                    <option value="oversized">Oversized</option>
                                    <option value="relaxed">Relaxed</option>
                                    <option value="slim">Slim</option>
                                </select>
                            </div>

                            <div>
                                <label className="mb-2 block text-sm font-medium text-gray-900">
                                    Pattern
                                </label>

                                <select
                                    name="pattern"
                                    value={form.pattern}
                                    onChange={handleChange}
                                    className="w-full rounded-xl border border-gray-200 bg-gray-50 p-3.5 text-gray-900 outline-none focus:border-black"
                                >
                                    <option value="solid">Solid</option>
                                    <option value="striped">Striped</option>
                                    <option value="printed">Printed</option>
                                    <option value="checked">Checked</option>
                                </select>
                            </div>

                            <div>
                                <label className="mb-2 block text-sm font-medium text-gray-900">
                                    Style
                                </label>

                                <select
                                    name="style"
                                    value={form.style}
                                    onChange={handleChange}
                                    className="w-full rounded-xl border border-gray-200 bg-gray-50 p-3.5 text-gray-900 outline-none focus:border-black"
                                >
                                    <option value="casual">Casual</option>
                                    <option value="streetwear">Streetwear</option>
                                    <option value="formal">Formal</option>
                                    <option value="minimal">Minimal</option>
                                </select>
                            </div>
                            <div>
                                <label className="mb-2 block text-sm font-medium text-gray-900">
                                    Image URL
                                </label>

                                <input
                                    type="text"
                                    value={form.image_url}
                                    onChange={(e) =>
                                        setForm({ ...form, image_url: e.target.value })
                                    }
                                    placeholder="https://example.com/shirt.jpg"
                                    className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-gray-900 outline-none focus:border-black"
                                />
                            </div>

                            <div>
                                <label className="mb-2 block text-sm font-medium text-gray-900">
                                    Image URL
                                    <span className="ml-1 font-normal text-gray-500">
                                        (Optional)
                                    </span>
                                </label>

                                <input
                                    name="image_url"
                                    type="url"
                                    placeholder="https://example.com/shirt.jpg"
                                    value={form.image_url}
                                    onChange={handleChange}
                                    className="w-full rounded-xl border border-gray-200 bg-gray-50 p-3.5 text-gray-900 placeholder:text-gray-400 outline-none focus:border-black"
                                />
                            </div>

                            <button
                                type="submit"
                                className="w-full rounded-xl bg-black px-5 py-4 font-semibold text-white transition hover:bg-gray-800"
                            >
                                + Add to Wardrobe
                            </button>

                        </div>
                    </form>

                    {/* Wardrobe */}
                    <section>
                        <div className="mb-5 flex items-center justify-between">
                            <div>
                                <h2 className="text-2xl font-bold text-gray-950">
                                    Your clothes
                                </h2>

                                <p className="mt-1 text-sm text-gray-500">
                                    Everything you've added so far.
                                </p>
                            </div>
                        </div>

                        {items.length === 0 ? (
                            <div className="rounded-3xl border border-dashed border-gray-300 bg-white p-12 text-center">
                                <div className="text-6xl">👕</div>

                                <h3 className="mt-5 text-xl font-semibold text-gray-900">
                                    Your wardrobe is empty
                                </h3>

                                <p className="mx-auto mt-2 max-w-sm text-gray-500">
                                    Add a few tops, bottoms and shoes to let WearWise
                                    create personalized outfits.
                                </p>
                            </div>
                        ) : (
                            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">

                                {items.map((item) => (
                                    <div
                                        key={item.id}
                                        className="group rounded-2xl border border-gray-200 bg-white p-5 shadow-sm transition hover:-translate-y-1 hover:shadow-md"
                                    >
                                        <div className="mb-4 overflow-hidden rounded-2xl bg-gray-100">
                                            {item.image_url ? (
                                                <img
                                                    src={item.image_url}
                                                    alt={`${item.color} ${item.category}`}
                                                    className="h-56 w-full object-cover"
                                                />
                                            ) : (
                                                <div className="flex h-56 items-center justify-center text-5xl">
                                                    👕
                                                </div>
                                            )}
                                        </div>

                                        <div className="flex items-start justify-between">

                                            <button
                                                onClick={() => deleteItem(item.id)}
                                                className="text-sm font-medium text-gray-400 transition hover:text-red-500"
                                            >
                                                Delete
                                            </button>

                                        </div>

                                        <h3 className="mt-5 text-xl font-bold capitalize text-gray-950">
                                            {item.color} {item.category}
                                        </h3>

                                        <div className="mt-3 flex flex-wrap gap-2">
                                            <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium capitalize text-gray-700">
                                                {item.fit}
                                            </span>

                                            <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium capitalize text-gray-700">
                                                {item.style}
                                            </span>

                                            <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium capitalize text-gray-700">
                                                {item.pattern}
                                            </span>
                                        </div>
                                    </div>
                                ))}

                            </div>
                        )}

                        {/* CTA */}
                        {items.length > 0 && (
                            <button
                                onClick={() => router.push("/style")}
                                className="mt-8 w-full rounded-xl bg-black px-6 py-4 font-semibold text-white transition hover:bg-gray-800"
                            >
                                ✨ Style Me
                            </button>
                        )}

                    </section>

                </div>

            </div>
        </main>
    );
}