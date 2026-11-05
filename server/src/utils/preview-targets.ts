/**
 * Declarative map from every Strapi content type to the frontend page that
 * previews it.
 *
 * Keep this in sync with the route allowlist in web/src/lib/preview.js.
 * server/tests/preview-targets.test.mjs fails when a content type is missing
 * from this map or when a generated target is not allowed by the frontend.
 */

export type PreviewHandlerParams = {
  documentId?: string;
  locale?: string;
  status?: string;
  [key: string]: unknown;
};

type StaticPreviewTarget = {
  type: 'static';
  path: string;
};

type DocumentPreviewTarget = {
  type: 'document';
  basePath: string;
  fields?: string[];
  populate?: Record<string, unknown>;
  buildPath?: (document: any) => string | null;
};

export type PreviewTarget = StaticPreviewTarget | DocumentPreviewTarget;

const slugify = (value: unknown): string =>
  String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');

const encodeSlug = (slug: unknown): string =>
  encodeURIComponent(String(slug || '').trim());

const staticTarget = (path: string): StaticPreviewTarget => ({
  type: 'static',
  path,
});

const documentTarget = (
  basePath: string,
  options: Omit<DocumentPreviewTarget, 'type' | 'basePath'> = {},
): DocumentPreviewTarget => ({
  type: 'document',
  basePath,
  ...options,
});

export const previewTargets: Record<string, PreviewTarget> = {
  // ---------------------------------------------------------------------------
  // Single types: one fixed page each.
  // ---------------------------------------------------------------------------
  'api::about-page.about-page': staticTarget('/about'),
  'api::awards-page.awards-page': staticTarget('/news&events/awards'),
  'api::careers-page.careers-page': staticTarget('/news&events/careers'),
  'api::contact-page.contact-page': staticTarget('/contact'),
  'api::departments-page.departments-page': staticTarget('/research/departments'),
  'api::engagement-page.engagement-page': staticTarget('/engagement'),
  'api::events-page.events-page': staticTarget('/news&events/events'),
  'api::global.global': staticTarget('/'),
  'api::home-page.home-page': staticTarget('/'),
  'api::laboratories-page.laboratories-page': staticTarget('/research/laboratories'),
  'api::media-page.media-page': staticTarget('/media'),
  'api::news-page.news-page': staticTarget('/news&events/news'),
  'api::open-calls-page.open-calls-page': staticTarget('/news&events/open-project-calls'),
  'api::people-page.people-page': staticTarget('/people'),
  'api::projects-page.projects-page': staticTarget('/research/projects'),
  // research-page feeds both publications and themes; publications is the
  // primary listing.
  'api::research-page.research-page': staticTarget('/research/publications'),
  'api::resources-page.resources-page': staticTarget('/resources'),
  'api::search-page.search-page': staticTarget('/search'),
  'api::seminars-page.seminars-page': staticTarget('/news&events/seminars'),
  'api::timeline-page.timeline-page': staticTarget('/timeline'),

  // ---------------------------------------------------------------------------
  // Collection types with a detail page.
  // ---------------------------------------------------------------------------
  'api::person.person': documentTarget('/people'),
  'api::project.project': documentTarget('/research/projects'),
  'api::department.department': documentTarget('/research/departments'),
  'api::event.event': documentTarget('/news&events/events'),
  'api::laboratory.laboratory': documentTarget('/research/laboratories'),
  'api::partner.partner': documentTarget('/engagement/partners'),
  'api::result.result': documentTarget('/research/results'),
  'api::graph-macro.graph-macro': documentTarget('/research/paper-graph'),

  'api::news-article.news-article': documentTarget('/news&events/news', {
    fields: ['slug', 'category'],
    buildPath: (document) => {
      if (!document?.slug) return null;
      const basePath =
        document.category === 'award' ? '/news&events/awards' : '/news&events/news';
      return `${basePath}/${encodeSlug(document.slug)}`;
    },
  }),

  'api::publication.publication': documentTarget('/research/publications', {
    fields: ['slug', 'title', 'year'],
    buildPath: (document) => {
      const slug =
        slugify(document?.slug) ||
        slugify(
          document?.year
            ? `${document?.title || ''} ${document.year}`
            : document?.title,
        );
      return slug ? `/research/publications/${encodeURIComponent(slug)}` : null;
    },
  }),

  'api::graph-meso.graph-meso': documentTarget('/research/paper-graph', {
    fields: ['slug'],
    populate: { macro: { fields: ['slug'] } },
    buildPath: (document) => {
      const macroSlug = document?.macro?.slug;
      if (!macroSlug || !document?.slug) return '/research/paper-graph';
      return `/research/paper-graph/${encodeSlug(macroSlug)}/${encodeSlug(document.slug)}`;
    },
  }),

  // ---------------------------------------------------------------------------
  // Collection types without a detail page: preview the relevant listing.
  // ---------------------------------------------------------------------------
  'api::team.team': documentTarget('/people', {
    fields: ['category'],
    buildPath: (document) =>
      document?.category === 'leadership' ? '/about/leadership' : '/people',
  }),
  'api::seminar.seminar': staticTarget('/news&events/seminars'),
  'api::resource.resource': staticTarget('/resources'),
  'api::research-theme.research-theme': staticTarget('/research/themes'),
  'api::graph-link.graph-link': staticTarget('/research/paper-graph'),
  // Reservations are workflow data with no public content page; equipment is
  // the closest public entry point.
  'api::reservation.reservation': staticTarget('/equipment'),
};

