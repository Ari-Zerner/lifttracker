import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "@/components/AuthProvider";

export const metadata: Metadata = {
  title: "LiftTracker",
  description: "Track your workouts",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-gray-950 text-gray-100 min-h-screen">
        <AuthProvider>
          <nav className="border-b border-gray-800 px-6 py-4 flex items-center justify-between">
            <a href="/" className="text-xl font-bold tracking-tight">
              LiftTracker
            </a>
            <div className="flex gap-4 items-center">
              <a
                href="/workout"
                className="text-sm text-gray-400 hover:text-white transition"
              >
                Workout
              </a>
              <a
                href="/stats"
                className="text-sm text-gray-400 hover:text-white transition"
              >
                Stats
              </a>
              <AuthButton />
            </div>
          </nav>
          <main className="max-w-2xl mx-auto px-4 py-8">{children}</main>
        </AuthProvider>
      </body>
    </html>
  );
}

import { AuthButton } from "@/components/AuthButton";
