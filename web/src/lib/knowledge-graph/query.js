import {
  EDGE_TYPES,
  NODE_TYPES,
  indexGraph,
  normalizeText,
} from './model.js';
import { resolveScope } from './scope.js';

const DEFAULT_LIMIT = 250;
const MAX_LIMIT = 500;
const DEFAULT_MAX_EDGES = 1600;
const MAX_MATCHES = 80;

const KNOWN_TYPES = new Set(Object.values(NODE_TYPES));

const toArray = (value) => (Array.isArray(value) ? value : value ? [value] : []);

const clean = (value) =>
  typeof value === 'string' ? value.replace(/\s+/g, ' ').trim() : '';

const readValue = (input, name) => {
  if (!input) return null;
  if (input instanceof URLSearchParams) return input.get(name);
  const value = input[name];
  return Array.isArray(value) ? value[0] : value ?? null;
};

const readList = (input, name) => {
  if (!input) return [];
  if (input instanceof URLSearchParams) {
    return input
      .getAll(name)
      .flatMap((value) => String(value || '').split(','))
      .map((value) => value.trim())
      .filter(Boolean);
  }
  return toArray(input[name])
    .flatMap((value) => String(value || '').split(','))
    .map((value) => value.trim())
    .filter(Boolean);
};

const readNumber = (input, name) => {
  const raw = readValue(input, name);
  if (raw === null || raw === undefined || raw === '') return null;
  const value = Number(raw);
  return Number.isFinite(value) ? value : null;
};

const readBoolean = (input, name) => {
  const raw = readValue(input, name);
  if (raw === null || raw === undefined || raw === '') return undefined;
  return raw === '1' || raw === 'true' || raw === 'yes';
};

/**
 * Normalize query params from a route handler (`URLSearchParams`) or a server
 * page's `searchParams` object into the options consumed by `runKnowledgeGraphQuery`.
 */
export function parseGraphQuery(input) {
  const types = readList(input, 'types')
    .map((value) => value.toLowerCase())
    .filter((value) => KNOWN_TYPES.has(value));
  const include = readList(input, 'include').map((value) => value.toLowerCase());

  const similarityFlag = readBoolean(input, 'similarity');
  const coauthorsFlag = readBoolean(input, 'coauthors');

  const includeSimilarity =
    similarityFlag !== undefined
      ? similarityFlag
      : include.includes('similarity')
        ? true
        : undefined;
  const includeCoauthors =
    coauthorsFlag !== undefined
      ? coauthorsFlag
      : include.includes('coauthors')
        ? true
        : undefined;

  const limitValue = readNumber(input, 'limit');
  const limit = Math.max(
    20,
    Math.min(Number.isFinite(limitValue) ? limitValue : DEFAULT_LIMIT, MAX_LIMIT),
  );

  return {
    q: clean(readValue(input, 'q')).slice(0, 160),
    scope: clean(readValue(input, 'scope')) || 'global',
    types,
    yearMin: readNumber(input, 'yearMin'),
    yearMax: readNumber(input, 'yearMax'),
    lab: clean(readValue(input, 'lab')),
    department: clean(readValue(input, 'department')),
    project: clean(readValue(input, 'project')),
    team: clean(readValue(input, 'team')),
    topic: clean(readValue(input, 'topic')),
    includeSimilarity,
    includeCoauthors,
    limit,
  };
}

const addToSetMap = (map, key, value) => {
  if (!key || !value) return;
  if (!map.has(key)) map.set(key, new Set());
  map.get(key).add(value);
};

/**
 * Precompute relation lookups used by filters and facets. These are cheap to
 * build per request from the cached graph and keep the filter code readable.
 */
