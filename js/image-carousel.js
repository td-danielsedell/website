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
                /* wrap around, so neither end is a dead button */
                go(direction === 'prev'
                    ? (current - 1 + slides.length) % slides.length
                    : (current + 1) % slides.length);
            });
            carousel.appendChild(button);
            return button;
        }

        function go(index) {
            /* offsetLeft is relative to the track's padding box, so the
               difference is exactly the scroll position that centers it */
            track.scrollTo({
                left: slides[index].offsetLeft - track.offsetLeft,
                behavior: 'smooth'
            });
        }

        arrow('prev', speech.prev + noun, 'left');
        arrow('next', speech.next + noun, 'right');

        var dots = document.createElement('div');
        dots.className = 'image-carousel-dots';

        Array.prototype.forEach.call(slides, function (slide, index) {
            var dot = document.createElement('button');
            dot.type = 'button';
            dot.className = 'image-carousel-dot';
            dot.setAttribute('aria-label', speech.goto(noun, index + 1, slides.length));
            dot.addEventListener('click', function () {
                go(index);
            });
            dots.appendChild(dot);
        });

        carousel.appendChild(dots);

        function markCurrent(index) {
            current = index;
            Array.prototype.forEach.call(dots.children, function (dot, i) {
                dot.setAttribute('aria-current', i === index ? 'true' : 'false');
            });
        }

        markCurrent(0);

        /* Whatever moved the track — arrow, dot, swipe, wheel — the nearest
           slide to the track's left edge is the one now on screen. */
        var settle = null;
        track.addEventListener('scroll', function () {
            clearTimeout(settle);
            settle = setTimeout(function () {
                var position = track.scrollLeft;
                var nearest = 0;
                var shortest = Infinity;

                Array.prototype.forEach.call(slides, function (slide, index) {
                    var distance = Math.abs(slide.offsetLeft - track.offsetLeft - position);
                    if (distance < shortest) {
                        shortest = distance;
                        nearest = index;
                    }
                });

                markCurrent(nearest);
            }, 80);
        });

        /* Keyboard control once the carousel has focus. The track is
           focusable so this is reachable without a mouse — but only while it
           actually scrolls: the product carousel goes back to a plain column
           layout on desktop, and a tab stop on a static block is dead weight. */
        track.setAttribute('role', 'group');
        track.setAttribute('aria-label', groupLabel);

        function syncFocusable() {
            if (track.scrollWidth > track.clientWidth + 1) {
                track.setAttribute('tabindex', '0');
            } else {
                track.removeAttribute('tabindex');
            }
        }

        syncFocusable();
        window.addEventListener('resize', syncFocusable);

        track.addEventListener('keydown', function (e) {
            if (e.key === 'ArrowLeft') {
                e.preventDefault();
                go((current - 1 + slides.length) % slides.length);
            } else if (e.key === 'ArrowRight') {
                e.preventDefault();
                go((current + 1) % slides.length);
            }
        });

        /* Optional auto-advance: data-carousel-autoplay="4000" steps one whole
           slide every 4s. Unlike a marquee this always comes to rest on a
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
                go((current + 1) % slides.length);
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
