import { generateUniqueSlug } from '../../../../utils/slug-generator';

export default {
  async beforeCreate(event) {
    const { data } = event.params;
    
    // Always generate slug from name on create
    if (data.name) {
      data.slug = await generateUniqueSlug(
        data.name,
        'api::department.department'
      );
    }
  },

  async beforeUpdate(event) {
    const { data } = event.params;
    
    // Regenerate slug if name changed
    if (data.name) {
      data.slug = await generateUniqueSlug(
        data.name,
        'api::department.department',
        event.params.where.id
      );
    }
  },
};
