const fs = require('fs');
const file = 'web/src/lib/strapi.js';
let content = fs.readFileSync(file, 'utf8');

// Patch getProjectBySlug
const projectOld = `    const projectData = await fetchAPI(\`/projects?\${projectParams.toString()}\`);\n\n    const project = projectData.data?.[0];\n    if (!project) return null;`;
const projectNew = `    const projectData = await fetchAPI(\`/projects?\${projectParams.toString()}\`);\n    let project = projectData.data?.[0];\n    if (!project && locale && locale !== 'en') {\n      const fallbackParams = new URLSearchParams(projectParams);\n      fallbackParams.set("locale", "en");\n      const fallbackData = await fetchAPI(\`/projects?\${fallbackParams.toString()}\`);\n      if (fallbackData.data?.[0]) {\n        project = fallbackData.data[0];\n        project._isFallback = true;\n      }\n    }\n    if (!project) return null;`;
content = content.replace(projectOld, projectNew);
console.log("Patched getProjectBySlug");

// Patch getSingleType
const singleOld = `    const res = await fetchAPI(\`/\${endpoint}?\${params.toString()}\`);\n    return res?.data || null;`;
const singleNew = `    let res = await fetchAPI(\`/\${endpoint}?\${params.toString()}\`);\n    if (!res?.data && locale && locale !== "en") {\n      const fallbackParams = new URLSearchParams(params);\n      fallbackParams.set("locale", "en");\n      const fallbackRes = await fetchAPI(\`/\${endpoint}?\${fallbackParams.toString()}\`);\n      if (fallbackRes?.data) {\n        res = fallbackRes;\n        res.data._isFallback = true;\n      }\n    }\n    return res?.data || null;`;
content = content.replace(singleOld, singleNew);
console.log("Patched getSingleType");

fs.writeFileSync(file, content, 'utf8');
