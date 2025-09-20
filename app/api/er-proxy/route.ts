import { NextRequest, NextResponse } from "next/server";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const BASE = process.env.NEWS_API_AI_BASE ?? "https://eventregistry.org/api/v1";
const API_KEY = process.env.NEWS_API_AI_KEY;

export async function POST(req: NextRequest) {
  if (!API_KEY)
    return NextResponse.json(
      { error: "Missing NEWS_API_AI_KEY" },
      { status: 500 }
    );

  const { path, body } = await req.json();
  if (!path || !body)
    return NextResponse.json(
      { error: "Provide { path, body }" },
      { status: 400 }
    );

  const payload = { apiKey: API_KEY, ...body };

  const erRes = await fetch(`${BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    cache: "no-store",
    body: JSON.stringify(payload),
  });

  const text = await erRes.text();
  try {
    const json = JSON.parse(text);
    return NextResponse.json(json, { status: erRes.status });
  } catch {
    return new NextResponse(text, {
      status: erRes.status,
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  }
}
