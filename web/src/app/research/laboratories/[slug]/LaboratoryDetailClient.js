'use client';

import { useState } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FaArrowLeft,
  FaMapMarkerAlt,
  FaUsers,
  FaUserTie,
  FaCalendarAlt,
  FaEnvelope,
  FaExternalLinkAlt,
  FaFlask,
  FaCube,
  FaProjectDiagram,
  FaImages,
  FaInfoCircle,
  FaBook,
  FaFilePdf,
} from 'react-icons/fa';
import VideoShowcase from '@/components/laboratory/VideoShowcase';
import SponsorPlaque from '@/components/laboratory/SponsorPlaque';
import SmartMediaImage from '@/components/shared/SmartMediaImage';
import HeroHeader from '@/components/shared/HeroHeader';
import { heroSizes } from '@/lib/media';
import GallerySlideshow from '@/components/shared/GallerySlideshow';
import DynamicZone from '@/components/shared/DynamicZone';
import PersonChip from '@/components/shared/PersonChip';
import ContentCard from '@/components/ContentCard';
import TeamCard from '@/components/TeamCard';

const DEFAULT_TEXTS = {
  backToLaboratories: 'Back to Laboratories',
  notFound: 'Laboratory not found.',
  'tabs.overview': 'Overview',
  'tabs.people': 'People',
  'tabs.projects': 'Projects',
  'tabs.publications': 'Publications',
  'overview.about': 'About',
  'overview.coordinator': 'Coordinator',
  'overview.coCoordinator': 'Co-Coordinator',
  'overview.contact': 'Contact',
  'people.researchers': 'Researchers',
  'people.teams': 'Teams',
  'people.noPeople': 'No researchers found for this laboratory.',
  'people.noTeams': 'No teams found for this laboratory.',
  'projects.noProjects': 'No projects found for this laboratory.',
  'publications.noPublications': 'No publications found for this laboratory.',
};

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.06, delayChildren: 0.05 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0 },
};

const EmptyState = ({ children }) => (
  <div className="rounded-2xl border border-dashed border-gray-200 dark:border-gray-800 p-10 text-center text-sm text-gray-500 dark:text-gray-400">
    {children}
  </div>
);

