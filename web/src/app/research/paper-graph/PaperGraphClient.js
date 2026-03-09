"use client";

import { useState, useRef, useCallback, useEffect, useMemo } from "react";

// ─── Layout constants ────────────────────────────────────────────────────────
const MAP_W = 2800;
const MAP_H = 1800;
const NODE_R = 18;
const MIN_DIST = 160;
const COMMUNITY_R_BASE = 60; // base radius for community bubbles
const TOPIC_R = 30;

// Community color palette
const COMMUNITY_COLORS = [
  "#ff6b6b", "#4ecdc4", "#45b7d1", "#96ceb4", "#ffeaa7",
  "#dda0dd", "#98d8c8", "#f7dc6f", "#bb8fce", "#85c1e9",
  "#f8c471", "#82e0aa", "#f1948a", "#aed6f1", "#d5a6bd",
  "#a3e4d7", "#f9e79f", "#d2b4de", "#abebc6", "#fadbd8",
];

// ─── Seeded pseudo-random (LCG) ──────────────────────────────────────────────
function makeRng(seed) {
  let s = seed >>> 0;
  return () => {
    s = Math.imul(s, 1664525) + 1013904223;
    return (s >>> 0) / 0xffffffff;
  };
}

// ─── Build star field ────────────────────────────────────────────────────────
function buildStars(count) {
  const rng = makeRng(0xdeadbeef);
  return Array.from({ length: count }, (_, i) => ({
    id: i,
    cx: rng() * MAP_W,
    cy: rng() * MAP_H,
    r: rng() * 1.3 + 0.2,
    opacity: rng() * 0.7 + 0.15,
  }));
}
const STARS = buildStars(600);

// ─── Position nodes with force relaxation ─────────────────────────────────────
function buildPositions(items, mapW = MAP_W, mapH = MAP_H, minDist = MIN_DIST) {
  const PAD = 140;
  const rng = makeRng(0xc0ffee + items.length);
  const pos = items.map(() => ({
    x: PAD + rng() * (mapW - PAD * 2),
    y: PAD + rng() * (mapH - PAD * 2),
  }));

  for (let pass = 0; pass < 30; pass++) {
    for (let i = 0; i < pos.length; i++) {
      for (let j = i + 1; j < pos.length; j++) {
        const dx = pos[j].x - pos[i].x;
        const dy = pos[j].y - pos[i].y;
        const d = Math.sqrt(dx * dx + dy * dy) || 0.001;
        if (d < minDist) {
          const f = ((minDist - d) / d) * 0.5;
          pos[i].x -= dx * f;
          pos[i].y -= dy * f;
          pos[j].x += dx * f;
          pos[j].y += dy * f;
          pos[i].x = Math.max(PAD, Math.min(mapW - PAD, pos[i].x));
          pos[i].y = Math.max(PAD, Math.min(mapH - PAD, pos[i].y));
          pos[j].x = Math.max(PAD, Math.min(mapW - PAD, pos[j].x));
          pos[j].y = Math.max(PAD, Math.min(mapH - PAD, pos[j].y));
        }
      }
    }
  }
  return pos;
}

// ─── Link visual style by score ──────────────────────────────────────────────
function linkStyle(score, isCross) {
  if (isCross) return { stroke: "#ffa500", width: 1.2, opacity: 0.55, dash: "6 4" };
  if (score >= 0.8) return { stroke: "#ffe066", width: 2.2, opacity: 0.80, dash: "none" };
  if (score >= 0.65) return { stroke: "#ff8c00", width: 1.5, opacity: 0.65, dash: "none" };
  return { stroke: "#4d7fff", width: 0.9, opacity: 0.40, dash: "none" };
}

// ─── Grid lines ──────────────────────────────────────────────────────────────
const GRID_COLS = Array.from({ length: Math.ceil(MAP_W / 220) + 1 }, (_, i) => i * 220);
const GRID_ROWS = Array.from({ length: Math.ceil(MAP_H / 220) + 1 }, (_, i) => i * 220);

// ─── Topic grouping helper ───────────────────────────────────────────────────
function buildTopicGroups(papers) {
  const groups = {};
  papers.forEach((p) => {
    const topic = p.topics?.[0] || "Other";
    if (!groups[topic]) groups[topic] = { label: topic, paperIds: [] };
    groups[topic].paperIds.push(p.id);
  });
  return Object.values(groups);
}

// ─── Zoom levels ─────────────────────────────────────────────────────────────
// L1 = communities overview, L2 = topics within a community, L3 = papers detail
const LEVEL_COMMUNITIES = 1;
const LEVEL_TOPICS = 2;
const LEVEL_PAPERS = 3;

