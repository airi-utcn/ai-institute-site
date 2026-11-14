const PUBLICATION_UID = 'api::publication.publication';
const WRITE_ACTIONS = new Set(['create', 'update', 'publish', 'clone', 'discardDraft']);

const versionKey = (entry: any) =>
  `${entry.locale || 'en'}:${entry.publishedAt ? 'published' : 'draft'}`;

const creditedPeople = (entry: any): Set<number> => new Set(
  (entry.authorCredits || [])
    .map((credit: any) => credit.person?.id)
    .filter((id: unknown) => typeof id === 'number'),
);

/**
 * Credits manage their linked people in Authors. Other, independently selected
 * authors remain untouched. Read persisted components after Strapi has applied
 * component IDs and relation connect/disconnect payloads from the admin panel.
 */
export function registerPublicationAuthorSync(strapi: any) {
  strapi.documents.use(async (ctx: any, next: any) => {
    if (ctx.uid !== PUBLICATION_UID || !WRITE_ACTIONS.has(ctx.action)) return next();

    return strapi.db.transaction(async () => {
      const loadVersions = (documentId: string) => strapi.db.query(PUBLICATION_UID).findMany({
        where: { documentId },
        select: ['id', 'documentId', 'locale', 'publishedAt'],
        populate: {
          authors: { select: ['id'] },
          authorCredits: { populate: { person: { select: ['id'] } } },
        },
      });

      const previous = ctx.params.documentId ? await loadVersions(ctx.params.documentId) : [];
      const previousCredits = new Map<string, Set<number>>(
        previous.map((entry: any) => [versionKey(entry), creditedPeople(entry)]),
      );

      const result = await next();
      if (!result?.documentId) return result;

      const changed = new Set<number>();
      for (const entry of await loadVersions(result.documentId)) {
        const credits = creditedPeople(entry);
        const authors = new Set<number>(entry.authors.map((author: any) => author.id));
        // A clone is a new document: none of the source's credit removals apply.
        const oldCredits = ctx.action === 'clone' ? new Set<number>()
          : previousCredits.get(versionKey(entry)) || new Set<number>();
        const connect = [...credits].filter((id) => !authors.has(id));
        const disconnect = [...oldCredits].filter((id) => !credits.has(id) && authors.has(id));

        if (!connect.length && !disconnect.length) continue;
        await strapi.db.query(PUBLICATION_UID).update({
          where: { id: entry.id },
          data: { authors: { connect, disconnect } },
        });
        changed.add(entry.id);
      }

      // Keep populated mutation responses accurate too, using the same field
      // selection as the caller. Query Engine writes avoid recursive middleware.
      const refresh = async (entry: any) => {
        if (!changed.has(entry.id) || !Object.prototype.hasOwnProperty.call(entry, 'authors')) return entry;
        const selection = strapi.get('query-params').transform(PUBLICATION_UID, {
          fields: ctx.params.fields,
          populate: ctx.params.populate,
        });
        const refreshed = await strapi.db.query(PUBLICATION_UID).findOne({ ...selection, where: { id: entry.id } });
        return { ...entry, authors: refreshed.authors };
      };

      if (Array.isArray(result.entries)) {
        result.entries = await Promise.all(result.entries.map(refresh));
        return result;
      }
      return refresh(result);
    });
  });
}
