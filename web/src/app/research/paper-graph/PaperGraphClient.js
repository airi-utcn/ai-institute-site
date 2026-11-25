"use client";

import { useState, useRef, useCallback, useEffect, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSearchParams } from "next/navigation";
import { GlobalGraphSearch } from "./globalSearch";
import { usePageState } from "@/lib/usePageState";

// ─── Layout constants ────────────────────────────────────────────────────────
const MAP_W = 2800;
const MAP_H = 1800;
const NODE_R = 18;
const NODE_NAV_DRAG_TOLERANCE = 6;

// ─── Seeded pseudo-random (LCG) ──────────────────────────────────────────────
function makeRng(seed) {
  let s = seed >>> 0;
  return () => {
    s = Math.imul(s, 1664525) + 1013904223;
    return (s >>> 0) / 0xffffffff;
  };
}

// ─── Build star field ────────────────────────────────────────────────────────
function buildStars(count, w, h) {
  const rng = makeRng(0xdeadbeef);
  return Array.from({ length: count }, (_, i) => ({
    id: i,
    cx: rng() * w,
    cy: rng() * h,
    r: rng() * 1.3 + 0.2,
    opacity: rng() * 0.7 + 0.15,
  }));
}

// ─── Position nodes with a deterministic, link-aware force layout ────────────
function buildPositions(items, links, width, height) {
  const PAD = 160;
  const EDGE = 32;
  const n = items.length;
  if (!n) return [];

  const rng = makeRng(0xc0ffee + n);
  const centerX = width / 2;
  const centerY = height / 2;
  const initialRadius = Math.min(width, height) * 0.30;
  const positions = items.map(() => {
    const angle = rng() * Math.PI * 2;
    const radius = Math.sqrt(rng()) * initialRadius;
    return {
      x: centerX + Math.cos(angle) * radius,
      y: centerY + Math.sin(angle) * radius,
      dx: 0,
      dy: 0,
    };
  });

  const indexById = new Map();
  items.forEach((item, index) => {
    if (item.id != null) indexById.set(item.id, index);
  });

  const edges = [];
  (links || []).forEach((link) => {
    const source = indexById.get(link.sourceId);
    const target = indexById.get(link.targetId);
    if (source == null || target == null || source === target) return;
    const score = Number.isFinite(link.score) ? link.score : 0.5;
    edges.push([source, target, Math.max(0.25, score)]);
  });

  const degrees = new Array(n).fill(0);
  edges.forEach(([source, target]) => {
    degrees[source] += 1;
    degrees[target] += 1;
  });

  // Importance drives the radial layout: heavily linked papers sit near the
  // middle, while leaf papers orbit further out.
  const maxDegree = Math.max(1, ...degrees);
  const citations = items.map((item) => Number(item.cited_by) || 0);
  const maxCitations = Math.max(1, ...citations);
  const logCitations = Math.log1p(maxCitations);
  const importance = degrees.map((degree, index) => {
    const degreePart = degree / maxDegree;
    const citationPart =
      logCitations > 0 ? Math.log1p(citations[index]) / logCitations : 0;
    return degreePart * 0.8 + citationPart * 0.2;
  });

  const usableW = width - PAD * 2;
  const usableH = height - PAD * 2;
  const area = usableW * usableH;
  const ideal = Math.max(112, Math.sqrt(area / n) * 0.66);
  const repulsionCutoff = ideal * 2.6;
  const iterations = n > 180 ? 120 : 170;
  const coreRadiusLimit = Math.min(width, height) * 0.29;

  // Force pass: link attraction builds the core, repulsion keeps it legible,
  // and a radial term pulls strong hubs toward the middle.
  for (let iter = 0; iter < iterations; iter++) {
    const progress = iter / iterations;
    const temperature = Math.max(1.2, width * 0.06 * (1 - progress));

    for (let i = 0; i < n; i++) {
      positions[i].dx = 0;
      positions[i].dy = 0;
    }

    // Local repulsion keeps distant papers from pushing the whole graph apart.
    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        let dx = positions[j].x - positions[i].x;
        let dy = positions[j].y - positions[i].y;
        let d2 = dx * dx + dy * dy;
        if (d2 > repulsionCutoff * repulsionCutoff) continue;
        if (d2 < 0.01) {
          dx = (rng() - 0.5) * 2;
          dy = (rng() - 0.5) * 2;
          d2 = dx * dx + dy * dy;
        }
        const d = Math.sqrt(d2);
        const force = (ideal * ideal) / d;
        const ux = dx / d;
        const uy = dy / d;
        positions[i].dx -= ux * force;
        positions[i].dy -= uy * force;
        positions[j].dx += ux * force;
        positions[j].dy += uy * force;
      }
    }

    // Attraction: related papers form islands, but hubs do not collapse.
    edges.forEach(([source, target, score]) => {
      const dx = positions[target].x - positions[source].x;
      const dy = positions[target].y - positions[source].y;
      const d = Math.sqrt(dx * dx + dy * dy) || 0.01;
      const hubDamping =
        1 / Math.sqrt(Math.max(1, degrees[source], degrees[target]));
      const force = ((d * d) / ideal) * (0.28 + score * 0.55) * hubDamping;
      const ux = dx / d;
      const uy = dy / d;
      positions[source].dx += ux * force;
      positions[source].dy += uy * force;
      positions[target].dx -= ux * force;
      positions[target].dy -= uy * force;
    });

    // Radial gravity: high-degree hubs stay central, leaf papers stay outside.
    for (let i = 0; i < n; i++) {
      const dx = positions[i].x - centerX;
      const dy = positions[i].y - centerY;
      const distance = Math.sqrt(dx * dx + dy * dy) || 0.01;
      const target =
        coreRadiusLimit * (0.16 + 0.84 * Math.pow(1 - importance[i], 0.9));
      const radial = (distance - target) * (0.05 + progress * 0.035);
      positions[i].dx -= (dx / distance) * radial;
      positions[i].dy -= (dy / distance) * radial;
    }

    for (let i = 0; i < n; i++) {
      const dx = positions[i].dx;
      const dy = positions[i].dy;
      const distance = Math.sqrt(dx * dx + dy * dy) || 0.01;
      const step = Math.min(distance, temperature) / distance;
      positions[i].x = Math.max(
        PAD,
        Math.min(width - PAD, positions[i].x + dx * step)
      );
      positions[i].y = Math.max(
        PAD,
        Math.min(height - PAD, positions[i].y + dy * step)
      );
    }
  }

  // Final collision pass so the core has breathing room even under many links.
  const minDist = Math.max(96, Math.min(210, ideal * 1.02));
  for (let pass = 0; pass < 18; pass++) {
    let moved = false;
    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        const dx = positions[j].x - positions[i].x;
        const dy = positions[j].y - positions[i].y;
        const d = Math.sqrt(dx * dx + dy * dy) || 0.001;
        if (d >= minDist) continue;
        const force = ((minDist - d) / d) * 0.5;
        positions[i].x -= dx * force;
        positions[i].y -= dy * force;
        positions[j].x += dx * force;
        positions[j].y += dy * force;
        moved = true;
      }
    }
    if (!moved) break;
    for (let i = 0; i < n; i++) {
      positions[i].x = Math.max(PAD, Math.min(width - PAD, positions[i].x));
      positions[i].y = Math.max(PAD, Math.min(height - PAD, positions[i].y));
    }
  }

  // Connected components: the biggest one is the core; smaller components
  // orbit it on concentric elliptical rings instead of sitting in rows below.
  const adjacency = Array.from({ length: n }, () => []);
  edges.forEach(([source, target]) => {
    adjacency[source].push(target);
    adjacency[target].push(source);
  });

  const visited = new Array(n).fill(false);
  const components = [];
  for (let i = 0; i < n; i++) {
    if (visited[i]) continue;
    const queue = [i];
    const indices = [];
    visited[i] = true;
    while (queue.length) {
      const current = queue.pop();
      indices.push(current);
      adjacency[current].forEach((neighbour) => {
        if (!visited[neighbour]) {
          visited[neighbour] = true;
          queue.push(neighbour);
        }
      });
    }
    components.push({ indices });
  }

  components.sort((a, b) => b.indices.length - a.indices.length);

  const spreadFor = (m, isCore) => {
    if (m <= 1) return 0;
    if (isCore) {
      return Math.min(
        Math.min(width, height) * 0.27,
        ideal * Math.sqrt(m) * 0.52
      );
    }
    return ideal * Math.sqrt(m) * 0.46;
  };

  const layoutComponent = (component, isCore) => {
    const m = component.indices.length;
    const rest = ideal * (isCore ? 1.12 : 1.06);

    if (m === 1) return [{ x: 0, y: 0 }];
    if (m === 2) {
      return [
        { x: -rest / 2, y: 0 },
        { x: rest / 2, y: 0 },
      ];
    }
    if (m === 3) {
      const radius = rest / Math.sqrt(3);
      return [0, 1, 2].map((index) => {
        const angle = -Math.PI / 2 + (index * Math.PI * 2) / 3;
        return { x: Math.cos(angle) * radius, y: Math.sin(angle) * radius };
      });
    }
    if (m === 4) {
      const radius = rest / Math.sqrt(2);
      return [0, 1, 2, 3].map((index) => {
        const angle = Math.PI / 4 + (index * Math.PI) / 2;
        return { x: Math.cos(angle) * radius, y: Math.sin(angle) * radius };
      });
    }

    const points = component.indices.map((index) => positions[index]);
    const cx = points.reduce((sum, point) => sum + point.x, 0) / m;
    const cy = points.reduce((sum, point) => sum + point.y, 0) / m;
    const local = points.map((point) => ({ x: point.x - cx, y: point.y - cy }));
    const extent = Math.max(
      ...local.map((point) => Math.hypot(point.x, point.y)),
      1
    );
    const target = spreadFor(m, isCore);
    const factor = target > 0 ? target / extent : 1;
    return local.map((point) => ({ x: point.x * factor, y: point.y * factor }));
  };

  const core = components[0];
  const coreLocal = layoutComponent(core, true);
  const coreRadius = Math.max(
    ...coreLocal.map((point) => Math.hypot(point.x, point.y)),
    ideal * 0.6
  );

  core.indices.forEach((index, localIndex) => {
    positions[index] = {
      x: centerX + coreLocal[localIndex].x,
      y: centerY + coreLocal[localIndex].y,
    };
  });

  const satellites = components.slice(1).map((component) => {
    const local = layoutComponent(component, false);
    const radius = Math.max(
      ...local.map((point) => Math.hypot(point.x, point.y)),
      ideal * 0.26
    );
    return { component, local, radius };
  });

  satellites.sort((a, b) => b.radius - a.radius);

  // Give every satellite an evenly spaced angle around the core. The largest
  // islands are assigned the most horizontal slots (where there is room), and
  // the smallest settle near the top and bottom. Each island's inner edge sits
  // one gap outside the core, so the result reads as a concentric halo.
  const count = satellites.length;
  const placed = [{ x: centerX, y: centerY, r: coreRadius }];
  const gap = ideal * 0.42;
  const step = Math.max(8, ideal * 0.18);
  const evenAngles = Array.from(
    { length: count },
    (_, index) => (index / Math.max(1, count)) * Math.PI * 2
  );
  const horizontalFirst = [...evenAngles].sort((a, b) => {
    const sinDiff = Math.abs(Math.sin(a)) - Math.abs(Math.sin(b));
    if (Math.abs(sinDiff) > 1e-6) return sinDiff;
    return Math.cos(a) - Math.cos(b);
  });

  satellites.forEach((satellite, index) => {
    const cr = satellite.radius;
    const assignedAngle = horizontalFirst[index] ?? 0;
    const startRadius = coreRadius + gap + cr;
    let placement = null;

    // Try the assigned angle first, then neighbours, then grow outwards.
    const angleCandidates = [];
    for (let offset = 0; offset < count; offset += 1) {
      angleCandidates.push(horizontalFirst[(index + offset) % count]);
    }
    if (count === 0) angleCandidates.push(0);

    for (let extra = 0; extra <= step * 90 && !placement; extra += step) {
      const radius = startRadius + extra;
      for (const angle of angleCandidates) {
        const x = centerX + Math.cos(angle) * radius;
        const y = centerY + Math.sin(angle) * radius;
        if (
          x - cr < EDGE ||
          x + cr > width - EDGE ||
          y - cr < EDGE ||
          y + cr > height - EDGE
        ) {
          continue;
        }
        const collides = placed.some(
          (other) => Math.hypot(x - other.x, y - other.y) < other.r + cr + gap
        );
        if (!collides) {
          placement = { x, y };
          break;
        }
      }
    }

    if (!placement) {
      const angle = assignedAngle;
      placement = {
        x: centerX + Math.cos(angle) * Math.min(startRadius, width / 2 - cr),
        y: centerY + Math.sin(angle) * Math.min(startRadius, height / 2 - cr),
      };
    }

    placed.push({ x: placement.x, y: placement.y, r: cr });
    satellite.component.indices.forEach((nodeIndex, localIndex) => {
      positions[nodeIndex] = {
        x: placement.x + satellite.local[localIndex].x,
        y: placement.y + satellite.local[localIndex].y,
      };
    });
  });

  return positions.map(({ x, y }) => ({ x, y }));
}

