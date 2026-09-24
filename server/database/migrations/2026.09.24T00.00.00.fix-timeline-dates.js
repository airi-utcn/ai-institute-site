'use strict';

module.exports = {
  async up(knex) {
    // Check if the table exists first (so this doesn't break fresh installs)
    const hasTable = await knex.schema.hasTable('components_about_timeline_items');
    if (!hasTable) return;

    // Fetch all current timeline events
    const rows = await knex('components_about_timeline_items').select('id', 'date');

    for (const row of rows) {
      if (!row.date) continue;

      const d = String(row.date);
      let newDate = null;

      // Map known events safely regardless of language (e.g. matching "15 Яну 2023" vs "Jan 15, 2023")
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
        // Fallback attempt for standard JS date parsing
        const parsed = new Date(d);
        if (!isNaN(parsed) && d.trim() !== '') {
          newDate = parsed.toISOString().split('T')[0];
        } else {
          // If strictly unparseable, set to null to avoid breaking Postgres schema alteration
          newDate = null;
        }
      }

      // Update row to standard YYYY-MM-DD
      await knex('components_about_timeline_items')
        .where('id', row.id)
        .update({ date: newDate });
    }
  },

  async down(knex) {
    // Optional rollback logic, not strictly required since it is a minor data normalization
  }
};