export default function LaboratoryDetailClient({
  lab,
  pageData,
  teams = [],
  publications = [],
}) {
  const [activeTab, setActiveTab] = useState('overview');

  const t = (key) => {
    let val = DEFAULT_TEXTS[key] ?? key;
    const pageDataKey = key
      .replace(/\.([a-z])/g, (match) => match[1].toUpperCase())
      .replace('.', '');
    if (pageData && pageData[pageDataKey]) {
      val = pageData[pageDataKey];
    }
    return val;
  };

  if (!lab) return null;

  const galleryImages = Array.isArray(lab.gallery) ? lab.gallery : [];
  const hasVideo = Boolean(lab.videoFile || lab.videoUrl);
  const heroSrc = lab.heroImage;
  const posterSrc = lab.videoPoster || lab.heroImage;
  const projects = Array.isArray(lab.projects) ? lab.projects : [];
  const researchers = Array.isArray(lab.researchers) ? lab.researchers : [];
  const themes = Array.isArray(lab.researchThemes) ? lab.researchThemes : [];
  const allTeams = Array.isArray(teams) ? teams : [];
  const hasContact = Boolean(lab.bookingUrl || lab.contactEmail || lab.virtualTour360Url);

  const TABS = [
    { id: 'overview', label: t('tabs.overview'), icon: FaInfoCircle },
    {
      id: 'people',
      label: t('tabs.people'),
      icon: FaUsers,
      count: researchers.length,
    },
    {
      id: 'projects',
      label: t('tabs.projects'),
      icon: FaProjectDiagram,
      count: projects.length,
    },
    {
      id: 'publications',
      label: t('tabs.publications'),
      icon: FaBook,
      count: publications.length,
    },
  ];

  return (
    <div className="min-h-screen bg-white dark:bg-[#0a0a0a] text-gray-900 dark:text-gray-100">
      <HeroHeader
        image={lab.heroImage || lab.videoPoster?.url}
        srcSet={lab.heroImageSrcSet || lab.videoPoster?.srcSet}
        focalPoint={lab.focalPoint}
        width={lab.heroImage ? lab.heroImageWidth : lab.videoPoster?.width}
        height={lab.heroImage ? lab.heroImageHeight : lab.videoPoster?.height}
        priority
        className="pt-8 pb-10 md:pt-12 md:pb-14"
        contentClassName="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8"
      >
        <Link
          href="/research/laboratories"
          className="inline-flex items-center gap-2 text-sm font-medium text-blue-600 dark:text-blue-400 hover:underline mb-6"
        >
          <FaArrowLeft className="w-3.5 h-3.5" />
          <span>{t('backToLaboratories')}</span>
        </Link>

        {/* Lab Title & Identity */}
        <header className="mb-2">
          <div className="flex flex-wrap items-center gap-3 mb-3">
            {lab.roomNumber && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-blue-100 dark:bg-blue-900/40 text-blue-800 dark:text-blue-300">
                <FaMapMarkerAlt className="w-3 h-3" />
                <span>{lab.roomNumber}</span>
              </span>
            )}

            {(lab.departments || []).map((dept) => (
              <Link
                key={dept.slug}
                href={`/research/departments/${dept.slug}`}
                className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
              >
                {dept.name}
              </Link>
            ))}

            {themes.map((theme) => (
              <span
                key={theme.slug}
                className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border border-indigo-200/50 dark:border-indigo-800/40"
              >
                {theme.name}
              </span>
            ))}
          </div>

          <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight text-gray-900 dark:text-white leading-tight mb-4">
            {lab.title}
          </h1>

          {lab.summary && (
            <p className="text-lg sm:text-xl text-gray-600 dark:text-gray-300 leading-relaxed max-w-4xl">
              {lab.summary}
            </p>
          )}
        </header>
      </HeroHeader>

      {/* Navigation tabs */}
      <div className="border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-[#0a0a0a]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex -mb-px overflow-x-auto">
            {TABS.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-5 py-3 text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${
                    isActive
                      ? 'border-primary-600 text-primary-600 dark:border-accent-400 dark:text-accent-400'
                      : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{tab.label}</span>
                  {typeof tab.count === 'number' && tab.count > 0 && (
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full font-semibold ${
                        isActive
                          ? 'bg-primary-100 dark:bg-primary-900/40 text-primary-700 dark:text-primary-300'
                          : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'
                      }`}
                    >
                      {tab.count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12">
        <AnimatePresence mode="wait">
          {activeTab === 'overview' && (
            <motion.div
              key="overview"
              variants={containerVariants}
              initial="hidden"
              animate="show"
              exit={{ opacity: 0 }}
              className="space-y-10"
            >
              {/* Video Theater Showcase (First-Class Feature) */}
              {hasVideo ? (
                <motion.section variants={itemVariants}>
                  <VideoShowcase
                    videoFile={lab.videoFile}
                    videoUrl={lab.videoUrl}
                    poster={posterSrc}
                    title={lab.videoTitle || `${lab.title} – Video Tour`}
                    description={lab.videoDescription}
                  />
                </motion.section>
              ) : heroSrc ? (
                <motion.section
                  variants={itemVariants}
                  className="rounded-2xl overflow-hidden shadow-lg border border-gray-100 dark:border-gray-800"
                >
                  <SmartMediaImage
                    src={heroSrc}
                    srcSet={lab.heroImageSrcSet}
                    sizes={heroSizes(1152)}
                    alt={lab.heroImageAlt || lab.title}
                    focalPoint={lab.focalPoint}
                    aspectRatio="aspect-video"
                    className="max-h-[500px]"
                    priority
                    fallback={<FaFlask className="w-10 h-10 opacity-40" aria-hidden="true" />}
                    fallbackClassName="bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-blue-950/30 dark:to-indigo-900/20 text-blue-400"
                  />
                </motion.section>
              ) : null}

              {/* Sponsor Recognition Plaque (Partners only) */}
              {Array.isArray(lab.partners) && lab.partners.length > 0 && (
                <motion.section variants={itemVariants}>
                  <SponsorPlaque partners={lab.partners} />
                </motion.section>
              )}

              {/* Quick Specs & Info Grid */}
              <motion.section
                variants={itemVariants}
                className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"
              >
                {lab.coordinator?.name && (
                  <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-5 shadow-sm">
                    <span className="text-xs uppercase font-semibold text-gray-500 dark:text-gray-400 block mb-2">
                      {t('overview.coordinator')}
                    </span>
                    <PersonChip person={lab.coordinator} isLead={true} />
                  </div>
                )}

                {lab.coCoordinator?.name && (
                  <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-5 shadow-sm">
                    <span className="text-xs uppercase font-semibold text-gray-500 dark:text-gray-400 block mb-2">
                      {t('overview.coCoordinator')}
                    </span>
                    <PersonChip person={lab.coCoordinator} />
                  </div>
                )}

                {lab.capacity ? (
                  <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-5 shadow-sm flex flex-col justify-between">
                    <span className="text-xs uppercase font-semibold text-gray-500 dark:text-gray-400 block mb-1">
                      Capacity
                    </span>
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                        <FaUsers className="w-5 h-5" />
                      </div>
                      <div>
                        <span className="text-xl font-extrabold text-gray-900 dark:text-white">
                          {lab.capacity}
                        </span>
                        <span className="text-xs text-gray-500 dark:text-gray-400 block">
                          Workstations / Seats
                        </span>
                      </div>
                    </div>
                  </div>
                ) : null}

                {lab.openHours ? (
                  <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-5 shadow-sm flex flex-col justify-between">
                    <span className="text-xs uppercase font-semibold text-gray-500 dark:text-gray-400 block mb-1">
                      Access Hours
                    </span>
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                        <FaCalendarAlt className="w-5 h-5" />
                      </div>
                      <p className="text-sm font-semibold text-gray-900 dark:text-white">
                        {lab.openHours}
                      </p>
                    </div>
                  </div>
                ) : null}

                {hasContact ? (
                  <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-5 shadow-sm flex flex-col justify-between">
                    <span className="text-xs uppercase font-semibold text-gray-500 dark:text-gray-400 block mb-1">
                      {t('overview.contact')}
                    </span>
                    <div className="flex flex-col gap-2">
                      {lab.virtualTour360Url && (
                        <a
                          href={lab.virtualTour360Url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 text-xs text-purple-600 dark:text-purple-400 font-semibold hover:underline"
                        >
                          <FaCube className="w-3.5 h-3.5" />
                          <span>Launch 360° Tour</span>
                          <FaExternalLinkAlt className="w-2.5 h-2.5" />
                        </a>
                      )}
                      {lab.bookingUrl && (
                        <a
                          href={lab.bookingUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 text-xs text-blue-600 dark:text-blue-400 font-semibold hover:underline"
                        >
                          <FaCalendarAlt className="w-3.5 h-3.5" />
                          <span>Reserve Laboratory</span>
                          <FaExternalLinkAlt className="w-2.5 h-2.5" />
                        </a>
                      )}
                      {lab.contactEmail && (
                        <a
                          href={`mailto:${lab.contactEmail}`}
                          className="inline-flex items-center gap-1.5 text-xs text-gray-600 dark:text-gray-300 font-medium hover:underline truncate"
                        >
                          <FaEnvelope className="w-3.5 h-3.5" />
                          <span className="truncate">{lab.contactEmail}</span>
                        </a>
                      )}
                    </div>
                  </div>
                ) : null}
              </motion.section>

              {/* Flexible page content */}
              {Array.isArray(lab.body) && lab.body.length > 0 && (
                <motion.section variants={itemVariants}>
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                    {t('overview.about')}
                  </h2>
                  <DynamicZone blocks={lab.body} />
                </motion.section>
              )}

              {/* Photo Gallery Slideshow */}
              {galleryImages.length > 0 && (
                <motion.section variants={itemVariants}>
                  <div className="flex items-center gap-2 mb-4">
                    <FaImages className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                      Laboratory Gallery
                    </h2>
                  </div>
                  <GallerySlideshow images={galleryImages} alt={lab.title} />
                </motion.section>
              )}
            </motion.div>
          )}

          {activeTab === 'people' && (
            <motion.div
              key="people"
              variants={containerVariants}
              initial="hidden"
              animate="show"
              exit={{ opacity: 0 }}
              className="space-y-10"
            >
              <motion.section variants={itemVariants}>
                <div className="flex items-center gap-2.5 mb-4">
                  <div className="p-2 rounded-lg bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400">
                    <FaUserTie className="w-4 h-4" />
                  </div>
                  <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                    {t('people.researchers')}
                  </h2>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400">
                    {researchers.length}
                  </span>
                </div>

                {researchers.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                    {researchers.map((researcher, index) => (
                      <div
                        key={researcher.slug || index}
                        className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-2 shadow-sm"
                      >
                        <PersonChip person={researcher} />
                      </div>
                    ))}
                  </div>
                ) : (
                  <EmptyState>{t('people.noPeople')}</EmptyState>
                )}
              </motion.section>

              <motion.section variants={itemVariants}>
                <div className="flex items-center gap-2.5 mb-4">
                  <div className="p-2 rounded-lg bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400">
                    <FaUsers className="w-4 h-4" />
                  </div>
                  <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                    {t('people.teams')}
                  </h2>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400">
                    {allTeams.length}
                  </span>
                </div>

                {allTeams.length > 0 ? (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    {allTeams.map((team, index) => (
                      <TeamCard
                        key={team.slug || team.id || index}
                        team={team}
                        t={t}
                      />
                    ))}
                  </div>
                ) : (
                  <EmptyState>{t('people.noTeams')}</EmptyState>
                )}
              </motion.section>
            </motion.div>
          )}

          {activeTab === 'projects' && (
            <motion.div
              key="projects"
              variants={containerVariants}
              initial="hidden"
              animate="show"
              exit={{ opacity: 0 }}
            >
              {projects.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {projects.map((project, index) => (
                    <motion.div key={project.slug || index} variants={itemVariants}>
                      <ContentCard
                        title={project.title}
                        description={project.abstract}
                        href={`/research/projects/${project.slug}`}
                        image={project.heroImage}
                        imageSrcSet={project.heroImageSrcSet}
                        imageAlt={project.heroImageAlt}
                      />
                    </motion.div>
                  ))}
                </div>
              ) : (
                <EmptyState>{t('projects.noProjects')}</EmptyState>
              )}
            </motion.div>
          )}

          {activeTab === 'publications' && (
            <motion.div
              key="publications"
              variants={containerVariants}
              initial="hidden"
              animate="show"
              exit={{ opacity: 0 }}
              className="space-y-3"
            >
              {publications.length > 0 ? (
                publications.map((pub, index) => {
                  const authors = Array.isArray(pub.authors)
                    ? pub.authors
                        .map((author) => (typeof author === 'object' ? author?.name : author))
                        .filter(Boolean)
                        .join(', ')
                    : typeof pub.authors === 'string'
                    ? pub.authors
                    : '';

                  return (
                    <motion.div
                      key={pub.slug || index}
                      variants={itemVariants}
                      className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4 shadow-sm hover:shadow-md transition-shadow"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <h3 className="font-semibold text-gray-900 dark:text-white text-sm mb-1">
                          {pub.slug ? (
                            <Link
                              href={`/research/publications/${encodeURIComponent(pub.slug)}`}
                              className="hover:text-primary-600 dark:hover:text-accent-400 transition-colors"
                            >
                              {pub.title}
                            </Link>
                          ) : (
                            pub.title
                          )}
                        </h3>
                        {pub.pdfFile?.url && (
                          <a
                            href={pub.pdfFile.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-xs font-semibold text-red-600 dark:text-red-400 hover:underline shrink-0"
                          >
                            <FaFilePdf className="w-3 h-3" />
                            <span>PDF</span>
                          </a>
                        )}
                      </div>
                      <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500 dark:text-gray-400">
                        {authors && <span>{authors}</span>}
                        {pub.year && <span>• {pub.year}</span>}
                        {pub.kind && (
                          <span className="px-2 py-0.5 bg-gray-100 dark:bg-gray-800 rounded">
                            {pub.kind}
                          </span>
                        )}
                      </div>
                    </motion.div>
                  );
                })
              ) : (
                <EmptyState>{t('publications.noPublications')}</EmptyState>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
