"use client";

import { useEffect, useState } from "react";

interface Article {
  title: string;
  url: string;
  source: string;
  publishedAt: string;
  description: string;
  image?: string;
}

const TOPICS = [
  { key: "latest", label: "Latest" },
  { key: "business", label: "Business" },
  { key: "technology", label: "Technology" },
  { key: "science", label: "Science" },
  { key: "health", label: "Health" },
  { key: "sports", label: "Sports" },
  { key: "entertainment", label: "Entertainment" },
];

export default function Dashboard() {
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [topic, setTopic] = useState("latest");

  useEffect(() => {
    const fetchNews = async () => {
      setLoading(true);
      try {
        let url = `/api/news?limit=10`;
        if (topic !== "latest") {
          url += `&category=${topic}`;
        }
        const res = await fetch(url);
        const data = await res.json();
        setArticles(data.articles || []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchNews();
  }, [topic]);

  return (
    <main className="p-6">
      {/* Topic Tabs */}
      <div className="flex gap-4 mb-6 border-b pb-2 overflow-x-auto">
        {TOPICS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTopic(t.key)}
            className={`px-3 py-1 rounded-full text-sm font-medium transition ${
              topic === t.key
                ? "bg-green-600 text-white"
                : "bg-gray-200 text-gray-700 hover:bg-gray-300"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Articles */}
      {loading ? (
        <p>Loading {topic} news...</p>
      ) : (
        <div className="grid gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
          {articles.map((article, idx) => (
            <div
              key={idx}
              className="bg-white rounded-2xl shadow-md overflow-hidden border hover:shadow-lg transition"
            >
              {article.image && (
                <img
                  src={article.image}
                  alt={article.title}
                  className="w-full h-40 object-cover"
                />
              )}
              <div className="p-4">
                <h2 className="text-lg font-semibold">{article.title}</h2>
                <p className="text-sm text-gray-600">{article.source}</p>
                <p className="text-gray-700 line-clamp-3 mt-2">
                  {article.description}
                </p>
                <a
                  href={article.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-3 inline-block text-green-600 font-medium hover:underline"
                >
                  Read More →
                </a>
              </div>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
