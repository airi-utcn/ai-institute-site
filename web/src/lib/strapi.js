import { getEnv, normalizeBaseUrl, requireEnv } from './env';
import { toPublicationSlug } from './slug';

const isServer = typeof window === 'undefined';

const getStrapiPublicUrl = () => {
  const raw = requireEnv(['NEXT_PUBLIC_STRAPI_URL', 'PUBLIC_STRAPI_URL'], {
    where: 'Strapi public base URL (used for media URLs returned to the browser)',
  });
  return normalizeBaseUrl(raw);
};

const getStrapiInternalUrl = () => {
  const raw = getEnv('STRAPI_INTERNAL_URL', 'STRAPI_URL');
  return raw ? normalizeBaseUrl(raw) : '';
};

const getStrapiApiBaseUrl = () => {
  if (!isServer) return getStrapiPublicUrl();

  const internal = getStrapiInternalUrl();
  if (internal) return internal;

  // Fall back to the public URL on the server only if an internal URL isn't provided.
  // In Docker, this usually means you should set STRAPI_INTERNAL_URL=http://strapi:1337.
  return getStrapiPublicUrl();
};

const DEFAULT_REVALIDATE_SECONDS = 60; // 1 minute

// Buckets used by UI tabs; keep normalized values to avoid client-side filtering.
export const PERSON_TYPE_FILTERS = {
  staff: ['staff', 'personal'],
  researchers: ['researcher', 'research'],
  visiting: ['visiting', 'visitor', 'visiting_researcher', 'visiting researcher', 'external', 'collaborator'],
  alumni: ['alumni', 'alumnus'], 
};

const toArray = (value) => (Array.isArray(value) ? value : value ? [value] : []);

