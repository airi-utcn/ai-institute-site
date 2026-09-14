"use client";

import { useMemo } from "react";
import Link from "next/link";
import { toPublicationSlug } from "@/lib/slug";
import BodyContentImage from "@/components/shared/BodyContentImage";
import RichMarkdown from "@/components/shared/RichMarkdown";
import { getPhaseColorClasses, getProjectPhase } from "@/lib/projectPhase";

const FALLBACK_AVATAR = "/people/Basic_avatar_image.png";

const PROJECT_DETAILS_TEXTS = {
  backToProfile: "← Back to profile",
  projectDetails: "Project Details",
  visitWebsite: "Visit Website",
  documentation: "Documentation",
  projectTimeline: "Project Timeline",
  resources: "Resources",
  relatedPublications: "Related Publications",
  details: "Details",
  visitProjectWebsite: "Visit Project Website",
  viewDocumentation: "View Documentation",
  projectTeam: "Project Team",
  lead: "Lead",
  members: "Members",
  partners: "Partners",
  themes: "Themes",
  researchAreas: "Research Areas",
};

export default function ProjectDetailClient({
  staffSlug,
  project,
  publications = [],
  teamMembers = [],
}) {
  const t = (k) => PROJECT_DETAILS_TEXTS[k] || k;

  const domainList = useMemo(
    () => (Array.isArray(project?.domain) ? project.domain : []),
    [project?.domain]
  );

  const themesList = useMemo(
    () => (Array.isArray(project?.themesData) ? project.themesData : []),
    [project?.themesData]
  );

  const partnersList = useMemo(
    () => (Array.isArray(project?.partnersData) ? project.partnersData : project?.partners || []),
    [project?.partnersData, project?.partners]
  );

  const publicationsList = useMemo(
    () => (Array.isArray(publications) ? publications : []),
    [publications]
  );

  const leadMembers = useMemo(() => {
    return [...teamMembers].filter((member) => Boolean(member?.isLead));
  }, [teamMembers]);

  const regularMembers = useMemo(() => {
    return [...teamMembers].filter((member) => !member?.isLead);
  }, [teamMembers]);

  const orderedMembers = useMemo(() => {
    return [...teamMembers].sort((a, b) =>
      Number(Boolean(b?.isLead)) - Number(Boolean(a?.isLead))
    );
  }, [teamMembers]);

  const officialWebsiteUrl =
    project?.officialWebsiteUrl ||
    project?.url ||
    project?.website ||
    "";

  const resourceLinks = useMemo(() => {
    if (!Array.isArray(project?.resources)) return [];
    return project.resources
      .map((resource) => {
        if (!resource?.url) return null;
        return {
          title: resource.title || resource.url,
          url: resource.url,
          category: resource.category || "general",
        };
      })
      .filter(Boolean);
  }, [project?.resources]);

  const documentationUrlRaw =
    resourceLinks.find((resource) => resource?.category === "documentation")?.url ||
    "";
  const documentationUrl = documentationUrlRaw && documentationUrlRaw !== officialWebsiteUrl ? documentationUrlRaw : "";

  const bodyBlocks = Array.isArray(project?.body) ? project.body : [];
  const timeline = Array.isArray(project?.timeline) ? project.timeline : [];
  const hasBody = bodyBlocks.length > 0;

  const getTranslatedPhase = (phase) => {
    if (!phase) return "";
    return phase.charAt(0).toUpperCase() + phase.slice(1);
  };
  const markdownClassName = "prose prose-lg dark:prose-invert max-w-none text-gray-700 dark:text-gray-300";

  const renderBlock = (block, index) => {
    if (!block) return null;
    switch (block.__component) {
      case "shared.rich-text":
        return (
          <RichMarkdown
            key={`rich-${index}`}
            content={block.body}
            className={markdownClassName}
          />
        );
      case "shared.section":
        return (
          <section key={`section-${index}`} className="my-8 first:mt-0">
            {block.heading && (
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                {block.heading}
              </h2>
            )}
            <RichMarkdown
              content={block.body}
              className={markdownClassName}
            />
          </section>
        );
      case "shared.media":
        return (
          <BodyContentImage
            key={`media-${index}`}
            block={block}
            className="my-8 rounded-xl shadow-lg border border-gray-100 dark:border-gray-800"
          />
        );
      case "shared.slider":
        return (
          <div key={`slider-${index}`} className="my-8 space-y-4">
            {Array.isArray(block.files) &&
              block.files.map((file, fileIndex) => (
                <BodyContentImage
                  key={`slide-${index}-${fileIndex}`}
                  block={{ file }}
                  className="rounded-xl shadow-lg border border-gray-100 dark:border-gray-800"
                />
              ))}
          </div>
        );
      default:
        return null;
    }
  };

  const projectPhase = getProjectPhase(project?.startDate, project?.endDate);
  const phaseColors = getPhaseColorClasses(projectPhase);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Back Link */}
        <div className="mb-6">
          <Link
            href={`/people/${encodeURIComponent(staffSlug)}`}
            className="inline-flex items-center gap-2 text-sm text-blue-600 dark:text-blue-400 hover:underline font-medium"
          >
            {t("backToProfile")}
          </Link>
        </div>

        {/* Hero Header */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-md border border-gray-100 dark:border-gray-700 p-8 mb-8">
          <div className="flex flex-wrap items-center gap-3 mb-4">
            {projectPhase && (
              <span className={`text-xs px-3 py-1 rounded-full font-semibold ${phaseColors.badge}`}>
                {getTranslatedPhase(projectPhase)}
              </span>
            )}
            {(project?.startDate || project?.endDate) && (
              <span className="text-xs px-3 py-1 rounded-full font-medium bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300">
                📅 {project?.startDate || "?"} — {project?.endDate || "?"}
              </span>
            )}
            {project?.acronym && (
              <span className="text-xs px-3 py-1 rounded-full font-mono font-semibold bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400">
                {project.acronym}
              </span>
            )}
          </div>

          <h1 className="text-3xl sm:text-4xl font-extrabold text-gray-900 dark:text-white mb-4">
            {project?.title || t("projectDetails")}
          </h1>

          {project?.description && (
            <p className="text-lg text-gray-600 dark:text-gray-300 leading-relaxed max-w-4xl">
              {project.description}
            </p>
          )}

          {/* Action buttons */}
          <div className="flex flex-wrap gap-3 mt-6">
            {officialWebsiteUrl && (
              <a
                href={officialWebsiteUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-medium text-sm transition-colors shadow-sm"
              >
                {t("visitWebsite")}
              </a>
            )}
            {documentationUrl && (
              <a
                href={documentationUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200 font-medium text-sm transition-colors"
              >
                {t("documentation")}
              </a>
            )}
          </div>
        </div>

        {/* Content Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Body */}
          <div className="lg:col-span-2 space-y-8">
            {/* Dynamic Body Content */}
            {hasBody && (
              <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-md border border-gray-100 dark:border-gray-700 p-8">
                {bodyBlocks.map(renderBlock)}
              </div>
            )}

            {/* Fallback rich text if no blocks */}
            {!hasBody && project?.content && (
              <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-md border border-gray-100 dark:border-gray-700 p-8">
                <RichMarkdown
                  content={project.content}
                  className={markdownClassName}
                />
              </div>
            )}

            {/* Timeline */}
            {timeline.length > 0 && (
              <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-md border border-gray-100 dark:border-gray-700 p-8">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
                  <span className="text-blue-500">📅</span> {t("projectTimeline")}
                </h2>
                <div className="relative border-l-2 border-blue-200 dark:border-blue-900 ml-3 space-y-6 pl-6">
                  {timeline.map((event, index) => (
                    <div key={`tl-${index}`} className="relative">
                      <div className="absolute -left-[31px] top-1.5 w-3.5 h-3.5 rounded-full bg-blue-600 border-2 border-white dark:border-gray-800" />
                      <div className="text-xs font-semibold text-blue-600 dark:text-blue-400">
                        {event.date || event.year || `Milestone ${index + 1}`}
                      </div>
                      <div className="text-base font-semibold text-gray-900 dark:text-white mt-0.5">
                        {event.title}
                      </div>
                      {event.description && (
                        <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
                          {event.description}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Resources */}
            {resourceLinks.length > 0 && (
              <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-md border border-gray-100 dark:border-gray-700 p-8">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                  <span className="text-purple-500">💾</span> {t("resources")}
                </h2>
                <div className="grid gap-3 sm:grid-cols-2">
                  {resourceLinks.map((resource, index) => (
                    <a
                      key={`res-${index}`}
                      href={resource.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-between p-4 rounded-xl border border-gray-200 dark:border-gray-700 hover:border-blue-400 dark:hover:border-blue-500 hover:shadow-sm transition-all group"
                    >
                      <div className="min-w-0 flex-1 pr-2">
                        <div className="font-medium text-sm text-gray-900 dark:text-white truncate group-hover:text-blue-600 dark:group-hover:text-blue-400">
                          {resource.title}
                        </div>
                        <span className="text-xs text-gray-400 capitalize">{resource.category}</span>
                      </div>
                      <span className="text-gray-400 group-hover:text-blue-500 transition-colors">↗</span>
                    </a>
                  ))}
                </div>
              </div>
            )}

            {/* Related Publications */}
            {publicationsList.length > 0 && (
              <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-md border border-gray-100 dark:border-gray-700 p-8">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                  <span className="text-green-500">📄</span> {t("relatedPublications")}
                </h2>
                <div className="space-y-4">
                  {publicationsList.map((pub, index) => (
                    <div
                      key={`pub-${index}`}
                      className="p-4 rounded-xl border border-gray-100 dark:border-gray-700 hover:border-gray-200 transition-all"
                    >
                      <Link
                        href={`/research/publications/${encodeURIComponent(toPublicationSlug(pub))}`}
                        className="font-semibold text-gray-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400 text-sm line-clamp-2"
                      >
                        {pub.title}
                      </Link>
                      <div className="flex items-center gap-3 mt-2 text-xs text-gray-500">
                        {pub.year && <span>{pub.year}</span>}
                        {pub.kind && <span className="capitalize">{pub.kind}</span>}
                        {pub.doi && <span>DOI: {pub.doi}</span>}
                        <Link
                          href={`/research/publications/${encodeURIComponent(toPublicationSlug(pub))}`}
                          className="ml-auto text-blue-600 dark:text-blue-400 hover:underline"
                        >
                          {t("details")}
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Quick Links Card */}
            {(officialWebsiteUrl || documentationUrl) && (
              <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-md border border-gray-100 dark:border-gray-700 p-6">
                <h3 className="text-sm font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-4">
                  Quick Links
                </h3>
                <div className="space-y-2">
                  {officialWebsiteUrl && (
                    <a
                      href={officialWebsiteUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-between p-3 rounded-lg bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 text-sm font-medium hover:bg-blue-100 transition-colors"
                    >
                      <span>🌐 {t("visitProjectWebsite")}</span>
                      <span>↗</span>
                    </a>
                  )}
                  {documentationUrl && (
                    <a
                      href={documentationUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-between p-3 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 text-sm font-medium hover:bg-gray-200 transition-colors"
                    >
                      <span>📖 {t("viewDocumentation")}</span>
                      <span>↗</span>
                    </a>
                  )}
                </div>
              </div>
            )}

            {/* Team Members */}
            {teamMembers.length > 0 && (
              <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-md border border-gray-100 dark:border-gray-700 p-6">
                <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">{t("projectTeam")}</h3>

                {/* Leads first */}
                {leadMembers.length > 0 && (
                  <div className="mb-4">
                    <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 block">{t("lead")}</span>
                    <div className="space-y-3">
                      {leadMembers.map((member, idx) => (
                        <Link
                          key={`lead-${idx}`}
                          href={`/people/${encodeURIComponent(member.slug)}`}
                          className="flex items-center gap-3 p-2 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors group"
                        >
                          <img
                            src={member.image || FALLBACK_AVATAR}
                            alt={member.name}
                            className="w-10 h-10 rounded-full object-cover border-2 border-blue-500"
                          />
                          <div>
                            <div className="text-sm font-semibold text-gray-900 dark:text-white group-hover:text-blue-600 transition-colors">
                              {member.name}
                            </div>
                            <div className="text-xs text-gray-500">{member.role || member.title}</div>
                          </div>
                        </Link>
                      ))}
                    </div>
                  </div>
                )}

                {/* Regular members */}
                {regularMembers.length > 0 && (
                  <div>
                    <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3 block">{t("members")}</span>
                    <div className="grid grid-cols-2 gap-2">
                      {regularMembers.map((member, idx) => (
                        <Link
                          key={`member-${idx}`}
                          href={`/people/${encodeURIComponent(member.slug)}`}
                          className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors group"
                        >
                          <img
                            src={member.image || FALLBACK_AVATAR}
                            alt={member.name}
                            className="w-7 h-7 rounded-full object-cover"
                          />
                          <span className="text-xs font-medium text-gray-800 dark:text-gray-200 truncate group-hover:text-blue-600 transition-colors">
                            {member.name}
                          </span>
                        </Link>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Partners */}
            {partnersList.length > 0 && (
              <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-md border border-gray-100 dark:border-gray-700 p-6">
                <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">{t("partners")}</h3>
                <div className="space-y-3">
                  {partnersList.map((partner, idx) => {
                    const partnerName = typeof partner === "string" ? partner : partner.name;
                    const partnerUrl = typeof partner === "object" ? partner.url || partner.website : null;
                    const partnerLogo = typeof partner === "object" ? partner.logo : null;

                    return (
                      <div key={`partner-${idx}`} className="flex items-center gap-3">
                        {partnerLogo ? (
                          <img
                            src={partnerLogo}
                            alt={partnerName}
                            className="w-8 h-8 rounded object-contain"
                          />
                        ) : (
                          <span className="text-lg">🤝</span>
                        )}
                        {partnerUrl ? (
                          <a
                            href={partnerUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm font-medium text-blue-600 dark:text-blue-400 hover:underline"
                          >
                            {partnerName}
                          </a>
                        ) : (
                          <span className="text-sm text-gray-700 dark:text-gray-300 font-medium">
                            {partnerName}
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Themes & Domains */}
            {(themesList.length > 0 || domainList.length > 0) && (
              <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-md border border-gray-100 dark:border-gray-700 p-6 space-y-4">
                {themesList.length > 0 && (
                  <div>
                    <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-3">{t("themes")}</h3>
                    <div className="flex flex-wrap gap-2">
                      {themesList.map((theme, idx) => (
                        <span
                          key={`theme-${idx}`}
                          className="text-xs px-2.5 py-1 rounded-full font-medium bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300"
                        >
                          {theme.name || theme}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {domainList.length > 0 && (
                  <div>
                    <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-3">{t("researchAreas")}</h3>
                    <div className="flex flex-wrap gap-2">
                      {domainList.map((domain, idx) => (
                        <span
                          key={`domain-${idx}`}
                          className="text-xs px-2.5 py-1 rounded-full font-medium bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300"
                        >
                          {domain}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
