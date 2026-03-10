"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";

const strip = (s) =>
  (s || "")
    .toString()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

function parseTerms(q) {
  return strip(q).split(/\s+/).filter(Boolean);
}

function highlightPrefix(text, terms) {
  if (!terms?.length || !text) return text;
  const raw = text.toString();
  const lowered = strip(raw);

  let out = [];
  let i = 0;
  while (i < raw.length) {
    let nextIdx = -1;
    let nextLen = 0;
    for (const t of terms) {
      if (!t) continue;
      const j = lowered.indexOf(t, i);
      if (j !== -1 && (nextIdx === -1 || j < nextIdx)) {
        nextIdx = j;
        nextLen = t.length;
      }
    }
    if (nextIdx === -1) {
      out.push(<span key={`t-${i}`}>{raw.slice(i)}</span>);
      break;
    }
    if (nextIdx > i) {
      out.push(<span key={`t-${i}`}>{raw.slice(i, nextIdx)}</span>);
    }
    out.push(
      <mark key={`h-${nextIdx}`} className="bg-yellow-200 px-0.5 rounded">
        {raw.slice(nextIdx, nextIdx + nextLen)}
      </mark>
    );
    i = nextIdx + nextLen;
  }
  return out;
}

function matchesAllTerms(item, terms) {
  if (!terms.length) return false;
  const title = strip(item.title);
  const snippet = strip(item.snippet);
  const tags = (item.tags || []).map(strip);

  return terms.every((t) => {
    if (!t) return true;
    if (title.includes(t)) return true;
    if (snippet.includes(t)) return true;
    for (const tag of tags) if (tag.includes(t)) return true;
    return false;
  });
}

function scoreItem(item, terms) {
  let score = 0;
  const title = strip(item.title);
  const snippet = strip(item.snippet);
  const tags = (item.tags || []).map(strip);

  for (const t of terms) {
    if (!t) continue;
    if (title.includes(t)) score += 3;
    else if (tags.some((tg) => tg.includes(t))) score += 2;
    else if (snippet.includes(t)) score += 1;
  }
  return score;
}

function getBasePath() {
  if (typeof window === "undefined") return "";
  const fromNext = window.__NEXT_DATA__?.assetPrefix;
  if (fromNext) return fromNext;
  const seg = window.location.pathname.split("/")[1] || "";
  if (/staging/i.test(seg)) return `/${seg}`;
  return "";
}

function isExternalRoute(route) {
  return /^https?:\/\//i.test(route || "");
}

export default function ClassicClient() {
  const searchParams = useSearchParams();
  const initialQuery = searchParams.get("q") || "";

  const [idx, setIdx] = useState([]);
  const [q, setQ] = useState(initialQuery);
  const [ready, setReady] = useState(false);

  // Update query when URL params change
  useEffect(() => {
    const urlQuery = searchParams.get("q") || "";
    if (urlQuery && urlQuery !== q) {
      setQ(urlQuery);
    }
  }, [searchParams]);

  useEffect(() => {
    const base = getBasePath();
    const url = `${base}/api/search-index`;
    const fallbackUrl = `${base}/search-index.json`;

    const loadIndex = async (targetUrl, { silent = false } = {}) => {
      const response = await fetch(targetUrl);
      if (!response.ok) {
        if (!silent) {
          console.error("[search] failed to load index:", targetUrl, response.status, response.statusText);
        }
        return null;
      }
      return response.json();
    };

    loadIndex(url)
      .then(async (data) => {
        if (data !== null) return data;
        return loadIndex(fallbackUrl, { silent: true });
      })
      .then((data) => {
        if (!Array.isArray(data)) {
          console.warn("[search] index is not array:", data);
          setIdx([]);
        } else {
          setIdx(data);
        }
      })
      .catch((err) => {
        console.error("[search] error loading index:", err);
        setIdx([]);
      })
      .finally(() => setReady(true));
  }, []);

  const { results, terms } = useMemo(() => {
    const terms = parseTerms(q);
    if (!terms.length) return { results: [], terms };

    const raw = idx
      .filter((item) => matchesAllTerms(item, terms))
      .map((item) => ({ ...item, _score: scoreItem(item, terms) }))
      .sort((a, b) => b._score - a._score || a.title.localeCompare(b.title));

    const seen = new Set();
    const deduped = raw.filter((r) => {
      const key = `${r.route}::${r.title}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    return { results: deduped, terms };
  }, [q, idx]);

  return (
    <div className="space-y-6 text-gray-900 dark:text-gray-100">
      <div className="page-header mb-0">
        <h1 className="page-header-title">Search</h1>
        <p className="page-header-subtitle">
          Search across pages, people, projects, publications, news, events, and resources.
        </p>
      </div>

      <div className="card p-4 md:p-5">
        <input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Type to search pages…"
          className="input"
        />
      </div>

      {ready && q.trim() && (
        <>
          <div className="text-sm text-gray-500 dark:text-gray-400">
            {results.length} result{results.length === 1 ? "" : "s"} for <strong>“{q.trim()}”</strong>
          </div>

          <ul className="space-y-3">
            {results.map((r) => (
              <li
                key={`${r.route}::${r.title}`}
                className="card p-4 md:p-5 transition-shadow hover:shadow-md"
              >
                {isExternalRoute(r.route) ? (
                  <a
                    href={r.route}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="link font-medium"
                  >
                    {highlightPrefix(r.title, terms)}
                  </a>
                ) : (
                  <Link href={r.route} className="link font-medium">
                    {highlightPrefix(r.title, terms)}
                  </Link>
                )}
                <div className="text-xs text-gray-500 dark:text-gray-400 mt-1 break-all">{r.route}</div>
                {r.snippet && (
                  <p className="text-gray-700 dark:text-gray-300 mt-2">
                    {highlightPrefix(r.snippet, terms)}
                  </p>
                )}
                {Array.isArray(r.tags) && r.tags.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {r.tags.slice(0, 6).map((tag, i) => (
                      <span
                        key={`${r.route}::${r.title}::tag-${i}-${tag}`}
                        className="badge badge-gray"
                      >
                        #{highlightPrefix(String(tag), terms)}
                      </span>
                    ))}
                  </div>
                )}
              </li>
            ))}
          </ul>

          {results.length === 0 && (
            <div className="empty-state py-6">
              No matches! Try different keywords or check your spelling!
            </div>
          )}
        </>
      )}
      {ready && !q.trim() && (
        <div className="empty-state py-6">
          Start typing to search the site.
        </div>
      )}
    </div>
  );
}
