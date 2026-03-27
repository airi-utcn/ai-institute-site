import { generateUniqueSlug } from '../../../../utils/slug-generator';

export default {
  async beforeCreate(event) {
    const { data } = event.params;
    
    if (data.fullName) {
      data.slug = await generateUniqueSlug(
        data.fullName,
        'api::person.person'
      );
    }
  },

  async beforeUpdate(event) {
    const { data } = event.params;
    
    if (data.fullName) {
      data.slug = await generateUniqueSlug(
        data.fullName,
        'api::person.person',
        event.params.where.id
      );
    }
  },
};
