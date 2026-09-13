
document.addEventListener("DOMContentLoaded", () => {

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
        return;
    }

    document.querySelectorAll(".logo-slider").forEach(setup);

    function setup(slider) {
        const track = slider.querySelector(".logo-track");
        if (!track) {
            return;
        }

        let guard = 0;
        while (slider.scrollWidth < slider.clientWidth + track.offsetWidth && guard++ < 20) {
            const copy = track.cloneNode(true);

            copy.setAttribute("aria-hidden", "true");
            copy.removeAttribute("id");
            copy.querySelectorAll("[id]").forEach((el) => el.removeAttribute("id"));
            copy.querySelectorAll("a").forEach((a) => (a.tabIndex = -1));
            slider.appendChild(copy);
        }

        const speed = parseFloat(slider.dataset.speed) || 1;
        let scrollX = 0;
        let paused = false;

        slider.addEventListener("mouseenter", pause);
        slider.addEventListener("focusin", pause);
        slider.addEventListener("mouseleave", resume);
        slider.addEventListener("focusout", resume);

        function pause() {
            paused = true;
        }

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
