// app/dashboard/page.tsx
"use client";

import { useEffect, useState } from "react";

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

function domainFromUrl(u: string) {
  try {
    return new URL(u).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}

export default function Dashboard() {
  const [events, setEvents] = useState<EREvent[]>([]);
  const [ePage, setEPage] = useState(1);
  const [ePages, setEPages] = useState(1);
  const [loadingEvents, setLoadingEvents] = useState(false);

  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<EREvent | null>(null);
  const [articles, setArticles] = useState<ERArticle[]>([]);
  const [loadingArticles, setLoadingArticles] = useState(false);

  async function loadEvents(page = 1) {
    setLoadingEvents(true);
    try {
      const res = await fetch(`/api/events?page=${page}&count=20`);
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "events failed");
      const list: EREvent[] = json?.events?.results ?? [];
      setEvents(list);
      setEPage(json?.events?.page ?? 1);
      setEPages(json?.events?.pages ?? 1);
    } catch (err) {
      console.error(err);
      alert(String(err));
    } finally {
      setLoadingEvents(false);
    }
  }

  async function loadArticles(eventUri: string) {
    setLoadingArticles(true);
    try {
      const res = await fetch(
        `/api/event-articles?eventUri=${encodeURIComponent(eventUri)}&page=1`,
        {
          cache: "no-store",
        }
      );
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "articles failed");

      // We normalized to `results` on the server, but keep a fallback just in case.
      const list: ERArticle[] =
        json?.results ??
        json?.erRaw?.[eventUri]?.articles?.results ??
        json?.erRaw?.articles?.results ??
        [];

      setArticles(list);
    } catch (err) {
      console.error(err);
      alert(String(err));
    } finally {
      setLoadingArticles(false);
    }
  }

  function openEvent(ev: EREvent) {
    setSelected(ev);
    setOpen(true);
    loadArticles(ev.uri);
  }

  useEffect(() => {
    loadEvents(1);
  }, []);

  return (
    <div className="mx-auto max-w-5xl p-6">
      <h1 className="text-2xl font-bold mb-4">US Politics — Events</h1>

      {loadingEvents ? (
        <p>Loading events…</p>
      ) : (
        <ul className="grid gap-4">
          {events.map((ev) => (
            <li
              key={ev.uri}
              className="rounded-xl border p-4 hover:shadow cursor-pointer"
              onClick={() => openEvent(ev)}
            >
              <div className="flex items-start gap-4">
                {ev.images?.[0] && (
                  <img
                    src={ev.images[0]}
                    alt=""
                    className="w-24 h-16 object-cover rounded"
                  />
                )}
                <div className="flex-1">
                  <div className="text-xs text-gray-500">
                    {new Date(ev.eventDate).toDateString()} • {ev.uri}
                  </div>
                  <h2 className="font-semibold">
                    {ev.title?.eng || Object.values(ev.title || {})[0]}
                  </h2>
                  {ev.summary?.eng && (
                    <p className="text-sm text-gray-700 mt-1 line-clamp-2">
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

      <div className="mt-6 flex gap-2">
        <button
          className="px-3 py-1 rounded border disabled:opacity-50"
          onClick={() => loadEvents(ePage - 1)}
          disabled={ePage <= 1}
        >
          Prev
        </button>
        <span className="text-sm self-center">
          Page {ePage} / {ePages}
        </span>
        <button
          className="px-3 py-1 rounded border disabled:opacity-50"
          onClick={() => loadEvents(ePage + 1)}
          disabled={ePage >= ePages}
        >
          Next
        </button>
      </div>

      {/* Drawer */}
      {open && selected && (
        <div
          className="fixed inset-0 bg-black/40 flex"
          onClick={() => setOpen(false)}
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
                onClick={() => setOpen(false)}
              >
                Close
              </button>
            </div>

            <div className="mt-4">
              {loadingArticles ? (
                <p>Loading articles…</p>
              ) : (
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
                        <div className="flex-1">
                          <a
                            href={a.url}
                            target="_blank"
                            rel="noreferrer"
                            className="font-medium hover:underline"
                          >
                            {a.title}
                          </a>
                          <div className="text-xs text-gray-500 mt-1">
                            {a.source?.title || domainFromUrl(a.url)} •{" "}
                            {a.dateTimePub
                              ? new Date(a.dateTimePub).toLocaleString()
                              : ""}
                          </div>
                        </div>
                      </div>
                    </li>
                  ))}
                  {articles.length === 0 && (
                    <li className="text-sm text-gray-500">
                      No articles found for this event.
                    </li>
                  )}
                </ul>
              )}
              <p className="text-xs text-gray-400 mt-3">
                Showing up to 10 articles.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
