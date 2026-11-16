export type DoiField = 'title' | 'year' | 'authorCredits' | 'bibtex';
export type DoiSelection = Record<DoiField, boolean>;
export interface DoiProposal {
  doi: string;
  title: string;
  year: number | null;
  bibtex: string;
  source: string;
  authorCredits: Array<{
    name: string;
    affiliation: string;
    person?: { id: number; documentId: string; firstName: string; lastName: string; fullName: string } | null;
  }>;
}

export function initialDoiSelection(
  proposal: DoiProposal,
  values: any,
  allowed: Record<DoiField, boolean>,
  persistedAuthors?: any,
): DoiSelection {
  // Admin form relations are { connect, disconnect } without a count, so the
  // persisted document is the only reliable source for the existing links.
  const persisted = Array.isArray(persistedAuthors)
    ? persistedAuthors.length
    : Number(persistedAuthors?.count ?? 0);
  const authors = values.authors;
  const relation = authors && !Array.isArray(authors) ? authors : null;
  const baseline = Array.isArray(authors) ? authors.length : persisted;
  const hasAuthors = Math.max(0, baseline - (relation?.disconnect?.length || 0))
    + (relation?.connect?.length || 0) > 0;
  return {
    title: allowed.title && Boolean(proposal.title) && !values.title?.trim(),
    year: allowed.year && Boolean(proposal.year) && !values.year,
    bibtex: allowed.bibtex && Boolean(proposal.bibtex) && !values.bibtex?.trim() && !values.bibFile,
    authorCredits: allowed.authorCredits && proposal.authorCredits.length > 0 && !values.authorCredits?.length && !hasAuthors,
  };
}

export function doiAuthorRow(author: DoiProposal['authorCredits'][number]) {
  return {
    name: author.name,
    affiliation: author.affiliation,
    person: {
      connect: author.person ? [{
        ...author.person,
        apiData: { id: author.person.id, documentId: author.person.documentId },
        __temp_key__: 'a0',
      }] : [],
      disconnect: [],
    },
  };
}
