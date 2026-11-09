const PUBLICATION_UID = "api::publication.publication";

/**
 * Build the slug base for a target value.
 *
 * Publications include the year in their slug so that the same title can be
 * published in different years without colliding.
 */
export const generateSlug = (value: unknown): string =>
  String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");

export const buildSlugBase = (
  uid: string,
  targetValue: unknown,
  yearValue?: unknown,
): string => {
  const hasYear =
    uid === PUBLICATION_UID &&
    yearValue !== undefined &&
    yearValue !== null &&
    String(yearValue).trim() !== "";

  return generateSlug(hasYear ? `${targetValue || ""} ${yearValue}` : targetValue);
};

/**
 * Return `base`, or the first free `base-N` suffix when the base is already
 * used. This mirrors Strapi's own UID collision handling.
 */
export const pickUniqueSlug = (
  base: string,
  usedSlugs: Iterable<string>,
): string => {
  if (!base) {
    return base;
  }

  const used = new Set(usedSlugs);

  if (!used.has(base)) {
    return base;
  }

  let suffix = 1;
  while (used.has(`${base}-${suffix}`)) {
    suffix += 1;
  }

  return `${base}-${suffix}`;
};

const isLocalizedContentType = (contentType: any): boolean =>
  Boolean(contentType?.pluginOptions?.i18n?.localized);

const getStatusFilter = (contentType: any, status: unknown): any => {
  if (!contentType?.options?.draftAndPublish) {
    return undefined;
  }

  return status === "published" ? { $notNull: true } : null;
};

const findExistingEntry = async (
  strapi: any,
  uid: string,
  contentType: any,
  documentId: string | undefined,
  locale: string | undefined,
  status: unknown,
  targetField: string,
): Promise<any | null> => {
  if (!documentId) {
    return null;
  }

  const baseWhere: Record<string, unknown> = { documentId };

  if (isLocalizedContentType(contentType)) {
    baseWhere.locale = locale || "en";
  }

  const select = ["slug", "documentId", targetField];
  if (uid === PUBLICATION_UID) {
    select.push("year");
  }

  const publishedAt = getStatusFilter(contentType, status);
  if (publishedAt !== undefined) {
    const entry = await strapi.db.query(uid).findOne({
      where: { ...baseWhere, publishedAt },
      select,
    });
    if (entry) {
      return entry;
    }

    // The admin can update a document before its draft/published row exists
    // (for example right after draft & publish is enabled). Fall back to the
    // other version so renaming still regenerates the slug.
    return strapi.db.query(uid).findOne({ where: baseWhere, select });
  }

  return strapi.db.query(uid).findOne({ where: baseWhere, select });
};

const findUsedSlugs = async (
  strapi: any,
  uid: string,
  contentType: any,
  base: string,
  locale: string | undefined,
  documentId: string | undefined,
): Promise<Set<string>> => {
  if (!base) {
    return new Set();
  }

  const where: Record<string, unknown> = {
    slug: { $startsWith: base },
  };

  if (isLocalizedContentType(contentType)) {
    where.locale = locale || "en";
  }

  const rows: any[] = await strapi.db.query(uid).findMany({
    where,
    select: ["slug", "documentId"],
  });

  return new Set(
    rows
      .filter((row) => row.documentId !== documentId)
      .map((row) => row.slug)
      .filter(Boolean),
  );
};

/**
 * Keep slugs in sync with the field they are generated from.
 *
 * Strapi only generates a UID when the entry is created (through the admin UID
 * endpoint) and does not check for collisions when a UID is supplied directly.
 * This middleware generates a collision-free slug on create, regenerates it
 * when the target field changes, and keeps every localization on the default
 * locale's canonical slug.
 */
