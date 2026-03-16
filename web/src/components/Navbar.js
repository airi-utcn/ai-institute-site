"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from 'next/link';
import Image from 'next/image';
import { FaBars, FaTimes, FaSearch } from 'react-icons/fa';
import LogoLight from '../../public/media/Logos/LogoLight.svg';
import LogoDark from '../../public/media/Logos/LogoDark.svg';
import EUT_Logo from '../../public/media/Logos/EUT_WideLogo.png';
import { useTheme } from "@/components/ThemeProvider";
import LanguageSwitcher from "./LanguageSwitcher";
import { useTranslations } from "next-intl"; // Added import

const strip = (value) =>
  (value || '')
    .toString()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

const parseTerms = (query) => strip(query).split(/\s+/).filter(Boolean);

const matchesAllTerms = (item, terms) => {
  if (!terms.length) return false;

  const title = strip(item?.title);
  const snippet = strip(item?.snippet);
  const tags = (item?.tags || []).map(strip);

  return terms.every((term) => {
    if (!term) return true;
    if (title.includes(term)) return true;
    if (snippet.includes(term)) return true;
    return tags.some((tag) => tag.includes(term));
  });
};

const scoreItem = (item, terms) => {
  let score = 0;
  const title = strip(item?.title);
  const snippet = strip(item?.snippet);
  const tags = (item?.tags || []).map(strip);

  for (const term of terms) {
    if (!term) continue;
    if (title.includes(term)) score += 3;
    else if (tags.some((tag) => tag.includes(term))) score += 2;
    else if (snippet.includes(term)) score += 1;
  }

  return score;
};

const getBasePath = () => {
  if (typeof window === 'undefined') return '';
  const fromNext = window.__NEXT_DATA__?.assetPrefix;
  if (fromNext) return fromNext;
  const firstSegment = window.location.pathname.split('/')[1] || '';
  if (/staging/i.test(firstSegment)) return `/${firstSegment}`;
  return '';
};

const isExternalRoute = (route) => /^https?:\/\//i.test(route || '');

function SearchSuggestions({ suggestions, onSelect }) {
  if (!suggestions?.length) {
    return (
      <div className="absolute z-50 mt-2 w-full overflow-hidden rounded-lg border border-gray-200 bg-white shadow-lg dark:border-gray-700 dark:bg-gray-900">
        <div className="px-3 py-2 text-xs text-gray-500 dark:text-gray-400">No quick matches.</div>
      </div>
    );
  }

  return (
    <ul className="absolute z-50 mt-2 w-full overflow-hidden rounded-lg border border-gray-200 bg-white shadow-lg dark:border-gray-700 dark:bg-gray-900">
      {suggestions.map((item) => (
        <li key={`${item.route}::${item.title}`}>
          <button
            type="button"
            onClick={() => onSelect(item)}
            className="w-full border-b border-gray-100 px-3 py-2 text-left last:border-b-0 hover:bg-gray-50 dark:border-gray-800 dark:hover:bg-gray-800"
          >
            <p className="truncate text-sm font-medium text-gray-900 dark:text-gray-100">{item.title}</p>
            <p className="truncate text-xs text-gray-500 dark:text-gray-400">{item.route}</p>
          </button>
        </li>
      ))}
    </ul>
  );
}

