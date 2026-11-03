'use client';

import Link from 'next/link';
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
} from 'react-icons/fa';
import VideoShowcase from '@/components/laboratory/VideoShowcase';
import SponsorPlaque from '@/components/laboratory/SponsorPlaque';
import SmartMediaImage from '@/components/shared/SmartMediaImage';
import GallerySlideshow from '@/components/shared/GallerySlideshow';
import DynamicZone from '@/components/shared/DynamicZone';
import PersonChip from '@/components/shared/PersonChip';
import ContentCard from '@/components/ContentCard';

export default function LaboratoryDetailClient({ lab, pageData }) {
  if (!lab) return null;

  const backLabel = 'Back to Laboratories';
  const galleryImages = Array.isArray(lab.gallery) ? lab.gallery : [];
  const hasVideo = Boolean(lab.videoFile || lab.videoUrl);
  const heroSrc = lab.heroImage;
  const posterSrc = lab.videoPoster || lab.heroImage;

  return (
    <div className="min-h-screen bg-white dark:bg-[#0a0a0a] text-gray-900 dark:text-gray-100">
      {/* Top Header / Breadcrumb */}
      <div className="border-b border-gray-100 dark:border-gray-900 bg-gray-50/50 dark:bg-gray-950/50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <Link
            href="/research/laboratories"
            className="inline-flex items-center gap-2 text-sm font-medium text-blue-600 dark:text-blue-400 hover:underline"
          >
            <FaArrowLeft className="w-3.5 h-3.5" />
            <span>{backLabel}</span>
          </Link>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12">
        {/* Lab Title & Identity */}
        <header className="mb-8">
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

            {(lab.researchThemes || []).map((theme) => (
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

        {/* Video Theater Showcase (First-Class Feature) */}
        {hasVideo ? (
          <section className="mb-12">
            <VideoShowcase
              videoFile={lab.videoFile}
              videoUrl={lab.videoUrl}
              poster={posterSrc}
              title={lab.videoTitle || `${lab.title} – Video Tour`}
              description={lab.videoDescription}
            />
          </section>
        ) : heroSrc ? (
          /* Hero Image with SmartMediaImage fallback if no video */
          <section className="mb-12 rounded-2xl overflow-hidden shadow-lg border border-gray-100 dark:border-gray-800">
            <SmartMediaImage
              src={heroSrc}
              alt={lab.heroImageAlt || lab.title}
              focalPoint={lab.focalPoint}
              aspectRatio="aspect-[21/9]"
              className="max-h-[500px]"
              priority
              fallback={<FaFlask className="w-10 h-10 opacity-40" aria-hidden="true" />}
              fallbackClassName="bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-blue-950/30 dark:to-indigo-900/20 text-blue-400"
            />
          </section>
        ) : null}

        {/* Sponsor Recognition Plaque (Partners only) */}
        {Array.isArray(lab.partners) && lab.partners.length > 0 && (
          <section className="mb-12">
            <SponsorPlaque partners={lab.partners} />
          </section>
        )}

        {/* Quick Specs & Info Grid */}
        <section className="mb-12 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {lab.coordinator?.name && (
            <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-5 shadow-sm">
              <span className="text-xs uppercase font-semibold text-gray-500 dark:text-gray-400 block mb-2">
                Laboratory Coordinator
              </span>
              <PersonChip person={lab.coordinator} isLead={true} />
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

          {(lab.bookingUrl || lab.contactEmail || lab.virtualTour360Url) ? (
            <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-5 shadow-sm flex flex-col justify-between">
              <span className="text-xs uppercase font-semibold text-gray-500 dark:text-gray-400 block mb-1">
                Connect & Visit
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
        </section>

        {/* Photo Gallery Slideshow */}
        {galleryImages.length > 0 && (
          <section className="mb-14">
            <div className="flex items-center gap-2 mb-4">
              <FaImages className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                Laboratory Gallery
              </h2>
            </div>
            <GallerySlideshow images={galleryImages} alt={lab.title} />
          </section>
        )}

        {/* Dynamic Zone Content (Flexible future blocks) */}
        {Array.isArray(lab.body) && lab.body.length > 0 && (
          <section className="mb-14">
            <DynamicZone blocks={lab.body} />
          </section>
        )}

        {/* Associated Projects Section */}
        {Array.isArray(lab.projects) && lab.projects.length > 0 && (
          <section className="mb-14 pt-8 border-t border-gray-100 dark:border-gray-800">
            <div className="flex items-center gap-2 mb-6">
              <FaProjectDiagram className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                Research Conducted in this Laboratory
              </h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {lab.projects.map((proj) => (
                <ContentCard
                  key={proj.slug || proj.id}
                  title={proj.title}
                  description={proj.abstract}
                  href={`/research/projects/${proj.slug}`}
                  image={proj.heroImage}
                />
              ))}
            </div>
          </section>
        )}

        {/* Researchers & Team Section */}
        {Array.isArray(lab.researchers) && lab.researchers.length > 0 && (
          <section className="mb-14 pt-8 border-t border-gray-100 dark:border-gray-800">
            <div className="flex items-center gap-2 mb-6">
              <FaUserTie className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                Affiliated Researchers
              </h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {lab.researchers.map((researcher) => (
                <div
                  key={researcher.slug || researcher.name}
                  className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-3 shadow-sm"
                >
                  <PersonChip person={researcher} />
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
