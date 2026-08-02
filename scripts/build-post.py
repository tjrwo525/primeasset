#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
블로그 글 생성기 — content/post-NN.json 명세를 읽어 blog-post-NN.html 을 만든다.

머리말(메타태그·구조화데이터·목차·관련글·NAP·CTA)은 이 파일 한 곳에서만 관리하므로
글마다 스키마가 빠지거나 어긋나는 사고가 생기지 않는다.
본문만 명세에 쓰면 나머지는 자동으로 붙는다.

생성된 글은 항상 noindex 로 시작한다. 발행일이 되면
scripts/publish-scheduled.py 가 자동으로 공개 상태로 바꾼다.

사용법
  python scripts/build-post.py                 # content/ 의 모든 명세 빌드
  python scripts/build-post.py content/post-25.json
"""

import glob
import json
import os
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SITE = "https://primeasset-realestate.co.kr"

for _s in (sys.stdout, sys.stderr):
    try:
        _s.reconfigure(encoding="utf-8")
    except (AttributeError, OSError):
        pass

BIZ_ADDRESS = {
    "@type": "PostalAddress",
    "streetAddress": "솔밭로 1 봉천빌딩 1층",
    "addressLocality": "관악구",
    "addressRegion": "서울특별시",
    "postalCode": "08779",
    "addressCountry": "KR",
}


def j(obj):
    return json.dumps(obj, ensure_ascii=False, indent=2)


def lines(v):
    """명세에서 본문은 문자열 또는 줄 배열 둘 다 허용한다 (배열이 읽기 편하다)"""
    return "\n".join(v) if isinstance(v, list) else v


def build(spec):
    spec = dict(spec, intro=lines(spec["intro"]), body=lines(spec["body"]))
    pid = spec["id"]
    url = f"{SITE}/blog-post-{pid}"
    img = f"{SITE}/{spec['image']}"
    img_webp = f"{SITE}/{spec['image_webp']}"

    blogposting = {
        "@context": "https://schema.org",
        "@type": "BlogPosting",
        "headline": spec["title"],
        "description": spec["description"],
        "image": [img_webp, img],
        "datePublished": spec["publish"],
        "dateModified": spec["publish"],
        "author": {"@type": "Organization", "name": "프라임에셋부동산", "url": SITE},
        "publisher": {
            "@type": "Organization",
            "name": "프라임에셋부동산",
            "logo": {"@type": "ImageObject", "url": f"{SITE}/assets/images/logo-v3.png"},
        },
        "mainEntityOfPage": {"@type": "WebPage", "@id": url},
        "keywords": spec["keywords"],
        "articleSection": spec["category"],
        "inLanguage": "ko-KR",
    }

    faq = {
        "@context": "https://schema.org",
        "@type": "FAQPage",
        "mainEntity": [
            {"@type": "Question", "name": q,
             "acceptedAnswer": {"@type": "Answer", "text": a}}
            for q, a in spec["faq"]
        ],
    }

    crumbs = {
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        "itemListElement": [
            {"@type": "ListItem", "position": 1, "name": "홈", "item": f"{SITE}/"},
            {"@type": "ListItem", "position": 2, "name": "블로그", "item": f"{SITE}/blog-list"},
            {"@type": "ListItem", "position": 3, "name": spec["breadcrumb"], "item": url},
        ],
    }

    agent = {
        "@context": "https://schema.org",
        "@type": "RealEstateAgent",
        "name": "프라임에셋부동산",
        "image": f"{SITE}/assets/images/logo-v3.png",
        "url": SITE,
        "telephone": "+82-10-8392-1072",
        "priceRange": "$$",
        "address": BIZ_ADDRESS,
        "areaServed": [
            {"@type": "Place", "name": "서울특별시 관악구 낙성대동"},
            {"@type": "Place", "name": "서울특별시 관악구 봉천동"},
            {"@type": "Place", "name": "서울특별시 관악구 신림동"},
        ],
        "openingHoursSpecification": [{
            "@type": "OpeningHoursSpecification",
            "dayOfWeek": ["Monday", "Tuesday", "Wednesday", "Thursday",
                          "Friday", "Saturday", "Sunday"],
            "opens": "10:00",
            "closes": "19:00",
        }],
    }

    toc = "\n".join(
        f'                                    <li><a href="#{a}" style="color:#2c2762;">{t}</a></li>'
        for a, t in spec["toc"]
    )
    related = "\n".join(
        f'                                <li><a href="{l}">{t}</a></li>'
        for l, t in spec["related"]
    )

    return f"""<!DOCTYPE html>
