export type Bias = "LEFT" | "CENTER" | "RIGHT";

const byName: Record<string, Bias> = {
  // --- Left / Lean Left ---
  CNN: "LEFT",
  MSNBC: "LEFT",
  "The New York Times": "LEFT",
  "New York Times": "LEFT",
  "Washington Post": "LEFT",
  HuffPost: "LEFT",
  "The Guardian": "LEFT",
  "USA Today": "LEFT",
  "USA TODAY": "LEFT",
  "Yahoo News": "LEFT",
  PBS: "LEFT",
  NPR: "LEFT",
  Vox: "LEFT",
  "The Atlantic": "LEFT",
  "LA Times": "LEFT",
  "Los Angeles Times": "LEFT",
  Bloomberg: "LEFT",

  // --- Right / Lean Right ---
  "Fox News": "RIGHT",
  "Breitbart News": "RIGHT",
  Breitbart: "RIGHT",
  "Daily Caller": "RIGHT",
  "Washington Examiner": "RIGHT",
  "National Review": "RIGHT",
  "New York Post": "RIGHT",
  "The Washington Times": "RIGHT",
  "The Daily Wire": "RIGHT",

  // --- Center / Mixed-lean ---
  Reuters: "CENTER",
  "Associated Press": "CENTER",
  AP: "CENTER",
  "BBC News": "CENTER",
  BBC: "CENTER",
  "The Hill": "CENTER",
  Axios: "CENTER",
  Politico: "CENTER",
  "Financial Times": "CENTER",
  Time: "CENTER",
  MarketWatch: "CENTER",
  "Business Insider": "CENTER",
  "USA TODAY Fact Check": "CENTER",
};

function normalize(name?: string | null): string {
  if (!name) return "";
  return name.trim().replace(/\s+/g, " ");
}

export function biasForSource(name?: string | null): Bias | null {
  const key = normalize(name);
  if (!key) return null;

  // direct match
  if (byName[key]) return byName[key];

  // loose matching: strip common suffixes/prefixes
  const loose = key
    .replace(/^\bThe\b\s+/i, "") // "The Guardian" -> "Guardian" (but we also listed The Guardian explicitly)
    .replace(/\s*\|\s*.*$/i, "") // "CNN | US" -> "CNN"
    .replace(/\s*-\s*.*$/i, ""); // "Fox News - U.S." -> "Fox News"

  if (byName[loose]) return byName[loose];

  return null;
}
