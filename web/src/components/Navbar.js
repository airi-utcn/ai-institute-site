"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from 'next/link';
import Image from 'next/image';
import { FaBars, FaTimes, FaSearch } from 'react-icons/fa';
import Logo5 from '../../public/media/Logos/Logo5.svg';
import Logo5White from '../../public/media/Logos/Logo3.png';
import { useTheme } from "@/components/ThemeProvider";

const navLinks = [
  { href: '/research', label: 'Research' },
  { href: '/engagement', label: 'Engagement' },
  { href: '/people/', label: 'People' },
  { href: '/news', label: 'News & Events' },
  { href: '/about', label: 'About' },
];

// Engagement is now a single unified page with tabs, no dropdown needed

// People is now a single unified page, no dropdown needed

const researchMenu = [
  { href: '/research/departments', label: 'Departments' },
  { href: '/research/themes', label: 'Themes' },
  { href: '/research/projects', label: 'Projects' },
  { href: '/research/publications', label: 'Publications' },
  { href: '/research/thesis', label: 'Thesis' },
  { href: '/research/tools', label: 'Tools' },
  { href: '/research/datasets', label: 'Datasets' },
];

const newsMenu = [
  { href: '/news&events/news', label: 'News' },
  { href: '/news&events/events', label: 'Events' },
  { href: '/news&events/seminars', label: 'Seminars' },
  { href: '/news&events/open-project-calls', label: 'Calls for Projects' },
  { href: '/news&events/awards', label: 'Awards' },
  { href: '/news&events/careers', label: 'Career Opportunities' },
];

const aboutMenu = [
  { href: '/about#mission', label: 'Mission' },
  { href: '/about/organigram', label: 'Organigram' },
  { href: '/about/sitemap', label: 'Sitemap' },
  { href: '/about/reports', label: 'Reports' },
  { href: '/about/procedures-regulations', label: 'Regulations' },
  { href: '/about/guidelines', label: 'Guidelines' },
  { href: '/about/virtual-tour', label: 'Virtual Tour' },
  { href: '/about/rooms-calendar', label: 'Rooms & calendar' },
  { href: '/contact', label: 'Contact' },
];

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

  const [researchOpen, setResearchOpen] = useState(false);
  const [newsOpen, setNewsOpen] = useState(false);
  const [aboutOpen, setAboutOpen] = useState(false);

  const [researchMobileOpen, setResearchMobileOpen] = useState(false);
  const [newsMobileOpen, setNewsMobileOpen] = useState(false);
  const [aboutMobileOpen, setAboutMobileOpen] = useState(false);

  // Search state
  const [searchExpanded, setSearchExpanded] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const searchInputRef = useRef(null);

  const desktopDropdowns = {
    'Research':      { open: researchOpen, setOpen: setResearchOpen, items: researchMenu },
    'News & Events': { open: newsOpen,     setOpen: setNewsOpen,     items: newsMenu },
    'About':         { open: aboutOpen,    setOpen: setAboutOpen,    items: aboutMenu },
  };

  // Focus input when search expands
  useEffect(() => {
    if (searchExpanded && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [searchExpanded]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
      setSearchExpanded(false);
      setSearchQuery("");
      setIsOpen(false);
    }
  };

  const handleSearchKeyDown = (e) => {
    if (e.key === "Escape") {
      setSearchExpanded(false);
      setSearchQuery("");
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
              src={isDark && Logo5White ? Logo5White : Logo5}
              alt="AI Institute Logo"
              width={160}
              height={160}
              priority
              style={{ cursor: 'pointer', filter: !Logo5White && isDark ? 'invert(1) brightness(2)' : undefined }}
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
                  alignRight={link.label === 'About'}
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
          <li className="relative flex items-center ml-2">
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
                      placeholder="Search..."
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
        </ul>
      </div>

      {isOpen && (
        <ul className="md:hidden flex flex-col border-t border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 py-2">
          {/* Mobile search bar */}
          <li className="px-4 py-2 mb-2">
            <form onSubmit={handleSearchSubmit} className="flex items-center gap-2">
              <div className="relative flex-1">
                <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search the site..."
                  className="w-full pl-10 pr-4 py-2.5 text-sm border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <button
                type="submit"
                className="px-4 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
              >
                Search
              </button>
            </form>
            <div className="flex gap-2 mt-2 text-xs">
              <Link
                href="/search/chatbot"
                className="text-blue-600 dark:text-blue-400 hover:underline"
                onClick={() => setIsOpen(false)}
              >
                AIRi chatbot
              </Link>
              <span className="text-gray-400">|</span>
              <Link
                href="/search/knowledge-graph"
                className="text-blue-600 dark:text-blue-400 hover:underline"
                onClick={() => setIsOpen(false)}
              >
                Knowledge graphs
              </Link>
            </div>
          </li>

          <MobileAccordion
            title="Research"
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
              Engagement
            </Link>
          </li>
          <li className="px-4 py-1">
            <Link
              href="/people"
              className="block w-full rounded-lg border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900 px-4 py-3 text-sm font-medium transition-colors hover:bg-gray-100 dark:hover:bg-gray-800"
              onClick={() => setIsOpen(false)}
            >
              People
            </Link>
          </li>
          <MobileAccordion
            title="News & Events"
            open={newsMobileOpen}
            setOpen={setNewsMobileOpen}
            items={newsMenu}
          />
          <MobileAccordion
            title="About"
            open={aboutMobileOpen}
            setOpen={setAboutMobileOpen}
            items={aboutMenu}
          />
        </ul>
      )}
    </nav>
  );
}
