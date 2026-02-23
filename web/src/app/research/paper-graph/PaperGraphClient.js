"use client";

import { useState, useRef, useCallback, useEffect, useMemo } from "react";

// ─── Layout constants ────────────────────────────────────────────────────────
const MAP_W = 2800;
const MAP_H = 1800;
const NODE_R = 18;
const MIN_DIST = 160;

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
    twinkle: rng() > 0.85, // some stars twinkle
  }));
}
const STARS = buildStars(600);

// ─── Build node positions ─────────────────────────────────────────────────────
function buildPositions(papers) {
  const PAD = 140;
  const rng = makeRng(0xc0ffee);
  const pos = papers.map(() => ({
    x: PAD + rng() * (MAP_W - PAD * 2),
    y: PAD + rng() * (MAP_H - PAD * 2),
  }));

  // Simple force relaxation — 30 passes
  for (let pass = 0; pass < 30; pass++) {
    for (let i = 0; i < pos.length; i++) {
      for (let j = i + 1; j < pos.length; j++) {
        const dx = pos[j].x - pos[i].x;
        const dy = pos[j].y - pos[i].y;
        const d = Math.sqrt(dx * dx + dy * dy) || 0.001;
        if (d < MIN_DIST) {
          const f = ((MIN_DIST - d) / d) * 0.5;
          pos[i].x -= dx * f;
          pos[i].y -= dy * f;
          pos[j].x += dx * f;
          pos[j].y += dy * f;
          pos[i].x = Math.max(PAD, Math.min(MAP_W - PAD, pos[i].x));
          pos[i].y = Math.max(PAD, Math.min(MAP_H - PAD, pos[i].y));
          pos[j].x = Math.max(PAD, Math.min(MAP_W - PAD, pos[j].x));
          pos[j].y = Math.max(PAD, Math.min(MAP_H - PAD, pos[j].y));
        }
      }
    }
  }
  return pos;
}

// ─── Link visual style by score ──────────────────────────────────────────────
function linkStyle(score) {
  if (score >= 0.8) return { stroke: "#ffe066", width: 2.2, opacity: 0.80 };
  if (score >= 0.65) return { stroke: "#ff8c00", width: 1.5, opacity: 0.65 };
  return { stroke: "#4d7fff", width: 0.9, opacity: 0.40 };
}

// ─── Grid lines ──────────────────────────────────────────────────────────────
const GRID_COLS = Array.from({ length: Math.ceil(MAP_W / 220) + 1 }, (_, i) => i * 220);
const GRID_ROWS = Array.from({ length: Math.ceil(MAP_H / 220) + 1 }, (_, i) => i * 220);

