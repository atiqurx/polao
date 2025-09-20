import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);

  const q = searchParams.get("q");
  const category = searchParams.get("category");
  const limit = parseInt(searchParams.get("limit") || "10", 10);

  let url = "";

  if (q) {
    url = `https://newsapi.org/v2/everything?q=${encodeURIComponent(
      q
    )}&language=en&sortBy=publishedAt&apiKey=${process.env.NEWS_API_KEY}`;
  } else if (category && category !== "latest") {
    url = `https://newsapi.org/v2/everything?q=${encodeURIComponent(
      category
    )}&language=en&sortBy=relevancy&pageSize=${limit}&apiKey=${
      process.env.NEWS_API_KEY
    }`;
  } else {
    url = `https://newsapi.org/v2/top-headlines?country=us&pageSize=${limit}&apiKey=${process.env.NEWS_API_KEY}`;
  }

  try {
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) {
      const errorBody = await res.text();
      return NextResponse.json(
        { error: "NewsAPI fetch failed", details: errorBody },
        { status: res.status }
      );
    }

    const data = await res.json();

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
