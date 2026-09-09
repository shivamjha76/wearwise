import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "WearWise",
  description: "Your wardrobe. Your style. Your next move.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="bg-gray-50 text-gray-900">
        <nav className="sticky top-0 z-50 border-b border-gray-200 bg-white/90 backdrop-blur">
          <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">

            <Link
              href="/"
              className="text-2xl font-bold tracking-tight"
            >
              WearWise
            </Link>

            <div className="flex items-center gap-2 text-sm font-medium">
              <Link
                href="/wardrobe"
                className="hidden rounded-lg px-3 py-2 text-gray-600 hover:bg-gray-100 hover:text-black sm:block"
              >
                Wardrobe
              </Link>

              <Link
                href="/style"
                className="rounded-lg px-3 py-2 text-gray-600 hover:bg-gray-100 hover:text-black"
              >
                Style Me
              </Link>

              <Link
                href="/wardrobe/next-purchase"
                className="hidden rounded-lg px-3 py-2 text-gray-600 hover:bg-gray-100 hover:text-black sm:block"
              >
                Shop
              </Link>

              <Link
                href="/profile"
                className="rounded-lg bg-black px-4 py-2 text-white hover:bg-gray-800"
              >
                Profile
              </Link>
            </div>

          </div>
        </nav>

        {children}
      </body>
    </html>
  );
}