const fs = require('fs');
let home = fs.readFileSync('web/src/app/page.js', 'utf8');
if (!home.includes('FallbackDisclaimer') && home.includes('return (')) {
    home = 'import FallbackDisclaimer from "@/components/FallbackDisclaimer";\n' + home;
    home = home.replace('return (\n    <main className=', 'return (\n    <>\n      <FallbackDisclaimer isFallback={home?._isFallback} />\n      <main className=');
    home = home.replace('      </main>\n  );\n}', '      </main>\n    </>\n  );\n}');
    fs.writeFileSync('web/src/app/page.js', home, 'utf8');
    console.log("Patched page.js manually");
}

let ppl = fs.readFileSync('web/src/app/people/page.js', 'utf8');
if (!ppl.includes('FallbackDisclaimer') && ppl.includes('return (\n    <PeopleClient')) {
    ppl = 'import FallbackDisclaimer from "@/components/FallbackDisclaimer";\n' + ppl;
    ppl = ppl.replace('return (\n    <PeopleClient', 'return (\n    <>\n      <FallbackDisclaimer isFallback={pageData?._isFallback} />\n      <PeopleClient');
    ppl = ppl.replace('      />\n    );\n  } catch (error) {', '      />\n    </>\n    );\n  } catch (error) {');
    fs.writeFileSync('web/src/app/people/page.js', ppl, 'utf8');
    console.log("Patched people/page.js manually");
}
