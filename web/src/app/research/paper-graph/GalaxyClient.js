"use client";

import { useRef, useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { GlobalGraphSearch } from "./globalSearch";

// ─── Constants ───────────────────────────────────────────────────────────────
const PARTICLE_COUNT_PER = 40; // particles per macro
const STAR_COUNT = 400;
const BRIDGE_OPACITY = 0.35; // Increased for better visibility on dark background

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

const seedFromId = (value) => {
  const text = String(value ?? "");
  let hash = 2166136261;
  for (let i = 0; i < text.length; i++) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
};

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

// ─── Layout macros in a nice spread ─────────────────────────────────────
function layoutMacros(macros, w, h) {
  const PAD = 160;
  const minDist = 220;
  const rng = makeRng(0xc0ffee + macros.length);

  const positions = macros.map(() => ({
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

// ─── Build particles for each macro ─────────────────────────────────────
function buildParticles(macros, positions) {
  const allParticles = [];
  macros.forEach((macro, mi) => {
    const cx = positions[mi].x;
    const cy = positions[mi].y;
    const count = Math.min(PARTICLE_COUNT_PER, Math.max(12, macro.paperCount));
    const radius = 30 + Math.sqrt(macro.paperCount) * 6;
    const rng = makeRng(0xbead + seedFromId(macro.id) * 17);

    for (let i = 0; i < count; i++) {
      const angle = rng() * Math.PI * 2;
      const dist = rng() * radius;
      const orbitRadius = dist * 0.6 + radius * 0.2;
      const orbitSpeed = (rng() * 0.0004 + 0.0001) * (rng() > 0.5 ? 1 : -1);
      const size = rng() * 2.5 + 0.8;
      allParticles.push({
        macroIdx: mi,
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

// ─── Build inter-macro bridges ───────────────────────────────────────────
function buildBridges(macros, interLinks, positions) {
  return interLinks.map((link) => {
    const si = macros.findIndex((c) => c.id === link.source);
    const ti = macros.findIndex((c) => c.id === link.target);
    if (si < 0 || ti < 0) return null;
    return {
      x1: positions[si].x, y1: positions[si].y,
      x2: positions[ti].x, y2: positions[ti].y,
      strength: Math.min(1, link.count / 20),
      sourceId: link.source,
      targetId: link.target,
      count: link.count,
    };
  }).filter(Boolean);
}

// ─── Component ───────────────────────────────────────────────────────────────
export default function GalaxyClient({ macros, interLinks, crossClusterLinks = [], totalPapers }) {
  const canvasRef = useRef(null);
  const animRef = useRef(null);
  const router = useRouter();

  const [hovered, setHovered] = useState(null); // macro index
  const [hoveredBridge, setHoveredBridge] = useState(null); // bridge info for tooltip
  const [dimensions, setDimensions] = useState({ w: 1200, h: 800 });

  // Refs for animation data (avoid re-creating each frame)
  const dataRef = useRef(null);
  const hoveredRef = useRef(null);
  const hoveredBridgeRef = useRef(null);

  // ── Resize handling ─────────────────────────────────────────────────────
  useEffect(() => {
    const update = () => {
      setDimensions({ w: window.innerWidth, h: window.innerHeight });
    };
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  // ── Build layout data when dimensions or macros change ─────────────
  useEffect(() => {
    const { w, h } = dimensions;
    const positions = layoutMacros(macros, w, h);
    const particles = buildParticles(macros, positions);
    const bridges = buildBridges(macros, interLinks, positions);
    const stars = buildStars(STAR_COUNT, w, h);
    const radii = macros.map(
      (c) => 30 + Math.sqrt(c.paperCount) * 6
    );

    // Map macro IDs to positions for cross-macro link rendering
    const clusterIdToIdx = {};
    macros.forEach((c, i) => { clusterIdToIdx[c.id] = i; });

    dataRef.current = { positions, particles, bridges, stars, radii, clusterIdToIdx };
  }, [macros, interLinks, dimensions]);

  // ── Hit-test for clusters ───────────────────────────────────────────────
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

  // ── Hit-test for bridges (line proximity) ───────────────────────────────
  const hitTestBridge = useCallback((mx, my) => {
    if (!dataRef.current) return null;
    const { bridges } = dataRef.current;
    const threshold = 12; // pixels from line
    
    for (const bridge of bridges) {
      // Point-to-line-segment distance
      const dx = bridge.x2 - bridge.x1;
      const dy = bridge.y2 - bridge.y1;
      const len2 = dx * dx + dy * dy;
      if (len2 === 0) continue;
      
      const t = Math.max(0, Math.min(1, ((mx - bridge.x1) * dx + (my - bridge.y1) * dy) / len2));
      const projX = bridge.x1 + t * dx;
      const projY = bridge.y1 + t * dy;
      const dist = Math.sqrt((mx - projX) ** 2 + (my - projY) ** 2);
      
      if (dist < threshold) {
        // Find cross-cluster links for this bridge
        const linksForBridge = crossClusterLinks.filter(
          (l) => (l.sourceCluster === bridge.sourceId && l.targetCluster === bridge.targetId) ||
                 (l.sourceCluster === bridge.targetId && l.targetCluster === bridge.sourceId)
        ).slice(0, 5); // Top 5 links
        
        return {
          x: mx,
          y: my,
          source: bridge.sourceId,
          target: bridge.targetId,
          count: bridge.count,
          links: linksForBridge,
        };
      }
    }
    return null;
  }, [crossClusterLinks]);

  // ── Mouse handlers ──────────────────────────────────────────────────────
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
    
    // Only check bridges if not hovering a cluster
    if (idx < 0) {
      const bridgeInfo = hitTestBridge(mx, my);
      const currentBridge = hoveredBridgeRef.current;
      const sameBridge =
        currentBridge &&
        bridgeInfo &&
        currentBridge.source === bridgeInfo.source &&
        currentBridge.target === bridgeInfo.target;

      if (!sameBridge) {
        hoveredBridgeRef.current = bridgeInfo;
        setHoveredBridge(bridgeInfo);
      } else if (bridgeInfo) {
        // Keep tooltip cursor tracking without forcing animation effect restart.
        hoveredBridgeRef.current = {
          ...bridgeInfo,
          source: currentBridge.source,
          target: currentBridge.target,
        };
        setHoveredBridge(hoveredBridgeRef.current);
      }
    } else {
      if (hoveredBridgeRef.current !== null) {
        hoveredBridgeRef.current = null;
        setHoveredBridge(null);
      }
    }
  }, [hitTest, hitTestBridge]);

  const onClick = useCallback((e) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    
    // First check macro hit
    const idx = hitTest(mx, my);
    if (idx >= 0) {
      const macroSlug = macros[idx]?.slug || macros[idx]?.id;
      if (macroSlug) {
        router.push(`/research/paper-graph/${macroSlug}`);
      }
      return;
    }
    
    // Then check bridge hit
    const bridgeInfo = hitTestBridge(mx, my);
    if (bridgeInfo && bridgeInfo.links.length > 0) {
      // Navigate to the macro intersection view
      router.push(`/research/paper-graph/${bridgeInfo.source}/x/${bridgeInfo.target}`);
    }
  }, [hitTest, hitTestBridge, macros, router]);

  // ── Animation loop ──────────────────────────────────────────────────────
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
      const { positions, particles, bridges, stars, radii } = dataRef.current;
      const hoveredIdx = hoveredRef.current;
      const activeBridge = hoveredBridgeRef.current;

      

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
        const isHoveredBridge =
          activeBridge &&
          ((activeBridge.source === b.sourceId && activeBridge.target === b.targetId) ||
            (activeBridge.source === b.targetId && activeBridge.target === b.sourceId));
        
        if (isHoveredBridge) {
          // Draw glow effect for hovered bridge
          ctx.strokeStyle = `rgba(255,200,100,0.5)`;
          ctx.lineWidth = 8 + b.strength * 4;
          ctx.setLineDash([]);
          ctx.beginPath();
          ctx.moveTo(b.x1, b.y1);
          ctx.lineTo(b.x2, b.y2);
          ctx.stroke();
        }
        
        // Use a brighter, more visible orange/gold for base lines
        const baseOpacity = BRIDGE_OPACITY * (0.6 + b.strength * 0.4);
        ctx.strokeStyle = isHoveredBridge 
          ? `rgba(255,210,120,0.85)` 
          : `rgba(255,180,60,${baseOpacity})`;
        ctx.lineWidth = isHoveredBridge ? (2.5 + b.strength * 2) : (1.2 + b.strength * 1.8);
        ctx.setLineDash(isHoveredBridge ? [4, 4] : [8, 6]);
        ctx.beginPath();
        ctx.moveTo(b.x1, b.y1);
        ctx.lineTo(b.x2, b.y2);
        ctx.stroke();
        ctx.setLineDash([]);
      });

      // ── Nebula glows (bottom layer) ────────────────────────
      macros.forEach((macro, mi) => {
        const pos = positions[mi];
        const r = radii[mi];
        const isHov = hoveredIdx === mi;
        const pulseR = r + Math.sin(time * 0.001 + mi) * 4;
        const glowR = pulseR * (isHov ? 2.2 : 1.8);

        const grad = ctx.createRadialGradient(pos.x, pos.y, 0, pos.x, pos.y, glowR);
        const color = macro.color;
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
        const isHov = hoveredIdx === p.macroIdx;
        p.angle += p.orbitSpeed * (isHov ? 1.8 : 1);
        const pulse = Math.sin(time * p.pulseSpeed + p.pulseOffset) * 0.35 + 0.65;
        const x = p.cx + Math.cos(p.angle) * p.orbitRadius;
        const y = p.cy + Math.sin(p.angle) * p.orbitRadius;
        const color = macros[p.macroIdx].color;

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
      macros.forEach((macro, mi) => {
        const pos = positions[mi];
        const r = radii[mi];
        const isHov = hoveredIdx === mi;
        const pulseR = r + Math.sin(time * 0.001 + mi) * 4;

        ctx.strokeStyle = macro.color + (isHov ? "60" : "25");
        ctx.lineWidth = isHov ? 1.5 : 0.8;
        ctx.setLineDash(isHov ? [] : [4, 6]);
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, pulseR + 10, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);
      });

      // ── Labels ─────────────────────────────────────────────
      macros.forEach((macro, mi) => {
        const pos = positions[mi];
        const isHov = hoveredIdx === mi;

        // Community name
        const label = macro.label.length > 32 ? macro.label.slice(0, 32) + "…" : macro.label;
        drawTextWithHalo(
          ctx,
          label,
          pos.x,
          pos.y - 4,
          `${isHov ? "bold " : ""}11px monospace`,
          macro.color + (isHov ? "ff" : "cf"),
          "rgba(3,7,15,0.96)",
          isHov ? 4 : 3
        );

        // Paper count
        drawTextWithHalo(
          ctx,
          `${macro.paperCount} papers`,
          pos.x,
          pos.y + 10,
          "9px monospace",
          macro.color + "96",
          "rgba(3,7,15,0.96)",
          2.5
        );

        // Hover extras
        if (isHov && macro.topTopics?.length > 0) {
          const topicLine = macro.topTopics.slice(0, 3).join(" · ");
          drawTextWithHalo(ctx, topicLine, pos.x, pos.y + 22, "8px monospace", macro.color + "b0", "rgba(3,7,15,0.96)", 2.2);
        }
      });

      animRef.current = requestAnimationFrame(render);
    };

    animRef.current = requestAnimationFrame(render);
    return () => {
      running = false;
      if (animRef.current) cancelAnimationFrame(animRef.current);
    };
  }, [dimensions, macros]);

  return (
    <div
      className="relative w-full h-screen overflow-hidden"
       style={{ background: "linear-gradient(180deg, #050915 0%, #03070f 52%, #02050b 100%)" }}
    >
      <canvas
        ref={canvasRef}
        className="absolute inset-0"
        style={{ cursor: hovered != null || hoveredBridge != null ? "pointer" : "default" }}
        onMouseMove={onMouseMove}
        onClick={onClick}
        onMouseLeave={() => {
          hoveredRef.current = null;
          hoveredBridgeRef.current = null;
          setHovered(null);
          setHoveredBridge(null);
        }}
      />

      {/* Cross-cluster link tooltip */}
      {hoveredBridge && (
        <div
          className="pointer-events-none absolute z-30 font-mono text-[10px] bg-black/90 border border-amber-500/40 rounded px-3 py-2 max-w-xs"
          style={{
            left: Math.min(hoveredBridge.x + 15, dimensions.w - 280),
            top: Math.max(hoveredBridge.y - 10, 10),
          }}
        >
          <div className="text-amber-400 font-bold mb-1">
            {hoveredBridge.count} cross-macro links
          </div>
          {hoveredBridge.links.length > 0 && (
            <div className="space-y-1.5 mt-2">
              {hoveredBridge.links.map((link, i) => (
                <div key={i} className="text-amber-300/70 leading-tight">
                  <span className="text-amber-500/50">→</span>{" "}
                  {link.sourceTitle.length > 40 ? link.sourceTitle.slice(0, 40) + "…" : link.sourceTitle}
                  <span className="text-amber-500/30 mx-1">↔</span>
                  {link.targetTitle.length > 40 ? link.targetTitle.slice(0, 40) + "…" : link.targetTitle}
                  <span className="text-amber-500/40 ml-1">({(link.score * 100).toFixed(0)}%)</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

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
         <div key={cls} aria-hidden className={`pointer-events-none absolute ${cls} border-amber-400/35 w-8 h-8 z-20`} />
      ))}

      <GlobalGraphSearch />

      {/* Top-left HUD */}
      <div className="pointer-events-none absolute top-5 left-6 z-20 rounded-2xl border px-3 py-2 font-mono" style={{ background: "rgba(4,10,20,0.5)", borderColor: "rgba(255,180,0,0.16)", backdropFilter: "blur(8px)" }}>
        <div className="text-amber-400 text-xs tracking-[0.25em] font-bold">
          ◈ GALACTIC RESEARCH INTELLIGENCE DIVISION
        </div>
        <div className="text-amber-300/65 text-[10px] tracking-widest mt-0.5">
          MACRO MAP &nbsp;·&nbsp; {macros.length} MACROS &nbsp;·&nbsp; {totalPapers} PAPERS
        </div>
      </div>

      {/* Top-right HUD */}
      <div className="pointer-events-none absolute top-5 right-6 z-20 rounded-2xl border px-3 py-2 font-mono text-right" style={{ background: "rgba(4,10,20,0.46)", borderColor: "rgba(255,180,0,0.14)", backdropFilter: "blur(8px)" }}>
        <div className="text-amber-300/70 text-[10px] tracking-widest">AI RESEARCH INSTITUTE</div>
        <div className="text-amber-200/45 text-[9px] tracking-widest mt-0.5">EXPERIMENTAL</div>
      </div>

      {/* Bottom-right hint */}
      <div className="pointer-events-none absolute bottom-6 right-5 z-20 rounded-2xl border px-3 py-2 font-mono text-[9px] text-right tracking-widest" style={{ color: "rgba(255,227,153,0.9)", background: "rgba(4,10,20,0.4)", borderColor: "rgba(255,180,0,0.14)", backdropFilter: "blur(8px)" }}>
        <div>CLICK MACRO TO EXPLORE</div>
        <div>HOVER FOR DETAILS</div>
      </div>

      {/* Bottom-left legend */}
      <div className="pointer-events-none absolute bottom-6 left-5 z-20 rounded-2xl border px-3 py-2 font-mono text-[10px]" style={{ background: "rgba(4,10,20,0.46)", borderColor: "rgba(255,180,0,0.14)", backdropFilter: "blur(8px)" }}>
        <div className="text-amber-300/65 tracking-widest mb-2">MACROS</div>
        {macros.slice(0, 8).map((macro, i) => (
          <div key={macro.id} className="flex items-center gap-2 mb-1">
            <div className="w-2 h-2 rounded-full" style={{ background: macro.color }} />
            <span style={{ color: macro.color + "cf", textShadow: "0 0 10px rgba(0,0,0,0.9)" }}>
              {macro.label.length > 24 ? macro.label.slice(0, 24) + "…" : macro.label}
            </span>
          </div>
        ))}
        {macros.length > 8 && (
          <div className="text-amber-200/35 mt-1">+{macros.length - 8} more</div>
        )}
      </div>
    </div>
  );
}
