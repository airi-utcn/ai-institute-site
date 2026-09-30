export default ({ env }: { env: any }) => ({
  notifyEditorsOfDrafts: {
    task: async ({ strapi }: { strapi: any }) => {
      console.log('Running daily check for all pending drafts and changes...');

      // Read runtime configuration: support comma-separated roles, e.g. "Editor, Super Admin"
      const rawRoles = env('DRAFT_NOTIFICATION_ROLE', 'Editor');
      const targetRoles: string[] = rawRoles
        .split(',')
        .map((r: string) => r.trim())
        .filter(Boolean);

      // Helper function to resolve a clear, human-readable display label for any document
      const resolveDisplayTitle = (draft: any): string => {
        // 1. Try explicit full name / first + last name combinations (e.g. for people)
        if (draft.fullName?.trim()) return draft.fullName.trim();
        const combinedName = [draft.firstName, draft.lastName].filter(Boolean).join(' ').trim();
        if (combinedName) return combinedName;
        if (draft.lastName?.trim()) return draft.lastName.trim();
        if (draft.firstName?.trim()) return draft.firstName.trim();

        // 2. Try common content title/name fields
        const candidateFields = [
          'title',
          'name',
          'label',
          'heading',
          'headline',
          'subject',
          'slug',
        ];

        for (const field of candidateFields) {
          const value = draft[field];
          if (typeof value === 'string' && value.trim()) {
            return value.trim();
          }
        }

        // 3. Fallback to document ID if no recognizable text field is populated
        return `Draft (ID: ${draft.documentId})`;
      };

      // 1. Get all user-defined content types that have Draft & Publish enabled
      const allContentTypes = strapi.contentTypes;
      const contentTypes = Object.keys(allContentTypes).filter((uid) => {
        // Only target user-created APIs, ignore plugins and admin models
        if (!uid.startsWith('api::')) return false;

        // Check if Draft & Publish feature is enabled for this content type
        const typeDef = allContentTypes[uid];
        return typeDef.options && typeDef.options.draftAndPublish === true;
      });

      const allDraftsByContentType: Record<string, any[]> = {};
      let totalDraftsCount = 0;

      for (const contentType of contentTypes) {
        // Query 1: Find completely new drafts (never published)
        const newDrafts = await strapi.documents(contentType).findMany({
          publicationFilter: 'never-published',
        });

        // Query 2: Find documents that are published but have unpublished changes (edited)
        const modifiedDrafts = await strapi.documents(contentType).findMany({
          publicationFilter: 'modified',
        });

        const combinedDrafts = [...(newDrafts || []), ...(modifiedDrafts || [])];

        if (combinedDrafts.length > 0) {
          allDraftsByContentType[contentType] = combinedDrafts;
          totalDraftsCount += combinedDrafts.length;
        }
      }

      if (totalDraftsCount === 0) {
        console.log('No new drafts or changes found for editor notification.');
        return; // Nothing to notify
      }

      // 2. Fetch editor accounts matching configured roles
      let editorEmails: string[] = [];

      // Build OR conditions for each target role
      const adminRoleConditions = targetRoles.map((role) => ({
        roles: {
          name: {
            $containsi: role,
          },
        },
      }));

      try {
        const adminEditors = await strapi.db.query('admin::user').findMany({
          where: {
            isActive: true,
            $or: adminRoleConditions,
          },
          populate: ['roles'],
        });

        if (adminEditors && adminEditors.length > 0) {
          editorEmails = adminEditors.map((e: any) => e.email).filter(Boolean);
        }
      } catch (err) {
        console.warn('Could not query admin::user for editors:', err);
      }

      // Fallback: Check Users & Permissions plugin users if no admin editors were matched
      if (editorEmails.length === 0) {
        const upRoleConditions = targetRoles.map((role) => ({
          role: {
            name: {
              $containsi: role,
            },
          },
        }));

        try {
          const upEditors = await strapi.documents('plugin::users-permissions.user').findMany({
            filters: {
              $or: upRoleConditions,
            },
          });

          if (upEditors && upEditors.length > 0) {
            editorEmails = upEditors.map((e: any) => e.email).filter(Boolean);
          }
        } catch (err) {
          console.warn('Could not query plugin::users-permissions.user for editors:', err);
        }
      }

      // De-duplicate emails
      editorEmails = Array.from(new Set(editorEmails));

      if (editorEmails.length === 0) {
        console.log(`No users found with roles [${targetRoles.join(', ')}] to notify.`);
        return;
      }

      console.log(`Found ${editorEmails.length} recipient(s) to notify: ${editorEmails.join(', ')}`);

      // 3. Format the Email Content
      let emailText = `Hello,\n\nThis is an automated message from the admin interface of airi.utcluj.ro.\nThe following items have pending changes (either new drafts or unreleased modifications) and are waiting for publish review:\n\n`;
      let emailHtml = `<p>Hello,</p><p>The following items have pending changes (either new drafts or unreleased modifications) and are waiting for publish review:</p>`;

      for (const [contentType, drafts] of Object.entries(allDraftsByContentType)) {
        // Beautify the content type name: api::news-article.news-article -> News Article
        const rawName = contentType.split('.')[1] || contentType;
        const typeName = rawName.replace(/-/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());

        emailText += `\n--- ${typeName} ---\n`;
        emailHtml += `<h3>${typeName}</h3><ul>`;

        for (const draft of drafts) {
          const title = resolveDisplayTitle(draft);
          const updateDate = draft.updatedAt ? new Date(draft.updatedAt).toLocaleDateString() : 'Unknown date';

          emailText += `- ${title} (Saved: ${updateDate})\n`;
          emailHtml += `<li><strong>${title}</strong> <em>(Saved: ${updateDate})</em></li>`;
        }
        emailHtml += `</ul>`;
      }

      emailHtml += `<p>Please log in to the Strapi Admin panel to review and publish these changes.</p>`;

      // 4. Send the Email
      try {
        await strapi.plugin('email').service('email').send({
          to: editorEmails,
          subject: `${totalDraftsCount} Pending Changes Ready for Review`,
          text: emailText,
          html: emailHtml,
        });
        console.log(`Successfully sent draft notification email to ${editorEmails.length} recipients.`);
      } catch (error) {
        console.error('Failed to send draft notification email:', error);
      }
    },
    options: {
      // Configurable cron schedule rule (defaults to every day at 17:00 / 5:00 PM)
      rule: env('DRAFT_NOTIFICATION_CRON', '0 17 * * *'),
    },
  },
});
