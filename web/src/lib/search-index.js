import {
  getDepartments,
  getEvents,
  getNewsArticles,
  getPartners,
  getProjects,
  getPublications,
  getResearchThemes,
  getResources,
  getSeminars,
  getStaff,
  transformDepartmentData,
  transformEventData,
  transformNewsData,
  transformPartnerData,
  transformProjectData,
  transformPublicationData,
  transformResourceData,
  transformSeminarData,
  transformStaffData,
} from "@/lib/strapi";
import { toPublicationSlug } from "@/lib/slug";

const STATIC_ENTRIES = [
  { title: "Home", route: "/", tags: ["home", "landing"], snippet: "Artificial Intelligence Research Institute homepage." },
  { title: "About", route: "/about", tags: ["about", "mission", "history"], snippet: "Mission, history, and institutional overview." },
  { title: "Reports", route: "/about/reports", tags: ["about", "reports", "self-assessment"], snippet: "Reports and self-assessment materials." },
  { title: "Procedures & Regulations", route: "/about/procedures-regulations", tags: ["about", "procedures", "regulations"], snippet: "Policies, procedures, and regulations." },
  { title: "Guidelines", route: "/about/guidelines", tags: ["about", "guidelines", "onboarding"], snippet: "Onboarding guidance and practical information." },
  { title: "Rooms & Calendar", route: "/about/rooms-calendar", tags: ["about", "rooms", "calendar"], snippet: "Rooms, schedules, and calendar information." },
  { title: "Organigram", route: "/about/organigram", tags: ["about", "organigram", "structure"], snippet: "Institutional structure and committees." },
  { title: "Virtual Tour", route: "/about/virtual-tour", tags: ["about", "virtual tour", "3d"], snippet: "Virtual tour of the institute." },
  { title: "Sitemap", route: "/about/sitemap", tags: ["about", "sitemap"], snippet: "Overview of the website structure." },
  { title: "Contact", route: "/contact", tags: ["contact", "location", "email"], snippet: "Contact details and ways to reach AIRI." },
  { title: "Collaborators", route: "/collaborators", tags: ["partners", "collaborators"], snippet: "Partner and collaborator overview." },
  { title: "Media", route: "/media", tags: ["media", "gallery", "press"], snippet: "Media coverage and gallery content." },
  { title: "Timeline", route: "/timeline", tags: ["timeline", "history", "milestones"], snippet: "Key milestones in AIRI's history." },
  { title: "People", route: "/people", tags: ["people", "researchers", "staff"], snippet: "Researchers, staff, alumni, and visitors." },
  { title: "Resources", route: "/resources", tags: ["resources", "tools", "apis"], snippet: "Research tools, APIs, and learning resources." },
  { title: "Research Themes", route: "/research/themes", tags: ["research", "themes", "areas"], snippet: "Research themes and linked projects and publications." },
  { title: "Research Departments", route: "/research/departments", tags: ["research", "departments"], snippet: "Research departments and their members." },
  { title: "Projects", route: "/research/projects", tags: ["research", "projects"], snippet: "Research projects across the institute." },
  { title: "Publications", route: "/research/publications", tags: ["research", "publications", "papers"], snippet: "Academic publications and papers." },
  { title: "Paper Graph", route: "/research/paper-graph", tags: ["research", "graph", "publications"], snippet: "Interactive publication graph and communities." },
  { title: "Tools", route: "/research/tools", tags: ["research", "tools", "infrastructure"], snippet: "Research infrastructure and tools." },
  { title: "Thesis", route: "/research/thesis", tags: ["research", "thesis"], snippet: "Thesis and related research work." },
  { title: "Engagement", route: "/engagement", tags: ["engagement", "outreach"], snippet: "Overview of public, academic, and industry engagement." },
  { title: "Public Engagement", route: "/engagement/public", tags: ["engagement", "public"], snippet: "Public-facing outreach and events." },
  { title: "Academic Engagement", route: "/engagement/academic", tags: ["engagement", "academic", "students"], snippet: "Academic programs and student engagement." },
  { title: "Industry Engagement", route: "/engagement/industry", tags: ["engagement", "industry"], snippet: "Industry collaboration and applied AI work." },
  { title: "High-School Engagement", route: "/engagement/high-school", tags: ["engagement", "high-school", "outreach"], snippet: "High-school outreach and learning activities." },
  { title: "Partners", route: "/engagement/partners", tags: ["engagement", "partners"], snippet: "Strategic partners and collaborations." },
  { title: "Industrial PhD", route: "/engagement/industrial-phd", tags: ["engagement", "industrial phd", "doctoral"], snippet: "Industrial PhD opportunities and information." },
  { title: "News", route: "/news&events/news", tags: ["news", "updates"], snippet: "News and announcements from AIRI." },
  { title: "Events", route: "/news&events/events", tags: ["events", "calendar"], snippet: "Events and upcoming activities." },
  { title: "Seminars", route: "/news&events/seminars", tags: ["events", "seminars"], snippet: "Seminar offerings and sessions." },
  { title: "Careers", route: "/news&events/careers", tags: ["careers", "jobs"], snippet: "Career and job opportunities." },
  { title: "Awards", route: "/news&events/awards", tags: ["news", "awards"], snippet: "Awards and recognitions." },
  { title: "Open Project Calls", route: "/news&events/open-project-calls", tags: ["projects", "open calls", "funding"], snippet: "Open project calls and funding opportunities." },
  { title: "Classic Search", route: "/search/classic", tags: ["search", "classic"], snippet: "Classic site-wide search." },
  { title: "Chatbot Search", route: "/search/chatbot", tags: ["search", "chatbot"], snippet: "AI chatbot search interface." },
  { title: "Knowledge Graph Search", route: "/search/knowledge-graph", tags: ["search", "knowledge graph"], snippet: "Knowledge graph exploration entry point." },
];

