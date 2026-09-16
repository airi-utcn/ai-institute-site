const fs = require('fs');

const edit = (file, matchStr, replacement) => {
    let content = fs.readFileSync(file, 'utf8');
    if (!content.includes('FallbackDisclaimer') && content.includes(matchStr)) {
        content = 'import FallbackDisclaimer from "@/components/FallbackDisclaimer";\n' + content;
        content = content.replace(matchStr, replacement);
        fs.writeFileSync(file, content, 'utf8');
        console.log("Patched " + file);
    }
}

// 1. about/page.js
edit('web/src/app/about/page.js', '  return (\n    <div className', '  return (\n    <>\n      <FallbackDisclaimer isFallback={about?._isFallback} />\n      <div className');
let abt = fs.readFileSync('web/src/app/about/page.js', 'utf8');
if (abt.includes('<FallbackDisclaimer') && !abt.includes('    </>')) {
    abt = abt.replace(/(return \(\s*<>[\s\S]*?)(\n  \);\n})/, '$1\n    </>$2');
    fs.writeFileSync('web/src/app/about/page.js', abt, 'utf8');
}

// 2. page.js (Home page)
edit('web/src/app/page.js', '  return (\n    <main className=', '  return (\n    <>\n      <FallbackDisclaimer isFallback={home?._isFallback} />\n      <main className=');
let home = fs.readFileSync('web/src/app/page.js', 'utf8');
if (home.includes('<FallbackDisclaimer') && !home.includes('    </>')) {
    home = home.replace(/(return \(\s*<>[\s\S]*?)(\n  \);\n})/, '$1\n    </>$2');
    fs.writeFileSync('web/src/app/page.js', home, 'utf8');
}

// 3. search/chatbot
edit('web/src/app/search/chatbot/page.js', '  return (\n    <div className', '  return (\n    <>\n      <FallbackDisclaimer isFallback={searchData?._isFallback} />\n      <div className');
let searchChat = fs.readFileSync('web/src/app/search/chatbot/page.js', 'utf8');
if (searchChat.includes('<FallbackDisclaimer') && !searchChat.includes('    </>')) {
    searchChat = searchChat.replace(/(return \(\s*<>[\s\S]*?)(\n  \);\n})/, '$1\n    </>$2');
    fs.writeFileSync('web/src/app/search/chatbot/page.js', searchChat, 'utf8');
}

// 4. search/classic
edit('web/src/app/search/classic/page.js', '  return (\n    <div className', '  return (\n    <>\n      <FallbackDisclaimer isFallback={searchData?._isFallback} />\n      <div className');
let classic = fs.readFileSync('web/src/app/search/classic/page.js', 'utf8');
if (classic.includes('<FallbackDisclaimer') && !classic.includes('    </>')) {
    classic = classic.replace(/(return \(\s*<>[\s\S]*?)(\n  \);\n})/, '$1\n    </>$2');
    fs.writeFileSync('web/src/app/search/classic/page.js', classic, 'utf8');
}

// 5. search/knowledge-graph
edit('web/src/app/search/knowledge-graph/page.js', '  return (\n    <div className', '  return (\n    <>\n      <FallbackDisclaimer isFallback={searchData?._isFallback} />\n      <div className');
let graph = fs.readFileSync('web/src/app/search/knowledge-graph/page.js', 'utf8');
if (graph.includes('<FallbackDisclaimer') && !graph.includes('    </>')) {
    graph = graph.replace(/(return \(\s*<>[\s\S]*?)(\n  \);\n})/, '$1\n    </>$2');
    fs.writeFileSync('web/src/app/search/knowledge-graph/page.js', graph, 'utf8');
}

// 6. people/page.js
edit('web/src/app/people/page.js', '  return (\n    <PeopleClient', '  return (\n    <>\n      <FallbackDisclaimer isFallback={pageData?._isFallback} />\n      <PeopleClient');
let ppl = fs.readFileSync('web/src/app/people/page.js', 'utf8');
if (ppl.includes('<FallbackDisclaimer') && !ppl.includes('    </>')) {
    ppl = ppl.replace('      />\n    );\n  } catch (error) {', '      />\n    </>\n    );\n  } catch (error) {');
    fs.writeFileSync('web/src/app/people/page.js', ppl, 'utf8');
}

