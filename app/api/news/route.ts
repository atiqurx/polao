// /app/api/news/route.ts
import { NextResponse } from "next/server";

const ER = {
  GET_EVENTS: "https://eventregistry.org/api/v1/event/getEvents",
  GET_EVENT: "https://eventregistry.org/api/v1/event/getEvent",
  GET_EVENT_ARTICLES:
    "https://eventregistry.org/api/v1/event/getArticlesForEvent",
  GET_ARTICLES: "https://eventregistry.org/api/v1/article/getArticles",
};

const CATEGORY_MAP: Record<string, string> = {
  politics: "dmoz/Society/Politics",
  business: "dmoz/Business",
  technology: "dmoz/Computers",
  science: "dmoz/Science",
  health: "dmoz/Health",
  sports: "dmoz/Sports",
  entertainment: "dmoz/Arts",
};

function firstText(obj: any): string {
  if (!obj || typeof obj !== "object") return "";
  if (obj.eng) return obj.eng;
  const k = Object.keys(obj)[0];
  return k ? obj[k] : "";
}

async function postJson(url: string, body: any) {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  if (!res.ok) {
    console.error(`[ER] ${url} ${res.status}: ${text.slice(0, 800)}`);
    throw new Error(`ER ${url} failed ${res.status}`);
  }
  try {
    return JSON.parse(text);
  } catch (e) {
    console.error(`[ER] JSON parse failed for ${url}:`, text.slice(0, 800));
    throw e;
  }
}

type WireArticle = {
  title: string;
  url: string;
  source: string;
  publishedAt: string;
  image?: string;
  description?: string;
};

function normalizeArticles(items: any[]): WireArticle[] {
  return (items || []).map((a: any) => ({
    title: firstText(a.title) || a.title || "",
    url: a.url,
    source: a.source?.title || a.source?.uri || a.source || "",
    publishedAt: a.dateTime || a.date || "",
    image: a.image || a.thumbnail || "",
    description: firstText(a.body) || a.body || "",
  }));
}

/** Strategy A: article/getArticles filtered by eventUri (works across most plans) */
async function fetchByArticleGetArticles(eventUri: string, count: number) {
  const body = {
    apiKey: process.env.EVENT_REGISTRY_API_KEY,
    // IMPORTANT: filter by eventUri
    query: { eventUri },
    resultType: "articles",
    // For this endpoint, **include*** (no "articles" prefix)
    articlesPage: 1,
    articlesCount: count,
    articlesSortBy: "date",
    articleBodyLen: -1,
    includeArticleImage: true,
    includeArticleBasicInfo: true,
    includeSourceInfo: true,
    // English first — this param is accepted here
    lang: "eng",
  };

  console.log(`[news] TRY A article/getArticles eventUri=${eventUri}`);
  const json = await postJson(ER.GET_ARTICLES, body);
  console.log(`[news] A keys: ${Object.keys(json || {}).join(", ")}`);

  // Most accounts return { articles: { results: [...] } }
  let items = json?.articles?.results;
  if (!Array.isArray(items)) {
    // some return { results: [...] }
    items = json?.results;
  }
  const n = items?.length || 0;
  console.log(`[news] A items: ${n}`);
  if (n) {
    const arts = normalizeArticles(items);
    console.log(
      `[news] A sample:`,
      arts
        .slice(0, 3)
        .map((x) => `${x.source} | ${x.title}`)
        .join(" || ")
    );
    return arts;
  }
  return [];
}

/** Strategy B: event/getArticlesForEvent (some plans allow it) */
async function fetchByGetArticlesForEvent(eventUri: string, count: number) {
  const body = {
    apiKey: process.env.EVENT_REGISTRY_API_KEY,
    eventUri,
    articlesPage: 1,
    articlesCount: count,
    articlesSortBy: "date",
    articlesArticleBodyLen: -1,
    articlesIncludeArticleImage: true,
    articlesIncludeArticleBasicInfo: true,
    articlesIncludeSourceInfo: true,
    articlesLang: "eng",
  };
  console.log(`[news] TRY B getArticlesForEvent ${eventUri}`);
  const json = await postJson(ER.GET_EVENT_ARTICLES, body);
  console.log(`[news] B keys: ${Object.keys(json || {}).join(", ")}`);
  const items = json?.articles?.results ?? json?.results ?? [];
  const n = items?.length || 0;
  console.log(`[news] B items: ${n}`);
  if (n) {
    const arts = normalizeArticles(items);
    console.log(
      `[news] B sample:`,
      arts
        .slice(0, 3)
        .map((x) => `${x.source} | ${x.title}`)
        .join(" || ")
    );
    return arts;
  }
  return [];
}

