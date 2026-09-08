"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const occasions = [
  {
    value: "college",
    title: "College",
    emoji: "🎓",
  },
  {
    value: "casual",
    title: "Casual",
    emoji: "👕",
  },
  {
    value: "party",
    title: "Party",
    emoji: "🎉",
  },
  {
    value: "interview",
    title: "Interview",
    emoji: "💼",
  },
  {
    value: "date",
    title: "Date",
    emoji: "❤️",
  },
];

export default function StylePage() {
  const router = useRouter();

  const [occasion, setOccasion] = useState("college");
  const [loading, setLoading] = useState(false);

  const getRecommendation = async () => {
    const userId = localStorage.getItem("wearwise_user_id");

    if (!userId) {
      router.push("/profile");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(
        `http://127.0.0.1:8000/outfits/${userId}?occasion=${occasion}`,
        {
          method: "POST",
        }
      );

      if (!response.ok) {
        throw new Error("Failed to get recommendation");
      }

      const data = await response.json();

      localStorage.setItem(
        "wearwise_recommendation",
        JSON.stringify(data)
      );

      router.push("/outfit");
    } catch (error) {
      console.error(error);
      alert("Could not generate outfit recommendation.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-gray-50 px-6 py-12">
      <div className="mx-auto max-w-3xl">

        <div className="text-center">
          <p className="text-sm font-semibold uppercase tracking-wider text-gray-500">
            WearWise
          </p>

          <h1 className="mt-3 text-4xl font-bold text-gray-900">
            What are you dressing for?
          </h1>

          <p className="mt-3 text-gray-600">
            Choose an occasion and we'll style an outfit from your wardrobe.
          </p>
        </div>

        <div className="mt-10 grid gap-4 sm:grid-cols-2 md:grid-cols-3">
          {occasions.map((item) => (
            <button
              key={item.value}
              onClick={() => setOccasion(item.value)}
              className={`rounded-2xl border p-6 text-left transition ${
                occasion === item.value
                  ? "border-black bg-black text-white"
                  : "border-gray-200 bg-white hover:border-gray-400"
              }`}
            >
              <div className="text-3xl">{item.emoji}</div>

              <p className="mt-4 text-lg font-semibold">
                {item.title}
              </p>
            </button>
          ))}
        </div>

        <button
          onClick={getRecommendation}
          disabled={loading}
          className="mt-10 w-full rounded-xl bg-black px-6 py-4 font-semibold text-white hover:bg-gray-800 disabled:opacity-50"
        >
          {loading
            ? "Styling Your Outfit..."
            : "✨ Style Me"}
        </button>

      </div>
    </main>
  );
}