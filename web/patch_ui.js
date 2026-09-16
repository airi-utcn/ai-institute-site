const fs = require('fs');
const walk = (dir) => {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach((file) => {
    const filePath = dir + '/' + file;
    const stat = fs.statSync(filePath);
    if (stat && stat.isDirectory()) {
      results = results.concat(walk(filePath));
    } else if (file === 'page.js') {
      results.push(filePath);
    }
  });
  return results;
};

const pages = walk('web/src/app').filter(p => !p.includes('/api/'));

for (const page of pages) {
  let content = fs.readFileSync(page, 'utf8');
  let matched = false;

  // Single Types that use _isFallback from props directly
  const singleMatch = content.match(/const ([\w]+) = await getSingleType\(['"`]/);
  if (singleMatch && content.includes('return (') && !content.includes('FallbackDisclaimer')) {
    const varName = singleMatch[1];
    content = `import FallbackDisclaimer from "@/components/FallbackDisclaimer";\n` + content;
    
    // Replace standard Nextjs page return block
    const retRegex = /return\s*\(\s*</;
    content = content.replace(retRegex, `return (\n    <>\n      <FallbackDisclaimer isFallback={${varName}._isFallback} />\n      <`);
    // Wrap with <> if not already
    if (!content.includes('return (\n    <>\n      <FallbackDisclaimer')) {
        content = content.replace(/(return \(\s*<>[\s\S]*?)(\);)/, '$1    </>\n$2');
    }
    matched = true;
  }
  
  // Collections detail pages
  const dVars = ['project', 'result', 'article', 'partner', 'department', 'staff', 'resource', 'event', 'seminar'];
  for (const v of dVars) {
    if (content.match(new RegExp(`const ${v} = transform[A-Za-z]+Data\\(\\[.*?\\]\\)\\[0\\];`)) && !content.includes('FallbackDisclaimer') && !content.includes('import FallbackDisclaimer')) {
        content = `import FallbackDisclaimer from "@/components/FallbackDisclaimer";\n` + content;
        content = content.replace(/return\s*\(\s*<>/, `return (\n    <>\n      <FallbackDisclaimer isFallback={${v}._isFallback} />`);
        matched = true;
    }
  }

  if (matched) {
    fs.writeFileSync(page, content, 'utf8');
    console.log(`Injected FallbackDisclaimer into ${page}`);
  }
}
