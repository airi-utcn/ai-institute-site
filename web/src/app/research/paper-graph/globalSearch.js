"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { FaSearch, FaTimes, FaGlobe, FaLayerGroup } from "react-icons/fa";

export function GlobalGraphSearch({
  indexUrl = "/api/paper-graph-index",
  currentPapers = null,
  onSelectPaper = null,
  fabClassName = "bottom-24 right-5",
}) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [index, setIndex] = useState(null);
  const [isOpen, setIsOpen] = useState(false);
  const [scope, setScope] = useState("all"); // "all" or "current"
  const inputRef = useRef(null);

  // Load index when opened or focused
  useEffect(() => {
    if (isOpen && !index) {
      fetch(indexUrl)
        .then((res) => res.json())
        .then((data) => {
          if (Array.isArray(data)) {
            setIndex(data);
          } else {
            setIndex([]);
          }
        })
        .catch((err) => {
          console.error("Failed to load search index:", err);
          setIndex([]);
        });
    }
  }, [isOpen, index, indexUrl]);

  // Global keyboard shortcut: Ctrl+K / Cmd+K or "/"
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setIsOpen((prev) => !prev);
      } else if (e.key === "/" && !["INPUT", "TEXTAREA"].includes(document.activeElement?.tagName)) {
        e.preventDefault();
        setIsOpen(true);
      } else if (e.key === "Escape" && isOpen) {
        e.preventDefault();
        setIsOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen]);

  // Auto-focus input when opened
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
    } else {
      setQuery("");
    }
  }, [isOpen]);

  // Filter papers based on active scope
  const activeList = scope === "current" && currentPapers ? currentPapers : (index || []);
  const trimmedQuery = query.trim().toLowerCase();

  const results = trimmedQuery
    ? activeList
        .filter((p) => {
          const titleMatch = (p.title || "").toLowerCase().includes(trimmedQuery);
          const authorMatch = Array.isArray(p.authors)
            ? p.authors.some((a) => (typeof a === "string" ? a : a.name || "").toLowerCase().includes(trimmedQuery))
            : false;
          const yearMatch = p.year ? String(p.year).includes(trimmedQuery) : false;
          return titleMatch || authorMatch || yearMatch;
        })
        .slice(0, 12)
    : [];

  const handleSelect = (paper) => {
    setIsOpen(false);
    setQuery("");

    // If current view handler is present and paper is part of current view
    if (onSelectPaper && currentPapers && currentPapers.some((p) => p.id === paper.id)) {
      onSelectPaper(paper);
      return;
    }

    if (paper.domainSlug && paper.topicSlug) {
      const path = `/research/paper-graph/${paper.domainSlug}/${paper.topicSlug}?highlight=${paper.id}`;
      router.push(path);
    }
  };

  return (
    <>
      {/* Floating Action Button (FAB) anchored at bottom-right */}
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        title="Search graph (Ctrl+K or /)"
        className={`absolute z-40 flex items-center gap-2.5 rounded-full border border-amber-400/35 bg-[#040a14]/90 px-4 py-2 font-mono text-xs text-amber-200 shadow-[0_0_20px_rgba(245,158,11,0.2)] backdrop-blur-md transition-all hover:border-amber-400/70 hover:bg-[#08152b] hover:text-amber-100 hover:shadow-[0_0_25px_rgba(245,158,11,0.4)] hover:scale-105 active:scale-95 ${fabClassName}`}
      >
        <FaSearch className="text-amber-400 text-xs" />
        <span className="tracking-wider font-semibold">SEARCH</span>
        <kbd className="hidden sm:inline-block rounded border border-amber-500/30 bg-amber-500/10 px-1.5 py-0.5 text-[9px] text-amber-300/80 font-sans">
          ⌘K
        </kbd>
      </button>

      {/* Spotlight HUD Modal */}
      {isOpen && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center pt-16 sm:pt-24 px-4 bg-black/70 backdrop-blur-md transition-opacity"
          onClick={() => setIsOpen(false)}
        >
          <div
            className="w-full max-w-2xl rounded-2xl border border-amber-500/30 bg-[#040a14]/95 text-amber-100 shadow-[0_0_60px_rgba(0,0,0,0.9)] backdrop-blur-2xl overflow-hidden flex flex-col max-h-[80vh]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Search Input Bar */}
            <div className="relative flex items-center border-b border-amber-500/20 px-4 py-3.5">
              <FaSearch className="text-amber-500/60 text-lg mr-3 shrink-0" />
              <input
                ref={inputRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search publications by title, author, or year..."
                className="w-full bg-transparent text-base text-amber-100 placeholder-amber-500/35 outline-none font-mono"
              />
              {query && (
                <button
                  type="button"
                  onClick={() => setQuery("")}
                  className="p-1 text-amber-500/50 hover:text-amber-300 transition-colors mr-2"
                >
                  <FaTimes />
                </button>
              )}
              <kbd className="hidden sm:inline-block text-[10px] font-mono text-amber-400/50 border border-amber-500/20 rounded px-1.5 py-0.5">
                ESC
              </kbd>
            </div>

            {/* Scope Filter Tabs (if currentPapers available) */}
            {currentPapers && currentPapers.length > 0 && (
              <div className="flex items-center gap-2 px-4 py-2 border-b border-amber-500/15 bg-amber-500/5 font-mono text-xs">
                <button
                  type="button"
                  onClick={() => setScope("all")}
                  className={`flex items-center gap-1.5 px-3 py-1 rounded-full border transition-all ${
                    scope === "all"
                      ? "border-amber-400/50 bg-amber-500/20 text-amber-200"
                      : "border-transparent text-amber-400/60 hover:text-amber-300"
                  }`}
                >
                  <FaGlobe className="text-[10px]" />
                  <span>ALL PAPERS</span>
                </button>
                <button
                  type="button"
                  onClick={() => setScope("current")}
                  className={`flex items-center gap-1.5 px-3 py-1 rounded-full border transition-all ${
                    scope === "current"
                      ? "border-amber-400/50 bg-amber-500/20 text-amber-200"
                      : "border-transparent text-amber-400/60 hover:text-amber-300"
                  }`}
                >
                  <FaLayerGroup className="text-[10px]" />
                  <span>THIS TOPIC ({currentPapers.length})</span>
                </button>
              </div>
            )}

            {/* Results List */}
            <div className="overflow-y-auto flex-1 p-2 space-y-1">
              {results.length > 0 ? (
                results.map((p) => {
                  const authorsStr = Array.isArray(p.authors)
                    ? p.authors.map((a) => (typeof a === "string" ? a : a.name || "")).filter(Boolean).join(", ")
                    : "";

                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => handleSelect(p)}
                      className="w-full text-left p-3 rounded-xl hover:bg-amber-500/15 border border-transparent hover:border-amber-500/30 transition-all group flex flex-col gap-1"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <span className="text-amber-100 font-medium text-sm group-hover:text-amber-50 line-clamp-2">
                          {p.title}
                        </span>
                        {p.year && (
                          <span className="font-mono text-xs text-amber-400/70 shrink-0 px-1.5 py-0.5 rounded bg-amber-500/10">
                            {p.year}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center justify-between text-xs text-amber-400/60 gap-4 mt-0.5">
                        <span className="truncate">{authorsStr || "Unknown author"}</span>
                        {p.domainSlug && (
                          <span className="font-mono text-[9px] uppercase tracking-wider text-amber-500/50 shrink-0">
                            {p.domainSlug.replace(/-/g, " ")}
                          </span>
                        )}
                      </div>
                    </button>
                  );
                })
              ) : query ? (
                <div className="p-8 text-center font-mono text-sm text-amber-500/50">
                  NO PUBLICATIONS MATCHING &ldquo;{query}&rdquo;
                </div>
              ) : (
                <div className="p-6 text-center font-mono text-xs text-amber-400/40">
                  Type to search through all indexed publications...
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="border-t border-amber-500/15 px-4 py-2.5 bg-black/40 flex items-center justify-between font-mono text-[10px] text-amber-500/50">
              <span>AIRI GALACTIC INDEX</span>
              <span>{results.length > 0 ? `${results.length} MATCHES` : ""}</span>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
