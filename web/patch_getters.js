const fs = require('fs');
const file = 'web/src/lib/strapi.js';
let content = fs.readFileSync(file, 'utf8');

const applyFallback = (getterName, entityName) => {
  const fetchLine = `let data = await fetchAPI(\`/${entityName}?\${params.toString()}\`);`;
  
  // Find the exact block
  const blockStartIdx = content.indexOf(`export async function ${getterName}(slug, locale = null)`);
  if (blockStartIdx === -1) {
    console.log(`Could not find ${getterName}`);
    return;
  }
  
  const fetchIdx = content.indexOf(fetchLine, blockStartIdx);
  if (fetchIdx === -1) {
    console.log(`Could not find fetch call in ${getterName}`);
    return;
  }
  
  const returnIdx = content.indexOf(`return data.data?.[0] || null;`, fetchIdx);
  if (returnIdx === -1) {
    console.log(`Could not find return statement in ${getterName}`);
    return;
  }

  const fallbackBlock = `
    if (!data.data?.length && locale && locale !== 'en') {
      const fallbackParams = new URLSearchParams(params);
      fallbackParams.set("locale", "en");
      const fallbackData = await fetchAPI(\`/${entityName}?\${fallbackParams.toString()}\`);
      if (fallbackData.data?.[0]) {
        return { ...fallbackData.data[0], _isFallback: true };
      }
    }
    `;
    
  // replace the section exactly
  content = content.slice(0, fetchIdx + fetchLine.length) + fallbackBlock + content.slice(returnIdx);
  console.log(`Patched ${getterName}`);
};

applyFallback('getProjectBySlug', 'projects');
applyFallback('getResultBySlug', 'results');
applyFallback('getStaffMember', 'people');
applyFallback('getNewsArticleBySlug', 'news-articles');
applyFallback('getDepartmentBySlug', 'departments');

fs.writeFileSync(file, content, 'utf8');
