// import type { Core } from "@strapi/strapi";

const SLUG_COLLECTIONS = [
  "api::publication.publication",
  "api::project.project",
  "api::department.department",
  "api::result.result",
  "api::news-article.news-article",
  "api::partner.partner",
  "api::person.person",
  "api::event.event",
  "api::seminar.seminar",
  "api::research-theme.research-theme",
  "api::resource.resource",
  "api::team.team",
];

const generateSlug = (str: any) =>
  String(str || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");

export default {
  /**
   * An asynchronous register function that runs before
   * your application is initialized.
   */
  register({ strapi }: any) {
    if (!strapi.documents) return;

    // Document Service middleware: Force all localizations to inherit and share the canonical slug of the default locale (en)
    strapi.documents.use(async (ctx: any, next: any) => {
      if (ctx.action !== "create" && ctx.action !== "update") {
        return next();
      }

      if (!ctx.params || !ctx.params.data) {
        return next();
      }

      const contentType = strapi.contentType(ctx.uid);
      if (!contentType?.attributes?.slug) {
        return next();
      }

      const isLocalized = Boolean(contentType.pluginOptions?.i18n?.localized);
      const targetField = contentType.attributes.slug.targetField || "title";
      const documentId = ctx.params.documentId;
      const locale = ctx.params.locale;

      // 1. If this is a translation (e.g. locale != "en"), force it to inherit the default locale slug
      if (isLocalized && documentId && locale && locale !== "en") {
        try {
          const defaultEntry: any = await strapi.db.query(ctx.uid).findOne({
            where: { documentId, locale: "en" },
            select: ["slug", targetField],
          });

          if (defaultEntry?.slug) {
            ctx.params.data.slug = defaultEntry.slug;
          } else if (defaultEntry?.[targetField]) {
            ctx.params.data.slug = generateSlug(defaultEntry[targetField]);
          }
        } catch (err) {
          console.error("Error inheriting default locale slug:", err);
        }
      }

      // 2. If slug is not set (e.g. creating the default locale entry or no default locale entry yet)
      if (!ctx.params.data.slug && ctx.params.data[targetField]) {
        let val = generateSlug(ctx.params.data[targetField]);
        if (ctx.uid === "api::publication.publication" && ctx.params.data.year) {
          val = generateSlug(ctx.params.data[targetField] + " " + ctx.params.data.year);
        }
        ctx.params.data.slug = val;
      }

      const result = await next();

      // 3. If saving default locale (en), synchronize the slug to all other localizations of this document
      const finalSlug = ctx.params.data.slug;
      const targetDocId = documentId || result?.documentId;
      if (isLocalized && finalSlug && targetDocId && (!locale || locale === "en")) {
        try {
          await strapi.db.query(ctx.uid).updateMany({
            where: {
              documentId: targetDocId,
              locale: { $ne: "en" },
            },
            data: {
              slug: finalSlug,
            },
          });
        } catch (err) {
          console.error("Error synchronizing slug to other localizations:", err);
        }
      }

      return result;
    });
  },

  /**
   * An asynchronous bootstrap function that runs before
   * your application gets started.
   */
  async bootstrap({ strapi }: any) {
    // 1. Set public permissions for read-only access to all content types
    const publicRole = await strapi
      .query("plugin::users-permissions.role")
      .findOne({ where: { type: "public" } });

    if (!publicRole) {
      console.warn("⚠️  Public role not found - skipping permissions setup");
    } else {
      const contentTypes = [
        "api::person.person",
        "api::department.department",
        "api::project.project",
        "api::publication.publication",
        "api::research-theme.research-theme",
        "api::partner.partner",
        "api::news-article.news-article",
        "api::resource.resource",
        "api::event.event",
        "api::seminar.seminar",
        "api::global.global",
        "api::home-page.home-page",
        "api::about-page.about-page",
        "api::contact-page.contact-page",
        "api::engagement-page.engagement-page",
        "api::news-page.news-page",
        "api::people-page.people-page",
        "api::research-page.research-page",
        "api::resources-page.resources-page",
        "api::media-page.media-page",
        "api::search-page.search-page",
        "api::timeline-page.timeline-page",
      ];

      let addedCount = 0;

      for (const uid of contentTypes) {
        const actions = ["find", "findOne"];

        for (const action of actions) {
          const existing = await strapi
            .query("plugin::users-permissions.permission")
            .findOne({
              where: {
                action: `${uid}.${action}`,
              },
              populate: ["role"],
            });

          if (!existing || !existing.role || existing.role.id !== publicRole.id) {
            const permission = await strapi
              .query("plugin::users-permissions.permission")
              .create({
                data: {
                  action: `${uid}.${action}`,
                  enabled: true,
                },
              });

            await strapi.db.connection.raw(
              "INSERT INTO up_permissions_role_lnk (permission_id, role_id) VALUES (?, ?) ON CONFLICT DO NOTHING",
              [permission.id, publicRole.id]
            );

            addedCount++;
          }
        }
      }

      if (addedCount > 0) {
        console.log(`✅ Added ${addedCount} public permissions`);
      } else {
        console.log("ℹ️  Public permissions already configured");
      }
    }

    // 2. Backfill & synchronize canonical slugs across all localized collections
    for (const uid of SLUG_COLLECTIONS) {
      const model = strapi.contentType(uid);
      if (!model || !model.attributes?.slug) continue;
      const targetField = model.attributes.slug.targetField || "title";

      try {
        const allRows: any[] = await strapi.db.query(uid).findMany({
          select: ["id", "documentId", "locale", "slug", targetField],
        });

        const byDoc = new Map<string, any[]>();
        for (const row of allRows) {
          if (!row.documentId) continue;
          if (!byDoc.has(row.documentId)) byDoc.set(row.documentId, []);
          byDoc.get(row.documentId)!.push(row);
        }

        for (const [docId, rows] of byDoc.entries()) {
          const enRow = rows.find((r) => r.locale === "en");
          let canonicalSlug = enRow?.slug;
          if (!canonicalSlug && enRow?.[targetField]) {
            canonicalSlug = generateSlug(enRow[targetField]);
          }
          if (!canonicalSlug) {
            const anyWithSlug = rows.find((r) => r.slug);
            canonicalSlug = anyWithSlug?.slug;
          }
          if (!canonicalSlug) {
            const anyWithTitle = rows.find((r) => r[targetField]);
            if (anyWithTitle) canonicalSlug = generateSlug(anyWithTitle[targetField]);
          }

          if (canonicalSlug) {
            for (const row of rows) {
              if (row.slug !== canonicalSlug) {
                await strapi.db.query(uid).update({
                  where: { id: row.id },
                  data: { slug: canonicalSlug },
                });
              }
            }
          }
        }
      } catch (err) {
        console.error(`Failed backfilling slugs for ${uid}:`, err);
      }
    }

    // 3. Hide the slug field from Strapi Admin edit view across all collections
    try {
      for (const uid of SLUG_COLLECTIONS) {
        const storeKey = `plugin_content_manager_configuration_content_types::${uid}`;
        const setting = await strapi.db.query("strapi::core-store").findOne({
          where: { key: storeKey },
        });

        if (setting && setting.value) {
          let parsed: any = null;
          try {
            parsed = typeof setting.value === "string" ? JSON.parse(setting.value) : setting.value;
          } catch (e) {}

          if (parsed) {
            let modified = false;

            if (parsed.metadatas?.slug?.edit) {
              if (parsed.metadatas.slug.edit.visible !== false || parsed.metadatas.slug.edit.editable !== false) {
                parsed.metadatas.slug.edit.visible = false;
                parsed.metadatas.slug.edit.editable = false;
                modified = true;
              }
            }

            if (Array.isArray(parsed.layouts?.edit)) {
              const newLayout = parsed.layouts.edit
                .map((row: any[]) => (Array.isArray(row) ? row.filter((field: any) => field.name !== "slug") : row))
                .filter((row: any[]) => row.length > 0);

              if (JSON.stringify(newLayout) !== JSON.stringify(parsed.layouts.edit)) {
                parsed.layouts.edit = newLayout;
                modified = true;
              }
            }

            if (modified) {
              await strapi.db.query("strapi::core-store").update({
                where: { id: setting.id },
                data: {
                  value: JSON.stringify(parsed),
                },
              });
            }
          }
        }
      }
    } catch (err) {
      console.error("Failed to hide slug from Content Manager layout:", err);
    }
  },
};
