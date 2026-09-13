
(function () {
    'use strict';

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

    var opener = null;
    var inerted = [];

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

        closeButton = document.createElement('button');
        closeButton.type = 'button';
        closeButton.className = 'image-zoom-close';
        closeButton.setAttribute('aria-label', speech.close);
        overlay.appendChild(closeButton);

        overlay.addEventListener('click', close);

        document.body.appendChild(overlay);
        setBackgroundInert(true);
        closeButton.focus();
        document.addEventListener('keydown', onKeydown);
    }

    Array.prototype.forEach.call(images, function (image) {
        image.setAttribute('role', 'button');
        image.setAttribute('tabindex', '0');

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
