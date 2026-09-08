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
          body: JSON.stringify(form),
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
    <main className="min-h-screen bg-gray-50 px-6 py-10">
      <div className="mx-auto max-w-5xl">

        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900">
            My Wardrobe 👕
          </h1>

          <p className="mt-2 text-gray-600">
            Add your clothes and let WearWise style them for you.
          </p>
        </div>

        <div className="grid gap-8 md:grid-cols-2">

          {/* Add Item */}
          <form
            onSubmit={addItem}
            className="rounded-2xl bg-white p-6 shadow"
          >
            <h2 className="mb-5 text-2xl font-semibold">
              Add Clothing
            </h2>

            <div className="space-y-4">

              <select
                name="category"
                value={form.category}
                onChange={handleChange}
                className="w-full rounded-lg border p-3"
              >
                <option value="tshirt">T-Shirt</option>
                <option value="shirt">Shirt</option>
                <option value="jeans">Jeans</option>
                <option value="pants">Pants</option>
                <option value="shoes">Shoes</option>
                <option value="sneakers">Sneakers</option>
              </select>

              <select
                name="color"
                value={form.color}
                onChange={handleChange}
                className="w-full rounded-lg border p-3"
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

              <select
                name="fit"
                value={form.fit}
                onChange={handleChange}
                className="w-full rounded-lg border p-3"
              >
                <option value="regular">Regular</option>
                <option value="oversized">Oversized</option>
                <option value="relaxed">Relaxed</option>
                <option value="slim">Slim</option>
              </select>

              <select
                name="pattern"
                value={form.pattern}
                onChange={handleChange}
                className="w-full rounded-lg border p-3"
              >
                <option value="solid">Solid</option>
                <option value="striped">Striped</option>
                <option value="printed">Printed</option>
                <option value="checked">Checked</option>
              </select>

              <select
                name="style"
                value={form.style}
                onChange={handleChange}
                className="w-full rounded-lg border p-3"
              >
                <option value="casual">Casual</option>
                <option value="streetwear">Streetwear</option>
                <option value="formal">Formal</option>
                <option value="minimal">Minimal</option>
              </select>

              <button
                type="submit"
                className="w-full rounded-lg bg-black px-5 py-3 font-semibold text-white hover:bg-gray-800"
              >
                + Add to Wardrobe
              </button>

            </div>
          </form>

          {/* Wardrobe */}
          <div className="rounded-2xl bg-white p-6 shadow">
            <h2 className="mb-5 text-2xl font-semibold">
              Your Clothes
            </h2>

            {items.length === 0 ? (
              <p className="text-gray-500">
                Your wardrobe is empty. Add your first item.
              </p>
            ) : (
              <div className="space-y-3">
                {items.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between rounded-xl border p-4"
                  >
                    <div>
                      <p className="font-semibold capitalize">
                        {item.color} {item.category}
                      </p>

                      <p className="text-sm text-gray-500">
                        {item.fit} · {item.style}
                      </p>
                    </div>

                    <button
                      onClick={() => deleteItem(item.id)}
                      className="text-sm text-red-500 hover:text-red-700"
                    >
                      Delete
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>

        <button
          onClick={() => router.push("/style")}
          disabled={items.length === 0}
          className="mt-8 w-full rounded-xl bg-black px-6 py-4 font-semibold text-white disabled:cursor-not-allowed disabled:bg-gray-300"
        >
          Style Me →
        </button>

      </div>
    </main>
  );
}