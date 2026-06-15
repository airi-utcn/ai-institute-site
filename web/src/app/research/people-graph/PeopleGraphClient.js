"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import PersonDetailPanel from "./PersonDetailPanel";

// Canvas renderer touches `window`, so it must not be server-rendered.
const ForceGraph2D = dynamic(() => import("react-force-graph-2d"), { ssr: false });

const BG_COLOR = "#0b0f17";

const getId = (v) => (v && typeof v === "object" ? v.id : v);
const uniq = (arr) => Array.from(new Set(arr));

function hexToRgba(hex, alpha = 1) {
  let h = hex.replace("#", "");
  if (h.length === 3) h = h.split("").map((c) => c + c).join("");
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

const escapeHtml = (s) =>
  String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

const nodeRadius = (node) => 3 + Math.sqrt(node.degree || 0) * 1.6;

export default function PeopleGraphClient({ nodes, links, departmentColors }) {
  const fgRef = useRef(null);
  const containerRef = useRef(null);
  const didFitRef = useRef(false);

  const [size, setSize] = useState({ width: 0, height: 0 });
  const [hoverId, setHoverId] = useState(null);
  const [hoverLink, setHoverLink] = useState(null);
  const [selectedId, setSelectedId] = useState(null);
  const [selection, setSelection] = useState(null); // {type:'department'|'project', label, memberIds:Set}
  const [query, setQuery] = useState("");
  const [searchFocused, setSearchFocused] = useState(false);
  const [showLegend, setShowLegend] = useState(false);

  const graphData = useMemo(() => ({ nodes, links }), [nodes, links]);

  const nodeById = useMemo(() => {
    const m = new Map();
    nodes.forEach((n) => m.set(n.id, n));
    return m;
  }, [nodes]);

  const neighborIds = useMemo(() => {
    const m = new Map();
    const add = (a, b) => {
      if (!m.has(a)) m.set(a, new Set());
      m.get(a).add(b);
    };
    links.forEach((l) => {
      const s = getId(l.source);
      const t = getId(l.target);
      add(s, t);
      add(t, s);
    });
    return m;
  }, [links]);

  const maxPub = useMemo(
    () => nodes.reduce((mx, n) => Math.max(mx, n.publicationCount || 0), 0),
    [nodes]
  );
  const maxCitations = useMemo(
    () => nodes.reduce((mx, n) => Math.max(mx, n.citationCount || 0), 0),
    [nodes]
  );

  const departmentsIndex = useMemo(() => {
    const m = new Map();
    nodes.forEach((n) => {
      if (!n.departmentName) return;
      if (!m.has(n.departmentName)) {
        m.set(n.departmentName, { name: n.departmentName, color: n.color, memberIds: new Set() });
      }
      m.get(n.departmentName).memberIds.add(n.id);
    });
    return m;
  }, [nodes]);

  const projectsIndex = useMemo(() => {
    const m = new Map();
    nodes.forEach((n) => {
      (n.projects || []).forEach((p) => {
        if (!m.has(p.id)) m.set(p.id, { id: p.id, title: p.title, memberIds: new Set() });
        m.get(p.id).memberIds.add(n.id);
      });
    });
    return m;
  }, [nodes]);

  const departmentList = useMemo(
    () => Object.entries(departmentColors).sort((a, b) => a[0].localeCompare(b[0])),
    [departmentColors]
  );

  const borderAlpha = (node) => {
    const pub = node.publicationCount || 0;
    if (pub <= 0 || maxPub <= 0) return 0;
    return 0.25 + 0.75 * (pub / maxPub);
  };

  // What is currently emphasized. Precedence: link hover > node hover > search
  // selection (dept/project) > clicked person.
  const highlight = useMemo(() => {
    if (hoverLink) {
      const s = getId(hoverLink.source);
      const t = getId(hoverLink.target);
      return { nodes: new Set([s, t]), isLink: (l) => l === hoverLink };
    }
    if (hoverId == null && selection) {
      const set = selection.memberIds;
      return { nodes: set, isLink: (l) => set.has(getId(l.source)) && set.has(getId(l.target)) };
    }
    const focusId = hoverId ?? selectedId;
    if (focusId != null) {
      const set = new Set([focusId]);
      (neighborIds.get(focusId) || []).forEach((n) => set.add(n));
      return { nodes: set, isLink: (l) => getId(l.source) === focusId || getId(l.target) === focusId };
    }
    return null;
  }, [hoverLink, hoverId, selection, selectedId, neighborIds]);

  // Size tracking.
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      const rect = entries[0].contentRect;
      setSize({ width: rect.width, height: rect.height });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Force tuning: cap repulsion range so isolated nodes drift in close to the
  // clusters instead of being flung to the edges; pull connected pairs tighter.
  useEffect(() => {
    const fg = fgRef.current;
    if (!fg || !size.width) return;
    const charge = fg.d3Force("charge");
    if (charge) {
      charge.strength(-26);
      charge.distanceMax(170);
    }
    const link = fg.d3Force("link");
    if (link) link.distance((l) => 26 / (1 + (l.weight || 1)));
    fg.d3ReheatSimulation?.();
  }, [size.width, graphData]);

  const focusNode = (node) => {
    if (!node) return;
    setSelection(null);
    setSelectedId(node.id);
    setQuery("");
    setSearchFocused(false);
    const fg = fgRef.current;
    if (fg && typeof node.x === "number") {
      fg.centerAt(node.x, node.y, 800);
      fg.zoom(3.2, 800);
    }
  };

  const applyGroupSelection = (sel) => {
    setSelectedId(null);
    setSelection(sel);
    setQuery("");
    setSearchFocused(false);
    const fg = fgRef.current;
    if (fg && sel.memberIds.size) {
      fg.zoomToFit(700, 70, (n) => sel.memberIds.has(n.id));
    }
  };

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return { people: [], departments: [], projects: [] };
    return {
      people: nodes.filter((n) => n.name.toLowerCase().includes(q)).slice(0, 6),
      departments: Array.from(departmentsIndex.values())
        .filter((d) => d.name.toLowerCase().includes(q))
        .slice(0, 4),
      projects: Array.from(projectsIndex.values())
        .filter((p) => (p.title || "").toLowerCase().includes(q))
        .slice(0, 5),
    };
  }, [query, nodes, departmentsIndex, projectsIndex]);

  const hasMatches =
    matches.people.length || matches.departments.length || matches.projects.length;

  const selectedNode = selectedId != null ? nodeById.get(selectedId) : null;
  const selectedNeighbors = useMemo(() => {
    if (selectedId == null) return [];
    return Array.from(neighborIds.get(selectedId) || [])
      .map((id) => nodeById.get(id))
      .filter(Boolean)
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [selectedId, neighborIds, nodeById]);

  const drawNode = (node, ctx, globalScale) => {
    // Before the first simulation tick, nodes have no x/y yet. createRadialGradient
    // throws on non-finite args, so bail until positions exist.
    if (!Number.isFinite(node.x) || !Number.isFinite(node.y)) return;
    const r = nodeRadius(node);
    const dim = highlight != null && !highlight.nodes.has(node.id);

    // Citation glow (impact halo) — independent of connectivity.
    const cit = node.citationCount || 0;
    if (!dim && cit > 0 && maxCitations > 0) {
      const glowR = r + 2 + (Math.sqrt(cit) / Math.sqrt(maxCitations)) * 16;
      const grad = ctx.createRadialGradient(node.x, node.y, r * 0.6, node.x, node.y, glowR);
      grad.addColorStop(0, hexToRgba(node.color, 0.4));
      grad.addColorStop(1, hexToRgba(node.color, 0));
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(node.x, node.y, glowR, 0, 2 * Math.PI);
      ctx.fill();
    }

    ctx.beginPath();
    ctx.arc(node.x, node.y, r, 0, 2 * Math.PI);
    ctx.fillStyle = hexToRgba(node.color, dim ? 0.1 : 1);
    ctx.fill();

    const ba = borderAlpha(node) * (dim ? 0.1 : 1);
    if (ba > 0) {
      ctx.lineWidth = 2 / globalScale;
      ctx.strokeStyle = hexToRgba("#ffffff", ba);
      ctx.stroke();
    }

    if (node.id === selectedId) {
      ctx.beginPath();
      ctx.arc(node.x, node.y, r + 3 / globalScale, 0, 2 * Math.PI);
      ctx.lineWidth = 2.5 / globalScale;
      ctx.strokeStyle = hexToRgba("#ffffff", 0.9);
      ctx.stroke();
    }

    if (!dim && globalScale >= 1.6) {
      const fs = 11 / globalScale;
      ctx.font = `${fs}px ui-sans-serif, system-ui, sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "top";
      ctx.fillStyle = hexToRgba("#ffffff", 0.92);
      ctx.fillText(node.name, node.x, node.y + r + 1 / globalScale);

      if (globalScale >= 3 && (node.title || node.departmentName)) {
        const fs2 = 8 / globalScale;
        ctx.font = `${fs2}px ui-sans-serif, system-ui, sans-serif`;
        ctx.fillStyle = hexToRgba("#ffffff", 0.5);
        ctx.fillText(node.title || node.departmentName, node.x, node.y + r + fs + 2 / globalScale);
      }
    }
  };

  const paintPointerArea = (node, color, ctx) => {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(node.x, node.y, nodeRadius(node) + 2, 0, 2 * Math.PI);
    ctx.fill();
  };

  const linkColor = (link) => {
    if (!highlight) return hexToRgba("#9db4d6", 0.28);
    return highlight.isLink(link) ? hexToRgba("#ffd43b", 0.9) : hexToRgba("#9db4d6", 0.07);
  };

  const linkWidth = (link) => {
    const base = Math.min(0.8 + (link.weight || 1) * 0.4, 4);
    if (!highlight) return base;
    return highlight.isLink(link) ? base + 0.6 : base * 0.4;
  };

  const linkLabel = (link) => {
    const a = nodeById.get(getId(link.source))?.name || "?";
    const b = nodeById.get(getId(link.target))?.name || "?";
    const parts = [];
    if (link.sharedProjects > 0) {
      const titles = uniq(link.sharedProjectTitles).filter(Boolean);
      parts.push(
        `${link.sharedProjects} shared project${link.sharedProjects > 1 ? "s" : ""}` +
          (titles.length ? `: ${titles.join(", ")}` : "")
      );
    }
    if (link.sharedPublications > 0) {
      const titles = uniq(link.sharedPublicationTitles).filter(Boolean).slice(0, 3);
      const more = uniq(link.sharedPublicationTitles).length - titles.length;
      parts.push(
        `${link.sharedPublications} shared publication${link.sharedPublications > 1 ? "s" : ""}` +
          (titles.length ? `: ${titles.join(", ")}${more > 0 ? ` +${more} more` : ""}` : "")
      );
    }
    return `<div style="max-width:280px;padding:6px 8px;border-radius:6px;background:#0e1320;color:#fff;font-size:12px;line-height:1.4;border:1px solid rgba(255,255,255,0.15)">
      <div style="font-weight:600;margin-bottom:2px">${escapeHtml(a)} &harr; ${escapeHtml(b)}</div>
      <div style="color:rgba(255,255,255,0.7)">${escapeHtml(parts.join(" · "))}</div>
    </div>`;
  };

  return (
    <main className="relative h-screen w-screen overflow-hidden" style={{ background: BG_COLOR }}>
      {/* Title + hint */}
      <div className="pointer-events-none absolute left-5 top-4 z-10 text-white">
        <h1 className="text-lg font-semibold">AIRI People Graph</h1>
        <p className="text-xs text-white/50">
          {nodes.length} people · {links.length} collaborations · size = connections, glow = citations, ring = publications
        </p>
      </div>

      {/* Search (people + departments + projects) */}
      <div className="absolute right-5 top-4 z-20 w-80">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setSearchFocused(true)}
          onBlur={() => setTimeout(() => setSearchFocused(false), 150)}
          placeholder="Search person, department or project…"
          className="w-full rounded-md border border-white/15 bg-[#0e1320]/90 px-3 py-2 text-sm text-white placeholder-white/40 outline-none focus:border-white/40"
        />
        {searchFocused && hasMatches > 0 && (
          <div className="mt-1 max-h-80 overflow-y-auto rounded-md border border-white/10 bg-[#0e1320]/95 py-1 shadow-xl">
            {matches.people.length > 0 && (
              <SearchGroup label="People">
                {matches.people.map((n) => (
                  <SearchRow key={`p${n.id}`} color={n.color} label={n.name} hint={n.departmentName} onSelect={() => focusNode(n)} />
                ))}
              </SearchGroup>
            )}
            {matches.departments.length > 0 && (
              <SearchGroup label="Departments">
                {matches.departments.map((d) => (
                  <SearchRow
                    key={`d${d.name}`}
                    color={d.color}
                    label={d.name}
                    hint={`${d.memberIds.size} people`}
                    onSelect={() => applyGroupSelection({ type: "department", label: d.name, memberIds: d.memberIds })}
                  />
                ))}
              </SearchGroup>
            )}
            {matches.projects.length > 0 && (
              <SearchGroup label="Projects">
                {matches.projects.map((p) => (
                  <SearchRow
                    key={`pr${p.id}`}
                    color="#ffd43b"
                    label={p.title}
                    hint={`${p.memberIds.size} people`}
                    onSelect={() => applyGroupSelection({ type: "project", label: p.title, memberIds: p.memberIds })}
                  />
                ))}
              </SearchGroup>
            )}
          </div>
        )}
      </div>

      {/* Active group-selection banner */}
      {selection && (
        <div className="absolute left-1/2 top-4 z-10 -translate-x-1/2 rounded-full border border-white/15 bg-[#0e1320]/90 px-4 py-1.5 text-xs text-white/80">
          <span className="text-white/40">{selection.type === "project" ? "Project" : "Department"}:</span>{" "}
          <span className="font-medium">{selection.label}</span>{" "}
          <span className="text-white/40">({selection.memberIds.size})</span>
          <button onClick={() => setSelection(null)} className="ml-3 text-white/50 hover:text-white" aria-label="Clear">
            ✕
          </button>
        </div>
      )}

      {/* Legend */}
      <div className="absolute bottom-4 left-5 z-10">
        <button
          onClick={() => setShowLegend((s) => !s)}
          className="rounded-md border border-white/15 bg-[#0e1320]/90 px-3 py-1.5 text-xs text-white/70 hover:text-white"
        >
          {showLegend ? "Hide" : "Show"} departments
        </button>
        {showLegend && (
          <div className="mt-2 max-h-64 w-64 overflow-y-auto rounded-md border border-white/10 bg-[#0e1320]/95 p-3">
            <ul className="space-y-1">
              {departmentList.map(([name, color]) => {
                const dept = departmentsIndex.get(name);
                return (
                  <li key={name}>
                    <button
                      onClick={() =>
                        dept && applyGroupSelection({ type: "department", label: name, memberIds: dept.memberIds })
                      }
                      className="flex w-full items-center gap-2 rounded px-1 py-0.5 text-left text-xs text-white/70 hover:bg-white/10"
                    >
                      <span className="inline-block h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: color }} />
                      <span className="truncate">{name}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </div>

      <div ref={containerRef} className="absolute inset-0">
        {size.width > 0 && (
          <ForceGraph2D
            ref={fgRef}
            width={size.width}
            height={size.height}
            graphData={graphData}
            backgroundColor={BG_COLOR}
            nodeLabel={(n) => n.name}
            nodeCanvasObject={drawNode}
            nodePointerAreaPaint={paintPointerArea}
            linkColor={linkColor}
            linkWidth={linkWidth}
            linkLabel={linkLabel}
            onNodeHover={(n) => setHoverId(n ? n.id : null)}
            onLinkHover={(l) => setHoverLink(l || null)}
            onNodeClick={(n) => focusNode(n)}
            onBackgroundClick={() => {
              setSelectedId(null);
              setSelection(null);
            }}
            cooldownTicks={120}
            onEngineStop={() => {
              if (!didFitRef.current) {
                didFitRef.current = true;
                fgRef.current?.zoomToFit(500, 50);
              }
            }}
          />
        )}
      </div>

      {selectedNode && (
        <PersonDetailPanel
          node={selectedNode}
          neighbors={selectedNeighbors}
          onClose={() => setSelectedId(null)}
          onSelectNeighbor={(n) => focusNode(n)}
        />
      )}
    </main>
  );
}

function SearchGroup({ label, children }) {
  return (
    <div className="py-0.5">
      <div className="px-3 py-1 text-[10px] font-semibold uppercase tracking-wide text-white/35">{label}</div>
      {children}
    </div>
  );
}

function SearchRow({ color, label, hint, onSelect }) {
  return (
    <button
      onMouseDown={onSelect}
      className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm text-white/80 hover:bg-white/10"
    >
      <span className="inline-block h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: color }} />
      <span className="truncate">{label}</span>
      {hint && <span className="ml-auto shrink-0 truncate pl-2 text-xs text-white/35">{hint}</span>}
    </button>
  );
}
