const fs = require('fs');
const file = 'web/src/lib/strapi.js';
let content = fs.readFileSync(file, 'utf8');

// Replace getPublicationBySlug fallback
const oldPubFallback = `    if (!data.data?.length && locale) {
      // Fallback: The requested locale might not exist by this locale-specific slug.
      // Search for the entity by slug ignoring locale, get its documentId, then fetch that documentId in the required locale.
      const fallbackParams = new URLSearchParams(params);
      fallbackParams.delete("locale");
      const fallbackData = await fetchAPI(\`/publications?\${fallbackParams.toString()}\`);
      if (fallbackData.data?.[0]?.documentId) {
        const docIdParams = new URLSearchParams(params);
        docIdParams.delete("filters[slug][$eq]");
        docIdParams.set("filters[documentId][$eq]", fallbackData.data[0].documentId);
        data = await fetchAPI(\`/publications?\${docIdParams.toString()}\`);
      }
    }`;

const newPubFallback = `    if (!data.data?.length && locale && locale !== 'en') {
      // Fallback: The localized version doesn't exist at all.
      // Fetch the default English version instead so the user doesn't get a 404 blank page.
      const fallbackParams = new URLSearchParams(params);
      fallbackParams.set("locale", "en"); // explicitly request the default locale
      const fallbackData = await fetchAPI(\`/publications?\${fallbackParams.toString()}\`);
      
      if (fallbackData.data?.[0]) {
        return { ...fallbackData.data[0], _isFallback: true };
      }
    }`;

content = content.replace(oldPubFallback, newPubFallback);

fs.writeFileSync(file, content, 'utf8');
console.log("Patched getPublicationBySlug in strapi.js");
