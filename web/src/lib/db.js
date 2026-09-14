const STRAPI_URL = process.env.STRAPI_INTERNAL_URL || "http://strapi:1337";
const HEADERS = {
  "Content-Type": "application/json",
  "Authorization": `Bearer ${process.env.STRAPI_API_TOKEN}`,
};

export async function getAllReservations() {
  const res = await fetch(`${STRAPI_URL}/api/reservations`, { headers: HEADERS, cache: "no-store" });
  const json = await res.json();
  return json.data || [];
}

export async function getReservationById(documentId) {
  const res = await fetch(`${STRAPI_URL}/api/reservations/${documentId}`, { headers: HEADERS, cache: "no-store" });
  const json = await res.json();
  return json.data;
}

export async function createReservation(data) {
  const res = await fetch(`${STRAPI_URL}/api/reservations`, {
    method: "POST",
    headers: HEADERS,
    body: JSON.stringify({ data: { ...data, assetStatus: "pending" } }),
  });
  const json = await res.json();
  return json.data;
}

export async function updateReservationStatus(documentId, newStatus) {
  const res = await fetch(`${STRAPI_URL}/api/reservations/${documentId}`, {
    method: "PUT",
    headers: HEADERS,
    body: JSON.stringify({ data: { assetStatus: newStatus } }),
  });
  const json = await res.json();
  return json.data;
}

export async function hasOverlappingReservation(assetId, startDate, endDate) {
  const activeStatuses = ["pending", "approved", "checked_out"];
  const reservations = await getAllReservations();
  
  const active = reservations.filter((r) => 
    r.assetId === String(assetId) && activeStatuses.includes(r.assetStatus)
  );
  
  return active.some((r) => startDate <= r.endDate && endDate >= r.startDate);
}