function buildRelations(graph, index) {
  const personLabs = new Map();
  const publicationLabs = new Map();
  const personDepartments = new Map();
  const publicationDepartments = new Map();
  const personProjects = new Map();
  const publicationProjects = new Map();
  const personTeams = new Map();
  const publicationTopics = new Map();

  graph.edges.forEach((edge) => {
    const source = index.nodeById.get(edge.source);
    const target = index.nodeById.get(edge.target);
    if (!source || !target) return;

    if (
      edge.type === EDGE_TYPES.MEMBER_OF &&
      source.type === NODE_TYPES.PERSON &&
      target.type === NODE_TYPES.LABORATORY
    ) {
      addToSetMap(personLabs, source.id, target.slug);
    }

    if (
      edge.type === EDGE_TYPES.LAB_PUBLICATION &&
      source.type === NODE_TYPES.LABORATORY &&
      target.type === NODE_TYPES.PUBLICATION
    ) {
      addToSetMap(publicationLabs, target.id, source.slug);
    }

    if (
      edge.type === EDGE_TYPES.IN_DEPARTMENT &&
      source.type === NODE_TYPES.PERSON &&
      target.type === NODE_TYPES.DEPARTMENT
    ) {
      addToSetMap(personDepartments, source.id, target.slug);
    }

    if (
      edge.type === EDGE_TYPES.IN_DEPARTMENT &&
      source.type === NODE_TYPES.PUBLICATION &&
      target.type === NODE_TYPES.DEPARTMENT
    ) {
      addToSetMap(publicationDepartments, source.id, target.slug);
    }

    if (
      edge.type === EDGE_TYPES.CONTRIBUTES_TO &&
      source.type === NODE_TYPES.PERSON &&
      target.type === NODE_TYPES.PROJECT
    ) {
      addToSetMap(personProjects, source.id, target.slug);
    }

    if (
      edge.type === EDGE_TYPES.TEAM_MEMBER &&
      source.type === NODE_TYPES.PERSON &&
      target.type === NODE_TYPES.TEAM
    ) {
      addToSetMap(personTeams, source.id, target.slug);
    }

    if (
      edge.type === EDGE_TYPES.CONTRIBUTES_TO &&
      source.type === NODE_TYPES.PUBLICATION &&
      target.type === NODE_TYPES.PROJECT
    ) {
      addToSetMap(publicationProjects, source.id, target.slug);
    }

    if (
      edge.type === EDGE_TYPES.TAGGED_WITH &&
      source.type === NODE_TYPES.PUBLICATION &&
      target.type === NODE_TYPES.TOPIC
    ) {
      addToSetMap(publicationTopics, source.id, target.slug);
    }
  });

  // Authorship propagates lab, department, and project membership to papers.
  graph.edges.forEach((edge) => {
    if (edge.type !== EDGE_TYPES.AUTHORED) return;
    const person = index.nodeById.get(edge.source);
    const publication = index.nodeById.get(edge.target);
    if (person?.type !== NODE_TYPES.PERSON) return;
    if (publication?.type !== NODE_TYPES.PUBLICATION) return;

    (personLabs.get(person.id) || []).forEach((slug) =>
      addToSetMap(publicationLabs, publication.id, slug),
    );
    (personDepartments.get(person.id) || []).forEach((slug) =>
      addToSetMap(publicationDepartments, publication.id, slug),
    );
    (personProjects.get(person.id) || []).forEach((slug) =>
      addToSetMap(publicationProjects, publication.id, slug),
    );
  });

  return {
    personLabs,
    publicationLabs,
    personDepartments,
    publicationDepartments,
    personProjects,
    publicationProjects,
    personTeams,
    publicationTopics,
  };
}

function hasPublicationFilters(options) {
  return Boolean(
    options.yearMin !== null ||
      options.yearMax !== null ||
      options.lab ||
      options.department ||
      options.project ||
      options.team ||
      options.topic,
  );
}

function publicationPassesFilters(publication, options, relations) {
  const year = publication.meta?.year;
  if (options.yearMin !== null && (year === null || year < options.yearMin)) return false;
  if (options.yearMax !== null && (year === null || year > options.yearMax)) return false;

  if (options.lab) {
    const labs = relations.publicationLabs.get(publication.id);
    if (!labs || !labs.has(options.lab)) return false;
  }

  if (options.department) {
    const departments = relations.publicationDepartments.get(publication.id);
    if (!departments || !departments.has(options.department)) return false;
  }

  if (options.project) {
    const projects = relations.publicationProjects.get(publication.id);
    if (!projects || !projects.has(options.project)) return false;
  }

  if (options.topic) {
    const topics = relations.publicationTopics.get(publication.id);
    if (!topics || !topics.has(options.topic)) return false;
  }

  if (options.team) {
    // Team membership is a person edge. A paper belongs to a team scope when at
    // least one of its authors is a member.
    const authors = publication.meta?.authorIds || [];
    if (!authors.some((authorId) => relations.personTeams.get(authorId)?.has(options.team))) {
      return false;
    }
  }

  return true;
}

