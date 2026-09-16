const fs = require('fs');
const file = 'web/src/lib/strapi.js';
let content = fs.readFileSync(file, 'utf8');

const transformers = ['transformPublicationData', 'transformProjectData', 'transformResultData', 'transformPersonData', 'transformNewsData', 'transformPartnerData', 'transformDepartmentData', 'transformResourceData', 'transformEventData', 'transformSeminarData'];

for (const tf of transformers) {
  const match = content.match(new RegExp(`(export function ${tf}[\\s\\S]*?)(_strapi:\\s*(?:pub|proj|res|person|article|partner|dept|resource|event|seminar|item),)`));
  if (match) {
    const pubVarMatch = match[2].match(/_strapi:\s*([a-zA-Z0-9_]+)/);
    if (pubVarMatch) {
       const pubVar = pubVarMatch[1];
       content = content.replace(match[2], `${match[2]}\n      _isFallback: ${pubVar}._isFallback || false,`);
       console.log(`Patched ${tf}`);
    }
  } else {
    console.log(`Could not find return block for ${tf}`);
  }
}

fs.writeFileSync(file, content, 'utf8');
