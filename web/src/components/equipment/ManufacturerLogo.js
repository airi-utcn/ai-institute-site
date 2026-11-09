'use client';

import { useEffect, useState } from 'react';

/**
 * Manufacturer logo with a text fallback. Logos come in many aspect ratios
 * (wide wordmarks, square marks, transparent SVGs), so the caller controls the
 * frame while the image itself is always contained.
 */
export default function ManufacturerLogo({
  manufacturer,
  className = '',
  imageClassName = '',
}) {
  const [failed, setFailed] = useState(false);
  const logo = manufacturer?.logo;
  const name = manufacturer?.name;

  useEffect(() => {
    setFailed(false);
  }, [logo]);

  if (!manufacturer) return null;

  return (
    <span
      className={`inline-flex items-center justify-center overflow-hidden ${className}`.trim()}
      title={name || undefined}
    >
      {logo && !failed ? (
        <img
          src={logo}
          alt={name ? `${name} logo` : 'Manufacturer logo'}
          loading="lazy"
          decoding="async"
          onError={() => setFailed(true)}
          className={`block max-h-full max-w-full object-contain ${imageClassName}`.trim()}
        />
      ) : (
        <span className="truncate text-[11px] font-semibold uppercase tracking-wide text-gray-600 dark:text-gray-300">
          {name || 'Manufacturer'}
        </span>
      )}
    </span>
  );
}
