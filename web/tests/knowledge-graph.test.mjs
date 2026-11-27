import assert from 'node:assert/strict';
import { test } from 'node:test';

import { EDGE_TYPES, NODE_TYPES, buildKnowledgeGraph, indexGraph } from '../src/lib/knowledge-graph/model.js';
import { resolveScope } from '../src/lib/knowledge-graph/scope.js';
import { parseGraphQuery, runKnowledgeGraphQuery } from '../src/lib/knowledge-graph/query.js';

const person = (id, firstName, lastName, slug, departmentSlug = 'ai') => ({
  documentId: id,
  firstName,
  lastName,
  fullName: `${firstName} ${lastName}`,
  slug,
  type: 'researcher',
  title: 'Researcher',
  department: {
    data: {
      documentId: `dept-${departmentSlug}`,
      name: departmentSlug === 'ai' ? 'AI' : 'Software Engineering',
      slug: departmentSlug,
    },
  },
});

const topic = (id, name, slug) => ({ documentId: id, name, slug });

const publication = (id, title, year, authors, options = {}) => ({
  documentId: id,
  slug: options.slug || id,
  title,
  year,
  cited_by: options.citedBy || 0,
  kind: 'article',
  graphEligible: true,
  authors: { data: authors },
  laboratories: { data: options.labs || [] },
  domain: options.domain ? { data: [options.domain] } : { data: [] },
  projects: { data: options.projects || [] },
  graphMacroPrimary: { data: options.macro ? [options.macro] : [] },
  graphMacroTags: { data: options.macroTags || [] },
  graphMesoPrimary: { data: options.meso ? [options.meso] : [] },
  graphMesoTags: { data: options.mesoTags || [] },
});

function makeSource() {
  const alice = person('alice', 'Alice', 'Alpha', 'alice');
  const bob = person('bob', 'Bob', 'Beta', 'bob');
  const carol = person('carol', 'Carol', 'Gamma', 'carol', 'se');
  const dave = person('dave', 'Dave', 'Delta', 'dave', 'se');

  const lab = {
    documentId: 'lab1',
    title: 'Lab One',
    slug: 'lab-one',
    coordinator: { data: bob },
    coCoordinator: { data: null },
    researchers: { data: [alice] },
    departments: { data: [alice.department.data] },
  };

  const ai = topic('macro-ai', 'Artificial Intelligence', 'ai');
  const ml = topic('meso-ml', 'Machine Learning', 'machine-learning');
  const se = topic('macro-se', 'Software Engineering', 'software-engineering');

  const p1 = publication('p1', 'Paper One', 2024, [alice, bob], {
    labs: [{ documentId: 'lab1', title: 'Lab One', slug: 'lab-one' }],
    macro: ai,
    meso: ml,
    domain: alice.department.data,
    citedBy: 20,
  });
  const p2 = publication('p2', 'Paper Two', 2022, [carol], {
    macro: ai,
    meso: ml,
    domain: carol.department.data,
  });
  const p3 = publication('p3', 'Paper Three', 2020, [alice, dave], {
    macro: ai,
    meso: ml,
    domain: alice.department.data,
  });

  const team = {
    documentId: 'team1',
    name: 'Team One',
    slug: 'team-one',
    laboratory: { data: { documentId: 'lab1', title: 'Lab One', slug: 'lab-one' } },
    department: { data: alice.department.data },
    members: { data: [{ person: { data: alice } }, { person: { data: carol } }] },
  };

  const project = {
    documentId: 'project1',
    title: 'Project One',
    slug: 'project-one',
    domains: { data: [alice.department.data] },
    teams: {
      data: [{ documentId: 'team1', name: 'Team One', slug: 'team-one' }],
    },
    individualContributors: { data: [{ person: { data: alice } }] },
  };

  const link = {
    id: 'link1',
    source: { data: { documentId: 'p1', openAlexId: 'W1' } },
    target: { data: { documentId: 'p3', openAlexId: 'W3' } },
    score: 0.9,
  };

  return {
    people: [alice, bob, carol, dave],
    publications: [p1, p2, p3],
    laboratories: [lab],
    teams: [team],
    projects: [project],
    links: [link],
  };
}

