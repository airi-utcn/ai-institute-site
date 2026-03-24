"use client";

import { useRef, useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";

// ─── Seeded RNG ──────────────────────────────────────────────────────────────
function makeRng(seed) {
  let s = seed >>> 0;
  return () => {
    s = Math.imul(s, 1664525) + 1013904223;
    return (s >>> 0) / 0xffffffff;
  };
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

// ─── Build constellation lines between nearby topics ─────────────────────────
function buildConstellationLines(positions, maxDist = 300) {
  const lines = [];
  for (let i = 0; i < positions.length; i++) {
    for (let j = i + 1; j < positions.length; j++) {
      const dx = positions[j].x - positions[i].x;
      const dy = positions[j].y - positions[i].y;
      const d = Math.sqrt(dx * dx + dy * dy);
      if (d < maxDist) {
        lines.push({ i, j, dist: d });
      }
    }
  }
  return lines;
}

export default function ConstellationClient({
  topics,
  communityLabel,
  communitySlug,
  color,
  totalPapers,
}) {
  const canvasRef = useRef(null);
  const animRef = useRef(null);
  const router = useRouter();

  const [hovered, setHovered] = useState(null);
  const [dimensions, setDimensions] = useState({ w: 1200, h: 800 });
  const dataRef = useRef(null);

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
    const constellationLines = buildConstellationLines(positions, Math.min(400, w * 0.3));
    const stars = buildStars(STAR_COUNT, w, h);
    const radii = topics.map((t) => 12 + Math.sqrt(t.paperCount) * 5);

    dataRef.current = { positions, constellationLines, stars, radii };
  }, [topics, dimensions]);

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

  const onMouseMove = useCallback((e) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const idx = hitTest(e.clientX - rect.left, e.clientY - rect.top);
    setHovered(idx >= 0 ? idx : null);
  }, [hitTest]);

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

    let running = true;
    const render = (time) => {
      if (!running || !dataRef.current) return;
      const { w, h } = dimensions;
      const { positions, constellationLines, stars, radii } = dataRef.current;

      canvas.width = w;
      canvas.height = h;

      ctx.fillStyle = "#03070f";
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
      ctx.strokeStyle = `${color}06`;
      ctx.lineWidth = 0.5;
      for (let x = 0; x < w; x += 180) {
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke();
      }
      for (let y = 0; y < h; y += 180) {
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
      }

      // Constellation lines
      const linePhase = time * 0.0005;
      constellationLines.forEach((line) => {
        const p1 = positions[line.i];
        const p2 = positions[line.j];
        const isH = hovered === line.i || hovered === line.j;
        const dashOffset = (time * 0.02) % 30;

        ctx.strokeStyle = color + (isH ? "50" : "18");
        ctx.lineWidth = isH ? 1.5 : 0.6;
        ctx.setLineDash(isH ? [8, 4] : [3, 8]);
        ctx.lineDashOffset = -dashOffset;
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
        const isH = hovered === i;
        const pulse = r + Math.sin(time * 0.0015 + i * 0.7) * 2;
        const glowR = pulse * (isH ? 3 : 2);

        const grad = ctx.createRadialGradient(pos.x, pos.y, 0, pos.x, pos.y, glowR);
        grad.addColorStop(0, color + (isH ? "30" : "12"));
        grad.addColorStop(0.6, color + (isH ? "0c" : "04"));
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
        const isH = hovered === i;
        const pulse = r + Math.sin(time * 0.0015 + i * 0.7) * 2;

        // Core
        ctx.fillStyle = color + (isH ? "cc" : "60");
        ctx.shadowColor = color;
        ctx.shadowBlur = isH ? 16 : 6;
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, pulse * (isH ? 0.7 : 0.5), 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;

        // Orbit ring
        ctx.strokeStyle = color + (isH ? "50" : "20");
        ctx.lineWidth = isH ? 1.2 : 0.6;
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, pulse + 6, 0, Math.PI * 2);
        ctx.stroke();
      });

      // Labels
      topics.forEach((topic, i) => {
        const pos = positions[i];
        const isH = hovered === i;
        const r = radii[i];

        ctx.textAlign = "center";
        ctx.textBaseline = "middle";

        ctx.font = `${isH ? "bold 11px" : "10px"} monospace`;
        ctx.fillStyle = color + (isH ? "ee" : "90");
        const label = topic.label.length > 30 ? topic.label.slice(0, 30) + "…" : topic.label;
        ctx.fillText(label, pos.x, pos.y - r - 10);

        ctx.font = "8px monospace";
        ctx.fillStyle = color + "50";
        ctx.fillText(`${topic.paperCount} papers`, pos.x, pos.y + r + 12);

        if (isH && topic.yearRange) {
          ctx.font = "8px monospace";
          ctx.fillStyle = color + "70";
          ctx.fillText(topic.yearRange, pos.x, pos.y + r + 24);
        }
      });

      animRef.current = requestAnimationFrame(render);
    };

    animRef.current = requestAnimationFrame(render);
    return () => {
      running = false;
      if (animRef.current) cancelAnimationFrame(animRef.current);
    };
  }, [dimensions, topics, color, hovered]);

  return (
    <div className="relative w-full h-screen overflow-hidden" style={{ background: "#03070f" }}>
      <canvas
        ref={canvasRef}
        className="absolute inset-0"
        style={{ cursor: hovered != null ? "pointer" : "default" }}
        onMouseMove={onMouseMove}
        onClick={onClick}
        onMouseLeave={() => setHovered(null)}
      />

      {/* CRT scanlines */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 z-10"
        style={{
          backgroundImage:
            "repeating-linear-gradient(0deg,transparent,transparent 2px,rgba(0,0,0,0.1) 2px,rgba(0,0,0,0.1) 4px)",
          mixBlendMode: "multiply",
        }}
      />

      {/* Corner brackets */}
      {[
        "top-3 left-3 border-t-2 border-l-2",
        "top-3 right-3 border-t-2 border-r-2",
        "bottom-3 left-3 border-b-2 border-l-2",
        "bottom-3 right-3 border-b-2 border-r-2",
      ].map((cls) => (
        <div key={cls} aria-hidden className={`pointer-events-none absolute ${cls} w-8 h-8 z-20`} style={{ borderColor: color + "40" }} />
      ))}

      {/* Top-left HUD */}
      <div className="pointer-events-none absolute top-5 left-6 z-20 font-mono">
        <a
          href="/research/paper-graph"
          className="pointer-events-auto text-[10px] tracking-widest mb-2 inline-block transition-opacity opacity-50 hover:opacity-100"
          style={{ color }}
        >
          ◂ ALL CLUSTERS
        </a>
        <div className="text-xs tracking-[0.25em] font-bold" style={{ color }}>
          ◈ {communityLabel.toUpperCase()}
        </div>
        <div className="text-[10px] tracking-widest mt-0.5" style={{ color: color + "50" }}>
          CONSTELLATION &nbsp;·&nbsp; {topics.length} TOPICS &nbsp;·&nbsp; {totalPapers} PAPERS
        </div>
      </div>

      {/* Bottom-right hint */}
      <div className="pointer-events-none absolute bottom-6 right-5 z-20 font-mono text-[9px] text-right tracking-widest" style={{ color: color + "35" }}>
        <div>CLICK NODE TO VIEW GRAPH</div>
        <div>HOVER FOR DETAILS</div>
      </div>
    </div>
  );
}
