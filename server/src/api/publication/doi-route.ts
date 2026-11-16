import { DoiLookupError, lookupDoi, type DoiMetadata } from './doi-metadata';

const UID = 'api::publication.publication';
const PERSON_UID = 'api::person.person';
const nameKey = (value: string) => value.normalize('NFKC').toLowerCase().replace(/\s+/g, ' ').trim();

export function createDoiLookupHandler(strapi: any, lookup = lookupDoi) {
  return async (ctx: any) => {
    const ability = ctx.state.userAbility;
    if (!ability?.can('plugin::content-manager.explorer.create', UID)
      && !ability?.can('plugin::content-manager.explorer.update', UID)) return ctx.forbidden();
    try {
      const metadata: DoiMetadata = await lookup(ctx.query.doi);
      let people: any[] = [];
      const canReadNames = ['firstName', 'lastName'].every((field) =>
        ability.can('plugin::content-manager.explorer.read', PERSON_UID, field));
      if (metadata.authorCredits.length && canReadNames) {
        const names = metadata.authorCredits.flatMap((author) => [
          { fullName: { $eqi: author.name } },
          ...(author.given && author.family ? [{ firstName: { $eqi: author.given }, lastName: { $eqi: author.family } }] : []),
        ]);
        people = await strapi.db.query(PERSON_UID).findMany({
          where: { type: { $ne: 'external' }, $or: names },
          select: ['id', 'documentId', 'firstName', 'lastName', 'fullName'],
        });
      }
      const authorCredits = metadata.authorCredits.map((author) => {
        const matches = people.filter((person) => nameKey(`${person.firstName} ${person.lastName}`) === nameKey(author.name));
        return { ...author, person: matches.length === 1 ? matches[0] : null };
      });
      ctx.set('Cache-Control', 'no-store');
      ctx.body = { data: { ...metadata, authorCredits } };
    } catch (error) {
      if (error instanceof DoiLookupError) {
        ctx.status = error.status;
        ctx.body = { error: { message: error.message } };
        return;
      }
      throw error;
    }
  };
}

export function registerDoiLookupRoute(strapi: any) {
  strapi.server.routes({
    type: 'admin',
    routes: [{
      method: 'GET', path: '/publication-doi/lookup', handler: createDoiLookupHandler(strapi),
      config: { policies: ['admin::isAuthenticatedAdmin'] },
    }],
  });
}
