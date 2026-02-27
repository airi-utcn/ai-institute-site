import { notFound } from "next/navigation";
import {
  FaEnvelope,
  FaPhone,
  FaMapMarkerAlt,
  FaLink,
  FaCalendarAlt,
  FaExternalLinkAlt
} from "react-icons/fa";
import {
  getStaffMember,
  getPersonTeams,
  transformStaffData,
  transformPublicationData,
} from "@/lib/strapi";
import StaffDetailClient from "./StaffDetailClient";

export default async function PersonDetailPage({ params }) {
  const resolvedParams = await params;
  const slug = Array.isArray(resolvedParams?.slug) ? resolvedParams.slug[0] : resolvedParams?.slug;

  if (!slug) {
    notFound();
  }

  const [strapiPerson, personTeamsRaw] = await Promise.all([
    getStaffMember(slug),
    getPersonTeams(slug),
  ]);

  if (!strapiPerson) {
    notFound();
  }

  const [personEntry] = transformStaffData([strapiPerson]);

  if (!personEntry) {
    notFound();
  }

  const personData = strapiPerson.attributes ?? strapiPerson;

  const publicationsRaw = transformPublicationData(
    personData.publications?.data ?? personData.publications ?? []
  );

  // Normalize teams from API response
  const teams = personTeamsRaw.map((team) => {
    const t = team?.attributes ?? team ?? {};
    const deptEntry = t.department?.data ?? t.department;
    const deptAttr = deptEntry?.attributes ?? deptEntry ?? {};
    // Find this person's membership within the team
    const memberships = Array.isArray(t.members) ? t.members : [];
    const myMembership = memberships.find((m) => {
      const p = m?.person?.data ?? m?.person;
      const pAttr = p?.attributes ?? p ?? {};
      return pAttr.slug === slug || (p?.id && pAttr.slug === slug);
    });
    const projects = Array.isArray(t.projects?.data ?? t.projects)
      ? (t.projects?.data ?? t.projects).map((proj) => {
          const pAttr = proj?.attributes ?? proj ?? {};
          return { slug: pAttr.slug || '', title: pAttr.title || '', phase: pAttr.phase || '' };
        })
      : [];
    return {
      id: team?.id ?? null,
      slug: t.slug || '',
      name: t.name || '',
      description: t.description || '',
      department: deptEntry ? { name: deptAttr.name || '', slug: deptAttr.slug || '' } : null,
      role: myMembership?.role || '',
      isLead: !!myMembership?.isLead,
      projects,
    };
  });

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

  const person = {
    ...personEntry,
    department: personEntry.department || personEntry.departmentInfo?.name || "",
  };

  const iconMap = {
    mail: FaEnvelope,
    phone: FaPhone,
    location: FaMapMarkerAlt,
    link: FaLink,
    calendar: FaCalendarAlt,
    external: FaExternalLinkAlt,
  };

  const normalizeSocialUrl = (link) => {
    const url = link?.url || "";
    if (!url) return "";

    if (link.icon === "mail" && !/^mailto:/i.test(url) && url.includes("@")) {
      return `mailto:${url}`;
    }

    if (link.icon === "phone" && !/^tel:/i.test(url)) {
      return `tel:${url}`;
    }

    return url;
  };

  const getSocialLabel = (link) => link?.label || link?.url || "Link";

  return (
    <main className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="bg-gradient-to-r from-blue-600 to-blue-800 text-white">
        <div className="max-w-5xl mx-auto px-6 py-12">
          <div className="flex flex-col md:flex-row items-center gap-8">
            <div className="relative w-40 h-40 flex-shrink-0">
              {(() => {
                const imageSrc = person.image || "/people/Basic_avatar_image.png";
                return (
                  <img
                    src={imageSrc}
                    alt={person.name}
                    width={160}
                    height={160}
                    loading="lazy"
                    className="w-full h-full rounded-full object-cover border-4 border-white/30 shadow-xl"
                  />
                );
              })()}
            </div>
            <div className="text-center md:text-left">
              <h1 className="text-3xl md:text-4xl font-bold mb-2">{person.name}</h1>
              {person.title && (
                <p className="text-xl text-blue-100 mb-3">{person.title}</p>
              )}
              <div className="flex flex-wrap justify-center md:justify-start gap-4 text-sm">
                {person.email && (
                  <a
                    href={`mailto:${person.email}`}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-white/20 backdrop-blur-sm rounded-lg hover:bg-white/30 transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                    {person.email}
                  </a>
                )}
                {person.phone && (
                  <a
                    href={`tel:${person.phone}`}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-white/20 backdrop-blur-sm rounded-lg hover:bg-white/30 transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                    </svg>
                    {person.phone}
                  </a>
                )}
              </div>
              {person.socialLinks && person.socialLinks.length > 0 && (
                <div className="flex flex-wrap justify-center md:justify-start gap-3 mt-4">
                  {person.socialLinks.map((link, index) => {
                    const Icon = iconMap[link.icon] || FaLink;
                      const url = normalizeSocialUrl(link);
                    if (!url) return null;
                    const isExternal = /^https?:\/\//i.test(url);

                    return (
                      <a
                        key={`${link.label || link.url || index}-${index}`}
                        href={url}
                        {...(isExternal
                          ? { target: "_blank", rel: "noopener noreferrer" }
                          : {})}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-white/15 backdrop-blur-sm rounded-full border border-white/20 text-sm hover:bg-white/25 transition-colors"
                      >
                        <Icon className="w-4 h-4" />
                        <span className="truncate max-w-[160px]">{getSocialLabel(link)}</span>
                      </a>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 py-8">
        <StaffDetailClient person={person} publications={publications} teams={teams} slug={slug} />
      </div>
    </main>
  );
}
