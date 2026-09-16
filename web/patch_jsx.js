const fs = require('fs');

const fixJSX = (file, repStr) => {
    let text = fs.readFileSync(file, 'utf8');
    if (!text.includes('</>')) {
        text = text.replace(repStr, repStr + '\n    </>');
        fs.writeFileSync(file, text, 'utf8');
        console.log("Fixed " + file);
    }
}

fixJSX('web/src/app/engagement/page.js', '</Suspense>');
fixJSX('web/src/app/about/page.js', '</Suspense>');
fixJSX('web/src/app/people/page.js', '<PeopleClient pageData={pageData} />');
fixJSX('web/src/app/page.js', '      </main>');

const enc = fs.readFileSync('web/src/app/engagement/page.js', 'utf8');
fs.writeFileSync('web/src/app/engagement/page.js', enc.replace('isFallback={engagement._isFallback}', 'isFallback={pageData?._isFallback}'), 'utf8');

const p = fs.readFileSync('web/src/app/people/page.js', 'utf8');
fs.writeFileSync('web/src/app/people/page.js', p.replace('isFallback={people._isFallback}', 'isFallback={pageData?._isFallback}'), 'utf8');