export const registerSlugMiddleware = (strapi: any) => {
  if (!strapi.documents?.use) {
    return;
  }

  strapi.documents.use(async (ctx: any, next: any) => {
    if (ctx.action !== "create" && ctx.action !== "update") {
      return next();
    }

    if (!ctx.params?.data) {
      return next();
    }

    const contentType = strapi.contentType(ctx.uid);
    if (!contentType?.attributes?.slug) {
      return next();
    }

    const isLocalized = isLocalizedContentType(contentType);
    const targetField = contentType.attributes.slug.targetField || "title";
    const documentId = ctx.params.documentId;
    const locale = ctx.params.locale;
    const effectiveLocale = isLocalized ? locale || "en" : undefined;

    // A translation inherits the canonical slug from the default locale. If the
    // default localization does not exist yet, fall back to generating a slug
    // from this entry's own target value.
    if (isLocalized && documentId && locale && locale !== "en") {
      let inheritedSlug: string | undefined;

      try {
        const defaultEntry: any = await strapi.db.query(ctx.uid).findOne({
          where: { documentId, locale: "en" },
          select: ["slug", targetField],
        });

        inheritedSlug = defaultEntry?.slug;
        if (!inheritedSlug && defaultEntry?.[targetField]) {
          inheritedSlug = generateSlug(defaultEntry[targetField]);
        }
      } catch (err) {
        console.error("Error inheriting default locale slug:", err);
      }

      if (inheritedSlug) {
        ctx.params.data.slug = inheritedSlug;
      } else if (!ctx.params.data.slug && ctx.params.data[targetField]) {
        const base = buildSlugBase(ctx.uid, ctx.params.data[targetField]);
        const used = await findUsedSlugs(
          strapi,
          ctx.uid,
          contentType,
          base,
          locale,
          documentId,
        );
        ctx.params.data.slug = pickUniqueSlug(base, used);
      }

      return next();
    }

    const existing =
      ctx.action === "update"
        ? await findExistingEntry(
            strapi,
            ctx.uid,
            contentType,
            documentId,
            effectiveLocale,
            ctx.params.status,
            targetField,
          )
        : null;

    const providedSlug =
      typeof ctx.params.data.slug === "string" &&
      ctx.params.data.slug.trim() !== ""
        ? ctx.params.data.slug
        : undefined;

    // The admin form can send the current slug back even when the slug field is
    // hidden. Only treat it as an intentional custom slug when it differs from
    // the value already stored on the entry.
    const hasCustomSlug =
      Boolean(providedSlug) &&
      (ctx.action === "create" || !existing || providedSlug !== existing.slug);

    const targetProvided = Object.prototype.hasOwnProperty.call(
      ctx.params.data,
      targetField,
    );
    const yearProvided =
      ctx.uid === PUBLICATION_UID &&
      Object.prototype.hasOwnProperty.call(ctx.params.data, "year");

    const targetValue = targetProvided
      ? ctx.params.data[targetField]
      : existing?.[targetField];
    const yearValue =
      ctx.uid === PUBLICATION_UID
        ? yearProvided
          ? ctx.params.data.year
          : existing?.year
        : undefined;
    const derivedBase = buildSlugBase(ctx.uid, targetValue, yearValue);

    let shouldGenerate = false;

    if (!hasCustomSlug && derivedBase) {
      if (ctx.action === "create") {
        shouldGenerate = true;
      } else if (existing) {
        const existingBase = buildSlugBase(
          ctx.uid,
          existing[targetField],
          ctx.uid === PUBLICATION_UID ? existing.year : undefined,
        );

        // Only rewrite the slug when the value it is derived from actually
        // changes. Editing unrelated fields must not break existing URLs.
        shouldGenerate =
          !existing.slug ||
          ((targetProvided || yearProvided) && derivedBase !== existingBase);
      } else {
        shouldGenerate = !ctx.params.data.slug;
      }
    }

    if (shouldGenerate) {
      const used = await findUsedSlugs(
        strapi,
        ctx.uid,
        contentType,
        derivedBase,
        effectiveLocale,
        documentId,
      );
      ctx.params.data.slug = pickUniqueSlug(derivedBase, used);
    }

    const result = await next();

    // Keep all localizations of this document on the same canonical slug.
    const finalSlug = ctx.params.data.slug;
    const targetDocumentId = documentId || result?.documentId;
    if (
      isLocalized &&
      finalSlug &&
      targetDocumentId &&
      (!locale || locale === "en")
    ) {
      try {
        await strapi.db.query(ctx.uid).updateMany({
          where: {
            documentId: targetDocumentId,
            locale: { $ne: "en" },
          },
          data: { slug: finalSlug },
        });
      } catch (err) {
        console.error("Error synchronizing slug to other localizations:", err);
      }
    }

    return result;
  });
};
