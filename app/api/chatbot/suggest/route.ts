// app/api/chatbot/suggest/route.ts
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const API_KEY = process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY || "";
const MODEL = process.env.GEMINI_MODEL || "gemini-1.5-flash";
const BASE = "https://generativelanguage.googleapis.com/v1beta";

// Very defensive JSON extraction: handles code fences and stray text
function safeParseSuggestions(text: string, fallbackCount = 4): string[] {
  try {
    // Try direct JSON parse
    const json = JSON.parse(text);
    if (Array.isArray(json)) {
      return json.map((s) => String(s)).filter(Boolean);
    }
  } catch {}
  // Try extracting the first [ ... ] block
  const m = text.match(/\[[\s\S]*\]/);
  if (m) {
    try {
      const arr = JSON.parse(m[0]);
      if (Array.isArray(arr)) return arr.map((s) => String(s)).filter(Boolean);
    } catch {}
  }
  // Try lines beginning with - or numeric list
  const lines = text
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean)
    .map((l) => l.replace(/^[-*\d.]+\s*/, "").trim())
    .filter(Boolean);
  return lines.slice(0, fallbackCount);
}

export async function POST(req: NextRequest) {
  try {
    const { titles = [], count = 4, style = "short" } = await req.json();
    const n = Math.min(Math.max(Number(count) || 4, 3), 6);

    // No key? Return deterministic local suggestions for dev
    if (!API_KEY) {
      const top = String(titles?.[0] || "").slice(0, 80);
      const fallback = [
        top ? `Summarize: ${top}` : "Summarize today’s top events",
        top ? `Explain likely bias in “${top}”` : "Explain likely bias in the top story",
        top ? `Compare left vs right coverage on “${top}”` : "Compare left vs right coverage",
        "What changed since yesterday?",
        "What key sources should I read?",
        "Any counter-narratives I’m missing?",
      ];
      return NextResponse.json({ suggestions: fallback.slice(0, n) });
    }

    const titlesBlock =
      Array.isArray(titles) && titles.length
        ? `Relevant page headlines:\n${titles.slice(0, 25).map((t: string) => `- ${t}`).join("\n")}`
        : "Relevant page headlines: (none)";

    // Prompt: ask for STRICT JSON array
    const prompt = [
      "You are Polao, a concise news assistant.",
      "Generate helpful, click-worthy user prompts a reader might tap in a news app.",
      titlesBlock,
      "",
      `Output EXACTLY a JSON array of ${n} strings with NO extra text, no code fences.`,
      "Constraints:",
      "- Each suggestion ≤ 80 characters.",
      "- No emojis.",
      "- No numbering or bullets.",
      "- No surrounding quotes besides the JSON format.",
      "- Avoid trailing punctuation like '.' unless it’s part of a name.",
      "- Suggestions must be distinct and reflect the headlines.",
      "",
      "Examples of good suggestions:",
      '["Summarize today’s top 5 events", "Compare left vs right on the top story", "Explain likely bias markers"]',
    ].join("\n");

    const url = `${BASE}/models/${encodeURIComponent(MODEL)}:generateContent?key=${API_KEY}`;
    const body = {
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.5, topK: 64, topP: 0.95, maxOutputTokens: 256 },
    };

    // Call Gemini (with fallback to pro on 404)
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify(body),
    });

    let textOut = "";
    if (!res.ok) {
      if (res.status === 404 && MODEL === "gemini-1.5-flash") {
        const fbUrl = `${BASE}/models/${encodeURIComponent("gemini-1.5-pro")}:generateContent?key=${API_KEY}`;
        const fbRes = await fetch(fbUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        if (!fbRes.ok) {
          return NextResponse.json({ error: `Gemini error (fallback): ${fbRes.status}`, detail: await fbRes.text() }, { status: 500 });
        }
        const fbJson = await fbRes.json();
        textOut = fbJson?.candidates?.[0]?.content?.parts?.map((p: any) => p.text).join("") || "";
      } else {
        return NextResponse.json({ error: `Gemini error: ${res.status}`, detail: await res.text() }, { status: 500 });
      }
    } else {
      const json = await res.json();
      textOut = json?.candidates?.[0]?.content?.parts?.map((p: any) => p.text).join("") || "";
    }

    // Parse + post-process
    let suggestions = safeParseSuggestions(textOut, n)
      .map((s) => s.trim())
      .filter(Boolean)
      .map((s) => (s.length > 80 ? s.slice(0, 79) : s));

    // Deduplicate, ensure 3-6 max
    const seen = new Set<string>();
    suggestions = suggestions.filter((s) => (seen.has(s) ? false : (seen.add(s), true))).slice(0, n);

    // Fallback if empty
    if (!suggestions.length) {
      const top = String(titles?.[0] || "").slice(0, 80);
      suggestions = [
        top ? `Summarize: ${top}` : "Summarize today’s top events",
        top ? `Explain likely bias in “${top}”` : "Explain likely bias in the top story",
        top ? `Compare left vs right on “${top}”` : "Compare left vs right coverage",
        "What changed since yesterday?",
      ].slice(0, n);
    }

    return NextResponse.json({ suggestions });
  } catch (err: any) {
    return NextResponse.json({ error: "Suggest route failed", detail: String(err?.message || err) }, { status: 500 });
  }
}
