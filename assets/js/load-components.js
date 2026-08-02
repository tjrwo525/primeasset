/**
 * 동적 컴포넌트 로드 (Header, Footer)
 * custom.js보다 먼저 로드
 */
(function () {
    var NAV_CTA_HREF = '/assets/css/nav-cta.css';
    var SITE_FOOTER_HREF = '/assets/css/site-footer.css';

    function ensureStylesheet(href, dataAttr) {
        if (document.querySelector('link[' + dataAttr + ']')) return;
        var link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = href;
        link.setAttribute(dataAttr, 'true');
        document.head.appendChild(link);
    }

    function ensureNavCtaStyles() {
        ensureStylesheet(NAV_CTA_HREF, 'data-nav-cta');
    }

    function ensureSiteFooterStyles() {
        ensureStylesheet(SITE_FOOTER_HREF, 'data-site-footer');
    }

    function markActiveNav(root) {
        if (!root) return;
        var path = (location.pathname || '').replace(/^\//, '').replace(/\.html$/i, '');

        if (path === 'blog-list' || /^blog-post-\d+$/i.test(path)) {
            var blogLink = root.querySelector('.nav a[href="/blog-list"], .nav a[href="blog-list"]');
            if (blogLink) {
                root.querySelectorAll('.nav a.active').forEach(function (a) {
                    a.classList.remove('active');
                });
                blogLink.classList.add('active');
            }
        }

        if (path === 'recruit') {
            var recruitBtn = root.querySelector('a[data-nav="recruit"]');
            if (recruitBtn) recruitBtn.setAttribute('aria-current', 'page');
        }
    }

    function loadHeader() {
        var headerPlaceholder = document.getElementById('header-placeholder');
        if (!headerPlaceholder) return;

        ensureNavCtaStyles();

        fetch('/includes/header.html')
            .then(function (response) {
                if (!response.ok) throw new Error('header fetch failed');
                return response.text();
            })
            .then(function (html) {
                headerPlaceholder.innerHTML = html;
                markActiveNav(headerPlaceholder);

                setTimeout(function () {
                    if (typeof WOW !== 'undefined') {
                        new WOW().init();
                    }
                    var headerElement = headerPlaceholder.querySelector('.header-area');
                    if (headerElement && !headerElement.classList.contains('animated')) {
                        headerElement.classList.add('animated');
                    }
                }, 100);

                if (typeof initHeaderScroll === 'function') {
                    initHeaderScroll();
                }

                document.dispatchEvent(new CustomEvent('header:loaded', { bubbles: true }));
            })
            .catch(function (error) {
                console.error('헤더 로드 실패:', error);
            });
    }

    function loadFooter() {
        var footerPlaceholder = document.getElementById('footer-placeholder');
        if (!footerPlaceholder) return;

        ensureSiteFooterStyles();

        fetch('/includes/footer.html')
            .then(function (response) {
                if (!response.ok) throw new Error('footer fetch failed');
                return response.text();
            })
            .then(function (html) {
                footerPlaceholder.innerHTML = html;
            })
            .catch(function (error) {
                console.error('푸터 로드 실패:', error);
            });
    }

    function init() {
        loadHeader();
        loadFooter();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
