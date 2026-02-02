"use client";

import Link from "next/link";
import Markdown from "markdown-to-jsx";
import { toPublicationSlug } from "@/lib/slug";

export default function ProjectDetailsClient({ project }) {
  if (!project) return <div className="p-6">Project not found.</div>;

  const publications = project.publications || [];
  const partnersText = Array.isArray(project.partners)
    ? project.partners.filter(Boolean).join(", ")
    : project.partners || "";

  const bodyBlocks = Array.isArray(project.body) ? project.body : [];
  const themes = Array.isArray(project.themes) ? project.themes : [];
  const timeline = Array.isArray(project.timeline) ? project.timeline : [];
  const hasBody = bodyBlocks.length > 0;

  const explicitTeam = Array.isArray(project.team) ? project.team : [];
  const memberFallback = Array.isArray(project.members) ? project.members : [];
  const teamRoster = explicitTeam.length
    ? explicitTeam
        .map((entry) => {
          const person = entry.person;
          return {
            name: person?.name || "",
            slug: person?.slug || "",
            title: person?.title || "",
            role: entry.role || "",
            isLead: !!entry.isLead,
          };
        })
        .filter((entry) => entry.name)
    : memberFallback
        .map((member) => ({
          name: member?.name || "",
          slug: member?.slug || "",
          title: member?.title || "",
          role: "",
          isLead: false,
        }))
        .filter((entry) => entry.name);

  const teamSorted = [...teamRoster].sort((a, b) =>
    (a?.name || "").localeCompare(b?.name || "", "ro", { sensitivity: "base", numeric: true })
  );

  const renderRichText = (content, key) => {
    if (!content) return null;
    const hasHtml = typeof content === "string" && /<\/?[a-z][\s\S]*>/i.test(content);
    const richTextClass =
      "text-sm leading-relaxed text-gray-700 dark:text-gray-300 [&_p]:mb-4 [&_p:last-child]:mb-0 [&_ul]:list-disc [&_ul]:ml-6 [&_ul]:space-y-2 [&_ol]:list-decimal [&_ol]:ml-6 [&_ol]:space-y-2 [&_li]:marker:text-gray-500 dark:[&_li]:marker:text-gray-400 [&_hr]:my-6 [&_hr]:border-t-2 [&_hr]:border-gray-200 dark:[&_hr]:border-gray-700 [&_blockquote]:border-l-4 [&_blockquote]:border-gray-200 dark:[&_blockquote]:border-gray-700 [&_blockquote]:pl-4 [&_blockquote]:italic";

    if (hasHtml) {
      return (
        <div
          key={key}
          className={richTextClass}
          dangerouslySetInnerHTML={{ __html: content }}
        />
      );
    }

    return (
      <div key={key} className={richTextClass}>
        <Markdown
          options={{
            overrides: {
              img: {
                component: (props) => (
                  <img
                    {...props}
                    className="rounded-xl border border-gray-200 dark:border-gray-800"
                  />
                ),
              },
              a: {
                component: (props) => (
                  <a
                    {...props}
                    className="text-blue-600 dark:text-blue-400 hover:underline break-words"
                    target="_blank"
                    rel="noopener noreferrer"
                  />
                ),
              },
            },
          }}
        >
          {content}
        </Markdown>
      </div>
    );
  };

  const renderBlock = (block, index) => {
    if (!block) return null;
    switch (block.__component) {
      case "shared.rich-text":
        return renderRichText(block.body, `rich-${index}`);
      case "shared.section":
        return (
          <section key={`section-${index}`} className="space-y-3">
            {block.heading ? (
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                {block.heading}
              </h3>
            ) : null}
            {block.subheading ? (
              <p className="text-sm text-gray-600 dark:text-gray-400">{block.subheading}</p>
            ) : null}
            {renderRichText(block.body, `section-body-${index}`)}
            {block.media ? (
              <img
                src={block.media}
                alt={block.heading || "Project media"}
                className="w-full rounded-xl border border-gray-200 dark:border-gray-800"
                loading="lazy"
              />
            ) : null}
          </section>
        );
      case "shared.media":
        return block.file ? (
          <img
            key={`media-${index}`}
            src={block.file}
            alt="Project media"
            className="w-full rounded-xl border border-gray-200 dark:border-gray-800"
            loading="lazy"
          />
        ) : null;
      case "shared.slider":
        return Array.isArray(block.files) && block.files.length ? (
          <div key={`slider-${index}`} className="grid gap-3 sm:grid-cols-2">
            {block.files.map((file, idx) => (
              <img
                key={`slider-${index}-${idx}`}
                src={file}
                alt="Project media"
                className="w-full rounded-xl border border-gray-200 dark:border-gray-800"
                loading="lazy"
              />
            ))}
          </div>
        ) : null;
      default:
        return null;
    }
  };

  return (
    <main className="max-w-4xl mx-auto p-6 bg-white dark:bg-gray-950 text-black dark:text-white rounded-lg shadow-lg">
      <h2 className="text-3xl font-bold text-blue-700 dark:text-blue-300 mb-2">{project.title}</h2>

      <div className="space-y-1 text-sm text-gray-700 dark:text-gray-300 mb-6">
        {project.lead && (
          <div>
            <span className="font-medium">Lead:</span> {project.lead}
          </div>
        )}
        {partnersText && (
          <div>
            <span className="font-medium">Collaborating organisations:</span> {partnersText}
          </div>
        )}
        {project.region && (
          <div>
            <span className="font-medium">Region:</span> {project.region}
          </div>
        )}
        {project.oficialUrl && (
          <div>
            <span className="font-medium">Official page:</span>{" "}
            <a
              href={project.oficialUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="underline hover:opacity-80"
              aria-label="Open official project page"
            >
              Click here
            </a>
          </div>
        )}
      </div>

      <section className="border-t border-gray-200 dark:border-gray-800 pt-4 space-y-4">
        <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Overview</h3>

        {hasBody ? (
          <div className="space-y-6">{bodyBlocks.map(renderBlock)}</div>
        ) : project.abstract ? (
          <p className="text-base leading-relaxed text-gray-800 dark:text-gray-200 whitespace-pre-line">
            {project.abstract}
          </p>
        ) : (
          <p className="text-gray-600 dark:text-gray-400">No description available.</p>
        )}

        {project.docUrl ? (
          <a
            href={project.docUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-3 py-2 rounded-md border border-gray-300 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-900 transition text-sm"
            aria-label="Open project presentation"
          >
            Presentation
          </a>
        ) : null}

        {themes.length ? (
          <div className="space-y-2">
            <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Themes</h4>
            <div className="flex flex-wrap gap-2">
              {themes.map((th, i) => (
                <span
                  key={`${th}-${i}`}
                  className="px-2.5 py-1 rounded-full border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900 text-xs"
                >
                  {th}
                </span>
              ))}
            </div>
          </div>
        ) : null}

        {timeline.length ? (
          <div className="space-y-2">
            <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Timeline</h4>
            <ul className="space-y-2">
              {timeline.map((entry, idx) => (
                <li key={`${entry.label}-${idx}`} className="text-sm text-gray-700 dark:text-gray-300">
                  <span className="font-medium">{entry.label}</span>
                  {entry.date ? <span className="ml-2 text-xs opacity-70">{entry.date}</span> : null}
                  {entry.description ? (
                    <div className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                      {entry.description}
                    </div>
                  ) : null}
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </section>

      <section className="border-t border-gray-200 dark:border-gray-800 pt-4 mt-6 space-y-4">
        <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Team & publications</h3>

        {teamSorted.length ? (
          <ul className="space-y-2">
            {teamSorted.map((member) => (
              <li key={member.slug || member.name} className="text-sm">
                {member.slug ? (
                  <Link
                    href={`/people/staff/${encodeURIComponent(member.slug)}`}
                    className="underline hover:opacity-80"
                  >
                    {member.name}
                  </Link>
                ) : (
                  <span>{member.name}</span>
                )}
                {member.title ? <span className="ml-1 text-gray-600 dark:text-gray-400">— {member.title}</span> : null}
                {member.role ? <span className="ml-2 text-xs opacity-70">({member.role})</span> : null}
                {member.isLead ? <span className="ml-2 text-xs font-semibold text-blue-600">Lead</span> : null}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-gray-600 dark:text-gray-400">No team members linked.</p>
        )}

        {publications.length ? (
          <ul className="space-y-3">
            {publications.map((pub, idx) => (
              <li
                key={`${pub.title || "pub"}-${idx}`}
                className="border border-gray-200 dark:border-gray-800 rounded-lg p-3"
              >
                <div className="font-medium text-gray-900 dark:text-gray-100">
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
                </div>
                {pub.description ? (
                  <p className="mt-1 text-sm text-gray-700 dark:text-gray-300">{pub.description}</p>
                ) : null}
                <div className="mt-2 flex flex-wrap gap-2">
                  {toPublicationSlug(pub) ? (
                    <Link
                      href={`/research/publications/${encodeURIComponent(toPublicationSlug(pub))}`}
                      className="inline-flex items-center gap-2 text-sm underline"
                    >
                      View details
                    </Link>
                  ) : null}
                  {pub.pdfFile?.url ? (
                    <a
                      href={pub.pdfFile.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 text-sm underline"
                    >
                      View PDF
                    </a>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-gray-600 dark:text-gray-400">No publications linked.</p>
        )}
      </section>
    </main>
  );
}
