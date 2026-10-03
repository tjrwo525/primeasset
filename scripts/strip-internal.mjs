// 배포 폴더에서 내부 파일(작업 스크립트·메모·패키지 정보)을 지운다.
// Netlify 빌드 서버(/opt/build/)에서만 동작하고, 로컬에서 실행하면 아무것도 지우지 않는다.
// 사용법: node scripts/strip-internal.mjs <배포 폴더> [지울 폴더...]
import { existsSync, readdirSync, rmSync, statSync } from 'fs';
import { join } from 'path';

if (!process.cwd().startsWith('/opt/build/')) {
  console.log('strip-internal: Netlify 빌드 서버가 아니므로 건너뜀');
  process.exit(0);
}

const [publishDir = '.', ...dirs] = process.argv.slice(2);
for (const d of dirs) rmSync(join(publishDir, d), { recursive: true, force: true });

// 이름 기준으로 지울 파일 (대소문자 무시). llms.txt·robots.txt 같은 공개용 txt는 남긴다
// Netlify Functions가 있으면 함수 번들링이 package.json을 읽으므로 그때는 남긴다
const hasFunctions = existsSync('netlify/functions');
const internalFile = hasFunctions ? /\.(md|mdc|ps1|py|sh)$/i : /(\.(md|mdc|ps1|py|sh)$)|(^package(-lock)?\.json$)/i;
const skipDir = /^(node_modules|\.git|\.netlify|\.well-known)$/;
let removed = 0;
(function walk(dir) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) {
      if (!skipDir.test(name)) walk(p);
    } else if (internalFile.test(name)) {
      rmSync(p, { force: true });
      removed++;
    }
  }
})(publishDir);
console.log(`strip-internal: 폴더 ${dirs.length}개, 파일 ${removed}개 삭제`);
