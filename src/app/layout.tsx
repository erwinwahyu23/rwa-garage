import type { Metadata } from "next";
// import { Inter } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";
import { Providers } from "./providers"; // 👈 TAMBAH INI
import SessionWatcher from "@/components/auth/SessionWatcher";

// const inter = Inter({
//   subsets: ["latin"],
//   variable: "--font-inter",
// });

export const metadata: Metadata = {
  title: "RWA Garage",
  description: "Garage Management System",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="font-sans antialiased">
        {/* 🔥 BUNGKUS DI SINI */}
        <Providers>
          <SessionWatcher />
          {children}
        </Providers>

        {/* UI global */}
        <Toaster position="top-right" />
      </body>
    </html>
  );
}
