(function ($) {
	
	"use strict";

	// Header Type = Fixed
  $(window).scroll(function() {
    var scroll = $(window).scrollTop();
    var box = $('.header-text').height();
    var header = $('header').height();

    if (scroll >= box - header) {
      $("header").addClass("background-header");
    } else {
      $("header").removeClass("background-header");
    }
  });


	$('.loop').owlCarousel({
      center: true,
      items:1,
      loop:true,
      autoplay: true,
      nav: true,
      margin:0,
      responsive:{ 
          1200:{
              items:5
          },
          992:{
              items:3
          },
          760:{
            items:2
        }
      }
  });

	// Reviews 無限スクロール：カードを複製してシームレスループを実現
	var $track = $('.reviews-marquee-track');
	if ($track.length) {
		var $cards = $track.children().clone();
		$track.append($cards);
	}
	

	// Menu Dropdown Toggle - Event Delegation 사용 (동적 요소 지원)
  $(document).on('click', '.menu-trigger', function(e) { 
    e.preventDefault();
    e.stopPropagation();
    $(this).toggleClass('active');
    $('.header-area .nav').slideToggle(200);
  });


  var HOME_SECTION_HASHES = ['#top', '#about', '#services', '#reviews', '#contact-section', '#blog'];
  var HOME_SCROLL_KEY = 'primeassetHomeScroll';

  function isHomePage() {
    var path = (location.pathname || '').replace(/^\//, '').replace(/\.html$/i, '');
    return !path || path === 'index';
  }

  function parseHomeSectionHash(href) {
    if (!href) return null;

    var hash = null;
    var pointsToHome = false;

    if (href.charAt(0) === '#') {
      hash = href.split('?')[0];
      pointsToHome = true;
    } else {
      try {
        var url = new URL(href, location.origin);
        if (url.origin !== location.origin) return null;
        hash = url.hash;
        var path = url.pathname.replace(/^\//, '').replace(/\.html$/i, '');
        pointsToHome = !path || path === 'index';
      } catch (err) {
        return null;
      }
    }

    if (!hash || HOME_SECTION_HASHES.indexOf(hash) === -1) return null;
    if (!pointsToHome && href.charAt(0) !== '#') return null;
    return hash;
  }

  function closeMobileNav() {
    if (window.innerWidth < 991) {
      $('.menu-trigger').removeClass('active');
      $('.header-area .nav').slideUp(200);
    }
  }

  function scrollToSection(hash, duration) {
    if (!hash) return false;
    var target = $(hash);
    target = target.length ? target : $('[name=' + hash.slice(1) + ']');
    if (!target.length) return false;

    $('html, body').stop().animate({
      scrollTop: target.offset().top + 1
    }, duration || 600, 'swing');
    return true;
  }

  function updateHomeHash(hash) {
    if (!hash || !history.replaceState) return;
    history.replaceState(null, '', hash);
  }

  function navigateToHomeSection(hash) {
    if (!hash) return;
    try {
      sessionStorage.setItem(HOME_SCROLL_KEY, hash);
    } catch (err) {
      /* ignore */
    }
    window.location.href = '/';
  }

  function applyPendingHomeScroll() {
    if (!isHomePage()) return;

    var hash = null;
    try {
      hash = sessionStorage.getItem(HOME_SCROLL_KEY);
      if (hash) sessionStorage.removeItem(HOME_SCROLL_KEY);
    } catch (err) {
      /* ignore */
    }

    if (hash) {
      if (history.replaceState) {
        history.replaceState(null, '', location.pathname + location.search);
      }
      setTimeout(function () {
        scrollToSection(hash, 0);
        updateHomeHash(hash);
      }, 50);
      return;
    }

    if (location.hash && HOME_SECTION_HASHES.indexOf(location.hash) !== -1) {
      var initialHash = location.hash;
      if (history.replaceState) {
        history.replaceState(null, '', location.pathname + location.search);
      }
      setTimeout(function () {
        scrollToSection(initialHash, 0);
        updateHomeHash(initialHash);
      }, 50);
    }
  }

  // 메인 섹션 링크: 같은 페이지면 스크롤만, 다른 페이지면 1회 이동 후 스크롤
  $(document).on('click', 'a', function (e) {
    var href = this.getAttribute('href');
    var hash = parseHomeSectionHash(href);
    if (!hash) return;

    e.preventDefault();
    closeMobileNav();

    if (isHomePage()) {
      scrollToSection(hash, 600);
      updateHomeHash(hash);
      $('.scroll-to-section a').removeClass('active');
      $(this).addClass('active');
      return false;
    }

    navigateToHomeSection(hash);
    return false;
  });

  $(document).ready(function () {
    $(document).on('scroll', onScroll);
    applyPendingHomeScroll();
  });

  function onScroll() {
    if (!isHomePage()) return;

    var scrollPos = $(document).scrollTop() + 120;
    var currentHash = null;

    HOME_SECTION_HASHES.forEach(function (hash) {
      var refElement = $(hash);
      if (!refElement.length) return;
      var top = refElement.offset().top;
      var bottom = top + refElement.outerHeight();
      if (top <= scrollPos && bottom > scrollPos) {
        currentHash = hash;
      }
    });

    $('.nav a').each(function () {
      var currLink = $(this);
      var linkHash = parseHomeSectionHash(currLink.attr('href'));
      if (linkHash && linkHash === currentHash) {
        currLink.addClass('active');
      } else if (linkHash) {
        currLink.removeClass('active');
      }
    });
  }


  // Acc
  $(document).on("click", ".naccs .menu div", function() {
    var numberIndex = $(this).index();

    if (!$(this).is("active")) {
        $(".naccs .menu div").removeClass("active");
        $(".naccs ul li").removeClass("active");

        $(this).addClass("active");
        $(".naccs ul").find("li:eq(" + numberIndex + ")").addClass("active");

        var listItemHeight = $(".naccs ul")
          .find("li:eq(" + numberIndex + ")")
          .innerHeight();
        $(".naccs ul").height(listItemHeight + "px");
      }
  });


	// Page loading animation
	 $(window).on('load', function() {

        $('#js-preloader').addClass('loaded');

    });

	

	// Window Resize Mobile Menu Fix
  function mobileNav() {
    var width = $(window).width();
    $('.submenu').on('click', function() {
      if(width < 767) {
        $('.submenu ul').removeClass('active');
        $(this).find('ul').toggleClass('active');
      }
    });
  }

  // Web3Forms AJAX 제출 처리 - Contact 폼
  var contactForm = document.getElementById('contact');
  if (contactForm) {
    contactForm.addEventListener('submit', function(e) {
      e.preventDefault();
    
    var form = this;
    
    // 제출 버튼을 비활성화 (중복 제출 방지)
    var submitBtn = form.querySelector('button[type="submit"]');
    var originalText = submitBtn.textContent;
    submitBtn.disabled = true;
    submitBtn.textContent = '전송 중...';
    
    // FormData 생성
    var formData = new FormData(form);
    
    // AJAX로 폼 제출
    fetch('https://api.web3forms.com/submit', {
      method: 'POST',
      body: formData
    })
    .then(response => response.json())
    .then(data => {
      if (data.success) {
        // 성공 메시지 표시
        var messageDiv = document.getElementById('form-message');
        if (messageDiv) {
          messageDiv.innerHTML = '<div style="background-color: #d4edda; color: #155724; padding: 15px; border-radius: 5px; margin-bottom: 20px; text-align: center; font-weight: 500;">✓ 문의가 접수되었습니다!<br>담당자가 되도록 빠른 연락 드리겠습니다. 감사합니다.</div>';
        }
        
        // 폼 초기화
        form.reset();
        
        // 5초 후 메시지 사라짐
        setTimeout(function() {
          if (messageDiv) {
            messageDiv.innerHTML = '';
          }
        }, 5000);
      } else {
        // 실패 메시지
        var messageDiv = document.getElementById('form-message');
        if (messageDiv) {
          messageDiv.innerHTML = '<div style="background-color: #f8d7da; color: #721c24; padding: 15px; border-radius: 5px; margin-bottom: 20px; text-align: center;">✗ 전송 실패. 다시 시도해주세요.</div>';
        }
      }
    })
    .catch(error => {
      console.error('폼 전송 오류:', error);
      var messageDiv = document.getElementById('form-message');
      if (messageDiv) {
        messageDiv.innerHTML = '<div style="background-color: #f8d7da; color: #721c24; padding: 15px; border-radius: 5px; margin-bottom: 20px; text-align: center;">✗ 오류가 발생했습니다.</div>';
      }
    })
    .finally(() => {
      // 제출 버튼 다시 활성화
      submitBtn.disabled = false;
      submitBtn.textContent = originalText;
    });
  });
}

})(window.jQuery);