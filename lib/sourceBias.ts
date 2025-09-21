export type Bias = "LEFT" | "CENTER" | "RIGHT";

const MAP: Record<string, Bias> = {
  // LEFT
  "the guardian": "LEFT",
  "guardian.com": "LEFT",
  "cbs news": "LEFT",
  "cbsnews.com": "LEFT",
  "yahoo! news": "LEFT",
  "news.yahoo.com": "LEFT",
  "the washington post": "LEFT",
  "washingtonpost.com": "LEFT",
  "the guardian us": "LEFT",

  // RIGHT
  "the post millennial": "RIGHT",
  "thepostmillennial.com": "RIGHT",
  "fox news": "RIGHT",
  "foxnews.com": "RIGHT",

  // CENTER
  "associated press": "CENTER",
  "apnews.com": "CENTER",
  reuters: "CENTER",
  "reuters.com": "CENTER",
};

export function biasForSource(source?: string) {
  if (!source) return;
  const k = source
    .trim()
    .toLowerCase()
    .replace(/^www\./, "");
  return MAP[k];
}
