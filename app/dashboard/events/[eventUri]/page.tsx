// app/dashboard/events/[eventUri]/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import BiasDistribution from "@/components/BiasDistribution";

/* ---------- Types ---------- */
type ERArticle = {
  title: string;
  url: string;
  dateTimePub: string;
  image?: string;
  source?: { title?: string };
};

type BiasLabel = "LEFT" | "CENTER" | "RIGHT" | "Unknown";

/* ---------- Helpers ---------- */
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
    tone === "Unknown" ? "Center" : tone.charAt(0) + tone.slice(1).toLowerCase();
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

/* ---------- Article list ---------- */
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
        <li className="text-sm text-gray-500">No articles found.</li>
      )}
    </ul>
  );
}

/* ---------- Controls (Classification + Filters + Sort) ---------- */
function Controls({
  articles,
  onClassified,
}: {
  articles: ERArticle[];
  onClassified?: (arts: (ERArticle & { __bias?: BiasLabel })[]) => void;
}) {
  const [tab, setTab] = useState<"all" | "left" | "center" | "right">("all");
  const [sortMode, setSortMode] = useState<"relevancy" | "chrono">("relevancy");
  const [classifying, setClassifying] = useState(false);
  const [labeled, setLabeled] = useState<
    (ERArticle & { __bias?: BiasLabel })[]
  >([]);

  useEffect(() => {
    let cancelled = false;
    async function run() {
      setClassifying(true);
      try {
        const payload = {
          items: articles.map((a, i) => ({
            id: String(i),
            source: getSourceName(a),
            text: a.title,
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
          onClassified?.(merged);
        }
      } catch {
        if (!cancelled) {
          const fallback = articles.map((a) => ({
            ...a,
            __bias: "Unknown" as BiasLabel,
          }));
          setLabeled(fallback);
          onClassified?.(fallback);
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
    <div className="space-y-4">
      {labeled.length > 0 && (
        <BiasDistribution
          left={counts.left}
          center={counts.center}
          right={counts.right}
          unrated={unrated}
        />
      )}

      <div className="flex items-center gap-2">
        <button
          onClick={() => setTab("all")}
          className={`px-3 py-1.5 rounded-md text-sm border transition ${
            tab === "all"
              ? "bg-gray-900 text-white border-gray-900"
              : "bg-white text-gray-700 hover:bg-gray-100 border-gray-300"
          }`}
        >
          All {labeled.length}
        </button>
        <button
          onClick={() => setTab("left")}
          className={`px-3 py-1.5 rounded-md text-sm border transition ${
            tab === "left"
              ? "bg-gray-900 text-white border-gray-900"
              : "bg-white text-gray-700 hover:bg-gray-100 border-gray-300"
          }`}
        >
          Left {counts.left}
        </button>
        <button
          onClick={() => setTab("center")}
          className={`px-3 py-1.5 rounded-md text-sm border transition ${
            tab === "center"
              ? "bg-gray-900 text-white border-gray-900"
              : "bg-white text-gray-700 hover:bg-gray-100 border-gray-300"
          }`}
        >
          Center {counts.center}
        </button>
        <button
          onClick={() => setTab("right")}
          className={`px-3 py-1.5 rounded-md text-sm border transition ${
            tab === "right"
              ? "bg-gray-900 text-white border-gray-900"
              : "bg-white text-gray-700 hover:bg-gray-100 border-gray-300"
          }`}
        >
          Right {counts.right}
        </button>

        <div className="ml-auto flex gap-2">
          <button
            onClick={() => setSortMode("relevancy")}
            className={`px-3 py-1.5 rounded-md text-sm border transition ${
              sortMode === "relevancy"
                ? "bg-gray-900 text-white border-gray-900"
                : "bg-white text-gray-700 hover:bg-gray-100 border-gray-300"
            }`}
          >
            Relevancy
          </button>
          <button
            onClick={() => setSortMode("chrono")}
            className={`px-3 py-1.5 rounded-md text-sm border transition ${
              sortMode === "chrono"
                ? "bg-gray-900 text-white border-gray-900"
                : "bg-white text-gray-700 hover:bg-gray-100 border-gray-300"
            }`}
          >
            Chronological
          </button>
        </div>
      </div>

      {classifying && (
        <div className="text-xs text-gray-500">Classifying bias…</div>
      )}

      <ArticleList articles={view} />
      <p className="text-xs text-gray-400">Showing up to 10 articles.</p>
    </div>
  );
}

/* ---------- Page ---------- */
export default function EventPage() {
  const params = useParams<{ eventUri: string }>();
  const rawParam = params?.eventUri;
  const eventUri = decodeURIComponent(
    Array.isArray(rawParam) ? rawParam[0] : rawParam || ""
  );

  const [articles, setArticles] = useState<ERArticle[]>([]);
  const [loading, setLoading] = useState(false);
  const [eventMeta, setEventMeta] = useState<{
    title?: string;
    summary?: string;
    image?: string;
    date?: string;
  }>({});

  useEffect(() => {
    if (!eventUri) return;
    (async () => {
      setLoading(true);
      try {
        const res = await fetch(
          `/api/event-articles?eventUri=${encodeURIComponent(eventUri)}&page=1`,
          { cache: "no-store" }
        );
        const json = await res.json();

        const list: ERArticle[] =
          json?.results ??
          json?.erRaw?.[eventUri]?.articles?.results ??
          json?.erRaw?.articles?.results ??
          [];
        setArticles(list);

        const nodeA = json?.erRaw?.[eventUri] ?? json?.erRaw ?? {};
        const maybeTitle =
          nodeA?.event?.title?.eng ||
          nodeA?.info?.title?.eng ||
          list?.[0]?.title ||
          undefined;
        const maybeSummary =
          nodeA?.event?.summary?.eng || nodeA?.info?.summary?.eng || undefined;
        const maybeImg =
          nodeA?.event?.image || list?.[0]?.image || undefined;
        const maybeDate =
          nodeA?.event?.date ||
          nodeA?.info?.eventDate ||
          list?.[0]?.dateTimePub ||
          undefined;

        setEventMeta({
          title: maybeTitle,
          summary: maybeSummary,
          image: maybeImg,
          date: maybeDate,
        });
      } catch (err) {
        console.error(err);
        setArticles([]);
      } finally {
        setLoading(false);
      }
    })();
  }, [eventUri]);

  const pageTitle = useMemo(
    () => eventMeta.title || `Event: ${eventUri}`,
    [eventMeta.title, eventUri]
  );

  return (
    <div className="mx-auto max-w-5xl p-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="font-serif text-3xl font-bold text-neutral-900">
          {pageTitle}
        </h1>
        {eventMeta.date && (
          <p className="mt-1 text-sm text-neutral-500">
            {new Date(eventMeta.date).toLocaleString()}
          </p>
        )}
      </div>

      {/* Hero (uncropped image) */}
      {(eventMeta.summary || eventMeta.image) && (
        <div className="mb-8 overflow-hidden rounded-2xl border bg-white shadow-sm">
          {eventMeta.image && (
            <div className="flex items-center justify-center bg-neutral-100">
              <img
                src={eventMeta.image}
                alt=""
                className="mx-auto max-h-[460px] w-auto object-contain"
              />
            </div>
          )}
          {eventMeta.summary && (
            <p className="p-6 font-serif text-lg leading-relaxed text-neutral-800">
              {eventMeta.summary}
            </p>
          )}
        </div>
      )}

      {/* Bias analysis + articles */}
      <section>
        <h2 className="mb-4 font-serif text-2xl font-semibold text-neutral-900">
          Full Coverage (with bias breakdown)
        </h2>

        {loading ? (
          <div className="py-16 text-center">
            <div className="mx-auto h-10 w-10 animate-spin rounded-full border-b-2 border-neutral-900" />
            <p className="mt-4 text-neutral-600">Loading articles…</p>
          </div>
        ) : (
          <Controls
            articles={articles}
            onClassified={() => {
              /* no-op here; internal state handles rendering */
            }}
          />
        )}
      </section>
    </div>
  );
}
