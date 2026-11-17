'use client';

import { useState } from 'react';
import { FaCube, FaExternalLinkAlt, FaPlay } from 'react-icons/fa';
import { parseMatterportUrl } from '@/lib/matterport';

/**
 * Renders the virtual tour as an in-page experience.
 *
 * The Matterport iframe is mounted only after the visitor presses play, so the
 * heavy 3D bundle is not downloaded for every page view. The model thumbnail
 * doubles as the cover image, which means editors only have to supply the URL.
 */
export default function VirtualTourShowcase({ url, title = 'Virtual Tour' }) {
  const [hasStarted, setHasStarted] = useState(false);
  const tour = parseMatterportUrl(url);

  if (!url) return null;

  if (!tour) {
    return (
      <div className="relative overflow-hidden rounded-2xl border border-gray-200/80 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-950 p-8 text-white shadow-2xl dark:border-gray-800 sm:p-12">
        <div
          className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-blue-500/20 blur-3xl"
          aria-hidden="true"
        />
        <div className="relative">
          <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-semibold backdrop-blur-md">
            <FaCube className="h-3.5 w-3.5 text-blue-300" aria-hidden="true" />
            <span>Virtual Tour</span>
          </span>
          <h2 className="mt-5 text-xl font-bold tracking-tight sm:text-2xl">
            Explore AIRi online
          </h2>
          <p className="mt-2 max-w-xl text-sm leading-relaxed text-gray-300">
            The interactive tour opens in a new tab, where you can move through the space at your own pace.
          </p>
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-primary mt-6 inline-flex items-center gap-2"
          >
            <span>Open the virtual tour</span>
            <FaExternalLinkAlt className="h-3.5 w-3.5" aria-hidden="true" />
          </a>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="relative overflow-hidden rounded-2xl border border-gray-200/80 bg-slate-950 shadow-2xl dark:border-gray-800">
        <div className="relative aspect-[4/3] w-full sm:aspect-video">
          {!hasStarted ? (
            <button
              type="button"
              onClick={() => setHasStarted(true)}
              aria-label={`Start the 3D virtual tour of ${title}`}
              className="group absolute inset-0 z-20 block h-full w-full text-left focus:outline-none focus-visible:ring-4 focus-visible:ring-inset focus-visible:ring-blue-500/80"
            >
              {/* eslint-disable-next-line @next/next/no-img-element -- Matterport already serves a sized JPEG; next/image would add a proxy and remote-pattern config. */}
              <img
                src={tour.thumbnailUrl}
                srcSet={tour.thumbnailSrcSet}
                sizes="(max-width: 1152px) 100vw, 1072px"
                alt=""
                loading="eager"
                fetchPriority="high"
                decoding="async"
                onError={(event) => {
                  event.currentTarget.style.display = 'none';
                }}
                className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
              />
              <span
                className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-950/20 to-slate-950/10"
                aria-hidden="true"
              />
              <span className="absolute inset-x-0 top-0 flex items-center justify-between p-4 sm:p-6">
                <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-black/55 px-3 py-1.5 text-xs font-semibold text-white backdrop-blur-md">
                  <FaCube className="h-3.5 w-3.5 text-blue-300" aria-hidden="true" />
                  <span>3D Virtual Tour</span>
                </span>
                <span className="hidden rounded-full border border-white/15 bg-black/40 px-3 py-1.5 text-xs font-medium text-gray-200 backdrop-blur-md sm:inline-flex">
                  Click to explore
                </span>
              </span>
              <span className="absolute inset-0 flex items-center justify-center" aria-hidden="true">
                <span className="flex h-16 w-16 items-center justify-center rounded-full bg-blue-600/90 text-white shadow-2xl ring-4 ring-white/30 backdrop-blur-md transition-all duration-300 group-hover:scale-110 group-hover:bg-blue-500 sm:h-20 sm:w-20">
                  <FaPlay className="ml-1 h-6 w-6 sm:h-7 sm:w-7" />
                </span>
              </span>
              <span className="absolute inset-x-0 bottom-0 p-4 sm:p-6">
                <span className="block text-base font-bold tracking-tight text-white drop-shadow-md sm:text-lg">
                  Start the tour
                </span>
                <span className="mt-1 block max-w-2xl text-xs text-gray-200 sm:text-sm">
                  Drag to look around, scroll to zoom, and click the floor markers to move between rooms.
                </span>
              </span>
            </button>
          ) : (
            <iframe
              src={tour.embedUrl}
              title={`${title} – 3D virtual tour`}
              allow="fullscreen; xr-spatial-tracking"
              allowFullScreen
              className="absolute inset-0 h-full w-full border-0"
            />
          )}
        </div>
      </div>

      <div className="mt-3 flex flex-col items-center justify-between gap-2 sm:flex-row">
        <p className="text-xs text-gray-500 dark:text-gray-400">
          {hasStarted
            ? 'Use the Matterport controls to move between rooms and floors.'
            : 'Click the cover to step inside.'}
        </p>
        <a
          href={tour.url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-600 hover:text-blue-500 hover:underline dark:text-blue-400 dark:hover:text-blue-300"
        >
          <span>Open in Matterport</span>
          <FaExternalLinkAlt className="h-2.5 w-2.5" aria-hidden="true" />
        </a>
      </div>
    </div>
  );
}