function nodeImportance(node) {
  const degree = node.metrics?.degree || 0;
  if (node.type === NODE_TYPES.PUBLICATION) {
    return degree + Math.log1p(node.meta?.citedBy || 0) * 0.6;
  }
  if (node.type === NODE_TYPES.PERSON) {
    return degree + (node.metrics?.publicationCount || 0) * 0.4;
  }
  if (node.type === NODE_TYPES.LABORATORY) return degree + 6;
  if (node.type === NODE_TYPES.TOPIC) return degree * 0.7;
  return degree;
}

function scoreNode(node, query) {
  const normalized = normalizeText(query);
  if (!normalized) return 0;

  const tokens = normalized.split(' ').filter(Boolean);
  const labelWords = node.labelText.split(' ');
  let score = 0;

  if (node.labelText === normalized) score += 120;
  else if (node.labelText.startsWith(normalized)) score += 80;
  else if (node.labelText.includes(normalized)) score += 55;

  let labelTokenMatches = 0;
  tokens.forEach((token) => {
    if (labelWords.some((word) => word.startsWith(token))) {
      score += 16;
      labelTokenMatches += 1;
    } else if (node.labelText.includes(token)) {
      score += 10;
      labelTokenMatches += 1;
    }
  });

  if (node.searchText.includes(normalized)) score += 8;

  // Neighbour-only matches are useful context, not primary matches. A whole
  // phrase in the context still scores, but a single generic token such as
  // "systems" should not return every paper in a systems topic.
  if (!labelTokenMatches) {
    if (node.searchText.includes(normalized)) score += 12;
    else {
      tokens.forEach((token) => {
        if (node.searchText.includes(token)) score += 2;
      });
    }
  }

  return score;
}

function matchReason(node, query) {
  const normalized = normalizeText(query);
  if (!normalized) return '';
  if (node.labelText.includes(normalized)) return 'name or title match';
  if (node.searchText.includes(normalized)) return 'related author, topic, or context match';
  return 'related match';
}

function cloneNode(node, scope) {
  const flags = scope.publicationFlags.get(node.id);
  const { searchText, labelText, meta, ...publicNode } = node;
  const publicMeta = meta ? { ...meta } : meta;
  if (publicMeta) delete publicMeta.authorIds;

  return {
    ...publicNode,
    meta: publicMeta,
    ...(flags ? { flags } : {}),
  };
}

const EDGE_PRIORITY = {
  [EDGE_TYPES.AUTHORED]: 0,
  [EDGE_TYPES.LAB_PUBLICATION]: 1,
  [EDGE_TYPES.MEMBER_OF]: 2,
  [EDGE_TYPES.TAGGED_WITH]: 3,
  [EDGE_TYPES.CONTRIBUTES_TO]: 4,
  [EDGE_TYPES.TEAM_MEMBER]: 4,
  [EDGE_TYPES.PROJECT_TEAM]: 4,
  [EDGE_TYPES.BELONGS_TO]: 3,
  [EDGE_TYPES.IN_DEPARTMENT]: 5,
  [EDGE_TYPES.SIMILAR_TO]: 9,
};

