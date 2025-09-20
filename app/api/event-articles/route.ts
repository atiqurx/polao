// app/api/event-articles/route.ts
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const BASE = process.env.NEWS_API_AI_BASE ?? "https://eventregistry.org/api/v1";
const API_KEY = process.env.NEWS_API_AI_KEY;

export async function GET(req: NextRequest) {
  if (!API_KEY) {
    return NextResponse.json(
      { error: "Missing NEWS_API_AI_KEY" },
      { status: 500 }
    );
  }

  const { searchParams } = new URL(req.url);
  const eventUri = searchParams.get("eventUri");
  if (!eventUri)
    return NextResponse.json({ error: "Missing eventUri" }, { status: 400 });

  const page = Number(searchParams.get("page") ?? "1");
  const count = 10; // hard cap

  const body = {
    apiKey: API_KEY,
    eventUri,
    resultType: "articles",
    articlesPage: page,
    articlesCount: count,
    articlesSortBy: "date",
    articlesArticleBodyLen: -1,
    articlesLang: ["eng"],
    includeArticleImage: true,
    includeArticleConcepts: false,
    includeArticleCategories: false,
    includeArticleSocialScore: false,
  };

  const erRes = await fetch(`${BASE}/event/getEvent`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    cache: "no-store",
    body: JSON.stringify(body),
  });

  const text = await erRes.text();
  let json: any = null;
  try {
    json = JSON.parse(text);
  } catch {
    /* leave as text */
  }

  if (!erRes.ok) {
    return NextResponse.json(
      { error: `Event Registry ${erRes.status}`, erRaw: text },
      { status: 500 }
    );
  }

  // --- Normalize both shapes ---
  // Shape A: { articles: { results, page, pages, totalResults } }
  // Shape B: { "<eventUri>": { articles: { results, ... } } }
  const nodeA = json?.articles;
  const nodeB = json?.[eventUri]?.articles;

  const articlesNode = nodeA ?? nodeB ?? {};
  const results = Array.isArray(articlesNode.results)
    ? articlesNode.results.slice(0, count)
    : [];

  const payload = {
    eventUri,
    results,
    pageInfo: {
      page: articlesNode.page ?? page,
      pages: articlesNode.pages ?? 1,
      totalResults: articlesNode.totalResults ?? results.length,
      count: results.length,
    },
    // keep raw for debugging until you’re satisfied, then remove this
    erRaw: json,
  };

  return NextResponse.json(payload);
}
