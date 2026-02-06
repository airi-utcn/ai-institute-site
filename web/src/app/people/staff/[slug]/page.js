import { notFound } from "next/navigation";
import {
  getStaffMember,
  transformStaffData,
  transformPublicationData,
  transformProjectData,
} from "@/lib/strapi";
import StaffDetailClient from "./StaffDetailClient";

export default async function StaffDetailPage({ params }) {
  // In Next.js 15+, params is a Promise
  const resolvedParams = await params;
  const slug = Array.isArray(resolvedParams?.slug)
    ? resolvedParams.slug[0]
    : resolvedParams?.slug;

  if (!slug) {
    notFound();
  }

  const strapiPerson = await getStaffMember(slug);

  if (!strapiPerson) {
    notFound();
  }

  const [personEntry] = transformStaffData([strapiPerson]);

  if (!personEntry) {
    notFound();
  }

  // Handle both Strapi 4 (with attributes) and Strapi 5 (flat) formats
  const personData = strapiPerson.attributes ?? strapiPerson;

  const publicationsRaw = transformPublicationData(
    personData.publications?.data ?? personData.publications ?? [],
  );

  const leadingProjectsRaw = transformProjectData(
    personData.leading_projects?.data ?? personData.leading_projects ?? [],
  );

  const memberProjectsRaw = transformProjectData(
    personData.projects?.data ?? personData.projects ?? [],
  );

  const normalizePublication = (pub) => ({
    id: pub.id ?? null,
    slug: pub.slug || "",
    title: pub.title || "",
    year: pub.year ?? null,
    domain: pub.domain || "",
    kind: pub.kind || "",
    description: pub.description || "",
    authors: Array.isArray(pub.authors)
      ? pub.authors.map((author) => author?.name).filter(Boolean)
      : [],
    pdfFile: pub.pdfFile || null,
  });

  const publications = publicationsRaw.map(normalizePublication);

  const projectMap = new Map();

  const mergeProject = (project) => {
    if (!project?.slug && !project?.title) return;
    const key = project.slug || project.title;
    if (projectMap.has(key)) return;

    const leadName =
      typeof project.lead === "string"
        ? project.lead
        : project.lead?.name || project.leadName || "";
    const leadSlug =
      typeof project.lead === "object" && project.lead
        ? project.lead.slug || ""
        : project.leadSlug || "";

    projectMap.set(key, {
      id: project.id ?? null,
      slug: project.slug || key,
      title: project.title || "",
      lead: leadName,
      leadName,
      leadSlug,
      abstract: project.abstract || "",
      themes: Array.isArray(project.themes) ? project.themes : [],
      teams: Array.isArray(project.teams) ? project.teams : [],
      region: project.region || "",
      domain: Array.isArray(project.domain) ? project.domain : [],
      partners: Array.isArray(project.partners) ? project.partners : [],
      docUrl: project.docUrl || "",
      oficialUrl: project.oficialUrl || project.officialUrl || "",
    });
  };

  leadingProjectsRaw.forEach(mergeProject);
  memberProjectsRaw.forEach(mergeProject);

  const projects = Array.from(projectMap.values());

  const person = {
    ...personEntry,
    department:
      personEntry.department || personEntry.departmentInfo?.name || "",
  };

  return (
    <main className="max-w-5xl mx-auto p-6 bg-white dark:bg-gray-950 text-black dark:text-white rounded-lg shadow-lg">
      {/* Header */}
      <div className="flex flex-col items-center text-center mb-8">
        <div className="relative w-36 h-36 mx-auto mb-4">
          {(() => {
            const imageSrc = person.image || "/people/Basic_avatar_image.png";
            return (
              <img
                src={imageSrc}
                alt={person.name}
                width={144}
                height={144}
                loading="lazy"
                className="absolute inset-0 w-full h-full rounded-full object-cover"
              />
            );
          })()}
        </div>
        <h1 className="text-3xl font-bold text-blue-700 dark:text-blue-300 mb-2">
          {person.name}
        </h1>
        {person.title && <p className="text-lg font-medium">{person.title}</p>}

        {person.extraTitles && (
          <div className="text-gray-600 dark:text-gray-400 mb-2">
            {Array.isArray(person.extraTitles)
              ? person.extraTitles.join(", ")
              : typeof person.extraTitles === "object"
                ? JSON.stringify(person.extraTitles) // Fallback if object
                : String(person.extraTitles)}
          </div>
        )}

        <div className="flex flex-col items-center gap-1 mt-2 text-gray-700 dark:text-gray-300">
          {person.email && (
            <a
              href={`mailto:${person.email}`}
              className="hover:text-blue-600 dark:hover:text-blue-400"
            >
              {person.email}
            </a>
          )}
          {person.phone && <p>{person.phone}</p>}
          {person.location && (
            <p className="flex items-center gap-1">
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                />
              </svg>
              {person.location}
            </p>
          )}
        </div>

        {person.socialLinks && person.socialLinks.length > 0 && (
          <div className="flex flex-wrap justify-center gap-4 mt-4">
            {person.socialLinks.map((link, idx) => (
              <a
                key={idx}
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition text-sm"
              >
                <span>{link.label}</span>
                <svg
                  className="w-3 h-3"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                  />
                </svg>
              </a>
            ))}
          </div>
        )}
      </div>

      <StaffDetailClient
        person={person}
        publications={publications}
        projects={projects}
        slug={slug}
      />
    </main>
  );
}
