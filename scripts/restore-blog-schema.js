const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const SITE = 'https://primeasset-realestate.co.kr';
const CSP = `    <meta http-equiv="Content-Security-Policy" content="default-src 'self' https:; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://maps.googleapis.com https://maps.gstatic.com https://cdn.jsdelivr.net https://cdnjs.cloudflare.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://fonts.gstatic.com https://cdnjs.cloudflare.com; img-src 'self' data: https: blob:; font-src 'self' data: https://fonts.gstatic.com https://cdnjs.cloudflare.com; connect-src 'self' https: data: blob:; frame-src https://www.google.com;">`;

const blogData = JSON.parse(fs.readFileSync(path.join(ROOT, 'blog-data.json'), 'utf8'));
const byLink = Object.fromEntries(blogData.blogs.map((b) => [b.link, b]));

const dateMap = {
  'blog-post-01': { published: '2026-01-27', modified: '2026-02-19' },
  'blog-post-02': { published: '2026-01-29', modified: '2026-02-19' },
  'blog-post-03': { published: '2026-01-31', modified: '2026-02-19' },
  'blog-post-04': { published: '2026-02-02', modified: '2026-02-19' },
  'blog-post-05': { published: '2026-02-04', modified: '2026-02-19' },
  'blog-post-06': { published: '2026-02-06', modified: '2026-02-19' },
  'blog-post-07': { published: '2026-02-08', modified: '2026-02-19' },
  'blog-post-08': { published: '2026-02-10', modified: '2026-04-06' },
  'blog-post-09': { published: '2026-02-12', modified: '2026-02-19' },
  'blog-post-10': { published: '2026-02-14', modified: '2026-02-19' },
  'blog-post-11': { published: '2026-02-16', modified: '2026-02-19' },
};

function imageBase(imagePath) {
  return imagePath.replace(/\.(png|jpg|jpeg)$/i, '');
}

function buildSchema(post, slug) {
  const dates = dateMap[slug];
  const base = imageBase(post.image);
  const ext = post.image.match(/\.(png|jpg|jpeg)$/i)[0];
  const images = post.imageWebp
    ? [`${SITE}/${post.imageWebp}`, `${SITE}/${post.image}`]
    : [`${SITE}/${post.image}`];

  return `    <script type="application/ld+json">
    {
      "@context": "https://schema.org",
      "@type": "BlogPosting",
      "headline": ${JSON.stringify(post.title)},
      "description": ${JSON.stringify(post.excerpt)},
      "image": ${JSON.stringify(images)},
      "datePublished": "${dates.published}",
      "dateModified": "${dates.modified}",
      "author": {
        "@type": "Organization",
        "name": "프라임에셋부동산",
        "url": "${SITE}/"
      },
      "publisher": {
        "@type": "Organization",
        "name": "프라임에셋부동산",
        "logo": {
          "@type": "ImageObject",
          "url": "${SITE}/assets/images/logo-v3.png"
        }
      },
      "mainEntityOfPage": {
        "@type": "WebPage",
        "@id": "${SITE}/${slug}"
      }
    }
    </script>`;
}

const tail = `
${CSP}
    
    <link rel="stylesheet" href="assets/css/templatemo-digimedia-v3.css">
    <link rel="stylesheet" href="/assets/css/nav-cta.css">
    <link rel="stylesheet" href="assets/css/animated.css">
    <link rel="stylesheet" href="assets/css/blog-post-style.css">
</head>`;

for (let i = 1; i <= 11; i++) {
  const slug = `blog-post-${String(i).padStart(2, '0')}`;
  const file = path.join(ROOT, `${slug}.html`);
  const post = byLink[slug];
  if (!post || !fs.existsSync(file)) continue;

  let html = fs.readFileSync(file, 'utf8');
  if (html.includes('"@type": "BlogPosting"')) {
    console.log(`Skip ${slug} (schema exists)`);
    continue;
  }

  const schema = buildSchema(post, slug);
  html = html.replace(
    /    <!-- BlogPosting Schema -->\s*<\/head>/,
    `    <!-- BlogPosting Schema -->\n${schema}${tail}`
  );

  fs.writeFileSync(file, html);
  console.log(`Restored ${slug}`);
}