function asArray(value) {
  return Array.isArray(value) ? value : value ? [value] : [];
}

function stripHtml(value) {
  return typeof value === "string"
    ? value.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim()
    : "";
}

function truncate(value, maxLength = 220) {
  const text = stripHtml(value);
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength - 1).trim()}…`;
}

function normalizeTags(tags) {
  return Array.from(
    new Set(
      asArray(tags)
        .map((tag) => (typeof tag === "string" ? tag.trim() : String(tag || "").trim()))
        .filter(Boolean)
    )
  );
}

function makeEntry({ title, route, tags = [], snippet = "" }) {
  const cleanTitle = typeof title === "string" ? title.trim() : "";
  const cleanRoute = typeof route === "string" ? route.trim() : "";
  if (!cleanTitle || !cleanRoute) return null;

  return {
    title: cleanTitle,
    route: cleanRoute,
    tags: normalizeTags(tags),
    snippet: truncate(snippet),
  };
}

function dedupeEntries(entries) {
  const seen = new Set();
  return entries.filter((entry) => {
    if (!entry) return false;
    const key = `${entry.route}::${entry.title}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function buildPublicationEntries(publications) {
  return publications.map((publication) => {
    const slug = toPublicationSlug(publication);
    const authorNames = asArray(publication.authors).map((author) => author?.name).filter(Boolean);
    return makeEntry({
      title: publication.title,
      route: slug ? `/research/publications/${encodeURIComponent(slug)}` : "/research/publications",
      tags: [
        "publication",
        "paper",
        publication.kind,
        publication.domain,
        ...authorNames,
        ...asArray(publication.topics),
      ],
      snippet: publication.abstract || publication.description || `${authorNames.join(", ")}${publication.year ? ` · ${publication.year}` : ""}`,
    });
  });
}

function buildPersonEntries(people) {
  return people.map((person) =>
    makeEntry({
      title: person.name,
      route: person.slug ? `/people/${encodeURIComponent(person.slug)}` : "/people",
      tags: ["person", person.type, person.title, person.department],
      snippet: person.bio || `${person.title || ""}${person.department ? ` · ${person.department}` : ""}`,
    })
  );
}