const stripHtml = (value) =>
  typeof value === 'string'
    ? value
        .replace(/<[^>]*>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
    : '';

const resolveMediaUrl = (media) => {
  if (!media) return '';

  if (typeof media === 'string') {
    const rawUrl = media.trim();
    if (!rawUrl) return '';
    if (/^https?:\/\//i.test(rawUrl)) return rawUrl;
    const baseUrl = getStrapiPublicUrl();
    return `${baseUrl}${rawUrl.startsWith('/') ? rawUrl : `/${rawUrl}`}`;
  }

  const data = Array.isArray(media?.data) ? media.data[0] : media?.data ?? media;
  if (!data) return '';

  const url = data?.attributes?.url || data?.url;
  if (!url || typeof url !== 'string') return '';

  if (/^https?:\/\//i.test(url)) return url;
  const baseUrl = getStrapiPublicUrl();
  return `${baseUrl}${url.startsWith('/') ? url : `/${url}`}`;
};

const setPopulate = (params, baseKey, config = {}) => {
  const fields = Array.isArray(config.fields) ? config.fields : [];

  const nestedPopulate = config.populate && typeof config.populate === 'object' ? config.populate : {};
  const fragments = config.on && typeof config.on === 'object' ? config.on : {};
  const hasNestedPopulate = Object.keys(nestedPopulate).length > 0 || Object.keys(fragments).length > 0;

  // Strapi v5: when a populate entry has sub-keys (fields/populate), it must be treated as an object.
  // Only leaf populate keys should get a value.
  const isNestedPopulateKey = baseKey.includes('[populate][');
  const isLeafPopulate = !fields.length && !hasNestedPopulate;

  if (isLeafPopulate) {
    // Nested populate leaf expects '*' or an object.
    params.set(baseKey, isNestedPopulateKey ? '*' : 'true');
  } else {
    // Ensure we don't leave an incompatible scalar value around.
    params.delete(baseKey);
  }

  fields
    .filter(Boolean)
    .forEach((field) => {
      // Strapi v5 expects repeated `...[fields]=fieldName` entries for populated relations.
      // (The indexed `...[fields][0]=...` format is not consistently honored for nested populates.)
      params.append(`${baseKey}[fields]`, field);
    });

  Object.entries(nestedPopulate).forEach(([relation, relationConfig]) => {
    setPopulate(params, `${baseKey}[populate][${relation}]`, relationConfig || {});
  });

  Object.entries(fragments).forEach(([componentUid, fragmentConfig]) => {
    setPopulate(params, `${baseKey}[on][${componentUid}]`, fragmentConfig || {});
  });
};

const appendFields = (params, fields = []) => {
  fields.filter(Boolean).forEach((field, idx) => params.append(`fields[${idx}]`, field));
};

const appendSort = (params, sort) => {
  if (!sort) return;
  if (Array.isArray(sort)) {
    sort.filter(Boolean).forEach((rule) => params.append('sort', rule));
  } else {
    params.set('sort', sort);
  }
};

const appendPagination = (params, pagination = {}) => {
  const { page, pageSize } = pagination;
  if (typeof page === 'number') params.set('pagination[page]', page.toString());
  if (typeof pageSize === 'number') params.set('pagination[pageSize]', pageSize.toString());
};

const appendFilters = (params, value, prefix = 'filters') => {
  if (!value || typeof value !== 'object') return;
  Object.entries(value).forEach(([key, val]) => {
    if (val === undefined || val === null || val === '') return;
    const nextPrefix = `${prefix}[${key}]`;
    if (Array.isArray(val)) {
      val.forEach((entry) => {
        if (entry !== undefined && entry !== null && entry !== '') {
          params.append(nextPrefix, entry);
        }
      });
      return;
    }

    if (typeof val === 'object') {
      appendFilters(params, val, nextPrefix);
      return;
    }

    params.append(nextPrefix, val);
  });
};

const createParams = ({ fields = [], populate = {}, filters = null, sort = null, pagination = null, publicationState = null }) => {
  const params = new URLSearchParams();
  appendFields(params, fields);
  appendSort(params, sort);
  appendPagination(params, pagination || {});
  if (publicationState) params.set('publicationState', publicationState);
  if (filters) appendFilters(params, filters);
  Object.entries(populate || {}).forEach(([relation, relationConfig]) => {
    setPopulate(params, `populate[${relation}]`, relationConfig || {});
  });
  return params;
};

const PERSON_FIELDS = ['fullName', 'slug', 'title', 'email', 'phone', 'type'];

const PERSON_FLAT_POPULATE = {
  fields: PERSON_FIELDS,
};

const PERSON_WITH_IMAGE_POPULATE = {
  fields: PERSON_FIELDS,
  populate: {
    portrait: {
      fields: ['url', 'formats', 'alternativeText'],
    },
  },
};

const DEPARTMENT_POPULATE = {
  fields: ['name', 'slug', 'summary', 'description'],
};



const PROJECT_POPULATE = {
  fields: ['title', 'slug', 'abstract', 'region', 'phase', 'docUrl', 'officialUrl', 'featured', 'isIndustryEngagement'],
  populate: {
    heroImage: {
      fields: ['url', 'formats', 'alternativeText'],
    },
    domains: DEPARTMENT_POPULATE,
    themes: {
      fields: ['name', 'slug'],
    },
    partners: {
      fields: ['name', 'slug'],
      populate: {
        logo: {
          fields: ['url', 'formats', 'alternativeText'],
        },
      },
    },
  },
};

// Map raw type/status values to human-friendly buckets used by the UI tabs
const STAFF_TYPE_LABELS = {
  staff: 'Staff',
  personal: 'Staff', // legacy name
  researcher: 'Researchers',
  research: 'Researchers',
  alumni: 'Alumni',
  alumnus: 'Alumni',
  visiting: 'Visiting Researchers',
  visitor: 'Visiting Researchers',
  'visiting researcher': 'Visiting Researchers',
  external: 'External',
  collaborator: 'External',
};

const normalizeStaffType = (value) => {
  const raw = value ?? '';
  const stringValue = typeof raw === 'string' ? raw.trim() : String(raw || '').trim();
  const key = stringValue.toLowerCase();
  return {
    key,
    label: STAFF_TYPE_LABELS[key] || '',
  };
};

const normalizeDepartmentType = (value) => {
  const raw = value ?? '';
  const key = raw.toString().trim().toLowerCase();
  const map = {
    research: 'research',
    'research department': 'research',
    'research departments': 'research',
    academic: 'academic',
    'academic department': 'academic',
    support: 'support',
    'support department': 'support',
    'support departments': 'support',
  };
  return map[key] || 'research';
};

/**
 * Helper function to make API calls to Strapi
 * @param {string} endpoint - The API endpoint (without /api prefix)
 * @param {object} options - Additional fetch options
 * @returns {Promise} - Parsed JSON response
 */
export async function fetchAPI(endpoint, options = {}) {
  const baseUrl = getStrapiApiBaseUrl();
  const url = `${baseUrl}/api${endpoint}`;

  // Server-only token. Do NOT use NEXT_PUBLIC_ prefix for this value.
  const token = process.env.STRAPI_API_TOKEN || null;

  const {
    method = 'GET',
    body,
    headers: customHeaders = {},
    cache = 'force-cache',
    revalidate,
    next,
    ...rest
  } = options;

  const headers = {
    'Content-Type': 'application/json',
    ...customHeaders,
  };

  // Only attach the token on the server to avoid exposing it to client bundles
  if (token && isServer) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const shouldUseNext = cache !== 'no-store';
  const fetchInit = {
    method,
    headers,
    cache,
    ...rest,
  };

  if (body) {
    fetchInit.body = typeof body === 'string' ? body : JSON.stringify(body);
  }

  if (shouldUseNext) {
    fetchInit.next = next || { revalidate: typeof revalidate === 'number' ? revalidate : DEFAULT_REVALIDATE_SECONDS };
  }

  try {
    const response = await fetch(url, fetchInit);

    if (!response.ok) {
      // try to capture response body for better diagnostics
      let bodyText = '';
      try { bodyText = await response.text(); } catch (e) { /* ignore */ }
      throw new Error(`Strapi API call failed: ${response.status} ${response.statusText} - ${url} - ${bodyText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Strapi API Error:', {
      message: error.message,
      url,
      tokenAttached: !!(token && isServer),
      stack: error.stack,
    });

    // Return empty data structure instead of throwing to prevent crashes
    return { data: [], meta: {} };
  }
}

async function fetchAllEntries(endpoint, baseOptions = {}, pageSize = 100) {
  const results = [];
  let page = 1;
  let pageCount = 1;

  while (page <= pageCount) {
    const params = createParams({
      ...baseOptions,
      pagination: { page, pageSize },
    });

    const data = await fetchAPI(`${endpoint}?${params.toString()}`);
    if (Array.isArray(data?.data)) results.push(...data.data);

    const metaPageCount = data?.meta?.pagination?.pageCount;
    pageCount = typeof metaPageCount === 'number' ? metaPageCount : pageCount;
    page += 1;
  }

  return results;
}

/**
 * Get all staff members from Strapi (handles pagination automatically)
 * @returns {Promise<Array>} Array of staff members
 */
export async function getStaff(options = {}) {
  try {
    const {
      types,
      departmentSlug,
      includeBio = true,
      page,
      pageSize = 100,
    } = options;

    const filters = {};
    if (Array.isArray(types) && types.length) {
      filters.type = { $in: types };
    }
    if (departmentSlug) {
      filters.department = { slug: { $eq: departmentSlug } };
    }

    const fields = includeBio ? [...PERSON_FIELDS, 'bio'] : PERSON_FIELDS;

    const baseOptions = {
      fields,
      sort: 'fullName:asc',
      filters: Object.keys(filters).length ? filters : null,
      populate: {
        department: DEPARTMENT_POPULATE,
        portrait: {
          fields: ['url', 'formats', 'alternativeText'],
        },
      },
    };

    if (page) {
      const params = createParams({ ...baseOptions, pagination: { page, pageSize } });
      const data = await fetchAPI(`/people?${params.toString()}`);
      return data.data || [];
    }

    return await fetchAllEntries('/people', baseOptions, pageSize);
  } catch (error) {
    console.error('Failed to fetch staff:', error);
    return [];
  }
}

/**
 * Get a single staff member by slug
 * @param {string} slug - The staff member's slug
 * @returns {Promise<Object|null>} Staff member object or null
 */
export async function getStaffMember(slug) {
  try {
    if (!slug) return null;
    const params = createParams({
      filters: { slug: { $eq: slug } },
      populate: {
        department: DEPARTMENT_POPULATE,
        portrait: { fields: ['url', 'formats', 'alternativeText'] },
        socialLinks: {
          fields: ['label', 'url', 'icon'],
        },
        publications: { fields: ['title', 'slug', 'year'] },
      },
    });

    const data = await fetchAPI(`/people?${params.toString()}`);
    return data.data?.[0] || null;
  } catch (error) {
    console.error('Failed to fetch staff member:', error);
    return null;
  }
}

/**
 * Get all teams a person is a member of, identified by their slug.
 * Filters server-side on the members[].person.slug component relation.
 * @param {string} slug - The person's slug
 * @returns {Promise<Array>} Array of team entries
 */
export async function getPersonTeams(slug) {
  try {
    if (!slug) return [];
    const params = createParams({
      publicationState: 'preview',
      filters: { members: { person: { slug: { $eq: slug } } } },
      populate: {
        department: DEPARTMENT_POPULATE,
        members: {
          populate: { person: PERSON_FLAT_POPULATE },
        },
        projects: { fields: ['title', 'slug', 'abstract', 'phase'] },
      },
    });
    const data = await fetchAPI(`/teams?${params.toString()}`);
    return data.data || [];
  } catch (error) {
    console.error('Failed to fetch person teams:', error);
    return [];
  }
}

/**
 * Get all teams belonging to a department
 * @param {string} departmentSlug - The department's slug
 * @returns {Promise<Array>} Array of team entries
 */
export async function getDepartmentTeams(departmentSlug) {
  try {
    if (!departmentSlug) return [];
    const params = createParams({
      publicationState: 'preview',
      filters: { department: { slug: { $eq: departmentSlug } } },
      sort: 'name:asc',
      populate: {
        members: {
          populate: { person: PERSON_FLAT_POPULATE },
        },
        projects: { fields: ['title', 'slug', 'abstract', 'phase'] },
      },
    });
    const data = await fetchAPI(`/teams?${params.toString()}`);
    return data.data || [];
  } catch (error) {
    console.error('Failed to fetch department teams:', error);
    return [];
  }
}

/**
 * Get all projects from Strapi
 * @returns {Promise<Array>} Array of projects
 */
export async function getProjects(options = {}) {
  try {
    const { domainSlug, themeSlug, featured, publicationState = 'preview' } = options;

    const filters = {};
    if (domainSlug) filters.domains = { slug: { $eq: domainSlug } };
    if (themeSlug) filters.themes = { slug: { $eq: themeSlug } };
    if (featured !== undefined) filters.featured = { $eq: featured };

    const params = createParams({
      sort: 'title:asc',
      publicationState,
      filters: Object.keys(filters).length ? filters : null,
      fields: PROJECT_POPULATE.fields,
      populate: {
        ...PROJECT_POPULATE.populate,
        teams: { fields: ['name', 'slug'] },
      },
    });

    const data = await fetchAPI(`/projects?${params.toString()}`);
    return data.data || [];
  } catch (error) {
    console.error('Failed to fetch projects:', error);
    return [];
  }
}

/**
 * Get a single project by slug
 * @param {string} slug - The project's slug
 * @returns {Promise<Object|null>} Project object or null
 */
export async function getProjectBySlug(slug) {
  try {
    if (!slug) return null;

    // Split into two parallel requests so neither URL becomes excessively long.
    // 1. Core project data (no publications nested populate).
    const projectParams = createParams({
      filters: { slug: { $eq: slug } },
      publicationState: 'preview',
      fields: PROJECT_POPULATE.fields,
      populate: {
        ...PROJECT_POPULATE.populate,
        heroImage: { fields: ['url', 'formats', 'alternativeText'] },
        body: {
          on: {
            'shared.rich-text': { fields: ['body'] },
            'shared.section': {
              fields: ['heading', 'subheading', 'body'],
              populate: { media: { fields: ['url', 'alternativeText', 'caption', 'width', 'height'] } },
            },
            'shared.media': {
              populate: { file: { fields: ['url', 'alternativeText', 'caption', 'width', 'height'] } },
            },
            'shared.slider': {
              populate: { files: { fields: ['url', 'alternativeText', 'caption', 'width', 'height'] } },
            },
          },
        },
        teams: {
          populate: {
            members: { populate: { person: PERSON_WITH_IMAGE_POPULATE } },
            department: DEPARTMENT_POPULATE,
          },
        },
        timeline: {},
        resources: { fields: ['title', 'slug', 'url', 'icon', 'category'] },
      },
    });

    // 2. Publications for this project — fetched from the publications endpoint to keep URLs short.
    const pubParams = createParams({
      filters: { projects: { slug: { $eq: slug } } },
      sort: 'year:desc',
      fields: ['title', 'slug', 'year', 'kind', 'description'],
      populate: {
        authors: PERSON_FLAT_POPULATE,
        pdfFile: { fields: ['name', 'url', 'mime', 'ext', 'size'] },
        domain: DEPARTMENT_POPULATE,
      },
    });

    const [projectData, pubData] = await Promise.all([
      fetchAPI(`/projects?${projectParams.toString()}`),
      fetchAPI(`/publications?${pubParams.toString()}`),
    ]);

    const project = projectData.data?.[0];
    if (!project) return null;

    // Inject publications into the project so transformProjectData can pick them up.
    // Works for both Strapi v4 (attributes wrapper) and v5 (flat object).
    const attrs = project?.attributes ?? project;
    attrs.publications = pubData.data ?? [];

    return project;
  } catch (error) {
    console.error('Failed to fetch project:', error);
    return null;
  }
}

/**
 * Get all publications from Strapi
 * @returns {Promise<Array>} Array of publications
 */
export async function getPublications(options = {}) {
  try {
    const { domainSlug } = options;
    const params = new URLSearchParams();
    params.set('sort', 'year:desc');
    if (domainSlug) {
      params.set('filters[domain][slug][$eq]', domainSlug);
    }
    setPopulate(params, 'populate[authors]', PERSON_FLAT_POPULATE);
    setPopulate(params, 'populate[projects]', { fields: ['title', 'slug'] });
    setPopulate(params, 'populate[domain]', DEPARTMENT_POPULATE);
    setPopulate(params, 'populate[pdfFile]', { fields: ['name', 'url', 'mime', 'ext', 'size'] });
    setPopulate(params, 'populate[bibFile]', { fields: ['name', 'url', 'mime', 'ext', 'size'] });
    setPopulate(params, 'populate[attachments]', { fields: ['name', 'url', 'mime', 'ext', 'size'] });
    const data = await fetchAPI(`/publications?${params.toString()}`);
    return data.data || [];
  } catch (error) {
    console.error('Failed to fetch publications:', error);
    return [];
  }
}

/**
 * Get a single publication by slug from Strapi
 * @param {string} slug - The publication slug
 * @returns {Promise<Object|null>} Publication entry or null
 */
export async function getPublicationBySlug(slug) {
  try {
    if (!slug) return null;
    const params = new URLSearchParams();
    params.set('filters[slug][$eq]', slug);
    params.set('sort', 'year:desc');
    setPopulate(params, 'populate[authors]', PERSON_FLAT_POPULATE);
    setPopulate(params, 'populate[projects]', {
      fields: ['title', 'slug'],
      populate: {
        domains: DEPARTMENT_POPULATE,
      },
    });
    setPopulate(params, 'populate[domain]', DEPARTMENT_POPULATE);
    setPopulate(params, 'populate[themes]', { fields: ['name', 'slug'] });
    setPopulate(params, 'populate[resources]', { fields: ['title', 'slug', 'url', 'icon', 'category'] });
    setPopulate(params, 'populate[pdfFile]', { fields: ['name', 'url', 'mime', 'ext', 'size'] });
    setPopulate(params, 'populate[bibFile]', { fields: ['name', 'url', 'mime', 'ext', 'size'] });
    setPopulate(params, 'populate[attachments]', { fields: ['name', 'url', 'mime', 'ext', 'size'] });
    const data = await fetchAPI(`/publications?${params.toString()}`);
    return data.data?.[0] || null;
  } catch (error) {
    console.error('Failed to fetch publication by slug:', error);
    return null;
  }
}

/**
 * Get all news articles from Strapi
 * @param {Object} options - Options for the query
 * @param {number} options.pageSize - Maximum number of articles to fetch
 * @returns {Promise<Array>} Array of news articles
 */
export async function getNewsArticles(options = {}) {
  const { pageSize } = options;
  
  try {
    const params = createParams({
      sort: 'publishedDate:desc',
      fields: ['title', 'slug', 'summary', 'category', 'publishedDate', 'linkUrl', 'tags'],
      pagination: pageSize ? { pageSize } : null,
      populate: {
        heroImage: { fields: ['url', 'formats', 'alternativeText'] },
      },
    });
    const data = await fetchAPI(`/news-articles?${params.toString()}`);
    return data.data || [];
  } catch (error) {
    console.error('Failed to fetch news articles:', error);
    return [];
  }
}

/**
 * Get publications by author slug
 * @param {string} authorSlug - The author's slug
 * @returns {Promise<Array>} Array of publications by the author
 */
export async function getPublicationsByAuthor(authorSlug) {
  try {
    if (!authorSlug) return [];
    const params = new URLSearchParams();
    params.set('filters[authors][slug][$eq]', authorSlug);
    params.set('sort', 'year:desc');
    setPopulate(params, 'populate[authors]', PERSON_FLAT_POPULATE);
    setPopulate(params, 'populate[projects]', { fields: ['title', 'slug'] });
    setPopulate(params, 'populate[domain]', DEPARTMENT_POPULATE);
    const data = await fetchAPI(`/publications?${params.toString()}`);
    return data.data || [];
  } catch (error) {
    console.error('Failed to fetch publications by author:', error);
    return [];
  }
}

/**
 * Get projects associated with a staff member via their teams
 * @param {string} memberSlug - The staff member's slug
 * @returns {Promise<Array>} Array of projects associated with the staff member
 */
export async function getProjectsByMember(memberSlug) {
  try {
    if (!memberSlug) return [];
    // Projects are now linked through teams; filter teams whose membership includes this person
    const params = new URLSearchParams();
    params.set('sort', 'title:asc');
    params.set('filters[teams][members][person][slug][$eq]', memberSlug);
    setPopulate(params, 'populate[domains]', DEPARTMENT_POPULATE);
    setPopulate(params, 'populate[teams]', { fields: ['name', 'slug'] });
    setPopulate(params, 'populate[publications]', { fields: ['title', 'slug', 'year', 'kind'] });
    const data = await fetchAPI(`/projects?${params.toString()}`);
    return data.data || [];
  } catch (error) {
    console.error('Failed to fetch projects by member:', error);
    return [];
  }
}

export async function getDepartments(options = {}) {
  try {
    const { type, page, pageSize = 100, slim = false } = options;
    const filters = type ? { type: { $eq: type } } : null;

    // slim=true: only fetch the fields needed for list/card views (name, slug, summary, type).
    // slim=false (default): full populate for detail pages.
    const baseOptions = slim ? {
      sort: 'name:asc',
      fields: ['name', 'slug', 'summary', 'type'],
      filters,
    } : {
      sort: 'name:asc',
      fields: ['name', 'slug', 'summary', 'description', 'type'],
      filters,
      populate: {
        focusItems: {},
        contactLinks: {},
        body: {},
        heroImage: {},
        coordinator: PERSON_FLAT_POPULATE,
        coCoordinator: PERSON_FLAT_POPULATE,
      },
    };

    if (page) {
      const params = createParams({ ...baseOptions, pagination: { page, pageSize } });
      const data = await fetchAPI(`/departments?${params.toString()}`);
      return data.data || [];
    }

    return await fetchAllEntries('/departments', baseOptions, pageSize);
  } catch (error) {
    console.error('Failed to fetch departments:', error);
    return [];
  }
}

export async function getResearchThemes() {
  try {
    const params = createParams({
      sort: 'name:asc',
      fields: ['name', 'slug', 'summary', 'color'],
    });
    const data = await fetchAPI(`/research-themes?${params.toString()}`);
    return data.data || [];
  } catch (error) {
    console.error('Failed to fetch research themes:', error);
    return [];
  }
}

/* --- Added Fetchers for Migration --- */

export async function getEvents() {
  try {
    return await fetchAllEntries('/events', {
      fields: EVENT_FIELDS,
      populate: EVENT_POPULATE,
      sort: 'startDate:desc',
    });
  } catch (error) {
    console.error('Failed to fetch events:', error);
    return [];
  }
}

export async function getSeminars() {
  try {
    return await fetchAllEntries('/seminars', {
      fields: SEMINAR_FIELDS,
      populate: SEMINAR_POPULATE,
      sort: 'title:asc',
    });
  } catch (error) {
    console.error('Failed to fetch seminars:', error);
    return [];
  }
}

/**
 * Helper function to transform Strapi data structure to match current app structure
 * This helps reduce the changes needed in existing components
 */
export function transformStaffData(strapiStaff) {
  const list = Array.isArray(strapiStaff) ? strapiStaff : strapiStaff ? [strapiStaff] : [];

  return list.map((person) => {
    // Strapi 5 returns flat objects, Strapi 4 had attributes wrapper
    const attributes = person?.attributes ?? person ?? {};
    const { key: typeKey, label: typeLabel } = normalizeStaffType(
      attributes.type ?? attributes.status ?? attributes.category ?? attributes.role ?? ''
    );
    // Strapi 5: department is direct object, Strapi 4: department.data
    const departmentEntry = attributes.department?.data ?? attributes.department;
    const departmentAttributes = departmentEntry?.attributes ?? departmentEntry ?? {};

    const department = departmentEntry
      ? {
          id: departmentEntry.id,
          slug: departmentAttributes.slug || '',
          name: departmentAttributes.name || '',
          description: stripHtml(
            departmentAttributes.description ||
              departmentAttributes.markdown ||
              departmentAttributes.content ||
              ''
          ),
        }
      : null;

    const socialLinks = toArray(attributes.socialLinks).map((link) => {
      if (!link) return null;
      const rawUrl = (link.url || '').toString().trim();
      const icon = link.icon || 'link';

      const normalizeUrl = (u, iconType) => {
        if (!u) return '';
        let url = u.trim();

        // Emails
        if (iconType === 'mail' || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(url)) {
          if (!/^mailto:/i.test(url)) return `mailto:${url}`;
          return url;
        }

        // Phones
        if (iconType === 'phone' || /^\+?[0-9\s\-()]{3,}$/.test(url)) {
          if (!/^tel:/i.test(url)) return `tel:${url}`;
          return url;
        }

        // Already absolute or protocol-relative
        if (/^https?:\/\//i.test(url) || /^mailto:|^tel:/i.test(url)) return url;
        if (/^\/\//.test(url)) return `https:${url}`;

        // Relative paths (keep as-is)
        if (/^\//.test(url)) return url;

        // If it looks like a hostname (contains a dot) or starts with www, assume https
        if (/^www\./i.test(url) || /\.[a-z]{2,}(\/|$)/i.test(url)) {
          return `https://${url}`;
        }

        // Fallback: return as-is
        return url;
      };

      return {
        label: link.label || '',
        url: normalizeUrl(rawUrl, icon),
        icon,
        raw: rawUrl,
      };
    }).filter(Boolean);

    const publications = toArray(attributes.publications?.data ?? attributes.publications).map((pub) => {
      const pubData = pub?.attributes ?? pub ?? {};
      return {
        id: pub?.id ?? null,
        slug: pubData.slug || '',
        title: pubData.title || '',
        year: pubData.year ?? null,
      };
    });

    // Use 'portrait' field from schema
    const image = resolveMediaUrl(attributes.portrait);

    return {
      id: person?.id ?? null,
      slug: attributes.slug || '',
      // Map fullName (schema) to name (frontend)
      name: attributes.fullName || attributes.name || '',
      title: attributes.title || '',
      phone: attributes.phone || '',
      email: attributes.email || '',
      type: typeKey,
      role: typeKey || attributes.role || '',
      category: typeLabel || typeKey || '',
      department: department?.name || '',
      departmentInfo: department,
      image,
      bio: stripHtml(attributes.bio) || '',
      socialLinks,
      publications,
      _strapi: person,
    };
  });
}

