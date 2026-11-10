const DEFAULT_BASE_URL = 'http://localhost:8000';

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

async function fetchFromSnipeit(path) {
  const res = await fetch(`${getBaseUrl()}${path}`, {
    headers: getHeaders(),
    cache: 'no-store',
  });

  if (!res.ok) {
    throw new Error(`Failed to fetch ${path} from Snipe-IT`);
  }

  return res.json();
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
  const data = await fetchFromSnipeit('/api/v1/hardware');
  return data.rows || [];
}

export async function getAssetById(id) {
  return fetchFromSnipeit(`/api/v1/hardware/${encodeURIComponent(id)}`);
}

function normalizeEquipment(asset) {
  return {
    id: asset.id,
    name: asset.name || asset.model?.name || asset.asset_tag || 'Unnamed',
    status: asset.status_label?.name,
    available: asset.status_label?.status_meta === 'deployable',
    image: resolveSnipeitMediaUrl(asset.image),
    description: stripHtml(asset.notes) || null,
    roomNumber: getRoomNumber(asset),
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