function buildProjectEntries(projects) {
  return projects.map((project) =>
    makeEntry({
      title: project.title,
      route: project.slug ? `/research/projects/${encodeURIComponent(project.slug)}` : "/research/projects",
      tags: [
        "project",
        ...asArray(project.domain),
        ...asArray(project.themes),
        ...asArray(project.partners),
      ],
      snippet: project.abstract || asArray(project.domain).join(", "),
    })
  );
}

function buildDepartmentEntries(departments) {
  return departments.map((department) =>
    makeEntry({
      title: department.name,
      route: department.slug ? `/research/departments/${encodeURIComponent(department.slug)}` : "/research/departments",
      tags: ["department", department.type, department.coordinator, department.coCoordinator],
      snippet: department.summary || department.description,
    })
  );
}

function buildThemeEntries(themes) {
  return themes.map((theme) => {
    const raw = theme?.attributes ?? theme ?? {};
    const name = raw.name || "";
    return makeEntry({
      title: name,
      route: `/research/publications?theme=${encodeURIComponent(name)}`,
      tags: ["theme", "research", name],
      snippet: raw.summary || `Research theme: ${name}`,
    });
  });
}

function buildResourceEntries(resources) {
  return resources.map((resource) =>
    makeEntry({
      title: resource.title,
      route: resource.url || "/resources",
      tags: ["resource", resource.category, ...asArray(resource.tags), resource.department?.name],
      snippet: resource.description,
    })
  );
}

function buildNewsEntries(newsItems) {
  return newsItems.map((item) =>
    makeEntry({
      title: item.title,
      route: item.linkUrl || "/news&events/news",
      tags: ["news", item.category, ...asArray(item.tags)],
      snippet: item.summary,
    })
  );
}

function buildEventEntries(events) {
  return events.map((event) =>
    makeEntry({
      title: event.title,
      route: event.url || "/news&events/events",
      tags: ["event", event.category, event.location],
      snippet: event.description || [event.location, event.startDate].filter(Boolean).join(" · "),
    })
  );
}

function buildSeminarEntries(seminars) {
  return seminars.map((seminar) =>
    makeEntry({
      title: seminar.title,
      route: seminar.url || "/news&events/seminars",
      tags: ["seminar", ...asArray(seminar.modules)],
      snippet: asArray(seminar.about).join(" "),
    })
  );
}

function buildPartnerEntries(partners) {
  return partners.map((partner) =>
    makeEntry({
      title: partner.name,
      route: partner.slug ? `/engagement/partners/${partner.slug}` : partner.url || "/collaborators",
      tags: ["partner", partner.country],
      snippet: partner.description || partner.country,
    })
  );
}

export async function buildSearchIndex() {
  const [
    publicationRows,
    staffRows,
    projectRows,
    departmentRows,
    themeRows,
    resourceRows,
    newsRows,
    eventRows,
    seminarRows,
    partnerRows,
  ] = await Promise.all([
    getPublications({ includeUnlisted: true, graphEligibleOnly: true }),
    getStaff(),
    getProjects(),
    getDepartments(),
    getResearchThemes(),
    getResources(),
    getNewsArticles(),
    getEvents(),
    getSeminars(),
    getPartners(),
  ]);

  const publications = transformPublicationData(publicationRows);
  const people = transformStaffData(staffRows);
  const projects = transformProjectData(projectRows);
  const departments = transformDepartmentData(departmentRows);
  const resources = transformResourceData(resourceRows);
  const newsItems = transformNewsData(newsRows);
  const events = transformEventData(eventRows);
  const seminars = transformSeminarData(seminarRows);
  const partners = transformPartnerData(partnerRows);

  return dedupeEntries([
    ...STATIC_ENTRIES.map(makeEntry),
    ...buildPublicationEntries(publications),
    ...buildPersonEntries(people),
    ...buildProjectEntries(projects),
    ...buildDepartmentEntries(departments),
    ...buildThemeEntries(themeRows),
    ...buildResourceEntries(resources),
    ...buildNewsEntries(newsItems),
    ...buildEventEntries(events),
    ...buildSeminarEntries(seminars),
    ...buildPartnerEntries(partners),
  ]).sort((a, b) => a.title.localeCompare(b.title));
}