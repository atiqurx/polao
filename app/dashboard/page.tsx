// app/dashboard/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";

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
const CATEGORIES = [
  { key: "latest", label: "Latest" },
  { key: "politics", label: "Politics" },
  { key: "economy", label: "Economy" },
  { key: "finance", label: "Finance" },
  { key: "business", label: "Business" },
  { key: "technology", label: "Technology" },
  { key: "immigration", label: "Immigration" },
];

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

/* ---------- Controls + List ---------- */
function ArticleList({
  articles,
}: {
  articles: (ERArticle & { __bias?: BiasLabel })[];
}) {
  return (
    <ul className="space-y-3">
      {articles.map((a, idx) => (
        <li key={idx} className="border rounded-lg p-3">
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
  const [hidePaywalls, setHidePaywalls] = useState(false); // placeholder
  const [tab, setTab] = useState<"all" | "left" | "center" | "right">("all");
  const [sortMode, setSortMode] = useState<"relevancy" | "chrono">("relevancy");
  const [classifying, setClassifying] = useState(false);
  const [labeled, setLabeled] = useState<
    (ERArticle & { __bias?: BiasLabel })[]
  >([]);

  // Run batch classification (source map first, python fallback) once when articles arrive
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
    run();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [articles.length]);

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
      <div className="flex items-center justify-between mb-3">
        <div className="text-lg font-semibold">Story Coverage</div>
        <label className="flex items-center gap-2 text-sm text-gray-600 select-none">
          <span>Hide paywalls</span>
          <input
            type="checkbox"
            className="h-4 w-4"
            checked={hidePaywalls}
            onChange={(e) => setHidePaywalls(e.target.checked)}
          />
        </label>
      </div>

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
  const searchParams = useSearchParams();
  const router = useRouter();

  const initialCat = (searchParams.get("category") ?? "latest").toLowerCase();
  const [category, setCategory] = useState(initialCat);
  const [events, setEvents] = useState<EREvent[]>([]);
  const [ePage, setEPage] = useState(1);
  const [ePages, setEPages] = useState(1);
  const [loadingEvents, setLoadingEvents] = useState(false);
  const [errorEvents, setErrorEvents] = useState<string | null>(null);

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selected, setSelected] = useState<EREvent | null>(null);
  const [articles, setArticles] = useState<ERArticle[]>([]);
  const [loadingArticles, setLoadingArticles] = useState(false);
  const [errorArticles, setErrorArticles] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("category", category);
    router.replace(`/dashboard?${params.toString()}`, { scroll: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [category]);

  async function loadEvents(page = 1, cat = category) {
    setLoadingEvents(true);
    setErrorEvents(null);
    try {
      const res = await fetch(
        `/api/events?category=${encodeURIComponent(cat)}&page=${page}&count=20`,
        { cache: "no-store" }
      );
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "Failed to load events");
      const list: EREvent[] = json?.events?.results ?? [];
      setEvents(list);
      setEPage(json?.events?.page ?? 1);
      setEPages(json?.events?.pages ?? 1);
    } catch (err: any) {
      setErrorEvents(String(err?.message || err));
      setEvents([]);
      setEPage(1);
      setEPages(1);
    } finally {
      setLoadingEvents(false);
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
    loadEvents(1, initialCat);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (category !== initialCat) loadEvents(1, category);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [category]);

  const headerTitle = useMemo(() => {
    const item = CATEGORIES.find((c) => c.key === category);
    return item ? item.label : "Latest";
  }, [category]);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top bar */}
      <header className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-xl font-bold text-gray-900">Polao</span>
            <span className="text-sm text-gray-500">US News • Bias-aware</span>
          </div>
          <nav className="flex gap-2">
            {CATEGORIES.map((c) => (
              <button
                key={c.key}
                onClick={() => setCategory(c.key)}
                className={`px-3 py-1.5 rounded-md text-sm border transition ${
                  category === c.key
                    ? "bg-blue-600 text-white border-blue-600"
                    : "bg-white text-gray-700 hover:bg-gray-100 border-gray-200"
                }`}
              >
                {c.label}
              </button>
            ))}
          </nav>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="mb-4">
          <h1 className="text-2xl font-semibold text-gray-900">
            {headerTitle}
          </h1>
          <p className="text-sm text-gray-500">
            Events from the last 31 days • English • United States
          </p>
        </div>

        {/* Events */}
        {loadingEvents ? (
          <div className="text-gray-600">Loading events…</div>
        ) : errorEvents ? (
          <div className="text-red-600 text-sm">Error: {errorEvents}</div>
        ) : (
          <ul className="grid md:grid-cols-2 gap-4">
            {events.map((ev) => (
              <li
                key={ev.uri}
                className="bg-white border rounded-xl p-4 hover:shadow cursor-pointer"
                onClick={() => openEvent(ev)}
              >
                <div className="flex gap-4">
                  {ev.images?.[0] && (
                    <img
                      src={ev.images[0]}
                      alt=""
                      className="w-28 h-20 object-cover rounded-md"
                    />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="text-xs text-gray-500">
                      {new Date(ev.eventDate).toDateString()} • {ev.uri}
                    </div>
                    <h2 className="font-semibold text-gray-900 truncate">
                      {ev.title?.eng || Object.values(ev.title || {})[0]}
                    </h2>
                    {ev.summary?.eng && (
                      <p className="text-sm text-gray-700 line-clamp-2 mt-1">
                        {ev.summary.eng}
                      </p>
                    )}
                    <div className="text-xs text-gray-500 mt-1">
                      {ev.totalArticleCount ?? 0} articles
                    </div>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}

        {/* Pagination */}
        <div className="mt-6 flex gap-2">
          <button
            className="px-3 py-1 rounded border disabled:opacity-50"
            onClick={() => loadEvents(ePage - 1)}
            disabled={ePage <= 1 || loadingEvents}
          >
            Prev
          </button>
          <span className="text-sm self-center">
            Page {ePage} / {ePages}
          </span>
          <button
            className="px-3 py-1 rounded border disabled:opacity-50"
            onClick={() => loadEvents(ePage + 1)}
            disabled={ePage >= ePages || loadingEvents}
          >
            Next
          </button>
        </div>
      </main>

      {/* Drawer */}
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
                  {selected.eventDate} • {selected.uri}
                </div>
                <h2 className="text-lg font-semibold">
                  {selected.title?.eng || ""}
                </h2>
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
                <>
                  <Controls
                    articles={articles}
                    onClassified={(withBias) => setArticles(withBias)}
                  />
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
