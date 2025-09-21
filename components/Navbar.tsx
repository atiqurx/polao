"use client";

import React from "react";
import Link from "next/link";
import { Menu, X } from "lucide-react";

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

  return (
    <header className="sticky top-0 z-40 w-full border-b border-zinc-200 bg-white">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
        <Link href="/" className="flex items-center gap-2">
          <RiceLogo />
          <span className="text-lg text-black font-semibold tracking-tight">
            Polao
          </span>
        </Link>

        {/* Right-side actions */}
        <div className="hidden items-center gap-3 md:flex">
          <Link href="/about" className="btn ghost">
            About
          </Link>

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
        <button
          onClick={() => setOpen(!open)}
          className="md:hidden rounded-lg p-2 hover:bg-zinc-100"
          aria-label="Toggle menu"
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {/* Mobile sheet */}
      {open && (
        <div className="md:hidden border-t border-zinc-200">
          <div className="mx-auto max-w-7xl px-4 py-4 space-y-3">
            <div className="flex gap-3">
              <Link href="/about" className="btn ghost w-full">
                About
              </Link>
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
        </div>
      )}

      {/* Light theme button/link utilities (keep or move to globals.css) */}
      <style jsx global>{`
        .btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          border-radius: 0.75rem; /* rounded-xl */
          padding: 0.5rem 1rem; /* px-4 py-2 */
          font-size: 0.875rem; /* text-sm */
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
          border: 1px solid rgb(212 212 216); /* zinc-300 */
          color: rgb(39 39 42); /* zinc-800 */
          background: #fff;
        }
        .btn.ghost:hover {
          background: rgb(244 244 245); /* zinc-100 */
        }
      `}</style>
    </header>
  );
}

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
