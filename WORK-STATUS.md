# 작업 현황 — 2026-08-03 기준

다음 세션에서 이 파일을 먼저 읽으면 맥락이 복원됩니다.

## 반드시 알아야 할 것

**배포는 `git push`로 되지 않습니다.** 이 Netlify 사이트는 GitHub과 연결되어 있지 않습니다.

```bash
netlify deploy --prod --dir=.        # 이게 실제 배포
curl -s -o /dev/null -w "%{http_code}" https://primeasset-realestate.co.kr/blog-post-22   # 배포 후 반드시 확인
```

- 사이트: `fantastic-bienenstitch-2646b8` / ID `0070f0f5-9c0b-4d4b-8d77-00aa8403e331`
- 로컬 폴더는 `netlify link` 로 이미 연결되어 있음 (`.netlify/` 존재)

## 완료된 것

- 블로그 22번 공개 (계약 보증금 함정) — SEO 강화 완료, 검색 노출 중
- 블로그 23~27번 예약 등록 (noindex 상태로 서버에 존재, 목록 비노출)
- `scripts/build-post.py` — 글 생성기
- `scripts/publish-scheduled.py` — 예약 발행 처리기
- `.github/workflows/scheduled-publish.yml` — 매일 00:00 KST 자동 실행
- 팝업(건강검진 이벤트) 비표시 처리
- sitemap.xml에 22번 추가, lastmod 갱신

## 예약 발행 일정

| 발행일 | 글 | 주제 | 이미지 |
|---|---|---|---|
| 8/10 | blog-post-23 | 입주청소 신축 vs 일반 건물 | 있음 |
| 8/17 | blog-post-24 | 첫 자취 불안감 심리 가이드 | 있음 |
| 8/24 | blog-post-25 | 퇴거 원상복구와 보증금 반환 | **없음** |
| 8/31 | blog-post-26 | 집 보러 갈 때 10분 하자 체크 | **없음** |
| 9/7 | blog-post-27 | 월세 세액공제와 관리비 절약 | **없음** |

이미지가 없으면 발행이 자동 보류됩니다(깨진 이미지 방지). 이미지를 넣으면 다음 날 자동 발행됩니다.

## 남은 할 일

1. **[사용자] Netlify 토큰을 GitHub Secret에 등록** — 이게 없으면 자동 발행이 배포 단계에서 실패
   - https://app.netlify.com/user/applications 에서 토큰 발급
   - https://github.com/tjrwo525/primeasset/settings/secrets/actions 에 `NETLIFY_AUTH_TOKEN` 으로 등록
2. **[사용자] GitHub 토큰 폐기·재발급** — `git remote -v` 에 `ghp_...` 가 노출되어 있음
3. **[사용자] 이미지 3장 제작** — 25·26·27번용 (파일명은 각 `content/post-NN.json` 의 `image` 항목 참조)
4. **[선택] Google Search Console 색인 요청** — blog-post-22 수집 앞당기기

## 새 글 예약하는 법

```bash
# 1. content/post-NN.json 명세 작성 (기존 파일 참고)
# 2. 생성
python scripts/build-post.py
# 3. 배포
netlify deploy --prod --dir=.
```

명세만 쓰면 메타태그·구조화데이터 4종·목차·관련글·NAP·CTA가 자동으로 붙습니다.
생성된 글은 항상 `noindex` 로 시작하고, `publish` 날짜가 되면 자동 공개됩니다.

## 발행 처리기 테스트

```bash
python scripts/publish-scheduled.py --dry-run                  # 현재 예약 현황
python scripts/publish-scheduled.py --dry-run --today 2026-08-10   # 특정 날짜 가정
```
