import dataverseMap from "./staff/dataverseData.json";

export function getResourcesByAuthor(slug) {
  const list = dataverseMap?.[slug];
  return Array.isArray(list) ? list : [];
}
