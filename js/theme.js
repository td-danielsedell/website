"use strict";

/* Light/dark theme.

   The system setting decides, and a click on the header toggle overrides it for
   this browser. Three states, not two: no stored value means "follow the OS",
   which is the default and is not the same as having chosen dark.

   Loaded as a blocking <script> in <head>, before any stylesheet-dependent
   paint, so the resolved theme is on <html> before the first frame. Deferring
   it — or moving it to the end of <body> with the other scripts — shows the
   dark site for a frame and then flips it, which is worse than either theme.

   No jQuery: this has to run before jquery.js is fetched. */
(function () {
    var STORAGE_KEY = "td-theme";
    var LIGHT_CLASS = "theme-light";
    var root = document.documentElement;

    /* Older browsers, and any privacy mode that blocks matchMedia, resolve to
       dark — which is the site as it shipped. */
    var mql = window.matchMedia ? window.matchMedia("(prefers-color-scheme: light)") : null;

    /* localStorage throws rather than returning null in a few configurations
       (Safari with cookies blocked, iframes with a null origin), and a theme is
       not worth breaking the page over. */
    function stored() {
        try {
            return localStorage.getItem(STORAGE_KEY);
        } catch (e) {
            return null;
        }
    }

    function store(value) {
        try {
            localStorage.setItem(STORAGE_KEY, value);
        } catch (e) {
            /* Unreachable while the toggle is only offered where canStore()
               passed, but the write stays guarded: the probe and the click are
               separated by however long the page is open. */
        }
    }

    /* A control that forgets is worse than no control: the reader presses it,
       the site repaints, and the next click through the nav puts it back. So
       the toggle is only offered where the choice will survive a navigation.

       The probe has to be a real write. Safari with cookies blocked, and
       private modes generally, hand back a localStorage object whose getItem
       works and whose setItem throws — reading alone proves nothing. Read back
       as well, to also catch a zero-quota store that accepts the call and
       keeps nothing. */
    function canStore() {
        var probeKey = STORAGE_KEY + "-probe";
        try {
            localStorage.setItem(probeKey, "1");
            var kept = localStorage.getItem(probeKey) === "1";
            localStorage.removeItem(probeKey);
            return kept;
        } catch (e) {
            return false;
        }
    }

    var persists = canStore();

    function systemPrefersLight() {
        return !!mql && mql.matches;
    }

    function resolve() {
        var choice = stored();
        if (choice === "light" || choice === "dark") {
            return choice === "light";
        }
        return systemPrefersLight();
    }

    /* Both header controls carry their own labels so this file needs no copy of
       its own — the Swedish and English pages hand it different strings. The
       label names the destination, not the current state: it is a button, and
       what it says is what pressing it does. */
    function syncControls(light) {
        var buttons = document.querySelectorAll(".theme-toggle");
        for (var i = 0; i < buttons.length; i++) {
            var button = buttons[i];
            var label = button.getAttribute(light ? "data-label-dark" : "data-label-light");
            if (label) {
                button.setAttribute("aria-label", label);
                button.setAttribute("title", label);
            }
        }
    }

    /* The swap is a cross-fade, not a cut — the rule is in style.css §2.4.0,
       and it only bites while this class is on <html>. Kept to the swap itself
       for two reasons: a standing transition on every element would slow every
       hover and focus ring on the page, and the theme resolved in <head> must
       land on the first frame already painted, with nothing to fade from.

       The timeout has to outlast the CSS duration; if a reader double-taps the
       toggle the pending one is cleared so the class does not come off in the
       middle of the second fade. */
    var ANIMATION_CLASS = "theme-animating";
    var ANIMATION_MS = 380;
    var animationTimer = null;

    function crossfade() {
        root.classList.add(ANIMATION_CLASS);

        /* Load-bearing, and the whole reason this is not two lines: adding the
           transition and swapping the theme in the SAME style change starts no
           transition at all in Chrome when the colours come from a custom
           property — the page cuts straight to the new theme. The properties
           have to already be transitionable in the style the element is
           transitioning *from*, so force a recalculation here, before the
           caller flips .theme-light. Reading a computed value is what forces
           it; the value itself is not used. */
        void getComputedStyle(root).transitionProperty;

        if (animationTimer) {
            clearTimeout(animationTimer);
        }
        animationTimer = setTimeout(function () {
            root.classList.remove(ANIMATION_CLASS);
            animationTimer = null;
        }, ANIMATION_MS);
    }

    function apply(light, animate) {
        if (animate) {
            crossfade();
        }
        /* classList.toggle's second argument is the one IE11-era browsers got
           wrong, and it is the only part of this that matters, so it is spelled
           out instead. */
        if (light) {
            root.classList.add(LIGHT_CLASS);
        } else {
            root.classList.remove(LIGHT_CLASS);
        }
        syncControls(light);
    }

    apply(resolve());

    /* Hides both copies of the toggle — the rule is in style.css §2.4.0. A
       class on <html> rather than a DOM removal, because this runs in <head>
       where neither button exists yet and site.js clones #nav-main into
       #nav-mobile after load. The theme itself still follows the OS; it is
       only the manual override that is withdrawn. */
    if (!persists) {
        root.classList.add("no-theme-choice");
    }

    /* Follow the OS while it is still the OS deciding. Once a reader has
       pressed the toggle, their choice outranks a later system switch. */
    if (mql && mql.addEventListener) {
        mql.addEventListener("change", function () {
            if (!stored()) {
                apply(systemPrefersLight(), true);
            }
        });
    }

    /* Delegated, and bound to the document rather than to the buttons, for two
       reasons: this runs in <head> where neither button exists yet, and site.js
       clones #nav-main into #nav-mobile on ready, so the wide nav's button gets
       duplicated after any direct binding would have happened.

       stickyNavbar is not in the way here. It binds "li a" and
       "li a[href*=#]" — a <button> is not an <a>, so unlike the language links
       this control needs no stopImmediatePropagation to survive the plugin. */
    document.addEventListener("click", function (event) {
        /* display:none already takes the hidden control out of the tab order,
           so this only matters for a .theme-toggle in markup this file does not
           know about. */
        if (!persists) {
            return;
        }
        var target = event.target;
        var button = target && target.closest ? target.closest(".theme-toggle") : null;
        if (!button) {
            return;
        }
        var light = !root.classList.contains(LIGHT_CLASS);
        store(light ? "light" : "dark");
        apply(light, true);
    });

    /* The markup arrives after this file runs, and again after site.js clones
       the nav, so the labels are synced at both points. */
    document.addEventListener("DOMContentLoaded", function () {
        syncControls(root.classList.contains(LIGHT_CLASS));
    });

    window.addEventListener("load", function () {
        syncControls(root.classList.contains(LIGHT_CLASS));
    });
})();
