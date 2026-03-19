"use client";

import { useTranslations } from "next-intl";

export default function Client() {
  const t = useTranslations("about.roomsCalendar");

  return (
    <main className="flex flex-col items-center justify-center bg-gray-50 dark:bg-gray-900 py-12">
      <div className="container max-w-6xl mx-auto bg-white dark:bg-gray-950 rounded-2xl shadow-xl p-6 md:p-10 animate-fade-in">
        <h1 className="text-2xl md:text-3xl font-extrabold mb-4 text-blue-600 dark:text-yellow-400 tracking-tight text-center animate-slide-down">
          {t("title")}
        </h1>

        <p className="text-gray-700 dark:text-gray-300 text-center animate-slide-up animate-delay-1">
          {t("comingSoon")}
        </p>
      </div>
    </main>
  );
}