export const slugify = (value) =>
  String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");

export const toPublicationSlug = (publication) => {
  if (!publication) return "";
  const direct = publication.slug || "";
  if (direct) return slugify(direct);

  const title = publication.title || "";
  const year = publication.year ? String(publication.year) : "";
  const base = year ? `${title} ${year}` : title;
  return slugify(base);
};
