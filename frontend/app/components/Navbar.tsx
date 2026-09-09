"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { clearSession, getStoredUser, User } from "@/lib/auth";
import { getImageUrl } from "@/lib/api";

export default function Navbar() {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<User | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    setUser(getStoredUser());

    const handleAuthChange = () => {
      setUser(getStoredUser());
    };

    window.addEventListener("wearwise_auth_changed", handleAuthChange);
    window.addEventListener("storage", handleAuthChange);

    return () => {
      window.removeEventListener("wearwise_auth_changed", handleAuthChange);
      window.removeEventListener("storage", handleAuthChange);
    };
  }, []);

  const handleLogout = () => {
    clearSession();
    setUser(null);
    router.push("/login");
  };

  return (
    <nav className="sticky top-0 z-50 border-b border-[#e5dfd5] bg-[#f4f0ea]/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-3.5 sm:px-6">
        {/* Brand */}
        <Link
          href="/"
          className="text-2xl font-bold tracking-tight text-black transition hover:opacity-90"
        >
          WearWise
        </Link>

        {/* Links */}
        <div className="flex items-center gap-1 sm:gap-2 text-sm font-medium">
          {mounted && user ? (
            <>
              <Link
                href="/wardrobe"
                className={`rounded-lg px-3 py-2 transition ${
                  pathname === "/wardrobe"
                    ? "bg-gray-100 text-black font-semibold"
                    : "text-gray-600 hover:bg-gray-100 hover:text-black"
                }`}
              >
                Wardrobe
              </Link>

              <Link
                href="/style"
                className={`rounded-lg px-3 py-2 transition ${
                  pathname === "/style"
                    ? "bg-gray-100 text-black font-semibold"
                    : "text-gray-600 hover:bg-gray-100 hover:text-black"
                }`}
              >
                Style Me
              </Link>

              <Link
                href="/stylist"
                className={`rounded-lg px-3 py-2 transition ${
                  pathname === "/stylist"
                    ? "bg-gray-100 text-black font-semibold"
                    : "text-gray-600 hover:bg-gray-100 hover:text-black"
                }`}
              >
                <span className="mr-1 inline-block text-xs">✨</span> AI Stylist
              </Link>

              <Link
                href="/saved"
                className={`rounded-lg px-3 py-2 transition ${
                  pathname === "/saved"
                    ? "bg-gray-100 text-black font-semibold"
                    : "text-gray-600 hover:bg-gray-100 hover:text-black"
                }`}
              >
                Saved Looks
              </Link>

              <Link
                href="/wardrobe/next-purchase"
                className={`hidden rounded-lg px-3 py-2 transition sm:block ${
                  pathname === "/wardrobe/next-purchase"
                    ? "bg-gray-100 text-black font-semibold"
                    : "text-gray-600 hover:bg-gray-100 hover:text-black"
                }`}
              >
                Shop
              </Link>

              <Link
                href="/profile"
                className={`hidden rounded-lg px-3 py-2 transition sm:block ${
                  pathname === "/profile"
                    ? "bg-gray-100 text-black font-semibold"
                    : "text-gray-600 hover:bg-gray-100 hover:text-black"
                }`}
              >
                Profile
              </Link>

              <div className="ml-2 flex items-center gap-2.5 border-l border-gray-200 pl-3">
                <Link
                  href="/profile"
                  className="flex items-center gap-2 group transition"
                  title="Your Profile"
                >
                  <div className="h-7 w-7 overflow-hidden rounded-full border border-gray-300 bg-neutral-800 text-white flex items-center justify-center text-xs font-bold uppercase select-none shadow-2xs">
                    {user.avatar_url ? (
                      <img
                        src={getImageUrl(user.avatar_url) || user.avatar_url}
                        alt={user.name}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <span>{user.name ? user.name.charAt(0) : "👤"}</span>
                    )}
                  </div>
                  <span className="hidden text-xs font-semibold text-gray-700 group-hover:text-black md:inline-block">
                    {user.name}
                  </span>
                </Link>

                <button
                  onClick={handleLogout}
                  className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 transition hover:bg-gray-100 hover:text-black"
                >
                  Log out
                </button>
              </div>
            </>
          ) : (
            <>
              <Link
                href="/login"
                className={`rounded-lg px-3.5 py-2 text-sm font-semibold transition ${
                  pathname === "/login"
                    ? "bg-[#e8e2d8] text-black"
                    : "text-[#524a3e] hover:bg-[#eae4da] hover:text-black"
                }`}
              >
                Log In
              </Link>

              <Link
                href="/register"
                className="rounded-xl bg-[#171717] px-4 py-2 text-sm font-semibold text-white transition hover:bg-black"
              >
                Sign Up
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
