"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import {
  Menu,
  X,
  Shirt,
  Sparkles,
  Bookmark,
  ShoppingBag,
  User as UserIcon,
  LogOut,
  ChevronRight,
  Wand2,
} from "lucide-react";
import { clearSession, getStoredUser, User } from "@/lib/auth";
import { getImageUrl } from "@/lib/api";

export default function Navbar() {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<User | null>(null);
  const [mounted, setMounted] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

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

  // Close mobile menu whenever the route changes
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  // Lock body scroll when mobile menu is open
  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [mobileMenuOpen]);

  // Close on Escape key press
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setMobileMenuOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const handleLogout = () => {
    clearSession();
    setUser(null);
    setMobileMenuOpen(false);
    router.push("/login");
  };

  const navLinks: {
    name: string;
    href: string;
    icon: any;
    desc: string;
    badge?: string;
  }[] = [
    {
      name: "Wardrobe",
      href: "/wardrobe",
      icon: Shirt,
      desc: "Your digitized closet",
    },
    {
      name: "Style Me",
      href: "/style",
      icon: Wand2,
      desc: "Instant look combinations",
    },
    {
      name: "Veya AI",
      href: "/stylist",
      icon: Sparkles,
      desc: "Chat with your personal AI stylist",
    },
    {
      name: "Lookbook",
      href: "/saved",
      icon: Bookmark,
      desc: "Your curated outfit lookbook",
    },
    {
      name: "Shop",
      href: "/shop",
      icon: ShoppingBag,
      desc: "Smart wardrobe recommendations",
    },
  ];

  return (
    <>
      <header className="sticky top-0 z-50 border-b border-[#e5dfd5] bg-[#f4f0ea]/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 sm:px-6 h-16">
          
          {/* ================= 1. BRAND LOGO ================= */}
          <Link
            href="/"
            className="flex items-center gap-2.5 group select-none cursor-pointer"
            onClick={() => setMobileMenuOpen(false)}
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-black text-white text-base font-extrabold shadow-xs transition-transform group-hover:scale-105">
              W
            </div>
            <span className="text-xl font-black tracking-tight text-neutral-950 leading-none">
              WearWise
            </span>
          </Link>

          {/* ================= 2. DESKTOP / TABLET NAV LINKS ================= */}
          <nav className="hidden md:flex items-center gap-1 lg:gap-1.5 text-sm font-medium">
            {mounted && user ? (
              <>
                {navLinks.map((item) => {
                  const isActive = pathname === item.href;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={`relative rounded-xl px-3 py-2 text-xs lg:text-sm font-semibold transition-all duration-150 flex items-center gap-1.5 ${
                        isActive
                          ? "bg-[#171717] text-white shadow-2xs"
                          : "text-neutral-700 hover:bg-[#e8e2d8] hover:text-black"
                      }`}
                    >
                      <span>{item.name}</span>
                      {item.badge && (
                        <span
                          className={`rounded-full px-1.5 py-0.2 text-[9px] font-bold tracking-wider uppercase ${
                            isActive
                              ? "bg-white/20 text-white"
                              : "bg-black/10 text-neutral-800"
                          }`}
                        >
                          {item.badge}
                        </span>
                      )}
                    </Link>
                  );
                })}

                {/* Profile Pill */}
                <div className="ml-2 flex items-center border-l border-[#ded5c6] pl-3">
                  <Link
                    href="/profile"
                    className={`flex items-center gap-2 py-1 px-2.5 rounded-xl transition ${
                      pathname === "/profile"
                        ? "bg-[#171717] text-white shadow-2xs"
                        : "hover:bg-[#e8e2d8] text-neutral-800"
                    }`}
                    title="Your Profile & Measurements"
                  >
                    <div className="relative h-7 w-7 overflow-hidden rounded-full border border-black/10 bg-neutral-900 text-white flex items-center justify-center text-xs font-bold uppercase select-none shadow-2xs shrink-0">
                      {user.avatar_url ? (
                        <img
                          src={getImageUrl(user.avatar_url) || user.avatar_url}
                          alt={user.name}
                          className="h-full w-full object-cover"
                          onError={(e) => {
                            e.currentTarget.style.display = "none";
                          }}
                        />
                      ) : (
                        <span>{user.name ? user.name.charAt(0) : "👤"}</span>
                      )}
                    </div>
                    <span className="text-xs font-bold truncate max-w-[90px] lg:max-w-[130px]">
                      {user.name || "Member"}
                    </span>
                  </Link>
                </div>
              </>
            ) : mounted ? (
              <div className="flex items-center gap-2">
                <Link
                  href="/login"
                  className={`rounded-xl px-4 py-2 text-xs sm:text-sm font-semibold transition ${
                    pathname === "/login"
                      ? "bg-[#e8e2d8] text-black"
                      : "text-neutral-700 hover:bg-[#eae4da] hover:text-black"
                  }`}
                >
                  Log In
                </Link>

                <Link
                  href="/register"
                  className="rounded-xl bg-[#171717] px-4 py-2 text-xs sm:text-sm font-bold text-white transition hover:bg-black shadow-xs active:scale-95"
                >
                  Sign Up
                </Link>
              </div>
            ) : null}
          </nav>

          {/* ================= 3. MOBILE MENU TOGGLE & PROFILE AVATAR ================= */}
          <div className="flex md:hidden items-center gap-2">
            {mounted && user && (
              <Link
                href="/profile"
                onClick={() => setMobileMenuOpen(false)}
                className={`relative h-8 w-8 overflow-hidden rounded-full border border-black/10 bg-neutral-900 text-white flex items-center justify-center text-xs font-bold uppercase select-none shadow-2xs shrink-0 transition active:scale-95 ${
                  pathname === "/profile" ? "ring-2 ring-black" : ""
                }`}
                title="Profile"
              >
                {user.avatar_url ? (
                  <img
                    src={getImageUrl(user.avatar_url) || user.avatar_url}
                    alt={user.name}
                    className="h-full w-full object-cover"
                    onError={(e) => {
                      e.currentTarget.style.display = "none";
                    }}
                  />
                ) : (
                  <span>{user.name ? user.name.charAt(0) : "👤"}</span>
                )}
              </Link>
            )}

            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#ded5c6] bg-white text-neutral-900 shadow-2xs hover:bg-neutral-50 active:scale-90 transition cursor-pointer"
              aria-label={mobileMenuOpen ? "Close navigation menu" : "Open navigation menu"}
              aria-expanded={mobileMenuOpen}
            >
              {mobileMenuOpen ? (
                <X className="h-5 w-5 text-neutral-900" />
              ) : (
                <Menu className="h-5 w-5 text-neutral-900" />
              )}
            </button>
          </div>

        </div>
      </header>

      {/* ================= 4. MOBILE / TABLET DRAWER SHEET ================= */}
      {mobileMenuOpen && (
        <>
          {/* Backdrop Scrim */}
          <div
            onClick={() => setMobileMenuOpen(false)}
            className="fixed inset-0 top-16 z-40 bg-black/40 backdrop-blur-xs transition-opacity md:hidden animate-pop-in"
            aria-hidden="true"
          />

          {/* Drawer Menu Container */}
          <div
            className="fixed inset-x-0 top-16 z-50 max-h-[calc(100vh-4rem)] overflow-y-auto border-b border-[#ded5c6] bg-[#faf8f4] p-5 shadow-2xl md:hidden animate-pop-in"
          >
            {mounted && user ? (
              <div className="space-y-4">
                
                {/* User Card */}
                <Link
                  href="/profile"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center gap-3.5 p-3.5 rounded-2xl border border-[#e4dcce] bg-white shadow-2xs transition active:scale-98"
                >
                  <div className="relative h-12 w-12 overflow-hidden rounded-full border-2 border-white bg-neutral-900 text-white flex items-center justify-center text-base font-bold uppercase shadow-sm shrink-0">
                    {user.avatar_url ? (
                      <img
                        src={getImageUrl(user.avatar_url) || user.avatar_url}
                        alt={user.name}
                        className="h-full w-full object-cover"
                        onError={(e) => {
                          e.currentTarget.style.display = "none";
                        }}
                      />
                    ) : (
                      <span>{user.name ? user.name.charAt(0) : "👤"}</span>
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-extrabold text-neutral-900 truncate">
                        {user.name || "Member"}
                      </h4>
                      <ChevronRight className="h-4 w-4 text-neutral-400" />
                    </div>
                    <p className="text-xs text-neutral-500 truncate">
                      {user.email}
                    </p>
                    <span className="mt-1 inline-flex text-[10px] font-bold text-neutral-700 underline">
                      Manage style DNA & sizes →
                    </span>
                  </div>
                </Link>

                {/* Navigation Links */}
                <div className="space-y-1.5 pt-1">
                  {navLinks.map((item) => {
                    const isActive = pathname === item.href;
                    const Icon = item.icon;
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={() => setMobileMenuOpen(false)}
                        className={`flex items-center justify-between rounded-2xl px-4 py-3 transition-all ${
                          isActive
                            ? "bg-[#171717] text-white shadow-xs"
                            : "bg-white border border-[#ece6db] text-neutral-800 hover:border-black/20"
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className={`flex h-9 w-9 items-center justify-center rounded-xl ${
                              isActive
                                ? "bg-white/15 text-white"
                                : "bg-[#f4f0ea] text-neutral-800"
                            }`}
                          >
                            <Icon className="h-4 w-4" />
                          </div>
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span className="text-sm font-bold">
                                {item.name}
                              </span>
                              {item.badge && (
                                <span
                                  className={`rounded-full px-1.5 py-0.2 text-[9px] font-bold uppercase tracking-wider ${
                                    isActive
                                      ? "bg-white/20 text-white"
                                      : "bg-emerald-100 text-emerald-900"
                                  }`}
                                >
                                  {item.badge}
                                </span>
                              )}
                            </div>
                            <p
                              className={`text-[11px] truncate max-w-[220px] ${
                                isActive
                                  ? "text-white/70"
                                  : "text-neutral-500"
                              }`}
                            >
                              {item.desc}
                            </p>
                          </div>
                        </div>

                        <ChevronRight
                          className={`h-4 w-4 ${
                            isActive ? "text-white/80" : "text-neutral-400"
                          }`}
                        />
                      </Link>
                    );
                  })}

                  {/* Profile Link in list */}
                  <Link
                    href="/profile"
                    onClick={() => setMobileMenuOpen(false)}
                    className={`flex items-center justify-between rounded-2xl px-4 py-3 transition-all ${
                      pathname === "/profile"
                        ? "bg-[#171717] text-white shadow-xs"
                        : "bg-white border border-[#ece6db] text-neutral-800 hover:border-black/20"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`flex h-9 w-9 items-center justify-center rounded-xl ${
                          pathname === "/profile"
                            ? "bg-white/15 text-white"
                            : "bg-[#f4f0ea] text-neutral-800"
                        }`}
                      >
                        <UserIcon className="h-4 w-4" />
                      </div>
                      <div>
                        <span className="text-sm font-bold">
                          Profile & Sizing
                        </span>
                        <p
                          className={`text-[11px] ${
                            pathname === "/profile"
                              ? "text-white/70"
                              : "text-neutral-500"
                          }`}
                        >
                          Body measurements, tone & sizes
                        </p>
                      </div>
                    </div>
                    <ChevronRight
                      className={`h-4 w-4 ${
                        pathname === "/profile"
                          ? "text-white/80"
                          : "text-neutral-400"
                      }`}
                    />
                  </Link>
                </div>

                {/* Logout Action */}
                <div className="pt-2 border-t border-[#ded5c6]">
                  <button
                    type="button"
                    onClick={handleLogout}
                    className="flex w-full items-center justify-center gap-2 rounded-2xl border border-red-200 bg-red-50/80 py-3 text-xs font-bold text-red-600 hover:bg-red-100 transition active:scale-98 cursor-pointer"
                  >
                    <LogOut className="h-4 w-4" />
                    <span>Log Out of WearWise</span>
                  </button>
                </div>

              </div>
            ) : (
              /* Non-authenticated mobile drawer */
              <div className="space-y-4">
                <div className="p-4 rounded-2xl bg-white border border-[#ece6db] text-center">
                  <h3 className="text-base font-bold text-neutral-900">
                    Welcome to WearWise
                  </h3>
                  <p className="mt-1 text-xs text-neutral-500 leading-relaxed">
                    Log in to unlock your AI fashion stylist, virtual wardrobe, and custom-tailored recommendations.
                  </p>
                </div>

                <div className="flex flex-col gap-2.5">
                  <Link
                    href="/login"
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex h-11 items-center justify-center rounded-xl border border-neutral-300 bg-white text-xs font-bold text-neutral-900 shadow-2xs hover:bg-neutral-50 transition"
                  >
                    Log In to Account
                  </Link>

                  <Link
                    href="/register"
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex h-11 items-center justify-center rounded-xl bg-black text-xs font-bold text-white shadow-xs hover:bg-neutral-800 transition"
                  >
                    Create Free Account →
                  </Link>
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </>
  );
}
