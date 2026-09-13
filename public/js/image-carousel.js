
(function () {
    'use strict';

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

        var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

        var groupLabel = carousel.getAttribute('data-carousel-label') || speech.group;
        var noun = carousel.getAttribute('data-carousel-noun') || speech.noun;

        function arrow(direction, label, glyph) {
            var button = document.createElement('button');
            button.type = 'button';
            button.className = 'image-carousel-arrow image-carousel-arrow--' + direction;
            button.setAttribute('aria-label', label);

            button.innerHTML = '<i class="svg-icon fa-solid fa-chevron-' + glyph
                + '" aria-hidden="true"></i>';
            button.addEventListener('click', function () {

                go(direction === 'prev' ? current - 1 : current + 1);
                announce();
            });
            carousel.appendChild(button);
            return button;
        }

        function laidOut() {
            return Array.prototype.slice.call(slides).filter(function (slide) {
                return slide.offsetWidth || slide.offsetHeight
                    || slide.getClientRects().length;
            });
        }

        function views() {

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

                if (!out.length || position > out[out.length - 1].position) {
                    out.push({ position: position, slide: index });
                }
            });

            return out;
        }

        var stops = views();

        function go(index) {

            stops = views();
            if (!stops.length) {
                return;
            }

            index = ((index % stops.length) + stops.length) % stops.length;
            markCurrent(index);

            track.scrollTo({
                left: stops[index].position,
                behavior: reduceMotion.matches ? 'auto' : 'smooth'
            });
        }

        function announce() {
            if (!stops.length) {
                return;
            }
            live.textContent = speech.at(noun, stops[current].slide + 1, laidOut().length);
        }

        arrow('prev', speech.prev + noun, 'left');

        var live = document.createElement('div');
        live.className = 'image-carousel-live';
        live.setAttribute('role', 'status');
        live.setAttribute('aria-live', 'polite');
        live.setAttribute('aria-atomic', 'true');
        carousel.appendChild(live);

        var dots = document.createElement('div');
        dots.className = 'image-carousel-dots';

        dots.setAttribute('role', 'group');
        dots.setAttribute('aria-label', speech.pick + noun);
        carousel.appendChild(dots);

        arrow('next', speech.next + noun, 'right');

        function renderDots() {
            stops = views();
            var total = laidOut().length;

            if (dots.children.length === stops.length) {

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

        function syncReach() {

            var scrolls = track.scrollWidth > track.clientWidth + 1;
            var left = track.scrollLeft;
            var right = left + track.clientWidth;

            Array.prototype.forEach.call(slides, function (slide) {
                var start = slide.offsetLeft - track.offsetLeft;
                var shown = Math.min(start + slide.offsetWidth, right) - Math.max(start, left);
                slideReachable(slide, !scrolls || shown > slide.offsetWidth / 2);
            });
        }

        fitViews();
        renderDots();
        syncReach();

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

        function fitViews() {
            if (!carousel.hasAttribute('data-carousel-fit')) {
                return;
            }

            var gap = parseFloat(getComputedStyle(track).columnGap) || 0;
            var slide = slides[0].getBoundingClientRect().width;

            var port = track.clientWidth;
            var per = Math.max(1, Math.floor((port + gap) / (slide + gap)));
            var side = Math.max(0, (port - (per * slide + (per - 1) * gap)) / 2);

            track.style.paddingLeft = side + 'px';
            track.style.paddingRight = side + 'px';
            track.style.scrollPaddingLeft = side + 'px';

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

        function syncAffordances() {
            var scrolls = track.scrollWidth > track.clientWidth + 1;

            carousel.classList.toggle('image-carousel--static', !scrolls);
        }

        track.setAttribute('tabindex', '-1');

        syncAffordances();

        window.addEventListener('resize', function () {
            fitViews();
            syncAffordances();
            renderDots();
            syncReach();
        });

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

        var autoplayDelay = parseInt(carousel.getAttribute('data-carousel-autoplay'), 10);
        if (!autoplayDelay || autoplayDelay < 1000) {
            return;
        }

        var timer = null;
        var idleTimer = null;

        var onScreen = typeof IntersectionObserver !== 'function';

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

                if (!canAutoplay()) {
                    stop();
                    return;
                }
                go(current + 1);
            }, autoplayDelay);
        }

        function yieldToReader() {
            stop();
            clearTimeout(idleTimer);
            idleTimer = setTimeout(start, autoplayDelay * 3);
        }

        ['pointerdown', 'touchstart', 'wheel', 'keydown', 'focusin'].forEach(function (evt) {
            carousel.addEventListener(evt, yieldToReader, { passive: true });
        });

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
