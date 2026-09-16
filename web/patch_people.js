const fs = require('fs');
let ppl = fs.readFileSync('web/src/app/people/page.js', 'utf8');
if (!ppl.includes('FallbackDisclaimer')) {
    ppl = 'import FallbackDisclaimer from "@/components/FallbackDisclaimer";\n' + ppl;
    ppl = ppl.replace('return (\n      <PeopleClient', 'return (\n    <>\n      <FallbackDisclaimer isFallback={pageData?._isFallback} />\n      <PeopleClient');
    ppl = ppl.replace('pageData={pageData}\n      />\n    );\n  } catch (error) {', 'pageData={pageData}\n      />\n    </>\n    );\n  } catch (error) {');
    fs.writeFileSync('web/src/app/people/page.js', ppl, 'utf8');
    console.log("Patched people");
}
