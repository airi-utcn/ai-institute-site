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

export function initialDoiSelection(proposal: DoiProposal, values: any, allowed: Record<DoiField, boolean>): DoiSelection {
  const authors = values.authors;
  const hasAuthors = Array.isArray(authors) ? authors.length > 0
    : Boolean(authors?.count || authors?.connect?.length);
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
