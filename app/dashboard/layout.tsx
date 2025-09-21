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
      <header className="border-b bg-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          {/* Center the block */}
          <div className="flex flex-col items-center justify-center py-6 text-center">
            <div className="w-fit mx-auto text-center">
              <h1
                className="font-[var(--font-wsj)] text-3xl sm:text-5xl font-bold tracking-tight text-neutral-900 mt-2"
                style={{ letterSpacing: "0.68em" }} // or use Tailwind: tracking-[0.68em]
              >
                POLAO
              </h1>
              <p className="mt-1 text-xs text-neutral-500 pr-8">
                {new Date().toLocaleDateString("en-US", {
                  weekday: "long",
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </p>
            </div>
          </div>
        </div>
      </header>

      {/* Page content */}
      <main className="mx-auto max-w-8xl px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>
    </div>
  );
}