function DesktopDropdown({ link, open, setOpen, items, alignRight = false }) {
  return (
    <li
      key={link.href}
      className="relative"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <span
        role="button"
        tabIndex={0}
        aria-haspopup="true"
        aria-expanded={open}
        className="px-3 py-2 rounded-lg text-sm font-medium cursor-default hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors inline-block"
      >
        {link.label}
      </span>

      <div
        className={`absolute ${alignRight ? 'right-0' : 'left-0'} top-full z-50 ${open ? 'block' : 'hidden'} max-h-[70vh] overflow-auto min-w-56 pt-1`}
        role="menu"
      >
        <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 shadow-lg overflow-hidden">
          <ul className="py-1">
            {items.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className="block px-4 py-2.5 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </li>
  );
}

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const { isDark } = useTheme();
  const router = useRouter();
  
  // Initialize translations
  const t = useTranslations("navbar");

  const [researchOpen, setResearchOpen] = useState(false);
  const [newsOpen, setNewsOpen] = useState(false);
  const [aboutOpen, setAboutOpen] = useState(false);

  const [researchMobileOpen, setResearchMobileOpen] = useState(false);
  const [newsMobileOpen, setNewsMobileOpen] = useState(false);
  const [aboutMobileOpen, setAboutMobileOpen] = useState(false);

  const [searchExpanded, setSearchExpanded] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchIndex, setSearchIndex] = useState([]);
  const searchInputRef = useRef(null);
  const desktopSearchRef = useRef(null);
  const mobileSearchRef = useRef(null);

  // Moved arrays inside the component to access 't'
  const navLinks = [
    { href: '/research', label: t('navLinks.research') },
    { href: '/engagement', label: t('navLinks.engagement') },
    { href: '/people/', label: t('navLinks.people') },
    { href: '/news', label: t('navLinks.news') },
    { href: '/about', label: t('navLinks.about') },
  ];

  const researchMenu = [
    { href: '/research/departments', label: t('researchMenu.departments') },
    { href: '/research/themes', label: t('researchMenu.themes') },
    { href: '/research/projects', label: t('researchMenu.projects') },
    { href: '/research/publications', label: t('researchMenu.publications') },
    { href: '/research/thesis', label: t('researchMenu.thesis') },
    { href: '/resources', label: t('researchMenu.resources') },
  ];

  const newsMenu = [
    { href: '/news&events/news', label: t('newsMenu.news') },
    { href: '/news&events/events', label: t('newsMenu.events') },
    { href: '/news&events/seminars', label: t('newsMenu.seminars') },
    { href: '/news&events/open-project-calls', label: t('newsMenu.calls') },
    { href: '/news&events/awards', label: t('newsMenu.awards') },
    { href: '/news&events/careers', label: t('newsMenu.careers') },
  ];

  const aboutMenu = [
    { href: '/about#mission', label: t('aboutMenu.mission') },
    { href: '/about/organigram', label: t('aboutMenu.organigram') },
    { href: '/about/sitemap', label: t('aboutMenu.sitemap') },
    { href: '/about/reports', label: t('aboutMenu.reports') },
    { href: '/about/procedures-regulations', label: t('aboutMenu.regulations') },
    { href: '/about/guidelines', label: t('aboutMenu.guidelines') },
    { href: '/about/virtual-tour', label: t('aboutMenu.tour') },
    { href: '/about/rooms-calendar', label: t('aboutMenu.rooms') },
    { href: '/contact', label: t('aboutMenu.contact') },
  ];

  const desktopDropdowns = {
    [t('navLinks.research')]: { open: researchOpen, setOpen: setResearchOpen, items: researchMenu },
    [t('navLinks.news')]:     { open: newsOpen,     setOpen: setNewsOpen,     items: newsMenu },
    [t('navLinks.about')]:    { open: aboutOpen,    setOpen: setAboutOpen,    items: aboutMenu },
  };

  useEffect(() => {
    if (searchExpanded && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [searchExpanded]);

  useEffect(() => {
    const base = getBasePath();
    const url = `${base}/api/search-index`;
    const fallbackUrl = `${base}/search-index.json`;

    const loadIndex = async (targetUrl) => {
      const response = await fetch(targetUrl);
      if (!response.ok) return null;
      return response.json();
    };

    loadIndex(url)
      .then(async (data) => {
        if (Array.isArray(data)) return data;
        const fallback = await loadIndex(fallbackUrl);
        return Array.isArray(fallback) ? fallback : [];
      })
      .then((data) => setSearchIndex(data))
      .catch(() => setSearchIndex([]));
  }, []);

  useEffect(() => {
    const handlePointerDown = (event) => {
      const target = event.target;
      if (desktopSearchRef.current?.contains(target)) return;
      if (mobileSearchRef.current?.contains(target)) return;
      setSearchExpanded(false);
    };

    document.addEventListener('mousedown', handlePointerDown);
    return () => document.removeEventListener('mousedown', handlePointerDown);
  }, []);

  const searchSuggestions = useMemo(() => {
    const terms = parseTerms(searchQuery);
    if (!terms.length) return [];

    return searchIndex
      .filter((item) => matchesAllTerms(item, terms))
      .map((item) => ({ ...item, _score: scoreItem(item, terms) }))
      .sort((a, b) => b._score - a._score || a.title.localeCompare(b.title))
      .slice(0, 6);
  }, [searchIndex, searchQuery]);

  const finishSearchInteraction = () => {
    setSearchExpanded(false);
    setSearchQuery('');
    setIsOpen(false);
  };

  const navigateToSearchTarget = (item) => {
    if (!item?.route) return;
    finishSearchInteraction();
    if (isExternalRoute(item.route)) {
      window.open(item.route, '_blank', 'noopener,noreferrer');
      return;
    }
    router.push(item.route);
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
      finishSearchInteraction();
    }
  };

  const handleSearchKeyDown = (e) => {
    if (e.key === "Escape") {
      finishSearchInteraction();
    }
  };

  const Arrow = ({ open }) => (
    <svg
      viewBox="0 0 20 20"
      className={`h-5 w-5 transition-transform ${open ? 'rotate-180' : ''}`}
      fill="currentColor"
      aria-hidden
    >
      <path
        fillRule="evenodd"
        d="M5.23 7.21a.75.75 0 011.06.02L10 10.94l3.71-3.71a.75.75 0 111.06 1.06l-4.24 4.24a.75.75 0 01-1.06 0L5.21 8.29a.75.75 0 01.02-1.08z"
        clipRule="evenodd"
      />
    </svg>
  );

  const MobileAccordion = ({ title, open, setOpen, items }) => (
    <li className="px-4 py-1">
      <button
        type="button"
        className="w-full flex items-center justify-between rounded-lg border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900 px-4 py-3 text-sm font-medium transition-colors hover:bg-gray-100 dark:hover:bg-gray-800"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-controls={`${title.toLowerCase().replace(/\s+/g, '-')}-mobile-panel`}
      >
        <span>{title}</span>
        <Arrow open={open} />
      </button>

      <div
        id={`${title.toLowerCase().replace(/\s+/g, '-')}-mobile-panel`}
        className={`overflow-hidden transition-[max-height,opacity] duration-300 ${
          open ? 'max-h-[1000px] opacity-100' : 'max-h-0 opacity-0'
        }`}
      >
        <ul className="mt-1 rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 divide-y divide-gray-100 dark:divide-gray-800 overflow-hidden">
          {items.map((item) => (
            <li key={item.href}>
              <Link
                href={item.href}
                className="block px-4 py-3 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                onClick={() => {
                  setIsOpen(false);
                  setOpen(false);
                }}
              >
                {item.label}
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </li>
  );

  return (
    <nav
      className="sticky top-0 z-40 bg-white/95 dark:bg-gray-950/95 backdrop-blur-sm text-gray-900 dark:text-gray-100 border-b border-gray-200 dark:border-gray-800"
      role="navigation"
      aria-label="Main navigation"
    >
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 flex justify-between items-center h-16">
        <div className="flex items-center">
          <Link href="/" aria-label="Home">
            <Image
              src={isDark ? LogoDark : LogoLight}
              alt="AI Institute Logo"
              width={160}
              height={160}
              priority
              style={{ cursor: 'pointer' }}
            />
          </Link>
          <Link href="https://www.univ-tech.eu/" aria-label="EUT">
            <Image
              src={EUT_Logo}
              alt="EUT Logo"
              width={160}
              height={160}
              priority
              className="ml-4"
              style={{ cursor: 'pointer' }}
            />
          </Link>
        </div>

        <button
          className="md:hidden p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          onClick={() => setIsOpen(!isOpen)}
          aria-label="Toggle menu"
          aria-expanded={isOpen}
        >
          {isOpen ? <FaTimes className="w-5 h-5" /> : <FaBars className="w-5 h-5" />}
        </button>

        <ul className="hidden md:flex items-center gap-1">
          {navLinks.map((link) => {
            const dd = desktopDropdowns[link.label];
            if (dd) {
              return (
                <DesktopDropdown
                  key={link.href}
                  link={link}
                  open={dd.open}
                  setOpen={dd.setOpen}
                  items={dd.items}
                  alignRight={link.label === t('navLinks.about')}
                />
              );
            }
            return (
              <li key={link.href}>
                <Link href={link.href} className="px-3 py-2 rounded-lg text-sm font-medium hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                  {link.label}
                </Link>
              </li>
            );
          })}

          {/* Search bar / icon */}
          <li className="relative flex items-center ml-2" ref={desktopSearchRef}>
            <div className={`flex items-center transition-all duration-300 ${searchExpanded ? 'w-64' : 'w-auto'}`}>
              {searchExpanded ? (
                <form onSubmit={handleSearchSubmit} className="flex items-center w-full">
                  <div className="relative flex-1">
                    <input
                      ref={searchInputRef}
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      onKeyDown={handleSearchKeyDown}
                      placeholder={t('search.placeholder')}
                      className="w-full pl-3 pr-8 py-1.5 text-sm border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                    <button
                      type="button"
                      onClick={() => { setSearchExpanded(false); setSearchQuery(""); }}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                      aria-label="Close search"
                    >
                      <FaTimes className="w-3.5 h-3.5" />
                    </button>
                    {searchQuery.trim() ? (
                      <SearchSuggestions
                        suggestions={searchSuggestions}
                        onSelect={navigateToSearchTarget}
                      />
                    ) : null}
                  </div>
                </form>
              ) : (
                <button
                  type="button"
                  onClick={() => setSearchExpanded(true)}
                  className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                  aria-label="Open search"
                >
                  <FaSearch className="w-4 h-4" />
                </button>
              )}
            </div>
          </li>

          {/* Desktop Language Switcher (compact) */}
          <li className="ml-2">
            <LanguageSwitcher compact />
          </li>
        </ul>
      </div>

      {isOpen && (
        <ul className="md:hidden flex flex-col border-t border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 py-2">
          {/* Mobile search bar */}
          <li className="px-4 py-2 mb-2" ref={mobileSearchRef}>
            <form onSubmit={handleSearchSubmit} className="flex items-center gap-2">
              <div className="relative flex-1">
                <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={t('search.mobilePlaceholder')}
                  className="w-full pl-10 pr-4 py-2.5 text-sm border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                {searchQuery.trim() ? (
                  <SearchSuggestions
                    suggestions={searchSuggestions}
                    onSelect={navigateToSearchTarget}
                  />
                ) : null}
              </div>
              <button
                type="submit"
                className="px-4 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
              >
                {t('search.button')}
              </button>
            </form>
            <div className="flex gap-2 mt-2 text-xs">
              <Link
                href="/search/chatbot"
                className="text-blue-600 dark:text-blue-400 hover:underline"
                onClick={() => setIsOpen(false)}
              >
                {t('search.chatbot')}
              </Link>
              <span className="text-gray-400">|</span>
              <Link
                href="/search/knowledge-graph"
                className="text-blue-600 dark:text-blue-400 hover:underline"
                onClick={() => setIsOpen(false)}
              >
                {t('search.knowledgeGraph')}
              </Link>
            </div>
          </li>

          {/* Mobile Language Switcher */}
          <li className="px-4 py-2 mb-2">
            <div className="w-full">
              <LanguageSwitcher />
            </div>
          </li>

          <MobileAccordion
            title={t('navLinks.research')}
            open={researchMobileOpen}
            setOpen={setResearchMobileOpen}
            items={researchMenu}
          />
          <li className="px-4 py-1">
            <Link
              href="/engagement"
              className="block w-full rounded-lg border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900 px-4 py-3 text-sm font-medium transition-colors hover:bg-gray-100 dark:hover:bg-gray-800"
              onClick={() => setIsOpen(false)}
            >
              {t('navLinks.engagement')}
            </Link>
          </li>
          <li className="px-4 py-1">
            <Link
              href="/people"
              className="block w-full rounded-lg border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900 px-4 py-3 text-sm font-medium transition-colors hover:bg-gray-100 dark:hover:bg-gray-800"
              onClick={() => setIsOpen(false)}
            >
              {t('navLinks.people')}
            </Link>
          </li>
          <MobileAccordion
            title={t('navLinks.news')}
            open={newsMobileOpen}
            setOpen={setNewsMobileOpen}
            items={newsMenu}
          />
          <MobileAccordion
            title={t('navLinks.about')}
            open={aboutMobileOpen}
            setOpen={setAboutMobileOpen}
            items={aboutMenu}
          />
        </ul>
      )}
    </nav>
  );
}