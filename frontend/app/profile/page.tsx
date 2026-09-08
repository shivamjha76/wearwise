"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

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

    try {
      // 1. Create user
      const userResponse = await fetch(
        "http://127.0.0.1:8000/users/",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            name: form.name,
            email: form.email,
          }),
        }
      );

      if (!userResponse.ok) {
        throw new Error("Failed to create user");
      }

      const user = await userResponse.json();

      // 2. Create style profile
      const profileResponse = await fetch(
        `http://127.0.0.1:8000/users/${user.id}/style-profile`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
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
        throw new Error("Failed to create style profile");
      }

      localStorage.setItem("wearwise_user_id", user.id);

      router.push("/wardrobe");

    } catch (error) {
      console.error(error);
      alert("Something went wrong. Make sure the backend is running.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-gray-50 px-6 py-12">
      <div className="mx-auto max-w-2xl">

        <h1 className="text-4xl font-bold text-gray-900">
          Create Your Style Profile
        </h1>

        <p className="mt-2 text-gray-600">
          Tell WearWise a little about your style.
        </p>

        <form
          onSubmit={handleSubmit}
          className="mt-8 space-y-5 rounded-2xl bg-white p-8 shadow"
        >

          <input
            name="name"
            placeholder="Your name"
            value={form.name}
            onChange={handleChange}
            required
            className="w-full rounded-lg border p-3"
          />

          <input
            name="email"
            type="email"
            placeholder="Email"
            value={form.email}
            onChange={handleChange}
            required
            className="w-full rounded-lg border p-3"
          />

          <input
            name="height"
            type="number"
            placeholder="Height (cm)"
            value={form.height}
            onChange={handleChange}
            required
            className="w-full rounded-lg border p-3"
          />

          <input
            name="weight"
            type="number"
            placeholder="Weight (kg)"
            value={form.weight}
            onChange={handleChange}
            required
            className="w-full rounded-lg border p-3"
          />

          <select
            name="skin_tone"
            value={form.skin_tone}
            onChange={handleChange}
            className="w-full rounded-lg border p-3"
          >
            <option value="fair">Fair</option>
            <option value="light">Light</option>
            <option value="medium">Medium</option>
            <option value="deep">Deep</option>
          </select>

          <select
            name="style_preference"
            value={form.style_preference}
            onChange={handleChange}
            className="w-full rounded-lg border p-3"
          >
            <option value="casual">Casual</option>
            <option value="streetwear">Streetwear</option>
            <option value="formal">Formal</option>
            <option value="minimal">Minimal</option>
          </select>

          <select
            name="fit_preference"
            value={form.fit_preference}
            onChange={handleChange}
            className="w-full rounded-lg border p-3"
          >
            <option value="regular">Regular</option>
            <option value="oversized">Oversized</option>
            <option value="relaxed">Relaxed</option>
            <option value="slim">Slim</option>
          </select>

          <input
            name="budget"
            type="number"
            placeholder="Monthly fashion budget (₹)"
            value={form.budget}
            onChange={handleChange}
            required
            className="w-full rounded-lg border p-3"
          />

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-black px-6 py-3 font-semibold text-white hover:bg-gray-800 disabled:opacity-50"
          >
            {loading ? "Creating Profile..." : "Continue →"}
          </button>

        </form>
      </div>
    </main>
  );
}