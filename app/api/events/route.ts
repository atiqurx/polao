// app/api/events/route.ts
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
  const page = Number(searchParams.get("page") ?? "1");
  const count = Number(searchParams.get("count") ?? "20");

  const body = {
    query: {
      $query: {
        $and: [
          { conceptUri: "http://en.wikipedia.org/wiki/Politics" },
          { locationUri: "http://en.wikipedia.org/wiki/United_States" },
          { lang: "eng" },
        ],
      },
      $filter: { forceMaxDataTimeWindow: "31" },
    },
    resultType: "events",
    eventsSortBy: "date",
    includeEventSummary: true,
    includeEventLocation: false,
    includeEventConcepts: false,
    includeEventCategories: false,
    eventImageCount: 1,
    includeStoryBasicStats: true,
    includeStoryTitle: true,
    includeStoryLocation: true,
    includeStoryDate: true,
    includeStorySocialScore: true,
    includeStoryConcepts: true,
    includeStoryCategories: true,
    includeStoryMedoidArticle: true,
    includeStoryCommonDates: true,
    storyImageCount: 1,
    eventsPage: page,
    eventsCount: count,
    apiKey: API_KEY,
  };

  const erRes = await fetch(`${BASE}/event/getEvents`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    cache: "no-store",
    body: JSON.stringify(body),
  });

  const text = await erRes.text();
  let json: any = null;
  try {
    json = JSON.parse(text);
  } catch {}

  if (!erRes.ok) {
    return NextResponse.json(
      { error: `Event Registry ${erRes.status}`, erRaw: text },
      { status: 500 }
    );
  }

  return NextResponse.json(json);
}
