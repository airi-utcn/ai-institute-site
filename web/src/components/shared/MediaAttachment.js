'use client';

import {
  FaDownload,
  FaFileAlt,
  FaFileArchive,
  FaFileExcel,
  FaFilePdf,
  FaFilePowerpoint,
  FaFileWord,
  FaExternalLinkAlt,
} from 'react-icons/fa';

const ICON_STYLES = {
  pdf: {
    Icon: FaFilePdf,
    container: 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400',
  },
  word: {
    Icon: FaFileWord,
    container: 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400',
  },
  excel: {
    Icon: FaFileExcel,
    container: 'bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400',
  },
  powerpoint: {
    Icon: FaFilePowerpoint,
    container: 'bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400',
  },
  archive: {
    Icon: FaFileArchive,
    container: 'bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400',
  },
  file: {
    Icon: FaFileAlt,
    container: 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300',
  },
};

const ICON_BY_EXTENSION = {
  pdf: 'pdf',
  doc: 'word',
  docx: 'word',
  odt: 'word',
  rtf: 'word',
  xls: 'excel',
  xlsx: 'excel',
  csv: 'excel',
  ods: 'excel',
  ppt: 'powerpoint',
  pptx: 'powerpoint',
  odp: 'powerpoint',
  zip: 'archive',
  rar: 'archive',
  '7z': 'archive',
  tar: 'archive',
  gz: 'archive',
  bz2: 'archive',
};

export function getFileExtension(media) {
  const explicit = String(media?.ext || '').replace(/^\./, '').trim();
  if (explicit) return explicit.toLowerCase();

  const name = String(media?.name || media?.url || '');
  const path = name.split(/[?#]/)[0];
  const match = /\.([a-z0-9]+)$/i.exec(path);
  if (match) return match[1].toLowerCase();

  const mime = String(media?.mime || '');
  if (mime === 'application/pdf') return 'pdf';
  const subtype = mime.split('/')[1];
  return subtype ? subtype.replace(/[^a-z0-9]/gi, '').toLowerCase() : '';
}

export function formatFileSize(size) {
  const bytes = Number(size);
  if (!Number.isFinite(bytes) || bytes <= 0) return '';

  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const power = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const value = bytes / 1024 ** power;

  return `${value >= 10 || power === 0 ? Math.round(value) : value.toFixed(1)} ${units[power]}`;
}

const safeDecode = (value) => {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
};

export default function MediaAttachment({ media, caption, className = '' }) {
  const url = media?.url || '';
  if (!url) return null;

  const extension = getFileExtension(media);
  const iconKey = ICON_BY_EXTENSION[extension] || 'file';
  const { Icon, container } = ICON_STYLES[iconKey];

  const rawName = String(media?.name || '');
  const fallbackName = safeDecode(
    String(url).split(/[?#]/)[0].split('/').pop() || ''
  );
  const name = rawName || fallbackName || 'Attachment';

  const sizeLabel = formatFileSize(media?.size);
  const isPdf = extension === 'pdf' || media?.mime === 'application/pdf';
  const actionLabel = isPdf ? 'Open PDF' : 'Download file';
  const ActionIcon = isPdf ? FaExternalLinkAlt : FaDownload;

  return (
    <figure className={`${className || 'my-8'}`.trim()}>
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="group flex items-center gap-4 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm transition-colors hover:border-blue-300 hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 dark:border-gray-800 dark:bg-gray-900 dark:hover:border-blue-500/60"
      >
        <span
          className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${container}`}
          aria-hidden="true"
        >
          <Icon className="h-6 w-6" />
        </span>

        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-semibold text-gray-900 dark:text-white">
            {name}
          </span>
          <span className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-gray-500 dark:text-gray-400">
            <span className="font-semibold uppercase tracking-wide text-gray-600 dark:text-gray-300">
              {extension || 'FILE'}
            </span>
            {sizeLabel && <span>{sizeLabel}</span>}
            <span className="font-medium text-blue-600 group-hover:underline dark:text-blue-400">
              {actionLabel}
            </span>
          </span>
        </span>

        <ActionIcon
          className="h-4 w-4 shrink-0 text-gray-400 transition-colors group-hover:text-blue-600 dark:group-hover:text-blue-400"
          aria-hidden="true"
        />
      </a>

      {caption && (
        <figcaption className="mt-2 text-center text-sm italic text-gray-500 dark:text-gray-400">
          {caption}
        </figcaption>
      )}
    </figure>
  );
}
