const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');
const IMG = path.join(ROOT, 'assets', 'images');
let fails = 0;

function check(rel) {
  const p = path.join(ROOT, rel.replace(/^\//, ''));
  if (!fs.existsSync(p)) {
    console.log('MISSING:', rel);
    fails++;
    return false;
  }
  return true;
}

const data = JSON.parse(fs.readFileSync(path.join(ROOT, 'blog-data.json'), 'utf8'));
for (const post of data.blogs) {
  if (!check(post.image)) continue;
  if (post.imageWebp && !check(post.imageWebp)) fails++;
}

const htmlFiles = fs.readdirSync(ROOT).filter((f) => f.endsWith('.html'));
const imgRe = /assets\/images\/[a-zA-Z0-9._-]+\.(?:jpe?g|png|webp)/g;
for (const file of htmlFiles) {
  const html = fs.readFileSync(path.join(ROOT, file), 'utf8');
  const refs = [...new Set(html.match(imgRe) || [])];
  for (const ref of refs) check(ref);
  if (html.includes('<picture><picture>')) {
    console.log('NESTED PICTURE:', file);
    fails++;
  }
}

const css = fs.readFileSync(path.join(ROOT, 'assets/css/templatemo-digimedia-v3.css'), 'utf8');
const cssRefs = [...css.matchAll(/\.\.\/images\/[a-zA-Z0-9._-]+\.(?:jpe?g|png|webp)/g)].map((m) => m[0]);
for (const ref of new Set(cssRefs)) {
  const rel = ref.replace('../', 'assets/');
  check(rel);
}

const webpCount = fs.readdirSync(IMG).filter((f) => f.endsWith('.webp')).length;
console.log('webp files:', webpCount);
console.log(fails ? 'AUDIT FAILED: ' + fails : 'AUDIT PASSED');
process.exit(fails ? 1 : 0);
