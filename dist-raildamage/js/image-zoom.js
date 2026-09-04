/* Click-to-enlarge for images, sitewide.

   Opt in per image with the data-zoomable attribute:

       <img src="..." alt="..." data-zoomable>

   No lightbox library on the site to reuse (js/lightbox.min.js is video-only),
   so the overlay is built here: one at a time, closed by click, by Escape or by
   its own close button. It is a real modal dialog — focus moves in, is held
   there while it is open, and goes back to the image that opened it, and the
   page behind is made inert so Tab cannot walk it. Styles live in
   css/image-zoom.css. */
(function () {
    'use strict';

    /* The English mirror at /en/ loads this same file, so what the screen
       reader hears follows <html lang>. Same shape as js/image-carousel.js. */
    var SPEECH = {
        sv: { dialog: 'Förstorad bild', close: 'Stäng', zoom: 'förstora' },
        en: { dialog: 'Enlarged image', close: 'Close', zoom: 'enlarge' }
    };
    var speech = (document.documentElement.lang || '').slice(0, 2) === 'en'
        ? SPEECH.en
        : SPEECH.sv;

    var images = document.querySelectorAll('img[data-zoomable]');
    if (!images.length) {
        return;
    }

    var overlay = null;
    var closeButton = null;
    /* Where focus came from, so it has somewhere to go back to. */
    var opener = null;
    var inerted = [];

    /* aria-modal alone only tells assistive tech to ignore the rest of the
       page; it does nothing about Tab. inert on everything beside the overlay
       is what actually takes the page behind out of the tab order. */
    function setBackgroundInert(on) {
        if (on) {
            inerted = Array.prototype.filter.call(document.body.children, function (el) {
                return el !== overlay;
            });
            inerted.forEach(function (el) {
                el.inert = true;
            });
        } else {
            inerted.forEach(function (el) {
                el.inert = false;
            });
            inerted = [];
        }
    }

    function close() {
        if (!overlay) {
            return;
        }
        /* Inert first: focus() on a still-inert element does nothing. */
        setBackgroundInert(false);
        document.body.removeChild(overlay);
        overlay = null;
        closeButton = null;
        document.removeEventListener('keydown', onKeydown);

        if (opener) {
            opener.focus();
            opener = null;
        }
    }

    function onKeydown(e) {
        if (e.key === 'Escape' || e.keyCode === 27) {
            close();
            return;
        }
        /* The close button is the only focusable thing in here, so holding
           focus is just a matter of putting it back. Cheaper and harder to get
           wrong than walking a list of one. */
        if (e.key === 'Tab' && closeButton) {
            e.preventDefault();
            closeButton.focus();
        }
    }

    function open(image) {
        close();
        opener = image;

        var full = document.createElement('img');
        full.src = image.getAttribute('data-zoom-src') || image.currentSrc || image.src;
        /* Empty on purpose: the dialog's own name below already carries this
           image's alt text, and a copy here would have it read out twice. */
        full.alt = '';

        overlay = document.createElement('div');
        overlay.className = 'image-zoom-overlay';
        overlay.setAttribute('role', 'dialog');
        overlay.setAttribute('aria-modal', 'true');
        overlay.setAttribute('aria-label', image.alt
            ? speech.dialog + ': ' + image.alt
            : speech.dialog);
        overlay.tabIndex = -1;
        overlay.appendChild(full);

        /* Escape and a click anywhere both close, but neither is discoverable.
           The X is drawn in CSS, so it survives the Font Awesome kit failing. */
        closeButton = document.createElement('button');
        closeButton.type = 'button';
        closeButton.className = 'image-zoom-close';
        closeButton.setAttribute('aria-label', speech.close);
        overlay.appendChild(closeButton);

        /* On the overlay, so clicking the backdrop or the image itself closes
           too — the button click just bubbles into the same handler. */
        overlay.addEventListener('click', close);

        document.body.appendChild(overlay);
        setBackgroundInert(true);
        closeButton.focus();
        document.addEventListener('keydown', onKeydown);
    }

    Array.prototype.forEach.call(images, function (image) {
        image.setAttribute('role', 'button');
        image.setAttribute('tabindex', '0');
        /* role="button" replaces the image role, so the alt alone would be
           announced as a button with no hint of what pressing it does. */
        image.setAttribute('aria-label', image.alt
            ? image.alt + ' – ' + speech.zoom
            : speech.zoom);

        image.addEventListener('click', function () {
            open(image);
        });

        image.addEventListener('keydown', function (e) {
            if (e.key === 'Enter' || e.key === ' ' || e.keyCode === 13 || e.keyCode === 32) {
                e.preventDefault();
                open(image);
            }
        });
    });
}());
