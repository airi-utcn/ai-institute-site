const fs = require('fs');

const fixJSX = (file, repStr, newStr) => {
    let text = fs.readFileSync(file, 'utf8');
    text = text.replace(repStr, newStr);
    fs.writeFileSync(file, text, 'utf8');
    console.log("Fixed " + file);
}

// 6. people/page.js
// Wait, people page error:
//  52 |     </>
//  53 |       <PeopleClient
// > 54 |         staff={staff}
let ppl = fs.readFileSync('web/src/app/people/page.js', 'utf8');
ppl = ppl.replace('    </>\n      <PeopleClient', '      <PeopleClient');
ppl = ppl.replace('      />\n    </>\n    );\n  } catch (error) {', '      />\n    </>\n  } catch (error) {');
fs.writeFileSync('web/src/app/people/page.js', ppl, 'utf8');

// page.js
let home = fs.readFileSync('web/src/app/page.js', 'utf8');
home = home.replace('      </main>\n    </>\n  );\n}', '      </main>\n    </>\n  );\n}');
fs.writeFileSync('web/src/app/page.js', home, 'utf8');