export function groupStaffByType(staffList) {
  const list = Array.isArray(staffList) ? staffList : staffList ? [staffList] : [];

  return list.reduce((acc, person) => {
    const { key, label } = normalizeStaffType(
      person?.type ?? person?.role ?? person?.category ?? person?.status ?? ''
    );

    const bucket = label || STAFF_TYPE_LABELS[key] || 'Other';
    if (!acc[bucket]) acc[bucket] = [];
    acc[bucket].push(person);
    return acc;
  }, {});
}

/**
 * Helper function to transform publication data
 */
export function transformPublicationData(strapiPubs) {
  const list = Array.isArray(strapiPubs) ? strapiPubs : strapiPubs ? [strapiPubs] : [];

  return list.map((pub) => {
    const attributes = pub?.attributes ?? pub ?? {};

    const authors = toArray(attributes.authors?.data ?? attributes.authors).map((author) => {
      const authorData = author?.attributes ?? author ?? {};
      return {
        id: author?.id ?? null,
        slug: authorData.slug || '',
        // Map fullName (schema) to name (frontend)
        name: authorData.fullName || authorData.name || '',
      };
    });

    const projects = toArray(attributes.projects?.data ?? attributes.projects).map((project) => {
      const projectData = project?.attributes ?? project ?? {};
      return {
        id: project?.id ?? null,
        slug: projectData.slug || '',
        title: projectData.title || '',
      };
    });

    const themes = toArray(attributes.themes?.data ?? attributes.themes).map((theme) => {
      const themeData = theme?.attributes ?? theme ?? {};
      return {
        id: theme?.id ?? null,
        slug: themeData.slug || '',
        name: themeData.name || '',
      };
    });

    const resources = toArray(attributes.resources?.data ?? attributes.resources).map((resource) => {
      const resourceData = resource?.attributes ?? resource ?? {};
      return {
        id: resource?.id ?? null,
        slug: resourceData.slug || '',
        title: resourceData.title || '',
        url: resourceData.url || '',
        icon: resourceData.icon || 'link',
        category: resourceData.category || '',
      };
    });

    const pdfFile = (() => {
      const file = attributes.pdfFile?.data ?? attributes.pdfFile;
      if (!file) return null;
      const fileData = file?.attributes ?? file ?? {};
      return {
        id: file?.id ?? null,
        name: fileData.name || '',
        url: resolveMediaUrl(file),
        mime: fileData.mime || '',
        ext: fileData.ext || '',
        size: typeof fileData.size === 'number' ? fileData.size : null,
      };
    })();

    const bibFile = (() => {
      const file = attributes.bibFile?.data ?? attributes.bibFile;
      if (!file) return null;
      const fileData = file?.attributes ?? file ?? {};
      return {
        id: file?.id ?? null,
        name: fileData.name || '',
        url: resolveMediaUrl(file),
        mime: fileData.mime || '',
        ext: fileData.ext || '',
        size: typeof fileData.size === 'number' ? fileData.size : null,
      };
    })();

    const attachments = toArray(attributes.attachments?.data ?? attributes.attachments).map((file) => {
      const fileData = file?.attributes ?? file ?? {};
      return {
        id: file?.id ?? null,
        name: fileData.name || '',
        url: resolveMediaUrl(file),
        mime: fileData.mime || '',
        ext: fileData.ext || '',
        size: typeof fileData.size === 'number' ? fileData.size : null,
      };
    });

    const domainEntry = attributes.domain?.data ?? attributes.domain;
    const domainData = domainEntry?.attributes ?? domainEntry ?? {};
    const domain = domainData.name || (typeof attributes.domain === 'string' ? attributes.domain : '');

    return {
      id: pub?.id ?? null,
      slug: attributes.slug || toPublicationSlug({ title: attributes.title, year: attributes.year }),
      title: attributes.title || '',
      year: attributes.year ?? null,
      domain,
      kind: attributes.kind || '',
      description: stripHtml(attributes.description) || '',
      authors,
      pdfFile,
      bibFile,
      themes,
      resources,
      attachments,
      projects,
      _strapi: pub,
    };
  });
}

