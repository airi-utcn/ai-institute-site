"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";

const container = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.12 } },
};
const item = {
  hidden: { y: 16, opacity: 0 },
  visible: { y: 0, opacity: 1, transition: { duration: 0.45, ease: "easeOut" } },
};

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
    const url = `${base}/search-index.json`;

    fetch(url)
      .then(async (r) => {
        if (!r.ok) {
          console.error("[search] failed to load index:", url, r.status, r.statusText);
          return [];
        }
        return r.json();
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
    <motion.div variants={container} initial="hidden" animate="visible">
      <motion.h1
        className="text-2xl md:text-3xl font-extrabold mb-6 text-blue-600 dark:text-yellow-400 tracking-tight text-center"
        variants={item}
      >
        🔎 Search
      </motion.h1>

      <motion.div
        className="rounded-2xl border p-4 mb-6 bg-white/70 dark:bg-slate-900/60 backdrop-blur"
        variants={item}
      >
        <input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Type to search pages…"
          className="w-full rounded-xl border px-4 py-3 bg-white dark:bg-slate-900 outline-none focus:ring-2 ring-blue-500"
        />
      </motion.div>

      {ready && q.trim() && (
        <>
          <motion.div className="text-sm text-slate-500 mb-3" variants={item}>
            {results.length} result{results.length === 1 ? "" : "s"} for <strong>“{q.trim()}”</strong>
          </motion.div>

          <motion.ul className="space-y-3" variants={container}>
            {results.map((r) => (
              <motion.li
                key={`${r.route}::${r.title}`}
                className="rounded-xl border p-4 bg-white/80 dark:bg-slate-900/70 backdrop-blur hover:shadow-md transition"
                variants={item}
              >
                <Link href={r.route} className="text-blue-600 dark:text-blue-400 underline font-medium">
                  {highlightPrefix(r.title, terms)}
                </Link>
                <div className="text-xs text-slate-500 mt-1">{r.route}</div>
                {r.snippet && (
                  <p className="text-slate-700 dark:text-slate-300 mt-2">
                    {highlightPrefix(r.snippet, terms)}
                  </p>
                )}
                {Array.isArray(r.tags) && r.tags.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {r.tags.slice(0, 6).map((tag, i) => (
                      <span
                        key={`${r.route}::${r.title}::tag-${i}-${tag}`}
                        className="text-xs px-2 py-0.5 rounded-full border bg-white dark:bg-slate-900"
                      >
                        #{highlightPrefix(String(tag), terms)}
                      </span>
                    ))}
                  </div>
                )}
              </motion.li>
            ))}
          </motion.ul>

          {results.length === 0 && (
            <motion.div className="text-slate-600 dark:text-slate-300" variants={item}>
              No matches! Try different keywords or check your spelling!
            </motion.div>
          )}
        </>
      )}
    </motion.div>
  );
}