// ─── Component ───────────────────────────────────────────────────────────────
export default function PaperGraphClient({ papers, links, communities }) {
  const containerRef = useRef(null);
  const svgRef = useRef(null);

  // Zoom level navigation
  const [level, setLevel] = useState(communities?.length > 1 ? LEVEL_COMMUNITIES : LEVEL_PAPERS);
  const [selectedCommunity, setSelectedCommunity] = useState(null);
  const [selectedTopic, setSelectedTopic] = useState(null);

  // filters
  const [minScore, setMinScore] = useState(0.5);
  const [showCrossCluster, setShowCrossCluster] = useState(true);

  // pan/zoom state
  const [tx, setTx] = useState(0);
  const [ty, setTy] = useState(0);
  const [scale, setScale] = useState(1);
  const [panning, setPanning] = useState(false);
  const panOrigin = useRef(null);

  // interaction state
  const [hovered, setHovered] = useState(null);

  // ── Paper lookup ──────────────────────────────────────────────────────────
  const paperById = useMemo(() => {
    const m = {};
    papers.forEach((p) => { m[p.id] = p; });
    return m;
  }, [papers]);

  // ── Community inter-links ─────────────────────────────────────────────────
  const communityLinks = useMemo(() => {
    if (!communities?.length) return [];
    // Build paper → community map
    const paperComm = {};
    communities.forEach((c) => {
      c.paperIds.forEach((pid) => { paperComm[pid] = c.id; });
    });
    // Aggregate cross-community links
    const agg = {};
    links.forEach((l) => {
      const sc = paperComm[l.sourceId];
      const tc = paperComm[l.targetId];
      if (sc == null || tc == null || sc === tc) return;
      const key = [Math.min(sc, tc), Math.max(sc, tc)].join("-");
      if (!agg[key]) agg[key] = { source: Math.min(sc, tc), target: Math.max(sc, tc), totalScore: 0, count: 0 };
      agg[key].totalScore += l.score;
      agg[key].count += 1;
    });
    return Object.values(agg).map((a) => ({
      ...a,
      avgScore: a.totalScore / a.count,
    }));
  }, [communities, links]);

  // ── Topic groups for selected community ───────────────────────────────────
  const topicGroups = useMemo(() => {
    if (level !== LEVEL_TOPICS || selectedCommunity == null) return [];
    const comm = communities.find((c) => c.id === selectedCommunity);
    if (!comm) return [];
    const commPapers = comm.paperIds.map((id) => paperById[id]).filter(Boolean);
    return buildTopicGroups(commPapers);
  }, [level, selectedCommunity, communities, paperById]);

  // ── Filtered papers for current view ──────────────────────────────────────
  const visiblePapers = useMemo(() => {
    if (level === LEVEL_PAPERS) {
      if (selectedTopic) {
        const tg = topicGroups.find((g) => g.label === selectedTopic);
        return tg ? tg.paperIds.map((id) => paperById[id]).filter(Boolean) : papers;
      }
      if (selectedCommunity != null) {
        const comm = communities.find((c) => c.id === selectedCommunity);
        return comm ? comm.paperIds.map((id) => paperById[id]).filter(Boolean) : papers;
      }
      return papers;
    }
    return [];
  }, [level, selectedTopic, selectedCommunity, topicGroups, communities, papers, paperById]);

  // ── Filtered links for current view ───────────────────────────────────────
  const visibleLinks = useMemo(() => {
    if (level !== LEVEL_PAPERS) return [];
    const ids = new Set(visiblePapers.map((p) => p.id));
    return links.filter((l) => {
      if (!ids.has(l.sourceId) || !ids.has(l.targetId)) return false;
      if (l.score < minScore) return false;
      if (l.isCrossCluster && !showCrossCluster) return false;
      return true;
    });
  }, [level, visiblePapers, links, minScore, showCrossCluster]);

  // ── Positions ─────────────────────────────────────────────────────────────
  const communityPositions = useMemo(() => {
    if (!communities?.length) return {};
    const pos = buildPositions(communities, MAP_W, MAP_H, 300);
    const m = {};
    communities.forEach((c, i) => { m[c.id] = pos[i]; });
    return m;
  }, [communities]);

  const topicPositions = useMemo(() => {
    if (!topicGroups.length) return {};
    const pos = buildPositions(topicGroups, MAP_W, MAP_H, 200);
    const m = {};
    topicGroups.forEach((g, i) => { m[g.label] = pos[i]; });
    return m;
  }, [topicGroups]);

  const paperPositions = useMemo(() => {
    if (!visiblePapers.length) return {};
    const pos = buildPositions(visiblePapers, MAP_W, MAP_H, MIN_DIST);
    const m = {};
    visiblePapers.forEach((p, i) => { m[p.id] = pos[i]; });
    return m;
  }, [visiblePapers]);

  // ── Citation-based node scaling ─────────────────────────────────────────
  const nodeRadius = useCallback((paper) => {
    const citations = paper.cited_by || 0;
    // Scale: 14px base up to 30px for highly cited papers
    return NODE_R * 0.8 + Math.min(12, Math.sqrt(citations) * 1.2);
  }, []);

  // ── Link index for paper level ────────────────────────────────────────────
  const linksByPaper = useMemo(() => {
    const idx = {};
    visibleLinks.forEach((l) => {
      (idx[l.sourceId] ??= []).push(l);
      (idx[l.targetId] ??= []).push(l);
    });
    return idx;
  }, [visibleLinks]);

  const connectedSet = useMemo(() => {
    if (!hovered) return null;
    const s = new Set([hovered]);
    (linksByPaper[hovered] ?? []).forEach((l) => {
      s.add(l.sourceId);
      s.add(l.targetId);
    });
    return s;
  }, [hovered, linksByPaper]);

  // ── Fit-to-screen ─────────────────────────────────────────────────────────
  const fitToScreen = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;
    const { width: cw, height: ch } = el.getBoundingClientRect();
    const s = Math.min(cw / MAP_W, ch / MAP_H) * 0.92;
    setScale(s);
    setTx((cw - MAP_W * s) / 2);
    setTy((ch - MAP_H * s) / 2);
  }, []);

  useEffect(() => { fitToScreen(); }, [fitToScreen]);

  // Reset view when changing levels
  useEffect(() => { fitToScreen(); }, [level, selectedCommunity, selectedTopic, fitToScreen]);

  // ── Navigation handlers ───────────────────────────────────────────────────
  const drillIntoCommunity = useCallback((commId) => {
    const comm = communities.find((c) => c.id === commId);
    if (!comm) return;
    setSelectedCommunity(commId);
    setSelectedTopic(null);
    setHovered(null);
    // If community has few papers, go straight to paper view
    if (comm.paperIds.length <= 15) {
      setLevel(LEVEL_PAPERS);
    } else {
      setLevel(LEVEL_TOPICS);
    }
  }, [communities]);

  const drillIntoTopic = useCallback((topicLabel) => {
    setSelectedTopic(topicLabel);
    setHovered(null);
    setLevel(LEVEL_PAPERS);
  }, []);

  const goBack = useCallback(() => {
    setHovered(null);
    if (level === LEVEL_PAPERS && selectedTopic) {
      setSelectedTopic(null);
      setLevel(LEVEL_TOPICS);
    } else if (level === LEVEL_PAPERS || level === LEVEL_TOPICS) {
      setSelectedCommunity(null);
      setSelectedTopic(null);
      setLevel(communities?.length > 1 ? LEVEL_COMMUNITIES : LEVEL_PAPERS);
    }
  }, [level, selectedTopic, communities]);

  // ── Pan handlers ──────────────────────────────────────────────────────────
  const onMouseDown = useCallback((e) => {
    if (e.button !== 0) return;
    if (e.target.closest("[data-node]")) return;
    setPanning(true);
    panOrigin.current = { mx: e.clientX, my: e.clientY, tx, ty };
  }, [tx, ty]);

  const onMouseMove = useCallback((e) => {
    if (!panning || !panOrigin.current) return;
    setTx(panOrigin.current.tx + e.clientX - panOrigin.current.mx);
    setTy(panOrigin.current.ty + e.clientY - panOrigin.current.my);
  }, [panning]);

  const onMouseUp = useCallback(() => {
    setPanning(false);
    panOrigin.current = null;
  }, []);

  // ── Zoom on wheel ─────────────────────────────────────────────────────────
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const handler = (e) => {
      e.preventDefault();
      const rect = el.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;
      const factor = e.deltaY < 0 ? 1.12 : 0.89;
      setScale((s) => {
        const next = Math.max(0.2, Math.min(4, s * factor));
        setTx((t) => mx - (mx - t) * (next / s));
        setTy((t) => my - (my - t) * (next / s));
        return next;
      });
    };
    el.addEventListener("wheel", handler, { passive: false });
    return () => el.removeEventListener("wheel", handler);
  }, []);

  // ── Tooltip data ──────────────────────────────────────────────────────────
  const tooltipData = useMemo(() => {
    if (!hovered || level !== LEVEL_PAPERS) return null;
    const paper = paperById[hovered];
    const pos = paperPositions[hovered];
    if (!paper || !pos) return null;
    const sx = tx + pos.x * scale;
    const sy = ty + pos.y * scale;
    return { paper, sx, sy, linkCount: (linksByPaper[hovered] ?? []).length };
  }, [hovered, level, paperById, paperPositions, tx, ty, scale, linksByPaper]);

  const hovPaper = tooltipData?.paper;
  const hovLinks = hovPaper ? (linksByPaper[hovPaper.id] ?? []) : [];

  // ── Breadcrumb text ───────────────────────────────────────────────────────
  const breadcrumb = useMemo(() => {
    const parts = [];
    if (communities?.length > 1) parts.push("All Communities");
    if (selectedCommunity != null) {
      const c = communities.find((c) => c.id === selectedCommunity);
      parts.push(c?.label || `Cluster ${selectedCommunity}`);
    }
    if (selectedTopic) parts.push(selectedTopic);
    return parts;
  }, [communities, selectedCommunity, selectedTopic]);

  // ── Count stats ───────────────────────────────────────────────────────────
  const statsText = useMemo(() => {
    if (level === LEVEL_COMMUNITIES) return `${communities?.length || 0} COMMUNITIES · ${papers.length} PAPERS · ${links.length} LINKS`;
    if (level === LEVEL_TOPICS) return `${topicGroups.length} TOPICS · ${visiblePapers.length || "?"} PAPERS`;
    return `${visiblePapers.length} PAPERS · ${visibleLinks.length} LINKS`;
  }, [level, communities, papers, links, topicGroups, visiblePapers, visibleLinks]);

  return (
    <div
      ref={containerRef}
      className="relative w-full overflow-hidden select-none"
      style={{
        height: "calc(100vh - 4rem)",
        background: "#03070f",
        cursor: panning ? "grabbing" : "grab",
      }}
      onMouseDown={onMouseDown}
      onMouseMove={onMouseMove}
      onMouseUp={onMouseUp}
      onMouseLeave={onMouseUp}
    >
      {/* ── Scanline CRT overlay ──────────────────────────────────────────── */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 z-20"
        style={{
          backgroundImage:
            "repeating-linear-gradient(0deg,transparent,transparent 2px,rgba(0,0,0,0.12) 2px,rgba(0,0,0,0.12) 4px)",
          mixBlendMode: "multiply",
        }}
      />

      {/* ── Corner brackets ───────────────────────────────────────────────── */}
      {[
        "top-3 left-3 border-t-2 border-l-2",
        "top-3 right-3 border-t-2 border-r-2",
        "bottom-3 left-3 border-b-2 border-l-2",
        "bottom-3 right-3 border-b-2 border-r-2",
      ].map((cls) => (
        <div key={cls} aria-hidden className={`pointer-events-none absolute ${cls} border-amber-500/30 w-8 h-8 z-30`} />
      ))}

      {/* ── Top-left HUD ──────────────────────────────────────────────────── */}
      <div className="pointer-events-none absolute top-5 left-6 z-30 font-mono">
        <div className="text-amber-400 text-xs tracking-[0.25em] font-bold">
          ◈ GALACTIC RESEARCH INTELLIGENCE DIVISION
        </div>
        <div className="text-amber-500/40 text-[10px] tracking-widest mt-0.5">
          SECTOR MAP &nbsp;·&nbsp; {statsText}
        </div>
      </div>

      {/* ── Breadcrumb + Back button ──────────────────────────────────────── */}
      {breadcrumb.length > 0 && (
        <div className="absolute top-14 left-6 z-40 flex items-center gap-2 font-mono text-[10px]">
          {level !== LEVEL_COMMUNITIES && (
            <button
              onClick={goBack}
              className="text-amber-400 border border-amber-500/40 px-2 py-0.5 hover:bg-amber-500/20 transition-colors"
            >
              ◂ BACK
            </button>
          )}
          {breadcrumb.map((part, i) => (
            <span key={i} className="text-amber-500/60">
              {i > 0 && <span className="mx-1 text-amber-500/30">▸</span>}
              {part}
            </span>
          ))}
        </div>
      )}

      {/* ── Top-right HUD ─────────────────────────────────────────────────── */}
      <div className="pointer-events-none absolute top-5 right-6 z-30 font-mono text-right">
        <div className="text-amber-400/50 text-[10px] tracking-widest">AI RESEARCH INSTITUTE</div>
        <div className="text-amber-500/25 text-[9px] tracking-widest mt-0.5">DEMOCRACY SCIENCE DIVISION</div>
      </div>

      {/* ── Legend ────────────────────────────────────────────────────────── */}
      <div className="pointer-events-none absolute bottom-6 left-5 z-30 font-mono text-[10px]">
        <div className="text-amber-500/50 tracking-widest mb-2">
          {level === LEVEL_PAPERS ? "LINK STRENGTH" : "NAVIGATION"}
        </div>
        {level === LEVEL_PAPERS ? (
          <>
            {[
              { color: "#4d7fff", label: "WEAK   0.50 – 0.65", w: 1 },
              { color: "#ff8c00", label: "MODERATE  0.65 – 0.80", w: 2 },
              { color: "#ffe066", label: "STRONG  0.80 – 1.00", w: 3 },
              { color: "#ffa500", label: "CROSS-CLUSTER", w: 1.5, dash: true },
            ].map(({ color, label, w, dash }) => (
              <div key={label} className="flex items-center gap-2 mb-1">
                <svg width="24" height={w + 4}>
                  <line
                    x1="0" y1={(w + 4) / 2} x2="24" y2={(w + 4) / 2}
                    stroke={color} strokeWidth={w}
                    strokeDasharray={dash ? "4 3" : "none"}
                  />
                </svg>
                <span style={{ color }}>{label}</span>
              </div>
            ))}
          </>
        ) : (
          <div className="text-amber-500/40">CLICK TO ZOOM IN</div>
        )}
      </div>

      {/* ── Controls hint ─────────────────────────────────────────────────── */}
      <div className="pointer-events-none absolute bottom-6 right-5 z-30 font-mono text-[9px] text-amber-500/30 text-right tracking-widest">
        <div>SCROLL TO ZOOM</div>
        <div>DRAG TO PAN</div>
        <div>{level === LEVEL_PAPERS ? "HOVER NODE FOR INTEL" : "CLICK NODE TO DRILL IN"}</div>
      </div>

      {/* ── Filter controls (paper level only) ───────────────────────────── */}
      {level === LEVEL_PAPERS && (
        <div className="absolute bottom-20 right-5 z-40 font-mono text-[9px]"
          style={{
            background: "rgba(3,7,15,0.92)",
            border: "1px solid rgba(255,180,0,0.25)",
            padding: "10px 14px",
          }}
        >
          <div className="text-amber-500/60 tracking-widest mb-2">FILTERS</div>

          <label className="flex items-center gap-2 text-amber-400/70 mb-2">
            <span className="w-20">MIN SCORE</span>
            <input
              type="range" min="0.3" max="0.9" step="0.05"
              value={minScore}
              onChange={(e) => setMinScore(parseFloat(e.target.value))}
              className="w-20 accent-amber-500"
            />
            <span className="text-amber-300 w-8 text-right">{minScore.toFixed(2)}</span>
          </label>

          <label className="flex items-center gap-2 text-amber-400/70 cursor-pointer">
            <input
              type="checkbox"
              checked={showCrossCluster}
              onChange={(e) => setShowCrossCluster(e.target.checked)}
              className="accent-amber-500"
            />
            <span>CROSS-CLUSTER LINKS</span>
          </label>
        </div>
      )}

      {/* ── SVG map ───────────────────────────────────────────────────────── */}
      <svg
        ref={svgRef}
        width={MAP_W}
        height={MAP_H}
        aria-label="Paper relationship map"
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          overflow: "visible",
          transformOrigin: "top left",
          transform: `translate(${tx}px,${ty}px) scale(${scale})`,
          willChange: "transform",
        }}
      >
        <defs>
          <radialGradient id="nebula1" cx="30%" cy="40%" r="50%">
            <stop offset="0%" stopColor="#0d2a5e" stopOpacity="0.5" />
            <stop offset="100%" stopColor="#03070f" stopOpacity="0" />
          </radialGradient>
          <radialGradient id="nebula2" cx="70%" cy="65%" r="50%">
            <stop offset="0%" stopColor="#1a0d3d" stopOpacity="0.45" />
            <stop offset="100%" stopColor="#03070f" stopOpacity="0" />
          </radialGradient>
          <radialGradient id="ng" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#ff8c00" stopOpacity="0.45" />
            <stop offset="100%" stopColor="#ff8c00" stopOpacity="0" />
          </radialGradient>
          <radialGradient id="ng-hot" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#ffe066" stopOpacity="0.65" />
            <stop offset="100%" stopColor="#ffe066" stopOpacity="0" />
          </radialGradient>
          <filter id="blur-sm" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="3" />
          </filter>
          <filter id="glow" x="-60%" y="-60%" width="220%" height="220%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="4" result="blur" />
            <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
          <filter id="glow-hot" x="-80%" y="-80%" width="260%" height="260%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="7" result="blur" />
            <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
        </defs>

        {/* Background */}
        <rect width={MAP_W} height={MAP_H} fill="#03070f" />
        <rect width={MAP_W} height={MAP_H} fill="url(#nebula1)" />
        <rect width={MAP_W} height={MAP_H} fill="url(#nebula2)" />

        {/* Stars */}
        {STARS.map((s) => (
          <circle key={s.id} cx={s.cx} cy={s.cy} r={s.r} fill="white" opacity={s.opacity} />
        ))}

        {/* Grid */}
        {GRID_COLS.map((x) => (
          <line key={`gc${x}`} x1={x} y1={0} x2={x} y2={MAP_H}
            stroke="rgba(80,160,255,0.035)" strokeWidth="1" />
        ))}
        {GRID_ROWS.map((y) => (
          <line key={`gr${y}`} x1={0} y1={y} x2={MAP_W} y2={y}
            stroke="rgba(80,160,255,0.035)" strokeWidth="1" />
        ))}

        {/* ── LEVEL 1: Communities ──────────────────────────────────────── */}
        {level === LEVEL_COMMUNITIES && communities && (
          <>
            {/* Community inter-links */}
            {communityLinks.map((cl, i) => {
              const a = communityPositions[cl.source];
              const b = communityPositions[cl.target];
              if (!a || !b) return null;
              const w = Math.max(1, Math.min(8, cl.count * 0.5));
              return (
                <line
                  key={i}
                  x1={a.x} y1={a.y} x2={b.x} y2={b.y}
                  stroke="#ffa500"
                  strokeWidth={w}
                  opacity={0.25 + cl.avgScore * 0.3}
                  strokeDasharray="8 6"
                  style={{ transition: "all 0.3s" }}
                />
              );
            })}

            {/* Community bubbles */}
            {communities.map((comm, ci) => {
              const pos = communityPositions[comm.id];
              if (!pos) return null;
              const r = COMMUNITY_R_BASE + Math.sqrt(comm.paperIds.length) * 8;
              const color = COMMUNITY_COLORS[ci % COMMUNITY_COLORS.length];
              const isHov = hovered === `comm-${comm.id}`;

              return (
                <g
                  key={comm.id}
                  data-node="1"
                  transform={`translate(${pos.x},${pos.y})`}
                  style={{ cursor: "pointer" }}
                  onMouseEnter={() => setHovered(`comm-${comm.id}`)}
                  onMouseLeave={() => setHovered(null)}
                  onClick={() => drillIntoCommunity(comm.id)}
                >
                  {/* Glow */}
                  <circle
                    r={r * 1.6}
                    fill={color}
                    opacity={isHov ? 0.15 : 0.06}
                    filter="url(#blur-sm)"
                    style={{ transition: "opacity 0.2s" }}
                  />
                  {/* Orbit ring */}
                  <circle
                    r={r + 8}
                    fill="none"
                    stroke={color}
                    strokeWidth={isHov ? 2 : 1}
                    strokeDasharray={isHov ? "none" : "8 6"}
                    opacity={isHov ? 0.8 : 0.4}
                    style={{ transition: "all 0.2s" }}
                  />
                  {/* Main bubble */}
                  <circle
                    r={r}
                    fill={`${color}15`}
                    stroke={color}
                    strokeWidth={isHov ? 2.5 : 1.5}
                    opacity={isHov ? 1 : 0.7}
                    filter={isHov ? "url(#glow)" : undefined}
                    style={{ transition: "all 0.2s" }}
                  />
                  {/* Label */}
                  <text
                    textAnchor="middle"
                    dominantBaseline="middle"
                    fontSize={11}
                    fontFamily="monospace"
                    fill={color}
                    opacity={0.9}
                    style={{ userSelect: "none", pointerEvents: "none" }}
                  >
                    {comm.label.length > 35 ? comm.label.slice(0, 35) + "…" : comm.label}
                  </text>
                  {/* Paper count */}
                  <text
                    y={16}
                    textAnchor="middle"
                    fontSize={9}
                    fontFamily="monospace"
                    fill={color}
                    opacity={0.5}
                    style={{ userSelect: "none", pointerEvents: "none" }}
                  >
                    {comm.paperIds.length} papers
                  </text>
                </g>
              );
            })}
          </>
        )}

        {/* ── LEVEL 2: Topics ──────────────────────────────────────────── */}
        {level === LEVEL_TOPICS && (
          <>
            {topicGroups.map((tg, ti) => {
              const pos = topicPositions[tg.label];
              if (!pos) return null;
              const r = TOPIC_R + Math.sqrt(tg.paperIds.length) * 6;
              const commColor = selectedCommunity != null
                ? COMMUNITY_COLORS[(communities.findIndex((c) => c.id === selectedCommunity)) % COMMUNITY_COLORS.length]
                : "#4ecdc4";
              const isHov = hovered === `topic-${tg.label}`;

              return (
                <g
                  key={tg.label}
                  data-node="1"
                  transform={`translate(${pos.x},${pos.y})`}
                  style={{ cursor: "pointer" }}
                  onMouseEnter={() => setHovered(`topic-${tg.label}`)}
                  onMouseLeave={() => setHovered(null)}
                  onClick={() => drillIntoTopic(tg.label)}
                >
                  <circle
                    r={r * 1.4}
                    fill={commColor}
                    opacity={isHov ? 0.12 : 0.04}
                    filter="url(#blur-sm)"
                  />
                  <circle
                    r={r}
                    fill={`${commColor}10`}
                    stroke={commColor}
                    strokeWidth={isHov ? 2 : 1}
                    opacity={isHov ? 1 : 0.6}
                    filter={isHov ? "url(#glow)" : undefined}
                    style={{ transition: "all 0.2s" }}
                  />
                  <text
                    textAnchor="middle"
                    dominantBaseline="middle"
                    fontSize={9}
                    fontFamily="monospace"
                    fill={commColor}
                    opacity={0.85}
                    style={{ userSelect: "none", pointerEvents: "none" }}
                  >
                    {tg.label.length > 30 ? tg.label.slice(0, 30) + "…" : tg.label}
                  </text>
                  <text
                    y={14}
                    textAnchor="middle"
                    fontSize={8}
                    fontFamily="monospace"
                    fill={commColor}
                    opacity={0.4}
                    style={{ userSelect: "none", pointerEvents: "none" }}
                  >
                    {tg.paperIds.length} papers
                  </text>
                </g>
              );
            })}
          </>
        )}

        {/* ── LEVEL 3: Papers (granular) ───────────────────────────────── */}
        {level === LEVEL_PAPERS && (
          <>
            {/* Links */}
            {visibleLinks.map((l) => {
              const a = paperPositions[l.sourceId];
              const b = paperPositions[l.targetId];
              if (!a || !b) return null;
              const { stroke, width, opacity, dash } = linkStyle(l.score, l.isCrossCluster);
              const isActive = hovered && (l.sourceId === hovered || l.targetId === hovered);
              const isDim = hovered && !isActive;

              return (
                <line
                  key={l.id}
                  x1={a.x} y1={a.y} x2={b.x} y2={b.y}
                  stroke={stroke}
                  strokeWidth={isActive ? width * 3 : width}
                  strokeDasharray={dash}
                  opacity={isDim ? 0.04 : isActive ? 1 : opacity}
                  style={{ transition: "opacity 0.18s, stroke-width 0.18s" }}
                />
              );
            })}

            {/* Nodes */}
            {visiblePapers.map((paper) => {
              const pos = paperPositions[paper.id];
              if (!pos) return null;
              const isHot = hovered === paper.id;
              const isNear = connectedSet?.has(paper.id) && !isHot;
              const isDim = hovered && !isHot && !isNear;
              const r = nodeRadius(paper);
              const showLabel = scale > 0.5 || isHot || isNear;

              return (
                <g
                  key={paper.id}
                  data-node="1"
                  transform={`translate(${pos.x},${pos.y})`}
                  style={{ cursor: "pointer" }}
                  onMouseEnter={() => setHovered(paper.id)}
                  onMouseLeave={() => setHovered(null)}
                >
                  {(isHot || isNear) && (
                    <circle
                      r={r * 3.5}
                      fill={isHot ? "url(#ng-hot)" : "url(#ng)"}
                      opacity={isDim ? 0 : isHot ? 0.9 : 0.55}
                    />
                  )}
                  <circle
                    r={r + 7}
                    fill="none"
                    stroke={isHot ? "#ffe066" : isNear ? "#ff8c00" : "#2a5080"}
                    strokeWidth={isHot ? 1.5 : 1}
                    strokeDasharray={isHot ? "none" : "5 4"}
                    opacity={isDim ? 0.08 : isHot ? 1 : isNear ? 0.7 : 0.35}
                    style={{ transition: "all 0.2s" }}
                  />
                  <circle
                    r={r}
                    fill={isHot ? "#152540" : "#0a1a30"}
                    stroke={isHot ? "#ffe066" : isNear ? "#ff8c00" : "#1e4d80"}
                    strokeWidth={isHot ? 2.5 : 1.5}
                    opacity={isDim ? 0.15 : 1}
                    filter={isHot ? "url(#glow-hot)" : isNear ? "url(#glow)" : undefined}
                    style={{ transition: "all 0.2s" }}
                  />
                  <text
                    textAnchor="middle"
                    dominantBaseline="middle"
                    fontSize={9}
                    fontFamily="monospace"
                    fill={isDim ? "#ffffff1a" : isHot ? "#ffe066" : "#5599cc"}
                    style={{ transition: "all 0.2s", userSelect: "none", pointerEvents: "none" }}
                  >
                    {paper.year ?? "?"}
                  </text>
                  {showLabel && (
                    <text
                      y={r + 13}
                      textAnchor="middle"
                      fontSize={7}
                      fontFamily="monospace"
                      fill={isDim ? "#ffffff0d" : isHot ? "#ffe066aa" : "#33608a"}
                      style={{ transition: "all 0.2s", userSelect: "none", pointerEvents: "none" }}
                    >
                      {(paper.title ?? "").slice(0, 24)}
                      {(paper.title ?? "").length > 24 ? "…" : ""}
                    </text>
                  )}
                </g>
              );
            })}
          </>
        )}
      </svg>

      {/* ── Intel tooltip ─────────────────────────────────────────────────── */}
      {tooltipData && (
        <IntelPanel
          paper={hovPaper}
          links={hovLinks}
          sx={tooltipData.sx}
          sy={tooltipData.sy}
          scale={scale}
        />
      )}
    </div>
  );
}