export function transformNewsData(strapiNews) {
  const list = Array.isArray(strapiNews) ? strapiNews : strapiNews ? [strapiNews] : [];

  const normalizeDate = (value) => {
    if (!value) return '';
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return '';
    return d.toISOString();
  };

  return list
    .map((item) => {
      const attributes = item?.attributes ?? item ?? {};
      const tags = Array.isArray(attributes.tags) ? attributes.tags : [];
      return {
        id: item?.id ?? null,
        title: attributes.title || '',
        slug: attributes.slug || '',
        summary: attributes.summary || '',
        category: attributes.category || 'other',
        date: normalizeDate(attributes.publishedDate),
        linkUrl: attributes.linkUrl || '',
        image: resolveMediaUrl(attributes.heroImage),
        tags,
        _strapi: item,
      };
    });
}

/**
 * Helper function to transform project data
 */
export function transformProjectData(strapiProjects) {
  const list = Array.isArray(strapiProjects) ? strapiProjects : strapiProjects ? [strapiProjects] : [];

  const normalizeBodyBlocks = (blocks) =>
    toArray(blocks)
      .map((block) => {
        if (!block || typeof block !== 'object') return null;
        switch (block.__component) {
          case 'shared.media':
            return {
              ...block,
              file: resolveMediaUrl(block.file),
            };
          case 'shared.section':
            return {
              ...block,
              media: resolveMediaUrl(block.media),
            };
          case 'shared.slider':
            return {
              ...block,
              files: toArray(block.files).map(resolveMediaUrl).filter(Boolean),
            };
          default:
            return block;
        }
      })
      .filter(Boolean);

  const normalizeTeamEntries = (items) =>
    toArray(items)
      .map((entry) => {
        if (!entry) return null;
        const personEntry = entry?.person?.data ?? entry?.person;
        const personAttr = personEntry?.attributes ?? personEntry ?? {};
        return {
          role: entry?.role || '',
          isLead: !!entry?.isLead,
          person: personEntry
            ? {
                id: personEntry?.id ?? null,
                slug: personAttr.slug || '',
                name: personAttr.fullName || personAttr.name || '',
                title: personAttr.title || '',
                type: personAttr.type || '',
                email: personAttr.email || '',
                phone: personAttr.phone || '',
                image: resolveMediaUrl(personAttr.portrait),
              }
            : null,
        };
      })
      .filter(Boolean);

  const normalizeTimelineEntries = (items) =>
    toArray(items)
      .map((entry) => {
        if (!entry) return null;
        return {
          label: entry?.label || '',
          date: entry?.date || '',
          description: entry?.description || '',
        };
      })
      .filter(Boolean);

  return list.map((project) => {
    const attributes = project?.attributes ?? project ?? {};

    const domains = toArray(attributes.domains?.data ?? attributes.domains).map((department) => {
      const deptData = department?.attributes ?? department ?? {};
      return {
        id: department?.id ?? null,
        slug: deptData.slug || '',
        name: deptData.name || '',
      };
    });

    const themes = toArray(attributes.themes?.data ?? attributes.themes).map((theme) => {
      const themeData = theme?.attributes ?? theme ?? {};
      return {
        id: theme?.id ?? null,
        slug: themeData.slug || '',
        name: themeData.name || '',
      };
    });

    const partners = toArray(attributes.partners?.data ?? attributes.partners).map((partner) => {
      const partnerData = partner?.attributes ?? partner ?? {};
      return {
        id: partner?.id ?? null,
        slug: partnerData.slug || '',
        name: partnerData.name || '',
        logo: resolveMediaUrl(partnerData.logo),
      };
    });

    const teams = toArray(attributes.teams?.data ?? attributes.teams).map((team) => {
      const teamAttr = team?.attributes ?? team ?? {};
      const deptEntry = teamAttr.department?.data ?? teamAttr.department;
      const deptAttr = deptEntry?.attributes ?? deptEntry ?? {};
      return {
        id: team?.id ?? null,
        slug: teamAttr.slug || '',
        name: teamAttr.name || '',
        description: teamAttr.description || '',
        department: deptEntry ? { id: deptEntry?.id ?? null, name: deptAttr.name || '', slug: deptAttr.slug || '' } : null,
        members: toArray(teamAttr.members).map((m) => {
          const personEntry = m?.person?.data ?? m?.person;
          const personAttr = personEntry?.attributes ?? personEntry ?? {};
          return {
            role: m?.role || '',
            isLead: !!m?.isLead,
            person: personEntry ? {
              id: personEntry?.id ?? null,
              slug: personAttr.slug || '',
              name: personAttr.fullName || personAttr.name || '',
              title: personAttr.title || '',
              type: personAttr.type || '',
              email: personAttr.email || '',
              image: resolveMediaUrl(personAttr.portrait),
            } : null,
          };
        }).filter((m) => m.person),
      };
    });

    const publications = toArray(attributes.publications?.data ?? attributes.publications).map((pub) => {
      const pubData = pub?.attributes ?? pub ?? {};

      const pubAuthors = toArray(pubData.authors?.data ?? pubData.authors).map((a) => {
        const aData = a?.attributes ?? a ?? {};
        return aData.fullName || aData.name || '';
      }).filter(Boolean);

      const pubDomainEntry = pubData.domain?.data ?? pubData.domain;
      const pubDomainAttr = pubDomainEntry?.attributes ?? pubDomainEntry ?? {};
      const pubDomain = pubDomainAttr.name || '';

      return {
        id: pub?.id ?? null,
        slug: pubData.slug || '',
        title: pubData.title || '',
        year: pubData.year ?? null,
        kind: pubData.kind || '',
        description: stripHtml(pubData.description || ''),
        authors: pubAuthors,
        domain: pubDomain,
        pdfFile: pubData.pdfFile
          ? {
              url: resolveMediaUrl(pubData.pdfFile),
              name: (pubData.pdfFile?.data?.attributes ?? pubData.pdfFile?.data ?? pubData.pdfFile)?.name || '',
            }
          : null,
      };
    });

    const resources = toArray(attributes.resources?.data ?? attributes.resources).map((resource) => {
      const resourceAttrs = resource?.attributes ?? resource ?? {};
      return {
        id: resource?.id ?? null,
        title: resourceAttrs.title || '',
        slug: resourceAttrs.slug || '',
        url: resourceAttrs.url || '',
        icon: resourceAttrs.icon || 'link',
        category: resourceAttrs.category || '',
      };
    });

    return {
      id: project?.id ?? null,
      slug: attributes.slug || '',
      title: attributes.title || '',
      abstract: attributes.abstract || '',
      body: normalizeBodyBlocks(attributes.body),
      phase: attributes.phase || attributes.status || '',
      isIndustryEngagement: !!attributes.isIndustryEngagement,
      heroImage: resolveMediaUrl(attributes.heroImage),
      // Map themes relation to simple array for frontend compatibility
      themes: themes.map(t => t.name).filter(Boolean),
      // Map partners relation to simple array for frontend compatibility
      partners: partners.map(p => p.name).filter(Boolean),
      themesData: themes,
      partnersData: partners,
      region: attributes.region || '',
      domains,
      domain: domains.map((d) => d.name).filter(Boolean),
      teams,
      timeline: normalizeTimelineEntries(attributes.timeline),
      publications,
      resources,
      // Map docUrl (schema) to docUrl (frontend)
      docUrl: attributes.docUrl || attributes.doc_url || '',
      // Map officialUrl (schema) to oficialUrl (legacy frontend typo)
      oficialUrl: attributes.officialUrl || attributes.oficial_url || attributes.official_url || '',
      _strapi: project,
    };
  });
}

