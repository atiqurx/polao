// app/dashboard/events/[eventUri]/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
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
    tone === "Unknown"
      ? "Center"
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

/* ---------- Article list ---------- */
function ArticleList({
  articles,
}: {
  articles: (ERArticle & { __bias?: BiasLabel })[];
}) {
  return (
    <ul className="space-y-3">
      {articles.map((a, idx) => (
        <li key={idx} className="rounded-lg p-3 bg-[#f7f6f2]">
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
              <div className="text-xs mt-1 text-black/70">
                <span className="font-semibold text-sm">
                  {a.source?.title || domainFromUrl(a.url)} •{" "}
                </span>
                <span className="text-gray-500 ">
                  {a.dateTimePub
                    ? new Date(a.dateTimePub).toLocaleString()
                    : ""}
                </span>
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

      <h2 className="font-serif text-2xl mt-8 mb-6 font-semibold text-gray-900">
        Story Coverage
      </h2>

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
function truncateToSentence(text: string, approx = 800) {
  if (!text) return "";

  // Work with a normalized copy for measuring; keep original for display
  const normalized = text.replace(/\s+/g, " ").trim();

  if (normalized.length <= approx) {
    // if it already ends with ".", keep it; otherwise add "...."
    if (/\.$/.test(normalized)) return normalized;
    return normalized
      .replace(/[!?…]+$/, "....")
      .replace(/[^.]$/, "$&" + "....");
  }

  // Split into sentences at ., !, ? followed by space
  const sentences = normalized.split(/(?<=[.!?])\s+/);
  let out = "";

  for (const s of sentences) {
    const next = out ? `${out} ${s}` : s;
    if (next.length > approx) break;
    out = next;
  }

  // If no complete sentence fit, cut at last period before approx
  if (!out) {
    const pre = normalized.slice(0, approx);
    const lastDot = pre.lastIndexOf(".");
    out = lastDot > 0 ? normalized.slice(0, lastDot + 1) : pre;
  }

  // End punctuation handling:
  // - if already ends with ".", keep it
  // - if ends with ! ? … or no terminal punctuation, add "...."
  out = out.trim();
  if (/\.$/.test(out)) return out;
  if (/[!?…]+$/.test(out)) return out.replace(/[!?…]+$/, "....");
  return /[.!?…]$/.test(out) ? out : out + "....";
}

/* ---------- Page ---------- */
export default function EventPage() {
  const params = useParams<{ eventUri: string }>();
  const rawParam = params?.eventUri;
  const eventUri = decodeURIComponent(
    Array.isArray(rawParam) ? rawParam[0] : rawParam || ""
  );

  // seed from URL
  const searchParams = useSearchParams();
  const initialTitle = searchParams.get("title") || undefined;
  const initialSummary = searchParams.get("summary") || undefined;
  const initialDate = searchParams.get("date") || undefined;
  const initialImage = searchParams.get("image") || undefined;

  const [articles, setArticles] = useState<ERArticle[]>([]);
  const [loading, setLoading] = useState(false);
  const [eventMeta, setEventMeta] = useState<{
    title?: string;
    summary?: string;
    image?: string;
    date?: string;
  }>({});

  // reset immediately when event changes (prevents flash)
  useEffect(() => {
    setEventMeta({
      title: initialTitle,
      summary: initialSummary,
      image: initialImage,
      date: initialDate,
    });
    setEventMeta({});
    setArticles([]);
  }, [eventUri, initialTitle, initialSummary, initialImage, initialDate]);

  // fetch + race guard + preserve values
  useEffect(() => {
    if (!eventUri) return;
    const ctrl = new AbortController();
    const current = eventUri;

    (async () => {
      setLoading(true);
      try {
        const res = await fetch(
          `/api/event-articles?eventUri=${encodeURIComponent(eventUri)}&page=1`,
          { cache: "no-store", signal: ctrl.signal }
        );
        const json = await res.json();

        const list: ERArticle[] =
          json?.results ??
          json?.erRaw?.[eventUri]?.articles?.results ??
          json?.erRaw?.articles?.results ??
          [];

        const node = json?.erRaw?.[eventUri] ?? json?.erRaw ?? {};

        const title =
          node?.event?.title?.eng ||
          node?.info?.title?.eng ||
          list?.[0]?.title ||
          initialTitle ||
          eventMeta.title;

        const summary =
          node?.event?.summary?.eng ||
          node?.info?.summary?.eng ||
          initialSummary ||
          eventMeta.summary;

        const image =
          node?.event?.image ||
          list?.[0]?.image ||
          initialImage ||
          eventMeta.image;

        const date =
          node?.event?.date ||
          node?.info?.eventDate ||
          list?.[0]?.dateTimePub ||
          initialDate ||
          eventMeta.date;

        if (!ctrl.signal.aborted && current === eventUri) {
          setArticles(list);
          setEventMeta({ title, summary, image, date });
        }
      } catch (e) {
        if (!ctrl.signal.aborted) {
          console.error(e);
          setArticles([]);
        }
      } finally {
        if (!ctrl.signal.aborted) setLoading(false);
      }
    })();

    return () => ctrl.abort();
  }, [eventUri]); // keep deps minimal

  const pageTitle = useMemo(
    () => eventMeta.title || ``,
    [eventMeta.title, eventUri]
  );
  // TEMP DEBUG — remove later
  const debugParams = useMemo(
    () => Object.fromEntries(Array.from(searchParams.entries())),
    [searchParams]
  );
  console.log("Event debug:", { eventUri, debugParams, eventMeta });

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
      {eventMeta.image && (
        <div className="mb-8 overflow-hidden bg-[#f7f6f2]">
          {eventMeta.image && (
            <div className="flex items-center justify-center bg-neutral-100">
              <img
                src={eventMeta.image}
                alt=""
                className="mx-auto max-h-[460px] w-auto object-contain"
              />
            </div>
          )}
        </div>
      )}
      {eventMeta.summary && (
        <section className="mb-8">
          <h2 className="font-serif text-2xl font-semibold text-neutral-900 mb-2">
            Summary
          </h2>
          <p className="p-6 text-lg leading-relaxed text-neutral-800 whitespace-pre-line">
            {truncateToSentence(eventMeta.summary, 800)}
          </p>
        </section>
      )}

      {/* Bias analysis + articles */}
      <section>
        <h2 className="mt-4 mb-4 font-serif text-2xl font-semibold text-neutral-900">
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
