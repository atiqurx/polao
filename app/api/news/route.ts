import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);

  const q = searchParams.get("q"); // keyword
  const category = searchParams.get("category"); // business, sports, tech...
  const sources = searchParams.get("sources"); // cnn,bbc-news
  const limit = parseInt(searchParams.get("limit") || "10", 10);

  // Base URL (default: top headlines)
  let url = `https://newsapi.org/v2/top-headlines?apiKey=${process.env.NEWS_API_KEY}`;

  if (q) url += `&q=${encodeURIComponent(q)}`;
  if (category) url += `&category=${encodeURIComponent(category)}`;
  if (sources) url += `&sources=${encodeURIComponent(sources)}`;

  try {
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) {
      return NextResponse.json(
        { error: "NewsAPI fetch failed" },
        { status: res.status }
      );
    }

    const data = await res.json();

    // Trim to limit
    const articles = Array.isArray(data.articles)
      ? data.articles.slice(0, limit).map((a: any) => ({
          title: a.title,
          url: a.url,
          source: a.source?.name,
          publishedAt: a.publishedAt,
          description: a.description,
          image: a.urlToImage,
        }))
      : [];

    return NextResponse.json({ articles });
  } catch (err) {
    return NextResponse.json(
      { error: "Something went wrong", details: (err as Error).message },
      { status: 500 }
    );
  }
}
