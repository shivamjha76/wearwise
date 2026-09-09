"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { API_BASE_URL } from "@/lib/api";
import { setSession } from "@/lib/auth";

export default function LoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const response = await fetch(`${API_BASE_URL}/auth/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || "Invalid email or password");
      }

      setSession(data.access_token, data.user);
      router.push("/wardrobe");
    } catch (err: unknown) {
      if (err instanceof Error) {
        if (err.message === "Failed to fetch") {
          setError(
            `Unable to connect to the server (${API_BASE_URL}). Please ensure the backend is running.`
          );
        } else {
          setError(err.message);
        }
      } else {
        setError("Something went wrong. Please check your backend.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-[calc(100vh-73px)] bg-[#f7f7f5] px-5 py-16">
      <div className="mx-auto max-w-md">
        <div className="mb-8 text-center">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#45546a]">
            WearWise
          </p>
          <h1 className="mt-3 text-3xl font-bold tracking-tight text-[#111111] sm:text-4xl">
            Welcome back
          </h1>
          <p className="mt-2 text-sm text-gray-600">
            Log in to manage your wardrobe and view styled looks.
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm sm:p-8"
        >
          {error && (
            <div className="mb-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-700">
              {error}
            </div>
          )}

          <div className="space-y-5">
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-900">
                Email address
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
                className="w-full rounded-xl border border-gray-200 bg-gray-50 p-3.5 outline-none transition focus:border-black focus:bg-white"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-gray-900">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="w-full rounded-xl border border-gray-200 bg-gray-50 p-3.5 outline-none transition focus:border-black focus:bg-white"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="mt-2 w-full rounded-xl bg-[#171717] px-6 py-4 font-semibold text-white transition hover:bg-black disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? "Logging in..." : "Log In →"}
            </button>
          </div>

          <div className="mt-6 border-t border-gray-100 pt-6 text-center text-sm text-gray-600">
            Don&apos;t have an account?{" "}
            <Link
              href="/register"
              className="font-semibold text-black underline underline-offset-4 hover:text-gray-700"
            >
              Create account
            </Link>
          </div>
        </form>
      </div>
    </main>
  );
}
