/* Continuous marquee, sitewide. See css/logo-slider.css for the markup.

   Every .logo-slider on the page is set up independently, so a page can carry
   more than one — index.html has the partner logos and the industry strip. It
   used to look its two elements up by id, which allowed exactly one. */
document.addEventListener("DOMContentLoaded", () => {
    /* A marquee is motion the reader cannot stop, which is the case the
       reduced-motion setting exists for. Left as a static row of the first
       copy. */
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
        return;
    }

    document.querySelectorAll(".logo-slider").forEach(setup);

    function setup(slider) {
        const track = slider.querySelector(".logo-track");
        if (!track) {
            return;
        }

        /* The loop resets the scroll position at the end of the first copy, so
           what is on screen at that moment has to be a seamless continuation:
           the copies after it must cover a full viewport width. One clone does
           that when the track is already wider than the slider — the partner
           logos are — but a short track needs several, or the reset shows the
           gap after the last copy. */
        let guard = 0;
        while (slider.scrollWidth < slider.clientWidth + track.offsetWidth && guard++ < 20) {
            const copy = track.cloneNode(true);
            /* The copies are the same content again, so they are hidden from
               the accessibility tree and taken out of the tab order. NOT inert:
               inert also removes the subtree from hit testing, and the marquee
               scrolls the first copy off screen within a couple of seconds — so
               everything the reader can actually see and point at is a copy.
               inert made the partner logos unclickable and killed their hover. */
            copy.setAttribute("aria-hidden", "true");
            copy.removeAttribute("id");
            copy.querySelectorAll("[id]").forEach((el) => el.removeAttribute("id"));
            copy.querySelectorAll("a").forEach((a) => (a.tabIndex = -1));
            slider.appendChild(copy);
        }

        const speed = parseFloat(slider.dataset.speed) || 1;
        let scrollX = 0;
        let paused = false;

        /* WCAG 2.2.2 asks for a way to stop motion that runs longer than five
           seconds. No visible button — hover covers the pointer, focus covers
           the keyboard, and between them every reader who is trying to read or
           click a logo has already stopped the strip by reaching for it. The
           clones are out of the tab order, so a Tab into the row always lands
           in the first copy, which is the one the loop measures against. */
        slider.addEventListener("mouseenter", pause);
        slider.addEventListener("focusin", pause);
        slider.addEventListener("mouseleave", resume);
        slider.addEventListener("focusout", resume);

        function pause() {
            paused = true;
        }

        /* Focusing a link scrolls it into view, and the wheel still works while
           the strip is held — either leaves slider.scrollLeft somewhere the
           loop's own counter knows nothing about, and resuming from the stale
           counter would snap the row sideways. Read the real position back
           instead. The copies are identical, so the modulo lands on the same
           picture the reader is already looking at. */
        function resume() {
            paused = false;
            scrollX = track.offsetWidth ? slider.scrollLeft % track.offsetWidth : 0;
        }

        (function animate() {
            if (!paused) {
                scrollX += speed;
                if (scrollX >= track.offsetWidth) {
                    scrollX = 0;
                }
                slider.scrollLeft = scrollX;
            }
            requestAnimationFrame(animate);
        })();
    }
});
