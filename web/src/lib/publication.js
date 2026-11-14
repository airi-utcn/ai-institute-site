export const PUBLICATION_SOURCE_KIND = {
  MANUAL: 'manual',
  OPENALEX_AUTOMATED: 'openAlexAutomated',
};

export const AIRI_AFFILIATION = 'Artificial Intelligence Research Institute, Technical University of Cluj-Napoca';

export function publicationExternalUrl(value) {
  try {
    const url = new URL(String(value || '').trim());
    return ['http:', 'https:'].includes(url.protocol) ? url.href : '';
  } catch {
    return '';
  }
}

// Explicit credits preserve paper order and publication-specific affiliations.
// Append older person relations so adding credits never hides existing authors.
export function mergePublicationAuthors(authors = [], credits = []) {
  const result = [];
  const seenPeople = new Set();
  const personKey = (person) => person?.documentId || person?.slug || person?.id;

  for (const credit of credits) {
    const person = credit.person;
    const name = String(credit.name || person?.name || '').trim();
    if (!name) continue;
    const key = personKey(person);
    if (key && seenPeople.has(key)) continue;
    if (key) seenPeople.add(key);
    result.push({
      ...person,
      name,
      isExternal: person ? person.isExternal : true,
      affiliation: credit.affiliation?.trim()
        ? { name: credit.affiliation.trim() }
        : person?.affiliation || null,
    });
  }

  for (const author of authors) {
    const key = personKey(author);
    if (key && seenPeople.has(key)) continue;
    if (key) seenPeople.add(key);
    if (author.name) result.push(author);
  }
  return result;
}

const OPENALEX_LIKE_VALUES = new Set([
  'openalex',
  'openalexautomated',
  'open_alex_automated',
  'openalex_automated',
  'merged',
]);

const MANUAL_LIKE_VALUES = new Set([
  'manual',
  'curated',
  'handmade',
]);

export function normalizePublicationSourceKind(sourceKind, openAlexId) {
  const raw = String(sourceKind || '').trim();
  const normalized = raw.toLowerCase();

  if (raw === PUBLICATION_SOURCE_KIND.MANUAL || raw === PUBLICATION_SOURCE_KIND.OPENALEX_AUTOMATED) {
    return raw;
  }

  if (OPENALEX_LIKE_VALUES.has(normalized)) {
    return PUBLICATION_SOURCE_KIND.OPENALEX_AUTOMATED;
  }

  if (MANUAL_LIKE_VALUES.has(normalized)) {
    return PUBLICATION_SOURCE_KIND.MANUAL;
  }

  return openAlexId ? PUBLICATION_SOURCE_KIND.OPENALEX_AUTOMATED : PUBLICATION_SOURCE_KIND.MANUAL;
}

export function getPublicationSourceLabel(sourceKind, openAlexId) {
  return normalizePublicationSourceKind(sourceKind, openAlexId) === PUBLICATION_SOURCE_KIND.OPENALEX_AUTOMATED
    ? 'OpenAlex automated'
    : 'Manual';
}
