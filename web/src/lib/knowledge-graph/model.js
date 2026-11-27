/**
 * Pure knowledge-graph projection.
 *
 * The public graph is a heterogeneous view over content that already lives in
 * Strapi. Nothing here talks to the network: callers pass in the minimal source
 * payload from `getKnowledgeGraphSource()` and receive a plain, serializable
 * `{ nodes, edges, meta }` object.
 *
 * Node ids are namespaced (`person:<documentId>`, `publication:<documentId>`,
 * `laboratory:<slug>`). Numeric Strapi ids are never used as the primary key:
 * they differ between environments and can collide across collections.
 */

export const NODE_TYPES = {
  PERSON: 'person',
  PUBLICATION: 'publication',
  LABORATORY: 'laboratory',
  PROJECT: 'project',
  TEAM: 'team',
  DEPARTMENT: 'department',
  TOPIC: 'topic',
};

export const EDGE_TYPES = {
  AUTHORED: 'authored',
  LAB_PUBLICATION: 'labPublication',
  MEMBER_OF: 'memberOf',
  CONTRIBUTES_TO: 'contributesTo',
  TEAM_MEMBER: 'teamMember',
  PROJECT_TEAM: 'projectTeam',
  BELONGS_TO: 'belongsTo',
  IN_DEPARTMENT: 'inDepartment',
  TAGGED_WITH: 'taggedWith',
  SIMILAR_TO: 'similarTo',
};

const toArray = (value) => (Array.isArray(value) ? value : value ? [value] : []);

const attrs = (record) => record?.attributes ?? record ?? {};

const relation = (value) => {
  const data = value?.data ?? value;
  return Array.isArray(data) ? data : data ? [data] : [];
};

const clean = (value) =>
  typeof value === 'string' ? value.replace(/\s+/g, ' ').trim() : '';

