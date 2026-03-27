import { generateUniqueSlug } from '../../../../utils/slug-generator';

export default {
  async beforeCreate(event) {
    const { data } = event.params;
    
    // Always generate slug from title on create
    if (data.title) {
      data.slug = await generateUniqueSlug(
        data.title,
        'api::publication.publication'
      );
    }
  },

  async beforeUpdate(event) {
    const { data } = event.params;
    
    // Regenerate slug if title changed
    if (data.title) {
      data.slug = await generateUniqueSlug(
        data.title,
        'api::publication.publication',
        event.params.where.id
      );
    }
  },
};
