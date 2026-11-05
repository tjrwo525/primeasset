// sitemap.xml을 blog-data.json(공개 글 목록)과 각 글 HTML에서 다시 만든다.
// 글을 손으로 추가하고 사이트맵을 빠뜨리는 일(35번 글)이 다시 생기지 않도록,
// 예약 공개 워크플로와 Netlify 빌드에서 매번 실행한다.
//
// - 글: blog-data.json에 있고, HTML이 있고, robots가 noindex가 아닌 것만 넣는다.
// - 글 lastmod: BlogPosting의 dateModified(없으면 datePublished).
// - 고정 페이지 lastmod: 그 페이지 JSON-LD의 dateModified, 기존 sitemap 값 중 늦은 것. 홈·블로그 목록은 최신 글 날짜까지 올린다.
// 사용법: node scripts/build-sitemap.mjs [--check]   (--check: 파일을 쓰지 않고 달라질지만 알려 줌, 다르면 종료 코드 1)
import { existsSync, readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const SITE = 'https://primeasset-realestate.co.kr';
const check = process.argv.includes('--check');

const read = (f) => readFileSync(join(ROOT, f), 'utf8');
const sitemapPath = join(ROOT, 'sitemap.xml');
const oldXml = existsSync(sitemapPath) ? readFileSync(sitemapPath, 'utf8') : '';
const oldLastmod = new Map(
  [...oldXml.matchAll(/<loc>([^<]+)<\/loc>\s*<lastmod>([^<]+)<\/lastmod>/g)].map((m) => [m[1], m[2]])
);
const maxDate = (...ds) => ds.filter(Boolean).sort().at(-1);

function postLastmod(html) {
  const mod = html.match(/"dateModified":\s*"(\d{4}-\d{2}-\d{2})/);
  const pub = html.match(/"datePublished":\s*"(\d{4}-\d{2}-\d{2})/);
  return (mod || pub || [])[1];
}

const { blogs } = JSON.parse(read('blog-data.json'));
const posts = [];
for (const post of blogs) {
  const file = `${post.link}.html`;
  if (!existsSync(join(ROOT, file))) {
    console.warn(`build-sitemap: ${file} 없음 — 사이트맵에서 뺌`);
    continue;
  }
  const html = read(file);
  const robots = html.match(/<meta\s+name="robots"\s+content="([^"]*)"/i);
  if (robots && /noindex/i.test(robots[1])) {
    console.warn(`build-sitemap: ${file} noindex(예약 글) — 사이트맵에서 뺌`);
    continue;
  }
  const loc = `${SITE}/${post.link}`;
  const lastmod = postLastmod(html) || oldLastmod.get(loc);
  if (!lastmod) console.warn(`build-sitemap: ${file} 날짜를 못 찾음 — lastmod 없이 넣음`);
  posts.push({ id: post.id, loc, lastmod });
}
posts.sort((a, b) => b.id - a.id);

const latestPost = maxDate(...posts.map((p) => p.lastmod));
// 고정 페이지는 자기 JSON-LD의 dateModified를 쓰고(페이지를 고치면 그 값을 올린다), 기존 값보다 내려가지 않게 한다
const pageModified = (file) => (existsSync(join(ROOT, file)) ? postLastmod(read(file)) : undefined);
const pages = [
  { comment: '메인 페이지', file: 'index.html', loc: `${SITE}/`, withPosts: true, changefreq: 'weekly', priority: '1.0' },
  { comment: '블로그 목록 페이지', file: 'blog-list.html', loc: `${SITE}/blog-list`, withPosts: true, changefreq: 'weekly', priority: '0.8' },
  { comment: '채용 랜딩', file: 'recruit.html', loc: `${SITE}/recruit`, withPosts: false, changefreq: 'monthly', priority: '0.7' },
].map((p) => ({
  ...p,
  lastmod: maxDate(oldLastmod.get(p.loc), pageModified(p.file), p.withPosts ? latestPost : undefined),
}));

const urlBlock = ({ loc, lastmod, changefreq, priority }) =>
  [
    '  <url>',
    `    <loc>${loc}</loc>`,
    lastmod ? `    <lastmod>${lastmod}</lastmod>` : null,
    `    <changefreq>${changefreq}</changefreq>`,
    `    <priority>${priority}</priority>`,
    '  </url>',
  ]
    .filter(Boolean)
    .join('\n');

// 「블로그 포스트 - 최신순」 주석은 publish-scheduled.py가 새 글을 끼워 넣는 기준점이라 유지한다
const xml = [
  '<?xml version="1.0" encoding="UTF-8"?>',
  '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
  '',
  ...pages.flatMap((p) => [`  <!-- ${p.comment} -->`, urlBlock(p), '']),
  '  <!-- 블로그 포스트 - 최신순 -->',
  ...posts.flatMap((p) => [urlBlock({ ...p, changefreq: 'monthly', priority: '0.8' }), '']),
  '</urlset>',
  '',
].join('\n');

if (check) {
  if (xml !== oldXml) {
    console.error('build-sitemap: sitemap.xml이 최신이 아닙니다. node scripts/build-sitemap.mjs 를 실행하세요.');
    process.exit(1);
  }
  console.log(`build-sitemap: 최신 상태 (고정 ${pages.length} + 글 ${posts.length})`);
} else {
  writeFileSync(sitemapPath, xml);
  console.log(`build-sitemap: sitemap.xml 작성 (고정 ${pages.length} + 글 ${posts.length})`);
}