// ── Intel tooltip panel ───────────────────────────────────────────────────────
function IntelPanel({ paper, links, sx, sy, scale }) {
  const panelW = 300;
  const panelH = 250;

  const containerW = typeof window !== "undefined" ? window.innerWidth : 1200;
  const containerH = typeof window !== "undefined" ? window.innerHeight : 800;

  let left = sx + NODE_R * scale + 10;
  let top = sy - panelH / 2;

  if (left + panelW > containerW - 10) left = sx - NODE_R * scale - panelW - 10;
  if (top < 10) top = 10;
  if (top + panelH > containerH - 10) top = containerH - panelH - 10;

  const strong = links.filter((l) => l.score >= 0.8).length;
  const moderate = links.filter((l) => l.score >= 0.65 && l.score < 0.8).length;
  const weak = links.filter((l) => l.score < 0.65).length;
  const cross = links.filter((l) => l.isCrossCluster).length;

  return (
    <div
      className="pointer-events-none absolute z-40 font-mono"
      style={{ left, top, width: panelW }}
    >
      <div className="flex items-center gap-1 mb-0.5 px-1">
        <div className="h-px flex-1 bg-amber-500/40" />
        <span className="text-amber-500/50 text-[8px] tracking-[0.3em]">INTEL</span>
        <div className="h-px flex-1 bg-amber-500/40" />
      </div>

      <div
        style={{
          background: "rgba(3,7,15,0.96)",
          border: "1px solid rgba(255,180,0,0.35)",
          boxShadow: "0 0 24px rgba(255,140,0,0.18), inset 0 0 18px rgba(255,140,0,0.04)",
          padding: "14px 16px",
        }}
      >
        <div className="text-amber-300 text-[11px] font-bold leading-snug mb-2">
          {paper.title}
        </div>

        <div className="flex gap-4 text-[10px] text-amber-500/60 tracking-wider mb-2">
          {paper.year && <span>◈ {paper.year}</span>}
          {paper.cited_by != null && <span>⬡ {paper.cited_by} citations</span>}
          <span>⇌ {links.length} links</span>
        </div>

        {paper.communityLabel && (
          <div className="text-[9px] text-amber-400/50 mb-2 border border-amber-500/20 px-1.5 py-0.5 inline-block">
            ◈ {paper.communityLabel}
          </div>
        )}

        {paper.topics?.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-2">
            {paper.topics.map((t) => (
              <span
                key={t}
                className="text-amber-400/70 border border-amber-500/30 px-1.5 py-0.5"
                style={{ fontSize: 8, letterSpacing: "0.06em" }}
              >
                {t}
              </span>
            ))}
          </div>
        )}

        {paper.abstract && (
          <div
            className="text-blue-200/50 leading-relaxed border-t border-amber-500/20 pt-2 mt-1"
            style={{ fontSize: 9 }}
          >
            {paper.abstract.slice(0, 220)}…
          </div>
        )}

        {links.length > 0 && (
          <div className="flex gap-3 mt-2 pt-2 border-t border-amber-500/15" style={{ fontSize: 9 }}>
            {strong > 0 && <span style={{ color: "#ffe066" }}>◆ {strong} strong</span>}
            {moderate > 0 && <span style={{ color: "#ff8c00" }}>◆ {moderate} moderate</span>}
            {weak > 0 && <span style={{ color: "#4d7fff" }}>◆ {weak} weak</span>}
            {cross > 0 && <span style={{ color: "#ffa500" }}>◆ {cross} cross-cluster</span>}
          </div>
        )}
      </div>

      <div className="flex items-center gap-1 mt-0.5 px-1">
        <div className="h-px flex-1 bg-amber-500/25" />
        <span className="text-amber-500/25 text-[7px] tracking-[0.3em]">
          {paper.openAlexId?.split("/").at(-1) ?? ""}
        </span>
        <div className="h-px flex-1 bg-amber-500/25" />
      </div>
    </div>
  );
}
