"use strict";

$(document).ready(function () {
	/* Video Lightbox */
	if (!!$.prototype.simpleLightboxVideo) {
		$('.video').simpleLightboxVideo();
	}

	/*ScrollUp*/
	if (!!$.prototype.scrollUp) {
		$.scrollUp();
	}

	/*Responsive Navigation*/
	$("#nav-mobile").html($("#nav-main").html());
	$("#nav-trigger > span").on("click",function() {
		if ($("nav#nav-mobile ul").hasClass("expanded")) {
			$("nav#nav-mobile ul.expanded").removeClass("expanded").slideUp(250);
			$(this).removeClass("open");
		} else {
			$("nav#nav-mobile ul").addClass("expanded").slideDown(250);
			$(this).addClass("open");
		}
	});

	/* A group's label is a link to its section on the index page, which is what
	   the wide nav wants. There is no hover on a touch screen, so here the label
	   has to open the group instead.

	   The href is removed rather than the click cancelled: preventDefault would
	   take the summary's own toggle with it — following the link and opening the
	   group are the same event's default action — leaving a label that does
	   nothing at all. Without an href the anchor is inert and the toggle runs. */
	$("#nav-mobile .nav-group summary a").removeAttr("href");

	/* ...which also means it must not close the menu it just opened. */
	$("#nav-mobile ul a").not(".nav-group summary a").on("click",function() {
		if ($("nav#nav-mobile ul").hasClass("expanded")) {
			$("nav#nav-mobile ul.expanded").removeClass("expanded").slideUp(250);
			$("#nav-trigger > span").removeClass("open");
		}
	});

	/* Menu groups open on hover in the wide nav. <details> has no CSS hook for
	   hovering, so the open attribute is set here.

	   No breakpoint check is needed: #nav-main is display:none below 1024px and
	   the narrow menu is a separate clone in #nav-mobile, so these handlers are
	   wide-screen-only by construction. The clone keeps the native
	   click-to-toggle accordion, which is what a touch screen needs. */
	$("#nav-main")
		.on("mouseenter", ".nav-group", function () {
			$(this).children("details").prop("open", true);
		})
		.on("mouseleave", ".nav-group", function () {
			$(this).children("details").prop("open", false);
		});

	/* Clicking the label is deliberately left alone here. The <a> inside the
	   summary follows its href — smooth-scrolled by stickyNavbar on the index
	   page, a plain navigation from a subpage — and the summary's own toggle
	   closes the panel on the way out, which is what you want after using it.
	   Moving the pointer back over the item reopens it. */

	/* Hand the page-to-page nav links back to the browser.

	   stickyNavbar lets a click through only when the href starts with http,
	   mailto: or a slash; everything else it cancels and reads as the id of a
	   section to scroll to. The links between pages are relative so that the
	   site works wherever it is mounted — at the root on totaldigital.se, under
	   /website/ on the GitHub Pages preview — and that puts them on the wrong
	   side of the plugin's test, where they would be cancelled and mistaken for
	   anchors on the current page.

	   Stopping the click before the plugin's own handler sees it leaves the
	   default action intact, so the browser navigates: an ordinary click
	   follows the link, and cmd- or middle-click still opens a new tab. A
	   scripted location change would have taken that away.

	   Bound here, between the handlers above and the plugin below, because
	   jQuery runs handlers on an element in the order they were bound: late
	   enough that the menu-close handler still fires, early enough to win
	   against stickyNavbar. Links with no href are stopped too — the group
	   labels in the narrow menu had theirs removed above, and the plugin reads
	   the attribute without checking that it exists.

	   Same-page anchors are left alone; smooth-scrolling them is the plugin's
	   whole job. */
	$('#header').find('li a').each(function () {
		var href = $(this).attr('href');
		if (!href || href.charAt(0) !== '#') {
			$(this).on('click', function (e) {
				e.stopImmediatePropagation();
			});
		}
	});

	/* Sticky Navigation.

	   animateCSS off: the plugin otherwise puts "fadeIn animated" on the header
	   every time it becomes sticky and strips it again near the top of the page,
	   so the whole header replays its entrance on every scroll back down. */
	if (!!$.prototype.stickyNavbar) {
		$('#header').stickyNavbar({ animateCSS: false });
	}

	/* Scroll cues in the page body.

	   stickyNavbar is what smooth-scrolls same-page anchors on this site, but it
	   only sees the links inside the nav it is bound to — an anchor in the page
	   body jumps. Anything marked data-scroll-to gets the same travel instead:
	   750ms and swing are the plugin's own defaults, so a cue click and a nav
	   click feel identical.

	   jQuery.animate rather than scrollTo({ behavior: "smooth" }): style.css
	   puts overflow-x: hidden on <body>, which makes body its own scrolling box,
	   and Chrome then drops a native smooth scroll on the way — measured on the
	   TD Test hero, the page came to rest back at 0 while the same call with
	   behavior "instant" landed correctly. jQuery sets scrollTop frame by frame
	   and is unaffected.

	   Delegated, so it does not care when the markup appears or how many cues
	   there are. */
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

		/* The header is fixed and overlaps the document, so the section top has
		   to clear it. Measured at click time rather than held as a constant:
		   the header is a different height once stickyNavbar makes it solid. */
		var top = Math.max(0, Math.round(
			$(target).offset().top - $('#header').outerHeight()
		));

		if (window.matchMedia
			&& window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
			window.scrollTo(0, top);
			return;
		}

		/* "html, body" both: which of the two actually scrolls varies with that
		   overflow, and animating the one that does not is a no-op. .stop()
		   first so a second click does not queue behind the first. */
		$('html, body').stop().animate(
			{ scrollTop: top },
			{ duration: 750, easing: 'swing' }
		);

		/* The hash is deliberately not written to the URL. Putting it there
		   makes the back button undo a scroll rather than leave the page, and
		   the section ids here are nav targets — a reader who lands on
		   td_test.html#mojligheter from history skips the hero the cue exists
		   to sell. */
	});

	/* ...and the cue steps aside as soon as the reader moves. It exists to say
	   "there is more below" to someone who has not started yet; to someone who
	   is already scrolling it is a label on a door they walked through. Back at
	   the top it is wanted again, so it fades in rather than staying spent.

	   Two thresholds, not one. A single line at 40px is a line the page can sit
	   on: a slow trackpad, or Chrome's own scroll anchoring nudging by a pixel,
	   would cross it repeatedly and blink the mark. Hiding at 60 and returning
	   at 16 leaves a band the page has to be carried across on purpose.

	   The first call is synchronous rather than left to the scroll event: a page
	   that opens already scrolled — a reload partway down, a back button — gets
	   the class here, before paint, so the mark is absent instead of fading out
	   in front of the reader. */
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

	/* The solid header is a state; fading it in is a reveal, and only the reveal
	   should animate.

	   Waypoints also fires this handler while the page is settling, not just on
	   a crossing the reader caused: a subpage has no banner, so #content already
	   sits above the trigger at load, and the header would replay its entrance
	   on every navigation. The canReveal test below tells the two apart.

	   .animated carries the duration, fadeInDown only names the animation. It
	   used to arrive by accident from stickyNavbar's own fadeIn; with that
	   switched off above, an unpaired fadeInDown runs for 0s and pops. */
	var $content = $('#content');

	/* A reveal needs somewhere to be revealed from, so the test is where the
	   reader starts — in the banner, or already past it.

	   Deliberately not a measurement. Positions are unreliable at this point: on
	   a cold load the images have not settled, so #products can still report an
	   offset near the top of the page and every comparison against it is wrong.
	   Asking which element the reader is landing on needs no layout at all.

	   #home is the banner, and only the two index pages have one — every subpage
	   opens with #banner instead. So the header is revealed on index.html, and
	   on index.html#home where Home lands, and is simply present everywhere else:
	   on any subpage, and on /#products or /#showcases, where a group label
	   leads. */
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
			/* Back above the waypoint, so the next crossing is a real reveal —
			   this is what makes Home, then scrolling down, animate again. */
			canReveal = true;
			$('#header').removeClass('nav-solid animated fadeInDown');
		}
	});

	/* stickyNavbar's scrollspy gets two things wrong, and both of them show.

	   1. Its range test is inclusive at both ends, so a section's last pixel and
	      the next section's first pixel are the same scroll position and BOTH
	      light up. That position is exactly where an anchor link lands, which is
	      why arriving via /#products — where a group label leads — highlighted
	      Showcases and Produkter at once.

	   2. The last section's trigger can sit below the furthest the page will
	      scroll. #partners starts 63px past the end of the document, so it could
	      never activate at all. The plugin does carry a fallback for this, but it
	      is unreachable: the block is guarded by `typeof h`, where h is a var
	      declared inside the guard itself, so it is hoisted, always undefined,
	      and the block never runs.

	   Patching a minified vendor file would be worse than this, so instead work
	   out the one section the reader is actually in and let it be the only active
	   item. Bound after stickyNavbar's own scroll handler, so it runs second and
	   has the last word. */
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
			/* The 2px slack matters. Section tops land on fractional pixels, and
			   a hash jump can rest a fraction short of its own trigger — landing
			   on #products put the page at 5088.5 against a trigger of 5088.66,
			   which read as "not there yet" and highlighted Showcases. It also
			   matches where stickyNavbar's own anchor animation comes to rest,
			   which is the trigger plus two. */
			if (scrollTop >= $(this).offset().top - headerHeight - 2) {
				current = this.id;
			}
		});

		/* Nothing below can be reached once the page bottoms out, so the last
		   section owns the end of the document however short it is. */
		if (scrollTop + $window.height() >= $(document).height() - 2) {
			current = $sections.last().attr('id');
		}

		var $header = $('#header');
		$header.find('li a').removeClass('active');
		if (current) {
			$header.find('li a[href~="#' + current + '"]').addClass('active');
		}

		/* A page that is not a section of index.html can say so for itself, which
		   is the only way about.html or a product page can light its own menu
		   item up — there is no section to scroll past. Applied last so it
		   outranks anything the sections matched. */
		var $current = $header.find('li a[aria-current="page"]');
		$current.addClass('active');

		/* A subpage's own entry sits inside a group's panel, which stays closed
		   until the label is hovered, so the label carries the same .active mark
		   as a top-level item — the menu says which section you are in without
		   being opened. No-op for about.html, whose entry is top-level already. */
		$current.closest('.nav-group').find('summary a').addClass('active');
	}

	$(window).on('scroll resize load', syncActiveNavItem);
	syncActiveNavItem();

	/* Keep the reader in place when the layout changes width.

	   Chrome's scroll anchoring holds the page still through an ordinary
	   resize — dragging a desktop window from 900 to 1000px moves Produkter
	   91px up the document and moves scrollTop by exactly the same 91px. But
	   it gives up at 768px: measured on index.html, a 767→768px step moves
	   Produkter 2,013px down and leaves scrollTop untouched, so a reader
	   sitting on Produkter is thrown back into the middle of Showcases.

	   Not caused by anything we script — it happens with every <script> in the
	   page stripped out, and anchoring demonstrably works here otherwise
	   (inserting a 500px box above the viewport shifts scrollTop by exactly
	   500). It is the layout change itself: a media query that changes padding
	   or width on the anchor's own ancestors is a scroll-anchoring suppression
	   trigger, and 768px is where the carousels in Tjänster and Showcases turn
	   into grids — 1,060px of extra height in Tjänster alone. 768 is the only
	   breakpoint on the page that moves anything; the others cost 0px.

	   The real trigger is not dragging a window, it is turning a phone:
	   portrait and landscape sit either side of that breakpoint.

	   So keep our own anchor — which section the reader is in, and how far
	   into it — and restore it after the resize, scaling the offset by how
	   much the section itself grew or shrank so half way down a section stays
	   half way down. Only when the browser has visibly failed, though: if the
	   section moved and scrollTop moved with it, anchoring did its job and
	   this stays out of the way. */
	var anchor = null;
	var anchorWidth = window.innerWidth;
	var resizePending = false;

	function captureAnchor() {
		/* Not while a resize is being dealt with. The browser's own partial
		   adjustment fires a scroll event of its own, and letting that land
		   here would overwrite the anchor with the position we are about to
		   correct — which is exactly why wide-to-narrow used to stay broken
		   while narrow-to-wide was fixed. Both tests are needed because the
		   scroll event and the resize event can arrive in either order: the
		   flag catches resize-first, the width catches scroll-first. */
		if (resizePending || window.innerWidth !== anchorWidth) {
			return;
		}

		var y = window.pageYOffset;
		var edge = y + $('#header').outerHeight(true);
		var found = null;

		/* The section whose top is last above the header, i.e. the one filling
		   the viewport — the same reading of "where am I" the nav uses. */
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

		/* What the browser left undone: how far the section travelled, less how
		   far scrollTop travelled after it. Zero means the reader never moved
		   relative to the page and there is nothing to correct. */
		if (Math.abs((top - anchor.top) - (y - anchor.y)) <= 8) {
			return;
		}

		var into = (anchor.y - anchor.top) * (($section.outerHeight() || 1) / anchor.height);
		window.scrollTo(0, Math.max(0, Math.round(top + into)));
	}

	$(window).on('resize', function () {
		/* Height-only resizes are a phone's toolbar sliding in and out while
		   the reader scrolls. Nothing reflowed, and grabbing the scroll
		   position back mid-gesture would be a jerk in itself. */
		if (window.innerWidth === anchorWidth) {
			captureAnchor();
			return;
		}

		anchorWidth = window.innerWidth;

		/* Next frame, so every other resize handler has had its turn first —
		   the carousels hide their dots on the way to the wide layout, and
		   measuring before that would anchor against a height about to
		   change. Coalesced, because a window drag fires this continuously. */
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

	/* WOW Elements. Started here rather than on window.load: WOW hides every
	   .wow element until it initialises, so waiting for images to finish would
	   keep half the page invisible long after it could have been read. */
	if (typeof WOW == 'function') {
		new WOW().init();
	}

	/* Parallax Effects */
	if (!!$.prototype.enllax) {
		$(window).enllax();
	}

});
