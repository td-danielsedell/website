/* Horizontal image carousel, sitewide. See css/image-carousel.css for markup.

   The track scrolls natively (scroll-snap), so swipe and trackpad work with
   no JS. This only adds arrows, dots and keyboard control on top, and keeps
   them in sync with wherever the user scrolled to. */
(function () {
    'use strict';

    /* The English mirror at /en/ loads this same file, so the strings the
       screen reader hears follow <html lang> rather than being fixed in
       Swedish. Anything that is not English falls back to Swedish, which is
       what the root of the site is. */
    var SPEECH = {
        sv: { prev: 'Föregående ', next: 'Nästa ', goto: function (noun, i, n) {
            return 'Gå till ' + noun + ' ' + i + ' av ' + n;
        }, at: function (noun, i, n) {
            return noun + ' ' + i + ' av ' + n;
        }, group: 'Bildspel', pick: 'Välj ', noun: 'bild' },
        en: { prev: 'Previous ', next: 'Next ', goto: function (noun, i, n) {
            return 'Go to ' + noun + ' ' + i + ' of ' + n;
        }, at: function (noun, i, n) {
            return noun + ' ' + i + ' of ' + n;
        }, group: 'Image carousel', pick: 'Choose ', noun: 'image' }
    };
    var speech = (document.documentElement.lang || '').slice(0, 2) === 'en'
        ? SPEECH.en
        : SPEECH.sv;

    var carousels = document.querySelectorAll('[data-image-carousel]');
    if (!carousels.length) {
        return;
    }

    function setup(carousel) {
        var track = carousel.querySelector('.image-carousel-track');
        if (!track) {
            return;
        }

        var slides = track.querySelectorAll('.image-carousel-slide');
        if (slides.length < 2) {
            return;
        }

        var current = 0;

        /* Read up here rather than down with the autoplay block, where it used
           to live: that sits below an early return, so on a carousel with no
           data-carousel-autoplay the var was hoisted but never assigned, and
           go() reading .matches off it would throw. */
        var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

        /* Defaults describe an image carousel; a carousel of something else
           renames itself with data-carousel-label / data-carousel-noun. */
        var groupLabel = carousel.getAttribute('data-carousel-label') || speech.group;
        var noun = carousel.getAttribute('data-carousel-noun') || speech.noun;

        function arrow(direction, label, glyph) {
            var button = document.createElement('button');
            button.type = 'button';
            button.className = 'image-carousel-arrow image-carousel-arrow--' + direction;
            button.setAttribute('aria-label', label);
            /* The kit draws the chevron from this <i>, rather than the page
               shipping Font Awesome's path data itself. Only the chevron: the
               disc under it is the button's own background and border-radius
               in css/image-carousel.css, which keeps the glyph solid white
               over a photograph -- fa-circle-chevron-* would knock the chevron
               out of the disc as a transparent hole and lose it on a pale
               image. */
            button.innerHTML = '<i class="svg-icon fa-solid fa-chevron-' + glyph
                + '" aria-hidden="true"></i>';
            button.addEventListener('click', function () {
                /* go() wraps, so neither end is a dead button */
                go(direction === 'prev' ? current - 1 : current + 1);
                announce();
            });
            carousel.appendChild(button);
            return button;
        }

        /* Only the slides that currently have a layout box. A display:none slide
           reports offsetLeft 0, which sorts it to the front of views() below and
           makes its zero the lead-in gutter — every position downstream then
           comes out wrong, and the strictly-ascending test drops real views on
           the floor. js/showcase-featured.js hides slides on this very page, so
           this is live rather than theoretical: it is also why the dot labels
           counted "of 4" while only three cards were on screen. */
        function laidOut() {
            return Array.prototype.slice.call(slides).filter(function (slide) {
                return slide.offsetWidth || slide.offsetHeight
                    || slide.getClientRects().length;
            });
        }

        /* The distinct positions the track can come to rest at, in order, each
           tagged with the slide that leads it.

           One per slide while a single slide fills the view. Fewer once several
           are on screen at a time: the track runs out of scroll before its last
           slides can reach the start, and everything past that shares the one
           final view. Two of three cards at a time is two views — [1,2] and
           [2,3] — not three, and counting them is what the dots and the arrows
           both need.

           Clamping to the end of the scroll range rather than to the last slide
           start that fits inside it, because the end is a view in its own right:
           at a width showing one and a third cards, scrolling fully right brings
           the third card into view even though its own start never can be.

           offsetLeft is measured from the track's padding box, so the first
           slide's own offset is the lead-in gutter; subtracting it puts the
           first view at scrollLeft 0, where the snap actually lands it. */
        function views() {
            /* Sorted by where the slides actually sit, not by DOM order. A track
               is allowed to reorder itself with flex `order` — the showcases do,
               to rotate which case is featured (js/showcase-featured.js) — and
               everything below reads along the axis the reader scrolls: the
               lead-in gutter belongs to whichever slide comes first on screen,
               and "a position past the last one" is only a test for distinct
               views if the positions arrive in ascending order. Read in DOM
               order instead, a reordered track drops the views whose position
               went backwards, and the last case became unreachable by arrow and
               dot both. */
            var ordered = laidOut().sort(function (a, b) {
                return a.offsetLeft - b.offsetLeft;
            });
            if (!ordered.length) {
                return [];
            }
            var lead = ordered[0].offsetLeft - track.offsetLeft;
            var limit = track.scrollWidth - track.clientWidth;
            var out = [];

            ordered.forEach(function (slide, index) {
                var position = Math.min(slide.offsetLeft - track.offsetLeft - lead, limit);
                /* first slide to land on a position is the one leading it */
                if (!out.length || position > out[out.length - 1].position) {
                    out.push({ position: position, slide: index });
                }
            });

            return out;
        }

        var stops = views();

        function go(index) {
            /* Re-measured on the way in: a breakpoint may have changed both how
               many views there are and where they sit since the last look. */
            stops = views();
            if (!stops.length) {
                return;
            }

            index = ((index % stops.length) + stops.length) % stops.length;
            markCurrent(index);
            /* A behavior in the options object beats the stylesheet, so the
               scroll-behavior:auto that image-carousel.css sets under reduced
               motion had no say here at all — only autoplay was ever gated. */
            track.scrollTo({
                left: stops[index].position,
                behavior: reduceMotion.matches ? 'auto' : 'smooth'
            });
        }

        /* Spoken only when the reader worked a control: arrow, dot or arrow key.
           Deliberately not on scroll-settle — autoplay moves the track through
           the same handler, and a carousel that talks every few seconds is worse
           than one that says nothing. Swipe is silent for the same reason, and
           the reader can see it anyway. */
        function announce() {
            if (!stops.length) {
                return;
            }
            live.textContent = speech.at(noun, stops[current].slide + 1, laidOut().length);
        }

        /* Appended prev, dots, next, which is how they read across the screen:
           the arrows are absolutely positioned at the two edges and the dots sit
           in the middle, so appending both arrows first put the tab order at
           prev, next, dots — the keyboard jumped the right-hand arrow before the
           dots that sit to its left. */
        arrow('prev', speech.prev + noun, 'left');

        /* The one the sheet's header comment has been promising all along. */
        var live = document.createElement('div');
        live.className = 'image-carousel-live';
        live.setAttribute('role', 'status');
        live.setAttribute('aria-live', 'polite');
        live.setAttribute('aria-atomic', 'true');
        carousel.appendChild(live);

        var dots = document.createElement('div');
        dots.className = 'image-carousel-dots';
        /* Named separately from the track's own group, so a reader tabbing past
           hears which of the two things they have landed on. */
        dots.setAttribute('role', 'group');
        dots.setAttribute('aria-label', speech.pick + noun);
        carousel.appendChild(dots);

        arrow('next', speech.next + noun, 'right');

        /* One dot per view. The label still counts in slides — "go to product 2
           of 3" names the card the view leads with, which is what a reader is
           looking for; it is only the number of dots that follows the views. */
        function renderDots() {
            stops = views();
            var total = laidOut().length;

            if (dots.children.length === stops.length) {
                /* Same number of dots, but a resize changes which slide leads
                   each view, so the labels are stale even when the count is not
                   — this used to return before touching them. */
                Array.prototype.forEach.call(dots.children, function (dot, index) {
                    dot.setAttribute('aria-label',
                        speech.goto(noun, stops[index].slide + 1, total));
                });
                return;
            }

            dots.innerHTML = '';
            stops.forEach(function (stop, index) {
                var dot = document.createElement('button');
                dot.type = 'button';
                dot.className = 'image-carousel-dot';
                dot.setAttribute('aria-label', speech.goto(noun, stop.slide + 1, total));
                dot.addEventListener('click', function () {
                    go(index);
                    announce();
                });
                dots.appendChild(dot);
            });

            markCurrent(Math.min(current, stops.length - 1));
        }

        function markCurrent(index) {
            current = index;
            Array.prototype.forEach.call(dots.children, function (dot, i) {
                dot.setAttribute('aria-current', i === index ? 'true' : 'false');
            });
        }

        /* Only the slides on screen put their own controls in the tab order.
           The product pages make every screenshot a zoom trigger — js/image-zoom.js
           gives each one role="button" and a tab stop — so without this a reader
           tabbing past the carousel walked all five images, four of them scrolled
           out of sight, before reaching the arrows. Tab now offers the one on
           screen; the arrows and dots are how you reach the others, which is what
           they are for.

           tabindex only, not `inert`: the slides off screen are still one swipe
           away, so their text has to stay readable to a screen reader. The
           original value is remembered rather than assumed, because a slide may
           hold a plain link that never had a tabindex of its own. */
        function slideReachable(slide, on) {
            var controls = slide.querySelectorAll('a[href], button, [tabindex]');
            Array.prototype.forEach.call(controls, function (el) {
                if (typeof el.dataset.carouselTabindex === 'undefined') {
                    el.dataset.carouselTabindex = el.hasAttribute('tabindex')
                        ? el.getAttribute('tabindex')
                        : 'none';
                }
                if (!on) {
                    el.setAttribute('tabindex', '-1');
                } else if (el.dataset.carouselTabindex === 'none') {
                    el.removeAttribute('tabindex');
                } else {
                    el.setAttribute('tabindex', el.dataset.carouselTabindex);
                }
            });
        }

        /* Measured off the track's own scroll position rather than watched with
           an IntersectionObserver: this has to be right immediately and on every
           settle, and it is the same offsetLeft-minus-track-offsetLeft frame
           views() already works in. A slide counts as on screen once more than
           half of it is inside the scrollport, so a sliver clipped at the edge
           does not claim a tab stop. */
        function syncReach() {
            /* A track that does not scroll is showing everything it has, so
               nothing may be taken out of the tab order — at the widths where
               these rows become a wrapped grid the second row sits outside the
               scrollport horizontally, and measuring overlap alone dropped a
               showcase card that was plainly on screen. */
            var scrolls = track.scrollWidth > track.clientWidth + 1;
            var left = track.scrollLeft;
            var right = left + track.clientWidth;

            Array.prototype.forEach.call(slides, function (slide) {
                var start = slide.offsetLeft - track.offsetLeft;
                var shown = Math.min(start + slide.offsetWidth, right) - Math.max(start, left);
                slideReachable(slide, !scrolls || shown > slide.offsetWidth / 2);
            });
        }

        /* Padding first: how many views there are is measured off it. */
        fitViews();
        renderDots();
        syncReach();

        /* Whatever moved the track — arrow, dot, swipe, wheel — the view nearest
           the track's resting position is the one now on screen. No tie-break
           needed: views() has already made the positions distinct. */
        var settle = null;
        track.addEventListener('scroll', function () {
            clearTimeout(settle);
            settle = setTimeout(function () {
                var position = track.scrollLeft;
                var nearest = 0;
                var shortest = Infinity;

                stops = views();
                stops.forEach(function (stop, index) {
                    var distance = Math.abs(stop.position - position);
                    if (distance < shortest) {
                        shortest = distance;
                        nearest = index;
                    }
                });

                markCurrent(nearest);
                syncReach();
            }, 80);
        });

        /* Opt-in, for a track whose slides carry their own width rather than
           filling the scrollport. Sets the side padding to whatever centres the
           current view, which is the only way to centre a view of more than one
           slide: scroll-snap-align can only centre a single slide, and would cut
           both neighbours of a two-slide view in half.

           Everything downstream then falls out of that padding. A slide resting
           at the left padding edge is a centred view, so the snap positions are
           just multiples of the stride; and

               maxScroll = 2 x padding + total - port
                         = (port - viewWidth) + total - port
                         = total - viewWidth
                         = (slides - per) x stride

           lands the last view exactly on the end of the scroll range, so nothing
           needs clamping and nothing is unreachable. When every slide fits, per
           covers them all, the padding centres the lot and there is no scroll —
           which is the wide layout, arrived at without a breakpoint.

           Only for tracks that ask: a slide sized as a percentage of the content
           box would feed its own width back into this and never settle. */
        function fitViews() {
            if (!carousel.hasAttribute('data-carousel-fit')) {
                return;
            }

            var gap = parseFloat(getComputedStyle(track).columnGap) || 0;
            var slide = slides[0].getBoundingClientRect().width;
            /* clientWidth is the padding box, so it does not move when the
               padding we are about to set does */
            var port = track.clientWidth;
            var per = Math.max(1, Math.floor((port + gap) / (slide + gap)));
            var side = Math.max(0, (port - (per * slide + (per - 1) * gap)) / 2);

            track.style.paddingLeft = side + 'px';
            track.style.paddingRight = side + 'px';
            track.style.scrollPaddingLeft = side + 'px';

            /* Re-anchor on the view we were already on. Snapping does not re-run
               when the padding under it changes, so the track would otherwise sit
               a fallback-padding's worth off its own snap position — 20px, which
               is exactly enough to make the first view look uncentred while every
               other view looks right. Instantly, and without disturbing the
               smooth scrolling the arrows rely on. */
            stops = views();

            var anchor = stops[Math.min(current, stops.length - 1)];
            if (anchor) {
                var behavior = track.style.scrollBehavior;
                track.style.scrollBehavior = 'auto';
                track.scrollLeft = anchor.position;
                track.style.scrollBehavior = behavior;
            }
        }

        track.setAttribute('role', 'group');
        track.setAttribute('aria-label', groupLabel);

        /* A track wide enough to hold all its slides has nothing to offer: the
           arrows and dots would be lying. The products rely on this rather than
           a breakpoint — their cards keep a fixed size, so whether it scrolls is
           a question of how many happen to fit, which only measuring can answer.

           The track deliberately does NOT become a tab stop. It used to carry
           tabindex="0", and because nothing gave it a focus style that stop was
           invisible; once the site-wide focus ring landed it showed up as a box
           around the whole scrollport — image plus caption on the product pages,
           the whole row on the index — which reads as a bug on something that is
           not itself clickable.

           tabindex="-1", not a missing attribute: Chrome 127 and later make any
           scroll container keyboard-focusable on its own so the arrow keys can
           scroll it, so simply deleting the attribute left the stop exactly where
           it was. Only an explicit -1 opts out.

           Nothing is lost by it: the arrows and dots are rendered at exactly the
           widths where the track scrolls, so every view stays reachable from the
           keyboard, and the ArrowLeft/ArrowRight handler below still fires for a
           control inside the track because the event bubbles up to here. */
        function syncAffordances() {
            var scrolls = track.scrollWidth > track.clientWidth + 1;

            carousel.classList.toggle('image-carousel--static', !scrolls);
        }

        track.setAttribute('tabindex', '-1');

        syncAffordances();

        /* A resize can change how many slides share the view, and so how many
           views there are and whether it scrolls at all. renderDots is a no-op
           unless the count actually moved. */
        window.addEventListener('resize', function () {
            fitViews();
            syncAffordances();
            renderDots();
            syncReach();
        });

        /* Bound to the track, but reached by bubbling now that the track is not
           itself focusable: the arrow keys work while focus sits on a link
           inside a slide. */
        track.addEventListener('keydown', function (e) {
            if (e.key === 'ArrowLeft') {
                e.preventDefault();
                go(current - 1);
                announce();
            } else if (e.key === 'ArrowRight') {
                e.preventDefault();
                go(current + 1);
                announce();
            }
        });

        /* Optional auto-advance: data-carousel-autoplay="4000" steps one whole
           view every 4s. Unlike a marquee this always comes to rest on a
           snapped slide, so nothing is ever half readable. */
        var autoplayDelay = parseInt(carousel.getAttribute('data-carousel-autoplay'), 10);
        if (!autoplayDelay || autoplayDelay < 1000) {
            return;
        }

        var timer = null;
        var idleTimer = null;
        /* No IntersectionObserver means we cannot tell, so assume visible. */
        var onScreen = typeof IntersectionObserver !== 'function';

        /* Only while the track actually scrolls. On desktop these tracks go
           back to a plain block, and advancing a static column would just
           yank the page around. The onScreen check is repeated inside the tick
           as well as gating start/stop, because clearing the interval races
           the observer callback and a tick can otherwise slip through. */
        function canAutoplay() {
            return onScreen
                && !document.hidden
                && track.scrollWidth > track.clientWidth + 1
                && !reduceMotion.matches;
        }

        function stop() {
            clearInterval(timer);
            timer = null;
        }

        function start() {
            if (timer || !canAutoplay()) {
                return;
            }
            timer = setInterval(function () {
                /* Re-checked every tick, not just at start: this is what stops
                   a queued tick from firing after the carousel scrolled away. */
                if (!canAutoplay()) {
                    stop();
                    return;
                }
                go(current + 1);
            }, autoplayDelay);
        }

        /* A reader who takes control keeps it for a while — then the motion
           comes back so a later visitor still gets the hint that there is more. */
        function yieldToReader() {
            stop();
            clearTimeout(idleTimer);
            idleTimer = setTimeout(start, autoplayDelay * 3);
        }

        ['pointerdown', 'touchstart', 'wheel', 'keydown', 'focusin'].forEach(function (evt) {
            carousel.addEventListener(evt, yieldToReader, { passive: true });
        });

        /* Don't advance a carousel nobody is looking at: without this a reader
           arrives at Tjänster to find it already sitting on slide 6 with no
           idea the earlier ones existed. */
        if (typeof IntersectionObserver === 'function') {
            new IntersectionObserver(function (entries) {
                entries.forEach(function (entry) {
                    onScreen = entry.isIntersecting;
                    if (onScreen) {
                        start();
                    } else {
                        stop();
                    }
                });
            }, { threshold: 0.5 }).observe(carousel);
        } else {
            start();
        }

        document.addEventListener('visibilitychange', function () {
            if (document.hidden) {
                stop();
            } else {
                /* The IntersectionObserver only fires on threshold crossings, so
                   coming back to the tab never re-starts a carousel that was
                   already on screen when we left. */
                start();
            }
        });

        window.addEventListener('resize', function () {
            if (!canAutoplay()) {
                stop();
            }
        });
    }

    Array.prototype.forEach.call(carousels, setup);
}());
