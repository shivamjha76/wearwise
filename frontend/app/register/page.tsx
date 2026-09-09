"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { User, Mail, Lock, Eye, EyeOff } from "lucide-react";
import { API_BASE_URL } from "@/lib/api";
import { setSession } from "@/lib/auth";

export default function RegisterPage() {
  const router = useRouter();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    if (password.length < 6) {
      setError("Password must be at least 6 characters long.");
      setLoading(false);
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/auth/register`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ name, email, password }),
      });

      let data: { detail?: string; access_token?: string; user?: any } = {};
      const contentType = response.headers.get("content-type");
      if (contentType && contentType.includes("application/json")) {
        data = await response.json();
      } else {
        throw new Error(
          response.status === 404
            ? "Backend API not reachable (404). Please deploy the backend and set NEXT_PUBLIC_API_URL in Vercel settings."
            : `Server returned status ${response.status}. Please check backend logs.`
        );
      }

      if (!response.ok || !data.access_token || !data.user) {
        throw new Error(data.detail || "Failed to create account");
      }

      setSession(data.access_token, data.user);
      router.push("/profile");
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
        setError("Something went wrong. Please check your connection.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="relative min-h-[calc(100vh-65px)] overflow-hidden bg-[#f4f0ea] px-5 py-12 sm:px-8 sm:py-20 text-[#171513] flex items-center justify-center">
      {/* Ambient warm lighting glow */}
      <div className="pointer-events-none absolute -top-40 left-1/2 -z-10 h-[500px] w-[800px] -translate-x-1/2 rounded-full bg-gradient-to-b from-[#e7ded1]/70 via-[#f5efe6]/40 to-transparent blur-3xl" />

      <div className="w-full max-w-md animate-pop-in">
        
        {/* Header Badge & Title */}
        <div className="mb-8 text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-[#ded5c6] bg-[#fbf9f5] px-3.5 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-[#635746] shadow-2xs backdrop-blur-md">
            <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>New Wardrobe Profile</span>
          </div>
          <h1 className="mt-4 text-3xl font-extrabold tracking-tight text-[#1a1714] sm:text-4xl">
            Create an account
          </h1>
        </div>

        {/* Form Container */}
        <form
          onSubmit={handleSubmit}
          className="rounded-3xl border border-[#e2dad0] bg-white p-7 shadow-[0_20px_50px_rgba(45,35,20,0.06)] sm:p-9"
        >
          {error && (
            <div className="mb-5 flex items-start gap-2.5 rounded-2xl border border-red-200 bg-red-50 p-3.5 text-xs font-medium text-red-800 animate-pop-in">
              <span>⚠️</span>
              <span className="leading-relaxed">{error}</span>
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-[#4a4339]">
                Full name
              </label>
              <div className="relative">
                <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[#8c8275]">
                  <User className="h-4 w-4" />
                </span>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Alex Morgan"
                  required
                  className="w-full rounded-xl border border-[#e2dad0] bg-[#faf8f4] py-3 pl-10 pr-3.5 text-xs sm:text-sm text-gray-900 placeholder:text-[#9e9588] outline-none transition focus:border-black focus:bg-white focus:ring-1 focus:ring-black"
                />
              </div>
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-[#4a4339]">
                Email address
              </label>
              <div className="relative">
                <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[#8c8275]">
                  <Mail className="h-4 w-4" />
                </span>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  required
                  className="w-full rounded-xl border border-[#e2dad0] bg-[#faf8f4] py-3 pl-10 pr-3.5 text-xs sm:text-sm text-gray-900 placeholder:text-[#9e9588] outline-none transition focus:border-black focus:bg-white focus:ring-1 focus:ring-black"
                />
              </div>
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-[#4a4339]">
                Password
              </label>
              <div className="relative">
                <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[#8c8275]">
                  <Lock className="h-4 w-4" />
                </span>
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="At least 6 characters"
                  required
                  className="w-full rounded-xl border border-[#e2dad0] bg-[#faf8f4] py-3 pl-10 pr-10 text-xs sm:text-sm text-gray-900 placeholder:text-[#9e9588] outline-none transition focus:border-black focus:bg-white focus:ring-1 focus:ring-black"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#8c8275] hover:text-black transition cursor-pointer p-0.5"
                  title={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="mt-2 flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#171717] px-6 text-xs sm:text-sm font-bold text-white shadow-sm transition hover:bg-black active:scale-98 disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer"
            >
              {loading ? (
                <>
                  <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                  <span>Creating Account...</span>
                </>
              ) : (
                <>
                  <span>Create Account</span>
                  <span>→</span>
                </>
              )}
            </button>
          </div>

          <div className="mt-6 border-t border-[#eee8df] pt-5 text-center text-xs text-[#73695c]">
            Already have an account?{" "}
            <Link
              href="/login"
              className="font-bold text-black underline underline-offset-4 hover:opacity-80"
            >
              Log in
            </Link>
          </div>
        </form>
      </div>
    </main>
  );
}
