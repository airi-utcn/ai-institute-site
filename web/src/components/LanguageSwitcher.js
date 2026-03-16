"use client";

import { useEffect, useRef, useState } from "react";
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

export default function LanguageSwitcher({ compact = false }) {
  const router = useRouter();
  const locale = useLocale();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  const handleLanguageChange = (e) => {
    const nextLocale = e.target.value;
    document.cookie = `NEXT_LOCALE=${nextLocale}; path=/; max-age=31536000`;
    router.refresh();
  };

  const currentLang = LANGUAGES.find((l) => l.code === locale) || LANGUAGES[0];

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleCompactSelect = (nextLocale) => {
    document.cookie = `NEXT_LOCALE=${nextLocale}; path=/; max-age=31536000`;
    setIsOpen(false);
    router.refresh();
  };

  if (compact) {
    // Compact: collapsed shows flag, expanded reveals language name.
    return (
      <div ref={dropdownRef} className="relative inline-block">
        <button
          type="button"
          onClick={() => setIsOpen((open) => !open)}
          onKeyDown={(e) => {
            if (e.key === "Escape") {
              setIsOpen(false);
            }
          }}
          className={`flex items-center gap-1 rounded-md px-2 py-1 transition-colors hover:bg-gray-100 dark:hover:bg-gray-800 ${
            isOpen ? "min-w-[6.5rem]" : "min-w-0"
          }`}
          aria-label="Select language"
          aria-haspopup="listbox"
          aria-expanded={isOpen}
        >
          <span className="text-lg leading-none" aria-hidden>
            {currentLang.flag}
          </span>
          {isOpen && <span className="text-sm text-gray-900 dark:text-gray-100">{currentLang.name}</span>}
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path>
          </svg>
        </button>

        {isOpen && (
          <ul
            className="absolute right-0 z-50 mt-2 min-w-[11rem] overflow-hidden rounded-lg border border-gray-200 bg-white shadow-lg dark:border-gray-700 dark:bg-gray-900"
            role="listbox"
            aria-label="Language options"
          >
            {LANGUAGES.map((lang) => {
              const isSelected = lang.code === locale;
              return (
                <li key={lang.code}>
                  <button
                    type="button"
                    onClick={() => handleCompactSelect(lang.code)}
                    className={`flex w-full items-center gap-2 px-3 py-2 text-left text-sm transition-colors ${
                      isSelected
                        ? "bg-gray-100 text-gray-900 dark:bg-gray-800 dark:text-gray-100"
                        : "text-gray-700 hover:bg-gray-50 dark:text-gray-200 dark:hover:bg-gray-800"
                    }`}
                    role="option"
                    aria-selected={isSelected}
                  >
                    <span className="text-base leading-none" aria-hidden>
                      {lang.flag}
                    </span>
                    <span>{lang.name}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    );
  }

  // Default: flag and name
  return (
    <div className="relative inline-block w-full">
      <select
        onChange={handleLanguageChange}
        value={locale}
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