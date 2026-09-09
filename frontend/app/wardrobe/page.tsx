"use client";

import { useEffect, useState } from "react";
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

export default function WardrobePage() {
    const router = useRouter();

    const [items, setItems] = useState<WardrobeItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [currentUser, setCurrentUser] = useState<User | null>(null);

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
    const [dragActive, setDragActive] = useState(false);

    useEffect(() => {
        return () => {
            if (previewUrl && previewUrl.startsWith("blob:")) {
                URL.revokeObjectURL(previewUrl);
            }
        };
    }, [previewUrl]);

    const handleFileSelect = (selectedFile: File) => {
        if (!selectedFile.type.startsWith("image/")) {
            alert("Please select an image file (JPG, PNG, WebP).");
            return;
        }
        if (selectedFile.size > 10 * 1024 * 1024) {
            alert("Image size should be less than 10MB.");
            return;
        }
        if (previewUrl && previewUrl.startsWith("blob:")) {
            URL.revokeObjectURL(previewUrl);
        }
        setFile(selectedFile);
        setPreviewUrl(URL.createObjectURL(selectedFile));
    };

    const handleClearFile = () => {
        if (previewUrl && previewUrl.startsWith("blob:")) {
            URL.revokeObjectURL(previewUrl);
        }
        setFile(null);
        setPreviewUrl(null);
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
            const response = await fetch(
                `${API_BASE_URL}/wardrobe/${targetUserId}`,
                {
                    headers: getAuthHeaders(),
                }
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
        const user = getStoredUser();
        if (!user) {
            router.push("/login");
            return;
        }
        setCurrentUser(user);
        fetchWardrobe(user.id);
    }, [router]);

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

        if (!currentUser) return;
        setUploading(true);

        try {
            let finalImageUrl: string | null = null;

            if (imageMode === "upload" && file) {
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
            } else if (imageMode === "url" && form.image_url.trim()) {
                finalImageUrl = form.image_url.trim();
            }

            const response = await fetch(
                `${API_BASE_URL}/wardrobe/${currentUser.id}`,
                {
                    method: "POST",
                    headers: getAuthHeaders(),
                    body: JSON.stringify({
                        category: form.category,
                        color: form.color,
                        fit: form.fit,
                        pattern: form.pattern,
                        style: form.style,
                        image_url: finalImageUrl,
                    }),
                }
            );

            if (!response.ok) {
                throw new Error("Failed to add item");
            }

            handleClearFile();
            setForm((prev) => ({ ...prev, image_url: "" }));
            await fetchWardrobe(currentUser.id);
        } catch (error: unknown) {
            console.error(error);
            if (error instanceof Error) {
                alert(error.message);
            } else {
                alert("Could not add clothing item.");
            }
        } finally {
            setUploading(false);
        }
    };

    const deleteItem = async (itemId: number) => {
        try {
            const response = await fetch(
                `${API_BASE_URL}/wardrobe/${itemId}`,
                {
                    method: "DELETE",
                    headers: getAuthHeaders(),
                }
            );

            if (!response.ok) {
                throw new Error("Failed to delete item");
            }

            if (currentUser) {
                await fetchWardrobe(currentUser.id);
            }
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
                            {/* Image Section */}
                            <div>
                                <div className="mb-2 flex items-center justify-between">
                                    <label className="text-sm font-medium text-gray-900">
                                        Clothing Photo
                                        <span className="ml-1 font-normal text-gray-500">
                                            (Optional)
                                        </span>
                                    </label>

                                    {/* Mode switcher */}
                                    <div className="flex rounded-lg bg-gray-100 p-0.5 text-xs font-semibold">
                                        <button
                                            type="button"
                                            onClick={() => setImageMode("upload")}
                                            className={`rounded-md px-2.5 py-1 transition ${
                                                imageMode === "upload"
                                                    ? "bg-white text-black shadow-sm"
                                                    : "text-gray-500 hover:text-black"
                                            }`}
                                        >
                                            Upload
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setImageMode("url")}
                                            className={`rounded-md px-2.5 py-1 transition ${
                                                imageMode === "url"
                                                    ? "bg-white text-black shadow-sm"
                                                    : "text-gray-500 hover:text-black"
                                            }`}
                                        >
                                            URL Link
                                        </button>
                                    </div>
                                </div>

                                {imageMode === "upload" ? (
                                    <div>
                                        {previewUrl ? (
                                            <div className="relative overflow-hidden rounded-2xl border border-gray-200 bg-gray-50 p-2">
                                                <img
                                                    src={previewUrl}
                                                    alt="Item preview"
                                                    className="h-44 w-full rounded-xl object-cover"
                                                />
                                                <div className="mt-2 flex items-center justify-between px-1">
                                                    <span className="truncate text-xs font-medium text-gray-600 max-w-[200px]">
                                                        {file?.name}
                                                    </span>
                                                    <button
                                                        type="button"
                                                        onClick={handleClearFile}
                                                        className="text-xs font-semibold text-red-600 hover:underline"
                                                    >
                                                        Remove Photo
                                                    </button>
                                                </div>
                                            </div>
                                        ) : (
                                            <label
                                                onDragEnter={handleDrag}
                                                onDragLeave={handleDrag}
                                                onDragOver={handleDrag}
                                                onDrop={handleDrop}
                                                className={`flex flex-col items-center justify-center rounded-2xl border-2 border-dashed p-6 text-center cursor-pointer transition ${
                                                    dragActive
                                                        ? "border-black bg-gray-50"
                                                        : "border-gray-200 bg-gray-50/50 hover:border-gray-400 hover:bg-white"
                                                }`}
                                            >
                                                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white shadow-sm text-lg">
                                                    📸
                                                </div>
                                                <p className="mt-2 text-xs font-semibold text-gray-800">
                                                    Click to upload or drag & drop
                                                </p>
                                                <p className="mt-1 text-[11px] text-gray-400">
                                                    PNG, JPG, WebP up to 10MB
                                                </p>
                                                <input
                                                    type="file"
                                                    accept="image/*"
                                                    onChange={(e) => {
                                                        if (e.target.files?.[0]) {
                                                            handleFileSelect(e.target.files[0]);
                                                        }
                                                    }}
                                                    className="hidden"
                                                />
                                            </label>
                                        )}
                                    </div>
                                ) : (
                                    <input
                                        name="image_url"
                                        type="url"
                                        placeholder="https://example.com/shirt.jpg"
                                        value={form.image_url}
                                        onChange={handleChange}
                                        className="w-full rounded-xl border border-gray-200 bg-gray-50 p-3.5 text-gray-900 placeholder:text-gray-400 outline-none focus:border-black"
                                    />
                                )}
                            </div>

                            <button
                                type="submit"
                                disabled={uploading}
                                className="w-full rounded-xl bg-black px-5 py-4 font-semibold text-white transition hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {uploading ? "Saving item..." : "+ Add to Wardrobe"}
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
                                    Everything you&apos;ve added so far.
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
                                                    src={getImageUrl(item.image_url) || ""}
                                                    alt={`${item.color} ${item.category}`}
                                                    className="h-56 w-full object-cover transition duration-300 group-hover:scale-105"
                                                    onError={(e) => {
                                                        (e.currentTarget as HTMLElement).style.display = "none";
                                                    }}
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
