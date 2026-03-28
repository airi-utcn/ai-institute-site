/**
 * lib/googleScholar.js
 *
 * Google Scholar citation helpers.
 * 
 * Strategy
 * --------
 * Google Scholar has no public API, so we scrape the public profile HTML.
 * To avoid being rate-limited and to keep page loads fast, results are cached
 * in .next/cache/scholar-citations.json (server-side file cache).
 * 
 * The cache is refreshed when it is older than CACHE_TTL_MS (default: 1 hour).
 * During a Next.js build the cache is written once and re-used for all pages.
 * 
 * All functions are defensive and return 0 on failure so the UI never breaks.
 */

import fs from "fs";
import path from "path";

// ---------------------------------------------------------------------------
// Cache configuration
// ---------------------------------------------------------------------------

const CACHE_DIR = path.join(process.cwd(), ".next", "cache");
const CACHE_FILE = path.join(CACHE_DIR, "scholar-citations.json");
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

/** @returns {{ updatedAt: number, data: Record<string, number> }} */
function readCache() {
  try {
    if (!fs.existsSync(CACHE_FILE)) return { updatedAt: 0, data: {} };
    const raw = fs.readFileSync(CACHE_FILE, "utf-8");
    return JSON.parse(raw);
  } catch (error) {
    console.error("Failed to read cache:", error);
    return { updatedAt: 0, data: {} };
  }
}

/** @param {Record<string, number>} data */
function writeCache(data) {
  try {
    if (!fs.existsSync(CACHE_DIR)) fs.mkdirSync(CACHE_DIR, { recursive: true });
    fs.writeFileSync(CACHE_FILE, JSON.stringify({ updatedAt: Date.now(), data }, null, 2), "utf-8");
  } catch (error) {
    console.error("Failed to write cache:", error);
  }
}

// ---------------------------------------------------------------------------
// URL helpers
// ---------------------------------------------------------------------------

export function extractGoogleScholarUserId(url) {
  if (!url || typeof url !== "string") return "";
  try {
    return new URL(url).searchParams.get("user") || "";
  } catch {
    return "";
  }
}

export function buildGoogleScholarProfileUrl(userId) {
  if (!userId) return "";
  return `https://scholar.google.com/citations?user=${encodeURIComponent(userId)}&hl=en`;
}

export function resolveScholarUrl(person) {
  if (person?.scholarId) {
    return buildGoogleScholarProfileUrl(person.scholarId.trim());
  }
  
  const links = Array.isArray(person?.socialLinks) ? person.socialLinks : [];
  const match =
    links.find(
      (l) =>
        typeof l?.label === "string" &&
        l.label.toLowerCase().includes("google scholar")
    ) ||
    links.find(
      (l) =>
        typeof l?.url === "string" &&
        l.url.toLowerCase().includes("scholar.google.com")
    );

  return match?.url || "";
}

// ---------------------------------------------------------------------------
// HTML parsing
// ---------------------------------------------------------------------------

export function extractCitationCountFromHtml(html) {
  if (!html || typeof html !== "string") return 0;

  const valueMatches = [
    ...html.matchAll(/id=["']gsc_rsb_std["'][^>]*>\s*([0-9,.\s]+)\s*</g),
  ];
  
  if (valueMatches.length > 0) {
    const value = Number(valueMatches[0][1].replace(/[^\d]/g, ""));
    if (!Number.isNaN(value)) return value;
  }

  const citedByMatch = html.match(
    /(?:Cited by|Citat de)[\s\S]{0,300}?id=["']gsc_rsb_std["'][^>]*>\s*([0-9,.\s]+)\s*</i
  );
  
  if (citedByMatch) {
    const value = Number(citedByMatch[1].replace(/[^\d]/g, ""));
    if (!Number.isNaN(value)) return value;
  }

  return 0;
}

// ---------------------------------------------------------------------------
// Network fetch
// ---------------------------------------------------------------------------

const FETCH_TIMEOUT_MS = parseInt(process.env.FETCH_TIMEOUT_MS, 10) || 8000; // Allow config via env

async function fetchCitationCount(profileUrl) {
  if (!profileUrl) return 0;

  const userId = extractGoogleScholarUserId(profileUrl);
  const url = userId ? buildGoogleScholarProfileUrl(userId) : profileUrl;

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

    const response = await fetch(url, {
      method: "GET",
      headers: {
        "User-Agent": 
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) " +
          "AppleWebKit/537.36 (KHTML, like Gecko) " +
          "Chrome/124.0.0.0 Safari/537.36",
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
      },
      // next: { revalidate: 3600 } works in Next.js App Router fetch
      next: { revalidate: 3600 },
      signal: controller.signal,
    });

    clearTimeout(timer);

    if (!response.ok) return 0;

    const html = await response.text();
    return extractCitationCountFromHtml(html);
  } catch (error) {
    console.error("Fetch error for URL:", url, "Error:", error);
    return 0;
  }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export async function attachScholarCitationCounts(people = []) {
  const list = Array.isArray(people) ? people : [];
  if (list.length === 0) return [];

  const urlMap = {};
  for (const person of list) {
    const url = resolveScholarUrl(person);
    if (url) urlMap[person.slug] = url;
  }

  if (Object.keys(urlMap).length === 0) {
    return list.map((p) => ({
      ...p,
      googleScholarUrl: "",
      scholarCitationCount: 0,
    }));
  }

  const cache = readCache();
  const now = Date.now();
  const cacheIsValid = now - cache.updatedAt < CACHE_TTL_MS;

  const toFetch = Object.entries(urlMap).filter(
    ([slug]) => !cacheIsValid || cache.data[slug] === undefined
  );

  const CONCURRENCY = 5;
  const freshData = { ...cache.data };

  for (let i = 0; i < toFetch.length; i += CONCURRENCY) {
    const batch = toFetch.slice(i, i + CONCURRENCY);
    const results = await Promise.all(
      batch.map(async ([slug, url]) => {
        const count = await fetchCitationCount(url);
        return [slug, count];
      })
    );

    for (const [slug, count] of results) {
      freshData[slug] = count;
    }
  }

  if (toFetch.length > 0) {
    writeCache(freshData);
  }

  return list.map((person) => ({
    ...person,
    googleScholarUrl: urlMap[person.slug] || "",
    scholarCitationCount: freshData[person.slug] ?? 0,
  }));
}
