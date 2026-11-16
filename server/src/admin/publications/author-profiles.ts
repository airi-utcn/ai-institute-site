/** Admin relation values include persisted counts and pending connect/disconnects. */
export function hasPersonLink(person: any, persistedPerson?: any): boolean {
  if (!person) return false;
  if (Array.isArray(person)) return person.length > 0;
  if (person.documentId || person.id) return true;
  return Math.max(0, Number(person.count ?? persistedPerson?.count ?? 0) - (person.disconnect?.length || 0))
    + (person.connect?.length || 0) > 0;
}

export function unlinkedAuthorCredits(credits: any[] = [], persistedCredits: any[] = []) {
  return (Array.isArray(credits) ? credits : []).flatMap((credit, index) => {
    const name = String(credit.name || '').trim();
    // Strapi clears relation counts from form values; match persisted rows by ID,
    // not index, because authors can be reordered, inserted or removed.
    const persisted = credit.id ? persistedCredits.find((row) => row.id === credit.id) : undefined;
    return name && !hasPersonLink(credit.person, persisted?.person)
      ? [{ name, index, key: String(credit.__temp_key__ ?? credit.id ?? index) }] : [];
  });
}

export function suggestedAuthorName(name: string) {
  const parts = name.trim().split(/\s+/);
  return { firstName: parts.slice(0, -1).join(' ') || parts[0], lastName: parts.length > 1 ? parts.at(-1)! : '' };
}
