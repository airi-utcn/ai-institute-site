import {
  FaCalendarAlt,
  FaDownload,
  FaExternalLinkAlt,
  FaInfoCircle,
} from 'react-icons/fa';

export default function OutlookCalendar({ title, intro, embedUrl, icsUrl }) {
  return (
    <main className="min-h-screen bg-gray-50 dark:bg-gray-950 py-12 md:py-16">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <header className="mb-8 md:mb-10 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300 mb-4">
            <FaCalendarAlt className="w-3 h-3" />
            <span>Institute Calendar</span>
          </div>

          <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight text-gray-900 dark:text-white mb-4">
            {title}
          </h1>

          {intro && (
            <p className="max-w-3xl mx-auto text-base sm:text-lg text-gray-600 dark:text-gray-300 leading-relaxed">
              {intro}
            </p>
          )}
        </header>

        <section className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-xl overflow-hidden">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between p-4 md:p-5 border-b border-gray-100 dark:border-gray-800">
            <div className="flex items-start gap-2.5 text-sm text-gray-600 dark:text-gray-300">
              <FaInfoCircle className="w-4 h-4 mt-0.5 shrink-0 text-blue-500" />
              <p>
                Room availability and upcoming events, published from the
                institute&apos;s Microsoft Outlook calendar.
              </p>
            </div>

            <div className="flex flex-wrap gap-2 shrink-0">
              <a
                href={icsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-xs font-semibold text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                <FaDownload className="w-3 h-3" />
                <span>Download .ics</span>
              </a>

              <a
                href={embedUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-3 py-2 text-xs font-semibold text-white hover:bg-blue-700 transition-colors"
              >
                <FaExternalLinkAlt className="w-3 h-3" />
                <span>Open in Outlook</span>
              </a>
            </div>
          </div>

          <div className="bg-white">
            <div className="overflow-x-auto">
              <div className="min-w-[760px] md:min-w-0">
                <iframe
                  title="AIRI Institute Calendar"
                  src={embedUrl}
                  className="block w-full border-0"
                  style={{ height: 'clamp(620px, 78vh, 1000px)' }}
                  loading="eager"
                />
              </div>
            </div>
          </div>

          <div className="p-4 md:p-5 border-t border-gray-100 dark:border-gray-800 text-xs text-gray-500 dark:text-gray-400">
            <p>
              Calendar not loading?{' '}
              <a
                href={embedUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="font-semibold text-blue-600 dark:text-blue-400 hover:underline"
              >
                Open it directly in Outlook
              </a>
              . On small screens, scroll the calendar horizontally to see the
              full week.
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}
