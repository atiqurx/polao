// app/dashboard/page.tsx
"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import ChatbotSidebar from "../components/ChatbotSidebar";
import BiasDistribution from "@/components/BiasDistribution";

/* ---------- Types ---------- */
type EREvent = {
  uri: string;
  eventDate: string;
  totalArticleCount: number;
  title: Record<string, string>;
  summary?: Record<string, string>;
  images?: string[];
};

type ERArticle = {
  title: string;
  url: string;
  dateTimePub: string;
  image?: string;
  source?: { title?: string };
};

type BiasLabel = "LEFT" | "CENTER" | "RIGHT" | "Unknown";

/* ---------- Helpers ---------- */
function headline(ev: EREvent) {
  return ev.title?.eng || Object.values(ev.title || {})[0] || "Untitled event";
}

function domainFromUrl(u: string) {
  try {
    return new URL(u).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}

function getSourceName(a: ERArticle) {
  return a.source?.title || domainFromUrl(a.url);
}

function sortArticles(
  list: (ERArticle & { __bias?: BiasLabel })[],
  mode: "relevancy" | "chrono"
) {
  const copy = [...list];
  if (mode === "chrono") {
    copy.sort(
      (a, b) =>
        (new Date(b.dateTimePub).getTime() || 0) -
        (new Date(a.dateTimePub).getTime() || 0)
    );
  }
  return copy;
}

/* ---------- Bias Badge ---------- */
function BiasBadge({ label }: { label: BiasLabel }) {
  const tone = (label || "Unknown").toUpperCase() as BiasLabel;
  const color =
    tone === "LEFT"
      ? "bg-blue-600"
      : tone === "RIGHT"
      ? "bg-red-600"
      : tone === "CENTER"
      ? "bg-gray-700"
      : "bg-gray-400";
  const text =
    tone === "Unknown"
      ? "Center" // default to Center label for Unknown
      : tone.charAt(0) + tone.slice(1).toLowerCase();
  return (
    <span
      className={`inline-flex items-center px-2 py-1 rounded text-xs font-semibold text-white select-none ${color}`}
      aria-label={`Bias: ${text}`}
      title={`Bias: ${text}`}
    >
      {text}
    </span>
  );
}

/* ---------- List + Controls (for drawer) ---------- */
function ArticleList({
  articles,
}: {
  articles: (ERArticle & { __bias?: BiasLabel })[];
}) {
  return (
    <ul className="space-y-3">
      {articles.map((a, idx) => (
        <li key={idx} className="border rounded-lg p-3 bg-white">
          <div className="flex gap-3">
            {a.image && (
              <img
                src={a.image}
                alt=""
                className="w-24 h-16 object-cover rounded"
              />
            )}
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-3">
                <a
                  href={a.url}
                  target="_blank"
                  rel="noreferrer"
                  className="font-medium hover:underline line-clamp-2"
                >
                  {a.title}
                </a>
                <BiasBadge label={(a.__bias as BiasLabel) || "Unknown"} />
              </div>
              <div className="text-xs text-gray-500 mt-1">
                {a.source?.title || domainFromUrl(a.url)} •{" "}
                {a.dateTimePub ? new Date(a.dateTimePub).toLocaleString() : ""}
              </div>
            </div>
          </div>
        </li>
      ))}
      {articles.length === 0 && (
        <li className="text-sm text-gray-500">
          No articles found for this filter.
        </li>
      )}
    </ul>
  );
}

function Tab({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-1.5 rounded-md text-sm border transition ${
        active
          ? "bg-gray-900 text-white border-gray-900"
          : "bg-white text-gray-700 hover:bg-gray-100 border-gray-300"
      }`}
    >
      {label}
    </button>
  );
}

function SortButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-1.5 rounded-md text-sm border transition ${
        active
          ? "bg-gray-900 text-white border-gray-900"
          : "bg-white text-gray-700 hover:bg-gray-100 border-gray-300"
      }`}
    >
      {children}
    </button>
  );
}

