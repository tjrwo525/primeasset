#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
예약 발행된 블로그 글을 발행일이 되면 자동으로 공개한다.

동작 방식
  blog-post-*.html 중 아래 두 조건을 모두 만족하는 글을 찾는다.
    1) robots 메타가 noindex
    2) BlogPosting 스키마의 datePublished 가 오늘(KST) 이하
  찾은 글에 대해:
    - robots 를 "index, follow" 로 변경하고 예약 안내 주석을 제거
    - HTML 에서 메타데이터를 읽어 blog-data.json 에 항목 추가 (목록/메인 노출)
    - sitemap.xml 에 URL 추가

새 글을 예약하려면 HTML 을 만들 때 datePublished 를 미래 날짜로 두고
robots 를 noindex 로 두기만 하면 된다. 별도 등록 절차가 없다.

사용법
  python scripts/publish-scheduled.py            # 실제 반영
  python scripts/publish-scheduled.py --dry-run  # 미리보기만
  python scripts/publish-scheduled.py --today 2026-08-10   # 날짜 가정 테스트
"""

import argparse
import glob
import json
import os
import re
import sys
from datetime import date, datetime, timedelta, timezone

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SITE = "https://primeasset-realestate.co.kr"
KST = timezone(timedelta(hours=9))

# Windows 기본 콘솔(cp949)에서도 한글·기호가 깨지지 않도록 고정
for _s in (sys.stdout, sys.stderr):
    try:
        _s.reconfigure(encoding="utf-8")
    except (AttributeError, OSError):
        pass


def today_kst():
    return datetime.now(KST).date()


def find(pattern, text, label, path):
    m = re.search(pattern, text, re.S)
    if not m:
        raise ValueError(f"{os.path.basename(path)}: {label} 를 찾을 수 없습니다")
    return m.group(1).strip()


def read_post(path):
    """예약 글이면 메타데이터 dict, 아니면 None"""
    html = open(path, encoding="utf-8").read()

    robots = re.search(r'<meta\s+name="robots"\s+content="([^"]*)"', html)
    if not robots or "noindex" not in robots.group(1).lower():
        return None

    published = find(r'"datePublished":\s*"([0-9]{4}-[0-9]{2}-[0-9]{2})"',
                     html, "datePublished", path)

    slug = os.path.splitext(os.path.basename(path))[0]
    num = re.search(r"(\d+)$", slug)
    if not num:
        raise ValueError(f"{slug}: 파일명에서 글 번호를 읽을 수 없습니다")

    og_image = find(r'<meta\s+property="og:image"\s+content="([^"]+)"',
                    html, "og:image", path)
    image = og_image.replace(SITE + "/", "")

    webp = re.search(r'href="(assets/images/[^"]+\.webp)"', html)

    return {
        "path": path,
        "html": html,
        "slug": slug,
        "publish_on": date.fromisoformat(published),
        "entry": {
            "id": int(num.group(1)),
            "link": slug,
            "title": find(r'"headline":\s*"([^"]+)"', html, "headline", path),
            "category": find(r'<span class="category">([^<]+)</span>',
                             html, "category", path),
            "date": find(r'<span class="date">([^<]+)</span>', html, "date", path),
            "image": image,
            "imageWebp": webp.group(1) if webp else image.rsplit(".", 1)[0] + ".webp",
            "excerpt": find(r'<meta\s+name="description"\s+content="([^"]+)"',
                            html, "description", path),
            "content": find(r'<meta\s+name="description"\s+content="([^"]+)"',
                            html, "description", path),
        },
    }


def publish_html(post, dry):
    html = post["html"]
    html = re.sub(r'\s*<!--\s*예약 공개:.*?-->\n', "\n", html, flags=re.S)
    html = re.sub(r'(<meta\s+name="robots"\s+content=")[^"]*(")',
                  r"\1index, follow\2", html, count=1)
    if not dry:
        open(post["path"], "w", encoding="utf-8").write(html)


def add_to_blog_data(entries, dry):
    path = os.path.join(ROOT, "blog-data.json")
    data = json.load(open(path, encoding="utf-8"))
    existing = {b["id"] for b in data["blogs"]}
    added = [e for e in entries if e["id"] not in existing]
    if not added:
        return 0
    data["blogs"].extend(added)
    data["blogs"].sort(key=lambda b: b["id"], reverse=True)
    if not dry:
        with open(path, "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
            f.write("\n")
    return len(added)


def add_to_sitemap(posts, dry):
    path = os.path.join(ROOT, "sitemap.xml")
    xml = open(path, encoding="utf-8").read()
    anchor = "  <!-- 블로그 포스트 - 최신순 -->\n"
    if anchor not in xml:
        print("  ! sitemap 앵커 주석을 찾지 못해 건너뜁니다", file=sys.stderr)
        return 0
    blocks, n = "", 0
    for p in posts:
        loc = f"{SITE}/{p['slug']}"
        if loc in xml:
            continue
        blocks += (
            f"  <url>\n"
            f"    <loc>{loc}</loc>\n"
            f"    <lastmod>{p['publish_on']}</lastmod>\n"
            f"    <changefreq>monthly</changefreq>\n"
            f"    <priority>0.9</priority>\n"
            f"  </url>\n\n"
        )
        n += 1
    if n and not dry:
        open(path, "w", encoding="utf-8").write(xml.replace(anchor, anchor + blocks, 1))
    return n


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--dry-run", action="store_true", help="파일을 바꾸지 않고 결과만 출력")
    ap.add_argument("--today", help="오늘 날짜를 가정 (YYYY-MM-DD, 테스트용)")
    args = ap.parse_args()

    now = date.fromisoformat(args.today) if args.today else today_kst()
    print(f"기준일(KST): {now}{'  [DRY RUN]' if args.dry_run else ''}")

    scheduled, due = [], []
    for path in sorted(glob.glob(os.path.join(ROOT, "blog-post-*.html"))):
        post = read_post(path)
        if post:
            scheduled.append(post)
            if post["publish_on"] <= now:
                due.append(post)

    if not scheduled:
        print("예약 대기 중인 글이 없습니다.")
        return 0

    print(f"예약 대기 {len(scheduled)}건:")
    for p in scheduled:
        mark = "발행" if p in due else f"대기 (D-{(p['publish_on'] - now).days})"
        print(f"  [{mark}] {p['slug']}  {p['publish_on']}  {p['entry']['title'][:40]}")

    if not due:
        print("\n오늘 발행할 글이 없습니다.")
        return 0

    # 대표 이미지가 없으면 발행하지 않는다 (깨진 이미지로 공개되는 사고 방지)
    ready, blocked = [], []
    for p in due:
        missing = [f for f in (p["entry"]["image"], p["entry"]["imageWebp"])
                   if not os.path.exists(os.path.join(ROOT, f))]
        (blocked if missing else ready).append((p, missing))
    if blocked:
        print("\n[보류] 대표 이미지가 없어 발행하지 않습니다:")
        for p, missing in blocked:
            print(f"  - {p['slug']}: {', '.join(missing)}")
        print("  이미지를 추가하면 다음 실행에서 자동으로 발행됩니다.")
    due = [p for p, _ in ready]
    if not due:
        return 0

    print(f"\n{len(due)}건 발행 처리:")
    for p in due:
        publish_html(p, args.dry_run)
        print(f"  - {p['slug']}: robots → index, follow")

    n1 = add_to_blog_data([p["entry"] for p in due], args.dry_run)
    n2 = add_to_sitemap(due, args.dry_run)
    print(f"  - blog-data.json: {n1}건 추가")
    print(f"  - sitemap.xml: {n2}건 추가")

    # GitHub Actions 에 후속 단계(커밋/배포) 실행 여부를 알린다
    out = os.environ.get("GITHUB_OUTPUT")
    if out and not args.dry_run:
        with open(out, "a", encoding="utf-8") as f:
            f.write("published=true\n")
            f.write(f"slugs={','.join(p['slug'] for p in due)}\n")

    print("\n완료.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
