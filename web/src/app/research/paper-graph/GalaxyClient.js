"use client";

import { useRef, useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";

// ─── Constants ───────────────────────────────────────────────────────────────
const PARTICLE_COUNT_PER = 40; // particles per community
const STAR_COUNT = 400;
const BRIDGE_OPACITY = 0.12;

// ─── Seeded RNG ──────────────────────────────────────────────────────────────
function makeRng(seed) {
  let s = seed >>> 0;
  return () => {
    s = Math.imul(s, 1664525) + 1013904223;
    return (s >>> 0) / 0xffffffff;
  };
}

// ─── Build stars once ────────────────────────────────────────────────────────
function buildStars(count, w, h) {
  const rng = makeRng(0xdeadbeef);
  return Array.from({ length: count }, () => ({
    x: rng() * w,
    y: rng() * h,
    r: rng() * 1.2 + 0.2,
    brightness: rng() * 0.6 + 0.15,
    twinkleSpeed: rng() * 0.003 + 0.001,
    twinkleOffset: rng() * Math.PI * 2,
  }));
}

// ─── Layout communities in a nice spread ─────────────────────────────────────
function layoutCommunities(communities, w, h) {
  const PAD = 160;
  const minDist = 220;
  const rng = makeRng(0xc0ffee + communities.length);

  const positions = communities.map(() => ({
    x: PAD + rng() * (w - PAD * 2),
    y: PAD + rng() * (h - PAD * 2),
  }));

  // Force relaxation
  for (let pass = 0; pass < 60; pass++) {
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

// ─── Build particles for each community ──────────────────────────────────────
function buildParticles(communities, positions) {
  const allParticles = [];
  communities.forEach((comm, ci) => {
    const cx = positions[ci].x;
    const cy = positions[ci].y;
    const count = Math.min(PARTICLE_COUNT_PER, Math.max(12, comm.paperCount));
    const radius = 30 + Math.sqrt(comm.paperCount) * 6;
    const rng = makeRng(0xbead + comm.id * 17);

    for (let i = 0; i < count; i++) {
      const angle = rng() * Math.PI * 2;
      const dist = rng() * radius;
      const orbitRadius = dist * 0.6 + radius * 0.2;
      const orbitSpeed = (rng() * 0.0004 + 0.0001) * (rng() > 0.5 ? 1 : -1);
      const size = rng() * 2.5 + 0.8;
      allParticles.push({
        communityIdx: ci,
        cx, cy,
        angle,
        orbitRadius,
        orbitSpeed,
        size,
        pulseOffset: rng() * Math.PI * 2,
        pulseSpeed: rng() * 0.002 + 0.001,
      });
    }
  });
  return allParticles;
}

// ─── Build inter-community bridges ───────────────────────────────────────────
function buildBridges(communities, interLinks, positions) {
  return interLinks.map((link) => {
    const si = communities.findIndex((c) => c.id === link.source);
    const ti = communities.findIndex((c) => c.id === link.target);
    if (si < 0 || ti < 0) return null;
    return {
      x1: positions[si].x, y1: positions[si].y,
      x2: positions[ti].x, y2: positions[ti].y,
      strength: Math.min(1, link.count / 20),
    };
  }).filter(Boolean);
}

// ─── Component ───────────────────────────────────────────────────────────────
export default function GalaxyClient({ communities, interLinks, totalPapers }) {
  const canvasRef = useRef(null);
  const animRef = useRef(null);
  const router = useRouter();

  const [hovered, setHovered] = useState(null); // community index
  const [dimensions, setDimensions] = useState({ w: 1200, h: 800 });

  // Refs for animation data (avoid re-creating each frame)
  const dataRef = useRef(null);

  // ── Resize handling ─────────────────────────────────────────────────────
  useEffect(() => {
    const update = () => {
      setDimensions({ w: window.innerWidth, h: window.innerHeight });
    };
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  // ── Build layout data when dimensions or communities change ─────────────
  useEffect(() => {
    const { w, h } = dimensions;
    const positions = layoutCommunities(communities, w, h);
    const particles = buildParticles(communities, positions);
    const bridges = buildBridges(communities, interLinks, positions);
    const stars = buildStars(STAR_COUNT, w, h);
    const radii = communities.map(
      (c) => 30 + Math.sqrt(c.paperCount) * 6
    );

    dataRef.current = { positions, particles, bridges, stars, radii };
  }, [communities, interLinks, dimensions]);

  // ── Hit-test ────────────────────────────────────────────────────────────
  const hitTest = useCallback((mx, my) => {
    if (!dataRef.current) return -1;
    const { positions, radii } = dataRef.current;
    for (let i = 0; i < positions.length; i++) {
      const dx = mx - positions[i].x;
      const dy = my - positions[i].y;
      const hitR = radii[i] + 20; // generous hit area
      if (dx * dx + dy * dy < hitR * hitR) return i;
    }
    return -1;
  }, []);

  // ── Mouse handlers ──────────────────────────────────────────────────────
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
      router.push(`/research/paper-graph/c-${communities[idx].id}`);
    }
  }, [hitTest, communities, router]);

  // ── Animation loop ──────────────────────────────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");

    let running = true;
    const render = (time) => {
      if (!running || !dataRef.current) return;
      const { w, h } = dimensions;
      const { positions, particles, bridges, stars, radii } = dataRef.current;

      canvas.width = w;
      canvas.height = h;

      // Clear
      ctx.fillStyle = "#03070f";
      ctx.fillRect(0, 0, w, h);

      // ── Stars ──────────────────────────────────────────────
      stars.forEach((s) => {
        const twinkle = Math.sin(time * s.twinkleSpeed + s.twinkleOffset) * 0.3 + 0.7;
        ctx.globalAlpha = s.brightness * twinkle;
        ctx.fillStyle = "#ffffff";
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
        ctx.fill();
      });
      ctx.globalAlpha = 1;

      // ── Grid lines ─────────────────────────────────────────
      ctx.strokeStyle = "rgba(80,160,255,0.03)";
      ctx.lineWidth = 0.5;
      for (let x = 0; x < w; x += 200) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, h);
        ctx.stroke();
      }
      for (let y = 0; y < h; y += 200) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(w, y);
        ctx.stroke();
      }

      // ── Inter-community bridges ────────────────────────────
      bridges.forEach((b) => {
        ctx.strokeStyle = `rgba(255,165,0,${BRIDGE_OPACITY * (0.5 + b.strength * 0.5)})`;
        ctx.lineWidth = 0.8 + b.strength * 1.5;
        ctx.setLineDash([6, 8]);
        ctx.beginPath();
        ctx.moveTo(b.x1, b.y1);
        ctx.lineTo(b.x2, b.y2);
        ctx.stroke();
        ctx.setLineDash([]);
      });

      // ── Nebula glows (bottom layer) ────────────────────────
      communities.forEach((comm, ci) => {
        const pos = positions[ci];
        const r = radii[ci];
        const isHov = hovered === ci;
        const pulseR = r + Math.sin(time * 0.001 + ci) * 4;
        const glowR = pulseR * (isHov ? 2.2 : 1.8);

        const grad = ctx.createRadialGradient(pos.x, pos.y, 0, pos.x, pos.y, glowR);
        const color = comm.color;
        grad.addColorStop(0, color + (isHov ? "30" : "18"));
        grad.addColorStop(0.5, color + (isHov ? "15" : "08"));
        grad.addColorStop(1, color + "00");

        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, glowR, 0, Math.PI * 2);
        ctx.fill();
      });

      // ── Particles ──────────────────────────────────────────
      particles.forEach((p) => {
        const isHov = hovered === p.communityIdx;
        p.angle += p.orbitSpeed * (isHov ? 1.8 : 1);
        const pulse = Math.sin(time * p.pulseSpeed + p.pulseOffset) * 0.35 + 0.65;
        const x = p.cx + Math.cos(p.angle) * p.orbitRadius;
        const y = p.cy + Math.sin(p.angle) * p.orbitRadius;
        const color = communities[p.communityIdx].color;

        ctx.globalAlpha = pulse * (isHov ? 1 : 0.7);
        ctx.fillStyle = color;
        ctx.shadowColor = color;
        ctx.shadowBlur = isHov ? 8 : 3;
        ctx.beginPath();
        ctx.arc(x, y, p.size * (isHov ? 1.3 : 1), 0, Math.PI * 2);
        ctx.fill();
      });
      ctx.globalAlpha = 1;
      ctx.shadowBlur = 0;

      // ── Orbit rings ────────────────────────────────────────
      communities.forEach((comm, ci) => {
        const pos = positions[ci];
        const r = radii[ci];
        const isHov = hovered === ci;
        const pulseR = r + Math.sin(time * 0.001 + ci) * 4;

        ctx.strokeStyle = comm.color + (isHov ? "60" : "25");
        ctx.lineWidth = isHov ? 1.5 : 0.8;
        ctx.setLineDash(isHov ? [] : [4, 6]);
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, pulseR + 10, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);
      });

      // ── Labels ─────────────────────────────────────────────
      communities.forEach((comm, ci) => {
        const pos = positions[ci];
        const isHov = hovered === ci;

        ctx.textAlign = "center";
        ctx.textBaseline = "middle";

        // Community name
        ctx.font = `${isHov ? "bold " : ""}11px monospace`;
        ctx.fillStyle = comm.color + (isHov ? "ee" : "aa");
        const label = comm.label.length > 32 ? comm.label.slice(0, 32) + "…" : comm.label;
        ctx.fillText(label, pos.x, pos.y - 4);

        // Paper count
        ctx.font = "9px monospace";
        ctx.fillStyle = comm.color + "60";
        ctx.fillText(`${comm.paperCount} papers`, pos.x, pos.y + 10);

        // Hover extras
        if (isHov && comm.topTopics?.length > 0) {
          ctx.font = "8px monospace";
          ctx.fillStyle = comm.color + "80";
          const topicLine = comm.topTopics.slice(0, 3).join(" · ");
          ctx.fillText(topicLine, pos.x, pos.y + 22);
        }
      });

      animRef.current = requestAnimationFrame(render);
    };

    animRef.current = requestAnimationFrame(render);
    return () => {
      running = false;
      if (animRef.current) cancelAnimationFrame(animRef.current);
    };
  }, [dimensions, communities, hovered]);

  return (
    <div
      className="relative w-full h-screen overflow-hidden"
      style={{ background: "#03070f" }}
    >
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
        <div key={cls} aria-hidden className={`pointer-events-none absolute ${cls} border-amber-500/30 w-8 h-8 z-20`} />
      ))}

      {/* Top-left HUD */}
      <div className="pointer-events-none absolute top-5 left-6 z-20 font-mono">
        <div className="text-amber-400 text-xs tracking-[0.25em] font-bold">
          ◈ GALACTIC RESEARCH INTELLIGENCE DIVISION
        </div>
        <div className="text-amber-500/40 text-[10px] tracking-widest mt-0.5">
          SECTOR MAP &nbsp;·&nbsp; {communities.length} CLUSTERS &nbsp;·&nbsp; {totalPapers} PAPERS
        </div>
      </div>

      {/* Top-right HUD */}
      <div className="pointer-events-none absolute top-5 right-6 z-20 font-mono text-right">
        <div className="text-amber-400/50 text-[10px] tracking-widest">AI RESEARCH INSTITUTE</div>
        <div className="text-amber-500/25 text-[9px] tracking-widest mt-0.5">DEMOCRACY SCIENCE DIVISION</div>
      </div>

      {/* Bottom-right hint */}
      <div className="pointer-events-none absolute bottom-6 right-5 z-20 font-mono text-[9px] text-amber-500/30 text-right tracking-widest">
        <div>CLICK CLUSTER TO EXPLORE</div>
        <div>HOVER FOR DETAILS</div>
      </div>

      {/* Bottom-left legend */}
      <div className="pointer-events-none absolute bottom-6 left-5 z-20 font-mono text-[10px]">
        <div className="text-amber-500/50 tracking-widest mb-2">CLUSTERS</div>
        {communities.slice(0, 8).map((comm, i) => (
          <div key={comm.id} className="flex items-center gap-2 mb-1">
            <div className="w-2 h-2 rounded-full" style={{ background: comm.color }} />
            <span style={{ color: comm.color + "aa" }}>
              {comm.label.length > 24 ? comm.label.slice(0, 24) + "…" : comm.label}
            </span>
          </div>
        ))}
        {communities.length > 8 && (
          <div className="text-amber-500/30 mt-1">+{communities.length - 8} more</div>
        )}
      </div>
    </div>
  );
}