// ─── Link visual style by score ──────────────────────────────────────────────
function linkStyle(score, isCross) {
  if (isCross) return { stroke: "#ffa500", width: 1.0, opacity: 0.34, dash: "6 4" };
  if (score >= 0.8) return { stroke: "#ffe066", width: 1.9, opacity: 0.55, dash: "none" };
  if (score >= 0.65) return { stroke: "#ff8c00", width: 1.2, opacity: 0.38, dash: "none" };
  return { stroke: "#4d7fff", width: 0.7, opacity: 0.18, dash: "none" };
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

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function getVisibleGraphRect(tx, ty, scale, viewportW, viewportH, mapW, mapH) {
  return {
    left: clamp((-tx) / scale, 0, mapW),
    top: clamp((-ty) / scale, 0, mapH),
    right: clamp((viewportW - tx) / scale, 0, mapW),
    bottom: clamp((viewportH - ty) / scale, 0, mapH),
  };
}

// ─── Component ───────────────────────────────────────────────────────────────
export default function PaperGraphClient({
  publications = [],
  links,
  backHref,
  backLabel,
  topicLabel,
  accentColor = "#4ecdc4",
  topicScope = null,
  topicScopeLinks = null,
  topicScopeCounts = null,
}) {
  const papers = publications;
  const router = useRouter();

  const containerRef = useRef(null);
  const svgRef = useRef(null);
  const nodePressRef = useRef(null);

  // Filters
  const [minScore, setMinScore] = usePageState("minScore", 0.5);
  const [showCrossCluster, setShowCrossCluster] = usePageState("showCrossCluster", true);

  // Pan/zoom state
  const [tx, setTx] = useState(0);
  const [ty, setTy] = useState(0);
  const [scale, setScale] = useState(1);
  const [panning, setPanning] = useState(false);
  const panOrigin = useRef(null);
  const txRef = useRef(0);
  const tyRef = useRef(0);
  const scaleRef = useRef(1);

  // Hover state
  const [hovered, setHovered] = useState(null);
  const [hoveredLinkId, setHoveredLinkId] = useState(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);


  // ── Paper lookup ──────────────────────────────────────────────────────────
  const paperById = useMemo(() => {
    const m = {};
    papers.forEach((p) => { m[p.id] = p; });
    return m;
  }, [papers]);

  // ── Filtered links ────────────────────────────────────────────────────────
  const visibleLinks = useMemo(() => {
    const ids = new Set(papers.map((p) => p.id));
    return links.filter((l) => {
      if (!ids.has(l.sourceId) || !ids.has(l.targetId)) return false;
      if (l.score < minScore) return false;
      if (l.isCrossCluster && !showCrossCluster) return false;
      return true;
    });
  }, [papers, links, minScore, showCrossCluster]);

  const connectedIds = useMemo(() => {
    const ids = new Set();
    visibleLinks.forEach((link) => {
      ids.add(link.sourceId);
      ids.add(link.targetId);
    });
    return ids;
  }, [visibleLinks]);

  // ── Dynamic canvas size and degree-aware sizing ────────────────────────────
  const mapSize = useMemo(() => {
    const count = Math.max(1, papers.length);
    const width = Math.max(MAP_W, Math.round(Math.sqrt(count) * 310));
    const height = Math.max(MAP_H, Math.round(width * (MAP_H / MAP_W)));
    return { width, height };
  }, [papers.length]);

  const degreeById = useMemo(() => {
    const degrees = {};
    visibleLinks.forEach((link) => {
      degrees[link.sourceId] = (degrees[link.sourceId] || 0) + 1;
      degrees[link.targetId] = (degrees[link.targetId] || 0) + 1;
    });
    return degrees;
  }, [visibleLinks]);

  const nodeRadius = useCallback((paper) => {
    const citations = paper.cited_by || 0;
    const degree = degreeById[paper.id] || 0;
    return (
      9 +
      Math.min(14, Math.sqrt(degree) * 2.8) +
      Math.min(3, Math.sqrt(citations) * 0.5)
    );
  }, [degreeById]);

  const labelRank = useMemo(() => {
    const ordered = [...papers].sort((a, b) => {
      const degreeDiff = (degreeById[b.id] || 0) - (degreeById[a.id] || 0);
      if (degreeDiff !== 0) return degreeDiff;
      return (b.cited_by || 0) - (a.cited_by || 0);
    });
    const rank = {};
    ordered.forEach((paper, index) => {
      rank[paper.id] = index;
    });
    return rank;
  }, [papers, degreeById]);

  // ── Paper positions ───────────────────────────────────────────────────────
  const paperPositions = useMemo(() => {
    const posArray = buildPositions(papers, links, mapSize.width, mapSize.height);
    const m = {};
    papers.forEach((p, i) => { m[p.id] = posArray[i]; });
    return m;
  }, [papers, links, mapSize]);

  const contentBounds = useMemo(() => {
    const points = Object.values(paperPositions);
    if (!points.length) {
      return { left: 0, top: 0, right: mapSize.width, bottom: mapSize.height };
    }
    let minX = Number.POSITIVE_INFINITY;
    let minY = Number.POSITIVE_INFINITY;
    let maxX = Number.NEGATIVE_INFINITY;
    let maxY = Number.NEGATIVE_INFINITY;
    points.forEach((point) => {
      minX = Math.min(minX, point.x);
      minY = Math.min(minY, point.y);
      maxX = Math.max(maxX, point.x);
      maxY = Math.max(maxY, point.y);
    });
    const padding = 180;
    return {
      left: Math.max(0, minX - padding),
      top: Math.max(0, minY - padding),
      right: Math.min(mapSize.width, maxX + padding),
      bottom: Math.min(mapSize.height, maxY + padding),
    };
  }, [paperPositions, mapSize]);

  const stars = useMemo(
    () => buildStars(600, mapSize.width, mapSize.height),
    [mapSize]
  );

  const gridLines = useMemo(() => ({
    cols: Array.from({ length: Math.ceil(mapSize.width / 220) + 1 }, (_, i) => i * 220),
    rows: Array.from({ length: Math.ceil(mapSize.height / 220) + 1 }, (_, i) => i * 220),
  }), [mapSize]);

  // ── Label layout ──────────────────────────────────────────────────────────
  // Labels appear progressively with zoom and are placed in whichever side of
  // a node has room, so text never sits on top of another paper.
  const labelLayout = useMemo(() => {
    const layout = new Map();
    if (!papers.length) return layout;
    const invScale = 1 / Math.max(scale, 0.22);
    const maxChars = scale < 0.8 ? 20 : scale < 1.2 ? 32 : 52;
    const maxLabels =
      scale < 0.78 ? 8 :
      scale < 1.05 ? 14 :
      scale < 1.4 ? 24 :
      papers.length;
    const pool = Math.min(papers.length, Math.max(maxLabels, maxLabels * 3));
    const ordered = [...papers].sort(
      (a, b) =>
        (labelRank[a.id] ?? Number.MAX_SAFE_INTEGER) -
        (labelRank[b.id] ?? Number.MAX_SAFE_INTEGER)
    );
    const nodeBoxes = papers
      .map((paper) => {
        const pos = paperPositions[paper.id];
        if (!pos) return null;
        return {
          id: paper.id,
          x: pos.x,
          y: pos.y,
          r: nodeRadius(paper) + 9 * invScale,
        };
      })
      .filter(Boolean);
    const placed = [];

    for (const paper of ordered.slice(0, pool)) {
      if (placed.length >= maxLabels) break;
      const pos = paperPositions[paper.id];
      if (!pos) continue;
      const raw = String(paper.title || "").trim();
      if (!raw) continue;
      const text =
        raw.length > maxChars ? `${raw.slice(0, maxChars - 1)}…` : raw;
      const width = Math.min(250, Math.max(36, text.length * 6.2)) * invScale;
      const height = 13 * invScale;
      const gap = 8 * invScale;
      const r = nodeRadius(paper);
      const near = r + gap;
      const far = near + 30 * invScale;
      const far2 = far + 55 * invScale;
      const candidates = [];

      [near, far, far2].forEach((distance, ring) => {
        const diagonal = distance * 0.72;
        candidates.push(
          { x: pos.x, y: pos.y + distance + height / 2, anchor: "middle", ring },
          { x: pos.x, y: pos.y - distance - height / 2, anchor: "middle", ring },
          { x: pos.x + distance, y: pos.y, anchor: "start", ring },
          { x: pos.x - distance, y: pos.y, anchor: "end", ring },
          { x: pos.x + diagonal, y: pos.y + diagonal, anchor: "start", ring },
          { x: pos.x + diagonal, y: pos.y - diagonal, anchor: "start", ring },
          { x: pos.x - diagonal, y: pos.y + diagonal, anchor: "end", ring },
          { x: pos.x - diagonal, y: pos.y - diagonal, anchor: "end", ring }
        );
      });

      for (const candidate of candidates) {
        let left;
        let right;
        if (candidate.anchor === "start") {
          left = candidate.x;
          right = candidate.x + width;
        } else if (candidate.anchor === "end") {
          left = candidate.x - width;
          right = candidate.x;
        } else {
          left = candidate.x - width / 2;
          right = candidate.x + width / 2;
        }
        const rect = {
          left,
          right,
          top: candidate.y - height / 2,
          bottom: candidate.y + height / 2,
        };
        if (
          rect.left < 8 ||
          rect.right > mapSize.width - 8 ||
          rect.top < 8 ||
          rect.bottom > mapSize.height - 8
        ) {
          continue;
        }
        const hitsNode = nodeBoxes.some((node) => {
          if (node.id === paper.id) return false;
          const nearestX = clamp(node.x, rect.left, rect.right);
          const nearestY = clamp(node.y, rect.top, rect.bottom);
          const dx = node.x - nearestX;
          const dy = node.y - nearestY;
          return dx * dx + dy * dy < node.r * node.r;
        });
        if (hitsNode) continue;
        const overlapsLabel = placed.some(
          (other) =>
            !(
              rect.right < other.left ||
              rect.left > other.right ||
              rect.bottom < other.top ||
              rect.top > other.bottom
            )
        );
        if (overlapsLabel) continue;
        placed.push(rect);
        layout.set(paper.id, {
          x: candidate.x,
          y: candidate.y,
          anchor: candidate.anchor,
          text,
          width,
          height,
          leader: candidate.ring > 0,
        });
        break;
      }
    }

    return layout;
  }, [papers, paperPositions, scale, labelRank, nodeRadius, mapSize]);

  // ── Link index ────────────────────────────────────────────────────────────
  const linksByPaper = useMemo(() => {
    const idx = {};
    visibleLinks.forEach((l) => {
      (idx[l.sourceId] ??= []).push(l);
      (idx[l.targetId] ??= []).push(l);
    });
    return idx;
  }, [visibleLinks]);

  const linkById = useMemo(() => {
    const idx = {};
    visibleLinks.forEach((l) => {
      idx[l.id] = l;
    });
    return idx;
  }, [visibleLinks]);

  const hoveredLink = hoveredLinkId ? linkById[hoveredLinkId] : null;

  const connectedSet = useMemo(() => {
    if (hovered) {
      const s = new Set([hovered]);
      (linksByPaper[hovered] ?? []).forEach((l) => {
        s.add(l.sourceId);
        s.add(l.targetId);
      });
      return s;
    }
    if (hoveredLink) {
      return new Set([hoveredLink.sourceId, hoveredLink.targetId]);
    }
    return null;
  }, [hovered, hoveredLink, linksByPaper]);

  const setCamera = useCallback((nextTx, nextTy, nextScale) => {
    txRef.current = nextTx;
    tyRef.current = nextTy;
    scaleRef.current = nextScale;
    setTx(nextTx);
    setTy(nextTy);
    setScale(nextScale);
  }, []);

  useEffect(() => { txRef.current = tx; }, [tx]);
  useEffect(() => { tyRef.current = ty; }, [ty]);
  useEffect(() => { scaleRef.current = scale; }, [scale]);

  // ── Highlight state & search focus ──────────────────────────────────────────
  const searchParams = useSearchParams();
  const [highlightedId, setHighlightedId] = useState(null);
  const highlightTimeoutRef = useRef(null);

  const focusPaper = useCallback((paperId) => {
    if (!paperId) return;
    setHighlightedId(paperId);
    setHovered(paperId);
    setHoveredLinkId(null);

    if (highlightTimeoutRef.current) {
      clearTimeout(highlightTimeoutRef.current);
    }

    // Auto-expire highlight effect after 6 seconds
    highlightTimeoutRef.current = setTimeout(() => {
      setHighlightedId(null);
      setHovered((curr) => (curr === paperId ? null : curr));
    }, 6000);

    const pos = paperPositions[paperId];
    const el = containerRef.current;
    if (pos && el) {
      const { width: cw, height: ch } = el.getBoundingClientRect();
      const targetScale = 1.35;
      setCamera(cw / 2 - pos.x * targetScale, ch / 2 - pos.y * targetScale, targetScale);
    }
  }, [paperPositions, setCamera]);

  useEffect(() => {
    const hl = searchParams?.get("highlight");
    if (hl && paperPositions[hl]) {
      focusPaper(hl);

      // Clean up URL query parameter without a full reload so refresh won't repeat highlight
      if (typeof window !== "undefined") {
        const url = new URL(window.location.href);
        url.searchParams.delete("highlight");
        window.history.replaceState({}, "", url.pathname + url.search);
      }
    }
  }, [searchParams, paperPositions, focusPaper]);

  useEffect(() => {
    return () => {
      if (highlightTimeoutRef.current) {
        clearTimeout(highlightTimeoutRef.current);
      }
    };
  }, []);

  // ── Fit to screen ─────────────────────────────────────────────────────────
  const fitToScreen = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;
    const { width: cw, height: ch } = el.getBoundingClientRect();
    const contentWidth = Math.max(1, contentBounds.right - contentBounds.left);
    const contentHeight = Math.max(1, contentBounds.bottom - contentBounds.top);
    const s = Math.min(cw / contentWidth, ch / contentHeight) * 0.94;
    const centerX = (contentBounds.left + contentBounds.right) / 2;
    const centerY = (contentBounds.top + contentBounds.bottom) / 2;
    setCamera(
      cw / 2 - centerX * s,
      ch / 2 - centerY * s,
      Math.max(0.2, Math.min(4, s))
    );
  }, [setCamera, contentBounds]);
  useEffect(() => { fitToScreen(); }, [fitToScreen]);

  // ── Pan handlers ──────────────────────────────────────────────────────────
  const onMouseDown = useCallback((e) => {
    if (e.button !== 0) return;
    if (e.target.closest("[data-node]")) return;
    setPanning(true);
    panOrigin.current = { mx: e.clientX, my: e.clientY, tx: txRef.current, ty: tyRef.current };
  }, []);

  const onMouseMove = useCallback((e) => {
    if (!panning || !panOrigin.current) return;
    setTx(panOrigin.current.tx + e.clientX - panOrigin.current.mx);
    setTy(panOrigin.current.ty + e.clientY - panOrigin.current.my);
  }, [panning]);

  const onMouseUp = useCallback((e) => {
    if (panOrigin.current && e?.clientX !== undefined) {
      const moved = Math.hypot(e.clientX - panOrigin.current.mx, e.clientY - panOrigin.current.my);
      if (moved <= NODE_NAV_DRAG_TOLERANCE && !e.target.closest("[data-node]")) {
        setHighlightedId(null);
        setHoveredLinkId(null);
        if (highlightTimeoutRef.current) {
          clearTimeout(highlightTimeoutRef.current);
        }
      }
    }
    setPanning(false);
    panOrigin.current = null;
    nodePressRef.current = null;
  }, []);

  const onContainerMouseLeave = useCallback((e) => {
    onMouseUp(e);
    setHovered(null);
    setHoveredLinkId(null);
  }, [onMouseUp]);

  const onNodeMouseDown = useCallback((e, publicationId) => {
    if (e.button !== 0) return;
    nodePressRef.current = { publicationId, x: e.clientX, y: e.clientY };
  }, []);

  const onNodeMouseUp = useCallback((e, publication) => {
    if (e.button !== 0 || !publication.publicationHref) return;
    const press = nodePressRef.current;
    nodePressRef.current = null;
    if (!press || press.publicationId !== publication.id) return;

    const moved = Math.hypot(e.clientX - press.x, e.clientY - press.y);
    if (moved > NODE_NAV_DRAG_TOLERANCE) return;

    router.push(publication.publicationHref);
  }, [router]);

  const onNodeKeyDown = useCallback((e, publication) => {
    if (!publication.publicationHref) return;
    if (e.key !== "Enter" && e.key !== " ") return;
    e.preventDefault();
    router.push(publication.publicationHref);
  }, [router]);

  const onMinimapPointerDown = useCallback((e) => {
    e.preventDefault();
    const el = containerRef.current;
    const mini = e.currentTarget;
    if (!el || !mini) return;

    const viewport = el.getBoundingClientRect();
    const miniRect = mini.getBoundingClientRect();
    const miniInner = {
      left: 10,
      top: 22,
      width: miniRect.width - 20,
      height: miniRect.height - 30,
    };
    const miniScale = Math.min(miniInner.width / mapSize.width, miniInner.height / mapSize.height);
    const miniOffsetX = miniInner.left + (miniInner.width - mapSize.width * miniScale) / 2;
    const miniOffsetY = miniInner.top + (miniInner.height - mapSize.height * miniScale) / 2;
    const clickX = clamp(e.clientX - miniRect.left, miniOffsetX, miniOffsetX + mapSize.width * miniScale);
    const clickY = clamp(e.clientY - miniRect.top, miniOffsetY, miniOffsetY + mapSize.height * miniScale);
    const targetX = (clickX - miniOffsetX) / miniScale;
    const targetY = (clickY - miniOffsetY) / miniScale;

    const currentScale = scaleRef.current;
    setCamera(viewport.width / 2 - targetX * currentScale, viewport.height / 2 - targetY * currentScale, currentScale);
  }, [setCamera, mapSize]);

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
      const currentScale = scaleRef.current;
      const nextScale = Math.max(0.2, Math.min(4, currentScale * factor));
      const nextTx = mx - (mx - txRef.current) * (nextScale / currentScale);
      const nextTy = my - (my - tyRef.current) * (nextScale / currentScale);
      setCamera(nextTx, nextTy, nextScale);
    };
    el.addEventListener("wheel", handler, { passive: false });
    return () => el.removeEventListener("wheel", handler);
  }, []);

  // ── Tooltip ───────────────────────────────────────────────────────────────
  const tooltipData = useMemo(() => {
    if (!hovered) return null;
    const paper = paperById[hovered];
    const pos = paperPositions[hovered];
    if (!paper || !pos) return null;
    return {
      paper,
      sx: tx + pos.x * scale,
      sy: ty + pos.y * scale,
    };
  }, [hovered, paperById, paperPositions, tx, ty, scale]);

  const hovLinks = tooltipData ? (linksByPaper[tooltipData.paper.id] ?? []) : [];
  const macroTheme = tooltipData?.paper?.graphMacroPrimary?.name || tooltipData?.paper?.graphMacroPrimary?.slug || '';
  const viewportBox = containerRef.current?.getBoundingClientRect();
  const visibleGraphRect = viewportBox
    ? getVisibleGraphRect(tx, ty, scale, viewportBox.width, viewportBox.height, mapSize.width, mapSize.height)
    : { left: 0, top: 0, right: mapSize.width, bottom: mapSize.height };
  const minimapW = 188;
  const minimapH = 118;
  const minimapInner = {
    left: 10,
    top: 22,
    width: minimapW - 20,
    height: minimapH - 30,
  };
  const minimapScale = Math.min(minimapInner.width / mapSize.width, minimapInner.height / mapSize.height);
  const minimapOffsetX = minimapInner.left + (minimapInner.width - mapSize.width * minimapScale) / 2;
  const minimapOffsetY = minimapInner.top + (minimapInner.height - mapSize.height * minimapScale) / 2;
  const minimapVisible = {
    x: minimapOffsetX + visibleGraphRect.left * minimapScale,
    y: minimapOffsetY + visibleGraphRect.top * minimapScale,
    width: Math.max(2, (visibleGraphRect.right - visibleGraphRect.left) * minimapScale),
    height: Math.max(2, (visibleGraphRect.bottom - visibleGraphRect.top) * minimapScale),
  };

  return (
    <div
      ref={containerRef}
      className="relative w-full overflow-hidden select-none overscroll-none"
      style={{
        height: "100vh",
        background: "linear-gradient(180deg, #050915 0%, #03070f 52%, #02050b 100%)",
        cursor: panning ? "grabbing" : "grab",
      }}
      onMouseDown={onMouseDown}
      onMouseMove={onMouseMove}
      onMouseUp={onMouseUp}
      onMouseLeave={onContainerMouseLeave}
    >
      {/* CRT scanlines */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 z-20"
        style={{
          backgroundImage:
            "repeating-linear-gradient(0deg,transparent,transparent 3px,rgba(0,0,0,0.06) 3px,rgba(0,0,0,0.06) 6px)",
          mixBlendMode: "soft-light",
        }}
      />

      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 z-10"
        style={{
          background:
            "radial-gradient(circle at 50% 42%, rgba(255,255,255,0.02), rgba(255,255,255,0) 28%), radial-gradient(circle at 50% 50%, rgba(2,5,11,0) 48%, rgba(2,5,11,0.25) 74%, rgba(2,5,11,0.78) 100%)",
        }}
      />

      {/* Corner brackets */}
      {[
        "top-3 left-3 border-t-2 border-l-2",
        "top-3 right-3 border-t-2 border-r-2",
        "bottom-3 left-3 border-b-2 border-l-2",
        "bottom-3 right-3 border-b-2 border-r-2",
      ].map((cls) => (
        <div key={cls} aria-hidden className={`pointer-events-none absolute ${cls} border-amber-400/35 w-8 h-8 z-30`} />
      ))}

      {/* Back navigation */}
      {backHref && (
        <div className="absolute top-4 left-5 z-40 flex items-center gap-3 font-mono text-[10px]">
          <Link
            href={backHref}
            className="text-amber-400 border border-amber-500/40 px-2 py-0.5 hover:bg-amber-500/20 transition-colors"
          >
            ◂ BACK
          </Link>
          {backLabel && (
            <span className="text-amber-500/50">{backLabel}</span>
          )}
          {topicLabel && (
            <>
              <span className="text-amber-500/30">▸</span>
              <span style={{ color: accentColor }} className="opacity-80">{topicLabel}</span>
            </>
          )}
        </div>
      )}

      {/* Top-left HUD */}
      <div className="absolute top-12 left-5 z-30 rounded-2xl border px-3 py-2 font-mono" style={{ background: "rgba(4,10,20,0.5)", borderColor: "rgba(255,180,0,0.14)", backdropFilter: "blur(8px)" }}>
        <div className="pointer-events-none text-amber-300/65 text-[10px] tracking-widest">
          {papers.length} PAPERS &nbsp;·&nbsp; {connectedIds.size} LINKED &nbsp;·&nbsp;{" "}
          {papers.length - connectedIds.size} UNLINKED &nbsp;·&nbsp; {visibleLinks.length} LINKS
        </div>
        {topicScope && (
          <div className="mt-2 flex items-center gap-1.5 text-[9px] tracking-widest">
            <Link
              href={topicScopeLinks?.primary || "#"}
              className="rounded border px-2 py-0.5 transition-colors"
              style={{
                borderColor: topicScope === "primary" ? "rgba(255,210,100,0.65)" : "rgba(255,180,0,0.2)",
                background: topicScope === "primary" ? "rgba(255,180,0,0.16)" : "transparent",
                color: topicScope === "primary" ? "#ffe6a3" : "rgba(255,227,153,0.55)",
              }}
            >
              PRIMARY {topicScopeCounts?.primary ?? papers.length}
            </Link>
            <Link
              href={topicScopeLinks?.tagged || "#"}
              className="rounded border px-2 py-0.5 transition-colors"
              style={{
                borderColor: topicScope === "tagged" ? "rgba(255,210,100,0.65)" : "rgba(255,180,0,0.2)",
                background: topicScope === "tagged" ? "rgba(255,180,0,0.16)" : "transparent",
                color: topicScope === "tagged" ? "#ffe6a3" : "rgba(255,227,153,0.55)",
              }}
            >
              ALL TAGGED {topicScopeCounts?.tagged ?? papers.length}
            </Link>
          </div>
        )}
      </div>

      {/* Top-right HUD */}
      <div className="pointer-events-none absolute top-4 right-5 z-30 rounded-2xl border px-3 py-2 font-mono text-right" style={{ background: "rgba(4,10,20,0.46)", borderColor: "rgba(255,180,0,0.12)", backdropFilter: "blur(8px)" }}>
        <div className="text-amber-300/65 text-[10px] tracking-widest">AI RESEARCH INSTITUTE</div>
        <div className="text-amber-200/45 text-[9px] tracking-widest mt-0.5">SCIENCE DIVISION</div>
      </div>

      {/* Minimap */}
      <div
        className="absolute top-24 right-5 z-30 w-[188px] rounded-2xl border px-2 py-2 font-mono"
        style={{ background: "rgba(4,10,20,0.66)", borderColor: "rgba(255,180,0,0.14)", backdropFilter: "blur(10px)", boxShadow: "0 12px 30px rgba(0,0,0,0.3)" }}
        onPointerDown={onMinimapPointerDown}
      >
        <div className="px-1 pb-1 text-[8px] tracking-[0.32em] text-amber-300/60">OVERVIEW</div>
        {mounted && (
        <svg width={minimapW} height={minimapH} viewBox={`0 0 ${minimapW} ${minimapH}`} className="block overflow-visible">
          <defs>
            <linearGradient id="minimap-bg" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="#07101d" />
              <stop offset="100%" stopColor="#03070f" />
            </linearGradient>
          </defs>
          <rect x="0" y="0" width={minimapW} height={minimapH} rx="14" fill="url(#minimap-bg)" stroke="rgba(255,180,0,0.1)" />
          <rect x={minimapInner.left} y={minimapInner.top} width={minimapInner.width} height={minimapInner.height} rx="10" fill="rgba(255,255,255,0.015)" stroke="rgba(118,169,255,0.08)" />
          <line
            x1={minimapOffsetX + (mapSize.width / 2) * minimapScale}
            y1={minimapOffsetY}
            x2={minimapOffsetX + (mapSize.width / 2) * minimapScale}
            y2={minimapOffsetY + mapSize.height * minimapScale}
            stroke="rgba(255,200,120,0.18)"
            strokeDasharray="4 5"
          />
          {papers.map((paper) => {
            const pos = paperPositions[paper.id];
            if (!pos) return null;
            return (
              <circle
                key={`mini-${paper.id}`}
                cx={minimapOffsetX + pos.x * minimapScale}
                cy={minimapOffsetY + pos.y * minimapScale}
                r={Math.max(0.8, Math.min(2.1, nodeRadius(paper) * 0.1))}
                fill={accentColor}
                fillOpacity="0.72"
              />
            );
          })}
          <rect
            x={minimapVisible.x}
            y={minimapVisible.y}
            width={minimapVisible.width}
            height={minimapVisible.height}
            rx="4"
            fill="rgba(255,227,153,0.08)"
            stroke="rgba(255,227,153,0.9)"
            strokeWidth="1.2"
          />
        </svg>
        )}
        <div className="mt-1 px-1 text-[7px] tracking-[0.22em] text-amber-200/35">CLICK TO RECENTER</div>
      </div>

      {/* Legend */}
      <div className="pointer-events-none absolute bottom-6 left-5 z-30 rounded-2xl border px-3 py-2 font-mono text-[10px]" style={{ background: "rgba(4,10,20,0.46)", borderColor: "rgba(255,180,0,0.14)", backdropFilter: "blur(8px)" }}>
        <div className="text-amber-300/65 tracking-widest mb-2">LINK STRENGTH</div>
        {[
          { color: "#4d7fff", label: "WEAK   0.50–0.65", w: 1 },
          { color: "#ff8c00", label: "MODERATE  0.65–0.80", w: 2 },
          { color: "#ffe066", label: "STRONG  0.80–1.00", w: 3 },
          { color: "#ffa500", label: "CROSS-MACRO", w: 1.5, dash: true },
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
      </div>

      {/* Controls hint */}
      <div className="pointer-events-none absolute bottom-6 right-5 z-30 rounded-2xl border px-3 py-2 font-mono text-[9px] text-right tracking-widest" style={{ color: "rgba(255,227,153,0.9)", background: "rgba(4,10,20,0.4)", borderColor: "rgba(255,180,0,0.12)", backdropFilter: "blur(8px)" }}>
        <div>SCROLL TO ZOOM</div>
        <div>DRAG TO PAN</div>
        <div>CLICK NODE TO OPEN PAGE</div>
        <div>HOVER NODE FOR INTEL</div>
      </div>

      {/* Global & In-Topic Search */}
      <GlobalGraphSearch
        currentPapers={papers}
        fabClassName="bottom-56 right-5"
        onSelectPaper={(paper) => {
          focusPaper(paper.id);
        }}
      />

      {/* Filter controls */}
      <div
        className="absolute bottom-28 right-5 z-40 rounded-2xl border px-3 py-2 font-mono text-[9px]"
        style={{
          background: "rgba(4,10,20,0.78)",
          border: "1px solid rgba(255,180,0,0.18)",
          boxShadow: "0 8px 30px rgba(0,0,0,0.32)",
        }}
        onWheelCapture={(e) => {
          e.preventDefault();
          e.stopPropagation();
        }}
      >
        <div className="text-amber-300/65 tracking-widest mb-2">FILTERS</div>
        <label className="flex items-center gap-2 text-amber-200/75 mb-2">
          <span className="w-20">MIN SCORE</span>
          <input
            type="range" min="0.3" max="0.9" step="0.05"
            value={minScore}
            onChange={(e) => setMinScore(parseFloat(e.target.value))}
            className="w-20 accent-amber-500"
          />
          <span className="text-amber-100 w-8 text-right">{minScore.toFixed(2)}</span>
        </label>
        <label className="flex items-center gap-2 text-amber-200/75 cursor-pointer">
          <input
            type="checkbox"
            checked={showCrossCluster}
            onChange={(e) => setShowCrossCluster(e.target.checked)}
            className="accent-amber-500"
          />
          <span>CROSS-CLUSTER LINKS</span>
        </label>
      </div>

      {/* SVG */}
      {mounted && (
      <svg
        ref={svgRef}
        width={mapSize.width}
        height={mapSize.height}
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

        <rect width={mapSize.width} height={mapSize.height} fill="#03070f" />
        <rect width={mapSize.width} height={mapSize.height} fill="url(#nebula1)" />
        <rect width={mapSize.width} height={mapSize.height} fill="url(#nebula2)" />

        {stars.map((s) => (
          <circle key={s.id} cx={s.cx} cy={s.cy} r={s.r} fill="white" opacity={s.opacity} />
        ))}

        {gridLines.cols.map((x) => (
          <line key={`gc${x}`} x1={x} y1={0} x2={x} y2={mapSize.height}
            stroke="rgba(80,160,255,0.035)" strokeWidth="1" />
        ))}
        {gridLines.rows.map((y) => (
          <line key={`gr${y}`} x1={0} y1={y} x2={mapSize.width} y2={y}
            stroke="rgba(80,160,255,0.035)" strokeWidth="1" />
        ))}

        {/* Links */}
        {visibleLinks.map((l) => {
          const a = paperPositions[l.sourceId];
          const b = paperPositions[l.targetId];
          if (!a || !b) return null;
          const { stroke, width, opacity, dash } = linkStyle(l.score, l.isCrossCluster);
          const isHoveredLink = hoveredLinkId === l.id;
          const isActive =
            isHoveredLink ||
            (hovered != null && (l.sourceId === hovered || l.targetId === hovered));
          const isDim =
            (hovered != null || hoveredLinkId != null) && !isActive;
          const dx = b.x - a.x;
          const dy = b.y - a.y;
          const distance = Math.hypot(dx, dy) || 1;
          const hash =
            typeof l.id === "number"
              ? l.id
              : String(l.id)
                  .split("")
                  .reduce((sum, char) => sum + char.charCodeAt(0), 0);
          const bow =
            Math.min(70, distance * 0.1) * (hash % 2 === 0 ? 1 : -1);
          const mx = (a.x + b.x) / 2 - (dy / distance) * bow;
          const my = (a.y + b.y) / 2 + (dx / distance) * bow;
          const path = `M ${a.x} ${a.y} Q ${mx} ${my} ${b.x} ${b.y}`;
          return (
            <g key={l.id}>
              <path
                d={path}
                fill="none"
                stroke={stroke}
                strokeWidth={isActive ? width * 2.6 : width}
                strokeDasharray={dash}
                opacity={isDim ? 0.03 : isActive ? 1 : opacity}
                pointerEvents="none"
                style={{ transition: "opacity 0.18s, stroke-width 0.18s" }}
              />
              <path
                d={path}
                fill="none"
                stroke="transparent"
                strokeWidth={Math.min(40, Math.max(8, 18 / Math.max(scale, 0.25)))}
                style={{ pointerEvents: "stroke" }}
                onMouseEnter={() => setHoveredLinkId(l.id)}
                onMouseLeave={() =>
                  setHoveredLinkId((current) => (current === l.id ? null : current))
                }
              />
            </g>
          );
        })}

        {/* Nodes */}
        {papers.map((paper) => {
          const pos = paperPositions[paper.id];
          if (!pos) return null;
          const isNavigable = !!paper.publicationHref;
          const isHighlighted = highlightedId === paper.id;
          const isLinkEndpoint =
            hoveredLink != null &&
            (hoveredLink.sourceId === paper.id || hoveredLink.targetId === paper.id);
          const isHot = hovered === paper.id || isHighlighted || isLinkEndpoint;
          const isNear = connectedSet?.has(paper.id) && !isHot;
          const focusActive =
            hovered != null || hoveredLinkId != null || highlightedId != null;
          const isDim = focusActive && !isHot && !isNear;
          const r = nodeRadius(paper);
          const degree = degreeById[paper.id] || 0;
          const isHub = degree >= 6;
          const labelScale = Math.max(scale, 0.22);
          const labelInfo = labelLayout.get(paper.id);
          const rawLabel = String(paper.title || "");
          const truncatedLabel =
            rawLabel.length > 34 ? `${rawLabel.slice(0, 34)}…` : rawLabel;
          const fallbackWidth =
            Math.min(250, Math.max(36, truncatedLabel.length * 6.2)) / labelScale;
          const label =
            labelInfo ||
            (isHot || isNear
              ? {
                  x: pos.x,
                  y: pos.y + r + 12 / labelScale,
                  anchor: "middle",
                  text: truncatedLabel,
                  width: fallbackWidth,
                  height: 13 / labelScale,
                  leader: false,
                }
              : null);
          const showLabel = label != null;
          const labelBox = label
            ? {
                x:
                  label.anchor === "start"
                    ? label.x - pos.x
                    : label.anchor === "end"
                      ? label.x - pos.x - label.width
                      : label.x - pos.x - label.width / 2,
                y: label.y - pos.y - label.height / 2,
                width: label.width,
                height: label.height,
              }
            : null;
          let leader = null;
          if (label?.leader) {
            const lx = label.x - pos.x;
            const ly = label.y - pos.y;
            const distance = Math.hypot(lx, ly) || 1;
            const startX = (lx / distance) * (r + 2);
            const startY = (ly / distance) * (r + 2);
            const endX =
              label.anchor === "middle"
                ? lx
                : lx + (lx > 0 ? -label.width / 2 : label.width / 2);
            const endY =
              label.anchor === "middle"
                ? ly + (ly > 0 ? -label.height / 2 : label.height / 2)
                : ly;
            leader = { startX, startY, endX, endY };
          }

          return (
            <g
              key={paper.id}
              data-node="1"
              transform={`translate(${pos.x},${pos.y})`}
              style={{ cursor: isNavigable ? "pointer" : "default" }}
              role={isNavigable ? "link" : undefined}
              tabIndex={isNavigable ? 0 : undefined}
              aria-label={isNavigable ? `Open publication: ${paper.title}` : undefined}
              onMouseEnter={() => {
                setHovered(paper.id);
                setHoveredLinkId(null);
              }}
              onMouseLeave={() => setHovered(null)}
              onMouseDown={(e) => onNodeMouseDown(e, paper.id)}
              onMouseUp={(e) => onNodeMouseUp(e, paper)}
              onKeyDown={(e) => onNodeKeyDown(e, paper)}
            >
              {isHighlighted && (
                <g className="sonar-beacon">
                  {/* Expanding pulsing radar rings */}
                  <circle r={r + 14} fill="none" stroke="#f59e0b" strokeWidth="2.5" strokeDasharray="4 3">
                    <animate attributeName="r" values={`${r + 12};${r + 55}`} dur="1.8s" repeatCount="indefinite" />
                    <animate attributeName="opacity" values="1;0" dur="1.8s" repeatCount="indefinite" />
                  </circle>
                  <circle r={r + 8} fill="none" stroke="#fbbf24" strokeWidth="1.8">
                    <animate attributeName="r" values={`${r + 6};${r + 36}`} dur="1.8s" repeatCount="indefinite" />
                    <animate attributeName="opacity" values="0.9;0" dur="1.8s" repeatCount="indefinite" />
                  </circle>
                  {/* High-visibility Target Reticle Crosshairs */}
                  <line x1={-r - 22} y1={0} x2={-r - 8} y2={0} stroke="#fbbf24" strokeWidth="2" />
                  <line x1={r + 8} y1={0} x2={r + 22} y2={0} stroke="#fbbf24" strokeWidth="2" />
                  <line x1={0} y1={-r - 22} x2={0} y2={-r - 8} stroke="#fbbf24" strokeWidth="2" />
                  <line x1={0} y1={r + 8} x2={0} y2={r + 22} stroke="#fbbf24" strokeWidth="2" />
                  {/* Outer target bracket circle */}
                  <circle r={r + 16} fill="none" stroke="#f59e0b" strokeWidth="1.5" strokeDasharray="8 6" />
                </g>
              )}
              {(isHot || isNear) && (
                <circle
                  r={r * 3.5}
                  fill={isHot ? "url(#ng-hot)" : "url(#ng)"}
                  opacity={isDim ? 0 : isHot ? 0.9 : 0.55}
                />
              )}
              {(isHub || isHot || isNear) && (
                <circle
                  r={r + 7}
                  fill="none"
                  stroke={isHot ? "#ffe066" : isNear ? "#ff8c00" : "#2a5080"}
                  strokeWidth={isHot ? 1.5 : 1}
                  strokeDasharray={isHot ? "none" : "5 4"}
                  opacity={isDim ? 0.08 : isHot ? 1 : isNear ? 0.7 : isHub ? 0.45 : 0.3}
                  style={{ transition: "all 0.2s" }}
                />
              )}
              <circle
                r={r}
                fill={isHot ? "#152540" : isHub ? "#0e2340" : "#0a1a30"}
                stroke={isHot ? "#ffe066" : isNear ? "#ff8c00" : isHub ? "#2f6aa8" : "#1e4d80"}
                strokeWidth={isHot ? 2.5 : isHub ? 1.9 : 1.5}
                opacity={isDim ? 0.15 : 1}
                filter={isHot ? "url(#glow-hot)" : isNear ? "url(#glow)" : undefined}
                style={{ transition: "all 0.2s" }}
              />
              <circle
                r={Math.max(1.8, r * 0.28)}
                fill={isHot ? "#ffe066" : isNear ? "#ff8c00" : isHub ? "#4a97e0" : "#3b7fc4"}
                opacity={isDim ? 0.12 : isHot ? 0.95 : isNear ? 0.8 : isHub ? 0.65 : 0.4}
                style={{ transition: "all 0.2s", pointerEvents: "none" }}
              />
              {leader && (
                <line
                  x1={leader.startX}
                  y1={leader.startY}
                  x2={leader.endX}
                  y2={leader.endY}
                  stroke={isHot ? "rgba(255,224,102,0.55)" : "rgba(195,212,239,0.22)"}
                  strokeWidth={0.9 / labelScale}
                  strokeDasharray={`${3 / labelScale} ${3 / labelScale}`}
                  style={{ pointerEvents: "none" }}
                />
              )}
              {isHot && labelBox && (
                <rect
                  x={labelBox.x}
                  y={labelBox.y}
                  width={labelBox.width}
                  height={labelBox.height}
                  rx={3 / labelScale}
                  fill="rgba(3,7,15,0.86)"
                  stroke="rgba(255,180,0,0.22)"
                  style={{ pointerEvents: "none" }}
                />
              )}
              {showLabel && (
                <text
                  x={label.x - pos.x}
                  y={label.y - pos.y}
                  textAnchor={label.anchor}
                  dominantBaseline="middle"
                  fontSize={(isHot ? 11 : 10) / labelScale}
                  fontFamily="monospace"
                  fill={isDim ? "#ffffff12" : isHot ? "#fff3c4" : "#b3c6e2"}
                  style={{
                    paintOrder: "stroke fill",
                    stroke: "rgba(3,7,15,0.95)",
                    strokeWidth: (isHot ? 2.8 : 2.4) / labelScale,
                    strokeLinejoin: "round",
                    transition: "all 0.2s",
                    userSelect: "none",
                    pointerEvents: "none",
                  }}
                >
                  {label.text}
                </text>
              )}
            </g>
          );
        })}
      </svg>
      )}

      {/* Intel tooltip */}
      {tooltipData && (
        <IntelPanel
          paper={tooltipData.paper}
          links={hovLinks}
          paperById={paperById}
          macroTheme={macroTheme}
          sx={tooltipData.sx}
          sy={tooltipData.sy}
          scale={scale}
        />
      )}
    </div>
  );
}

// ── Intel panel ───────────────────────────────────────────────────────────────
function IntelPanel({ paper, links, paperById, macroTheme, sx, sy, scale }) {
  const panelW = 300;
  const panelH = 320; // Increased for cross-cluster section
  const containerW = typeof window !== "undefined" ? window.innerWidth : 1200;
  const containerH = typeof window !== "undefined" ? window.innerHeight : 800;

  const r = NODE_R * scale;
  let left = sx + r + 10;
  let top = sy - panelH / 2;
  if (left + panelW > containerW - 10) left = sx - r - panelW - 10;
  if (top < 10) top = 10;
  if (top + panelH > containerH - 10) top = containerH - panelH - 10;

  const strong = links.filter((l) => l.score >= 0.8).length;
  const moderate = links.filter((l) => l.score >= 0.65 && l.score < 0.8).length;
  const weak = links.filter((l) => l.score < 0.65).length;
  const cross = links.filter((l) => l.isCrossCluster).length;

  return (
    <div className="pointer-events-none absolute z-40 font-mono" style={{ left, top, width: panelW }}>
      <div className="flex items-center gap-1 mb-0.5 px-1">
        <div className="h-px flex-1 bg-amber-500/40" />
        <span className="text-amber-500/50 text-[8px] tracking-[0.3em]">INTEL</span>
        <div className="h-px flex-1 bg-amber-500/40" />
      </div>
      <div style={{
        background: "rgba(3,7,15,0.96)",
        border: "1px solid rgba(255,180,0,0.35)",
        boxShadow: "0 0 24px rgba(255,140,0,0.18), inset 0 0 18px rgba(255,140,0,0.04)",
        padding: "14px 16px",
      }}>
        <div className="text-amber-100 text-[11px] font-bold leading-snug mb-2" style={{ paintOrder: "stroke fill", stroke: "rgba(3,7,15,0.95)", strokeWidth: 1.4, strokeLinejoin: "round" }}>{paper.title}</div>
        <div className="flex gap-4 text-[10px] text-amber-200/70 tracking-wider mb-2">
          {paper.year && <span>◈ {paper.year}</span>}
          {paper.cited_by != null && <span>⬡ {paper.cited_by} citations</span>}
          <span>⇌ {links.length} links</span>
        </div>
        {macroTheme && (
          <div className="text-[9px] text-amber-300/65 mb-2 border border-amber-500/20 px-1.5 py-0.5 inline-block tracking-[0.12em]">
            ✦ {macroTheme}
          </div>
        )}
        {paper.graphMesoPrimary?.name && (
          <div className="text-[9px] text-amber-300/60 mb-2 border border-amber-500/20 px-1.5 py-0.5 inline-block">
            ◇ {paper.graphMesoPrimary.name}
          </div>
        )}
        {paper.graphMacroPrimary?.name && paper.graphMacroPrimary.name !== macroTheme && (
          <div className="text-[9px] text-amber-300/45 mb-2 border border-amber-500/15 px-1.5 py-0.5 inline-block">
            ✦ {paper.graphMacroPrimary.name}
          </div>
        )}
        {paper.topics?.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-2">
            {paper.topics.map((t, idx) => (
              <span key={`${t}-${idx}`} className="text-amber-200/80 border border-amber-500/30 px-1.5 py-0.5"
                style={{ fontSize: 8, letterSpacing: "0.06em" }}>
                {t}
              </span>
            ))}
          </div>
        )}
        {paper.abstract && (
          <div className="text-slate-100/85 leading-relaxed border-t border-amber-500/20 pt-2 mt-1"
            style={{ fontSize: 9 }}>
            {paper.abstract.slice(0, 220)}…
          </div>
        )}
        {links.length > 0 && (
          <div className="flex gap-3 mt-2 pt-2 border-t border-amber-500/15" style={{ fontSize: 9 }}>
            {strong > 0 && <span style={{ color: "#ffe88a" }}>◆ {strong} strong</span>}
            {moderate > 0 && <span style={{ color: "#ff9d2f" }}>◆ {moderate} moderate</span>}
            {weak > 0 && <span style={{ color: "#6f8eff" }}>◆ {weak} weak</span>}
            {cross > 0 && <span style={{ color: "#ffb74d" }}>◆ {cross} cross-macro</span>}
          </div>
        )}
        {/* Cross-cluster connections section */}
        {cross > 0 && (() => {
          const crossLinks = links
            .filter((l) => l.isCrossCluster)
            .map((l) => {
              const otherId = l.sourceId === paper.id ? l.targetId : l.sourceId;
              const otherPaper = paperById[otherId];
              return otherPaper ? { paper: otherPaper, score: l.score } : null;
            })
            .filter(Boolean)
            .sort((a, b) => b.score - a.score)
            .slice(0, 4);
          
          if (crossLinks.length === 0) return null;
          
          return (
            <div className="mt-2 pt-2 border-t border-orange-500/20">
              <div className="text-[8px] text-orange-300/75 tracking-wider mb-1.5">
                ⟡ RELATED IN OTHER MACROS
              </div>
              <div className="space-y-1">
                {crossLinks.map(({ paper: p, score }, idx) => (
                  <div key={`${p.id ?? "paper"}-${score}-${idx}`} className="flex items-start gap-1.5">
                    <span className="text-orange-300/55 text-[7px] shrink-0 mt-0.5">
                      {(score * 100).toFixed(0)}%
                    </span>
                    <div className="min-w-0">
                      <div className="text-orange-100/85 text-[8px] leading-tight truncate">
                        {p.title}
                      </div>
                      {(p.graphMacroPrimary?.name || p.graphMesoPrimary?.name) && (
                        <div className="text-orange-200/50 text-[7px] truncate">
                          in {p.graphMacroPrimary?.name || p.graphMesoPrimary?.name}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })()}
      </div>
      <div className="flex items-center gap-1 mt-0.5 px-1">
        <div className="h-px flex-1 bg-amber-400/22" />
        <span className="text-amber-200/30 text-[7px] tracking-[0.3em]">
          {paper.openAlexId?.split("/").at(-1) ?? ""}
        </span>
        <div className="h-px flex-1 bg-amber-400/22" />
      </div>
    </div>
  );
}
