'use client';

import Link from 'next/link';
import { FaVideo, FaMapMarkerAlt, FaUsers, FaUserTie, FaArrowRight } from 'react-icons/fa';
import SmartMediaImage from '@/components/shared/SmartMediaImage';

export default function LaboratoryCard({ lab, className = '' }) {
  if (!lab) return null;

  const href = `/research/laboratories/${encodeURIComponent(lab.slug)}`;
  const imageUrl = lab.heroImage || lab.image;
  const hasVideo = Boolean(lab.videoFile || lab.videoUrl || lab.hasVideo);
  const primaryPartner = Array.isArray(lab.partners) && lab.partners.length > 0 ? lab.partners[0] : null;

  return (
    <article
      className={`group relative flex flex-col rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-sm transition-all duration-300 hover:shadow-xl hover:-translate-y-1 hover:border-blue-500/50 dark:hover:border-blue-400/50 overflow-hidden ${className}`}
    >
      {/* Media Preview Frame with SmartMediaImage */}
      <div className="relative overflow-hidden bg-gray-100 dark:bg-gray-800">
        <SmartMediaImage
          src={imageUrl}
          alt={lab.heroImageAlt || lab.title}
          focalPoint={lab.focalPoint}
          aspectRatio="aspect-video"
          imageClassName="group-hover:scale-105"
          fallback={<span className="text-sm font-medium">AIRI Laboratory</span>}
          fallbackClassName="bg-gradient-to-br from-blue-900/20 via-gray-900 to-indigo-950 text-gray-500"
        />

        {/* Top Badges Overlay */}
        <div className="absolute top-3 left-3 right-3 flex items-center justify-between pointer-events-none z-20">
          {lab.roomNumber ? (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-black/70 backdrop-blur-md text-white border border-white/15 shadow-sm">
              <FaMapMarkerAlt className="w-3 h-3 text-blue-400" />
              <span>{lab.roomNumber}</span>
            </span>
          ) : <span />}

          {hasVideo && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-600/90 backdrop-blur-md text-white shadow-sm ring-1 ring-white/20">
              <FaVideo className="w-3 h-3" />
              <span>Tour</span>
            </span>
          )}
        </div>
      </div>

      {/* Card Body */}
      <div className="p-5 sm:p-6 flex-1 flex flex-col justify-between">
        <div>
          {/* Sponsor Tag */}
          {primaryPartner && (
            <div className="flex items-center gap-2 mb-2.5">
              <span className="text-xs font-medium text-amber-700 dark:text-amber-400">
                Sponsored by
              </span>
              <span className="text-xs font-bold text-gray-900 dark:text-gray-100 bg-amber-50 dark:bg-amber-950/50 px-2 py-0.5 rounded-md border border-amber-200/60 dark:border-amber-800/40 truncate">
                {primaryPartner.name}
              </span>
            </div>
          )}

          {/* Title */}
          <h3 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors line-clamp-2 mb-2">
            <Link href={href} className="focus:outline-none">
              <span className="absolute inset-0 z-10" aria-hidden="true" />
              {lab.title}
            </Link>
          </h3>

          {/* Summary */}
          {lab.summary && (
            <p className="text-sm text-gray-600 dark:text-gray-300 line-clamp-3 leading-relaxed mb-4">
              {lab.summary}
            </p>
          )}
        </div>

        {/* Card Footer Meta */}
        <div className="pt-4 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
          <div className="flex items-center gap-3">
            {lab.capacity ? (
              <span className="inline-flex items-center gap-1" title="Workstations / Capacity">
                <FaUsers className="w-3 h-3 text-gray-400" />
                <span>{lab.capacity} seats</span>
              </span>
            ) : null}

            {lab.coordinator?.name ? (
              <span className="inline-flex items-center gap-1 truncate max-w-[140px]" title={`Lead: ${lab.coordinator.name}`}>
                <FaUserTie className="w-3 h-3 text-gray-400" />
                <span className="truncate">{lab.coordinator.name}</span>
              </span>
            ) : null}
          </div>

          <span className="text-blue-600 dark:text-blue-400 font-semibold group-hover:translate-x-1 transition-transform inline-flex items-center gap-1">
            <span>Explore</span>
            <FaArrowRight className="w-3 h-3" />
          </span>
        </div>
      </div>
    </article>
  );
}
