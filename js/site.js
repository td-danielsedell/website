"use strict";

$(document).ready(function () {

	if (!!$.prototype.simpleLightboxVideo) {
		$('.video').simpleLightboxVideo();
	}

	if (!!$.prototype.scrollUp) {
		$.scrollUp();
	}

	$(".email-obfuscated").each(function () {
		var $link = $(this);
		var user = $link.data("user");
		var domain = $link.data("domain");
		if (!user || !domain) {
			return;
		}
		var address = user + "@" + domain;
		var href = "mailto:" + address;
		var subject = $link.data("subject");
		if (subject) {
			href += "?subject=" + encodeURIComponent(subject);
		}
		$link.attr("href", href).text(address);
	});

	$("#nav-mobile").html($("#nav-main").html());

	$("nav#nav-mobile ul").prepend(
		$("<li>", { "class": "nav-panel-logo" }).append(
			$("<a>", { href: $("#logo a").attr("href") }).append(
				$("#navigation-logo").clone().removeAttr("id")
			)
		)
	);

	var $menuTrigger = $("#nav-trigger > span");
	var $menuList = $("nav#nav-mobile ul");

	$menuList.attr("id", "nav-mobile-list");

	$menuList.attr("tabindex", "-1");
	$menuTrigger.attr({
		"role": "button",
		"tabindex": "0",
		"aria-controls": "nav-mobile-list",
		"aria-expanded": "false",
		"aria-label": document.documentElement.lang === "en" ? "Menu" : "Meny"
	});

	function setMenu(open) {
		if (open) {
			$menuList.addClass("expanded").slideDown(250);
			$menuTrigger.addClass("open");
		} else {
			$menuList.filter(".expanded").removeClass("expanded").slideUp(250);
			$menuTrigger.removeClass("open");
		}
		$menuTrigger.attr("aria-expanded", open ? "true" : "false");
	}

	$menuTrigger.on("click", function () {
		setMenu(!$menuList.hasClass("expanded"));
	});

	$menuTrigger.on("keydown", function (event) {
		if (event.key === "Enter" || event.key === " " || event.key === "Spacebar") {

			event.preventDefault();
			setMenu(!$menuList.hasClass("expanded"));
		}
	});

	$(document).on("keydown", function (event) {
		if (event.key === "Escape" && $menuList.hasClass("expanded")) {
			setMenu(false);
			$menuTrigger.trigger("focus");
		}
	});

	$("#nav-mobile .nav-group summary a").removeAttr("href");

	$("#nav-mobile ul a").not(".nav-group summary a").on("click",function() {
		if ($menuList.hasClass("expanded")) {

			setMenu(false);
		}
	});

	$("#nav-main")
		.on("mouseenter", ".nav-group", function () {
			$(this).children("details").prop("open", true);
		})
		.on("mouseleave", ".nav-group", function () {
			$(this).children("details").prop("open", false);
		});

	$('#header').find('li a').each(function () {
		var href = $(this).attr('href');
		if (!href || href.charAt(0) !== '#') {
			$(this).on('click', function (e) {
				e.stopImmediatePropagation();
			});
		}
	});

	if (!!$.prototype.stickyNavbar) {
		$('#header').stickyNavbar({ animateCSS: false });
	}

	$(document).on('click', 'a[data-scroll-to]', function (e) {
		var hash = $(this).attr('href') || '';
		if (hash.charAt(0) !== '#' || hash.length < 2) {
			return;
		}

		var target = document.getElementById(hash.slice(1));
		if (!target) {
			return;
		}

		e.preventDefault();

		var top = Math.max(0, Math.round(
			$(target).offset().top - $('#header').outerHeight()
		));

		if (window.matchMedia
			&& window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
			window.scrollTo(0, top);
			return;
		}

		$('html, body').stop().animate(
			{ scrollTop: top },
			{ duration: 750, easing: 'swing' }
		);

	});

	var $cues = $('.scroll-cue');
	if ($cues.length) {
		var spent = false;

		var syncCues = function () {
			var top = $(window).scrollTop();

			if (!spent && top > 60) {
				spent = true;
			} else if (spent && top < 16) {
				spent = false;
			} else {
				return;
			}

			$cues.toggleClass('is-spent', spent);
		};

		$(window).on('scroll.scrollCue resize.scrollCue', syncCues);
		syncCues();
	}

	var $content = $('#content');

	var banner = document.getElementById('home');
	var landing = location.hash.length > 1 && document.getElementById(location.hash.slice(1));
	var canReveal = !!banner && (!landing || landing === banner);

	$content.waypoint(function (direction) {
		if (direction === 'down') {
			$('#header').addClass('nav-solid');
			if (canReveal) {
				$('#header').addClass('animated fadeInDown');
			}
		}
		else {

			canReveal = true;
			$('#header').removeClass('nav-solid animated fadeInDown');
		}
	});

	function syncActiveNavItem() {
		var $sections = $('.scrollto');
		if (!$sections.length) {
			return;
		}

		var $window = $(window);
		var headerHeight = $('#header').outerHeight(true);
		var scrollTop = $window.scrollTop();
		var current = null;

		$sections.each(function () {

			if (scrollTop >= $(this).offset().top - headerHeight - 2) {
				current = this.id;
			}
		});

		if (scrollTop + $window.height() >= $(document).height() - 2) {
			current = $sections.last().attr('id');
		}

		var $header = $('#header');
		$header.find('li a').removeClass('active');
		if (current) {
			$header.find('li a[href~="#' + current + '"]').addClass('active');
		}

		var $current = $header.find('li a[aria-current="page"]');
		$current.addClass('active');

		$current.closest('.nav-group').find('summary a').addClass('active');
	}

	$(window).on('scroll resize load', syncActiveNavItem);
	syncActiveNavItem();

	var anchor = null;
	var anchorWidth = window.innerWidth;
	var resizePending = false;

	function captureAnchor() {

		if (resizePending || window.innerWidth !== anchorWidth) {
			return;
		}

		var y = window.pageYOffset;
		var edge = y + $('#header').outerHeight(true);
		var found = null;

		$('.scrollto').each(function () {
			var top = $(this).offset().top;
			if (top <= edge + 2) {
				found = { id: this.id, top: top, height: $(this).outerHeight() || 1, y: y };
			}
		});

		anchor = found;
	}

	function restoreAnchor() {
		var $section = anchor && $('#' + anchor.id);
		if (!$section || !$section.length) {
			return;
		}

		var top = $section.offset().top;
		var y = window.pageYOffset;

		if (Math.abs((top - anchor.top) - (y - anchor.y)) <= 8) {
			return;
		}

		var into = (anchor.y - anchor.top) * (($section.outerHeight() || 1) / anchor.height);
		window.scrollTo(0, Math.max(0, Math.round(top + into)));
	}

	$(window).on('resize', function () {

		if (window.innerWidth === anchorWidth) {
			captureAnchor();
			return;
		}

		anchorWidth = window.innerWidth;

		if (resizePending) {
			return;
		}
		resizePending = true;
		requestAnimationFrame(function () {
			resizePending = false;
			restoreAnchor();
			captureAnchor();
		});
	});

	$(window).on('scroll load', captureAnchor);
	captureAnchor();

	if (typeof WOW == 'function') {
		new WOW().init();
	}

	if (!!$.prototype.enllax) {
		$(window).enllax();
	}

	(function () {
		var hero = document.getElementById('home');
		if (!hero || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
			return;
		}
		var ratio = 0.5;
		var ticking = false;
		function update() {
			ticking = false;
			hero.style.setProperty('--hero-shift', (window.pageYOffset * ratio).toFixed(1) + 'px');
		}
		window.addEventListener('scroll', function () {
			if (!ticking) {
				ticking = true;
				requestAnimationFrame(update);
			}
		}, { passive: true });
		update();
	})();

});
