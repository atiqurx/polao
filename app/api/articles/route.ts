// /app/api/articles/route.ts
import { NextResponse } from "next/server";

const ER = {
  GET_EVENT: "https://eventregistry.org/api/v1/event/getEvent",
  GET_EVENT_ARTICLES:
    "https://eventregistry.org/api/v1/event/getArticlesForEvent",
  GET_ARTICLES: "https://eventregistry.org/api/v1/article/getArticles",
};

function firstText(obj: any): string {
  if (!obj || typeof obj !== "object") return "";
  if (obj.eng) return obj.eng;
  const k = Object.keys(obj)[0];
  return k ? obj[k] : "";
}
function normalize(items: any[]) {
  return (items || []).map((a: any) => ({
    title: firstText(a.title) || a.title || "",
    url: a.url,
    source: a.source?.title || a.source?.uri || a.source || "",
    publishedAt: a.dateTime || a.date || "",
    image: a.image || a.thumbnail || "",
    description: firstText(a.body) || a.body || "",
  }));
}
async function postJson(url: string, body: any) {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  if (!res.ok) {
    console.error(`[articles] ${url} ${res.status}: ${text.slice(0, 800)}`);
    throw new Error(`ER ${url} failed ${res.status}`);
  }
  return JSON.parse(text);
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const eventUri = searchParams.get("eventUri")!;
  const count = Math.min(
    Math.max(parseInt(searchParams.get("count") || "12", 10), 1),
    50
  );

  try {
    console.log(`[articles] START ${eventUri} count=${count}`);

    // A) article/getArticles
    try {
      const a = await postJson(ER.GET_ARTICLES, {
        apiKey: process.env.EVENT_REGISTRY_API_KEY,
        query: { eventUri },
        resultType: "articles",
        articlesPage: 1,
        articlesCount: count,
        articlesSortBy: "date",
        articleBodyLen: -1,
        includeArticleImage: true,
        includeArticleBasicInfo: true,
        includeSourceInfo: true,
        lang: "eng",
      });
      console.log(`[articles] A keys: ${Object.keys(a || {}).join(", ")}`);
      let items = a?.articles?.results ?? a?.results ?? [];
      console.log(`[articles] A items: ${items?.length || 0}`);
      if (items?.length) {
        const arts = normalize(items);
        console.log(
          `[articles] A sample:`,
          arts
            .slice(0, 3)
            .map((x) => `${x.source} | ${x.title}`)
            .join(" || ")
        );
        return NextResponse.json({ articles: arts });
      }
    } catch (e: any) {
      console.warn(`[articles] A failed: ${e.message}`);
    }

    // B) getArticlesForEvent
    try {
      const b = await postJson(ER.GET_EVENT_ARTICLES, {
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
      });
      console.log(`[articles] B keys: ${Object.keys(b || {}).join(", ")}`);
      let items = b?.articles?.results ?? b?.results ?? [];
      console.log(`[articles] B items: ${items?.length || 0}`);
      if (items?.length) {
        const arts = normalize(items);
        console.log(
          `[articles] B sample:`,
          arts
            .slice(0, 3)
            .map((x) => `${x.source} | ${x.title}`)
            .join(" || ")
        );
        return NextResponse.json({ articles: arts });
      }
    } catch (e: any) {
      console.warn(`[articles] B failed: ${e.message}`);
    }

    // C) getEvent
    try {
      const c = await postJson(ER.GET_EVENT, {
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
      });
      console.log(
        `[articles] C keys: ${Object.keys(c || {}).join(
          ", "
        )}; event keys: ${Object.keys(c?.event || {}).join(", ")}`
      );
      let items =
        c?.event?.articles?.results ??
        c?.articles?.results ??
        c?.event?.info?.articles?.results ??
        [];
      console.log(`[articles] C items: ${items?.length || 0}`);
      const arts = normalize(items);
      return NextResponse.json({ articles: arts });
    } catch (e: any) {
      console.warn(`[articles] C failed: ${e.message}`);
    }

    console.warn(`[articles] No coverage for ${eventUri}`);
    return NextResponse.json({ articles: [] });
  } catch (err: any) {
    console.error("[articles] error:", err?.message || err);
    return NextResponse.json(
      { articles: [], error: err?.message || String(err) },
      { status: 200 }
    );
  }
}
