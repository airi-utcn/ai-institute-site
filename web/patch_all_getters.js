const fs = require('fs');
const file = 'web/src/lib/strapi.js';
let content = fs.readFileSync(file, 'utf8');

const patchByRegex = (funcName, searchPattern, replaceMatchFn) => {
  const funcStart = content.indexOf(`export async function ${funcName}`);
  if (funcStart === -1) {
    console.log(`Could not find ${funcName}`); return;
  }
  
  const block = content.slice(funcStart, funcStart + 2500); // Look in the first 2500 chars of the func
  const match = block.match(searchPattern);
  
  if (match) {
    const toReplace = match[0];
    const replacement = replaceMatchFn(match);
    
    // Replace just this specific occurrence near the function start
    content = content.substring(0, funcStart) + content.substring(funcStart).replace(toReplace, replacement);
    console.log(`Patched ${funcName}`);
  } else {
    console.log(`Could not match pattern for ${funcName}`);
  }
};

// 1. getProjectBySlug
patchByRegex(
  'getProjectBySlug', 
  /const projectData = await fetchAPI\(`\/projects\?\$\{projectParams\.toString\(\)\}`\);\s*const project = projectData\.data\?\.\[0\];\s*if \(\!project\) return null;/,
  () => `const projectData = await fetchAPI(\`/projects?\${projectParams.toString()}\`);
    let project = projectData.data?.[0];
    let isFallback = false;
    
    if (!project && locale && locale !== 'en') {
      const fallbackParams = new URLSearchParams(projectParams);
      fallbackParams.set("locale", "en");
      const fallbackData = await fetchAPI(\`/projects?\${fallbackParams.toString()}\`);
      if (fallbackData.data?.[0]) {
        project = fallbackData.data[0];
        project._isFallback = true;
        isFallback = true;
      }
    }
    
    if (!project) return null;`
);

// 2. getPartnerBySlug
patchByRegex(
  'getPartnerBySlug',
  /const data = await fetchAPI\(`\/partners\?\$\{params\.toString\(\)\}`\);\s*return data\.data\?\.\[0\] \|\| null;/,
  () => `const data = await fetchAPI(\`/partners?\${params.toString()}\`);
    if (!data.data?.length && locale && locale !== 'en') {
      const fallbackParams = new URLSearchParams(params);
      fallbackParams.set("locale", "en");
      const fallbackData = await fetchAPI(\`/partners?\${fallbackParams.toString()}\`);
      if (fallbackData.data?.[0]) {
        return { ...fallbackData.data[0], _isFallback: true };
      }
    }
    return data.data?.[0] || null;`
);

// 3. getNewsArticleBySlug
patchByRegex(
  'getNewsArticleBySlug',
  /const data = await fetchAPI\(`\/news-articles\?\$\{params\.toString\(\)\}`\);\s*return data\.data\?\.\[0\] \|\| null;/,
  () => `const data = await fetchAPI(\`/news-articles?\${params.toString()}\`);
    if (!data.data?.length && locale && locale !== 'en') {
      const fallbackParams = new URLSearchParams(params);
      fallbackParams.set("locale", "en");
      const fallbackData = await fetchAPI(\`/news-articles?\${fallbackParams.toString()}\`);
      if (fallbackData.data?.[0]) {
        return { ...fallbackData.data[0], _isFallback: true };
      }
    }
    return data.data?.[0] || null;`
);

// 4. getResultBySlug
patchByRegex(
  'getResultBySlug',
  /const data = await fetchAPI\(`\/results\?\$\{params\.toString\(\)\}`\);\s*return data\.data\?\.\[0\] \|\| null;/,
  () => `const data = await fetchAPI(\`/results?\${params.toString()}\`);
    if (!data.data?.length && locale && locale !== 'en') {
      const fallbackParams = new URLSearchParams(params);
      fallbackParams.set("locale", "en");
      const fallbackData = await fetchAPI(\`/results?\${fallbackParams.toString()}\`);
      if (fallbackData.data?.[0]) {
        return { ...fallbackData.data[0], _isFallback: true };
      }
    }
    return data.data?.[0] || null;`
);

// 5. getDepartmentBySlug
patchByRegex(
  'getDepartmentBySlug',
  /const data = await fetchAPI\(`\/departments\?\$\{params\.toString\(\)\}`\);\s*return data\.data\?\.\[0\] \|\| null;/,
  () => `const data = await fetchAPI(\`/departments?\${params.toString()}\`);
    if (!data.data?.length && locale && locale !== 'en') {
      const fallbackParams = new URLSearchParams(params);
      fallbackParams.set("locale", "en");
      const fallbackData = await fetchAPI(\`/departments?\${fallbackParams.toString()}\`);
      if (fallbackData.data?.[0]) {
        return { ...fallbackData.data[0], _isFallback: true };
      }
    }
    return data.data?.[0] || null;`
);

// 6. getStaffMember
patchByRegex(
  'getStaffMember',
  /const data = await fetchAPI\(`\/people\?\$\{params\.toString\(\)\}`\);\s*return data\.data\?\.\[0\] \|\| null;/,
  () => `const data = await fetchAPI(\`/people?\${params.toString()}\`);
    if (!data.data?.length && locale && locale !== 'en') {
      const fallbackParams = new URLSearchParams(params);
      fallbackParams.set("locale", "en");
      const fallbackData = await fetchAPI(\`/people?\${fallbackParams.toString()}\`);
      if (fallbackData.data?.[0]) {
        return { ...fallbackData.data[0], _isFallback: true };
      }
    }
    return data.data?.[0] || null;`
);


// 7. getSingleType
patchByRegex(
  'getSingleType',
  /const data = await fetchAPI\(`\/\$\{type\}\?\$\{params\.toString\(\)\}`\);\s*return data\?\.data \|\| null;/,
  () => `const data = await fetchAPI(\`/\${type}?\${params.toString()}\`);
  const locale = (typeof options === 'string' ? options : options?.locale) || null;
  if (!data?.data && locale && locale !== 'en') {
      const fallbackParams = new URLSearchParams(params);
      fallbackParams.set("locale", "en");
      const fallbackData = await fetchAPI(\`/\${type}?\${fallbackParams.toString()}\`);
      if (fallbackData?.data) {
        return { ...fallbackData.data, _isFallback: true };
      }
  }
  return data?.data || null;`
);

fs.writeFileSync(file, content, 'utf8');
