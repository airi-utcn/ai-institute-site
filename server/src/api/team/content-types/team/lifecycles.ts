import { generateUniqueSlug } from '../../../../utils/slug-generator';

export default {
  async beforeCreate(event) {
    const { data } = event.params;
    
    if (data.name) {
      data.slug = await generateUniqueSlug(
        data.name,
        'api::team.team'
      );
    }
  },

  async beforeUpdate(event) {
    const { data } = event.params;
    
    if (data.name) {
      data.slug = await generateUniqueSlug(
        data.name,
        'api::team.team',
        event.params.where.id
      );
    }
  },
};
