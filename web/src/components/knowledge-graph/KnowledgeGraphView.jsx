"use client";

import { useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import {
  FaBook,
  FaCompress,
  FaExpandArrowsAlt,
  FaFilter,
  FaFlask,
  FaInfoCircle,
  FaLayerGroup,
  FaProjectDiagram,
  FaSearch,
  FaTimes,
  FaUser,
} from "react-icons/fa";

const ForceGraph2D = dynamic(() => import("react-force-graph-2d"), {
  ssr: false,
});

const BG_COLOR = "#070b14";

const NODE_META = {
  person: { label: "People", singular: "Person", color: "#4ecdc4", icon: FaUser },
  publication: { label: "Publications", singular: "Publication", color: "#74c0fc", icon: FaBook },
  laboratory: { label: "Laboratories", singular: "Laboratory", color: "#ffd43b", icon: FaFlask },
  project: { label: "Projects", singular: "Project", color: "#69db7c", icon: FaProjectDiagram },
  team: { label: "Teams", singular: "Team", color: "#38d9a9", icon: FaProjectDiagram },
  department: { label: "Departments", singular: "Department", color: "#b197fc", icon: FaProjectDiagram },
  topic: { label: "Topics", singular: "Topic", color: "#f783ac", icon: FaLayerGroup },
};

const EDGE_META = {
  authored: { label: "Authored", color: "#74c0fc", priority: 0 },
  labPublication: { label: "Lab publication", color: "#ffd43b", priority: 1 },
  memberOf: { label: "Member of", color: "#ffd43b", priority: 2 },
  taggedWith: { label: "Topic", color: "#f783ac", priority: 3 },
  contributesTo: { label: "Contributes to", color: "#69db7c", priority: 4 },
  teamMember: { label: "Team member", color: "#38d9a9", priority: 4 },
  projectTeam: { label: "Team project", color: "#38d9a9", priority: 4 },
  belongsTo: { label: "Belongs to", color: "#ffd43b", priority: 3 },
  inDepartment: { label: "Department", color: "#b197fc", priority: 5 },
  similarTo: { label: "Similar paper", color: "#c084fc", priority: 9 },
};

const TYPE_ORDER = ["person", "publication", "laboratory", "project", "team", "department", "topic"];

const isAllTypes = (types) =>
  types?.length === TYPE_ORDER.length &&
  TYPE_ORDER.every((type) => types.includes(type));

const getId = (value) =>
  value && typeof value === "object" ? value.id : value;

const hexToRgba = (hex, alpha = 1) => {
  const raw = String(hex || "").replace("#", "");
  const normalized =
    raw.length === 3
      ? raw
          .split("")
          .map((character) => character + character)
          .join("")
      : raw.padEnd(6, "0").slice(0, 6);
  const r = parseInt(normalized.slice(0, 2), 16) || 0;
  const g = parseInt(normalized.slice(2, 4), 16) || 0;
  const b = parseInt(normalized.slice(4, 6), 16) || 0;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

const escapeHtml = (value) =>
  String(value).replace(
    /[&<>"]/g,
    (character) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[character],
  );

const nodeRadius = (node) => {
  const degree = node.metrics?.degree || 0;
  const base = {
    person: 3.8,
    publication: 2.9,
    laboratory: 8,
    project: 5,
    team: 4.2,
    department: 6,
    topic: 4,
  }[node.type] || 4;

  const citationBoost =
    node.type === "publication"
      ? Math.min(4.2, Math.log1p(node.meta?.citedBy || 0) * 0.7)
      : 0;

  return base + Math.sqrt(degree) * 0.7 + citationBoost;
};

const emptyFacets = {
  types: [],
  years: [],
  labs: [],
  departments: [],
  topics: [],
};

const selectValue = (value) => (value === null || value === undefined ? "" : String(value));

function buildRequestParams(state) {
  const params = new URLSearchParams();
  if (state.q) params.set("q", state.q);
  if (state.scope) params.set("scope", state.scope);
  if (state.types?.length && !isAllTypes(state.types)) {
    params.set("types", state.types.join(","));
  }
  if (state.yearMin !== "" && state.yearMin != null) params.set("yearMin", state.yearMin);
  if (state.yearMax !== "" && state.yearMax != null) params.set("yearMax", state.yearMax);
  if (state.lab) params.set("lab", state.lab);
  if (state.department) params.set("department", state.department);
  if (state.project) params.set("project", state.project);
  if (state.topic) params.set("topic", state.topic);
  if (state.includeSimilarity) params.set("similarity", "1");
  else if (state.includeSimilarity === false) params.set("similarity", "0");
  if (state.includeCoauthors) params.set("coauthors", "1");
  else if (state.includeCoauthors === false) params.set("coauthors", "0");
  if (state.limit) params.set("limit", String(state.limit));
  return params;
}

function initialList(value) {
  if (Array.isArray(value)) return value;
  if (typeof value === "string" && value) return value.split(",").filter(Boolean);
  return [];
}

function initialTypes(value) {
  const list = initialList(value).filter((type) => TYPE_ORDER.includes(type));
  return list.length
    ? TYPE_ORDER.filter((type) => list.includes(type))
    : [...TYPE_ORDER];
}

export default function KnowledgeGraphView({
  initialData = null,
  initialQuery = null,
  fixedScope = null,
  compact = false,
  syncUrl = true,
  title = "Knowledge Graph",
  subtitle = "Explore AIRi people, publications, laboratories, and topics. Everything is connected through authorship, membership, and research similarity.",
}) {
  const queryDefaults = initialQuery || initialData?.query || {};
  const defaultScope = fixedScope || queryDefaults.scope || "global";
  const defaultLabScope = defaultScope.startsWith("laboratory:");
  const defaultSimilarity =
    queryDefaults.includeSimilarity !== undefined
      ? queryDefaults.includeSimilarity
      : defaultLabScope
        ? false
        : true;
  const defaultCoauthors =
    queryDefaults.includeCoauthors !== undefined
      ? queryDefaults.includeCoauthors
      : defaultLabScope
        ? false
        : true;

  const [query, setQuery] = useState(queryDefaults.q || "");
  const deferredQuery = useDeferredValue(query);
  const [scope, setScope] = useState(defaultScope);
  const [types, setTypes] = useState(() => initialTypes(queryDefaults.types));
  const [yearMin, setYearMin] = useState(selectValue(queryDefaults.yearMin));
  const [yearMax, setYearMax] = useState(selectValue(queryDefaults.yearMax));
  const [lab, setLab] = useState(queryDefaults.lab || "");
  const [department, setDepartment] = useState(queryDefaults.department || "");
  const [project, setProject] = useState(queryDefaults.project || "");
  const [topic, setTopic] = useState(queryDefaults.topic || "");
  const [includeSimilarity, setIncludeSimilarity] = useState(defaultSimilarity);
  const [includeCoauthors, setIncludeCoauthors] = useState(defaultCoauthors);

  const [data, setData] = useState(initialData || null);
  const [loading, setLoading] = useState(!initialData);
  const [error, setError] = useState("");
  const [selectedId, setSelectedId] = useState(null);
  const [hoverId, setHoverId] = useState(null);
  const [hoverLink, setHoverLink] = useState(null);
  const [showFilters, setShowFilters] = useState(!compact);
  const [showLegend, setShowLegend] = useState(false);
  const [size, setSize] = useState({ width: 0, height: 0 });

  const fgRef = useRef(null);
  const containerRef = useRef(null);
  const didMountRef = useRef(false);
  const didFitRef = useRef(false);

  const requestState = useMemo(
    () => ({
      q: deferredQuery.trim(),
      scope: fixedScope || scope,
      types,
      yearMin,
      yearMax,
      lab,
      department,
      project,
      topic,
      includeSimilarity,
      includeCoauthors,
      limit: compact ? 180 : 280,
    }),
    [
      deferredQuery,
      fixedScope,
      scope,
      types,
      yearMin,
      yearMax,
      lab,
      department,
      project,
      topic,
      includeSimilarity,
      includeCoauthors,
      compact,
    ],
  );

  const requestKey = useMemo(
    () => buildRequestParams(requestState).toString(),
    [requestState],
  );

  // Fetch only after mount, and skip the first request when the page already
  // server-rendered the initial result.
  useEffect(() => {
    if (!didMountRef.current) {
      didMountRef.current = true;
      if (initialData) return;
    }

    const controller = new AbortController();
    setLoading(true);
    setError("");

    fetch(`/api/knowledge-graph?${requestKey}`, {
      signal: controller.signal,
      cache: "no-store",
    })
      .then(async (response) => {
        if (!response.ok) {
          const body = await response.json().catch(() => ({}));
          throw new Error(body?.error || `Request failed (${response.status})`);
        }
        return response.json();
      })
      .then((nextData) => {
        setData(nextData);
        setSelectedId((current) => {
          if (!current) return current;
          return nextData.nodes.some((node) => node.id === current)
            ? current
            : null;
        });
        didFitRef.current = false;
      })
      .catch((fetchError) => {
        if (fetchError.name === "AbortError") return;
        setError(fetchError.message || "Failed to load the knowledge graph.");
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();
  }, [requestKey, initialData]);

  // Keep the URL shareable without forcing a server round-trip on every key
  // press. Lab tabs opt out so they do not fight the page's own tab state.
  useEffect(() => {
    if (!syncUrl || typeof window === "undefined") return;
    const params = buildRequestParams({
      ...requestState,
      q: deferredQuery.trim(),
    });
    params.delete("limit");
    const queryString = params.toString();
    const nextUrl = `${window.location.pathname}${queryString ? `?${queryString}` : ""}`;
    window.history.replaceState(null, "", nextUrl);
  }, [deferredQuery, requestState, syncUrl]);

  // Size tracking for the canvas.
  useEffect(() => {
    const element = containerRef.current;
    if (!element) return;
    const observer = new ResizeObserver((entries) => {
      const rect = entries[0].contentRect;
      setSize({ width: rect.width, height: rect.height });
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    setHoverId(null);
    setHoverLink(null);
  }, [data]);

  const nodes = data?.nodes || [];
  const edges = data?.edges || [];
  const facets = data?.facets || emptyFacets;

  const nodeById = useMemo(() => {
    const map = new Map();
    nodes.forEach((node) => map.set(node.id, node));
    return map;
  }, [nodes]);

  const neighborIds = useMemo(() => {
    const map = new Map();
    edges.forEach((edge) => {
      const source = getId(edge.source);
      const target = getId(edge.target);
      if (!map.has(source)) map.set(source, new Set());
      if (!map.has(target)) map.set(target, new Set());
      map.get(source).add(target);
      map.get(target).add(source);
    });
    return map;
  }, [edges]);

  const edgesByNode = useMemo(() => {
    const map = new Map();
    edges.forEach((edge) => {
      const source = getId(edge.source);
      const target = getId(edge.target);
      if (!map.has(source)) map.set(source, []);
      if (!map.has(target)) map.set(target, []);
      map.get(source).push(edge);
      map.get(target).push(edge);
    });
    return map;
  }, [edges]);

  const matchIds = useMemo(
    () => new Set((data?.matches || []).map((match) => match.nodeId)),
    [data],
  );

  const selectedNode = selectedId ? nodeById.get(selectedId) : null;

  const selectedNeighbors = useMemo(() => {
    if (!selectedId) return [];
    return Array.from(neighborIds.get(selectedId) || [])
      .map((id) => nodeById.get(id))
      .filter(Boolean)
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [selectedId, neighborIds, nodeById]);

  const highlight = useMemo(() => {
    if (hoverLink) {
      const source = getId(hoverLink.source);
      const target = getId(hoverLink.target);
      return {
        nodes: new Set([source, target]),
        edges: new Set([hoverLink.id]),
      };
    }

    const focusId = hoverId ?? selectedId;
    if (focusId) {
      return {
        nodes: new Set([focusId, ...(neighborIds.get(focusId) || [])]),
        edges: new Set((edgesByNode.get(focusId) || []).map((edge) => edge.id)),
      };
    }

    return null;
  }, [hoverLink, hoverId, selectedId, neighborIds, edgesByNode]);

  const graphData = useMemo(() => ({ nodes, links: edges }), [nodes, edges]);

  const drawNode = (node, context, globalScale) => {
    if (!Number.isFinite(node.x) || !Number.isFinite(node.y)) return;

    const meta = NODE_META[node.type] || NODE_META.publication;
    const radius = nodeRadius(node);
    const dim = highlight != null && !highlight.nodes.has(node.id);
    const isSelected = node.id === selectedId;
    const isHovered = node.id === hoverId;
    const isMatch = matchIds.has(node.id);

    if (!dim && (isSelected || isHovered)) {
      const gradient = context.createRadialGradient(
        node.x,
        node.y,
        radius * 0.5,
        node.x,
        node.y,
        radius * 3,
      );
      gradient.addColorStop(0, hexToRgba(meta.color, 0.36));
      gradient.addColorStop(1, hexToRgba(meta.color, 0));
      context.fillStyle = gradient;
      context.beginPath();
      context.arc(node.x, node.y, radius * 3, 0, 2 * Math.PI);
      context.fill();
    }

    context.beginPath();
    context.arc(node.x, node.y, radius, 0, 2 * Math.PI);
    context.fillStyle = hexToRgba(meta.color, dim ? 0.12 : 0.92);
    context.fill();

    if (isMatch && !dim) {
      context.lineWidth = 1.8 / globalScale;
      context.strokeStyle = hexToRgba("#ffffff", 0.9);
      context.stroke();
    } else if (node.type === "laboratory" || node.type === "department") {
      context.lineWidth = 1.4 / globalScale;
      context.strokeStyle = hexToRgba("#ffffff", dim ? 0.1 : 0.5);
      context.stroke();
    }

    if (isSelected || isHovered) {
      context.beginPath();
      context.arc(node.x, node.y, radius + 3 / globalScale, 0, 2 * Math.PI);
      context.lineWidth = 2 / globalScale;
      context.strokeStyle = hexToRgba("#ffffff", 0.85);
      context.stroke();
    }

    const shouldLabel =
      !dim &&
      (isSelected ||
        isHovered ||
        node.type === "laboratory" ||
        node.type === "department" ||
        globalScale >= 2.1 ||
        (node.metrics?.degree || 0) >= 12);

    if (shouldLabel) {
      const fontSize = Math.max(9, 11 / Math.max(globalScale, 0.9));
      const label =
        node.label.length > 46 ? `${node.label.slice(0, 43)}...` : node.label;
      context.font = `${fontSize}px ui-sans-serif, system-ui, sans-serif`;
      context.textAlign = "center";
      context.textBaseline = "top";
      context.lineWidth = 4 / globalScale;
      context.lineJoin = "round";
      context.strokeStyle = "rgba(3,7,15,0.92)";
      context.strokeText(label, node.x, node.y + radius + 2 / globalScale);
      context.fillStyle = dim ? "rgba(255,255,255,0.18)" : "rgba(255,255,255,0.92)";
      context.fillText(label, node.x, node.y + radius + 2 / globalScale);
    }
  };

  const paintPointerArea = (node, color, context) => {
    context.fillStyle = color;
    context.beginPath();
    context.arc(node.x, node.y, nodeRadius(node) + 3, 0, 2 * Math.PI);
    context.fill();
  };

  const linkColor = (edge) => {
    const meta = EDGE_META[edge.type] || EDGE_META.authored;
    if (!highlight) return hexToRgba(meta.color, edge.type === "similarTo" ? 0.16 : 0.25);
    return highlight.edges.has(edge.id)
      ? hexToRgba(meta.color, 0.85)
      : hexToRgba(meta.color, 0.05);
  };

  const linkWidth = (edge) => {
    if (highlight?.edges.has(edge.id)) return 2.2;
    if (edge.type === "similarTo") return 0.45;
    return 0.8;
  };

  const linkLabel = (edge) => {
    const source = nodeById.get(getId(edge.source))?.label || "?";
    const target = nodeById.get(getId(edge.target))?.label || "?";
    const meta = EDGE_META[edge.type] || EDGE_META.authored;
    const provenance = (edge.provenance || []).join(" · ");
    return `<div style="max-width:300px;padding:6px 8px;border-radius:6px;background:#0e1320;color:#fff;font-size:12px;line-height:1.4;border:1px solid rgba(255,255,255,0.15)">
      <div style="font-weight:600;margin-bottom:2px">${escapeHtml(source)} &harr; ${escapeHtml(target)}</div>
      <div style="color:rgba(255,255,255,0.72)">${escapeHtml(meta.label)}${provenance ? ` · ${escapeHtml(provenance)}` : ""}</div>
    </div>`;
  };

  const focusNode = (node) => {
    if (!node) return;
    setSelectedId(node.id);
    const graph = fgRef.current;
    if (graph && typeof node.x === "number" && typeof node.y === "number") {
      graph.centerAt(node.x, node.y, 700);
      graph.zoom(3, 700);
    }
  };

  const applyScope = (nextScope) => {
    setScope(nextScope);
    setSelectedId(null);
    didFitRef.current = false;
    setLab("");
    setDepartment("");
    setProject("");
    setTopic("");
    if (nextScope.startsWith("laboratory:")) {
      setIncludeCoauthors(false);
      setIncludeSimilarity(false);
    } else {
      setIncludeCoauthors(true);
      setIncludeSimilarity(true);
    }
  };

  const clearScope = () => {
    if (fixedScope) return;
    setScope("global");
    setSelectedId(null);
    didFitRef.current = false;
    setIncludeSimilarity(true);
    setIncludeCoauthors(true);
  };

  const clearFilters = () => {
    setTypes([...TYPE_ORDER]);
    setYearMin("");
    setYearMax("");
    setLab("");
    setDepartment("");
    setProject("");
    setTopic("");
    const labScope = (fixedScope || scope).startsWith("laboratory:");
    setIncludeSimilarity(!labScope);
    setIncludeCoauthors(!labScope);
  };

  const toggleType = (type) => {
    setTypes((current) => {
      const next = current.includes(type)
        ? current.filter((value) => value !== type)
        : [...current, type];
      if (!next.length) return current;
      return TYPE_ORDER.filter((entry) => next.includes(entry));
    });
  };

  const activeFilterCount =
    (isAllTypes(types) ? 0 : 1) +
    (yearMin ? 1 : 0) +
    (yearMax ? 1 : 0) +
    (lab ? 1 : 0) +
    (department ? 1 : 0) +
    (project ? 1 : 0) +
    (topic ? 1 : 0);

  const scopeLabel =
    scope === "global" ? "Whole institute" : data?.scope?.label || "Loading…";
  const graphHeight = compact ? "min-h-[560px] h-[64vh]" : "min-h-[620px] h-[calc(100vh-15rem)]";

  return (
    <section className="w-full">
      <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-blue-600 dark:text-yellow-400">
            {title}
          </h1>
          <p className="mt-1 max-w-3xl text-sm text-slate-600 dark:text-slate-400">
            {subtitle}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-xs">
          {data?.scope?.kind === "laboratory" && (
            <span className="rounded-full border border-gray-200 bg-white px-3 py-1 text-gray-600 dark:border-gray-700 dark:bg-slate-900 dark:text-gray-300">
              {data.scope.meta?.memberCount || 0} members ·{" "}
              {data.scope.meta?.publicationCount || 0} papers
            </span>
          )}
          {data?.stats && (
            <span className="rounded-full border border-gray-200 bg-white px-3 py-1 text-gray-600 dark:border-gray-700 dark:bg-slate-900 dark:text-gray-300">
              {data.stats.returnedNodes} nodes · {data.stats.returnedEdges} links
            </span>
          )}
          {loading && (
            <span className="rounded-full bg-amber-100 px-3 py-1 font-medium text-amber-800 dark:bg-amber-950/40 dark:text-amber-300">
              Updating…
            </span>
          )}
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-slate-950">
        <div className="border-b border-gray-200 p-3 dark:border-gray-800">
          <div className="flex flex-col gap-2 xl:flex-row xl:items-center">
            <label className="relative block flex-1">
              <span className="sr-only">Search the knowledge graph</span>
              <FaSearch className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search people, publications, labs, projects, or topics…"
                className="w-full rounded-xl border border-gray-200 bg-gray-50 py-2.5 pl-9 pr-9 text-sm text-gray-900 outline-none transition focus:border-blue-400 focus:bg-white dark:border-gray-700 dark:bg-slate-900 dark:text-gray-100 dark:focus:border-yellow-500/60"
              />
              {query && (
                <button
                  type="button"
                  onClick={() => setQuery("")}
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-gray-400 hover:bg-gray-200 hover:text-gray-600 dark:hover:bg-slate-800 dark:hover:text-gray-200"
                  aria-label="Clear search"
                >
                  <FaTimes />
                </button>
              )}
            </label>

            <button
              type="button"
              onClick={() => setShowFilters((current) => !current)}
              className={`inline-flex items-center gap-2 rounded-xl border px-3 py-2.5 text-sm font-medium transition ${
                showFilters
                  ? "border-blue-300 bg-blue-50 text-blue-700 dark:border-yellow-500/40 dark:bg-yellow-500/10 dark:text-yellow-300"
                  : "border-gray-200 bg-gray-50 text-gray-600 dark:border-gray-700 dark:bg-slate-900 dark:text-gray-300"
              }`}
              aria-expanded={showFilters}
            >
              <FaFilter />
              Filters
              {activeFilterCount > 0 && (
                <span className="rounded-full bg-blue-600 px-1.5 text-[10px] font-bold text-white dark:bg-yellow-500 dark:text-slate-950">
                  {activeFilterCount}
                </span>
              )}
            </button>
          </div>

          <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
            <span className="text-gray-500 dark:text-gray-400">Scope</span>
            <span className="inline-flex max-w-full items-center gap-1.5 rounded-full border border-gray-200 bg-gray-50 px-2.5 py-1 font-medium text-gray-700 dark:border-gray-700 dark:bg-slate-900 dark:text-gray-200">
              <span className="truncate">{scopeLabel}</span>
              {!fixedScope && scope !== "global" && (
                <button
                  type="button"
                  onClick={clearScope}
                  className="rounded-full p-0.5 text-gray-400 transition hover:bg-gray-200 hover:text-gray-700 dark:hover:bg-slate-800 dark:hover:text-gray-100"
                  aria-label="Clear scope"
                  title="Clear scope"
                >
                  <FaTimes className="text-[10px]" />
                </button>
              )}
            </span>
          </div>

          {showFilters && (
            <div className="mt-3 space-y-3 rounded-xl border border-gray-200 bg-gray-50/80 p-3 dark:border-gray-800 dark:bg-slate-900/60">
              <div className="flex flex-wrap items-center gap-1.5">
                {TYPE_ORDER.map((type) => {
                  const meta = NODE_META[type];
                  const TypeIcon = meta.icon;
                  const active = types.includes(type);
                  const count = facets.types?.find((entry) => entry.value === type)?.count;
                  return (
                    <button
                      key={type}
                      type="button"
                      onClick={() => toggleType(type)}
                      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition ${
                        active
                          ? "border-transparent text-slate-950"
                          : "border-gray-200 bg-white text-gray-600 hover:border-gray-300 dark:border-gray-700 dark:bg-slate-900 dark:text-gray-300"
                      }`}
                      style={active ? { backgroundColor: meta.color } : undefined}
                    >
                      <TypeIcon aria-hidden="true" />
                      {meta.label}
                      {count != null && <span className="opacity-70">{count}</span>}
                    </button>
                  );
                })}
              </div>

              {!types.includes("publication") && (
                <p className="text-[11px] leading-relaxed text-gray-500 dark:text-gray-400">
                  Publications are hidden. Remaining links come from membership,
                  projects, teams, and departments; topics need publications to
                  appear, so they stay out of this view.
                </p>
              )}

              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
                <label className="text-xs font-medium text-gray-600 dark:text-gray-400">
                  From year
                  <select
                    value={yearMin}
                    onChange={(event) => setYearMin(event.target.value)}
                    className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-2 py-1.5 text-sm text-gray-800 dark:border-gray-700 dark:bg-slate-950 dark:text-gray-200"
                  >
                    <option value="">Any</option>
                    {(data?.graphOptions?.years || facets.years || []).map(
                      (entry) => {
                        const year = typeof entry === "object" ? entry.value : entry;
                        return (
                          <option key={year} value={year}>
                            {year}
                          </option>
                        );
                      },
                    )}
                  </select>
                </label>
                <label className="text-xs font-medium text-gray-600 dark:text-gray-400">
                  To year
                  <select
                    value={yearMax}
                    onChange={(event) => setYearMax(event.target.value)}
                    className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-2 py-1.5 text-sm text-gray-800 dark:border-gray-700 dark:bg-slate-950 dark:text-gray-200"
                  >
                    <option value="">Any</option>
                    {(data?.graphOptions?.years || facets.years || []).map(
                      (entry) => {
                        const year = typeof entry === "object" ? entry.value : entry;
                        return (
                          <option key={year} value={year}>
                            {year}
                          </option>
                        );
                      },
                    )}
                  </select>
                </label>
                <label className="text-xs font-medium text-gray-600 dark:text-gray-400">
                  Laboratory
                  <select
                    value={lab}
                    onChange={(event) => setLab(event.target.value)}
                    className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-2 py-1.5 text-sm text-gray-800 dark:border-gray-700 dark:bg-slate-950 dark:text-gray-200"
                  >
                    <option value="">All laboratories</option>
                    {(data?.graphOptions?.labs || facets.labs || []).map((entry) => (
                      <option key={entry.value} value={entry.value}>
                        {entry.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="text-xs font-medium text-gray-600 dark:text-gray-400">
                  Department
                  <select
                    value={department}
                    onChange={(event) => setDepartment(event.target.value)}
                    className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-2 py-1.5 text-sm text-gray-800 dark:border-gray-700 dark:bg-slate-950 dark:text-gray-200"
                  >
                    <option value="">All departments</option>
                    {(data?.graphOptions?.departments || facets.departments || []).map(
                      (entry) => (
                        <option key={entry.value} value={entry.value}>
                          {entry.label}
                        </option>
                      ),
                    )}
                  </select>
                </label>
                <label className="text-xs font-medium text-gray-600 dark:text-gray-400">
                  Project
                  <select
                    value={project}
                    onChange={(event) => setProject(event.target.value)}
                    className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-2 py-1.5 text-sm text-gray-800 dark:border-gray-700 dark:bg-slate-950 dark:text-gray-200"
                  >
                    <option value="">All projects</option>
                    {(data?.graphOptions?.projects || []).map((entry) => (
                      <option key={entry.value} value={entry.value}>
                        {entry.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="text-xs font-medium text-gray-600 dark:text-gray-400">
                  Topic
                  <select
                    value={topic}
                    onChange={(event) => setTopic(event.target.value)}
                    className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-2 py-1.5 text-sm text-gray-800 dark:border-gray-700 dark:bg-slate-950 dark:text-gray-200"
                  >
                    <option value="">All topics</option>
                    {(data?.graphOptions?.topics || facets.topics || []).map(
                      (entry) => (
                        <option
                          key={`${entry.value}-${entry.label}`}
                          value={entry.value}
                        >
                          {entry.label}
                        </option>
                      ),
                    )}
                  </select>
                </label>
              </div>

              <div className="flex flex-wrap items-start justify-between gap-x-5 gap-y-3 text-xs text-gray-600 dark:text-gray-400">
                <div className="flex flex-col gap-2">
                  <label className="inline-flex max-w-lg items-start gap-2">
                    <input
                      type="checkbox"
                      checked={includeSimilarity}
                      onChange={(event) => setIncludeSimilarity(event.target.checked)}
                      className="mt-0.5 h-3.5 w-3.5 rounded border-gray-300"
                    />
                    <span>
                      <span className="font-medium text-gray-700 dark:text-gray-200">
                        Similar papers
                      </span>
                      <span className="block text-[11px] leading-snug text-gray-500 dark:text-gray-400">
                        Add links between papers with related content, even when
                        they share no authors or topics.
                      </span>
                    </span>
                  </label>
                  {(fixedScope || scope.startsWith("laboratory:")) && (
                    <label className="inline-flex max-w-lg items-start gap-2">
                      <input
                        type="checkbox"
                        checked={includeCoauthors}
                        onChange={(event) => setIncludeCoauthors(event.target.checked)}
                        className="mt-0.5 h-3.5 w-3.5 rounded border-gray-300"
                      />
                      <span>
                        <span className="font-medium text-gray-700 dark:text-gray-200">
                          External co-authors
                        </span>
                        <span className="block text-[11px] leading-snug text-gray-500 dark:text-gray-400">
                          Include authors from outside this laboratory.
                        </span>
                      </span>
                    </label>
                  )}
                </div>
                <button
                  type="button"
                  onClick={clearFilters}
                  className="self-start font-semibold text-blue-600 hover:underline dark:text-yellow-400"
                >
                  Clear filters
                </button>
              </div>
            </div>
          )}
        </div>

        {error && (
          <div className="border-b border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-300">
            {error}
          </div>
        )}

        <div className="border-b border-gray-200 dark:border-gray-800">
          <div className="flex items-center justify-between px-4 py-2.5">
            <div className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
              {data?.stats?.matchCount || 0} matches
            </div>
            {data?.truncated && (
              <span
                title="Large result sets are bounded. Open a node and choose Scope to see all links."
                className="text-[10px] font-medium text-amber-600 dark:text-amber-400"
              >
                view limited
              </span>
            )}
          </div>

          <div className="px-2 pb-2">
            <ResultList
              data={data}
              nodeById={nodeById}
              onSelect={focusNode}
              selectedId={selectedId}
            />
          </div>
        </div>

        <div className={`relative overflow-hidden ${graphHeight}`} style={{ background: BG_COLOR }}>
            <div ref={containerRef} className="absolute inset-0">
              {size.width > 0 && nodes.length > 0 && (
                <ForceGraph2D
                  ref={fgRef}
                  width={size.width}
                  height={size.height}
                  graphData={graphData}
                  backgroundColor={BG_COLOR}
                  nodeLabel={(node) => escapeHtml(node.label)}
                  nodeCanvasObject={drawNode}
                  nodePointerAreaPaint={paintPointerArea}
                  linkColor={linkColor}
                  linkWidth={linkWidth}
                  linkLabel={linkLabel}
                  linkDirectionalArrowLength={0}
                  linkCurvature={0.08}
                  onNodeHover={(node) => setHoverId(node ? node.id : null)}
                  onLinkHover={(link) => setHoverLink(link || null)}
                  onNodeClick={focusNode}
                  onBackgroundClick={() => {
                    setSelectedId(null);
                    setHoverId(null);
                    setHoverLink(null);
                  }}
                  cooldownTicks={140}
                  d3VelocityDecay={0.55}
                  onEngineStop={() => {
                    if (!didFitRef.current) {
                      didFitRef.current = true;
                      fgRef.current?.zoomToFit(500, 60);
                    }
                  }}
                />
              )}

              {(!data || nodes.length === 0) && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 p-8 text-center text-sm text-white/50">
                  <FaInfoCircle className="text-2xl text-white/30" />
                  {loading ? (
                    <p>Loading the knowledge graph…</p>
                  ) : (
                    <>
                      <p>No nodes match this view.</p>
                      <button
                        type="button"
                        onClick={clearFilters}
                        className="text-xs font-semibold text-amber-300 hover:underline"
                      >
                        Clear filters
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>

            <div className="pointer-events-none absolute left-4 top-3 z-10 hidden max-w-sm text-white/80 sm:block">
              <div className="text-sm font-semibold">{scopeLabel}</div>
              <div className="text-[11px] text-white/45">
                Drag to pan · scroll to zoom · click a node to inspect it
              </div>
            </div>

            <div className="absolute right-3 top-3 z-10 flex items-center gap-1 rounded-lg border border-white/10 bg-black/40 p-1 backdrop-blur">
              <button
                type="button"
                onClick={() => fgRef.current?.zoomToFit(400, 60)}
                className="rounded p-2 text-white/70 hover:bg-white/10 hover:text-white"
                aria-label="Fit graph"
                title="Fit graph"
              >
                <FaCompress />
              </button>
              <button
                type="button"
                onClick={() => {
                  const graph = fgRef.current;
                  if (graph) graph.zoom(graph.zoom() * 1.35, 250);
                }}
                className="rounded p-2 text-white/70 hover:bg-white/10 hover:text-white"
                aria-label="Zoom in"
                title="Zoom in"
              >
                <FaExpandArrowsAlt />
              </button>
            </div>

            <div className="absolute bottom-3 left-3 z-10">
              <button
                type="button"
                onClick={() => setShowLegend((current) => !current)}
                className="rounded-md border border-white/15 bg-black/50 px-2.5 py-1.5 text-[11px] font-medium text-white/70 backdrop-blur hover:text-white"
              >
                {showLegend ? "Hide" : "Show"} legend
              </button>
              {showLegend && (
                <div className="mt-2 w-56 rounded-md border border-white/10 bg-[#0b1220]/95 p-3 text-[11px] text-white/70 backdrop-blur">
                  <div className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-white/35">
                    Nodes
                  </div>
                  <ul className="space-y-1">
                    {TYPE_ORDER.map((type) => (
                      <li key={type} className="flex items-center gap-2">
                        <span
                          className="inline-block h-2.5 w-2.5 rounded-full"
                          style={{ backgroundColor: NODE_META[type].color }}
                        />
                        {NODE_META[type].label}
                      </li>
                    ))}
                  </ul>
                  <div className="mb-1 mt-3 text-[10px] font-semibold uppercase tracking-wide text-white/35">
                    Links
                  </div>
                  <ul className="space-y-1">
                    {Object.entries(EDGE_META).map(([type, meta]) => (
                      <li key={type} className="flex items-center gap-2">
                        <span
                          className="inline-block h-0.5 w-4"
                          style={{ backgroundColor: meta.color }}
                        />
                        {meta.label}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            {selectedNode && (
              <NodePanel
                node={selectedNode}
                neighbors={selectedNeighbors}
                onClose={() => setSelectedId(null)}
                onSelectNeighbor={focusNode}
                onScope={(node) => {
                  const type = node.type === "topic" ? "topic" : node.type;
                  if (node.slug) applyScope(`${type}:${node.slug}`);
                }}
                canScope={
                  !fixedScope &&
                  Boolean(selectedNode.slug) &&
                  ["person", "laboratory", "topic", "project", "department", "team"].includes(
                    selectedNode.type,
                  )
                }
              />
            )}
          </div>
      </div>

      <p className="mt-2 px-1 text-[11px] leading-relaxed text-gray-500 dark:text-slate-400">
        Large result sets are bounded, so some links may be outside this view.{" "}
        {fixedScope ? (
          "Clear filters to widen the graph."
        ) : (
          <>
            Open a node and choose{" "}
            <span className="font-medium text-gray-600 dark:text-slate-300">
              Scope to see all links
            </span>
            , or clear filters to widen the graph.
          </>
        )}
      </p>
    </section>
  );
}

function ResultList({ data, nodeById, onSelect, selectedId }) {
  if (!data) {
    return (
      <div className="flex gap-2">
        {Array.from({ length: 6 }).map((_, index) => (
          <div
            key={index}
            className="h-16 w-64 shrink-0 animate-pulse rounded-lg bg-gray-100 dark:bg-slate-900 sm:w-72"
          />
        ))}
      </div>
    );
  }

  const matches = data.matches || [];
  if (!matches.length) {
    return (
      <div className="p-6 text-center text-sm text-gray-500 dark:text-gray-400">
        No entities match this view. Try another search or clear the filters.
      </div>
    );
  }

  return (
    <ul className="flex gap-2 overflow-x-auto pb-1">
      {matches.map((match) => {
        const node = nodeById.get(match.nodeId);
        if (!node) return null;
        const meta = NODE_META[node.type] || NODE_META.publication;
        const active = node.id === selectedId;
        return (
          <li key={node.id} className="w-72 shrink-0 sm:w-80">
            <button
              type="button"
              onClick={() => onSelect(node)}
              className={`flex h-full w-full items-start gap-2 rounded-lg border px-2.5 py-2 text-left transition ${
                active
                  ? "border-blue-300 bg-blue-50 dark:border-yellow-500/40 dark:bg-yellow-500/10"
                  : "border-gray-200 hover:border-gray-300 hover:bg-gray-50 dark:border-gray-800 dark:hover:border-gray-700 dark:hover:bg-slate-900"
              }`}
            >
              <span
                className="mt-1 inline-block h-2.5 w-2.5 shrink-0 rounded-full"
                style={{ backgroundColor: meta.color }}
              />
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-2">
                  <span className="line-clamp-2 min-w-0 text-sm font-medium text-gray-900 dark:text-gray-100">
                    {node.label}
                  </span>
                  <span className="shrink-0 rounded bg-gray-100 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-gray-500 dark:bg-slate-800 dark:text-gray-400">
                    {meta.singular}
                  </span>
                </span>
                <span className="mt-0.5 line-clamp-2 block text-xs text-gray-500 dark:text-gray-400">
                  {node.subtitle}
                </span>
                {match.reason && (
                  <span className="mt-0.5 block text-[10px] text-gray-400 dark:text-gray-500">
                    {match.reason}
                  </span>
                )}
              </span>
              {node.flags && (
                <span className="mt-1 flex shrink-0 flex-col items-end gap-1 text-[9px] font-semibold uppercase tracking-wide">
                  {node.flags.explicit && (
                    <span className="rounded bg-amber-100 px-1 py-0.5 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300">
                      lab
                    </span>
                  )}
                  {node.flags.memberAuthored && (
                    <span className="rounded bg-emerald-100 px-1 py-0.5 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-300">
                      author
                    </span>
                  )}
                </span>
              )}
            </button>
          </li>
        );
      })}
    </ul>
  );
}

function NodePanel({
  node,
  neighbors,
  onClose,
  onSelectNeighbor,
  onScope,
  canScope,
}) {
  const meta = NODE_META[node.type] || NODE_META.publication;
  const MetaIcon = meta.icon;

  return (
    <aside className="absolute bottom-0 right-0 top-0 z-20 flex w-full max-w-sm flex-col overflow-y-auto border-l border-white/10 bg-[#0b1220]/95 text-white shadow-2xl backdrop-blur-sm">
      <div className="flex items-start justify-between gap-2 border-b border-white/10 p-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-wide text-white/40">
            <MetaIcon aria-hidden="true" style={{ color: meta.color }} />
            {meta.singular}
          </div>
          <h2 className="mt-1 break-words text-lg font-semibold leading-tight">
            {node.label}
          </h2>
          {node.subtitle && (
            <p className="mt-1 text-xs text-white/55">{node.subtitle}</p>
          )}
          {node.flags && (
            <div className="mt-2 flex flex-wrap gap-1 text-[9px] font-semibold uppercase tracking-wide">
              {node.flags.explicit && (
                <span className="rounded bg-amber-500/15 px-1.5 py-0.5 text-amber-300">
                  explicit lab paper
                </span>
              )}
              {node.flags.memberAuthored && (
                <span className="rounded bg-emerald-500/15 px-1.5 py-0.5 text-emerald-300">
                  member-authored
                </span>
              )}
            </div>
          )}
        </div>
        <button
          type="button"
          onClick={onClose}
          className="rounded p-1.5 text-white/50 hover:bg-white/10 hover:text-white"
          aria-label="Close details"
        >
          <FaTimes />
        </button>
      </div>

      <div className="grid grid-cols-2 gap-2 border-b border-white/10 p-4 text-center">
        <Stat label="Connections" value={neighbors.length} />
        {node.type === "person" ? (
          <Stat label="Publications" value={node.metrics?.publicationCount || 0} />
        ) : node.type === "publication" ? (
          <Stat label="Year" value={node.meta?.year || "—"} />
        ) : (
          <Stat label="Type" value={meta.singular} />
        )}
        {node.type === "publication" && (
          <Stat label="Citations" value={node.meta?.citedBy || 0} />
        )}
        {node.type === "publication" && (
          <Stat label="Graph" value={node.meta?.graphEligible ? "eligible" : "reference"} />
        )}
      </div>

      {node.metrics?.degree > neighbors.length && (
        <p className="border-b border-white/10 px-4 py-2 text-[11px] text-white/40">
          {node.metrics.degree} connections in the full graph · showing{" "}
          {neighbors.length} in this view
        </p>
      )}

      <div className="flex flex-wrap gap-2 border-b border-white/10 p-4">
        {node.href && (
          <Link
            href={node.href}
            className="rounded-md bg-white px-3 py-1.5 text-xs font-semibold text-slate-950 hover:bg-white/90"
          >
            Open page
          </Link>
        )}
        {canScope && (
          <button
            type="button"
            onClick={() => onScope(node)}
            title="Rebuild the graph around this node and prioritise its direct connections."
            className="rounded-md border border-white/20 px-3 py-1.5 text-xs font-semibold text-white/80 hover:bg-white/10"
          >
            Scope to see all links
          </button>
        )}
      </div>

      {node.type === "publication" && node.meta?.authorNames?.length > 0 && (
        <Section title="Authors">
          <p className="text-sm leading-relaxed text-white/70">
            {node.meta.authorNames.join(", ")}
          </p>
        </Section>
      )}

      {neighbors.length > 0 && (
        <Section title={`Connected (${neighbors.length})`}>
          <ul className="max-h-80 space-y-1 overflow-y-auto pr-1">
            {neighbors.map((neighbor) => {
              const neighborMeta = NODE_META[neighbor.type] || NODE_META.publication;
              return (
                <li key={neighbor.id}>
                  <button
                    type="button"
                    onClick={() => onSelectNeighbor(neighbor)}
                    className="flex w-full items-center gap-2 rounded px-2 py-1 text-left text-sm text-white/70 hover:bg-white/10"
                  >
                    <span
                      className="inline-block h-2 w-2 shrink-0 rounded-full"
                      style={{ backgroundColor: neighborMeta.color }}
                    />
                    <span className="truncate">{neighbor.label}</span>
                    <span className="ml-auto shrink-0 text-[10px] uppercase tracking-wide text-white/35">
                      {neighborMeta.singular}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </Section>
      )}
    </aside>
  );
}

function Section({ title, children }) {
  return (
    <section className="border-b border-white/10 p-4">
      <h3 className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-white/40">
        {title}
      </h3>
      {children}
    </section>
  );
}

function Stat({ label, value }) {
  return (
    <div>
      <div className="text-lg font-semibold text-white">{value}</div>
      <div className="text-[10px] uppercase tracking-wide text-white/40">{label}</div>
    </div>
  );
}
