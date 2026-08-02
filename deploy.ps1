# primeasset-realestate.co.kr (fantastic-bienenstitch-2646b8)
# curious-choux-eb470e 등 다른 Netlify 사이트로 배포되지 않도록 site ID 고정
$SiteId = "0070f0f5-9c0b-4d4b-8d77-00aa8403e331"
node "$PSScriptRoot\scripts\restore-blog-schema.js"
node "$PSScriptRoot\scripts\fix-seo.js"
npx --yes netlify-cli deploy --prod --site $SiteId
