import Link from "next/link";

export default function RelatedSlides({ slides = [], title = "Slides" }) {
  if (!slides.length) return null;

  return (
    <section className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 p-6">
      <div className="flex items-center justify-between gap-4 mb-4">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white">{title}</h2>
        <Link href="/slides" className="text-sm font-semibold text-blue-600 dark:text-blue-400 hover:underline">
          View all
        </Link>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {slides.map((slide) => (
          <a
            key={slide.slug || slide.id}
            href={slide.file?.url || "#"}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-xl border border-gray-200 dark:border-gray-800 p-4 hover:border-blue-400 dark:hover:border-blue-600 transition-colors"
          >
            <h3 className="font-semibold text-gray-900 dark:text-white">{slide.title}</h3>
            <div className="mt-2 flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
              <span>{slide.category}</span>
              {slide.presentationDate ? (
                <time dateTime={slide.presentationDate}>
                  {new Date(slide.presentationDate).getFullYear()}
                </time>
              ) : null}
            </div>
          </a>
        ))}
      </div>
    </section>
  );
}
