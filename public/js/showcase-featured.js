
(function () {
    "use strict";

    var REVEAL_STYLE = "grid";

    var VISIBLE_DESKTOP = 4;
    var VISIBLE_TABLET = 3;

    var STORAGE_KEY = "td-featured-showcase";

    function layout(keepFeatured) {
        var track = document.querySelector(".showcase-featured .showcase-track");
        if (!track) return;

        var slides = Array.prototype.slice.call(
            track.querySelectorAll(":scope > .image-carousel-slide")
        );
        if (slides.length < 2) return;

        var n = 0;
        if (keepFeatured) {

            n = slides.findIndex(function (s) { return s.hasAttribute("data-featured"); });
            if (n < 0) n = 0;
        } else {
            try {
                n = (parseInt(localStorage.getItem(STORAGE_KEY), 10) || 0) % slides.length;
                localStorage.setItem(STORAGE_KEY, String((n + 1) % slides.length));
            } catch (e) {
                n = 0;
            }
        }

        slides.forEach(function (s, i) {
            s.removeAttribute("data-featured");
            s.style.order = "";
            if (i === n) {
                s.setAttribute("data-featured", "");
                s.style.order = "-1";
            }
        });

        var section = track.closest(".showcase-featured");
        var more = section && section.querySelector(".showcase-more");
        if (!section || !more) return;

        var visualOrder = [slides[n]].concat(slides.filter(function (s, i) { return i !== n; }));
        var visible = window.matchMedia("(min-width: 768px) and (max-width: 1023px)").matches
            ? VISIBLE_TABLET
            : VISIBLE_DESKTOP;

        var hiddenCount = 0;
        visualOrder.forEach(function (s, i) {
            if (i >= visible) {
                s.setAttribute("data-overflow", "");

                s.setAttribute("data-row-parity", hiddenCount % 2 ? "even" : "odd");
                hiddenCount++;
            } else {
                s.removeAttribute("data-overflow");
                s.removeAttribute("data-row-parity");
            }
        });

        section.setAttribute("data-reveal-style", REVEAL_STYLE);

        if (!hiddenCount) {
            section.removeAttribute("data-collapsed");
            more.hidden = true;
            return;
        }

        section.setAttribute("data-collapsed", "");
        more.hidden = false;

        var button = more.querySelector(".showcase-more-button");
        if (!button || button.dataset.bound) return;
        button.dataset.bound = "1";
        button.addEventListener("click", function () {
            var revealed = Array.prototype.slice.call(
                section.querySelectorAll(".image-carousel-slide[data-overflow]")
            );

            revealed.forEach(function (s) { s.setAttribute("data-revealing", ""); });
            section.removeAttribute("data-collapsed");
            more.hidden = true;
            void section.offsetWidth;
            revealed.forEach(function (s, i) {
                s.setAttribute("data-reveal-anim", "");
                setTimeout(function () { s.removeAttribute("data-revealing"); }, i * 90);
                setTimeout(function () { s.removeAttribute("data-reveal-anim"); }, i * 90 + 600);
            });
        });
    }

    function init() {
        layout(false);

        var mql = window.matchMedia("(min-width: 768px) and (max-width: 1023px)");
        if (mql && mql.addEventListener) {
            mql.addEventListener("change", function () { layout(true); });
        }
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", init);
    } else {
        init();
    }
})();
