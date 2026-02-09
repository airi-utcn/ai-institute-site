'use strict';

// Script to publish all draft documents
async function publishAll() {
  const strapi = await require('@strapi/strapi').createStrapi().load();

  const contentTypes = [
    'api::department.department',
    'api::person.person',
    'api::publication.publication',
    'api::project.project',
    'api::dataset.dataset',
  ];

  for (const uid of contentTypes) {
    console.log(`\nPublishing all ${uid} documents...`);
    try {
      const drafts = await strapi.db.query(uid).findMany({
        where: { publishedAt: null },
      });

      console.log(`Found ${drafts.length} draft documents`);

      for (const draft of drafts) {
        try {
          await strapi.documents(uid).publish({ documentId: draft.documentId });
          console.log(`  ✅ Published: ${draft.documentId}`);
        } catch (error) {
          console.error(`  ❌ Failed to publish ${draft.documentId}:`, error.message);
        }
      }
    } catch (error) {
      console.error(`Error processing ${uid}:`, error.message);
    }
  }

  console.log('\n🎉 Publishing complete!');
  await strapi.destroy();
  process.exit(0);
}

publishAll().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
