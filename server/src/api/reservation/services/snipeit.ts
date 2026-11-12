import { randomBytes } from 'node:crypto';

declare const process: any;
declare const fetch: any;

const getHeaders = () => ({
  Authorization: `Bearer ${process.env.SNIPEIT_API_KEY}`,
  'Content-Type': 'application/json',
  Accept: 'application/json',
});

const getBaseUrl = () => {
  const baseUrl = process.env.SNIPEIT_URL;

  if (!baseUrl) {
    throw new Error('SNIPEIT_URL is not configured');
  }

  return String(baseUrl).replace(/\/+$/, '');
};

const getPublicBaseUrl = () =>
  String(process.env.SNIPEIT_PUBLIC_URL || process.env.SNIPEIT_URL || '')
    .trim()
    .replace(/\/+$/, '');

const cleanText = (value: unknown) =>
  typeof value === 'string' ? value.trim() : '';

const buildAssetUrl = (assetId: unknown) => {
  const base = getPublicBaseUrl();
  const id = String(assetId ?? '').trim();

  if (!base || !id) return '';

  return `${base}/hardware/${encodeURIComponent(id)}`;
};

const resolveAssetMediaUrl = (value: unknown) => {
  const raw =
    typeof value === 'string' ? value.trim() : cleanText((value as any)?.url);

  if (!raw) return '';
  if (/^(data|blob):/i.test(raw)) return raw;

  const publicBase = getPublicBaseUrl();

  try {
    const url = new URL(raw, getBaseUrl());

    if (!publicBase) return url.toString();

    const publicUrl = new URL(publicBase);
    const internalUrl = new URL(getBaseUrl());

    // Snipe-IT may emit URLs based on its internal Docker host. Rewrite only
    // those, so externally configured media URLs are left untouched.
    if (url.host !== internalUrl.host) return url.toString();

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
};

const NUMERIC_ID = /^\d+$/;

const assertNumericId = (value: unknown, label: string) => {
  const normalized = String(value ?? '').trim();

  if (!NUMERIC_ID.test(normalized)) {
    throw new Error(`Invalid ${label}`);
  }

  return normalized;
};

async function request(path: string, options: any = {}) {
  const response = await fetch(`${getBaseUrl()}${path}`, {
    ...options,
    headers: { ...getHeaders(), ...(options.headers || {}) },
    signal: AbortSignal.timeout(15_000),
  });

  const text = await response.text();
  let body: any = null;

  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = text;
  }

  if (!response.ok) {
    const detail =
      body?.messages ||
      body?.message ||
      body?.error ||
      response.statusText ||
      'unknown error';

    throw new Error(
      `Snipe-IT request failed (${response.status}): ${
        typeof detail === 'string' ? detail : JSON.stringify(detail)
      }`
    );
  }

  return body;
}

const buildAssetSnapshot = (asset: any) => {
  const assetTag = cleanText(asset?.asset_tag);
  const assetModel = cleanText(asset?.model?.name);
  const assetName =
    cleanText(asset?.name) || assetModel || assetTag || '';

  return {
    assetName,
    assetTag,
    assetModel,
    assetSerial: cleanText(asset?.serial),
    assetLocation:
      cleanText(asset?.location?.name) ||
      cleanText(asset?.rtd_location?.name),
    assetImageUrl: resolveAssetMediaUrl(asset?.image),
    assetUrl: buildAssetUrl(asset?.id),
  };
};

export const snipeitService = {
  async getAsset(assetId: string) {
    const validAssetId = assertNumericId(assetId, 'asset id');
    const data = await request(`/api/v1/hardware/${validAssetId}`);

    return data && typeof data === 'object' ? data : null;
  },

  buildAssetSnapshot,

  async findOrCreateUser(firstName: string, lastName: string, email: string) {
    const normalizedEmail = String(email || '').trim().toLowerCase();

    if (!normalizedEmail) {
      throw new Error('Cannot create a Snipe-IT user without an email address');
    }

    const searchData = await request(
      `/api/v1/users?search=${encodeURIComponent(normalizedEmail)}`
    );
    const user = searchData?.rows?.find(
      (candidate: any) =>
        String(candidate.email || '').toLowerCase() === normalizedEmail
    );

    if (user?.id) {
      return user.id;
    }

    // The password is never shown to the user; they authenticate through the
    // website. Use a CSPRNG rather than Math.random().
    const generatedPassword = `${randomBytes(24).toString('base64url')}Aa1!`;

    const createData = await request('/api/v1/users', {
      method: 'POST',
      body: JSON.stringify({
        first_name: firstName || 'AIRi',
        last_name: lastName || 'User',
        username: normalizedEmail,
        email: normalizedEmail,
        password: generatedPassword,
        password_confirmation: generatedPassword,
      }),
    });

    const userId = createData?.payload?.id ?? createData?.id;

    if (!userId) {
      throw new Error('Snipe-IT did not return the created user id');
    }

    return userId;
  },

  async checkoutAsset(assetId: string, userId: number, notes: string) {
    const validAssetId = assertNumericId(assetId, 'asset id');
    const validUserId = assertNumericId(userId, 'user id');

    await request(`/api/v1/hardware/${validAssetId}/checkout`, {
      method: 'POST',
      body: JSON.stringify({
        checkout_to_type: 'user',
        assigned_user: Number(validUserId),
        note: notes,
      }),
    });
  },

  async checkinAsset(assetId: string, notes: string) {
    const validAssetId = assertNumericId(assetId, 'asset id');

    await request(`/api/v1/hardware/${validAssetId}/checkin`, {
      method: 'POST',
      body: JSON.stringify({ note: notes }),
    });
  },
};