function Controls({
  articles,
  onClassified,
}: {
  articles: ERArticle[];
  onClassified: (arts: (ERArticle & { __bias?: BiasLabel })[]) => void;
}) {
  const [tab, setTab] = useState<"all" | "left" | "center" | "right">("all");
  const [sortMode, setSortMode] = useState<"relevancy" | "chrono">("relevancy");
  const [classifying, setClassifying] = useState(false);
  const [labeled, setLabeled] = useState<
    (ERArticle & { __bias?: BiasLabel })[]
  >([]);

  // Run batch classification once when articles arrive
  useEffect(() => {
    let cancelled = false;
    async function run() {
      setClassifying(true);
      try {
        const payload = {
          items: articles.map((a, i) => ({
            id: String(i),
            source: getSourceName(a),
            text: a.title, // lightweight text for model fallback
          })),
        };
        const res = await fetch("/api/bias", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const json = await res.json();
        const merged: (ERArticle & { __bias?: BiasLabel })[] = articles.map(
          (a, i) => {
            const hit = json?.results?.find((r: any) => r.id === String(i));
            const label = (hit?.label as BiasLabel) || "Unknown";
            return { ...a, __bias: label };
          }
        );
        if (!cancelled) {
          setLabeled(merged);
          onClassified(merged);
        }
      } catch {
        if (!cancelled) {
          const fallback = articles.map((a) => ({
            ...a,
            __bias: "Unknown" as BiasLabel,
          }));
          setLabeled(fallback);
          onClassified(fallback);
        }
      } finally {
        if (!cancelled) setClassifying(false);
      }
    }
    if (articles.length) run();
    return () => {
      cancelled = true;
    };
  }, [articles, onClassified]);

  const counts = useMemo(() => {
    const c = { left: 0, center: 0, right: 0 };
    for (const a of labeled) {
      const b = (a.__bias || "Unknown").toUpperCase();
      if (b === "LEFT") c.left++;
      else if (b === "CENTER") c.center++;
      else if (b === "RIGHT") c.right++;
    }
    return c;
  }, [labeled]);

  const unrated = labeled.length - (counts.left + counts.center + counts.right);

  const view = useMemo(() => {
    const filtered = labeled.filter((a) => {
      if (tab === "all") return true;
      const b = (a.__bias || "Unknown").toUpperCase();
      return (
        (tab === "left" && b === "LEFT") ||
        (tab === "center" && b === "CENTER") ||
        (tab === "right" && b === "RIGHT")
      );
    });
    return sortArticles(filtered, sortMode);
  }, [labeled, tab, sortMode]);

  return (
    <div className="mb-3">
      {labeled.length > 0 && (
        <div className="mb-4">
          <BiasDistribution
            left={counts.left}
            center={counts.center}
            right={counts.right}
            unrated={unrated}
          />
        </div>
      )}

      <div className="flex items-center gap-2 mb-3">
        <Tab
          label={`All ${labeled.length}`}
          active={tab === "all"}
          onClick={() => setTab("all")}
        />
        <Tab
          label={`Left ${counts.left}`}
          active={tab === "left"}
          onClick={() => setTab("left")}
        />
        <Tab
          label={`Center ${counts.center}`}
          active={tab === "center"}
          onClick={() => setTab("center")}
        />
        <Tab
          label={`Right ${counts.right}`}
          active={tab === "right"}
          onClick={() => setTab("right")}
        />
        <div className="ml-auto flex gap-2">
          <SortButton
            active={sortMode === "relevancy"}
            onClick={() => setSortMode("relevancy")}
          >
            Relevancy
          </SortButton>
          <SortButton
            active={sortMode === "chrono"}
            onClick={() => setSortMode("chrono")}
          >
            Chronological
          </SortButton>
        </div>
      </div>

      {classifying && (
        <div className="text-xs text-gray-500 mb-2">Classifying bias…</div>
      )}

      <ArticleList articles={view} />
      <p className="text-xs text-gray-400 mt-3">Showing up to 10 articles.</p>
    </div>
  );
}

/* ---------- Page ---------- */
export default function Dashboard() {
  const [events, setEvents] = useState<EREvent[]>([]);
  const [ePage, setEPage] = useState(1);
  const [ePages, setEPages] = useState(1);
  const [loading, setLoading] = useState(false);

  // Drawer state
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selected, setSelected] = useState<EREvent | null>(null);
  const [articles, setArticles] = useState<ERArticle[]>([]);
  const [loadingArticles, setLoadingArticles] = useState(false);
  const [errorArticles, setErrorArticles] = useState<string | null>(null);

  async function loadEvents(page = 1) {
    setLoading(true);
    try {
      const res = await fetch(`/api/events?page=${page}&count=20`, { cache: "no-store" });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "Failed to load events");
      setEvents(json?.events?.results ?? []);
      setEPage(json?.events?.page ?? 1);
      setEPages(json?.events?.pages ?? 1);
    } catch (err) {
      console.error(err);
      setEvents([]);
      setEPage(1);
      setEPages(1);
    } finally {
      setLoading(false);
    }
  }

  async function loadArticles(eventUri: string) {
    setLoadingArticles(true);
    setErrorArticles(null);
    try {
      const res = await fetch(
        `/api/event-articles?eventUri=${encodeURIComponent(eventUri)}&page=1`,
        { cache: "no-store" }
      );
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "Failed to load articles");
      const list: ERArticle[] =
        json?.results ??
        json?.erRaw?.[eventUri]?.articles?.results ??
        json?.erRaw?.articles?.results ??
        [];
      setArticles(list);
    } catch (err: any) {
      setErrorArticles(String(err?.message || err));
      setArticles([]);
    } finally {
      setLoadingArticles(false);
    }
  }

  function openEvent(ev: EREvent) {
    setSelected(ev);
    setDrawerOpen(true);
    loadArticles(ev.uri);
  }

  useEffect(() => {
    loadEvents(1);
  }, []);

  // Pass headlines to chatbot for better suggestions/context
  const pageTitles: string[] = useMemo(
    () =>
      events
        .map((ev) => ev.title?.eng || Object.values(ev.title || {})[0] || "")
        .filter(Boolean),
    [events]
  );

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_340px] gap-8">
      {/* LEFT — Newspaper-style feed */}
      <section>
        {loading ? (
          <div className="py-16 text-center">
            <div className="mx-auto h-12 w-12 animate-spin rounded-full border-b-2 border-neutral-900" />
            <p className="mt-4 text-neutral-600">Loading latest events…</p>
          </div>
        ) : (
          <>
            {/* Featured story */}
            {events[0] && (
              <div className="group overflow-hidden rounded-2xl border bg-white shadow-sm transition-shadow hover:shadow">
                <div className="md:flex">
                  <div className="md:w-2/3">
                    <img
                      src={
                        events[0].images?.[0] ||
                        "https://images.unsplash.com/photo-1529101091764-c3526daf38fe?w=1200&h=630&fit=crop"
                      }
                      alt=""
                      className="h-64 w-full object-cover md:h-80"
                    />
                  </div>
                  <div className="md:w-1/3 p-6 flex flex-col justify-between">
                    <div>
                      <div className="mb-2 text-xs text-neutral-500">
                        {new Date(events[0].eventDate).toDateString()} •{" "}
                        {events[0].totalArticleCount ?? 0} articles
                      </div>
                      <h2 className="font-serif text-2xl font-semibold text-neutral-900">
                        <Link
                          href={`/dashboard/events/${encodeURIComponent(events[0].uri)}`}
                          className="group-hover:underline"
                        >
                          {headline(events[0])}
                        </Link>
                      </h2>
                      {events[0].summary?.eng && (
                        <p className="mt-2 leading-relaxed text-neutral-700 line-clamp-3">
                          {events[0].summary.eng}
                        </p>
                      )}
                    </div>
                    <div className="mt-4 flex items-center gap-3">
                      <Link
                        href={`/dashboard/events/${encodeURIComponent(events[0].uri)}`}
                        className="text-blue-700 font-medium"
                      >
                        Read full coverage →
                      </Link>
                      <button
                        onClick={() => openEvent(events[0]!)}
                        className="rounded border px-2 py-1 text-sm hover:bg-neutral-50"
                      >
                        Quick view
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Divider */}
            <div className="my-8 border-t border-neutral-200" />

            {/* Grid of stories */}
            <div className="grid gap-6 md:grid-cols-2">
              {events.slice(1).map((ev) => (
                <article
                  key={ev.uri}
                  className="group rounded-xl border bg-white p-5 shadow-sm transition-shadow hover:shadow"
                >
                  <div className="flex items-start gap-4">
                    {ev.images?.[0] && (
                      <img
                        src={ev.images[0]}
                        alt=""
                        className="h-24 w-36 rounded object-cover"
                      />
                    )}
                    <div className="flex-1">
                      <div className="text-[11px] uppercase tracking-wide text-neutral-500">
                        {new Date(ev.eventDate).toLocaleDateString()}
                      </div>
                      <h3 className="mt-1 font-serif text-xl font-semibold text-neutral-900">
                        <Link
                          href={`/dashboard/events/${encodeURIComponent(ev.uri)}`}
                          className="hover:underline"
                        >
                          {headline(ev)}
                        </Link>
                      </h3>
                      {ev.summary?.eng && (
                        <p className="mt-2 line-clamp-3 text-sm text-neutral-700">
                          {ev.summary.eng}
                        </p>
                      )}
                      <div className="mt-3 flex items-center gap-3">
                        <span className="text-xs text-neutral-500">
                          {ev.totalArticleCount ?? 0} articles
                        </span>
                        <button
                          onClick={() => openEvent(ev)}
                          className="rounded border px-2 py-1 text-xs hover:bg-neutral-50"
                        >
                          Quick view
                        </button>
                      </div>
                    </div>
                  </div>
                </article>
              ))}
            </div>

            {/* Pagination */}
            <div className="mt-10 flex items-center justify-center gap-2">
              <button
                className="rounded border bg-white px-3 py-1 hover:bg-neutral-50 disabled:opacity-50"
                onClick={() => loadEvents(ePage - 1)}
                disabled={ePage <= 1}
              >
                Previous
              </button>
              <span className="text-sm text-neutral-600">
                Page {ePage} / {ePages}
              </span>
              <button
                className="rounded border bg-white px-3 py-1 hover:bg-neutral-50 disabled:opacity-50"
                onClick={() => loadEvents(ePage + 1)}
                disabled={ePage >= ePages}
              >
                Next
              </button>
            </div>
          </>
        )}
      </section>

      {/* RIGHT — Always-on Chatbot */}
      <aside>
        <ChatbotSidebar
          articleTitles={pageTitles}
          heightClass="h-[clamp(420px,64vh,720px)]"
        />
      </aside>

      {/* Drawer for bias quick view */}
      {drawerOpen && selected && (
        <div
          className="fixed inset-0 bg-black/40 flex"
          onClick={() => setDrawerOpen(false)}
        >
          <div
            className="ml-auto h-full w-full max-w-3xl bg-white p-6 overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-xs text-gray-500">
                  {new Date(selected.eventDate).toLocaleString()} • {selected.uri}
                </div>
                <h2 className="text-lg font-semibold">{headline(selected)}</h2>
                {selected.summary?.eng && (
                  <p className="text-sm text-gray-700 mt-1">
                    {selected.summary.eng}
                  </p>
                )}
              </div>
              <button
                className="px-2 py-1 rounded border"
                onClick={() => setDrawerOpen(false)}
              >
                Close
              </button>
            </div>

            <div className="mt-4">
              {loadingArticles ? (
                <p>Loading articles…</p>
              ) : errorArticles ? (
                <p className="text-red-600 text-sm">Error: {errorArticles}</p>
              ) : (
                <Controls
                  articles={articles}
                  onClassified={() => {
                    /* no-op, already displayed via Controls state */
                  }}
                />
              )}
              <p className="mt-2 text-xs text-neutral-400">
                Links open in a new tab.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
