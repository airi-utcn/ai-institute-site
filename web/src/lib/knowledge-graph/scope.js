import { EDGE_TYPES, NODE_TYPES, normalizeText } from './model.js';

const GLOBAL_ALIASES = new Set(['', 'all', 'global', 'everything', 'institute']);

const SCOPE_ALIASES = {
  lab: 'laboratory',
  labs: 'laboratory',
  laboratory: 'laboratory',
  person: 'person',
  people: 'person',
  researcher: 'person',
  topic: 'topic',
  domain: 'topic',
  meso: 'topic',
  macro: 'topic',
  project: 'project',
  department: 'department',
  dept: 'department',
  team: 'team',
};

const toArray = (value) => (Array.isArray(value) ? value : value ? [value] : []);

const addAll = (target, values) => {
  toArray(values).forEach((value) => {
    if (value) target.add(value);
  });
};

function adjacencyEdges(index, nodeId) {
  return index.adjacency.get(nodeId) || [];
}

function otherEnd(edge, nodeId) {
  return edge.source === nodeId ? edge.target : edge.source;
}

function neighbours(index, nodeId, type, direction = 'both') {
  const result = [];
  adjacencyEdges(index, nodeId).forEach((edge) => {
    if (type && edge.type !== type) return;
    if (direction === 'out' && edge.source !== nodeId) return;
    if (direction === 'in' && edge.target !== nodeId) return;
    result.push(otherEnd(edge, nodeId));
  });
  return result;
}

function nodesOfType(index, type) {
  return Array.from(index.nodeById.values()).filter((node) => node.type === type);
}

function findNode(index, type, raw) {
  const value = String(raw || '').trim();
  if (!value) return null;
  if (index.nodeById.has(value)) return index.nodeById.get(value);
  const normalized = normalizeText(value);

  const candidates = nodesOfType(index, type);
  return (
    candidates.find((node) => node.slug === value) ||
    candidates.find((node) => node.key === value) ||
    candidates.find((node) => node.id === value) ||
    candidates.find((node) => node.label === value) ||
    candidates.find((node) => normalizeText(node.label) === normalized) ||
    null
  );
}

function findTopicNodes(index, raw) {
  const value = String(raw || '').trim();
  if (!value) return [];
  if (index.nodeById.has(value) && index.nodeById.get(value).type === NODE_TYPES.TOPIC) {
    return [index.nodeById.get(value)];
  }

  const normalized = normalizeText(value);
  return nodesOfType(index, NODE_TYPES.TOPIC).filter(
    (node) =>
      node.slug === value ||
      node.key === value ||
      normalizeText(node.label) === normalized ||
      node.id === value,
  );
}

export function parseScope(rawScope) {
  const raw = String(rawScope || '').trim();
  if (GLOBAL_ALIASES.has(raw.toLowerCase())) {
    return { kind: 'global', key: '' };
  }

  const separator = raw.indexOf(':');
  if (separator === -1) {
    return { kind: 'global', key: '' };
  }

  const alias = raw.slice(0, separator).toLowerCase();
  const key = raw.slice(separator + 1).trim();
  const kind = SCOPE_ALIASES[alias] || 'global';
  return { kind, key };
}

function startScope(index, rawScope) {
  const parsed = parseScope(rawScope);
  if (parsed.kind === 'global') {
    return { ...parsed, seeds: [], label: 'Whole institute' };
  }

  const seeds =
    parsed.kind === 'topic'
      ? findTopicNodes(index, parsed.key)
      : [findNode(index, parsed.kind, parsed.key)].filter(Boolean);

  if (!seeds.length) {
    return { ...parsed, seeds: [], label: 'Unknown scope' };
  }

  return {
    kind: parsed.kind,
    key: parsed.key,
    seeds: seeds.map((node) => node.id),
    label:
      parsed.kind === 'topic'
        ? seeds.map((node) => node.label).join(' / ')
        : seeds[0].label,
  };
}

function finalizeScope(graph, index, scope, options = {}) {
  const includeSimilarity = options.includeSimilarity === true;
  const includeCoauthors = options.includeCoauthors !== false;

  const edgeIds = new Set();
  (graph.edges || []).forEach((edge) => {
    if (!scope.nodeIds.has(edge.source) || !scope.nodeIds.has(edge.target)) {
      return;
    }
    if (edge.type === EDGE_TYPES.SIMILAR_TO && !includeSimilarity) return;
    edgeIds.add(edge.id);
  });

  const publicationFlags = new Map();
  if (scope.kind === 'laboratory') {
    scope.explicitPublicationIds.forEach((id) =>
      publicationFlags.set(id, { explicit: true, memberAuthored: false }),
    );
    scope.memberAuthoredPublicationIds.forEach((id) => {
      const current = publicationFlags.get(id) || {
        explicit: false,
        memberAuthored: false,
      };
      publicationFlags.set(id, { ...current, memberAuthored: true });
    });
  }

  return {
    kind: scope.kind,
    key: scope.key,
    label: scope.label,
    seeds: scope.seeds,
    rootNodeId: scope.seeds[0] || null,
    nodeIds: scope.nodeIds,
    edgeIds,
    publicationFlags,
    meta: {
      nodeCount: scope.nodeIds.size,
      edgeCount: edgeIds.size,
      memberCount: scope.memberCount || 0,
      publicationCount: scope.publicationIds?.size || 0,
      explicitPublicationCount: scope.explicitPublicationIds?.size || 0,
      memberAuthoredPublicationCount: scope.memberAuthoredPublicationIds?.size || 0,
      includeCoauthors,
      includeSimilarity,
    },
  };
}

