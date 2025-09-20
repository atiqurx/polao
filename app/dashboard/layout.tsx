// app/dashboard/layout.tsx
import type { ReactNode } from "react";
import ChatbotSidebar from "../components/ChatbotSidebar";

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-neutral-50">
      {/* Masthead */}
      <header className="border-b bg-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex items-end justify-between py-6">
            <div>
              <p className="tracking-wide text-xs uppercase text-neutral-500">Polao</p>
              <h1 className="font-serif text-3xl sm:text-4xl font-bold text-neutral-900">
                Polao
              </h1>
              <p className="text-sm text-neutral-500">
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

      {/* Main layout: left content + persistent right sidebar */}
      <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* LEFT: page-specific content */}
          <section className="lg:col-span-8 xl:col-span-9">{children}</section>

          {/* RIGHT: persistent chatbot sidebar */}
          <aside className="lg:col-span-4 xl:col-span-3">
            <ChatbotSidebar mode="sidebar" />
          </aside>
        </div>
      </main>
    </div>
  );
}
