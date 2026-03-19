import {
  getStaff,
  getProjects,
  getPublications,
  getDepartments,
  getNewsArticles,
  getEvents,
  getSeminars,
  transformStaffData,
  transformProjectData,
  transformPublicationData,
  transformDepartmentData,
  transformNewsData,
  transformEventData,
  transformSeminarData,
} from "@/lib/strapi";

const SITE_URL = "https://airi.utcluj.ro";

/**
 * Dynamic sitemap generated from Strapi content.
 * @see https://nextjs.org/docs/app/api-reference/file-conventions/metadata/sitemap
 */
export default async function sitemap() {
  // ── Static pages ──────────────────────────────────────────────────────────
  const staticPages = [
    { url: `${SITE_URL}`, changeFrequency: "weekly", priority: 1.0 },
    { url: `${SITE_URL}/about`, changeFrequency: "monthly", priority: 0.8 },
    { url: `${SITE_URL}/about/reports`, changeFrequency: "monthly", priority: 0.5 },
    { url: `${SITE_URL}/about/procedures-regulations`, changeFrequency: "monthly", priority: 0.4 },
    { url: `${SITE_URL}/about/rooms-calendar`, changeFrequency: "monthly", priority: 0.4 },
    { url: `${SITE_URL}/about/organigram`, changeFrequency: "monthly", priority: 0.5 },
    { url: `${SITE_URL}/about/virtual-tour`, changeFrequency: "yearly", priority: 0.4 },
    { url: `${SITE_URL}/about/guidelines`, changeFrequency: "monthly", priority: 0.4 },
    { url: `${SITE_URL}/about/sitemap`, changeFrequency: "monthly", priority: 0.3 },
    { url: `${SITE_URL}/people`, changeFrequency: "weekly", priority: 0.8 },
    { url: `${SITE_URL}/research/departments`, changeFrequency: "monthly", priority: 0.7 },
    { url: `${SITE_URL}/research/projects`, changeFrequency: "weekly", priority: 0.7 },
    { url: `${SITE_URL}/research/publications`, changeFrequency: "weekly", priority: 0.7 },
    { url: `${SITE_URL}/research/themes`, changeFrequency: "monthly", priority: 0.6 },
    { url: `${SITE_URL}/research/thesis`, changeFrequency: "monthly", priority: 0.5 },
    { url: `${SITE_URL}/news&events/news`, changeFrequency: "weekly", priority: 0.7 },
    { url: `${SITE_URL}/news&events/events`, changeFrequency: "weekly", priority: 0.7 },
    { url: `${SITE_URL}/news&events/seminars`, changeFrequency: "weekly", priority: 0.6 },
    { url: `${SITE_URL}/news&events/careers`, changeFrequency: "monthly", priority: 0.5 },
    { url: `${SITE_URL}/news&events/awards`, changeFrequency: "monthly", priority: 0.5 },
    { url: `${SITE_URL}/news&events/open-project-calls`, changeFrequency: "monthly", priority: 0.5 },
    { url: `${SITE_URL}/engagement`, changeFrequency: "monthly", priority: 0.6 },
    { url: `${SITE_URL}/resources`, changeFrequency: "monthly", priority: 0.6 },
    { url: `${SITE_URL}/media`, changeFrequency: "monthly", priority: 0.5 },
    { url: `${SITE_URL}/contact`, changeFrequency: "yearly", priority: 0.5 },
    { url: `${SITE_URL}/timeline`, changeFrequency: "monthly", priority: 0.4 },
  ];

  // ── Dynamic pages from Strapi ─────────────────────────────────────────────
  let dynamicPages = [];

  try {
    const [staffRaw, projectsRaw, publicationsRaw, departmentsRaw, newsRaw, eventsRaw, seminarsRaw] =
      await Promise.all([
        getStaff().catch(() => []),
        getProjects().catch(() => []),
        getPublications().catch(() => []),
        getDepartments().catch(() => []),
        getNewsArticles({ pageSize: 1000 }).catch(() => []),
        getEvents().catch(() => []),
        getSeminars().catch(() => []),
      ]);

    const staff = transformStaffData(staffRaw);
    const projects = transformProjectData(projectsRaw);
    const publications = transformPublicationData(publicationsRaw);
    const departments = transformDepartmentData(departmentsRaw);
    const news = transformNewsData(newsRaw);
    const events = transformEventData(eventsRaw);
    const seminars = transformSeminarData(seminarsRaw);

    // People profiles
    dynamicPages.push(
      ...staff
        .filter((p) => p.slug)
        .map((p) => ({
          url: `${SITE_URL}/people/${p.slug}`,
          changeFrequency: "monthly",
          priority: 0.6,
        }))
    );

    // Departments
    dynamicPages.push(
      ...departments
        .filter((d) => d.slug)
        .map((d) => ({
          url: `${SITE_URL}/research/departments/${d.slug}`,
          changeFrequency: "monthly",
          priority: 0.7,
        }))
    );

    // Projects
    dynamicPages.push(
      ...projects
        .filter((p) => p.slug)
        .map((p) => ({
          url: `${SITE_URL}/research/projects/${p.slug}`,
          changeFrequency: "monthly",
          priority: 0.6,
        }))
    );

    // Publications
    dynamicPages.push(
      ...publications
        .filter((p) => p.slug)
        .map((p) => ({
          url: `${SITE_URL}/research/publications/${p.slug}`,
          changeFrequency: "yearly",
          priority: 0.5,
        }))
    );
  } catch (error) {
    console.error("Sitemap: failed to fetch dynamic content from Strapi", error);
  }

  return [...staticPages, ...dynamicPages];
}
