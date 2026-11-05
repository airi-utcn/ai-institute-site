// Shared partner role constants. Kept in a small, dependency-free module so
// client components can import them without pulling in the Strapi server code.
export const PARTNER_ROLES = ['Strategic', 'Diamond', 'Platinum', 'Gold', 'Partner'];

export const PARTNER_ROLE_ORDER = {
  Strategic: 1,
  Diamond: 2,
  Platinum: 3,
  Gold: 4,
  Partner: 5,
};
