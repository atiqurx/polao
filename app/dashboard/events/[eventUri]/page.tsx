// app/dashboard/events/[eventUri]/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";

type ERArticle = {
  title: string;
  url: string;
  dateTimePub: string;
  image?: string;
  source?: { title?: string };
};

function domainFromUrl(u: string) {
  try {
    return new URL(u).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}

export default function EventPage() {
  const params = useParams<{ eventUri: string }>();
  const rawParam = params?.eventUri;
  const eventUri = decodeURIComponent(Array.isArray(rawParam) ? rawParam[0] : rawParam || "");

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
          nodeA?.event?.title?.eng ??
          nodeA?.info?.title?.eng ??
          nodeA?.articles?.results?.[0]?.title ??
          undefined;
        const maybeSummary =
          nodeA?.event?.summary?.eng ?? nodeA?.info?.summary?.eng ?? undefined;
        const maybeImg =
          nodeA?.event?.image ?? nodeA?.articles?.results?.[0]?.image ?? undefined;
        const maybeDate =
          nodeA?.event?.date ??
          nodeA?.info?.eventDate ??
          nodeA?.articles?.results?.[0]?.dateTimePub ??
          undefined;

        setEventMeta({
          title: maybeTitle,
          summary: maybeSummary,
          image: maybeImg,
          date: maybeDate,
        });
      } catch (err) {
        console.error(err);
        alert(String(err));
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
    <div>
      {/* Page header (inherits masthead + sidebar from layout) */}
      <div className="mb-6">
        <h1 className="font-serif text-3xl font-bold text-neutral-900">{pageTitle}</h1>
        {eventMeta.date && (
          <p className="mt-1 text-sm text-neutral-500">
            {new Date(eventMeta.date).toLocaleString()}
          </p>
        )}
      </div>

      {/* Uncropped hero: contain within max height */}
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

      {/* Articles */}
      <section>
        <h2 className="mb-4 font-serif text-2xl font-semibold text-neutral-900">
          Full Coverage
        </h2>

        {loading ? (
          <div className="py-16 text-center">
            <div className="mx-auto h-10 w-10 animate-spin rounded-full border-b-2 border-neutral-900" />
            <p className="mt-4 text-neutral-600">Loading articles…</p>
          </div>
        ) : articles.length ? (
          <ul className="grid gap-4">
            {articles.map((a, idx) => (
              <li key={idx} className="rounded-xl border bg-white p-4 shadow-sm transition-shadow hover:shadow">
                <div className="flex items-start gap-4">
                  {a.image && (
                    <img src={a.image} alt="" className="h-20 w-28 rounded object-cover" />
                  )}
                  <div className="flex-1">
                    <a
                      href={a.url}
                      target="_blank"
                      rel="noreferrer"
                      className="font-serif text-lg font-semibold text-neutral-900 hover:underline"
                    >
                      {a.title}
                    </a>
                    <div className="mt-1 text-xs text-neutral-500">
                      {a.source?.title || domainFromUrl(a.url)} •{" "}
                      {a.dateTimePub ? new Date(a.dateTimePub).toLocaleString() : ""}
                    </div>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-neutral-600">No articles found.</p>
        )}

        <p className="mt-6 text-xs text-neutral-400">Links open in a new tab.</p>
      </section>
    </div>
  );
}
