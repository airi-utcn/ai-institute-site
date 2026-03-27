import { generateUniqueSlug } from '../../../../utils/slug-generator';

export default {
  async beforeCreate(event) {
    const { data } = event.params;
    
    if (data.title) {
      data.slug = await generateUniqueSlug(
        data.title,
        'api::project.project'
      );
    }
  },

  async beforeUpdate(event) {
    const { data } = event.params;
    
    if (data.title) {
      data.slug = await generateUniqueSlug(
        data.title,
        'api::project.project',
        event.params.where.id
      );
    }
  },
};
