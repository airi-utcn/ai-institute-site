// import type { Core } from "@strapi/strapi";
import { registerReservationWorkflow } from "./api/reservation/document-middleware";
import { registerPublicationAuthorSync } from "./api/publication/document-middleware";
import { registerDoiLookupRoute } from "./api/publication/doi-route";
import { registerDraftAccessGuard } from "./utils/draft-access";
import { generateSlug, registerSlugMiddleware } from "./utils/slug";

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
  "api::laboratory.laboratory",
];

export default {
  /**
   * An asynchronous register function that runs before
   * your application is initialized.
   */
  register({ strapi }: any) {
    if (!strapi.documents) return;

    registerDraftAccessGuard(strapi);
    registerReservationWorkflow(strapi);
    registerPublicationAuthorSync(strapi);

    // Document Service middleware: Auto-generate fullName for Person
    strapi.documents.use(async (ctx: any, next: any) => {
      if (ctx.uid === "api::person.person" && (ctx.action === "create" || ctx.action === "update")) {
        if (ctx.params && ctx.params.data) {
          const { firstName, lastName } = ctx.params.data;
          
          let fName = firstName;
          let lName = lastName;

          // If it's an update and we might be missing fields in partial payload
          if (ctx.action === "update" && (fName === undefined || lName === undefined)) {
            try {
              const existingDoc = await strapi.db.query("api::person.person").findOne({
                where: { documentId: ctx.params.documentId },
                select: ["firstName", "lastName"]
              });
              if (existingDoc) {
                if (fName === undefined) fName = existingDoc.firstName;
                if (lName === undefined) lName = existingDoc.lastName;
              }
            } catch (e) {
              console.error("Failed to fetch existing person during update", e);
            }
          }

          if (fName !== undefined || lName !== undefined) {
             ctx.params.data.fullName = `${fName || ""} ${lName || ""}`.trim();
          }
        }
      }
      return next();
    });

    // Document Service middleware: Validate Event Dates
    strapi.documents.use(async (ctx: any, next: any) => {
      if (ctx.uid === "api::event.event" && (ctx.action === "create" || ctx.action === "update")) {
        const { startDate, endDate } = ctx.params.data || {};
        
        // Ensure endDate is after startDate
        if (startDate && endDate) {
          if (new Date(endDate) <= new Date(startDate)) {
            const { ValidationError } = require("@strapi/utils").errors;
            throw new ValidationError("End Date must be after Start Date.");
          }
        }
      }
      return next();
    });


    // Document Service middleware: Generate collision-free slugs and keep them
    // in sync with the target field and across localizations.
    registerSlugMiddleware(strapi);
  },

  /**
   * An asynchronous bootstrap function that runs before
   * your application gets started.
   */
  async bootstrap({ strapi }: any) {
    registerDoiLookupRoute(strapi);
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
        "api::equipment-page.equipment-page",
        "api::media-page.media-page",
        "api::search-page.search-page",
        "api::timeline-page.timeline-page",
        "api::events-page.events-page",
        "api::laboratory.laboratory",
        "api::laboratories-page.laboratories-page",
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

    // 4. Backfill fullName for People
    try {
      const people: any[] = await strapi.db.query("api::person.person").findMany({
        select: ["id", "firstName", "lastName", "fullName"],
      });
      
      let updatedPeopleCount = 0;
      for (const person of people) {
        const expectedFullName = `${person.firstName || ""} ${person.lastName || ""}`.trim();
        if (person.fullName !== expectedFullName) {
          await strapi.db.query("api::person.person").update({
            where: { id: person.id },
            data: { fullName: expectedFullName },
          });
          updatedPeopleCount++;
        }
      }
      if (updatedPeopleCount > 0) {
         console.log(`✅ Backfilled fullName for ${updatedPeopleCount} people`);
      }
    } catch (err) {
      console.error("Failed backfilling fullName for people:", err);
    }

    // 5. Hide fullName from Strapi Admin edit view for Person
    try {
      const storeKey = "plugin_content_manager_configuration_content_types::api::person.person";
      const setting = await strapi.db.query("strapi::core-store").findOne({ where: { key: storeKey } });
      if (setting && setting.value) {
        let parsed = typeof setting.value === "string" ? JSON.parse(setting.value) : setting.value;
        if (parsed) {
          let modified = false;
          // Hide from layout
          if (parsed.metadatas?.fullName?.edit) {
            if (parsed.metadatas.fullName.edit.visible !== false || parsed.metadatas.fullName.edit.editable !== false) {
              parsed.metadatas.fullName.edit.visible = false;
              parsed.metadatas.fullName.edit.editable = false;
              modified = true;
            }
          }
          if (Array.isArray(parsed.layouts?.edit)) {
            const newLayout = parsed.layouts.edit
              .map((row) => (Array.isArray(row) ? row.filter((field) => field.name !== "fullName") : row))
              .filter((row) => row.length > 0);
            if (JSON.stringify(newLayout) !== JSON.stringify(parsed.layouts.edit)) {
              parsed.layouts.edit = newLayout;
              modified = true;
            }
          }
          if (modified) {
            await strapi.db.query("strapi::core-store").update({
              where: { id: setting.id },
              data: { value: JSON.stringify(parsed) }
            });
            console.log("✅ Configured layout to hide fullName on person model");
          }
        }
      }
    } catch (err) {
      console.error("Failed to hide fullName from Content Manager layout:", err);
    }
  },
};
