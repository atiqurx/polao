const BASE = process.env.NEWS_API_AI_BASE ?? "https://eventregistry.org/api/v1";
const API_KEY = process.env.NEWS_API_AI_KEY!;

export type EREvent = {
  uri: string;
  eventDate: string;
  totalArticleCount: number;
  title: Record<string, string>;
  summary?: Record<string, string>;
  images?: string[];
};

export type ERArticle = {
  title: string;
  url: string;
  dateTimePub: string;
  image?: string;
  isDuplicate?: boolean;
  source?: { title?: string };
};

export async function getEvents(page = 1, count = 20) {
  // ER ignores count at top-level for events; use $filter.timeWindow + eventsSortBy
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
    apiKey: API_KEY,
    eventsPage: page, // supported by ER for paging events
    eventsCount: count, // page size (ER supports this on /getEvents)
  };

  const res = await fetch(`${BASE}/event/getEvents`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    // cache: "no-store",
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`getEvents ${res.status}: ${await res.text()}`);
  const json = await res.json();

  const results: EREvent[] = json?.events?.results ?? [];
  const pageInfo = {
    page: json?.events?.page ?? 1,
    pages: json?.events?.pages ?? 1,
    totalResults: json?.events?.totalResults ?? results.length,
    count: json?.events?.count ?? results.length,
  };
  return { results, pageInfo };
}

export async function getArticlesForEvent(
  eventUri: string,
  page = 1,
  count = 100
) {
  const body = {
    apiKey: API_KEY,
    eventUri,
    resultType: "articles",
    articlesPage: page,
    articlesCount: Math.min(count, 100),
    articlesSortBy: "date",
    articlesArticleBodyLen: -1,
    articlesLang: ["eng"],
    includeArticleImage: true,
    includeArticleConcepts: false,
    includeArticleCategories: false,
    includeArticleSocialScore: false,
  };

  const res = await fetch(`${BASE}/event/getEvent`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`getEvent ${res.status}: ${await res.text()}`);
  const json = await res.json();

  const results: ERArticle[] = (json?.articles?.results ?? []).filter(
    (a: any) => a.isDuplicate === false
  );
  const pageInfo = {
    page: json?.articles?.page ?? 1,
    pages: json?.articles?.pages ?? 1,
    totalResults: json?.articles?.totalResults ?? results.length,
    count: results.length,
  };
  return { results, pageInfo };
}
