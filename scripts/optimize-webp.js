/**
 * Site-wide WebP optimization:
 * 1. Generate .webp for raster images in assets/images
 * 2. Add imageWebp to blog-data.json
 * 3. Wrap <img> with <picture> where WebP exists
 * 4. Update CSS background-image with image-set()
 * 5. Update preload links to WebP
 */
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const ROOT = path.join(__dirname, '..');
const IMG_DIR = path.join(ROOT, 'assets', 'images');

const SKIP_CONVERT = new Set([
  'apple-touch-icon.png',
  'favicon.ico',
  'desktop.ini',
]);

const SKIP_CONVERT_PATTERN = /\.(jpg|jpeg|webp)\.(png|jpe?g|webp)$/i;

const SKIP_PICTURE_WRAP = [
  'apple-touch-icon',
  'favicon',
  'kakao_qr_code',
];

const CSS_BG_MAP = {
  'url(../images/slider-left-dec.jpg)': '../images/slider-left-dec.jpg',
  'url(../images/slider-right-dec.jpg)': '../images/slider-right-dec.jpg',
  'url(../images/services-left-dec.jpg)': '../images/services-left-dec.jpg',
  'url(../images/services-right-dec.jpg)': '../images/services-right-dec.jpg',
  'url(../images/quote-bg-v3.jpg)': '../images/quote-bg-v3.jpg',
  'url(../images/portfolio-right-dec.jpg)': '../images/portfolio-right-dec.jpg',
  'url(../images/portfolio-left-dec.jpg)': '../images/portfolio-left-dec.jpg',
  'url(../images/blog-left-dec.jpg)': '../images/blog-left-dec.jpg',
  'url(../images/footer-bg-v3.jpg)': '../images/footer-bg-v3.jpg',
  'url(../images/contact-top-right-v3.png)': '../images/contact-top-right.png',
  'url(../images/contact-bottom-right-v3.png)': '../images/contact-bottom-right.png',
};

function toWebpPath(filePath) {
  return filePath.replace(/\.(jpe?g|png)$/i, '.webp');
}

function mimeFor(ext) {
  return ext.toLowerCase() === '.png' ? 'image/png' : 'image/jpeg';
}

async function convertImages() {
  const files = fs.readdirSync(IMG_DIR);
  let converted = 0;
  for (const file of files) {
    if (SKIP_CONVERT.has(file)) continue;
    if (SKIP_CONVERT_PATTERN.test(file)) continue;
    if (!/\.(jpe?g|png)$/i.test(file)) continue;
    const src = path.join(IMG_DIR, file);
    const stat = fs.statSync(src);
    if (stat.size < 200) continue;
    const webp = path.join(IMG_DIR, toWebpPath(file));
    try {
      const meta = await sharp(src).metadata();
      const width = meta.width && meta.width > 1600 ? 1600 : meta.width;
      let pipeline = sharp(src).rotate();
      if (width && width < meta.width) {
        pipeline = pipeline.resize({ width, withoutEnlargement: true });
      }
      await pipeline.webp({ quality: 82 }).toFile(webp);
      converted++;
      console.log('webp:', file, '->', path.basename(webp));
    } catch (err) {
      console.warn('skip:', file, '-', err.message);
    }
  }
  return converted;
}

function updateBlogData() {
  const jsonPath = path.join(ROOT, 'blog-data.json');
  const data = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
  let updated = 0;
  for (const post of data.blogs) {
    if (!post.image) continue;
    const webp = toWebpPath(post.image);
    const full = path.join(ROOT, webp);
    if (fs.existsSync(full)) {
      post.imageWebp = webp;
      updated++;
    }
  }
  fs.writeFileSync(jsonPath, JSON.stringify(data, null, 2) + '\n', 'utf8');
  console.log('blog-data imageWebp entries:', updated);
}

function shouldSkipPicture(src) {
  return SKIP_PICTURE_WRAP.some((s) => src.includes(s));
}

function wrapImgTag(match, before, src, after, offset, full) {
  if (shouldSkipPicture(src)) return match;
  const webp = toWebpPath(src);
  if (!fs.existsSync(path.join(ROOT, webp))) return match;
  const lookback = full.slice(Math.max(0, offset - 120), offset);
  if (/<picture>\s*$/i.test(lookback) || /<source[^>]+srcset="/i.test(lookback)) {
    return match;
  }
  return `<picture><source srcset="${webp}" type="image/webp"><img ${before}src="${src}"${after}></picture>`;
}

function processHtmlFile(filePath) {
  let html = fs.readFileSync(filePath, 'utf8');
  let changed = false;

  // preload -> webp
  html = html.replace(
    /(<link[^>]+rel="preload"[^>]+as="image"[^>]+href=")(assets\/images\/[^"]+\.(?:jpe?g|png))(")/gi,
    (m, p1, src, p3) => {
      const webp = toWebpPath(src);
      if (!fs.existsSync(path.join(ROOT, webp))) return m;
      changed = true;
      return `${p1}${webp}${p3.replace('" type="image/jpeg"', '').replace('" type="image/png"', '')}" type="image/webp"`;
    }
  );

  // standalone img tags
  const imgRe = /<img\s+([^>]*?)src="(assets\/images\/[^"]+\.(?:jpe?g|png))"([^>]*)>/gi;
  html = html.replace(imgRe, (...args) => {
    const result = wrapImgTag(...args);
    if (result !== args[0]) changed = true;
    return result;
  });

  // JSON-LD single image string -> array with webp first
  html = html.replace(
    /"image":\s*"(https:\/\/primeasset-realestate\.co\.kr\/assets\/images\/[^"]+\.(?:jpe?g|png))"/g,
    (m, url) => {
      const rel = url.replace('https://primeasset-realestate.co.kr/', '');
      const webp = toWebpPath(rel);
      if (!fs.existsSync(path.join(ROOT, webp))) return m;
      changed = true;
      const webpUrl = url.replace(/\.(jpe?g|png)$/i, '.webp');
      return `"image": [\n        "${webpUrl}",\n        "${url}"\n      ]`;
    }
  );

  if (changed) {
    fs.writeFileSync(filePath, html, 'utf8');
    console.log('html:', path.relative(ROOT, filePath));
  }
}

function updateCss() {
  const cssPath = path.join(ROOT, 'assets', 'css', 'templatemo-digimedia-v3.css');
  let css = fs.readFileSync(cssPath, 'utf8');

  for (const [oldUrl, relPath] of Object.entries(CSS_BG_MAP)) {
    const webpRel = toWebpPath(relPath);
    const fullWebp = path.join(IMG_DIR, path.basename(webpRel));
    if (!fs.existsSync(fullWebp)) continue;
    const ext = path.extname(relPath);
    const imageSet = `background-image: url(${relPath});\n  background-image: image-set(url(${webpRel}) type("image/webp"), url(${relPath}) type("${mimeFor(ext)}"))`;
    if (css.includes(oldUrl)) {
      css = css.replace(`background-image: ${oldUrl};`, imageSet);
      console.log('css bg:', relPath);
    }
  }

  fs.writeFileSync(cssPath, css, 'utf8');
}

async function main() {
  const count = await convertImages();
  updateBlogData();
  updateCss();

  const htmlFiles = fs.readdirSync(ROOT)
    .filter((f) => f.endsWith('.html'))
    .map((f) => path.join(ROOT, f));
  for (const file of htmlFiles) processHtmlFile(file);

  console.log('done. converted:', count);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