function buildFacets(index, scope, facetNodeIds, relations) {
  const typeCounts = new Map();
  const yearCounts = new Map();
  const labCounts = new Map();
  const departmentCounts = new Map();
  const topicCounts = new Map();
  const topicLabels = new Map();
  const labLabels = new Map();
  const departmentLabels = new Map();

  const scopeNodes = Array.from(scope.nodeIds)
    .map((id) => index.nodeById.get(id))
    .filter(Boolean);

  scopeNodes.forEach((node) => {
    if (node.type === NODE_TYPES.LABORATORY) labLabels.set(node.slug, node.label);
    if (node.type === NODE_TYPES.DEPARTMENT) {
      departmentLabels.set(node.slug, node.label);
    }
    if (node.type === NODE_TYPES.TOPIC) topicLabels.set(node.slug, node.label);
  });

  const facetPublications = Array.from(facetNodeIds)
    .map((id) => index.nodeById.get(id))
    .filter((node) => node?.type === NODE_TYPES.PUBLICATION);

  facetPublications.forEach((publication) => {
    typeCounts.set(publication.type, (typeCounts.get(publication.type) || 0) + 1);
    const year = publication.meta?.year;
    if (year) yearCounts.set(year, (yearCounts.get(year) || 0) + 1);
    (publication.meta?.macroSlugs || []).forEach((slug) => {
      topicCounts.set(slug, (topicCounts.get(slug) || 0) + 1);
    });
    (publication.meta?.mesoSlugs || []).forEach((slug) => {
      topicCounts.set(slug, (topicCounts.get(slug) || 0) + 1);
    });
  });

  Array.from(facetNodeIds).forEach((nodeId) => {
    const node = index.nodeById.get(nodeId);
    if (!node || node.type === NODE_TYPES.PUBLICATION) return;
    typeCounts.set(node.type, (typeCounts.get(node.type) || 0) + 1);
  });

  scopeNodes.forEach((node) => {
    if (node.type === NODE_TYPES.LABORATORY) {
      labCounts.set(
        node.slug,
        facetPublications.filter((publication) =>
          relations.publicationLabs.get(publication.id)?.has(node.slug),
        ).length,
      );
    }
    if (node.type === NODE_TYPES.DEPARTMENT) {
      departmentCounts.set(
        node.slug,
        facetPublications.filter((publication) =>
          relations.publicationDepartments.get(publication.id)?.has(node.slug),
        ).length,
      );
    }
  });

  const byCountThenLabel = (a, b) =>
    b.count - a.count ||
    String(a.label ?? a.value).localeCompare(String(b.label ?? b.value));

  return {
    types: Array.from(typeCounts.entries())
      .map(([value, count]) => ({ value, count }))
      .sort(byCountThenLabel),
    years: Array.from(yearCounts.entries())
      .map(([value, count]) => ({ value, count }))
      .sort((a, b) => b.value - a.value),
    labs: Array.from(labCounts.entries())
      .map(([value, count]) => ({
        value,
        label: labLabels.get(value) || value,
        count,
      }))
      .sort(byCountThenLabel)
      .slice(0, 40),
    departments: Array.from(departmentCounts.entries())
      .filter(([, count]) => count > 0)
      .map(([value, count]) => ({
        value,
        label: departmentLabels.get(value) || value,
        count,
      }))
      .sort(byCountThenLabel)
      .slice(0, 40),
    topics: Array.from(topicCounts.entries())
      .map(([value, count]) => ({
        value,
        label: topicLabels.get(value) || value,
        count,
      }))
      .sort(byCountThenLabel)
      .slice(0, 60),
  };
}

function publicQuery(options) {
  return {
    q: options.q,
    scope: options.scope,
    types: options.types,
    yearMin: options.yearMin,
    yearMax: options.yearMax,
    lab: options.lab,
    department: options.department,
    project: options.project,
    team: options.team,
    topic: options.topic,
    includeSimilarity: options.includeSimilarity,
    includeCoauthors: options.includeCoauthors,
    limit: options.limit,
  };
}

function publicScope(scope) {
  return {
    kind: scope.kind,
    key: scope.key,
    label: scope.label,
    rootNodeId: scope.rootNodeId,
    meta: scope.meta,
  };
}

function buildGraphOptions(graph) {
  const optionList = (type) =>
    graph.nodes
      .filter((node) => node.type === type && node.slug)
      .map((node) => ({ value: node.slug, label: node.label }))
      .sort((a, b) => a.label.localeCompare(b.label));

  return {
    labs: optionList(NODE_TYPES.LABORATORY),
    departments: optionList(NODE_TYPES.DEPARTMENT),
    projects: optionList(NODE_TYPES.PROJECT),
    topics: optionList(NODE_TYPES.TOPIC),
    years: Array.from(
      new Set(
        graph.nodes
          .filter((node) => node.type === NODE_TYPES.PUBLICATION)
          .map((node) => node.meta?.year)
          .filter(Boolean),
      ),
    ).sort((a, b) => b - a),
  };
}

/**
 * Execute a search or path query over the cached graph.
 */
