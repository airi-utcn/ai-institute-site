"use client";

import { useMemo } from "react";
import Link from "next/link";
import Markdown from "markdown-to-jsx";
import { toPublicationSlug } from "@/lib/slug";

const FALLBACK_AVATAR = "/people/Basic_avatar_image.png";

export default function ProjectDetailClient({
  staffSlug,
  project,
  publications = [],
  teamMembers = [],
}) {
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
  
  const datasetsList = useMemo(
    () => (Array.isArray(project?.datasets) ? project.datasets : []),
    [project?.datasets]
  );

  const teamMembersSorted = useMemo(() => {
    if (!Array.isArray(teamMembers)) return [];
    return [...teamMembers].sort((a, b) =>
      (a?.name || "").localeCompare(b?.name || "", "en", {
        sensitivity: "base",
        numeric: true,
      })
    );
  }, [teamMembers]);

  // Lead resolution
  const leadName = project?.leadName || project?.lead || project?.leadDetails?.name || "";
  const leadSlug = project?.leadSlug || project?.leadDetails?.slug || "";
  const leadImage = project?.leadDetails?.image || null;

  const leadMember = teamMembersSorted.find(m => m.slug === leadSlug) || (leadName ? {
     name: leadName,
     slug: leadSlug,
     image: leadImage,
     title: project?.leadDetails?.title
  } : null);

  const otherMembers = teamMembersSorted.filter(m => m.slug !== leadSlug);

  const bodyBlocks = Array.isArray(project?.body) ? project.body : [];
  const timeline = Array.isArray(project?.timeline) ? project.timeline : [];
  const hasBody = bodyBlocks.length > 0;

  const renderRichText = (markdown, key) =>
    markdown ? (
      <div
        key={key}
        className="prose prose-lg dark:prose-invert max-w-none text-gray-700 dark:text-gray-300 [&_a]:text-blue-600 dark:[&_a]:text-blue-400 hover:[&_a]:underline"
      >
        <Markdown options={{
            overrides: {
                img: {
                    component: (props) => (
                        <img {...props} className="rounded-xl shadow-md my-4 max-w-full h-auto" />
                    )
                },
                a: {
                    component: (props) => (
                        <a {...props} className="text-blue-600 hover:underline break-words" target="_blank" rel="noopener noreferrer" />
                    )
                }
            }
        }}>
            {markdown}
        </Markdown>
      </div>
    ) : null;

  const renderBlock = (block, index) => {
    if (!block) return null;
    switch (block.__component) {
      case "shared.rich-text":
        return renderRichText(block.body, `rich-${index}`);
      case "shared.section":
        return (
          <section key={`section-${index}`} className="my-8 first:mt-0">
            {block.heading && (
              <h3 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-4">
                {block.heading}
              </h3>
            )}
            {block.subheading && (
              <p className="text-lg text-gray-600 dark:text-gray-400 mb-4 italic">
                {block.subheading}
              </p>
            )}
            {renderRichText(block.body, `section-body-${index}`)}
            {block.media && (
              <div className="mt-6 rounded-xl overflow-hidden shadow-md">
                <img
                  src={block.media}
                  alt={block.heading || "Project media"}
                  className="w-full h-auto object-cover"
                  loading="lazy"
                />
              </div>
            )}
          </section>
        );
      case "shared.media":
        return block.file ? (
          <div key={`media-${index}`} className="my-8 rounded-xl overflow-hidden shadow-md">
            <img
              src={block.file}
              alt="Project media"
              className="w-full h-auto object-cover"
              loading="lazy"
            />
          </div>
        ) : null;
      case "shared.slider":
        return Array.isArray(block.files) && block.files.length ? (
          <div key={`slider-${index}`} className="my-8 grid gap-4 sm:grid-cols-2">
            {block.files.map((file, idx) => (
              <div key={`slider-${index}-${idx}`} className="rounded-xl overflow-hidden shadow-sm aspect-video relative group">
                <img
                  src={file}
                  alt={`Project slide ${idx + 1}`}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                  loading="lazy"
                />
              </div>
            ))}
          </div>
        ) : null;
      default:
        return null;
    }
  };

  const hasHero = !!project?.heroImage;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 pb-20">
      {/* Navigation Breadcrumb */}
      <div className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
          <Link 
            href={`/people/staff/${staffSlug}`}
            className="text-sm font-medium text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 flex items-center gap-1"
          >
            ← Back to {staffSlug === leadSlug ? "Profile" : "Staff Profile"}
          </Link>
        </div>
      </div>

      {/* Hero Section */}
      <div className="relative bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 mb-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 lg:py-16">
          <div className="grid lg:grid-cols-3 gap-8 lg:gap-12">
            <div className={`lg:col-span-2 space-y-6 ${!hasHero ? 'lg:col-span-3' : ''}`}>
              <div className="flex flex-wrap gap-2 text-sm">
                {project?.phase && (
                  <span className={`px-2.5 py-0.5 rounded-full font-medium uppercase text-xs tracking-wider border
                    ${project.phase === 'completed' ? 'bg-green-100 text-green-800 border-green-200 dark:bg-green-900/30 dark:text-green-300 dark:border-green-800' : 
                      project.phase === 'planned' ? 'bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-800' :
                      'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800'
                    }`}>
                    {project.phase}
                  </span>
                )}
                {project?.region && (
                   <span className="px-2.5 py-0.5 rounded-full bg-gray-100 text-gray-600 border border-gray-200 text-xs uppercase tracking-wider font-medium dark:bg-gray-800 dark:text-gray-400 dark:border-gray-700">
                    {project.region}
                   </span>
                )}
              </div>
              
              <h1 className="text-3xl md:text-4xl lg:text-5xl font-extrabold text-gray-900 dark:text-white tracking-tight leading-tight">
                {project?.title || "Project Details"}
              </h1>
              
              {/* Abstract / Summary */}
              {project?.abstract && (
                <p className="text-xl text-gray-600 dark:text-gray-300 leading-relaxed font-light">
                  {project.abstract}
                </p>
              )}

              {/* Action Buttons (Mobile only, desktop in sidebar) */}
              <div className="flex flex-wrap gap-3 lg:hidden pt-2">
                {project?.officialUrl && (
                  <a href={project.officialUrl} target="_blank" rel="noopener noreferrer" 
                     className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors shadow-sm">
                    Visit Website
                  </a>
                )}
                {project?.docUrl && (
                  <a href={project.docUrl} target="_blank" rel="noopener noreferrer"
                     className="px-4 py-2 bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300 rounded-lg font-medium hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors">
                    Documentation
                  </a>
                )}
              </div>
            </div>

            {/* Hero Image */}
            {hasHero && (
              <div className="lg:col-span-1">
                <div className="aspect-[4/3] rounded-2xl overflow-hidden shadow-lg bg-gray-100 dark:bg-gray-800">
                  <img 
                    src={project.heroImage} 
                    alt={project.title}
                    className="w-full h-full object-cover"
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-12 gap-12">
          
          {/* Main Content Column */}
          <div className="lg:col-span-8 space-y-12">
            
            {/* Main Body Content */}
            {bodyBlocks.length > 0 ? (
              <div className="space-y-8">
                {bodyBlocks.map((block, i) => renderBlock(block, i))}
              </div>
            ) : null}

            {/* Timeline */}
            {timeline.length > 0 && (
              <section className="border-t border-gray-200 dark:border-gray-800 pt-10">
                <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
                   <span className="text-blue-500">📅</span> Project Timeline
                </h3>
                <div className="relative border-l-2 border-gray-200 dark:border-gray-700 ml-3 space-y-10 pl-8 pb-4">
                  {timeline.map((item, idx) => (
                    <div key={idx} className="relative">
                      <div className="absolute -left-[3.25rem] w-6 h-6 bg-blue-600 rounded-full border-4 border-white dark:border-gray-950 flex items-center justify-center">
                      </div>
                      <div className="flex flex-col sm:flex-row gap-1 sm:items-baseline sm:gap-4 mb-2">
                        <span className="inline-block px-2 py-0.5 rounded text-xs font-bold uppercase tracking-wider bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300">
                          {item.date}
                        </span>
                        <h4 className="text-lg font-semibold text-gray-900 dark:text-white">
                          {item.label}
                        </h4>
                      </div>
                      <p className="text-gray-600 dark:text-gray-400 text-sm leading-relaxed">
                        {item.description}
                      </p>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Datasets */}
            {datasetsList.length > 0 && (
              <section className="border-t border-gray-200 dark:border-gray-800 pt-10">
                <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
                   <span className="text-purple-500">💾</span> Datasets
                </h3>
                <div className="grid sm:grid-cols-2 gap-4">
                  {datasetsList.map((ds) => (
                    <a 
                      key={ds.id} 
                      href={ds.url || "#"} 
                      target={ds.url ? "_blank" : undefined}
                      rel="noopener noreferrer"
                      className="block p-4 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 hover:border-blue-500 dark:hover:border-blue-500 hover:shadow-md transition-all group"
                    >
                      <h4 className="font-semibold text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                        {ds.title}
                      </h4>
                      {ds.platform && (
                        <span className="mt-2 inline-block text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                          {ds.platform}
                        </span>
                      )}
                    </a>
                  ))}
                </div>
              </section>
            )}

            {/* Publications */}
            {publicationsList.length > 0 && (
              <section className="border-t border-gray-200 dark:border-gray-800 pt-10">
                <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
                   <span className="text-green-500">📄</span> Related Publications
                </h3>
                <div className="space-y-4">
                  {publicationsList.map((pub) => (
                    <article key={pub.id} className="p-4 rounded-xl bg-gray-50 dark:bg-gray-900 hover:bg-white dark:hover:bg-gray-800 border border-transparent hover:border-gray-200 dark:hover:border-gray-700 transition-all shadow-sm hover:shadow-md">
                      <div className="flex justify-between items-start gap-4">
                        <div className="flex-1">
                          <h4 className="font-medium text-gray-900 dark:text-white leading-snug">
                            {toPublicationSlug(pub) ? (
                              <Link
                                href={`/research/publications/${encodeURIComponent(toPublicationSlug(pub))}`}
                                className="hover:underline"
                              >
                                {pub.title}
                              </Link>
                            ) : (
                              pub.title
                            )}
                          </h4>
                          <div className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                             {pub.year} • {pub.kind}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {toPublicationSlug(pub) ? (
                            <Link
                              href={`/research/publications/${encodeURIComponent(toPublicationSlug(pub))}`}
                              className="shrink-0 px-3 py-1.5 text-xs font-semibold rounded-full bg-blue-100 text-blue-700 hover:bg-blue-200 dark:bg-blue-900/40 dark:text-blue-300"
                            >
                              Details
                            </Link>
                          ) : null}
                          {pub.pdfFile?.url ? (
                            <Link
                               href={pub.pdfFile.url}
                               target="_blank"
                               className="shrink-0 p-2 text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                            >
                               <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                            </Link>
                          ) : null}
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              </section>
            )}
          </div>

          {/* Sidebar */}
          <aside className="lg:col-span-4 space-y-8">
            
            {/* Quick Actions (Desktop) */}
            {(project?.officialUrl || project?.docUrl) && (
              <div className="hidden lg:grid grid-cols-1 gap-3">
                {project.officialUrl && (
                  <a href={project.officialUrl} target="_blank" rel="noopener noreferrer" 
                     className="flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-all shadow-md transform hover:-translate-y-0.5">
                    Visit Project Website
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
                  </a>
                )}
                {project.docUrl && (
                  <a href={project.docUrl} target="_blank" rel="noopener noreferrer"
                     className="flex items-center justify-center gap-2 px-4 py-3 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 border border-gray-200 dark:border-gray-700 rounded-xl font-semibold hover:bg-gray-50 dark:hover:bg-gray-700 transition-all">
                    View Documentation
                  </a>
                )}
              </div>
            )}

            {/* Project Team */}
            <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-6 shadow-sm">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Project Team</h3>
              
              <div className="space-y-4">
                {/* Lead */}
                {leadMember && (
                  <div className="mb-4">
                     <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 block">Lead</span>
                     <Link href={leadMember.slug ? `/people/staff/${leadMember.slug}` : "#"} className={`flex items-center gap-3 group ${!leadMember.slug ? "pointer-events-none" : ""}`}>
                        <img 
                          src={leadMember.image || FALLBACK_AVATAR} 
                          alt={leadMember.name}
                          className="w-12 h-12 rounded-full object-cover border-2 border-transparent group-hover:border-blue-500 transition-all"
                        />
                        <div>
                          <div className="font-semibold text-gray-900 dark:text-white group-hover:text-blue-600 transition-colors">
                            {leadMember.name}
                          </div>
                          {leadMember.title && <div className="text-xs text-gray-500">{leadMember.title}</div>}
                        </div>
                     </Link>
                  </div>
                )}

                {/* Other Members */}
                {otherMembers.length > 0 && (
                  <div>
                    <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3 block">Members</span>
                    <ul className="space-y-3">
                      {otherMembers.map((member) => (
                        <li key={member.slug || member.name}>
                          <Link href={member.slug ? `/people/staff/${member.slug}` : "#"} className={`flex items-center gap-3 group ${!member.slug ? "pointer-events-none" : ""}`}>
                            <img 
                              src={member.image || FALLBACK_AVATAR} 
                              alt={member.name}
                              className="w-8 h-8 rounded-full object-cover opacity-80 group-hover:opacity-100 transition-opacity"
                            />
                            <span className="text-sm text-gray-700 dark:text-gray-300 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                              {member.name}
                            </span>
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>

            {/* Partners */}
            {partnersList.length > 0 && (
              <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-6 shadow-sm">
                <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Partners</h3>
                <div className="flex flex-wrap gap-3">
                  {partnersList.map((partner, i) => (
                    typeof partner === 'string' ? (
                       <span key={i} className="px-3 py-1.5 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-lg text-sm font-medium">
                         {partner}
                       </span>
                    ) : (
                       <div key={partner.id || i} className="flex items-center gap-2">
                          {partner.logo && <img src={partner.logo} alt={partner.name} className="h-8 w-auto" />}
                          <span className="text-sm font-medium">{partner.name}</span>
                       </div>
                    )
                  ))}
                </div>
              </div>
            )}

            {/* Meta Tags (Themes & Domains) */}
            {(themesList.length > 0 || domainList.length > 0) && (
              <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-6 shadow-sm">
                 {themesList.length > 0 && (
                   <div className="mb-6 last:mb-0">
                     <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-3">Themes</h3>
                     <div className="flex flex-wrap gap-2">
                       {themesList.map((theme, i) => (
                         <span key={i} className="px-2.5 py-1 rounded-md bg-purple-50 text-purple-700 border border-purple-100 text-xs font-semibold dark:bg-purple-900/20 dark:text-purple-300 dark:border-purple-800">
                           {typeof theme === 'object' ? theme.name : theme}
                         </span>
                       ))}
                     </div>
                   </div>
                 )}
                 {domainList.length > 0 && (
                   <div className="mb-0">
                     <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-3">Research Areas</h3>
                     <div className="flex flex-wrap gap-2">
                        {domainList.map((domain, i) => (
                          <span key={i} className="px-2.5 py-1 rounded-md bg-blue-50 text-blue-700 border border-blue-100 text-xs font-semibold dark:bg-blue-900/20 dark:text-blue-300 dark:border-blue-800">
                             {typeof domain === 'object' ? domain.name : domain}
                          </span>
                        ))}
                     </div>
                   </div>
                 )}
              </div>
            )}

          </aside>
        </div>
      </div>
    </div>
  );
}