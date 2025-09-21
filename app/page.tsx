"use client";

import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  ShieldCheck,
  Sparkles,
  BarChart3,
  Globe2,
  Menu,
  X,
} from "lucide-react";
import React from "react";

export default function Page() {
  return (
    <div className="min-h-screen bg-white text-zinc-900">
      {/* light-theme button/link utilities */}
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
            box-shadow 150ms, transform 150ms;
        }
        .btn.primary {
          background: #0a0a0a; /* zinc-950-ish */
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
        .nav-link {
          font-size: 0.875rem;
          color: rgb(63 63 70); /* zinc-700 */
        }
        .nav-link:hover {
          color: rgb(24 24 27); /* zinc-900 */
        }
      `}</style>

      <Hero />
      <LogosStrip />
      <Features />
      <HowItWorks />
      <CTA />
      <SiteFooter />
    </div>
  );
}

function RiceLogo() {
  return (
    <div className="h-8 w-8 rounded-xl bg-[#2FB05C] grid place-items-center shadow-sm">
      {/* simplified rice grain */}
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

/* ------------------------------ HERO ------------------------------ */
function Hero() {
  return (
    <section className="relative overflow-hidden">
      <div className="mx-auto grid max-w-7xl grid-cols-1 items-center gap-10 px-4 py-14 sm:px-6 lg:grid-cols-2 lg:gap-14 lg:py-20">
        <div>
          <p className="mb-3 inline-flex items-center gap-2 rounded-full border border-zinc-200 bg-white px-3 py-1 text-xs font-medium text-zinc-600 shadow-sm">
            <Sparkles className="h-3.5 w-3.5" /> Bias-aware news, simplified
          </p>
          <h1 className="text-balance text-4xl font-semibold leading-[1.1] sm:text-5xl">
            See every side of the story—
            <span className="text-[#2FB05C]"> clearly</span>.
          </h1>
          <p className="mt-4 max-w-xl text-pretty text-base text-zinc-600">
            Polao clusters headlines and highlights framing so you can compare
            left, right, and center in one view. Log in to personalize topics
            and get a balanced daily digest.
          </p>
          <div className="mt-6 flex flex-wrap items-center gap-3">
            <Link href="/auth/login" className="btn primary group">
              Log in{" "}
              <ArrowRight className="ml-1 h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </Link>
            <a href="#features" className="btn ghost">
              Explore features
            </a>
          </div>

          <ul className="mt-6 grid grid-cols-2 gap-4 text-sm text-zinc-600 sm:max-w-md">
            <li className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-[#2FB05C]" /> Privacy-first
            </li>
            <li className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-[#2FB05C]" /> Bias support
              meter
            </li>
            <li className="flex items-center gap-2">
              <Globe2 className="h-4 w-4 text-[#2FB05C]" /> Global sources
            </li>
            <li className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-[#2FB05C]" /> AI summaries
            </li>
          </ul>
        </div>

        {/* Visual mock */}
        <div className="relative">
          <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-xl">
            <Image
              src="/polao.png"
              alt="Polao preview"
              width={1200}
              height={800}
              className="rounded-lg border border-zinc-200"
            />
          </div>
          <div className="pointer-events-none absolute -left-10 -top-10 h-40 w-40 rounded-full bg-[#2FB05C]/20 blur-3xl" />
          <div className="pointer-events-none absolute -right-16 -bottom-12 h-40 w-40 rounded-full bg-sky-400/20 blur-3xl" />
        </div>
      </div>
    </section>
  );
}

/* ------------------------------ LOGOS STRIP ------------------------------ */
function LogosStrip() {
  return (
    <section className="border-y border-zinc-200/70 bg-zinc-50">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-6 px-4 py-6 sm:px-6">
        <span className="text-xs uppercase tracking-wide text-zinc-500">
          Powered by
        </span>
        <div className="flex flex-wrap items-center gap-6 opacity-80">
          <Logo name="NewsAPI" />
          <Logo name="Mediastack" />
          <Logo name="Auth0" />
          <Logo name="Vercel" />
          <Logo name="OpenAI" />
        </div>
      </div>
    </section>
  );
}
function Logo({ name }: { name: string }) {
  return <div className="text-sm font-semibold text-zinc-600">{name}</div>;
}

/* ------------------------------ FEATURES ------------------------------ */
function Features() {
  const list = [
    {
      icon: <BarChart3 className="h-5 w-5" />,
      title: "Bias Support Meter",
      desc: "See the average lean across sources in each cluster—left, center, right.",
    },
    {
      icon: <Sparkles className="h-5 w-5" />,
      title: "Neutral & Counter-bias Summaries",
      desc: "Read a neutral synopsis and what each side would emphasize, with citations.",
    },
    {
      icon: <ShieldCheck className="h-5 w-5" />,
      title: "Framing Lens",
      desc: "Highlight loaded language and one-click neutralize headlines.",
    },
  ];

  return (
    <section id="features" className="py-16">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="mb-10 flex items-end justify-between">
          <div>
            <h2 className="text-2xl font-semibold">Why Polao?</h2>
            <p className="mt-2 max-w-2xl text-zinc-600">
              Compare perspectives without the noise. Polao organizes coverage
              and helps you spot framing in seconds.
            </p>
          </div>
          <a
            href="#how"
            className="hidden text-sm text-[#2FB05C] hover:underline md:inline"
          >
            See how it works →
          </a>
        </div>

        <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
          {list.map((f) => (
            <div
              key={f.title}
              className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm transition hover:shadow-md"
            >
              <div className="mb-3 inline-flex h-9 w-9 items-center justify-center rounded-lg bg-[#2FB05C]/15 text-[#2FB05C]">
                {f.icon}
              </div>
              <h3 className="text-lg font-semibold">{f.title}</h3>
              <p className="mt-1 text-sm text-zinc-600">{f.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ------------------------------ HOW IT WORKS ------------------------------ */
function HowItWorks() {
  const steps = [
    {
      n: 1,
      t: "Ingest & cluster",
      d: "We fetch articles from multiple APIs and group similar stories.",
    },
    {
      n: 2,
      t: "Score bias",
      d: "Combine source priors with article-level stance for a fair meter.",
    },
    {
      n: 3,
      t: "Summarize & highlight",
      d: "AI creates neutral and counter-bias views; Lens marks framing.",
    },
    {
      n: 4,
      t: "Personalize",
      d: "Log in to save topics and get a balanced daily digest.",
    },
  ];
  return (
    <section id="how" className="bg-zinc-50 py-16">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <h2 className="text-2xl font-semibold">How it works</h2>
        <div className="mt-8 grid grid-cols-1 gap-6 md:grid-cols-4">
          {steps.map((s) => (
            <div
              key={s.n}
              className="rounded-2xl border border-zinc-200 bg-white p-5"
            >
              <div className="mb-3 inline-flex h-8 w-8 items-center justify-center rounded-full bg-zinc-100 text-sm font-semibold text-zinc-700">
                {s.n}
              </div>
              <h3 className="font-semibold">{s.t}</h3>
              <p className="mt-1 text-sm text-zinc-600">{s.d}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ------------------------------ CTA ------------------------------ */
function CTA() {
  return (
    <section id="pricing" className="py-16">
      <div className="mx-auto max-w-5xl rounded-3xl border border-zinc-200 bg-gradient-to-br from-white to-zinc-50 p-8 text-center shadow-sm">
        <h3 className="text-2xl font-semibold">Ready for a balanced feed?</h3>
        <p className="mx-auto mt-2 max-w-2xl text-zinc-600">
          Log in to customize topics, set your bias-diet, and receive a daily
          recap with sources from across the spectrum.
        </p>
        <div className="mt-6 flex items-center justify-center gap-3">
          <Link href="/auth/login" className="btn primary">
            Log in
          </Link>
          <a href="#features" className="btn ghost">
            See features
          </a>
        </div>
      </div>
    </section>
  );
}

/* ------------------------------ FOOTER ------------------------------ */
function SiteFooter() {
  return (
    <footer className="border-t border-zinc-200 py-10 text-sm">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="flex flex-col items-center justify-between gap-6 md:flex-row">
          <div className="flex items-center gap-2">
            <RiceLogo />
            <span className="font-semibold">Polao</span>
          </div>
          <div className="flex flex-wrap items-center gap-4 text-zinc-600">
            <Link href="/privacy" className="hover:underline">
              Privacy
            </Link>
            <Link href="/terms" className="hover:underline">
              Terms
            </Link>
            <a href="#faq" className="hover:underline">
              FAQ
            </a>
            <span className="opacity-70">
              © {new Date().getFullYear()} Polao
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
}
