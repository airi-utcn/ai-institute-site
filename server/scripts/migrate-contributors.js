'use strict';

const { createStrapi, compileStrapi } = require('@strapi/strapi');

async function migrateContributors(strapi) {
  console.log('🚀 Starting project contributors migration...');

  // 1. Fetch all project documents across all locales and draft/published statuses
  const projects = await strapi.documents('api::project.project').findMany({
    locale: '*',
    status: 'draft',
    populate: {
      contributors: {
        fields: ['id', 'documentId', 'firstName', 'lastName'],
      },
      individualContributors: {
        populate: {
          person: {
            fields: ['id', 'documentId', 'firstName', 'lastName'],
          },
        },
      },
    },
  });

  console.log(`Found ${projects.length} project documents (drafts) across all locales.`);

  let totalMigrated = 0;
  let totalSkipped = 0;

  for (const project of projects) {
    const rawContributors = project.contributors || [];
    if (!rawContributors.length) {
      console.log(`- Project "${project.title}" (${project.documentId}, ${project.locale}): No contributors to migrate.`);
      continue;
    }

    const existingMembers = project.individualContributors || [];
    const existingPersonDocIds = new Set(
      existingMembers.map((m) => m.person?.documentId || m.person?.id).filter(Boolean)
    );

    // Map existing members preserving their current properties
    const updatedMembers = existingMembers.map((m) => ({
      id: m.id,
      person: m.person?.documentId || m.person?.id,
      role: m.role || '',
    }));

    let addedCount = 0;
    for (const c of rawContributors) {
      const docId = c.documentId;
      const numericId = c.id;
      if ((docId && existingPersonDocIds.has(docId)) || (numericId && existingPersonDocIds.has(numericId))) {
        continue;
      }

      updatedMembers.push({
        person: docId || numericId,
        role: '',
      });

      if (docId) existingPersonDocIds.add(docId);
      if (numericId) existingPersonDocIds.add(numericId);
      addedCount++;
    }

    if (addedCount === 0) {
      console.log(`- Project "${project.title}" (${project.documentId}, ${project.locale}): All ${rawContributors.length} contributor(s) already in individualContributors.`);
      totalSkipped++;
      continue;
    }

    console.log(
      `- Project "${project.title}" (${project.documentId}, ${project.locale}): Adding ${addedCount} contributor(s)...`
    );

    // Update document in draft status
    await strapi.documents('api::project.project').update({
      documentId: project.documentId,
      locale: project.locale,
      data: {
        individualContributors: updatedMembers,
      },
    });

    // If the project was originally published, re-publish it so the published version is also up-to-date
    if (project.publishedAt) {
      try {
        await strapi.documents('api::project.project').publish({
          documentId: project.documentId,
          locale: project.locale,
        });
        console.log(`  ✅ Published updated project "${project.title}"`);
      } catch (err) {
        console.warn(`  ⚠️ Could not re-publish project "${project.title}":`, err.message);
      }
    }

    totalMigrated += addedCount;
  }

  console.log(`\n🎉 Contributors migration complete!`);
  console.log(`   - Contributor relations migrated: ${totalMigrated}`);
  console.log(`   - Projects skipped (already up-to-date or empty): ${totalSkipped}`);
}

async function main() {
  const appContext = await compileStrapi();
  const app = await createStrapi(appContext).load();

  app.log.level = 'error';

  try {
    await migrateContributors(app);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exitCode = 1;
  } finally {
    await app.destroy();
  }
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