/**
 * Resolve a scope string into the node and edge sets the query should consider.
 * Scopes are deliberately explicit: a lab graph is the lab's members plus their
 * papers, not a global graph filtered with `WHERE lab = ...`.
 */
export function resolveScope(graph, index, rawScope, options = {}) {
  const parsed = startScope(index, rawScope);
  const includeCoauthors =
    options.includeCoauthors === undefined
      ? parsed.kind !== 'laboratory'
      : options.includeCoauthors === true;
  const includeSimilarity =
    options.includeSimilarity === undefined
      ? parsed.kind === 'global'
      : options.includeSimilarity === true;
  const resolvedOptions = { ...options, includeSimilarity, includeCoauthors };
  const nodeIds = new Set();
  const publicationIds = new Set();
  const explicitPublicationIds = new Set();
  const memberAuthoredPublicationIds = new Set();
  let memberCount = 0;

  if (parsed.kind === 'global' || parsed.kind === 'noscope') {
    graph.nodes.forEach((node) => nodeIds.add(node.id));
    return finalizeScope(
      graph,
      index,
      {
        ...parsed,
        label: 'Whole institute',
        nodeIds,
        seeds: [],
        publicationIds: new Set(
          graph.nodes
            .filter((node) => node.type === NODE_TYPES.PUBLICATION)
            .map((node) => node.id),
        ),
        explicitPublicationIds,
        memberAuthoredPublicationIds,
      },
      resolvedOptions,
    );
  }

  if (!parsed.seeds.length) {
    return finalizeScope(
      graph,
      index,
      {
        ...parsed,
        nodeIds,
        publicationIds,
        explicitPublicationIds,
        memberAuthoredPublicationIds,
      },
      resolvedOptions,
    );
  }

  if (parsed.kind === 'laboratory') {
    const laboratoryId = parsed.seeds[0];
    addAll(nodeIds, laboratoryId);

    const members = new Set();
    const addMember = (personId) => {
      if (!personId) return;
      members.add(personId);
      nodeIds.add(personId);
    };

    neighbours(index, laboratoryId, EDGE_TYPES.MEMBER_OF, 'in').forEach(addMember);
    neighbours(index, laboratoryId, EDGE_TYPES.LAB_PUBLICATION, 'out').forEach(
      (publicationId) => {
        explicitPublicationIds.add(publicationId);
        publicationIds.add(publicationId);
        nodeIds.add(publicationId);
      },
    );

    members.forEach((personId) => {
      neighbours(index, personId, EDGE_TYPES.AUTHORED, 'out').forEach(
        (publicationId) => {
          memberAuthoredPublicationIds.add(publicationId);
          publicationIds.add(publicationId);
          nodeIds.add(publicationId);
        },
      );
    });

    if (includeCoauthors) {
      publicationIds.forEach((publicationId) => {
        neighbours(index, publicationId, EDGE_TYPES.AUTHORED, 'in').forEach(
          (personId) => {
            if (!members.has(personId)) nodeIds.add(personId);
          },
        );
      });
    }

    publicationIds.forEach((publicationId) => {
      neighbours(index, publicationId, EDGE_TYPES.TAGGED_WITH, 'out').forEach(
        (topicId) => nodeIds.add(topicId),
      );
    });

    memberCount = members.size;
  }

  if (parsed.kind === 'person') {
    const personId = parsed.seeds[0];
    addAll(nodeIds, personId);

    const publications = new Set(
      neighbours(index, personId, EDGE_TYPES.AUTHORED, 'out'),
    );
    addAll(publicationIds, publications);
    addAll(nodeIds, publications);

    if (includeCoauthors) {
      publications.forEach((publicationId) => {
        addAll(nodeIds, neighbours(index, publicationId, EDGE_TYPES.AUTHORED, 'in'));
      });
    }

    addAll(nodeIds, neighbours(index, personId, EDGE_TYPES.MEMBER_OF, 'out'));
    addAll(nodeIds, neighbours(index, personId, EDGE_TYPES.IN_DEPARTMENT, 'out'));
    addAll(nodeIds, neighbours(index, personId, EDGE_TYPES.CONTRIBUTES_TO, 'out'));
    addAll(nodeIds, neighbours(index, personId, EDGE_TYPES.TEAM_MEMBER, 'out'));

    publications.forEach((publicationId) => {
      addAll(nodeIds, neighbours(index, publicationId, EDGE_TYPES.TAGGED_WITH, 'out'));
      addAll(nodeIds, neighbours(index, publicationId, EDGE_TYPES.LAB_PUBLICATION, 'in'));
      addAll(nodeIds, neighbours(index, publicationId, EDGE_TYPES.IN_DEPARTMENT, 'out'));
    });

    memberCount = 1;
  }

  if (parsed.kind === 'topic') {
    const topicIds = new Set(parsed.seeds);
    addAll(nodeIds, topicIds);

    topicIds.forEach((topicId) => {
      neighbours(index, topicId, EDGE_TYPES.TAGGED_WITH, 'in').forEach(
        (publicationId) => {
          publicationIds.add(publicationId);
          nodeIds.add(publicationId);
        },
      );
    });

    publicationIds.forEach((publicationId) => {
      addAll(nodeIds, neighbours(index, publicationId, EDGE_TYPES.AUTHORED, 'in'));
      addAll(nodeIds, neighbours(index, publicationId, EDGE_TYPES.LAB_PUBLICATION, 'in'));
      addAll(nodeIds, neighbours(index, publicationId, EDGE_TYPES.IN_DEPARTMENT, 'out'));
    });
  }

  if (parsed.kind === 'project') {
    const projectId = parsed.seeds[0];
    addAll(nodeIds, projectId);

    const people = new Set(
      neighbours(index, projectId, EDGE_TYPES.CONTRIBUTES_TO, 'in'),
    );
    addAll(nodeIds, people);
    memberCount = people.size;

    people.forEach((personId) => {
      neighbours(index, personId, EDGE_TYPES.AUTHORED, 'out').forEach(
        (publicationId) => {
          publicationIds.add(publicationId);
          nodeIds.add(publicationId);
        },
      );
      addAll(nodeIds, neighbours(index, personId, EDGE_TYPES.IN_DEPARTMENT, 'out'));
    });

    publicationIds.forEach((publicationId) => {
      addAll(nodeIds, neighbours(index, publicationId, EDGE_TYPES.TAGGED_WITH, 'out'));
      addAll(nodeIds, neighbours(index, publicationId, EDGE_TYPES.LAB_PUBLICATION, 'in'));
    });
  }

  if (parsed.kind === 'department') {
    const departmentId = parsed.seeds[0];
    addAll(nodeIds, departmentId);

    const people = new Set(
      nodesOfType(index, NODE_TYPES.PERSON)
        .filter((node) =>
          neighbours(index, node.id, EDGE_TYPES.IN_DEPARTMENT, 'out').includes(
            departmentId,
          ),
        )
        .map((node) => node.id),
    );
    addAll(nodeIds, people);
    memberCount = people.size;

    people.forEach((personId) => {
      neighbours(index, personId, EDGE_TYPES.AUTHORED, 'out').forEach(
        (publicationId) => {
          publicationIds.add(publicationId);
          nodeIds.add(publicationId);
        },
      );
    });

    publicationIds.forEach((publicationId) => {
      addAll(nodeIds, neighbours(index, publicationId, EDGE_TYPES.TAGGED_WITH, 'out'));
      addAll(nodeIds, neighbours(index, publicationId, EDGE_TYPES.LAB_PUBLICATION, 'in'));
    });
  }

  if (parsed.kind === 'team') {
    const teamId = parsed.seeds[0];
    addAll(nodeIds, teamId);

    const people = new Set(
      neighbours(index, teamId, EDGE_TYPES.TEAM_MEMBER, 'in'),
    );
    addAll(nodeIds, people);
    memberCount = people.size;

    people.forEach((personId) => {
      neighbours(index, personId, EDGE_TYPES.AUTHORED, 'out').forEach(
        (publicationId) => {
          publicationIds.add(publicationId);
          nodeIds.add(publicationId);
        },
      );
      addAll(nodeIds, neighbours(index, personId, EDGE_TYPES.MEMBER_OF, 'out'));
      addAll(nodeIds, neighbours(index, personId, EDGE_TYPES.IN_DEPARTMENT, 'out'));
    });

    publicationIds.forEach((publicationId) => {
      addAll(nodeIds, neighbours(index, publicationId, EDGE_TYPES.TAGGED_WITH, 'out'));
      addAll(nodeIds, neighbours(index, publicationId, EDGE_TYPES.LAB_PUBLICATION, 'in'));
    });
  }

  // Keep the graph honest: drop nodes that were added but have no link back to
  // the scope seed (for example a stale relation target).
  const reachable = new Set(parsed.seeds);
  let changed = true;
  while (changed) {
    changed = false;
    nodeIds.forEach((nodeId) => {
      if (reachable.has(nodeId)) return;
      const linked = adjacencyEdges(index, nodeId).some((edge) => {
        const other = otherEnd(edge, nodeId);
        return reachable.has(other);
      });
      if (linked) {
        reachable.add(nodeId);
        changed = true;
      }
    });
  }
  Array.from(nodeIds).forEach((nodeId) => {
    if (!reachable.has(nodeId)) nodeIds.delete(nodeId);
  });

  publicationIds.forEach((id) => {
    if (!nodeIds.has(id)) publicationIds.delete(id);
  });

  return finalizeScope(
    graph,
    index,
    {
      ...parsed,
      nodeIds,
      publicationIds,
      explicitPublicationIds,
      memberAuthoredPublicationIds,
      memberCount,
    },
    resolvedOptions,
  );
}
