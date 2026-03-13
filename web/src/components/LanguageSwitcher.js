"use client";

import { useRouter } from "next/navigation";
import { useLocale } from "next-intl";

const LANGUAGES = [
  { code: "en", name: "English", flag: "🇬🇧" },
  { code: "ro", name: "Română", flag: "🇷🇴" },
  { code: "fr", name: "Français", flag: "🇫🇷" },
  { code: "de", name: "Deutsch", flag: "🇩🇪" },
  { code: "es", name: "Español", flag: "🇪🇸" },
  { code: "it", name: "Italiano", flag: "🇮🇹" },
  { code: "el", name: "Ελληνικά", flag: "🇬🇷" },
  { code: "tr", name: "Türkçe", flag: "🇹🇷" },
  { code: "bg", name: "Български", flag: "🇧🇬" },
  { code: "lv", name: "Latviešu", flag: "🇱🇻" }
];

export default function LanguageSwitcher() {
  const router = useRouter();
  const locale = useLocale(); // Gets the current active language

  const handleLanguageChange = (e) => {
    const nextLocale = e.target.value;
    document.cookie = `NEXT_LOCALE=${nextLocale}; path=/; max-age=31536000`;
    router.refresh();
  };

  return (
    <div className="relative inline-block w-full">
      <select 
        onChange={handleLanguageChange}
        value={locale} // Ensures the dropdown shows the correct current language
        className="w-full appearance-none bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 border border-gray-300 dark:border-gray-700 rounded-lg py-2 pl-3 pr-8 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer shadow-sm transition-colors"
      >
        {LANGUAGES.map((lang) => (
          <option key={lang.code} value={lang.code}>
            {lang.flag} {lang.name}
          </option>
        ))}
      </select>
      <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-500 dark:text-gray-400">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path>
        </svg>
      </div>
    </div>
  );
}