<html lang="ko">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{spec['title_tag']}</title>
    <meta name="description" content="{spec['description']}">
    <meta name="keywords" content="{spec['keywords']}">
    <meta name="author" content="프라임에셋부동산">
    <!-- 예약 공개: {spec['publish']} 발행일에 아래 줄이 index, follow 로 자동 변경됩니다 -->
    <meta name="robots" content="noindex, nofollow">
    <link rel="canonical" href="{url}">
    <link rel="alternate" hreflang="ko-KR" href="{url}">
    <link rel="preload" as="image" href="{spec['image_webp']}" type="image/webp">

    <meta property="og:title" content="{spec['title']}">
    <meta property="og:description" content="{spec['og_description']}">
    <meta property="og:image" content="{img}">
    <meta property="og:url" content="{url}">
    <meta property="og:type" content="article">
    <meta property="og:site_name" content="프라임에셋부동산">
    <meta property="og:locale" content="ko_KR">

    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:title" content="{spec['title_short']}">
    <meta name="twitter:description" content="{spec['og_description']}">
    <meta name="twitter:image" content="{img}">

    <script type="application/ld+json">
{j(blogposting)}
    </script>

    <script type="application/ld+json">
{j(faq)}
    </script>

    <script type="application/ld+json">
{j(crumbs)}
    </script>

    <script type="application/ld+json">
{j(agent)}
    </script>

    <meta name="geo.region" content="KR-11">
    <meta name="geo.placename" content="서울특별시 관악구 낙성대동">
    <meta name="geo.position" content="37.477078;126.963608">
    <meta name="ICBM" content="37.477078, 126.963608">

    <meta http-equiv="Content-Security-Policy" content="default-src 'self' https:; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://maps.googleapis.com https://maps.gstatic.com https://cdn.jsdelivr.net https://cdnjs.cloudflare.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://fonts.gstatic.com https://cdnjs.cloudflare.com; img-src 'self' data: https: blob:; font-src 'self' data: https://fonts.gstatic.com https://cdnjs.cloudflare.com; connect-src 'self' https: data: blob:; frame-src https://www.google.com;">

    <link rel="stylesheet" href="assets/css/templatemo-digimedia-v3.css">
    <link rel="stylesheet" href="/assets/css/nav-cta.css">
    <link rel="stylesheet" href="assets/css/animated.css">
    <link rel="stylesheet" href="assets/css/blog-post-style.css">
</head>
<body>
    <div class="page-wrapper">
        <div id="header-placeholder"></div>

        <div class="container">
            <div class="row">
                <div class="col-lg-8 offset-lg-2">
                    <article class="blog-post-article">
                        <div class="post-header">
                            <h1>{spec['title']}</h1>
                            <div class="post-meta">
                                <span class="date">{spec['date_ko']}</span>
                                <span class="category">{spec['category']}</span>
                            </div>
                            <picture><source srcset="{spec['image_webp']}" type="image/webp"><img src="{spec['image']}" alt="{spec['image_alt']}" loading="eager" fetchpriority="high" width="1200" height="630"></picture>
                        </div>

                        <div class="post-content">
{spec['intro']}

                            <nav style="background:#f0f2ff; border-left:4px solid #2c2762; border-radius:10px; padding:20px 25px; margin:30px 0;" aria-label="목차">
                                <strong style="color:#2c2762; font-size:17px; display:block; margin-bottom:12px;">이 글의 목차</strong>
                                <ol style="margin:0; padding-left:20px; line-height:2;">
{toc}
                                </ol>
                            </nav>

{spec['body']}

                            <h2>함께 읽으면 좋은 글</h2>
                            <ul>
{related}
                            </ul>

                            <h2>낙성대역 프라임에셋부동산 안내</h2>
                            <p>
                                <strong>프라임에셋부동산</strong><br>
                                주소: 서울특별시 관악구 솔밭로 1 봉천빌딩 1층 (<strong>낙성대역 5번 출구 도보 1분</strong>)<br>
                                영업시간: 매일 10:00 ~ 19:00<br>
                                취급: 관악구·낙성대동·봉천동·신림동 원룸 / 투룸 / 전세 / 월세 중개, 이사·입주청소·가전렌탈·인테리어 원스톱
                            </p>
                            <p>{spec['nap_line']} <a href="/">프라임에셋부동산 홈으로 가기</a> · <a href="blog-list">전체 블로그 보기</a></p>

                            <div style="text-align: center; margin-top: 40px; padding: 30px; background: #f0f2ff; border-radius: 15px;">
                                <h3 style="color: #2c2762; margin-bottom: 15px;">{spec['cta_title']}</h3>
                                <a href="http://pf.kakao.com/_ffcTX/chat" target="_blank" rel="noopener noreferrer" style="display: inline-block; background-color: #2c2762; color: #FFE812; padding: 15px 35px; border-radius: 25px; text-decoration: none; font-weight: 600; font-size: 16px;">카톡으로 상담 신청하기 →</a>
                            </div>
                        </div>
                    </article>
                </div>
            </div>
        </div>

        <div id="footer-placeholder"></div>
    </div>

    <script src="vendor/jquery/jquery.min.js"></script>
    <script src="vendor/bootstrap/js/bootstrap.bundle.min.js"></script>
    <script src="assets/js/load-components.js"></script>
    <script src="assets/js/custom.js"></script>
</body>
</html>
"""


def main():
    targets = sys.argv[1:] or sorted(glob.glob(os.path.join(ROOT, "content", "post-*.json")))
    if not targets:
        print("content/ 에 명세 파일이 없습니다.")
        return 1
    for path in targets:
        spec = json.load(open(path, encoding="utf-8"))
        out = os.path.join(ROOT, f"blog-post-{spec['id']}.html")
        open(out, "w", encoding="utf-8").write(build(spec))
        print(f"생성: blog-post-{spec['id']}.html  (발행 예정 {spec['publish']})  {spec['title'][:40]}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
