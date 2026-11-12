const STRAPI_URL = (
  process.env.STRAPI_INTERNAL_URL || "http://strapi:1337"
).replace(/\/+$/, "");
const HEADERS = {
  "Content-Type": "application/json",
  "Authorization": `Bearer ${process.env.STRAPI_API_TOKEN}`,
};

async function strapiRequest(path, options = {}) {
  const res = await fetch(`${STRAPI_URL}${path}`, {
    ...options,
    headers: { ...HEADERS, ...options.headers },
    cache: "no-store",
    signal: AbortSignal.timeout(15_000),
  });

  const text = await res.text();
  let json = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = null;
  }

  if (!res.ok) {
    const detail = json?.error?.message || json?.error || res.statusText;
    const error = new Error(
      `Strapi request failed (${res.status}): ${detail}`
    );
    error.status = res.status;
    error.detail = detail;
    throw error;
  }

  return json;
}

export async function getReservationsForUser({ email, objectId }) {
  const params = new URLSearchParams();
  let index = 0;

  if (objectId) {
    params.set(`filters[$or][${index}][userObjectId][$eq]`, objectId);
    index += 1;
  }

  if (email) {
    params.set(`filters[$or][${index}][userEmail][$eq]`, email);
  }

  if (index === 0) return [];

  params.set("sort", "startDate:desc");
  params.set("pagination[pageSize]", "100");

  const json = await strapiRequest(`/api/reservations?${params.toString()}`);
  return json?.data || [];
}

export async function getReservationById(documentId) {
  const json = await strapiRequest(
    `/api/reservations/${encodeURIComponent(documentId)}`
  );
  return json?.data;
}

export async function createReservation(data) {
  const json = await strapiRequest("/api/reservations", {
    method: "POST",
    body: JSON.stringify({ data: { ...data, assetStatus: "pending" } }),
  });
  return json?.data;
}

export async function updateReservationStatus(documentId, newStatus) {
  const json = await strapiRequest(
    `/api/reservations/${encodeURIComponent(documentId)}`,
    {
      method: "PUT",
      body: JSON.stringify({ data: { assetStatus: newStatus } }),
    }
  );
  return json?.data;
}

const ACTIVE_STATUSES = ["pending", "approved", "checked_out"];

export async function hasOverlappingReservation(
  assetId,
  startDate,
  endDate
) {
  const params = new URLSearchParams();
  params.set("filters[assetId][$eq]", String(assetId));
  ACTIVE_STATUSES.forEach((status, index) => {
    params.set(`filters[assetStatus][$in][${index}]`, status);
  });
  params.set("filters[startDate][$lte]", endDate);
  params.set("filters[endDate][$gte]", startDate);
  params.set("fields[0]", "documentId");
  params.set("pagination[pageSize]", "1");

  const json = await strapiRequest(`/api/reservations?${params.toString()}`);
  return (json?.data?.length || 0) > 0;
}
