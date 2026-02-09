// import type { Core } from '@strapi/strapi';

export default {
  /**
   * An asynchronous register function that runs before
   * your application is initialized.
   *
   * This gives you an opportunity to extend code.
   */
  register(/* { strapi }: { strapi: Core.Strapi } */) {},

  /**
   * An asynchronous bootstrap function that runs before
   * your application gets started.
   *
   * This gives you an opportunity to set up your data model,
   * run jobs, or perform some special logic.
   */
  async bootstrap({ strapi }) {
    // Set public permissions for read-only access to all content types
    const publicRole = await strapi
      .query('plugin::users-permissions.role')
      .findOne({ where: { type: 'public' } });

    if (!publicRole) {
      console.warn('⚠️  Public role not found - skipping permissions setup');
      return;
    }

    // Content types to make publicly readable
    const contentTypes = [
      'api::person.person',
      'api::department.department',
      'api::project.project',
      'api::publication.publication',
      'api::paper.paper',
      'api::dataset.dataset',
      'api::research-theme.research-theme',
      'api::partner.partner',
      'api::support-unit.support-unit',
      'api::news-article.news-article',
      'api::resource.resource',
    ];

    let addedCount = 0;

    for (const uid of contentTypes) {
      const actions = ['find', 'findOne'];
      
      for (const action of actions) {
        // Check if permission already exists
        const existing = await strapi
          .query('plugin::users-permissions.permission')
          .findOne({
            where: {
              action: `${uid}.${action}`,
            },
            populate: ['role'],
          });

        if (!existing || !existing.role || existing.role.id !== publicRole.id) {
          // Create the permission
          const permission = await strapi
            .query('plugin::users-permissions.permission')
            .create({
              data: {
                action: `${uid}.${action}`,
                enabled: true,
              },
            });

          // Link it to the public role using the link table
          await strapi.db.connection.raw(
            'INSERT INTO up_permissions_role_lnk (permission_id, role_id) VALUES (?, ?) ON CONFLICT DO NOTHING',
            [permission.id, publicRole.id]
          );

          addedCount++;
        }
      }
    }

    if (addedCount > 0) {
      console.log(`✅ Added ${addedCount} public permissions`);
    } else {
      console.log('ℹ️  Public permissions already configured');
    }
  },
};
