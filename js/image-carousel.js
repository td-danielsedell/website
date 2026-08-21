/* Horizontal image carousel, sitewide. See css/image-carousel.css for markup.

   The track scrolls natively (scroll-snap), so swipe and trackpad work with
   no JS. This only adds arrows, dots and keyboard control on top, and keeps
   them in sync with wherever the user scrolled to. */
(function () {
    'use strict';

    /* Chevrons from Font Awesome Free 6.7.2 (icons: CC BY 4.0), inlined for the
       same reason as the rest of the icons: no CDN stylesheet, no webfont. */
    var CHEVRON = {
        left: 'M9.4 233.4c-12.5 12.5-12.5 32.8 0 45.3l192 192c12.5 12.5 32.8 12.5 45.3 0s12.5-32.8 0-45.3L77.3 256 246.6 86.6c12.5-12.5 12.5-32.8 0-45.3s-32.8-12.5-45.3 0l-192 192z',
        right: 'M310.6 233.4c12.5 12.5 12.5 32.8 0 45.3l-192 192c-12.5 12.5-32.8 12.5-45.3 0s-12.5-32.8 0-45.3L242.7 256 73.4 86.6c-12.5-12.5-12.5-32.8 0-45.3s32.8-12.5 45.3 0l192 192z'
    };

    /* The English mirror at /en/ loads this same file, so the strings the
       screen reader hears follow <html lang> rather than being fixed in
       Swedish. Anything that is not English falls back to Swedish, which is
       what the root of the site is. */
    var SPEECH = {
        sv: { prev: 'Föregående ', next: 'Nästa ', goto: function (noun, i, n) {
            return 'Gå till ' + noun + ' ' + i + ' av ' + n;
        }, group: 'Bildspel', noun: 'bild' },
        en: { prev: 'Previous ', next: 'Next ', goto: function (noun, i, n) {
            return 'Go to ' + noun + ' ' + i + ' of ' + n;
        }, group: 'Image carousel', noun: 'image' }
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

        /* Defaults describe an image carousel; a carousel of something else
           renames itself with data-carousel-label / data-carousel-noun. */
        var groupLabel = carousel.getAttribute('data-carousel-label') || speech.group;
        var noun = carousel.getAttribute('data-carousel-noun') || speech.noun;

        function arrow(direction, label, glyph) {
            var button = document.createElement('button');
            button.type = 'button';
            button.className = 'image-carousel-arrow image-carousel-arrow--' + direction;
            button.setAttribute('aria-label', label);
            button.innerHTML = '<svg class="svg-icon" viewBox="0 0 320 512" aria-hidden="true" focusable="false" '
                + 'xmlns="http://www.w3.org/2000/svg"><path d="' + CHEVRON[glyph] + '" /></svg>';
            button.addEventListener('click', function () {
                /* go() wraps, so neither end is a dead button */
                go(direction === 'prev' ? current - 1 : current + 1);
            });
            carousel.appendChild(button);
            return button;
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
            var lead = slides[0].offsetLeft - track.offsetLeft;
            var limit = track.scrollWidth - track.clientWidth;
            var out = [];

            Array.prototype.forEach.call(slides, function (slide, index) {
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
            track.scrollTo({ left: stops[index].position, behavior: 'smooth' });
        }

        arrow('prev', speech.prev + noun, 'left');
        arrow('next', speech.next + noun, 'right');

        var dots = document.createElement('div');
        dots.className = 'image-carousel-dots';
        carousel.appendChild(dots);

        /* One dot per view. The label still counts in slides — "go to product 2
           of 3" names the card the view leads with, which is what a reader is
           looking for; it is only the number of dots that follows the views. */
        function renderDots() {
            stops = views();

            if (dots.children.length === stops.length) {
                return;
            }

            dots.innerHTML = '';
            stops.forEach(function (stop, index) {
                var dot = document.createElement('button');
                dot.type = 'button';
                dot.className = 'image-carousel-dot';
                dot.setAttribute('aria-label', speech.goto(noun, stop.slide + 1, slides.length));
                dot.addEventListener('click', function () {
                    go(index);
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

        /* Padding first: how many views there are is measured off it. */
        fitViews();
        renderDots();

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
           arrows and dots would be lying and the tab stop is dead weight. The
           products rely on this rather than a breakpoint — their cards keep a
           fixed size, so whether it scrolls is a question of how many happen to
           fit, which only measuring can answer. Keyboard control is reachable
           without a mouse for the same reason the tab stop exists. */
        function syncAffordances() {
            var scrolls = track.scrollWidth > track.clientWidth + 1;

            carousel.classList.toggle('image-carousel--static', !scrolls);
            if (scrolls) {
                track.setAttribute('tabindex', '0');
            } else {
                track.removeAttribute('tabindex');
            }
        }

        syncAffordances();

        /* A resize can change how many slides share the view, and so how many
           views there are and whether it scrolls at all. renderDots is a no-op
           unless the count actually moved. */
        window.addEventListener('resize', function () {
            fitViews();
            syncAffordances();
            renderDots();
        });

        track.addEventListener('keydown', function (e) {
            if (e.key === 'ArrowLeft') {
                e.preventDefault();
                go(current - 1);
            } else if (e.key === 'ArrowRight') {
                e.preventDefault();
                go(current + 1);
            }
        });

        /* Optional auto-advance: data-carousel-autoplay="4000" steps one whole
           view every 4s. Unlike a marquee this always comes to rest on a
           snapped slide, so nothing is ever half readable. */
        var autoplayDelay = parseInt(carousel.getAttribute('data-carousel-autoplay'), 10);
        if (!autoplayDelay || autoplayDelay < 1000) {
            return;
        }

        var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
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
