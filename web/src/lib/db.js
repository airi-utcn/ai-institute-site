const STRAPI_URL = process.env.STRAPI_INTERNAL_URL || "http://strapi:1337";
const HEADERS = {
  "Content-Type": "application/json",
  "Authorization": `Bearer ${process.env.STRAPI_API_TOKEN}`,
};

async function strapiRequest(path, options = {}) {
  const res = await fetch(`${STRAPI_URL}${path}`, {
    ...options,
    headers: { ...HEADERS, ...options.headers },
    cache: "no-store",
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
    throw new Error(`Strapi request failed (${res.status}): ${detail}`);
  }

  return json;
}

export async function getAllReservations() {
  const params = new URLSearchParams();
  params.set("pagination[pageSize]", "1000");
  params.set("sort", "startDate:asc");

  const json = await strapiRequest(`/api/reservations?${params.toString()}`);
  return json?.data || [];
}

export async function getReservationsByEmail(email) {
  const params = new URLSearchParams();
  params.set("filters[userEmail][$eq]", email);
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

export async function hasOverlappingReservation(assetId, startDate, endDate) {
  const activeStatuses = ["pending", "approved", "checked_out"];
  const reservations = await getAllReservations();

  const active = reservations.filter((r) =>
    String(r.assetId) === String(assetId) &&
    activeStatuses.includes(r.assetStatus)
  );

  return active.some((r) => startDate <= r.endDate && endDate >= r.startDate);
}