test('builds namespaced nodes and typed edges without dangling endpoints', () => {
  const graph = buildKnowledgeGraph(makeSource());
  const ids = new Set(graph.nodes.map((node) => node.id));

  assert.ok(ids.has('person:alice'));
  assert.ok(ids.has('publication:p1'));
  assert.ok(ids.has('laboratory:lab-one'));
  assert.ok(ids.has('topic:macro:ai'));

  const authored = graph.edges.filter((edge) => edge.type === EDGE_TYPES.AUTHORED);
  assert.equal(authored.length, 5);

  const members = graph.edges.filter((edge) => edge.type === EDGE_TYPES.MEMBER_OF);
  assert.ok(members.some((edge) => edge.source === 'person:alice' && edge.target === 'laboratory:lab-one'));
  assert.ok(members.some((edge) => edge.source === 'person:bob' && edge.target === 'laboratory:lab-one'));
  assert.ok(members.some((edge) => edge.source === 'person:carol' && edge.target === 'laboratory:lab-one'));

  const organisational = graph.edges.filter(
    (edge) =>
      edge.type === EDGE_TYPES.PROJECT_TEAM ||
      edge.type === EDGE_TYPES.BELONGS_TO,
  );
  assert.ok(
    organisational.some(
      (edge) =>
        edge.source === 'project:project-one' &&
        edge.target === 'team:team-one' &&
        edge.type === EDGE_TYPES.PROJECT_TEAM,
    ),
  );
  assert.ok(
    organisational.some(
      (edge) =>
        edge.source === 'team:team-one' &&
        edge.target === 'laboratory:lab-one' &&
        edge.type === EDGE_TYPES.BELONGS_TO,
    ),
  );

  const projectDepartment = graph.edges.find(
    (edge) =>
      edge.source === 'project:project-one' &&
      edge.target === 'department:ai' &&
      edge.type === EDGE_TYPES.IN_DEPARTMENT,
  );
  assert.ok(projectDepartment);
  assert.ok(
    graph.edges.some(
      (edge) =>
        edge.source === 'team:team-one' &&
        edge.target === 'department:ai' &&
        edge.type === EDGE_TYPES.IN_DEPARTMENT,
    ),
  );

  const similarity = graph.edges.filter((edge) => edge.type === EDGE_TYPES.SIMILAR_TO);
  assert.equal(similarity.length, 1);
  assert.equal(similarity[0].weight, 0.9);

  graph.edges.forEach((edge) => {
    assert.ok(ids.has(edge.source), `missing source ${edge.source}`);
    assert.ok(ids.has(edge.target), `missing target ${edge.target}`);
  });
});

test('laboratory scope unions explicit and member-authored papers', () => {
  const graph = buildKnowledgeGraph(makeSource());
  const index = indexGraph(graph);
  const scope = resolveScope(graph, index, 'laboratory:lab-one');

  const nodeIds = scope.nodeIds;
  assert.ok(nodeIds.has('laboratory:lab-one'));
  assert.ok(nodeIds.has('person:alice'));
  assert.ok(nodeIds.has('person:bob'));
  assert.ok(nodeIds.has('person:carol'));
  assert.ok(!nodeIds.has('person:dave'), 'external co-author should be excluded by default');

  assert.ok(nodeIds.has('publication:p1'));
  assert.ok(nodeIds.has('publication:p2'));
  assert.ok(nodeIds.has('publication:p3'));

  assert.deepEqual(scope.publicationFlags.get('publication:p1'), {
    explicit: true,
    memberAuthored: true,
  });
  assert.deepEqual(scope.publicationFlags.get('publication:p2'), {
    explicit: false,
    memberAuthored: true,
  });
  assert.equal(scope.meta.memberCount, 3);
  assert.equal(scope.meta.explicitPublicationCount, 1);
  assert.equal(scope.meta.memberAuthoredPublicationCount, 3);
  assert.equal(scope.meta.includeCoauthors, false);
  assert.equal(scope.meta.includeSimilarity, false);

  const similarity = graph.edges.filter(
    (edge) => edge.type === EDGE_TYPES.SIMILAR_TO && scope.edgeIds.has(edge.id),
  );
  assert.equal(similarity.length, 0, 'similarity is opt-in for scoped graphs');
});

