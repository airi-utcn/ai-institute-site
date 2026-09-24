'use strict';

module.exports = {
  async up(knex) {
    // Check if the table exists first
    const hasTable = await knex.schema.hasTable('components_about_timeline_items');
    if (!hasTable) return;

    // Fetch all current timeline events
    const rows = await knex('components_about_timeline_items').select('id', 'date');

    for (const row of rows) {
      let newDate = null;

      if (row.date && String(row.date).trim() !== '') {
        const d = String(row.date);
        
        // Map known events safely regardless of language
        if (d.includes('15') && d.includes('2023')) {
          newDate = '2023-01-15';
        } else if (d.includes('10') && d.includes('2023')) {
          newDate = '2023-06-10';
        } else if (d.includes('1') && d.includes('2024') && !d.includes('15')) {
          newDate = '2024-09-01';
        } else if (d.includes('15') && d.includes('2024')) {
          newDate = '2024-10-15';
        } else if (d.includes('20') && d.includes('2025')) {
          newDate = '2025-08-20';
        } else if (d.includes('18') && d.includes('2026')) {
          newDate = '2026-09-18';
        } else {
          // Fallback attempt for standard JS parseable dates (like '2023-01-15')
          const parsed = new Date(d);
          if (!isNaN(parsed)) {
            newDate = parsed.toISOString().split('T')[0];
          } else {
             newDate = null;
          }
        }
      }

      // If the row had an empty string, invalid text, or needs standardizing, update it.
      // (This safely catches row.date === "" since "" !== null)
      if (row.date !== newDate) {
        await knex('components_about_timeline_items')
          .where('id', row.id)
          .update({ date: newDate });
      }
    }
  },

  async down(knex) {
    // No rollback required for data normalization
  }
};
