'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  FaArrowRight,
  FaBoxOpen,
  FaCheckCircle,
  FaMapMarkerAlt,
} from 'react-icons/fa';
import SmartMediaImage from '@/components/shared/SmartMediaImage';
import { gridSizes } from '@/lib/media';

function AvailabilityBadge({ available }) {
  return (
    <span
      className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold shadow-sm ring-1 backdrop-blur-md ${
        available
          ? 'bg-primary-600/95 text-white ring-white/20'
          : 'bg-gray-900/80 text-white ring-white/15'
      }`}
    >
      {available && <FaCheckCircle className="h-2.5 w-2.5" />}
      {available ? 'Available' : 'Unavailable'}
    </span>
  );
}

export default function EquipmentCard({ asset, variants }) {
  return (
    <motion.article
      variants={variants}
      layout
      className="card card-hover group flex h-full flex-col overflow-hidden"
    >
      <Link
        href={`/reserve/${asset.id}`}
        className="flex h-full flex-col focus:outline-none"
      >
        <div className="relative overflow-hidden bg-gray-100 dark:bg-gray-800">
          <SmartMediaImage
            src={asset.image}
            alt={asset.name}
            aspectRatio="aspect-video"
            sizes={gridSizes({ columns: 3 })}
            imageClassName="transition-transform duration-300 group-hover:scale-[1.03]"
            fallback={
              <div className="flex flex-col items-center justify-center gap-2 text-gray-400 dark:text-gray-500">
                <FaBoxOpen className="h-10 w-10" />
                <span className="text-xs font-medium">No image available</span>
              </div>
            }
            fallbackClassName="bg-gradient-to-br from-gray-50 via-white to-gray-200 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800"
          />

          <div className="pointer-events-none absolute inset-x-3 top-3 z-20 flex items-start justify-end gap-3">
            <AvailabilityBadge available={asset.available} />
          </div>

          {asset.roomNumber && (
            <span className="absolute bottom-3 left-3 z-20 inline-flex max-w-[calc(100%_-_1.5rem)] items-center gap-1.5 rounded-full border border-white/15 bg-black/70 px-2.5 py-1 text-xs font-semibold text-white shadow-sm backdrop-blur-md">
              <FaMapMarkerAlt className="h-3 w-3 shrink-0 text-primary-300" />
              <span className="truncate">{asset.roomNumber}</span>
            </span>
          )}
        </div>

        <div className="flex flex-1 flex-col p-5">
          <h3 className="heading-3 mb-2 line-clamp-2 text-gray-900 dark:text-white">
            {asset.name}
          </h3>

          {asset.description && (
            <p className="text-muted text-sm leading-relaxed line-clamp-3">
              {asset.description}
            </p>
          )}

          <div className="mt-auto flex items-center justify-between gap-3 pt-4 text-sm">
            <span className="text-muted">
              {asset.available
                ? 'Available for reservation'
                : 'Reserve for a future date'}
            </span>
            <span className="inline-flex shrink-0 items-center gap-1 font-semibold text-primary-600 dark:text-accent-400">
              Reserve
              <FaArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-1" />
            </span>
          </div>
        </div>
      </Link>
    </motion.article>
  );
}
