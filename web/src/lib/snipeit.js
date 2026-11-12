const DEFAULT_BASE_URL = 'http://localhost:8000';
const ASSETS_PAGE_SIZE = 500;
const ASSETS_MAX_PAGES = 40;
const ASSETS_CACHE_TTL_MS = 30_000;

let assetsCache = { rows: [], expiresAt: 0 };

const getBaseUrl = () =>
  (process.env.SNIPEIT_URL || DEFAULT_BASE_URL).replace(/\/+$/, '');

const getPublicBaseUrl = () => {
  const configured =
    process.env.SNIPEIT_PUBLIC_URL ||
    process.env.NEXT_PUBLIC_SNIPEIT_URL ||
    '';

  if (configured) return configured.replace(/\/+$/, '');
  return process.env.NODE_ENV === 'production' ? '' : DEFAULT_BASE_URL;
};

const getHeaders = () => ({
  Authorization: `Bearer ${process.env.SNIPEIT_API_KEY}`,
  Accept: 'application/json',
});

export class SnipeitError extends Error {
  constructor(message, status = 502) {
    super(message);
    this.name = 'SnipeitError';
    this.status = status;
  }
}

const isNumericId = (value) => /^\d+$/.test(String(value ?? '').trim());

async function fetchFromSnipeit(path) {
  if (!process.env.SNIPEIT_API_KEY) {
    throw new SnipeitError('Snipe-IT is not configured', 502);
  }

  let res;
  try {
    res = await fetch(`${getBaseUrl()}${path}`, {
      headers: getHeaders(),
      cache: 'no-store',
      signal: AbortSignal.timeout(15_000),
    });
  } catch {
    throw new SnipeitError('Snipe-IT is unavailable', 502);
  }

  if (!res.ok) {
    throw new SnipeitError('Snipe-IT request failed', res.status);
  }

  try {
    return await res.json();
  } catch {
    throw new SnipeitError('Snipe-IT returned an invalid response', 502);
  }
}

const decodeHtmlEntities = (value) =>
  value
    .replace(/&nbsp;/gi, ' ')
    .replace(/&quot;/gi, '"')
    .replace(/&apos;/gi, "'")
    .replace(/&#39;/g, "'")
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code) =>
      String.fromCharCode(parseInt(code, 16))
    )
    .replace(/&amp;/gi, '&');

const stripHtml = (value) =>
  typeof value === 'string'
    ? decodeHtmlEntities(
        value
          .replace(/<[^>]*>/g, ' ')
          .replace(/\s+/g, ' ')
          .trim()
      )
    : '';

const cleanText = (value) =>
  typeof value === 'string' ? value.trim() : '';

const buildAssetUrl = (id) => {
  const base = getPublicBaseUrl();
  if (!base || !id) return null;
  return `${base}/hardware/${id}`;
};

const getRoomNumber = (asset) => {
  const customFields = asset?.custom_fields;

  if (customFields && typeof customFields === 'object') {
    const roomField = Object.entries(customFields).find(([name]) =>
      /room/i.test(name)
    );

    if (roomField) {
      const rawValue = roomField[1];
      const value =
        rawValue && typeof rawValue === 'object' ? rawValue.value : rawValue;
      const roomNumber = stripHtml(value);

      if (roomNumber) return roomNumber;
    }
  }

  return (
    stripHtml(asset?.location?.name) ||
    stripHtml(asset?.rtd_location?.name) ||
    null
  );
};

/**
 * Snipe-IT returns absolute URLs based on APP_URL. In some deployments that
 * points at the internal Docker hostname, which the browser cannot resolve.
 * Rewrite those URLs against the public Snipe-IT base when we have one.
 */
export function resolveSnipeitMediaUrl(value) {
  const raw = (typeof value === 'string' ? value : value?.url || '').trim();

  if (!raw) return null;
  if (/^(data|blob):/i.test(raw)) return raw;

  const internalBase = getBaseUrl();
  const publicBase = getPublicBaseUrl();

  try {
    const url = new URL(raw, internalBase);
    if (!publicBase) return url.toString();

    const internalUrl = new URL(internalBase);
    if (url.host !== internalUrl.host) return url.toString();

    const publicUrl = new URL(publicBase);
    url.protocol = publicUrl.protocol;
    url.host = publicUrl.host;

    const prefix = publicUrl.pathname.replace(/\/+$/, '');
    if (
      prefix &&
      url.pathname !== prefix &&
      !url.pathname.startsWith(`${prefix}/`)
    ) {
      url.pathname = `${prefix}${url.pathname}`;
    }

    return url.toString();
  } catch {
    return raw;
  }
}

export async function getAllAssets() {
  const now = Date.now();

  if (now < assetsCache.expiresAt) {
    return assetsCache.rows;
  }

  const rows = [];
  const seenIds = new Set();
  let offset = 0;
  let total = Number.POSITIVE_INFINITY;
  let pages = 0;
  let lastFirstId = null;

  while (offset < total && pages < ASSETS_MAX_PAGES) {
    const data = await fetchFromSnipeit(
      `/api/v1/hardware?limit=${ASSETS_PAGE_SIZE}&offset=${offset}`
    );
    const pageRows = Array.isArray(data?.rows) ? data.rows : [];

    if (pageRows.length === 0) {
      break;
    }

    // Defensive guard: some Snipe-IT versions ignore `offset`. If the first
    // row repeats, stop instead of looping over the same page.
    const firstId = String(pageRows[0]?.id ?? '');
    if (firstId && firstId === lastFirstId) {
      break;
    }
    lastFirstId = firstId;

    for (const row of pageRows) {
      const id = String(row?.id ?? '');
      if (id && seenIds.has(id)) continue;
      if (id) seenIds.add(id);
      rows.push(row);
    }

    pages += 1;

    const reportedTotal = Number(data?.total);
    if (Number.isFinite(reportedTotal)) {
      total = reportedTotal;
    }

    offset += pageRows.length;

    if (rows.length >= total) {
      break;
    }
  }

  assetsCache = {
    rows,
    expiresAt: Date.now() + ASSETS_CACHE_TTL_MS,
  };

  return rows;
}

export async function getAssetById(id) {
  if (!isNumericId(id)) {
    throw new SnipeitError('Invalid asset id', 400);
  }

  return fetchFromSnipeit(`/api/v1/hardware/${String(id).trim()}`);
}

function normalizeEquipment(asset) {
  const tag = cleanText(asset.asset_tag);
  const model = cleanText(asset.model?.name);
  const name =
    cleanText(asset.name) ||
    [tag, model].filter(Boolean).join(' · ') ||
    'Unnamed';

  return {
    id: asset.id,
    name,
    tag: tag || null,
    model: model || null,
    serial: cleanText(asset.serial) || null,
    status: asset.status_label?.name,
    available: asset.status_label?.status_meta === 'deployable',
    image: resolveSnipeitMediaUrl(asset.image),
    description: stripHtml(asset.notes) || null,
    roomNumber: getRoomNumber(asset),
    url: buildAssetUrl(asset.id),
  };
}

export async function getEquipmentAssets() {
  const assets = await getAllAssets();

  return assets.map((asset) => normalizeEquipment(asset));
}

export async function getEquipmentAssetById(id) {
  const asset = await getAssetById(id);

  return normalizeEquipment(asset);
}