// ─── Component ───────────────────────────────────────────────────────────────
export default function PaperGraphClient({ papers, links }) {
  const containerRef = useRef(null);
  const svgRef = useRef(null);

  // pan/zoom state
  const [tx, setTx] = useState(0);
  const [ty, setTy] = useState(0);
  const [scale, setScale] = useState(1);
  const [panning, setPanning] = useState(false);
  const panOrigin = useRef(null);

  // interaction state
  const [hovered, setHovered] = useState(null); // paper id

  // Pre-build layout (stable across renders)
  const positions = useMemo(() => {
    const posArray = buildPositions(papers);
    const map = {};
    papers.forEach((p, i) => { map[p.id] = posArray[i]; });
    return map;
  }, [papers]);

  // Index links by paper id
  const linksByPaper = useMemo(() => {
    const idx = {};
    links.forEach((l) => {
      (idx[l.sourceId] ??= []).push(l);
      (idx[l.targetId] ??= []).push(l);
    });
    return idx;
  }, [links]);

  // Connected paper ids for hovered node
  const connectedSet = useMemo(() => {
    if (!hovered) return null;
    const s = new Set([hovered]);
    (linksByPaper[hovered] ?? []).forEach((l) => {
      s.add(l.sourceId);
      s.add(l.targetId);
    });
    return s;
  }, [hovered, linksByPaper]);

  // ── Fit-to-screen on mount ────────────────────────────────────────────────
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const { width: cw, height: ch } = el.getBoundingClientRect();
    const s = Math.min(cw / MAP_W, ch / MAP_H) * 0.92;
    setScale(s);
    setTx((cw - MAP_W * s) / 2);
    setTy((ch - MAP_H * s) / 2);
  }, []);

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
        // Zoom towards mouse pointer
        setTx((t) => mx - (mx - t) * (next / s));
        setTy((t) => my - (my - t) * (next / s));
        return next;
      });
    };
    el.addEventListener("wheel", handler, { passive: false });
    return () => el.removeEventListener("wheel", handler);
  }, []);

  // ── Tooltip position (in screen space) ────────────────────────────────────
  const tooltipData = useMemo(() => {
    if (!hovered) return null;
    const paper = papers.find((p) => p.id === hovered);
    const pos = positions[hovered];
    if (!paper || !pos) return null;
    const sx = tx + pos.x * scale;
    const sy = ty + pos.y * scale;
    return { paper, sx, sy, linkCount: (linksByPaper[hovered] ?? []).length };
  }, [hovered, papers, positions, tx, ty, scale, linksByPaper]);

  const hovPaper = tooltipData?.paper;
  const hovLinks = hovPaper ? (linksByPaper[hovPaper.id] ?? []) : [];

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

      {/* ── Corner bracket decorations ────────────────────────────────────── */}
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
          SECTOR MAP &nbsp;·&nbsp; {papers.length} PAPERS &nbsp;·&nbsp; {links.length} LINKS
        </div>
      </div>

      {/* ── Top-right HUD ─────────────────────────────────────────────────── */}
      <div className="pointer-events-none absolute top-5 right-6 z-30 font-mono text-right">
        <div className="text-amber-400/50 text-[10px] tracking-widest">AI RESEARCH INSTITUTE</div>
        <div className="text-amber-500/25 text-[9px] tracking-widest mt-0.5">DEMOCRACY SCIENCE DIVISION</div>
      </div>

      {/* ── Legend ────────────────────────────────────────────────────────── */}
      <div className="pointer-events-none absolute bottom-6 left-5 z-30 font-mono text-[10px]">
        <div className="text-amber-500/50 tracking-widest mb-2">LINK STRENGTH</div>
        {[
          { color: "#4d7fff", label: "WEAK   0.50 – 0.65", w: 1 },
          { color: "#ff8c00", label: "MODERATE  0.65 – 0.80", w: 2 },
          { color: "#ffe066", label: "STRONG  0.80 – 1.00", w: 3 },
        ].map(({ color, label, w }) => (
          <div key={label} className="flex items-center gap-2 mb-1">
            <svg width="24" height={w + 2}>
              <line x1="0" y1={(w + 2) / 2} x2="24" y2={(w + 2) / 2} stroke={color} strokeWidth={w} />
            </svg>
            <span style={{ color }}>{label}</span>
          </div>
        ))}
      </div>

      {/* ── Controls hint ─────────────────────────────────────────────────── */}
      <div className="pointer-events-none absolute bottom-6 right-5 z-30 font-mono text-[9px] text-amber-500/30 text-right tracking-widest">
        <div>SCROLL TO ZOOM</div>
        <div>DRAG TO PAN</div>
        <div>HOVER NODE FOR INTEL</div>
      </div>

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
          {/* Nebula radial gradient */}
          <radialGradient id="nebula1" cx="30%" cy="40%" r="50%">
            <stop offset="0%" stopColor="#0d2a5e" stopOpacity="0.5" />
            <stop offset="100%" stopColor="#03070f" stopOpacity="0" />
          </radialGradient>
          <radialGradient id="nebula2" cx="70%" cy="65%" r="50%">
            <stop offset="0%" stopColor="#1a0d3d" stopOpacity="0.45" />
            <stop offset="100%" stopColor="#03070f" stopOpacity="0" />
          </radialGradient>

          {/* Node glow */}
          <radialGradient id="ng" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#ff8c00" stopOpacity="0.45" />
            <stop offset="100%" stopColor="#ff8c00" stopOpacity="0" />
          </radialGradient>
          <radialGradient id="ng-hot" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#ffe066" stopOpacity="0.65" />
            <stop offset="100%" stopColor="#ffe066" stopOpacity="0" />
          </radialGradient>

          {/* Blur filter for soft glow */}
          <filter id="blur-sm" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="3" />
          </filter>
          <filter id="blur-lg" x="-100%" y="-100%" width="300%" height="300%">
            <feGaussianBlur stdDeviation="7" />
          </filter>

          {/* Hard glow composite */}
          <filter id="glow" x="-60%" y="-60%" width="220%" height="220%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="4" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <filter id="glow-hot" x="-80%" y="-80%" width="260%" height="260%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="7" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Background fill */}
        <rect width={MAP_W} height={MAP_H} fill="#03070f" />

        {/* Nebula blobs */}
        <rect width={MAP_W} height={MAP_H} fill="url(#nebula1)" />
        <rect width={MAP_W} height={MAP_H} fill="url(#nebula2)" />

        {/* Stars */}
        {STARS.map((s) => (
          <circle
            key={s.id}
            cx={s.cx}
            cy={s.cy}
            r={s.r}
            fill="white"
            opacity={s.opacity}
          />
        ))}

        {/* Sector grid */}
        {GRID_COLS.map((x) => (
          <line key={`gc${x}`} x1={x} y1={0} x2={x} y2={MAP_H}
            stroke="rgba(80,160,255,0.035)" strokeWidth="1" />
        ))}
        {GRID_ROWS.map((y) => (
          <line key={`gr${y}`} x1={0} y1={y} x2={MAP_W} y2={y}
            stroke="rgba(80,160,255,0.035)" strokeWidth="1" />
        ))}

        {/* ── Links ──────────────────────────────────────────────────────── */}
        {links.map((l) => {
          const a = positions[l.sourceId];
          const b = positions[l.targetId];
          if (!a || !b) return null;
          const { stroke, width, opacity } = linkStyle(l.score);
          const isActive = hovered && (l.sourceId === hovered || l.targetId === hovered);
          const isDim = hovered && !isActive;

          return (
            <line
              key={l.id}
              x1={a.x} y1={a.y} x2={b.x} y2={b.y}
              stroke={stroke}
              strokeWidth={isActive ? width * 3 : width}
              opacity={isDim ? 0.04 : isActive ? 1 : opacity}
              style={{ transition: "opacity 0.18s, stroke-width 0.18s" }}
            />
          );
        })}

        {/* ── Nodes ──────────────────────────────────────────────────────── */}
        {papers.map((paper) => {
          const pos = positions[paper.id];
          if (!pos) return null;
          const isHot = hovered === paper.id;
          const isNear = connectedSet?.has(paper.id) && !isHot;
          const isDim = hovered && !isHot && !isNear;

          return (
            <g
              key={paper.id}
              data-node="1"
              transform={`translate(${pos.x},${pos.y})`}
              style={{ cursor: "pointer" }}
              onMouseEnter={() => setHovered(paper.id)}
              onMouseLeave={() => setHovered(null)}
            >
              {/* Soft glow halo */}
              {(isHot || isNear) && (
                <circle
                  r={NODE_R * 3.5}
                  fill={isHot ? "url(#ng-hot)" : "url(#ng)"}
                  opacity={isDim ? 0 : isHot ? 0.9 : 0.55}
                />
              )}

              {/* Dashed outer orbit ring */}
              <circle
                r={NODE_R + 7}
                fill="none"
                stroke={isHot ? "#ffe066" : isNear ? "#ff8c00" : "#2a5080"}
                strokeWidth={isHot ? 1.5 : 1}
                strokeDasharray={isHot ? "none" : "5 4"}
                opacity={isDim ? 0.08 : isHot ? 1 : isNear ? 0.7 : 0.35}
                style={{ transition: "all 0.2s" }}
              />

              {/* Main planet circle */}
              <circle
                r={NODE_R}
                fill={isHot ? "#152540" : "#0a1a30"}
                stroke={isHot ? "#ffe066" : isNear ? "#ff8c00" : "#1e4d80"}
                strokeWidth={isHot ? 2.5 : 1.5}
                opacity={isDim ? 0.15 : 1}
                filter={isHot ? "url(#glow-hot)" : isNear ? "url(#glow)" : undefined}
                style={{ transition: "all 0.2s" }}
              />

              {/* Year label inside node */}
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

              {/* Short title below node */}
              <text
                y={NODE_R + 13}
                textAnchor="middle"
                fontSize={7}
                fontFamily="monospace"
                fill={isDim ? "#ffffff0d" : isHot ? "#ffe066aa" : "#33608a"}
                style={{ transition: "all 0.2s", userSelect: "none", pointerEvents: "none" }}
              >
                {(paper.title ?? "").slice(0, 24)}
                {(paper.title ?? "").length > 24 ? "…" : ""}
              </text>
            </g>
          );
        })}
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
  const panelH = 250; // rough estimate

  // Try to stay within viewport
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

  return (
    <div
      className="pointer-events-none absolute z-40 font-mono"
      style={{ left, top, width: panelW }}
    >
      {/* Top notch decoration */}
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
        {/* Title */}
        <div className="text-amber-300 text-[11px] font-bold leading-snug mb-2">
          {paper.title}
        </div>

        {/* Year · citations */}
        <div className="flex gap-4 text-[10px] text-amber-500/60 tracking-wider mb-2">
          {paper.year && <span>◈ {paper.year}</span>}
          {paper.cited_by != null && <span>⬡ {paper.cited_by} citations</span>}
          <span>⇌ {links.length} links</span>
        </div>

        {/* Topics */}
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

        {/* Abstract snippet */}
        {paper.abstract && (
          <div
            className="text-blue-200/50 leading-relaxed border-t border-amber-500/20 pt-2 mt-1"
            style={{ fontSize: 9 }}
          >
            {paper.abstract.slice(0, 220)}…
          </div>
        )}

        {/* Link strength breakdown */}
        {links.length > 0 && (
          <div className="flex gap-3 mt-2 pt-2 border-t border-amber-500/15" style={{ fontSize: 9 }}>
            {strong > 0 && <span style={{ color: "#ffe066" }}>◆ {strong} strong</span>}
            {moderate > 0 && <span style={{ color: "#ff8c00" }}>◆ {moderate} moderate</span>}
            {weak > 0 && <span style={{ color: "#4d7fff" }}>◆ {weak} weak</span>}
          </div>
        )}
      </div>

      {/* Bottom notch decoration */}
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
