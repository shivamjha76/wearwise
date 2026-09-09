import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "WearWise",
  description: "Your wardrobe. Your style. Your next move.",
};

import Navbar from "./components/Navbar";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="bg-[#f4f0ea] text-[#171513]">
        <Navbar />

        {children}
      </body>
    </html>
  );
}