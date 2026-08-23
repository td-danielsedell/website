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
            /* The copies are the same content again. inert rather than
               aria-hidden: the partner track is a row of links, and hiding a
               focusable element from the accessibility tree while leaving it in
               the tab order is worse than not hiding it. */
            copy.inert = true;
            slider.appendChild(copy);
        }

        const speed = parseFloat(slider.dataset.speed) || 1;
        let scrollX = 0;

        (function animate() {
            scrollX += speed;
            if (scrollX >= track.offsetWidth) {
                scrollX = 0;
            }
            slider.scrollLeft = scrollX;
            requestAnimationFrame(animate);
        })();
    }
});
