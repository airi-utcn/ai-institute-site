"use client";

import { useRef, useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { GlobalGraphSearch } from "./globalSearch";

// ─── Seeded RNG ──────────────────────────────────────────────────────────────
function makeRng(seed) {
  let s = seed >>> 0;
  return () => {
    s = Math.imul(s, 1664525) + 1013904223;
    return (s >>> 0) / 0xffffffff;
  };
}

function hexToRgba(hex, alpha) {
  const raw = hex.replace("#", "").trim();
  if (raw.length !== 3 && raw.length !== 6) return `rgba(255,255,255,${alpha})`;
  const value = raw.length === 3
    ? raw.split("").map((c) => c + c).join("")
    : raw;
  const intVal = parseInt(value, 16);
  const r = (intVal >> 16) & 255;
  const g = (intVal >> 8) & 255;
  const b = intVal & 255;
  return `rgba(${r},${g},${b},${alpha})`;
}

const STAR_COUNT = 300;

function buildStars(count, w, h) {
  const rng = makeRng(0xfadedab);
  return Array.from({ length: count }, () => ({
    x: rng() * w,
    y: rng() * h,
    r: rng() * 1.0 + 0.2,
    brightness: rng() * 0.5 + 0.1,
    twinkleSpeed: rng() * 0.003 + 0.001,
    twinkleOffset: rng() * Math.PI * 2,
  }));
}

// ─── Layout topics as constellation nodes ────────────────────────────────────
function layoutTopics(topics, w, h) {
  const PAD = 140;
  const minDist = 160;
  const rng = makeRng(0xcafe + topics.length * 7);

  const positions = topics.map(() => ({
    x: PAD + rng() * (w - PAD * 2),
    y: PAD + rng() * (h - PAD * 2),
  }));

  for (let pass = 0; pass < 50; pass++) {
    for (let i = 0; i < positions.length; i++) {
      for (let j = i + 1; j < positions.length; j++) {
        const dx = positions[j].x - positions[i].x;
        const dy = positions[j].y - positions[i].y;
        const d = Math.sqrt(dx * dx + dy * dy) || 0.001;
        if (d < minDist) {
          const f = ((minDist - d) / d) * 0.5;
          positions[i].x -= dx * f;
          positions[i].y -= dy * f;
          positions[j].x += dx * f;
          positions[j].y += dy * f;
        }
      }
      positions[i].x = Math.max(PAD, Math.min(w - PAD, positions[i].x));
      positions[i].y = Math.max(PAD, Math.min(h - PAD, positions[i].y));
    }
  }

  return positions;
}

function drawTextWithHalo(ctx, text, x, y, font, fill, stroke = "rgba(3,7,15,0.95)", lineWidth = 4) {
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = font;
  ctx.lineWidth = lineWidth;
  ctx.lineJoin = "round";
  ctx.strokeStyle = stroke;
  ctx.strokeText(text, x, y);
  ctx.fillStyle = fill;
  ctx.fillText(text, x, y);
}

export default function ConstellationClient({
  topics,
  mesoLinks = [],
  communityLabel,
  communitySlug,
  color,
  totalPapers,
}) {
  const canvasRef = useRef(null);
  const animRef = useRef(null);
  const router = useRouter();

  const [hovered, setHovered] = useState(null);
  const [hoveredLink, setHoveredLink] = useState(null);
  const [dimensions, setDimensions] = useState({ w: 1200, h: 800 });
  const dataRef = useRef(null);
  const hoveredRef = useRef(null);
  const hoveredLinkRef = useRef(null);

  useEffect(() => {
    const update = () => {
      setDimensions({ w: window.innerWidth, h: window.innerHeight });
    };
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  useEffect(() => {
    const { w, h } = dimensions;
    const positions = layoutTopics(topics, w, h);
    const stars = buildStars(STAR_COUNT, w, h);
    const radii = topics.map((t) => 12 + Math.sqrt(t.paperCount) * 5);

    const topicIndex = {};
    topics.forEach((topic, idx) => {
      if (topic.key) topicIndex[topic.key] = idx;
    });

    const links = (mesoLinks || [])
      .map((link) => {
        const i = topicIndex[link.sourceKey];
        const j = topicIndex[link.targetKey];
        if (i == null || j == null) return null;
        return {
          i,
          j,
          count: link.count || 0,
          strength: typeof link.strength === "number" ? link.strength : 0,
        };
      })
      .filter(Boolean);

    const linkIndex = {};
    links.forEach((link, idx) => {
      (linkIndex[link.i] ??= []).push(idx);
      (linkIndex[link.j] ??= []).push(idx);
    });

    dataRef.current = { positions, links, linkIndex, stars, radii };
  }, [topics, mesoLinks, dimensions]);

  const hitTest = useCallback((mx, my) => {
    if (!dataRef.current) return -1;
    const { positions, radii } = dataRef.current;
    for (let i = 0; i < positions.length; i++) {
      const dx = mx - positions[i].x;
      const dy = my - positions[i].y;
      const hitR = radii[i] + 18;
      if (dx * dx + dy * dy < hitR * hitR) return i;
    }
    return -1;
  }, []);

  const hitTestLink = useCallback((mx, my) => {
    if (!dataRef.current) return null;
    const { links, positions } = dataRef.current;
    if (!links || links.length === 0) return null;

    const threshold = 12;
    let closest = null;
    let minDist = Number.POSITIVE_INFINITY;

    links.forEach((link, idx) => {
      const p1 = positions[link.i];
      const p2 = positions[link.j];
      if (!p1 || !p2) return;

      const dx = p2.x - p1.x;
      const dy = p2.y - p1.y;
      const len2 = dx * dx + dy * dy;
      if (len2 === 0) return;

      const t = Math.max(0, Math.min(1, ((mx - p1.x) * dx + (my - p1.y) * dy) / len2));
      const projX = p1.x + t * dx;
      const projY = p1.y + t * dy;
      const dist = Math.hypot(mx - projX, my - projY);

      if (dist < threshold && dist < minDist) {
        minDist = dist;
        closest = idx;
      }
    });

    return closest;
  }, []);

  const onMouseMove = useCallback((e) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    const idx = hitTest(mx, my);
    const nextHovered = idx >= 0 ? idx : null;
    if (hoveredRef.current !== nextHovered) {
      hoveredRef.current = nextHovered;
      setHovered(nextHovered);
    }
    if (nextHovered == null) {
      const nextLink = hitTestLink(mx, my);
      if (hoveredLinkRef.current !== nextLink) {
        hoveredLinkRef.current = nextLink;
        setHoveredLink(nextLink);
      }
    } else if (hoveredLinkRef.current !== null) {
      hoveredLinkRef.current = null;
      setHoveredLink(null);
    }
  }, [hitTest, hitTestLink]);

  const onClick = useCallback((e) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const idx = hitTest(e.clientX - rect.left, e.clientY - rect.top);
    if (idx >= 0) {
      router.push(`/research/paper-graph/${communitySlug}/${topics[idx].slug}`);
    }
  }, [hitTest, topics, communitySlug, router]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");

    canvas.width = dimensions.w;
    canvas.height = dimensions.h;

    let running = true;
    const render = (time) => {
      if (!running || !dataRef.current) return;
      const { w, h } = dimensions;
      const { positions, links, linkIndex, stars, radii } = dataRef.current;
      const hoveredIdx = hoveredRef.current;
      const hoveredLinkIdx = hoveredLinkRef.current;

      const highlightLinks = new Set();
      if (hoveredIdx != null && linkIndex[hoveredIdx]) {
        linkIndex[hoveredIdx].forEach((idx) => highlightLinks.add(idx));
      }
      if (hoveredLinkIdx != null) {
        highlightLinks.add(hoveredLinkIdx);
      }

      const highlightNodes = new Set();
      if (hoveredIdx != null) highlightNodes.add(hoveredIdx);
      highlightLinks.forEach((idx) => {
        const link = links[idx];
        if (!link) return;
        highlightNodes.add(link.i);
        highlightNodes.add(link.j);
      });
      const hasHighlight = highlightLinks.size > 0 || highlightNodes.size > 0;

      const bg = ctx.createLinearGradient(0, 0, 0, h);
      bg.addColorStop(0, "#050915");
      bg.addColorStop(0.52, "#03070f");
      bg.addColorStop(1, "#02050b");
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, w, h);

      // Stars
      stars.forEach((s) => {
        const twinkle = Math.sin(time * s.twinkleSpeed + s.twinkleOffset) * 0.3 + 0.7;
        ctx.globalAlpha = s.brightness * twinkle;
        ctx.fillStyle = "#fff";
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
        ctx.fill();
      });
      ctx.globalAlpha = 1;

      // Grid
      ctx.strokeStyle = `${color}0a`;
      ctx.lineWidth = 0.5;
      for (let x = 0; x < w; x += 180) {
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke();
      }
      for (let y = 0; y < h; y += 180) {
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
      }

      // Meso links
      links.forEach((link, idx) => {
        const p1 = positions[link.i];
        const p2 = positions[link.j];
        const isActive = highlightLinks.has(idx);
        const dimmed = hasHighlight && !isActive;
        const strength = Math.max(0, Math.min(1, link.strength || 0));
        const baseOpacity = 0.08 + strength * 0.35;
        const opacity = dimmed ? baseOpacity * 0.4 : (isActive ? 0.85 : baseOpacity);
        const width = (dimmed ? 0.4 : 0.6) + strength * (isActive ? 2.8 : 1.6);

        if (isActive) {
          ctx.strokeStyle = hexToRgba(color, 0.25);
          ctx.lineWidth = width + 3.5;
          ctx.setLineDash([]);
          ctx.beginPath();
          ctx.moveTo(p1.x, p1.y);
          ctx.lineTo(p2.x, p2.y);
          ctx.stroke();
        }

        ctx.strokeStyle = hexToRgba(color, opacity);
        ctx.lineWidth = width;
        ctx.setLineDash(isActive ? [6, 4] : [3, 10]);
        ctx.beginPath();
        ctx.moveTo(p1.x, p1.y);
        ctx.lineTo(p2.x, p2.y);
        ctx.stroke();
      });
      ctx.setLineDash([]);
      ctx.lineDashOffset = 0;

      // Node glows
      topics.forEach((topic, i) => {
        const pos = positions[i];
        const r = radii[i];
        const isH = hoveredIdx === i;
        const isLinked = highlightNodes.has(i);
        const dimmed = hasHighlight && !isLinked;
        const pulse = r + Math.sin(time * 0.0015 + i * 0.7) * 2;
        const glowR = pulse * (isH ? 3 : isLinked ? 2.4 : 2);

        const grad = ctx.createRadialGradient(pos.x, pos.y, 0, pos.x, pos.y, glowR);
        const glowAlpha = dimmed ? "06" : isH ? "30" : isLinked ? "18" : "10";
        const midAlpha = dimmed ? "03" : isH ? "0c" : isLinked ? "08" : "04";
        grad.addColorStop(0, color + glowAlpha);
        grad.addColorStop(0.6, color + midAlpha);
        grad.addColorStop(1, color + "00");
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, glowR, 0, Math.PI * 2);
        ctx.fill();
      });

      // Nodes (solid circles)
      topics.forEach((topic, i) => {
        const pos = positions[i];
        const r = radii[i];
        const isH = hoveredIdx === i;
        const isLinked = highlightNodes.has(i);
        const dimmed = hasHighlight && !isLinked;
        const pulse = r + Math.sin(time * 0.0015 + i * 0.7) * 2;

        // Core
        ctx.fillStyle = color + (dimmed ? "30" : isH ? "cc" : isLinked ? "88" : "60");
        ctx.shadowColor = color;
        ctx.shadowBlur = isH ? 16 : isLinked ? 10 : 6;
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, pulse * (isH ? 0.7 : 0.5), 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;

        // Orbit ring
        ctx.strokeStyle = color + (dimmed ? "12" : isH ? "50" : isLinked ? "32" : "20");
        ctx.lineWidth = isH ? 1.2 : isLinked ? 0.9 : 0.6;
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, pulse + 6, 0, Math.PI * 2);
        ctx.stroke();
      });

      // Labels
      topics.forEach((topic, i) => {
        const pos = positions[i];
        const isH = hoveredIdx === i;
        const isLinked = highlightNodes.has(i);
        const dimmed = hasHighlight && !isLinked;
        const r = radii[i];

        ctx.textAlign = "center";
        ctx.textBaseline = "middle";

        const label = topic.label.length > 30 ? topic.label.slice(0, 30) + "…" : topic.label;
        drawTextWithHalo(
          ctx,
          label,
          pos.x,
          pos.y - r - 10,
          `${isH ? "bold 11px" : "10px"} monospace`,
          color + (dimmed ? "70" : isH ? "ff" : isLinked ? "d8" : "b0"),
          "rgba(3,7,15,0.96)",
          isH ? 4 : 3
        );

        drawTextWithHalo(
          ctx,
          `${topic.paperCount} papers`,
          pos.x,
          pos.y + r + 12,
          "8px monospace",
          color + (dimmed ? "55" : "88"),
          "rgba(3,7,15,0.96)",
          2.2
        );

        if (isH && topic.yearRange) {
          drawTextWithHalo(ctx, topic.yearRange, pos.x, pos.y + r + 24, "8px monospace", color + "aa", "rgba(3,7,15,0.96)", 2);
        }
      });

      animRef.current = requestAnimationFrame(render);
    };

    animRef.current = requestAnimationFrame(render);
    return () => {
      running = false;
      if (animRef.current) cancelAnimationFrame(animRef.current);
    };
  }, [dimensions, topics, color, mesoLinks]);

  return (
    <div className="relative w-full h-screen overflow-hidden" style={{ background: "#03070f" }}>
      <canvas
        ref={canvasRef}
        className="absolute inset-0"
        style={{ cursor: hovered != null || hoveredLink != null ? "pointer" : "default" }}
        onMouseMove={onMouseMove}
        onClick={onClick}
        onMouseLeave={() => {
          hoveredRef.current = null;
          hoveredLinkRef.current = null;
          setHovered(null);
          setHoveredLink(null);
        }}
      />

      {/* CRT scanlines */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 z-10"
        style={{
          backgroundImage:
            "repeating-linear-gradient(0deg,transparent,transparent 3px,rgba(0,0,0,0.06) 3px,rgba(0,0,0,0.06) 6px)",
          mixBlendMode: "soft-light",
        }}
      />

      {/* Corner brackets */}
      {[
        "top-3 left-3 border-t-2 border-l-2",
        "top-3 right-3 border-t-2 border-r-2",
        "bottom-3 left-3 border-b-2 border-l-2",
        "bottom-3 right-3 border-b-2 border-r-2",
      ].map((cls) => (
        <div key={cls} aria-hidden className={`pointer-events-none absolute ${cls} w-8 h-8 z-20`} style={{ borderColor: color + "55" }} />
      ))}

      <GlobalGraphSearch fabClassName="bottom-24 right-5" />

      {/* Top-left HUD */}
      <div className="pointer-events-none absolute top-5 left-6 z-20 rounded-2xl border px-3 py-2 font-mono" style={{ background: "rgba(4,10,20,0.5)", borderColor: `${color}22`, backdropFilter: "blur(8px)" }}>
        <a
          href="/research/paper-graph"
          className="pointer-events-auto text-[10px] tracking-widest mb-2 inline-block transition-opacity opacity-75 hover:opacity-100"
          style={{ color, textShadow: "0 0 10px rgba(0,0,0,0.9)" }}
        >
          ◂ ALL MACROS
        </a>
        <div className="text-xs tracking-[0.25em] font-bold" style={{ color, textShadow: "0 0 10px rgba(0,0,0,0.9)" }}>
          ◈ {communityLabel.toUpperCase()}
        </div>
        <div className="text-[10px] tracking-widest mt-0.5" style={{ color: color + "85", textShadow: "0 0 10px rgba(0,0,0,0.85)" }}>
          CONSTELLATION &nbsp;·&nbsp; {topics.length} TOPICS &nbsp;·&nbsp; {totalPapers} PAPERS
        </div>
      </div>

      {/* Bottom-right hint */}
      <div className="pointer-events-none absolute bottom-6 right-5 z-20 rounded-2xl border px-3 py-2 font-mono text-[9px] text-right tracking-widest" style={{ color: color + "90", background: "rgba(4,10,20,0.4)", borderColor: `${color}1f`, backdropFilter: "blur(8px)" }}>
        <div>CLICK NODE TO VIEW GRAPH</div>
        <div>HOVER FOR DETAILS</div>
      </div>
    </div>
  );
}
