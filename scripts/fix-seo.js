const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const SITE = 'https://primeasset-realestate.co.kr';

const blogData = JSON.parse(fs.readFileSync(path.join(ROOT, 'blog-data.json'), 'utf8'));

for (let i = 1; i <= 12; i++) {
  const num = String(i).padStart(2, '0');
  const slug = `blog-post-${num}`;
  const file = path.join(ROOT, `${slug}.html`);
  if (!fs.existsSync(file)) continue;

  let html = fs.readFileSync(file, 'utf8');
  const ogUrl = `    <meta property="og:url" content="${SITE}/${slug}">`;

  if (!html.includes('property="og:url"')) {
    html = html.replace(
      /(<meta property="og:type" content="article">)/,
      `$1\n${ogUrl}`
    );
  }

  // 중복·잘못된 두 번째 BlogPosting 스키마만 제거（index.html 참조）
  const duplicatePattern = /\n    <script type="application\/ld\+json">\s*\{\s*"@context": "https:\/\/schema\.org",\s*"@type": "BlogPosting",[\s\S]*?"url": "index\.html"[\s\S]*?\}\s*<\/script>/;
  html = html.replace(duplicatePattern, '');

  fs.writeFileSync(file, html);
  console.log(`Processed ${slug}`);
}

const itemList = {
  '@context': 'https://schema.org',
  '@type': 'ItemList',
  name: '프라임에셋부동산 블로그 글 목록',
  url: `${SITE}/blog-list`,
  numberOfItems: blogData.blogs.length,
  itemListElement: blogData.blogs.map((post, index) => ({
    '@type': 'ListItem',
    position: index + 1,
    url: `${SITE}/${post.link}`,
    name: post.title,
  })),
};

const staticLinks = blogData.blogs
  .map(
    (post) =>
      `        <li><a href="/${post.link}">${post.title.replace(/&/g, '&amp;')}</a></li>`
  )
  .join('\n');

const blogListPath = path.join(ROOT, 'blog-list.html');
let blogList = fs.readFileSync(blogListPath, 'utf8');

const itemListScript = `  <script type="application/ld+json">\n${JSON.stringify(itemList, null, 4)
  .split('\n')
  .map((line, i) => (i === 0 ? line : '    ' + line))
  .join('\n')}\n  </script>`;

const seoNav = `      <!-- 크롤러용 정적 링크 (JS 없이도 전체 글 발견 가능) -->
      <nav class="seo-blog-index" aria-label="전체 블로그 글 목록">
        <ul>
${staticLinks}
        </ul>
      </nav>
`;

if (blogList.includes('"@type": "ItemList"')) {
  blogList = blogList.replace(
    /  <script type="application\/ld\+json">\s*\{\s*"@context": "https:\/\/schema\.org",\s*"@type": "ItemList"[\s\S]*?<\/script>/,
    itemListScript
  );
} else {
  blogList = blogList.replace(
    /(\s*<!-- Schema\.org JSON-LD for Blog -->[\s\S]*?<\/script>)/,
    `$1\n\n${itemListScript}`
  );
}

if (blogList.includes('seo-blog-index')) {
  blogList = blogList.replace(
    /      <!-- 크롤러용 정적 링크[\s\S]*?      <\/nav>\n/,
    `${seoNav}\n`
  );
} else {
  blogList = blogList.replace(/(\s*<!-- Blog Posts Grid -->)/, `\n${seoNav}$1`);
}

blogList = blogList.replace(
  /"url": "https:\/\/primeasset-realestate\.co\.kr"(?!\/)/g,
  '"url": "https://primeasset-realestate.co.kr/"'
);

fs.writeFileSync(blogListPath, blogList);
console.log('Updated blog-list.html');