test('laboratory scope can include external co-authors and similarity edges', () => {
  const graph = buildKnowledgeGraph(makeSource());
  const index = indexGraph(graph);
  const scope = resolveScope(graph, index, 'laboratory:lab-one', {
    includeCoauthors: true,
    includeSimilarity: true,
  });

  assert.ok(scope.nodeIds.has('person:dave'));
  const similarity = graph.edges.filter(
    (edge) => edge.type === EDGE_TYPES.SIMILAR_TO && scope.edgeIds.has(edge.id),
  );
  assert.equal(similarity.length, 1);
});

test('non-laboratory scopes include their related nodes', () => {
  const graph = buildKnowledgeGraph(makeSource());
  const index = indexGraph(graph);

  const personScope = resolveScope(graph, index, 'person:alice');
  assert.ok(personScope.nodeIds.has('publication:p1'));
  assert.ok(personScope.nodeIds.has('publication:p3'));
  assert.ok(personScope.nodeIds.has('laboratory:lab-one'));
  assert.ok(personScope.nodeIds.has('team:team-one'));
  assert.ok(personScope.nodeIds.has('project:project-one'));

  const teamScope = resolveScope(graph, index, 'team:team-one');
  assert.ok(teamScope.nodeIds.has('team:team-one'));
  assert.ok(teamScope.nodeIds.has('person:alice'));
  assert.ok(teamScope.nodeIds.has('person:carol'));
  assert.ok(teamScope.nodeIds.has('laboratory:lab-one'));
  assert.ok(teamScope.nodeIds.has('department:ai'));
  assert.ok(teamScope.nodeIds.has('project:project-one'));
  assert.equal(teamScope.meta.memberCount, 2);

  const projectScope = resolveScope(graph, index, 'project:project-one');
  assert.ok(projectScope.nodeIds.has('project:project-one'));
  assert.ok(projectScope.nodeIds.has('person:alice'));
  assert.ok(projectScope.nodeIds.has('team:team-one'));
  assert.ok(projectScope.nodeIds.has('department:ai'));
});

test('text search returns matches plus connected context', () => {
  const graph = buildKnowledgeGraph(makeSource());
  const result = runKnowledgeGraphQuery(graph, parseGraphQuery({ q: 'Alice' }));

  const ids = new Set(result.nodes.map((node) => node.id));
  assert.ok(ids.has('person:alice'));
  assert.ok(ids.has('publication:p1'));
  assert.ok(ids.has('publication:p3'));
  assert.ok(result.matches.some((match) => match.nodeId === 'person:alice'));
  assert.ok(result.nodes.length < graph.nodes.length);
  assert.deepEqual(
    result.graphOptions.labs.map((lab) => lab.value),
    ['lab-one'],
  );
});

test('type filters restrict the graph to the selected types', () => {
  const graph = buildKnowledgeGraph(makeSource());
  const result = runKnowledgeGraphQuery(
    graph,
    parseGraphQuery({ q: 'Alice', types: 'person' }),
  );

  assert.ok(result.nodes.length > 0);
  assert.ok(result.nodes.every((node) => node.type === NODE_TYPES.PERSON));
  assert.ok(
    result.matches.every((match) => {
      const node = result.nodes.find((entry) => entry.id === match.nodeId);
      return node?.type === NODE_TYPES.PERSON;
    }),
  );
});

test('hiding publications leaves a connected organisational graph', () => {
  const graph = buildKnowledgeGraph(makeSource());
  const types = Object.values(NODE_TYPES)
    .filter((type) => type !== NODE_TYPES.PUBLICATION)
    .join(',');
  const result = runKnowledgeGraphQuery(graph, parseGraphQuery({ types }));

  assert.ok(result.nodes.length > 0);
  assert.ok(!result.nodes.some((node) => node.type === NODE_TYPES.PUBLICATION));
  assert.ok(result.nodes.some((node) => node.type === NODE_TYPES.PERSON));
  assert.ok(result.nodes.some((node) => node.type === NODE_TYPES.LABORATORY));
  assert.ok(result.nodes.some((node) => node.type === NODE_TYPES.PROJECT));
  assert.ok(result.nodes.some((node) => node.type === NODE_TYPES.TEAM));
  assert.ok(result.nodes.some((node) => node.type === NODE_TYPES.DEPARTMENT));
  assert.ok(result.edges.length > 0, 'membership and project links remain');
  assert.ok(!result.nodes.some((node) => node.type === NODE_TYPES.TOPIC));
});

