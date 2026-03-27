import slugify from 'slugify';

/**
 * Generate a unique slug from a text string with automatic duplicate handling
 * 
 * @param text - The text to slugify (e.g., title, name)
 * @param contentType - The Strapi content type UID (e.g., 'api::publication.publication')
 * @param currentId - The ID of the current entity (for updates)
 * @returns A unique slug
 */
export async function generateUniqueSlug(
  text: string,
  contentType: string,
  currentId?: number | string
): Promise<string> {
  if (!text || text.trim() === '') {
    throw new Error('Cannot generate slug from empty text');
  }

  // Generate base slug
  const baseSlug = slugify(text, {
    lower: true,
    strict: true,
    replacement: '-',
  });

  // Check if slug exists
  let slug = baseSlug;
  let counter = 1;
  let isUnique = false;

  while (!isUnique) {
    const existingEntries = await (strapi.documents as any)(contentType).findMany({
      filters: { slug } as any,
      fields: ['documentId', 'slug'] as any,
    });

    // If no entries found, or the only entry is the current one being updated
    if (existingEntries.length === 0) {
      isUnique = true;
    } else if (
      existingEntries.length === 1 &&
      currentId &&
      existingEntries[0].documentId === currentId
    ) {
      isUnique = true;
    } else {
      // Append counter to make it unique
      counter++;
      slug = `${baseSlug}-${counter}`;
    }
  }

  return slug;
}

/**
 * Generate slug without duplicate checking (simpler, faster)
 * Use this when you're certain the slug will be unique
 */
export function generateSlug(text: string): string {
  if (!text || text.trim() === '') {
    throw new Error('Cannot generate slug from empty text');
  }

  return slugify(text, {
    lower: true,
    strict: true,
    replacement: '-',
  });
}
