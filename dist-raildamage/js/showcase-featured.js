/* Showcases: rotating featured card + "visa fler" reveal.
 *
 * The section is #showcases.showcase-featured. Every .image-carousel-slide in
 * the track is a case. One of them is marked [data-featured] at runtime and
 * gets the wide photo-beside-copy layout; the rest tile three to a row. Cases
 * past the first full row get [data-overflow] and stay hidden behind the
 * button until it is clicked.
 *
 * Nothing here keys off DOM order, so cases can be added, removed or reordered
 * in the markup freely. The button's label is static text in the markup, so
 * nothing here is language-specific either. Styling lives in
 * css/feature-card.css.
 */
(function () {
    "use strict";

    /* "list": revealed cases come back as full-width alternating rows.
       "grid":  they stay third-width cards (can leave a part-filled row). */
    var REVEAL_STYLE = "grid";

    /* Cases visible before the button, per breakpoint. Keep these equal to
       (1 featured + one full row) or the button leaves exactly the orphan row
       it exists to prevent. */
    var VISIBLE_DESKTOP = 4; // 1 + 3
    var VISIBLE_TABLET = 3;  // 1 + 2

    var STORAGE_KEY = "td-featured-showcase";

    function layout(keepFeatured) {
        var track = document.querySelector(".showcase-featured .showcase-track");
        if (!track) return;

        var slides = Array.prototype.slice.call(
            track.querySelectorAll(":scope > .image-carousel-slide")
        );
        if (slides.length < 2) return;

        /* Which case is featured advances one step per visit. The counter lives
           in localStorage; flex order (not a DOM move) puts the picked card
           first, so the markup order stays the authored one. */
        var n = 0;
        if (keepFeatured) {
            /* A width change re-lays out the same featured card; it must not
               advance the counter. */
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
                /* Parity in visible order, so the revealed list alternates photo
                   sides whichever card rotation featured. */
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
            /* The cards are display:none while collapsed, so they cannot be
               transitioned from a hidden state — set the start frame, unhide,
               then release it, staggered.

               Reading offsetWidth forces the start frame to be laid out
               synchronously. requestAnimationFrame would do the same job on the
               next frame, but it is paused while the tab is in the background,
               and a click that lands just before the user switches away would
               leave every revealed card stuck at opacity 0. */
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
        /* Guarded the same way js/theme.js guards its own matchMedia listener:
           older Safari only has the deprecated addListener. */
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
