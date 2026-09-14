"use client";

import { useEffect, useRef, useState } from "react";
import { useLocale } from "@/context/LocaleContext";

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
  { code: "lv", name: "Latviešu", flag: "🇱🇻" },
  { code: "zh", name: "简体中文", flag: "🇨🇳"}
];

export default function LanguageSwitcher({ compact = false }) {
  const locale = useLocale();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  const handleLanguageChange = (e) => {
    const nextLocale = e.target.value;
    document.cookie = `NEXT_LOCALE=${nextLocale}; path=/; max-age=31536000; SameSite=Lax`;
    window.location.reload();
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
    document.cookie = `NEXT_LOCALE=${nextLocale}; path=/; max-age=31536000; SameSite=Lax`;
    setIsOpen(false);
    window.location.reload();
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
            isOpen ? "min-w-[6.5rem] " : "min-w-0"
          }`}
          aria-label="Select language"
          aria-haspopup="listbox"
          aria-expanded={isOpen}
        >
          <span className="text-base leading-none">{currentLang.flag}</span>
          <span
            className={`text-xs font-medium text-gray-700 dark:text-gray-300 transition-all duration-150 ${
              isOpen ? "inline opacity-100" : "hidden opacity-0"
            }`}
          >
            {currentLang.name}
          </span>
          <span className="text-gray-400 text-xs">▾</span>
        </button>

        {isOpen && (
          <ul
            role="listbox"
            aria-label="Languages"
            className="absolute left-0 mt-1 w-36 rounded-md bg-white dark:bg-gray-900 shadow-lg border border-gray-200 dark:border-gray-800 py-1 z-50 animate-fadeIn"
          >
            {LANGUAGES.map((lang) => {
              const selected = lang.code === locale;
              return (
                <li
                  key={lang.code}
                  role="option"
                  aria-selected={selected}
                  onClick={() => handleCompactSelect(lang.code)}
                  className={`flex items-center gap-2 px-3 py-1.5 text-xs cursor-pointer hover:bg-primary-50 dark:hover:bg-primary-950/40 hover:text-primary-600 dark:hover:text-primary-400 transition-colors ${
                    selected
                      ? "font-semibold text-primary-600 dark:text-primary-400 bg-primary-50/50 dark:bg-primary-950/20"
                      : "text-gray-700 dark:text-gray-300"
                  }`}
                >
                  <span className="text-base leading-none">{lang.flag}</span>
                  <span>{lang.name}</span>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    );
  }

  return (
    <div className="relative inline-block text-left">
      <div className="flex items-center gap-1.5 border border-gray-200 dark:border-gray-800 rounded-md px-2 py-1 bg-white/50 dark:bg-gray-900/50">
        <span className="text-base leading-none">{currentLang.flag}</span>
        <label htmlFor="language-select" className="sr-only">
          Select language
        </label>
        <select
          id="language-select"
          value={locale}
          onChange={handleLanguageChange}
          className="bg-transparent text-sm text-gray-700 dark:text-gray-300 focus:outline-none cursor-pointer pr-1"
        >
          {LANGUAGES.map((lang) => (
            <option
              key={lang.code}
              value={lang.code}
              className="bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
            >
              {lang.name}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
