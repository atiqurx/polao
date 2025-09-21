// app/api/chatbot/route.ts
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const API_KEY = process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY || "";
const MODEL = process.env.GEMINI_MODEL || "gemini-1.5-flash";
const BASE = "https://generativelanguage.googleapis.com/v1beta";

export async function POST(req: NextRequest) {
  try {
    const { message, context, titles } = await req.json();

    if (!message || typeof message !== "string") {
      return NextResponse.json(
        { error: "Body must include { message: string }" },
        { status: 400 }
      );
    }

    // No API key? Return a deterministic echo for local dev.
    if (!API_KEY) {
      const echo = [
        `🔧 Dev mode (no GOOGLE_API_KEY):`,
        `Message: ${message}`,
        context ? `Context: ${context}` : "",
        Array.isArray(titles) && titles.length
          ? `Titles:\n${titles.slice(0, 25).map((t: string) => `- ${t}`).join("\n")}`
          : "Titles: (none)"
      ]
        .filter(Boolean)
        .join("\n");
      return NextResponse.json({ response: echo });
    }

    const titlesBlock =
      Array.isArray(titles) && titles.length
        ? `Relevant page titles:\n${titles.slice(0, 25).map((t: string) => `- ${t}`).join("\n")}`
        : "Relevant page titles: (none)";

    const userText = [
      "You are Polao, a concise news assistant that explains bias and sources.",
      context ? `Context: ${context}` : "",
      titlesBlock,
      "",
      `User: ${message}`,
    ]
      .filter(Boolean)
      .join("\n");

    const url = `${BASE}/models/${encodeURIComponent(MODEL)}:generateContent?key=${API_KEY}`;
    const body = {
      contents: [{ role: "user", parts: [{ text: userText }] }],
      generationConfig: { temperature: 0.4, topK: 32, topP: 0.95, maxOutputTokens: 1024 },
    };

    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify(body),
    });

    // Fallback to pro if flash 404s (common in some regions/accounts)
    let json: any = null;
    if (!res.ok) {
      if (res.status === 404 && MODEL === "gemini-1.5-flash") {
        const fbUrl = `${BASE}/models/${encodeURIComponent("gemini-1.5-pro")}:generateContent?key=${API_KEY}`;
        const fbRes = await fetch(fbUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        if (!fbRes.ok) {
          return NextResponse.json(
            { error: `Gemini API error (fallback): ${fbRes.status}`, detail: await fbRes.text() },
            { status: 500 }
          );
        }
        json = await fbRes.json();
      } else {
        return NextResponse.json(
          { error: `Gemini API error: ${res.status}`, detail: await res.text() },
          { status: 500 }
        );
      }
    } else {
      json = await res.json();
    }

    const output =
      json?.candidates?.[0]?.content?.parts?.map((p: any) => p.text).join("") ||
      json?.candidates?.[0]?.content?.parts?.[0]?.text ||
      "Sorry, I couldn’t generate a response.";

    return NextResponse.json({ response: output });
  } catch (err: any) {
    return NextResponse.json(
      { error: "Chatbot route failed", detail: String(err?.message || err) },
      { status: 500 }
    );
  }
}
