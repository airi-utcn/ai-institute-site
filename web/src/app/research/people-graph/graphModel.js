// Pure helpers that turn raw Strapi `people` records into the { nodes, links }
// shape consumed by react-force-graph. No React, no I/O — easy to reason about
// and test. Edges are derived from shared publications / projects / teams.
// Department is intentionally NOT an edge: it is a broad one-per-person org
// bucket, so it drives node color only, not connectivity.

// Distinct, reasonably readable palette for department coloring.
const DEPARTMENT_PALETTE = [
  "#4ecdc4", "#ff6b6b", "#45b7d1", "#ffa94d", "#9775fa",
  "#69db7c", "#f783ac", "#ffd43b", "#4dabf7", "#da77f2",
  "#63e6be", "#ff8787", "#74c0fc", "#b197fc", "#ffe066",
  "#8ce99a", "#faa2c1", "#a9e34b", "#66d9e8", "#e599f7",
];
const NO_DEPARTMENT_COLOR = "#868e96";

// Guard against pathological co-membership groups (e.g. an imported paper with a
// huge author list) producing an O(n^2) explosion of meaningless edges.
const MAX_GROUP_SIZE = 60;

const personName = (p) =>
  p.fullName || [p.firstName, p.lastName].filter(Boolean).join(" ").trim() || "Unknown";

const pairKey = (a, b) => (a < b ? `${a}|${b}` : `${b}|${a}`);

// Deterministic color per department, ordered by name so colors are stable
// across reloads regardless of fetch order.
function buildDepartmentColors(people) {
  const names = Array.from(
    new Set(people.map((p) => p.department?.name).filter(Boolean))
  ).sort((a, b) => a.localeCompare(b, "en", { sensitivity: "base" }));

  const colors = {};
  names.forEach((name, i) => {
    colors[name] = DEPARTMENT_PALETTE[i % DEPARTMENT_PALETTE.length];
  });
  return colors;
}

// Map of sharedItemId -> { title, members: [personId, ...] } from a relation accessor.
function groupByRelation(people, getItems) {
  const groups = new Map();
  people.forEach((p) => {
    (getItems(p) || []).forEach((item) => {
      if (!item || item.id == null) return;
      let group = groups.get(item.id);
      if (!group) {
        group = { title: item.title || null, members: [] };
        groups.set(item.id, group);
      }
      group.members.push(p.id);
    });
  });
  return groups;
}

// Accumulate pairwise shared-counts (and the shared item titles, for tooltips)
// from co-membership groups into the edge map.
function accumulatePairs(groups, edgeMap, countKey, titlesKey) {
  groups.forEach(({ title, members }) => {
    if (members.length < 2 || members.length > MAX_GROUP_SIZE) return;
    for (let i = 0; i < members.length; i++) {
      for (let j = i + 1; j < members.length; j++) {
        const a = members[i];
        const b = members[j];
        if (a === b) continue;
        const key = pairKey(a, b);
        let edge = edgeMap.get(key);
        if (!edge) {
          edge = {
            source: a < b ? a : b,
            target: a < b ? b : a,
            sharedPublications: 0,
            sharedProjects: 0,
            sharedTeams: 0,
            sharedPublicationTitles: [],
            sharedProjectTitles: [],
            sharedTeamNames: [],
          };
          edgeMap.set(key, edge);
        }
        edge[countKey] += 1;
        if (title) edge[titlesKey].push(title);
      }
    }
  });
}

// Teams are a person->team membership that lives on the team side (a component),
// so it can't be read off the person record. Turn the [{ id, name, memberIds }]
// list from getTeamsGraphData() into the same sharedItemId -> members shape.
function groupByTeam(teams) {
  const groups = new Map();
  teams.forEach((t) => {
    if (!t || t.id == null) return;
    groups.set(t.id, { title: t.name || null, members: (t.memberIds || []).slice() });
  });
  return groups;
}

/**
 * Build the collaboration graph from raw people records.
 * @param {Array} people - records from getPeopleGraphData()
 * @param {Array} teams - [{ id, name, memberIds }] from getTeamsGraphData()
 * @returns {{ nodes: Array, links: Array, departmentColors: Object }}
 */
export function buildGraph(people = [], teams = []) {
  const departmentColors = buildDepartmentColors(people);

  // Reverse the team->members list into person id -> [{ id, title }] so each
  // node can carry its own teams for the detail panel and search.
  const teamsByPerson = new Map();
  teams.forEach((t) => {
    if (!t || t.id == null) return;
    (t.memberIds || []).forEach((pid) => {
      if (!teamsByPerson.has(pid)) teamsByPerson.set(pid, []);
      teamsByPerson.get(pid).push({ id: t.id, title: t.name || null });
    });
  });

  const nodes = people.map((p) => {
    const deptName = p.department?.name || null;
    const pubs = p.publications || [];
    const personTeams = teamsByPerson.get(p.id) || [];
    return {
      id: p.id,
      slug: p.slug || null,
      name: personName(p),
      firstName: p.firstName || "",
      lastName: p.lastName || "",
      type: p.type || null,
      title: p.title || null,
      departmentName: deptName,
      departmentSlug: p.department?.slug || null,
      color: deptName ? departmentColors[deptName] : NO_DEPARTMENT_COLOR,
      publicationCount: pubs.length,
      // Lifetime Google Scholar total (from attachScholarCitationCounts), not the
      // summed cited_by of CMS-linked papers — those undercount people whose work
      // isn't fully indexed in the CMS (e.g. 0 linked pubs but 11k Scholar cites).
      citationCount: p.scholarCitationCount || 0,
      projectCount: (p.contributingProjects || []).length,
      projects: (p.contributingProjects || []).map((x) => ({ id: x.id, title: x.title })),
      teamCount: personTeams.length,
      teams: personTeams,
      degree: 0,
    };
  });

  const pubGroups = groupByRelation(people, (p) => p.publications);
  const projGroups = groupByRelation(people, (p) => p.contributingProjects);
  const teamGroups = groupByTeam(teams);

  const edgeMap = new Map();
  accumulatePairs(pubGroups, edgeMap, "sharedPublications", "sharedPublicationTitles");
  accumulatePairs(projGroups, edgeMap, "sharedProjects", "sharedProjectTitles");
  accumulatePairs(teamGroups, edgeMap, "sharedTeams", "sharedTeamNames");

  const links = Array.from(edgeMap.values()).map((e) => ({
    ...e,
    weight: e.sharedPublications + e.sharedProjects + e.sharedTeams,
  }));

  // Degree = number of distinct collaborators.
  const degree = new Map();
  links.forEach((l) => {
    degree.set(l.source, (degree.get(l.source) || 0) + 1);
    degree.set(l.target, (degree.get(l.target) || 0) + 1);
  });
  nodes.forEach((n) => {
    n.degree = degree.get(n.id) || 0;
  });

  return { nodes, links, departmentColors };
}
