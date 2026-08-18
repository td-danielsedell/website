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

	$("#nav-mobile").html($("#nav-main").html());

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

	/* Sticky Navigation.

	   animateCSS off: the plugin otherwise puts "fadeIn animated" on the header
	   every time it becomes sticky and strips it again near the top of the page,
	   so the whole header replays its entrance on every scroll back down. */
	if (!!$.prototype.stickyNavbar) {
		$('#header').stickyNavbar({ animateCSS: false });
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
