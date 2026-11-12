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
  if (!process.env.SNIPEIT_API_KEY) {
    throw new Error('SNIPEIT_API_KEY is not configured');
  }

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

    const error: any = new Error(
      `Snipe-IT request failed (${response.status}): ${
        typeof detail === 'string' ? detail : JSON.stringify(detail)
      }`
    );
    error.status = response.status;
    throw error;
  }

  return body;
}

const getAsset = async (assetId: string) => {
  const validAssetId = assertNumericId(assetId, 'asset id');
  const data = await request(`/api/v1/hardware/${validAssetId}`);

  return data && typeof data === 'object' ? data : null;
};

const assignedUserId = (asset: any) => {
  const assigned = asset?.assigned_to;

  if (assigned === null || assigned === undefined) return null;
  if (typeof assigned === 'string' || typeof assigned === 'number') {
    return String(assigned);
  }

  return assigned.id !== null && assigned.id !== undefined
    ? String(assigned.id)
    : null;
};

const findUserByEmail = async (normalizedEmail: string) => {
  const searchData = await request(
    `/api/v1/users?search=${encodeURIComponent(normalizedEmail)}`
  );

  return searchData?.rows?.find(
    (candidate: any) =>
      String(candidate.email || '').toLowerCase() === normalizedEmail
  );
};

const buildAssetSnapshot = (asset: any) => {
  const assetTag = cleanText(asset?.asset_tag);
  const assetModel = cleanText(asset?.model?.name);
  const assetName =
    cleanText(asset?.name) ||
    assetModel ||
    assetTag ||
    (asset?.id ? `Asset ${asset.id}` : '');

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
    return getAsset(assetId);
  },

  buildAssetSnapshot,

  async findOrCreateUser(firstName: string, lastName: string, email: string) {
    const normalizedEmail = String(email || '').trim().toLowerCase();

    if (!normalizedEmail) {
      throw new Error('Cannot create a Snipe-IT user without an email address');
    }

    const existing = await findUserByEmail(normalizedEmail);
    if (existing?.id) {
      return existing.id;
    }

    // The password is never shown to the user; they authenticate through the
    // website. Use a CSPRNG rather than Math.random().
    const generatedPassword = `${randomBytes(24).toString('base64url')}Aa1!`;

    try {
      const createData = await request('/api/v1/users', {
        method: 'POST',
        body: JSON.stringify({
          first_name: firstName || 'AIRi',
          last_name: lastName || 'User',
          username: normalizedEmail,
          email: normalizedEmail,
          password: generatedPassword,
          password_confirmation: generatedPassword,
          // These are shadow accounts used only as Snipe-IT checkout targets.
          // Keep them deactivated so they can never log in or reset a
          // password; Snipe-IT still allows assets to be assigned to them.
          activated: 0,
          ldap_import: 0,
          send_welcome: 0,
        }),
      });

      const userId = createData?.payload?.id ?? createData?.id;

      if (!userId) {
        throw new Error('Snipe-IT did not return the created user id');
      }

      return userId;
    } catch (err) {
      // A concurrent request may have created the same user. Re-check before
      // reporting the failure.
      const concurrent = await findUserByEmail(normalizedEmail);
      if (concurrent?.id) {
        return concurrent.id;
      }

      throw err;
    }
  },

  async checkoutAsset(assetId: string, userId: number, notes: string) {
    const validAssetId = assertNumericId(assetId, 'asset id');
    const validUserId = assertNumericId(userId, 'user id');
    const asset = await getAsset(validAssetId);
    const assigned = assignedUserId(asset);

    // Idempotent: the asset is already assigned to the same requester.
    if (assigned && assigned === validUserId) {
      return;
    }

    if (assigned) {
      throw new Error(
        `Snipe-IT asset ${validAssetId} is already assigned to another user`
      );
    }

    await request(`/api/v1/hardware/${validAssetId}/checkout`, {
      method: 'POST',
      body: JSON.stringify({
        checkout_to_type: 'user',
        assigned_user: Number(validUserId),
        note: notes,
      }),
    });
  },

  async checkinAsset(
    assetId: string,
    notes: string,
    expectedUserId?: string | null
  ) {
    const validAssetId = assertNumericId(assetId, 'asset id');
    const asset = await getAsset(validAssetId);
    const assigned = assignedUserId(asset);
    const expected = String(expectedUserId ?? '').trim();

    // Idempotent: the asset is already available.
    if (!assigned) {
      return;
    }

    if (expected && assigned !== expected) {
      throw new Error(
        `Snipe-IT asset ${validAssetId} is assigned to a different user`
      );
    }

    await request(`/api/v1/hardware/${validAssetId}/checkin`, {
      method: 'POST',
      body: JSON.stringify({ note: notes }),
    });
  },
};