test('edge cap keeps the scope root and every kept node connected', () => {
  const source = makeSource();
  const ai = { documentId: 'macro-ai', name: 'Artificial Intelligence', slug: 'ai' };
  source.publications.push(
    ...Array.from({ length: 12 }, (_, index) =>
      publication(`extra-${index}`, `Extra Paper ${index}`, 2024, [source.people[0]], {
        macro: ai,
        domain: source.people[0].department.data,
      }),
    ),
  );

  const graph = buildKnowledgeGraph(source);
  const result = runKnowledgeGraphQuery(graph, {
    ...parseGraphQuery({ scope: 'department:ai' }),
    maxEdges: 20,
  });

  const department = result.nodes.find((node) => node.id === 'department:ai');
  assert.ok(department, 'scope root is present');
  assert.ok(
    result.edges.some(
      (edge) => edge.source === department.id || edge.target === department.id,
    ),
    'scope root keeps at least one link when the edge budget is tight',
  );

  const connected = new Set(
    result.edges.flatMap((edge) => [edge.source, edge.target]),
  );
  const isolated = result.nodes.filter((node) => !connected.has(node.id));
  assert.equal(isolated.length, 0, 'no node survives the cap without a link');
});

test('year filters narrow lab papers and their context', () => {
  const graph = buildKnowledgeGraph(makeSource());
  const result = runKnowledgeGraphQuery(
    graph,
    parseGraphQuery({ scope: 'laboratory:lab-one', yearMin: '2023' }),
  );

  const publicationIds = result.nodes
    .filter((node) => node.type === NODE_TYPES.PUBLICATION)
    .map((node) => node.id);
  assert.deepEqual(publicationIds.sort(), ['publication:p1']);
  assert.ok(result.nodes.some((node) => node.id === 'person:alice'));
});

test('laboratory-side publications relation also creates explicit links', () => {
  const lonely = publication('p4', 'Paper Four', 2019, []);
  const lab = {
    documentId: 'lab2',
    title: 'Lab Two',
    slug: 'lab-two',
    coordinator: { data: null },
    coCoordinator: { data: null },
    researchers: { data: [] },
    departments: { data: [] },
    publications: { data: [lonely] },
  };

  const graph = buildKnowledgeGraph({
    people: [],
    publications: [lonely],
    laboratories: [lab],
    teams: [],
    projects: [],
    links: [],
  });
  const index = indexGraph(graph);
  const scope = resolveScope(graph, index, 'laboratory:lab-two');

  assert.ok(scope.nodeIds.has('publication:p4'));
  assert.deepEqual(scope.publicationFlags.get('publication:p4'), {
    explicit: true,
    memberAuthored: false,
  });
  assert.equal(scope.meta.explicitPublicationCount, 1);
});

test('active graph exclusions are removed from the projection', () => {
  const excluded = publication('p9', 'Excluded Paper', 2021, []);
  excluded.openAlexId = 'W9';
  const kept = publication('p10', 'Kept Paper', 2021, []);
  kept.openAlexId = 'W10';

  const graph = buildKnowledgeGraph({
    people: [],
    publications: [excluded, kept],
    laboratories: [],
    teams: [],
    projects: [],
    links: [],
    exclusions: [
      {
        documentId: 'ex1',
        openAlexId: 'https://openalex.org/W9',
        scope: 'graphOnly',
        isActive: true,
      },
    ],
  });

  const ids = new Set(graph.nodes.map((node) => node.id));
  assert.ok(!ids.has('publication:p9'));
  assert.ok(ids.has('publication:p10'));
  assert.equal(graph.meta.stats.excludedPublications, 1);
});

test('unknown scope returns an empty result rather than the global graph', () => {
  const graph = buildKnowledgeGraph(makeSource());
  const result = runKnowledgeGraphQuery(
    graph,
    parseGraphQuery({ scope: 'laboratory:does-not-exist' }),
  );

  assert.equal(result.nodes.length, 0);
  assert.equal(result.scope.kind, 'laboratory');
});