export const PREVIEW_EXCLUDED_CONTENT_TYPES = new Set<string>([]);

const localeCandidates = (locale?: string): Array<string | undefined> => {
  const candidates = [locale, locale === 'en' ? undefined : 'en', undefined];
  return candidates.filter(
    (value, index) => candidates.indexOf(value) === index,
  );
};

const statusCandidates = (status?: string): Array<string | undefined> => {
  const preferred = status || 'draft';
  const candidates = [
    preferred,
    preferred === 'published' ? 'draft' : 'published',
    undefined,
  ];
  return candidates.filter(
    (value, index) => candidates.indexOf(value) === index,
  );
};

const findDocument = async (
  strapi: any,
  uid: string,
  params: PreviewHandlerParams,
  target: DocumentPreviewTarget,
): Promise<any | null> => {
  const fields = target.fields;
  const populate = target.populate;

  for (const locale of localeCandidates(params.locale)) {
    for (const status of statusCandidates(params.status)) {
      const query: Record<string, unknown> = { fields, populate };
      if (params.documentId) query.documentId = params.documentId;
      if (locale) query.locale = locale;
      if (status) query.status = status;

      try {
        const documents = strapi.documents(uid);
        const document = params.documentId
          ? await documents.findOne(query)
          : await documents.findFirst(query);
        if (document) return document;
      } catch {
        // Try the next locale/status fallback.
      }
    }
  }

  return null;
};

const resolveDocumentPath = async (
  strapi: any,
  uid: string,
  params: PreviewHandlerParams,
  target: DocumentPreviewTarget,
): Promise<string | null> => {
  const document = await findDocument(strapi, uid, params, target);
  if (!document) return null;

  if (target.buildPath) {
    return target.buildPath(document);
  }

  if (!document.slug) return null;
  return `${target.basePath}/${encodeSlug(document.slug)}`;
};

/**
 * Resolve the frontend path that should be previewed for a content type, or
 * null when the type is not configured.
 */
export const resolvePreviewPath = async (
  uid: string,
  params: PreviewHandlerParams,
  strapiInstance: any = (global as any).strapi,
): Promise<string | null> => {
  const target = previewTargets[uid];
  if (!target) return null;

  if (target.type === 'static') return target.path;
  if (!strapiInstance) return null;

  return resolveDocumentPath(strapiInstance, uid, params, target);
};