export function transformDepartmentData(strapiDepartments) {
  const list = Array.isArray(strapiDepartments)
    ? strapiDepartments
    : strapiDepartments
    ? [strapiDepartments]
    : [];

  const normalizeFocusItems = (items) =>
    Array.isArray(items)
      ? items
          .map((item) => {
            if (!item) return null;
            const title =
              item?.title || item?.heading || item?.text || item?.label || 'Details';
            const description = stripHtml(item?.description || item?.content || item?.body || '');
            const content = description ? [description] : [];
            return {
              text: title,
              content,
              raw: item,
            };
          })
          .filter(Boolean)
      : [];

  return list.map((department) => {
    const attributes = department?.attributes ?? department ?? {};
    const coordinatorEntry = attributes.coordinator?.data ?? attributes.coordinator;
    const coCoordinatorEntry = attributes.coCoordinator?.data ?? attributes.coCoordinator;
    const coordinatorData = coordinatorEntry?.attributes ?? coordinatorEntry ?? {};
    const coCoordinatorData = coCoordinatorEntry?.attributes ?? coCoordinatorEntry ?? {};

    const coordinator =
      coordinatorData.fullName ||
      coordinatorData.name ||
      (typeof attributes.coordinator === 'string' ? attributes.coordinator : '') ||
      '';
    const coCoordinator =
      coCoordinatorData.fullName ||
      coCoordinatorData.name ||
      (typeof attributes.coCoordinator === 'string' ? attributes.coCoordinator : '') ||
      '';

    const elements = normalizeFocusItems(attributes.focusItems);
    const contactLinks = Array.isArray(attributes.contactLinks)
      ? attributes.contactLinks.map((link) => ({
          label: link?.label || link?.title || link?.text || 'Contact',
          url: link?.url || link?.href || '',
          icon: link?.icon || '',
        }))
      : [];

    return {
      id: department?.id ?? null,
      name: attributes.name || '',
      slug: attributes.slug || '',
      type: normalizeDepartmentType(attributes.type),
      summary: attributes.summary || '',
      description:
        typeof attributes.description === 'string'
          ? stripHtml(attributes.description)
          : stripHtml(attributes.description?.toString?.() || ''),
      rawDescription: attributes.description || '',
      body: attributes.body || [],
      elements,
      contactLinks,
      icon: '🏷️', // Default icon since schema doesn't have icon field
      coordinator,
      coCoordinator,
      focusItems: elements,
      coCoordinatorSlug: coCoordinatorData.slug || '',
      coordinatorSlug: coordinatorData.slug || '',
      _strapi: department,
    };
  });
}