export function runKnowledgeGraphQuery(graph, rawOptions = {}) {
  const options = {
    q: '',
    scope: 'global',
    types: [],
    yearMin: null,
    yearMax: null,
    lab: '',
    department: '',
    project: '',
    team: '',
    topic: '',
    includeSimilarity: undefined,
    includeCoauthors: undefined,
    limit: DEFAULT_LIMIT,
    maxEdges: DEFAULT_MAX_EDGES,
    ...rawOptions,
  };

  const index = indexGraph(graph);
  const scope = resolveScope(graph, index, options.scope, {
    includeSimilarity: options.includeSimilarity,
    includeCoauthors: options.includeCoauthors,
  });
  const relations = buildRelations(graph, index);
  const graphOptions = buildGraphOptions(graph);
  const scopeNodes = Array.from(scope.nodeIds)
    .map((id) => index.nodeById.get(id))
    .filter(Boolean);

  const passingPublicationIds = new Set(
    scopeNodes
      .filter(
        (node) =>
          node.type === NODE_TYPES.PUBLICATION &&
          publicationPassesFilters(node, options, relations),
      )
      .map((node) => node.id),
  );

  const typeFilter = options.types?.length ? new Set(options.types) : null;
  const nodePassesTypeFilter = (node) =>
    !typeFilter || (node ? typeFilter.has(node.type) : false);

  const usePublicationFilters = hasPublicationFilters(options);

  const nodePassesFilters = (node) => {
    if (node.type === NODE_TYPES.PUBLICATION) {
      return passingPublicationIds.has(node.id);
    }

    if (!usePublicationFilters) return true;

    if (options.lab && node.type === NODE_TYPES.LABORATORY) {
      return node.slug === options.lab;
    }
    if (options.department && node.type === NODE_TYPES.DEPARTMENT) {
      return node.slug === options.department;
    }
    if (options.project && node.type === NODE_TYPES.PROJECT) {
      return node.slug === options.project;
    }
    if (options.team && node.type === NODE_TYPES.TEAM) {
      return node.slug === options.team;
    }
    if (options.topic && node.type === NODE_TYPES.TOPIC) {
      return node.slug === options.topic;
    }

    return (index.edgesByNode.get(node.id) || []).some((edge) => {
      const other = edge.source === node.id ? edge.target : edge.source;
      return passingPublicationIds.has(other);
    });
  };

  const nodeIsVisible = (node) =>
    Boolean(node) && nodePassesFilters(node) && nodePassesTypeFilter(node);

  const normalizedQuery = normalizeText(options.q);

  const matches = [];
  const facetNodeIds = new Set();
  scopeNodes.forEach((node) => {
    if (!nodePassesFilters(node)) return;

    const score = normalizedQuery ? scoreNode(node, options.q) : 0;
    if (normalizedQuery && score < 20) return;

    facetNodeIds.add(node.id);

    if (!nodePassesTypeFilter(node)) return;

    matches.push({
      node,
      score,
      reason: normalizedQuery ? matchReason(node, options.q) : '',
    });
  });

  matches.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return nodeImportance(b.node) - nodeImportance(a.node);
  });

  const totalMatches = matches.length;
  const matchIds = new Set(matches.map((match) => match.node.id));

  const resultIds = new Set();
  const seedLimit = Math.max(20, Math.floor(options.limit / 3));
  const seedIds = new Set(
    Array.from(matchIds).slice(0, Math.min(matchIds.size, seedLimit)),
  );

  if (scope.rootNodeId) {
    const rootNode = index.nodeById.get(scope.rootNodeId);
    if (nodeIsVisible(rootNode)) resultIds.add(scope.rootNodeId);
  }

  const addPublicationsForPerson = (personId) => {
    (index.edgesByNode.get(personId) || []).forEach((authoredEdge) => {
      if (resultIds.size >= options.limit) return;
      if (authoredEdge.type !== EDGE_TYPES.AUTHORED) return;
      if (!scope.edgeIds.has(authoredEdge.id)) return;
      const publicationId =
        authoredEdge.source === personId
          ? authoredEdge.target
          : authoredEdge.source;
      const publication = index.nodeById.get(publicationId);
      if (publication && nodeIsVisible(publication)) {
        resultIds.add(publicationId);
      }
    });
  };

  const addAuthoredPapers = (container) => {
    if (container.type === NODE_TYPES.PERSON) {
      addPublicationsForPerson(container.id);
      return;
    }

    if (
      ![
        NODE_TYPES.LABORATORY,
        NODE_TYPES.PROJECT,
        NODE_TYPES.TEAM,
        NODE_TYPES.DEPARTMENT,
      ].includes(container.type)
    ) {
      return;
    }

    (index.edgesByNode.get(container.id) || []).forEach((edge) => {
      if (resultIds.size >= options.limit) return;
      if (!scope.edgeIds.has(edge.id)) return;
      if (
        ![
          EDGE_TYPES.MEMBER_OF,
          EDGE_TYPES.CONTRIBUTES_TO,
          EDGE_TYPES.TEAM_MEMBER,
          EDGE_TYPES.IN_DEPARTMENT,
        ].includes(edge.type)
      ) {
        return;
      }
      const personId = edge.source === container.id ? edge.target : edge.source;
      const person = index.nodeById.get(personId);
      if (person?.type === NODE_TYPES.PERSON) {
        addPublicationsForPerson(personId);
      }
    });
  };

  seedIds.forEach((nodeId) => resultIds.add(nodeId));

  // Add one hop of context so a matching person shows their papers and a
  // matching paper shows its authors. Keep only nodes that survive the same
  // filters; this prevents a lab-year filter from pulling in unrelated work.
  seedIds.forEach((nodeId) => {
    (index.edgesByNode.get(nodeId) || []).forEach((edge) => {
      if (resultIds.size >= options.limit) return;
      if (!scope.edgeIds.has(edge.id)) return;
      const otherId = edge.source === nodeId ? edge.target : edge.source;
      const other = index.nodeById.get(otherId);
      if (!other) return;
      if (nodeIsVisible(other)) resultIds.add(otherId);
    });
  });

  // Computed containers (labs, teams, projects, departments) need their
  // members' papers; a person is handled by their own authored edges above.
  seedIds.forEach((nodeId) => {
    const node = index.nodeById.get(nodeId);
    if (node) addAuthoredPapers(node);
  });

  // Fill the remaining budget with the next highest-ranked matches so a large
  // no-query view still shows the strongest hubs after the seed neighbourhoods.
  for (const match of matches) {
    if (resultIds.size >= options.limit) break;
    resultIds.add(match.node.id);
  }

  let keptIds = new Set(Array.from(resultIds).slice(0, options.limit));

  const candidateEdges = graph.edges
    .filter(
      (edge) =>
        scope.edgeIds.has(edge.id) &&
        keptIds.has(edge.source) &&
        keptIds.has(edge.target),
    )
    .sort((a, b) => {
      const priority =
        (EDGE_PRIORITY[a.type] ?? 6) - (EDGE_PRIORITY[b.type] ?? 6);
      if (priority !== 0) return priority;
      return (b.weight || 0) - (a.weight || 0);
    });

  // When the view has links, drop nodes that ended up disconnected. This keeps
  // type filters honest (for example, topics lose every link when publications
  // are hidden) without turning a deliberately isolated selection into an
  // empty canvas. Explicit text matches and scope roots stay visible.
  if (candidateEdges.length > 0) {
    const connected = new Set();
    candidateEdges.forEach((edge) => {
      connected.add(edge.source);
      connected.add(edge.target);
    });
    const focusIds = new Set();
    if (normalizedQuery) matchIds.forEach((id) => focusIds.add(id));
    if (scope.rootNodeId) focusIds.add(scope.rootNodeId);
    keptIds = new Set(
      Array.from(keptIds).filter(
        (id) => connected.has(id) || focusIds.has(id),
      ),
    );
  }

  const visibleMatchCandidates = matches.filter((match) =>
    keptIds.has(match.node.id),
  );
  const matchCount = visibleMatchCandidates.length;

  const edges = candidateEdges.slice(
    0,
    Math.max(20, Math.min(options.maxEdges || DEFAULT_MAX_EDGES, 5000)),
  );
  const truncated =
    matchCount < totalMatches ||
    matchCount > MAX_MATCHES ||
    edges.length < candidateEdges.length;

  const visibleMatches = visibleMatchCandidates
    .slice(0, MAX_MATCHES)
    .map((match) => ({
      nodeId: match.node.id,
      score: match.score,
      reason: match.reason,
    }));
  const nodes = Array.from(keptIds)
    .map((id) => index.nodeById.get(id))
    .filter(Boolean)
    .map((node) => cloneNode(node, scope));

  const facets = buildFacets(index, scope, facetNodeIds, relations);

  return {
    query: publicQuery(options),
    scope: publicScope(scope),
    graphOptions,
    nodes,
    edges,
    matches: visibleMatches,
    facets,
    path: null,
    message: '',
    truncated,
    stats: {
      scopedNodes: scope.nodeIds.size,
      scopedEdges: scope.edgeIds.size,
      returnedNodes: nodes.length,
      returnedEdges: edges.length,
      matchCount,
    },
  };
}