const normalizeDoi = (value) =>
  String(value ?? '')
    .toLowerCase()
    .replace(/^https?:\/\/(dx\.)?doi\.org\//, '')
    .replace(/^doi:\s*/, '')
    .trim();

const normalizeOpenAlexId = (value) =>
  String(value ?? '')
    .toLowerCase()
    .replace(/^https?:\/\/(api\.)?openalex\.org\/(works\/)?/, '')
    .trim();

const matchesExclusion = (publication, exclusion) => {
  const pub = attrs(publication);
  const ex = attrs(exclusion);
  if (ex.isActive === false) return false;

  if (ex.openAlexId && pub.openAlexId) {
    if (normalizeOpenAlexId(ex.openAlexId) === normalizeOpenAlexId(pub.openAlexId)) {
      return true;
    }
  }

  if (ex.doi && pub.doi) {
    if (normalizeDoi(ex.doi) === normalizeDoi(pub.doi)) return true;
  }

  if (ex.title && pub.title) {
    if (normalizeText(ex.title) === normalizeText(pub.title)) return true;
  }

  return false;
};

export const normalizeText = (value) =>
  String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

export const slugify = (value) =>
  String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

const recordKeys = (record, { includeOpenAlex = false } = {}) => {
  const entry = attrs(record);
  const keys = [];
  const push = (value) => {
    if (value === undefined || value === null || value === '') return;
    const text = String(value);
    if (!keys.includes(text)) keys.push(text);
  };

  push(record?.documentId);
  push(entry.documentId);
  if (includeOpenAlex) push(entry.openAlexId);
  push(entry.slug);
  push(entry.id);
  push(record?.id);

  return keys;
};

const makeLookup = (nodes, records) => {
  const lookup = new Map();
  nodes.forEach((node, index) => {
    recordKeys(records[index], { includeOpenAlex: node.type === NODE_TYPES.PUBLICATION }).forEach(
      (key) => lookup.set(key, node.id),
    );
  });
  return lookup;
};

const nodeKey = (record, { includeOpenAlex = false, preferSlug = false } = {}) => {
  const entry = attrs(record);
  const candidates = preferSlug
    ? [entry.slug, record?.documentId, entry.documentId, entry.id, record?.id]
    : [record?.documentId, entry.documentId, entry.id, record?.id, entry.slug];

  if (includeOpenAlex) candidates.push(entry.openAlexId);

  for (const candidate of candidates) {
    if (candidate !== undefined && candidate !== null && candidate !== '') {
      return String(candidate);
    }
  }
  return null;
};

const personName = (record) => {
  const entry = attrs(record);
  return (
    clean(entry.fullName) ||
    [entry.firstName, entry.lastName].map(clean).filter(Boolean).join(' ') ||
    clean(entry.slug) ||
    'Unknown person'
  );
};

const topicNodeId = (kind, topic) => {
  const entry = attrs(topic);
  const slug = clean(entry.slug) || slugify(entry.name);
  if (!slug) return null;
  return `topic:${kind}:${slug}`;
};

/**
 * Build the derived graph. The output is plain JSON so it can cross the
 * server/client boundary and be cached as a process snapshot.
 */
export function buildKnowledgeGraph(source = {}) {
  const nodes = [];
  const edges = [];
  const nodeById = new Map();
  const edgeByKey = new Map();
  const lookups = {};
  const stats = {
    people: 0,
    publications: 0,
    laboratories: 0,
    teams: 0,
    projects: 0,
    departments: 0,
    topics: 0,
    links: 0,
    skippedLinks: 0,
    excludedPublications: 0,
  };

  const ensureNode = (node) => {
    if (!node?.id) return null;
    const existing = nodeById.get(node.id);
    if (existing) return existing;
    nodeById.set(node.id, node);
    nodes.push(node);
    return node;
  };

  const connect = (sourceId, targetId, type, options = {}) => {
    if (!sourceId || !targetId || sourceId === targetId) return null;
    if (!nodeById.has(sourceId) || !nodeById.has(targetId)) return null;

    const key = `${type}\u0000${sourceId}\u0000${targetId}`;
    let edge = edgeByKey.get(key);
    const weight = Number.isFinite(options.weight) ? options.weight : 1;

    if (!edge) {
      edge = {
        id: `${type}:${edgeByKey.size + 1}`,
        source: sourceId,
        target: targetId,
        type,
        weight,
        label: options.label || type,
        provenance: [],
      };
      edgeByKey.set(key, edge);
      edges.push(edge);
    } else if (weight > edge.weight) {
      edge.weight = weight;
    }

    toArray(options.provenance).forEach((entry) => {
      if (entry && !edge.provenance.includes(entry)) edge.provenance.push(entry);
    });

    return edge;
  };

  /* --- People ----------------------------------------------------------- */

  const people = toArray(source.people);
  const personNodes = people.map((person) => {
    const entry = attrs(person);
    const key = nodeKey(person);
    if (!key) return null;
    const departmentEntry = relation(entry.department)[0] ?? entry.department;
    const department = attrs(departmentEntry);
    const label = personName(person);
    const subtitle = clean(entry.title) || clean(department.name) || 'Person';

    return ensureNode({
      id: `person:${key}`,
      type: NODE_TYPES.PERSON,
      key,
      slug: clean(entry.slug),
      label,
      subtitle,
      href: entry.slug ? `/people/${encodeURIComponent(entry.slug)}` : null,
      labelText: normalizeText(`${label} ${subtitle}`),
      searchText: normalizeText(
        `${label} ${subtitle} ${entry.fullName || ''} ${entry.firstName || ''} ${entry.lastName || ''} ${department.name || ''}`,
      ),
      meta: {
        personType: clean(entry.type),
        departmentSlug: clean(department.slug),
        departmentName: clean(department.name),
      },
      metrics: {},
    });
  });

  stats.people = personNodes.filter(Boolean).length;
  lookups.people = makeLookup(personNodes.filter(Boolean), people);

  /* --- Laboratories ----------------------------------------------------- */

  const laboratories = toArray(source.laboratories);
  const laboratoryNodes = laboratories.map((laboratory) => {
    const entry = attrs(laboratory);
    const key = nodeKey(laboratory, { preferSlug: true });
    if (!key) return null;
    const label = clean(entry.title) || clean(entry.slug) || 'Laboratory';

    return ensureNode({
      id: `laboratory:${key}`,
      type: NODE_TYPES.LABORATORY,
      key,
      slug: clean(entry.slug),
      label,
      subtitle: 'Laboratory',
      href: entry.slug
        ? `/research/laboratories/${encodeURIComponent(entry.slug)}`
        : null,
      labelText: normalizeText(label),
      searchText: normalizeText(`${label} laboratory`),
      meta: {},
      metrics: {},
    });
  });

  stats.laboratories = laboratoryNodes.filter(Boolean).length;
  lookups.laboratories = makeLookup(
    laboratoryNodes.filter(Boolean),
    laboratories,
  );

  /* --- Projects and teams ---------------------------------------------- */

  const projects = toArray(source.projects);
  const projectNodes = projects.map((project) => {
    const entry = attrs(project);
    const key = nodeKey(project, { preferSlug: true });
    if (!key) return null;
    const label = clean(entry.title) || clean(entry.slug) || 'Project';

    return ensureNode({
      id: `project:${key}`,
      type: NODE_TYPES.PROJECT,
      key,
      slug: clean(entry.slug),
      label,
      subtitle: 'Project',
      href: entry.slug
        ? `/research/projects/${encodeURIComponent(entry.slug)}`
        : null,
      labelText: normalizeText(label),
      searchText: normalizeText(`${label} project`),
      meta: {
        startDate: entry.startDate || null,
        endDate: entry.endDate || null,
      },
      metrics: {},
    });
  });

  stats.projects = projectNodes.filter(Boolean).length;
  lookups.projects = makeLookup(projectNodes.filter(Boolean), projects);

  const teams = toArray(source.teams);
  const teamNodes = teams.map((team) => {
    const entry = attrs(team);
    const key = nodeKey(team, { preferSlug: true });
    if (!key) return null;
    const label = clean(entry.name) || clean(entry.slug) || 'Team';

    return ensureNode({
      id: `team:${key}`,
      type: NODE_TYPES.TEAM,
      key,
      slug: clean(entry.slug),
      label,
      subtitle: 'Team',
      // Teams are shown inside the People page and do not have their own route.
      href: null,
      labelText: normalizeText(label),
      searchText: normalizeText(`${label} team`),
      meta: {},
      metrics: {},
    });
  });

  stats.teams = teamNodes.filter(Boolean).length;
  lookups.teams = makeLookup(teamNodes.filter(Boolean), teams);

  /* --- Publications ---------------------------------------------------- */

  const exclusions = toArray(source.exclusions).filter(
    (exclusion) => attrs(exclusion).isActive !== false,
  );
  const publications = toArray(source.publications).filter((publication) => {
    const excluded = exclusions.some((exclusion) =>
      matchesExclusion(publication, exclusion),
    );
    if (excluded) stats.excludedPublications += 1;
    return !excluded;
  });
  const publicationNodes = publications.map((publication) => {
    const entry = attrs(publication);
    const key = nodeKey(publication, { includeOpenAlex: true });
    if (!key) return null;
    const label = clean(entry.title) || 'Untitled publication';

    return ensureNode({
      id: `publication:${key}`,
      type: NODE_TYPES.PUBLICATION,
      key,
      slug: clean(entry.slug),
      label,
      subtitle: entry.year ? String(entry.year) : 'Publication',
      href: entry.slug
        ? `/research/publications/${encodeURIComponent(entry.slug)}`
        : null,
      labelText: normalizeText(label),
      searchText: normalizeText(`${label} ${entry.year || ''}`),
      meta: {
        year:
          entry.year !== null &&
          entry.year !== undefined &&
          Number.isFinite(Number(entry.year))
            ? Number(entry.year)
            : null,
        citedBy: Number.isFinite(Number(entry.cited_by))
          ? Number(entry.cited_by)
          : 0,
        kind: clean(entry.kind),
        openAlexId: clean(entry.openAlexId),
        doi: clean(entry.doi),
        graphEligible: entry.graphEligible === true,
        departmentSlug: '',
        projectSlugs: [],
        macroSlugs: [],
        mesoSlugs: [],
        authorIds: [],
        authorNames: [],
      },
      metrics: {},
    });
  });

  stats.publications = publicationNodes.filter(Boolean).length;
  lookups.publications = makeLookup(
    publicationNodes.filter(Boolean),
    publications,
  );

  /* --- Departments (derived from people and publications) -------------- */

  const departmentBySlug = new Map();
  const ensureDepartment = (slug, name) => {
    const cleanSlug = clean(slug);
    if (!cleanSlug) return null;
    const id = `department:${cleanSlug}`;
    if (nodeById.has(id)) return id;

    const label = clean(name) || cleanSlug;
    ensureNode({
      id,
      type: NODE_TYPES.DEPARTMENT,
      key: cleanSlug,
      slug: cleanSlug,
      label,
      subtitle: 'Department',
      href: `/research/departments/${encodeURIComponent(cleanSlug)}`,
      labelText: normalizeText(label),
      searchText: normalizeText(`${label} department`),
      meta: {},
      metrics: {},
    });
    departmentBySlug.set(cleanSlug, id);
    stats.departments += 1;
    return id;
  };

  /* --- People relations ------------------------------------------------ */

  people.forEach((person) => {
    const entry = attrs(person);
    const personId = lookups.people.get(nodeKey(person));
    if (!personId) return;

    const departmentEntry = relation(entry.department)[0] ?? entry.department;
    const department = attrs(departmentEntry);
    const departmentId = ensureDepartment(department.slug, department.name);
    if (departmentId) {
      connect(personId, departmentId, EDGE_TYPES.IN_DEPARTMENT, {
        label: 'department',
        provenance: ['department'],
      });
    }
  });

  laboratories.forEach((laboratory) => {
    const entry = attrs(laboratory);
    const laboratoryId = lookups.laboratories.get(
      nodeKey(laboratory, { preferSlug: true }),
    );
    if (!laboratoryId) return;

    const roles = [
      ['coordinator', 'laboratory coordinator'],
      ['coCoordinator', 'laboratory co-coordinator'],
      ['researchers', 'laboratory researcher'],
    ];

    roles.forEach(([field, provenance]) => {
      relation(entry[field]).forEach((person) => {
        const personId = lookupPerson(lookups, person);
        if (personId) {
          connect(personId, laboratoryId, EDGE_TYPES.MEMBER_OF, {
            label: 'member of',
            provenance: [provenance],
          });
        }
      });
    });

    relation(entry.departments).forEach((department) => {
      const departmentEntry = attrs(department);
      const departmentId = ensureDepartment(
        departmentEntry.slug,
        departmentEntry.name,
      );
      if (departmentId) {
        connect(laboratoryId, departmentId, EDGE_TYPES.IN_DEPARTMENT, {
          label: 'department',
          provenance: ['laboratory department'],
        });
      }
    });

    // The publication side also exposes `laboratories`, but reading the lab
    // side as well keeps explicit links working if one direction is restricted.
    relation(entry.publications).forEach((publication) => {
      const publicationId = lookupPublication(lookups, publication);
      if (publicationId) {
        connect(laboratoryId, publicationId, EDGE_TYPES.LAB_PUBLICATION, {
          label: 'laboratory publication',
          provenance: ['explicit laboratory relation'],
        });
      }
    });
  });

  teams.forEach((team) => {
    const entry = attrs(team);
    const teamId = lookups.teams.get(nodeKey(team, { preferSlug: true }));
    if (!teamId) return;

    const laboratoryEntry = relation(entry.laboratory)[0] ?? entry.laboratory;
    const laboratory = attrs(laboratoryEntry);
    const laboratoryId = laboratory.slug
      ? lookups.laboratories.get(laboratory.slug) ??
        lookups.laboratories.get(laboratory.documentId)
      : null;

    if (laboratoryId) {
      connect(teamId, laboratoryId, EDGE_TYPES.BELONGS_TO, {
        label: 'laboratory',
        provenance: ['team laboratory'],
      });
    }

    const departmentEntry = relation(entry.department)[0] ?? entry.department;
    const department = attrs(departmentEntry);
    const departmentId = ensureDepartment(department.slug, department.name);
    if (departmentId) {
      connect(teamId, departmentId, EDGE_TYPES.IN_DEPARTMENT, {
        label: 'department',
        provenance: ['team department'],
      });
    }

    relation(entry.members).forEach((member) => {
      const personRecord =
        relation(member?.person)[0] ?? member?.person ?? member;
      const personId = lookupPerson(lookups, personRecord);
      if (!personId) return;
      connect(personId, teamId, EDGE_TYPES.TEAM_MEMBER, {
        label: 'team member',
        provenance: ['team member'],
      });
      if (laboratoryId) {
        connect(personId, laboratoryId, EDGE_TYPES.MEMBER_OF, {
          label: 'member of',
          provenance: [`team ${clean(entry.name) || clean(entry.slug)}`],
        });
      }
    });
  });

  projects.forEach((project) => {
    const entry = attrs(project);
    const projectId = lookups.projects.get(nodeKey(project, { preferSlug: true }));
    if (!projectId) return;

    relation(entry.individualContributors).forEach((contributor) => {
      const personRecord =
        relation(contributor?.person)[0] ?? contributor?.person ?? contributor;
      const personId = lookupPerson(lookups, personRecord);
      if (personId) {
        connect(personId, projectId, EDGE_TYPES.CONTRIBUTES_TO, {
          label: 'contributes to',
          provenance: ['project contributor'],
        });
      }
    });

    relation(entry.domains).forEach((domain) => {
      const domainEntry = attrs(domain);
      const departmentId = ensureDepartment(domainEntry.slug, domainEntry.name);
      if (departmentId) {
        connect(projectId, departmentId, EDGE_TYPES.IN_DEPARTMENT, {
          label: 'department',
          provenance: ['project domain'],
        });
      }
    });

    relation(entry.teams).forEach((team) => {
      const teamEntry = attrs(team);
      const teamId = teamEntry.slug
        ? lookups.teams.get(teamEntry.slug) ??
          lookups.teams.get(teamEntry.documentId)
        : null;
      if (teamId) {
        connect(projectId, teamId, EDGE_TYPES.PROJECT_TEAM, {
          label: 'team project',
          provenance: ['project team'],
        });
      }
    });
  });

  /* --- Publications relations ----------------------------------------- */

  publications.forEach((publication) => {
    const entry = attrs(publication);
    const publicationId = lookups.publications.get(
      nodeKey(publication, { includeOpenAlex: true }),
    );
    if (!publicationId) return;

    const publicationNode = nodeById.get(publicationId);

    const authors = relation(entry.authors);
    authors.forEach((author) => {
      const personId = lookupPerson(lookups, author);
      if (!personId) return;
      connect(personId, publicationId, EDGE_TYPES.AUTHORED, {
        label: 'authored',
        provenance: ['author'],
      });
      const authorName = personName(author);
      if (authorName && !publicationNode.meta.authorNames.includes(authorName)) {
        publicationNode.meta.authorNames.push(authorName);
      }
      if (personId && !publicationNode.meta.authorIds.includes(personId)) {
        publicationNode.meta.authorIds.push(personId);
      }
    });

    relation(entry.domain).forEach((domain) => {
      const domainEntry = attrs(domain);
      const departmentId = ensureDepartment(
        domainEntry.slug,
        domainEntry.name,
      );
      if (departmentId) {
        publicationNode.meta.departmentSlug =
          publicationNode.meta.departmentSlug || clean(domainEntry.slug);
        connect(publicationId, departmentId, EDGE_TYPES.IN_DEPARTMENT, {
          label: 'department',
          provenance: ['publication domain'],
        });
      }
    });

    relation(entry.projects).forEach((project) => {
      const projectEntry = attrs(project);
      const projectId = projectEntry.slug
        ? lookups.projects.get(projectEntry.slug)
        : null;
      if (projectId) {
        if (
          projectEntry.slug &&
          !publicationNode.meta.projectSlugs.includes(projectEntry.slug)
        ) {
          publicationNode.meta.projectSlugs.push(projectEntry.slug);
        }
        connect(publicationId, projectId, EDGE_TYPES.CONTRIBUTES_TO, {
          label: 'project publication',
          provenance: ['publication project'],
        });
      }
    });

    relation(entry.laboratories).forEach((laboratory) => {
      const laboratoryEntry = attrs(laboratory);
      const laboratoryId = laboratoryEntry.slug
        ? lookups.laboratories.get(laboratoryEntry.slug)
        : null;
      if (laboratoryId) {
        connect(laboratoryId, publicationId, EDGE_TYPES.LAB_PUBLICATION, {
          label: 'laboratory publication',
          provenance: ['explicit laboratory relation'],
        });
      }
    });

    const addTopic = (topic, kind, provenance) => {
      const topicEntry = attrs(topic);
      const topicId = topicNodeId(kind, topicEntry);
      if (!topicId) return;
      const slug = clean(topicEntry.slug) || slugify(topicEntry.name);
      ensureNode({
        id: topicId,
        type: NODE_TYPES.TOPIC,
        key: slug,
        slug,
        label: clean(topicEntry.name) || slug,
        subtitle: kind === 'macro' ? 'Research domain' : 'Topic',
        href:
          kind === 'macro'
            ? `/research/paper-graph/${encodeURIComponent(slug)}`
            : null,
        labelText: normalizeText(topicEntry.name || slug),
        searchText: normalizeText(`${topicEntry.name || slug} ${kind}`),
        meta: { kind },
        metrics: {},
      });
      connect(publicationId, topicId, EDGE_TYPES.TAGGED_WITH, {
        label: provenance,
        provenance: [provenance],
      });
      const target = kind === 'macro' ? 'macroSlugs' : 'mesoSlugs';
      if (!publicationNode.meta[target].includes(slug)) {
        publicationNode.meta[target].push(slug);
      }
    };

    relation(entry.graphMacroPrimary).forEach((topic) =>
      addTopic(topic, 'macro', 'primary domain'),
    );
    relation(entry.graphMacroTags).forEach((topic) =>
      addTopic(topic, 'macro', 'tagged domain'),
    );
    relation(entry.graphMesoPrimary).forEach((topic) =>
      addTopic(topic, 'meso', 'primary topic'),
    );
    relation(entry.graphMesoTags).forEach((topic) =>
      addTopic(topic, 'meso', 'tagged topic'),
    );
  });

  // Count topic nodes after all publications have contributed.
  stats.topics = nodes.filter((node) => node.type === NODE_TYPES.TOPIC).length;

  /* --- Similarity links ------------------------------------------------- */

  toArray(source.links).forEach((link) => {
    const entry = attrs(link);
    const sourceEntry = relation(entry.source)[0] ?? entry.source;
    const targetEntry = relation(entry.target)[0] ?? entry.target;
    const sourceId = lookupPublication(lookups, sourceEntry);
    const targetId = lookupPublication(lookups, targetEntry);
    stats.links += 1;

    if (!sourceId || !targetId || sourceId === targetId) {
      stats.skippedLinks += 1;
      return;
    }

    const scoreValue = Number(entry.score);
    const score = Number.isFinite(scoreValue) ? scoreValue : 0;
    const [left, right] = sourceId < targetId ? [sourceId, targetId] : [targetId, sourceId];

    connect(left, right, EDGE_TYPES.SIMILAR_TO, {
      weight: score,
      label: 'similar paper',
      provenance: ['embedding similarity'],
    });
  });

  /* --- Finalize --------------------------------------------------------- */

  const adjacency = new Map(nodes.map((node) => [node.id, []]));
  edges.forEach((edge) => {
    adjacency.get(edge.source)?.push({ edgeId: edge.id, otherId: edge.target });
    adjacency.get(edge.target)?.push({ edgeId: edge.id, otherId: edge.source });
  });

  nodes.forEach((node) => {
    const neighbors = adjacency.get(node.id) || [];
    node.metrics.degree = neighbors.length;

    if (node.type === NODE_TYPES.PERSON) {
      node.metrics.publicationCount = neighbors.filter((entry) => {
        const other = nodeById.get(entry.otherId);
        return other?.type === NODE_TYPES.PUBLICATION;
      }).length;
    }

    if (node.type === NODE_TYPES.PUBLICATION) {
      const authorLabels = node.meta.authorNames;
      if (node.meta.authorNames.length) {
        node.subtitle = node.meta.year
          ? `${node.meta.year} · ${authorLabels.slice(0, 2).join(', ')}${
              authorLabels.length > 2 ? ' et al.' : ''
            }`
          : authorLabels.slice(0, 3).join(', ');
        node.searchText = normalizeText(
          `${node.searchText} ${node.meta.authorNames.join(' ')}`,
        );
      }
    }

    // Search by neighbour as well: publications by author, people by paper
    // title, labs by member, etc. Label matches still rank higher in query.js.
    const neighbourText = (adjacency.get(node.id) || [])
      .map((entry) => nodeById.get(entry.otherId)?.label || '')
      .filter(Boolean)
      .join(' ');
    if (neighbourText) {
      node.searchText = normalizeText(`${node.searchText} ${neighbourText}`);
    }
  });

  return {
    nodes,
    edges,
    meta: {
      generatedAt: new Date().toISOString(),
      stats,
    },
  };
}

function lookupPerson(lookups, record) {
  if (!record) return null;
  const keys = recordKeys(record);
  for (const key of keys) {
    const id = lookups.people.get(key);
    if (id) return id;
  }
  return null;
}

function lookupPublication(lookups, record) {
  if (!record) return null;
  const keys = recordKeys(record, { includeOpenAlex: true });
  for (const key of keys) {
    const id = lookups.publications.get(key);
    if (id) return id;
  }
  return null;
}

/**
 * Build the lookup tables query and scope code need. Kept separate from
 * `buildKnowledgeGraph` so the cached graph stays plain serializable JSON.
 */
export function indexGraph(graph) {
  const nodeById = new Map();
  const edgeById = new Map();
  const adjacency = new Map();
  const edgesByNode = new Map();
  const edgesByType = new Map();

  (graph.nodes || []).forEach((node) => {
    nodeById.set(node.id, node);
    adjacency.set(node.id, []);
    edgesByNode.set(node.id, []);
  });

  (graph.edges || []).forEach((edge) => {
    if (!nodeById.has(edge.source) || !nodeById.has(edge.target)) return;
    edgeById.set(edge.id, edge);
    adjacency.get(edge.source)?.push(edge);
    adjacency.get(edge.target)?.push(edge);
    edgesByNode.get(edge.source)?.push(edge);
    edgesByNode.get(edge.target)?.push(edge);

    if (!edgesByType.has(edge.type)) edgesByType.set(edge.type, []);
    edgesByType.get(edge.type).push(edge);
  });

  return {
    nodeById,
    edgeById,
    adjacency,
    edgesByNode,
    edgesByType,
  };
}

/**
 * Convenience for callers that only have a record and need its namespaced id.
 */
export function graphNodeId(type, record, options = {}) {
  const key = nodeKey(record, options);
  return key ? `${type}:${key}` : null;
}
