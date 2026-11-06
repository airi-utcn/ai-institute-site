'use client';

import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { FaSearch, FaTimes, FaFlask } from 'react-icons/fa';
import LaboratoryCard from '@/components/laboratory/LaboratoryCard';
import DynamicZone from '@/components/shared/DynamicZone';
import { usePageState } from '@/lib/usePageState';

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
      delayChildren: 0.1,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.4 },
  },
};

const normalizeText = (val) =>
  (val || '')
    .toString()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

const resolveImageUrl = (image) => {
  const media = image?.data?.attributes || image?.data || image?.attributes || image;
  const url = media?.url;
  if (!url) return '';
  if (/^https?:\/\//i.test(url)) return url;

  const baseUrl = (process.env.NEXT_PUBLIC_STRAPI_URL || '').replace(/\/+$/, '');
  return `${baseUrl}${url.startsWith('/') ? url : `/${url}`}`;
};

export default function LaboratoriesClient({ laboratories = [], pageData }) {
  const [query, setQuery] = usePageState('query', '');
  const [selectedDepartment, setSelectedDepartment] = usePageState('department', 'all');

  const title = pageData?.title || 'Laboratories & Spaces';
  const subtitle =
    pageData?.subtitle ||
    'State-of-the-art research environments sponsored by visionary industry leaders and dedicated to advancing AI innovation.';
  const searchPlaceholder = pageData?.searchPlaceholder || 'Search laboratories, sponsors, or rooms...';
  const allDepartmentsLabel = pageData?.allDepartments || 'All Departments';
  const emptyStateMessage = pageData?.emptyState || 'No laboratories match your search criteria.';
  const heroImageUrl = resolveImageUrl(pageData?.heroImage);

  // Extract distinct departments from laboratories list
  const departments = useMemo(() => {
    const map = new Map();
    laboratories.forEach((lab) => {
      (lab.departments || []).forEach((dept) => {
        if (dept?.slug && dept?.name && !map.has(dept.slug)) {
          map.set(dept.slug, dept.name);
        }
      });
    });
    return Array.from(map.entries()).map(([slug, name]) => ({ slug, name }));
  }, [laboratories]);

  // Filter laboratories based on search query and selected department
  const filteredLaboratories = useMemo(() => {
    const q = normalizeText(query.trim());
    return laboratories.filter((lab) => {
      // Department filter
      if (selectedDepartment !== 'all') {
        const matchesDept = (lab.departments || []).some(
          (d) => d.slug === selectedDepartment
        );
        if (!matchesDept) return false;
      }

      // Query filter
      if (!q) return true;

      const labTitle = normalizeText(lab.title);
      const labSummary = normalizeText(lab.summary);
      const room = normalizeText(lab.roomNumber);
      const coordinator = normalizeText(lab.coordinator?.name);
      const coCoordinator = normalizeText(lab.coCoordinator?.name);
      const partners = (lab.partners || []).map((p) => normalizeText(p.name)).join(' ');
      const themes = (lab.researchThemes || []).map((theme) => normalizeText(theme.name)).join(' ');

      return (
        labTitle.includes(q) ||
        labSummary.includes(q) ||
        room.includes(q) ||
        coordinator.includes(q) ||
        coCoordinator.includes(q) ||
        partners.includes(q) ||
        themes.includes(q)
      );
    });
  }, [laboratories, query, selectedDepartment]);

  return (
    <div className="min-h-screen bg-white dark:bg-[#0a0a0a] text-gray-900 dark:text-gray-100">
      {/* Header Section */}
      <section className="relative overflow-hidden pt-12 pb-10 md:pt-16 md:pb-14 border-b border-gray-100 dark:border-gray-900 bg-gradient-to-b from-blue-50/50 via-white to-white dark:from-gray-900/40 dark:via-[#0a0a0a] dark:to-[#0a0a0a]">
        {heroImageUrl && (
          <>
            <img
              src={heroImageUrl}
              alt=""
              aria-hidden="true"
              loading="eager"
              fetchPriority="low"
              decoding="async"
              className="absolute inset-0 w-full h-full object-cover opacity-25 dark:opacity-30"
            />
            <div
              className="absolute inset-0 bg-gradient-to-b from-white/25 via-white/70 to-white dark:from-gray-950/30 dark:via-gray-950/75 dark:to-[#0a0a0a]"
              aria-hidden="true"
            />
          </>
        )}
        <div className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300 mb-4">
              <FaFlask className="w-3 h-3" />
              <span>Research Infrastructure</span>
            </div>

            <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight text-gray-900 dark:text-white mb-4">
              {title}
            </h1>

            <p className="text-base sm:text-lg text-gray-600 dark:text-gray-300 leading-relaxed">
              {subtitle}
            </p>
          </div>

          {/* Search & Filter Bar */}
          <div className="mt-8 flex flex-col sm:flex-row gap-4 items-stretch sm:items-center justify-between">
            {/* Search Box */}
            <div className="relative flex-1 max-w-md">
              <FaSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={searchPlaceholder}
                className="w-full pl-10 pr-9 py-2.5 text-sm rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors shadow-sm"
              />
              {query && (
                <button
                  type="button"
                  onClick={() => setQuery('')}
                  aria-label="Clear search"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                >
                  <FaTimes className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Department Filter Pills */}
            {departments.length > 0 && (
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
                <button
                  type="button"
                  onClick={() => setSelectedDepartment('all')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
                    selectedDepartment === 'all'
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                  }`}
                >
                  {allDepartmentsLabel}
                </button>
                {departments.map((dept) => (
                  <button
                    key={dept.slug}
                    type="button"
                    onClick={() => setSelectedDepartment(dept.slug)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
                      selectedDepartment === dept.slug
                        ? 'bg-blue-600 text-white shadow-sm'
                        : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                    }`}
                  >
                    {dept.name}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Laboratories Grid */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10 md:py-14">
        {filteredLaboratories.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-gray-200 dark:border-gray-800 p-12 text-center">
            <FaFlask className="w-10 h-10 text-gray-300 dark:text-gray-700 mx-auto mb-3" />
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-1">
              No laboratories found
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
              {emptyStateMessage}
            </p>
            {(query || selectedDepartment !== 'all') && (
              <button
                type="button"
                onClick={() => {
                  setQuery('');
                  setSelectedDepartment('all');
                }}
                className="px-4 py-2 rounded-xl text-xs font-medium bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
              >
                Reset filters
              </button>
            )}
          </div>
        ) : (
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8"
          >
            {filteredLaboratories.map((lab) => (
              <motion.div key={lab.id || lab.slug} variants={itemVariants}>
                <LaboratoryCard lab={lab} />
              </motion.div>
            ))}
          </motion.div>
        )}

        {/* Dynamic Zone Blocks if present in pageData */}
        {Array.isArray(pageData?.body) && pageData.body.length > 0 && (
          <div className="mt-16">
            <DynamicZone blocks={pageData.body} />
          </div>
        )}

      </section>
    </div>
  );
}
