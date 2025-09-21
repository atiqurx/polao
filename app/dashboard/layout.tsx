import type { ReactNode } from "react";
import { Playfair_Display } from "next/font/google";

export const wsjLike = Playfair_Display({
  subsets: ["latin"],
  weight: ["700"],
  variable: "--font-wsj",
});

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    // Attach the font variable here so children can use it
    <div className={`${wsjLike.variable} min-h-screen bg-neutral-50`}>
      {/* Masthead */}

      {/* Page content */}
      <main className="mx-auto max-w-8xl px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>
    </div>
  );
}
