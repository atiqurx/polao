"use client";

import React from "react";
import Link from "next/link";
import { Menu, X } from "lucide-react";

/** Simple logo; keep or swap */
function RiceLogo() {
  return (
    <div className="h-8 w-8 rounded-xl bg-[#2FB05C] grid place-items-center shadow-sm">
      <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden>
        <defs>
          <linearGradient
            id="g"
            x1="4"
            y1="6"
            x2="18"
            y2="20"
            gradientUnits="userSpaceOnUse"
          >
            <stop offset="0" stopColor="#fff" />
            <stop offset="1" stopColor="#f3f0e8" />
          </linearGradient>
        </defs>
        <ellipse
          cx="12"
          cy="12"
          rx="6.5"
          ry="9"
          fill="url(#g)"
          transform="rotate(15 12 12)"
        />
        <path
          d="M15 7c1.3 1.2 1.8 3 1.2 4.4-.7 1.5-2.5 2.4-3.9 1.6-.3-.2-.5-.6-.4-1 0-1.2 1.7-3.1 3.1-4.9z"
          fill="#fff"
          opacity=".7"
        />
      </svg>
    </div>
  );
}

export default function Navbar() {
  const [open, setOpen] = React.useState(false);
  const [user, setUser] = React.useState<{
    name?: string;
    email?: string;
    picture?: string;
  } | null>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await fetch("/auth/profile", {
          headers: { Accept: "application/json" },
          cache: "no-store",
        });
        const data = res.ok ? await res.json() : null;
        if (alive) setUser(data || null);
      } catch {
        if (alive) setUser(null);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  const loginHref = "/auth/login?returnTo=/dashboard";
  const logoutHref = "/auth/logout";
  const profileHref = "/dashboard";

  const today = React.useMemo(
    () =>
      new Date().toLocaleDateString("en-US", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      }),
    []
  );

  return (
    <header className="sticky top-0 z-40 w-full border-b border-zinc-200 bg-white">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Row: left logo, center masthead, right actions */}
        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 py-3">
          {/* Left: logo/home */}
          <div className="flex items-center">
            <Link href="/" className="flex items-center gap-2"></Link>
          </div>

          {/* Center: WSJ-style masthead */}
          <div className="text-center">
            <h1
              className="font-serif text-3xl sm:text-5xl font-bold tracking-tight text-neutral-900 mt-2"
              style={{ letterSpacing: "0.68em" }} // or use Tailwind: tracking-[0.68em]
            >
              POLAO
            </h1>
            <p className="mt-1 text-[11px] sm:text-xs text-neutral-500">
              {today}
            </p>
          </div>

          {/* Right: actions */}
          <div className="hidden md:flex items-center justify-end gap-3">
            {loading ? null : !user ? (
              <a href={loginHref} className="btn primary">
                Log in
              </a>
            ) : (
              <>
                <Link href={profileHref} className="btn ghost">
                  {user.picture ? (
                    <span className="inline-flex items-center gap-2">
                      <img
                        src={user.picture}
                        alt="avatar"
                        className="h-5 w-5 rounded-full"
                      />
                      <span>Profile</span>
                    </span>
                  ) : (
                    "Profile"
                  )}
                </Link>
                <a href={logoutHref} className="btn primary">
                  Log out
                </a>
              </>
            )}
          </div>

          {/* Mobile menu toggle */}
          <div className="flex md:hidden justify-end">
            <button
              onClick={() => setOpen((v) => !v)}
              className="rounded-lg p-2 hover:bg-zinc-100"
              aria-label="Toggle menu"
            >
              {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>

        {/* Mobile sheet */}
        {open && (
          <div className="md:hidden border-t border-zinc-200 py-4">
            <div className="flex gap-3">
              {!user ? (
                <a href={loginHref} className="btn primary w-full">
                  Log in
                </a>
              ) : (
                <>
                  <Link href={profileHref} className="btn ghost w-full">
                    Profile
                  </Link>
                  <a href={logoutHref} className="btn primary w-full">
                    Log out
                  </a>
                </>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Light button styles (can move to globals.css) */}
      <style jsx global>{`
        .btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          border-radius: 0.75rem;
          padding: 0.5rem 1rem;
          font-size: 0.875rem;
          font-weight: 500;
          transition: background-color 150ms, color 150ms, border-color 150ms,
            box-shadow 150ms;
        }
        .btn.primary {
          background: #0a0a0a;
          color: #fff;
        }
        .btn.primary:hover {
          background: #000;
        }
        .btn.ghost {
          border: 1px solid rgb(212 212 216);
          color: rgb(39 39 42);
          background: #fff;
        }
        .btn.ghost:hover {
          background: rgb(244 244 245);
        }
      `}</style>
    </header>
  );
}
