'use strict';

module.exports = {
  async up(knex) {
    const hasTable = await knex.schema.hasTable('components_about_timeline_items');
    if (!hasTable) return;
    
    // Blast the column entirely. 
    // Strapi's schema sync will recreate it instantly on boot with the correct standard 'date' type.
    const hasColumn = await knex.schema.hasColumn('components_about_timeline_items', 'date');
    if (hasColumn) {
      await knex.schema.alterTable('components_about_timeline_items', (table) => {
        table.dropColumn('date');
      });
    }
  },

  async down(knex) {
    // No rollback
  }
};
