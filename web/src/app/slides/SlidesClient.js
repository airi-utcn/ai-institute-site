"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import PageHeader from "@/components/PageHeader";

const normalize = (value) =>
  (value || "")
    .toString()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

export default function SlidesClient({ slides = [], pageData }) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("");
  const categories = useMemo(
    () => [...new Set(slides.map((slide) => slide.category).filter(Boolean))].sort(),
    [slides]
  );
  const filteredSlides = useMemo(() => {
    const terms = normalize(query).split(/\s+/).filter(Boolean);
    return slides.filter((slide) => {
      const searchable = normalize([
        slide.title,
        slide.description,
        slide.category,
        ...(slide.tags || []),
        ...(slide.presenters || []).map((person) => person.name),
      ].join(" "));
      return (
        (!terms.length || terms.every((term) => searchable.includes(term))) &&
        (!category || slide.category === category)
      );
    });
  }, [category, query, slides]);

  return (
    <main className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <PageHeader
        title={pageData?.title || "Slides"}
        subtitle={pageData?.subtitle || "Presentations and slide materials from AIRi at UTCN."}
      />
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col md:flex-row gap-3 mb-8">
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={pageData?.searchPlaceholder || "Search slides..."}
            className="flex-1 rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 px-4 py-3"
          />
          <select
            value={category}
            onChange={(event) => setCategory(event.target.value)}
            className="rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 px-4 py-3"
          >
            <option value="">{pageData?.allCategories || "All categories"}</option>
            {categories.map((value) => (
              <option key={value} value={value}>{value}</option>
            ))}
          </select>
        </div>

        {filteredSlides.length ? (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {filteredSlides.map((slide) => (
              <article
                key={slide.slug || slide.id}
                className="flex flex-col rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 overflow-hidden shadow-sm"
              >
                {slide.thumbnail?.url ? (
                  <img
                    src={slide.thumbnail.url}
                    alt={slide.thumbnail.alt || slide.title}
                    className="w-full aspect-video object-cover"
                  />
                ) : null}
                <div className="p-5 flex flex-col gap-3 flex-1">
                  <div className="flex items-center justify-between gap-3 text-xs uppercase tracking-wide text-gray-500">
                    <span>{slide.category}</span>
                    {slide.presentationDate ? (
                      <time dateTime={slide.presentationDate}>
                        {new Date(slide.presentationDate).getFullYear()}
                      </time>
                    ) : null}
                  </div>
                  <h2 className="text-xl font-bold text-gray-900 dark:text-white">{slide.title}</h2>
                  {slide.description ? (
                    <p className="text-sm text-gray-600 dark:text-gray-300 line-clamp-3">{slide.description}</p>
                  ) : null}
                  <div className="mt-auto pt-3">
                    {slide.file?.url ? (
                      <a
                        href={slide.file.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-semibold text-blue-600 dark:text-blue-400 hover:underline"
                      >
                        {pageData?.openSlide || "Open presentation"}
                      </a>
                    ) : null}
                    {slide.projects?.length || slide.laboratories?.length || slide.publications?.length ? (
                      <div className="flex flex-wrap gap-2 mt-3 text-xs text-gray-500">
                        {slide.projects.map((project) => (
                          <Link key={`project-${project.slug}`} href={`/research/projects/${project.slug}`} className="hover:underline">
                            {project.title}
                          </Link>
                        ))}
                        {slide.laboratories.map((lab) => (
                          <Link key={`lab-${lab.slug}`} href={`/research/laboratories/${lab.slug}`} className="hover:underline">
                            {lab.title}
                          </Link>
                        ))}
                      </div>
                    ) : null}
                  </div>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <p className="text-center py-16 text-gray-500">{pageData?.noSlidesFound || "No slides found"}</p>
        )}
      </div>
    </main>
  );
}
