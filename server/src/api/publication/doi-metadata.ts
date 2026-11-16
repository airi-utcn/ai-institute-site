export interface DoiAuthor {
  name: string;
  given?: string;
  family?: string;
  affiliation: string;
}

export interface DoiMetadata {
  doi: string;
  title: string;
  year: number | null;
  authorCredits: DoiAuthor[];
  bibtex: string;
  source: 'Crossref' | 'DataCite';
}

export class DoiLookupError extends Error {
  constructor(message: string, public status = 502) { super(message); }
}

export function normalizeDoi(value: unknown): string {
  let doi = typeof value === 'string' ? value.trim() : '';
  if (/^https?:\/\//i.test(doi)) {
    try {
      const url = new URL(doi);
      if (!['doi.org', 'www.doi.org', 'dx.doi.org'].includes(url.hostname.toLowerCase())) throw new Error();
      doi = decodeURIComponent(url.pathname.slice(1));
    } catch { throw new DoiLookupError('Enter a valid DOI or doi.org URL.', 400); }
  } else {
    doi = doi.replace(/^doi:\s*/i, '');
  }
  if (doi.length > 512 || !/^10\.\d{4,9}\/[^\s\u0000-\u001f\u007f]+$/i.test(doi)) {
    throw new DoiLookupError('Enter a valid DOI or doi.org URL.', 400);
  }
  return doi.toLowerCase();
}

const plainText = (value: unknown) => String(value ?? '')
  .replace(/<[^>]*>/g, '')
  .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
  .replace(/&quot;/g, '"').replace(/&apos;/g, "'")
  .replace(/\s+/g, ' ').trim();
const yearNumber = (value: unknown) => {
  const year = Number(value);
  return Number.isInteger(year) && year >= 1000 && year <= 9999 ? year : null;
};
const tex = (value: string) => value.replace(/[\\{}%&#_$~^]/g, (char) => ({
  '\\': '\\textbackslash{}', '~': '\\textasciitilde{}', '^': '\\textasciicircum{}',
}[char] || `\\${char}`));

export function buildBibtex(record: Omit<DoiMetadata, 'bibtex'>): string {
  const key = record.doi.replace(/[^a-z0-9]/gi, '');
  const authors = record.authorCredits.map((author) => author.family
    ? `${tex(author.family)}, ${tex(author.given || '')}` : `{${tex(author.name)}}`);
  const fields = [
    `  title = {${tex(record.title)}}`,
    ...(authors.length ? [`  author = {${authors.join(' and ')}}`] : []),
    ...(record.year ? [`  year = {${record.year}}`] : []),
    `  doi = {${tex(record.doi)}}`,
    `  url = {https://doi.org/${tex(record.doi)}}`,
  ];
  return `@misc{doi${key},\n${fields.join(',\n')}\n}`;
}

export function fromCrossref(doi: string, work: any): Omit<DoiMetadata, 'bibtex'> {
  return {
    doi, source: 'Crossref',
    title: plainText(work.title?.[0]),
    year: [work['published-print'], work['published-online'], work.issued]
      .map((date) => yearNumber(date?.['date-parts']?.[0]?.[0])).find(Boolean) || null,
    authorCredits: (Array.isArray(work.author) ? work.author : []).map((author: any) => ({
      name: plainText(author.name || [author.given, author.family].filter(Boolean).join(' ')),
      given: plainText(author.given), family: plainText(author.family),
      affiliation: (Array.isArray(author.affiliation) ? author.affiliation : [])
        .map((affiliation: any) => plainText(affiliation.name)).filter(Boolean).join('; '),
    })).filter((author: DoiAuthor) => author.name),
  };
}

export function fromDataCite(doi: string, work: any): Omit<DoiMetadata, 'bibtex'> {
  return {
    doi, source: 'DataCite',
    title: plainText(work.titles?.find((title: any) => !title.titleType)?.title || work.titles?.[0]?.title),
    year: yearNumber(work.publicationYear),
    authorCredits: (Array.isArray(work.creators) ? work.creators : []).map((author: any) => ({
      name: plainText([author.givenName, author.familyName].filter(Boolean).join(' ') || author.name),
      given: plainText(author.givenName), family: plainText(author.familyName),
      affiliation: (Array.isArray(author.affiliation) ? author.affiliation : [])
        .map((affiliation: any) => plainText(typeof affiliation === 'string' ? affiliation : affiliation.name)).filter(Boolean).join('; '),
    })).filter((author: DoiAuthor) => author.name),
  };
}

/** Read registry metadata only. Never follow DOI redirects to publisher URLs. */
export async function lookupDoi(value: unknown, fetcher: typeof fetch = fetch): Promise<DoiMetadata> {
  const doi = normalizeDoi(value);
  const encoded = encodeURIComponent(doi);
  const request = (url: string, accept = 'application/json') => fetcher(url, {
    headers: { Accept: accept, 'User-Agent': 'AIRi-Publication-Editor/1.0 (+https://airi.utcluj.ro)' },
    signal: AbortSignal.timeout(8_000), redirect: 'error',
  });
  let record: Omit<DoiMetadata, 'bibtex'> | undefined;
  let unavailable = false;
  try {
    const response = await request(`https://api.crossref.org/works/${encoded}`);
    if (response.ok) record = fromCrossref(doi, (await response.json() as any).message || {});
    else if (response.status !== 404) unavailable = true;
  } catch { unavailable = true; }
  if (!record?.title) {
    try {
      const response = await request(`https://api.datacite.org/dois/${encoded}`);
      if (response.ok) record = fromDataCite(doi, (await response.json() as any).data?.attributes || {});
      else if (response.status !== 404) unavailable = true;
    } catch { unavailable = true; }
  }
  if (!record?.title) {
    throw new DoiLookupError(unavailable
      ? 'DOI metadata is temporarily unavailable. Try again or fill the fields manually.'
      : 'No metadata was found for this DOI. You can fill the fields manually.', unavailable ? 503 : 404);
  }
  let bibtex = buildBibtex(record);
  if (record.source === 'Crossref') {
    try {
      const response = await request(`https://api.crossref.org/works/${encoded}/transform/application/x-bibtex`, 'application/x-bibtex');
      if (response.ok) {
        const citation = (await response.text()).trim();
        if (/^@\w+\s*[{(]/.test(citation)) bibtex = citation;
      }
    } catch { /* Structured registry metadata still provides a usable citation. */ }
  }
  return { ...record, bibtex };
}