export function transformEventData(strapiEvents) {
  const list = Array.isArray(strapiEvents) ? strapiEvents : strapiEvents ? [strapiEvents] : [];
  return list.map((evt) => {
    const attributes = evt?.attributes ?? evt ?? {};
    return {
      id: evt?.id ?? null,
      title: attributes.title || '',
      slug: attributes.slug || '',
      description: attributes.description || '',
      category: attributes.category || 'event',
      location: attributes.location || '',
      startDate: attributes.startDate || null,
      endDate: attributes.endDate || null,
      // keep 'date' as the primary sort key for backward-compat with the client
      date: attributes.startDate || null,
      ctaLabel: attributes.ctaLabel || '',
      url: attributes.ctaUrl || '',
      image: resolveMediaUrl(attributes.heroImage),
      _strapi: evt,
    };
  });
}

export function transformSeminarData(strapiSeminars) {
  const list = Array.isArray(strapiSeminars) ? strapiSeminars : strapiSeminars ? [strapiSeminars] : [];
  return list.map((sem) => {
    const attributes = sem?.attributes ?? sem ?? {};
    const modules = toArray(attributes.modules).map(m => m.title || m.heading || '');
    
    return {
      id: sem?.id ?? null,
      title: attributes.title || '',
      slug: attributes.slug || '',
      about: attributes.summary ? [attributes.summary] : [],
      modules,
      url: attributes.ctaUrl || '',
      _strapi: sem,
    };
  });
}

