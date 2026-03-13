"use client";

import { useTranslations } from "next-intl";

export default function Client() {
  const t = useTranslations("about.organigram");

  return (
    <div className="flex flex-col items-center justify-center bg-gray-50 dark:bg-gray-900 py-12">
      <div className="container max-w-6xl mx-auto bg-white dark:bg-gray-950 rounded-2xl shadow-xl animate-fade-in">
        <section className="p-6 md:p-8">
          <h1 className="text-2xl md:text-3xl font-extrabold mb-6 text-blue-600 dark:text-yellow-400 tracking-tight text-center animate-slide-down">
            {t("title")}
          </h1>

          <p className="text-gray-700 dark:text-gray-300 mb-8 text-center animate-slide-up animate-delay-1">
            {t.rich("description", {
              strong: (chunks) => <strong>{chunks}</strong>
            })}
          </p>

          <div className="grid gap-6 md:grid-cols-2">
            <section className="rounded-2xl border border-gray-200 dark:border-gray-800 overflow-hidden animate-slide-up animate-delay-2">
              <div className="px-4 md:px-6 py-4 border-b border-gray-200 dark:border-gray-800">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                  {t("directorCommittee")}
                </h2>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {t("viewDirectorStructure")}
                </p>
              </div>
              <div className="px-4 md:px-6 py-4">
                <ul className="list-disc pl-6 space-y-2">
                  <li>
                    <a
                      href="/files/organigram-director.pdf"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 dark:text-blue-400 hover:underline"
                    >
                      {t("downloadPdf")}
                    </a>
                  </li>
                  <li>
                    <a
                      href="/files/organigram-director.png"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 dark:text-blue-400 hover:underline"
                    >
                      {t("viewPng")}
                    </a>
                  </li>
                </ul>
              </div>
            </section>

            <section className="rounded-2xl border border-gray-200 dark:border-gray-800 overflow-hidden animate-slide-up animate-delay-3">
              <div className="px-4 md:px-6 py-4 border-b border-gray-200 dark:border-gray-800">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                  {t("scientificCommittee")}
                </h2>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {t("viewScientificStructure")}
                </p>
              </div>
              <div className="px-4 md:px-6 py-4">
                <ul className="list-disc pl-6 space-y-2">
                  <li>
                    <a
                      href="/files/organigram-scientific.pdf"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 dark:text-blue-400 hover:underline"
                    >
                      {t("downloadPdf")}
                    </a>
                  </li>
                  <li>
                    <a
                      href="/files/organigram-scientific.png"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 dark:text-blue-400 hover:underline"
                    >
                      {t("viewPng")}
                    </a>
                  </li>
                </ul>
              </div>
            </section>
          </div>
        </section>
      </div>
    </div>
  );
}