/** Strategy C: event/getEvent (embed articles; some accounts) */
async function fetchByGetEvent(eventUri: string, count: number) {
  // Try with "articles*" flags
  let body: any = {
    apiKey: process.env.EVENT_REGISTRY_API_KEY,
    eventUri,
    resultType: "event",
    articlesPage: 1,
    articlesCount: count,
    articlesSortBy: "date",
    articlesArticleBodyLen: -1,
    articlesIncludeArticleImage: true,
    articlesIncludeArticleBasicInfo: true,
    articlesIncludeSourceInfo: true,
    articlesLang: "eng",
  };
  console.log(`[news] TRY C1 getEvent ${eventUri} (articles* flags)`);
  let json = await postJson(ER.GET_EVENT, body);
  console.log(
    `[news] C1 keys: ${Object.keys(json || {}).join(
      ", "
    )}; event keys: ${Object.keys(json?.event || {}).join(", ")}`
  );
  let items =
    json?.event?.articles?.results ??
    json?.articles?.results ??
    json?.event?.info?.articles?.results ??
    [];
  if (!items?.length) {
    // Try with "include*" flags (older shape)
    console.log(`[news] C1 no items → TRY C2 getEvent include* flags`);
    body = {
      apiKey: process.env.EVENT_REGISTRY_API_KEY,
      eventUri,
      resultType: "event",
      articlesPage: 1,
      articlesCount: count,
      articlesSortBy: "date",
      articleBodyLen: -1,
      includeArticleImage: true,
      includeArticleBasicInfo: true,
      includeSourceInfo: true,
      lang: "eng",
    };
    json = await postJson(ER.GET_EVENT, body);
    console.log(
      `[news] C2 keys: ${Object.keys(json || {}).join(
        ", "
      )}; event keys: ${Object.keys(json?.event || {}).join(", ")}`
    );
    items =
      json?.event?.articles?.results ??
      json?.articles?.results ??
      json?.event?.info?.articles?.results ??
      [];
  }
  const n = items?.length || 0;
  console.log(`[news] C items: ${n}`);
  if (n) {
    const arts = normalizeArticles(items);
    console.log(
      `[news] C sample:`,
      arts
        .slice(0, 3)
        .map((x) => `${x.source} | ${x.title}`)
        .join(" || ")
    );
    return arts;
  }
  return [];
}

async function fetchCoverage(eventUri: string, count: number) {
  // Try A → B → C
  try {
    const A = await fetchByArticleGetArticles(eventUri, count);
    if (A.length) return A;
  } catch (e: any) {
    console.warn(`[news] A failed: ${e.message}`);
  }
  try {
    const B = await fetchByGetArticlesForEvent(eventUri, count);
    if (B.length) return B;
  } catch (e: any) {
    console.warn(`[news] B failed: ${e.message}`);
  }
  try {
    const C = await fetchByGetEvent(eventUri, count);
    if (C.length) return C;
  } catch (e: any) {
    console.warn(`[news] C failed: ${e.message}`);
  }
  console.warn(`[news] No coverage for ${eventUri}`);
  return [];
}

async function mapWithLimit<T, R>(
  items: T[],
  limit: number,
  fn: (t: T, i: number) => Promise<R>
): Promise<R[]> {
  const ret: R[] = new Array(items.length);
  let i = 0;
  const workers = new Array(Math.min(limit, items.length))
    .fill(0)
    .map(async () => {
      while (i < items.length) {
        const idx = i++;
        try {
          ret[idx] = await fn(items[idx], idx);
        } catch (e) {
          console.error(`[news] worker failed idx=${idx}:`, e);
          // @ts-ignore
          ret[idx] = [];
        }
      }
    });
  await Promise.all(workers);
  return ret;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q");
  const category = searchParams.get("category");
  const limit = parseInt(searchParams.get("limit") || "10", 10);

  if (!process.env.EVENT_REGISTRY_API_KEY) {
    console.error("[news] Missing EVENT_REGISTRY_API_KEY");
  }

  try {
    console.log(
      `[news] getEvents limit=${limit} q=${q ?? "-"} category=${
        category ?? "-"
      }`
    );
    const eventsJson = await postJson(ER.GET_EVENTS, {
      apiKey: process.env.EVENT_REGISTRY_API_KEY,
      lang: "eng",
      sortBy: "date",
      maxItems: limit,
      locationUri: "http://en.wikipedia.org/wiki/United_States",
      ...(q ? { keyword: q } : {}),
      ...(category && category !== "latest" && CATEGORY_MAP[category]
        ? { categoryUri: CATEGORY_MAP[category] }
        : {}),
    });

    console.log(
      `[news] getEvents keys: ${Object.keys(eventsJson || {}).join(", ")}`
    );
    const rawEvents = eventsJson?.events?.results || [];
    console.log(`[news] events fetched: ${rawEvents.length}`);

    const clusters = rawEvents.map((e: any, idx: number) => {
      const c = {
        id: e.uri,
        headline: e.title?.eng || "",
        summary: e.summary?.eng || "",
        publishedAt: e.eventDate,
        totalArticles:
          (e.articleCounts && e.articleCounts.eng) ?? e.totalArticleCount ?? 0,
        concepts: (e.concepts || [])
          .map((c: any) => c.label?.eng || "")
          .filter(Boolean),
        articles: [] as WireArticle[],
      };
      console.log(
        `[news] #${idx} uri=${c.id} totalArticles=${
          c.totalArticles
        } headline="${c.headline.slice(0, 80)}"`
      );
      return c;
    });

    // Fetch coverage with concurrency limit
    const perEventArticles = await mapWithLimit(clusters, 4, (c: any) =>
      fetchCoverage(c.id, Math.min(Math.max(c.totalArticles || 0, 1), 12))
    );

    clusters.forEach((c: any, i: any) => {
      c.articles = perEventArticles[i] || [];
      console.log(
        `[news] attach articles to ${c.id}: ${c.articles.length} items`
      );
    });

    console.log(`[news] done, returning ${clusters.length} clusters`);
    return NextResponse.json({ clusters });
  } catch (err: any) {
    console.error("[news] API error:", err);
    return NextResponse.json(
      { error: "Event Registry fetch failed", details: err.message },
      { status: 500 }
    );
  }
}