/* --- Resource Fetcher --- */

const RESOURCE_FIELDS = ['title', 'slug', 'description', 'url', 'icon', 'category', 'tags', 'featured'];

const RESOURCE_POPULATE = {
  department: {
    fields: ['name', 'slug'],
  },
  maintainers: {
    fields: ['fullName', 'slug'],
  },
};

const EVENT_FIELDS = ['title', 'slug', 'startDate', 'endDate', 'location', 'category', 'ctaLabel', 'ctaUrl', 'description'];

const EVENT_POPULATE = {
  heroImage: { fields: ['url', 'alternativeText'] },
};

const SEMINAR_FIELDS = ['title', 'slug', 'provider', 'summary', 'ctaLabel', 'ctaUrl'];

const SEMINAR_POPULATE = {
  modules: { fields: ['title', 'description', 'richContent'] },
};

export async function getResources(options = {}) {
  try {
    const { category, featured } = options;
    
    const filters = {};
    if (category) {
      filters.category = { $eq: category };
    }
    if (featured !== undefined) {
      filters.featured = { $eq: featured };
    }
    
    return await fetchAllEntries('/resources', {
      fields: RESOURCE_FIELDS,
      populate: RESOURCE_POPULATE,
      filters: Object.keys(filters).length ? filters : null,
      sort: 'title:asc',
    });
  } catch (error) {
    console.error('Failed to fetch resources:', error);
    return [];
  }
}

export function transformResourceData(strapiResources) {
  const list = Array.isArray(strapiResources) ? strapiResources : strapiResources ? [strapiResources] : [];
  
  return list.map((res) => {
    const attributes = res?.attributes ?? res ?? {};
    
    const maintainers = toArray(attributes.maintainers?.data ?? attributes.maintainers).map((m) => {
      const mAttr = m?.attributes ?? m ?? {};
      return {
        name: mAttr.fullName || mAttr.name || '',
        slug: mAttr.slug || '',
      };
    });
    
    const department = (() => {
      const dept = attributes.department?.data ?? attributes.department;
      if (!dept) return null;
      const deptAttr = dept?.attributes ?? dept ?? {};
      return {
        name: deptAttr.name || '',
        slug: deptAttr.slug || '',
      };
    })();
    
    return {
      id: res?.id ?? null,
      title: attributes.title || '',
      slug: attributes.slug || '',
      description: attributes.description || '',
      url: attributes.url || '',
      icon: attributes.icon || 'link',
      category: attributes.category || 'other',
      tags: attributes.tags || [],
      featured: attributes.featured || false,
      maintainers,
      department,
      _strapi: res,
    };
  });
}

