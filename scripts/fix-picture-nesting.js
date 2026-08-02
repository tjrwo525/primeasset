const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');

const nestedRe = /<picture>\s*<source srcset="([^"]+)" type="image\/webp">\s*<picture><source srcset="\1" type="image\/webp"><img ([^>]+)><\/picture>\s*<\/picture>/g;

for (const file of fs.readdirSync(ROOT).filter((f) => f.endsWith('.html'))) {
  const fp = path.join(ROOT, file);
  let html = fs.readFileSync(fp, 'utf8');
  const next = html.replace(nestedRe, '<picture><source srcset="$1" type="image/webp"><img $2></picture>');
  if (next !== html) {
    fs.writeFileSync(fp, next, 'utf8');
    console.log('fixed nesting:', file);
  }
}
