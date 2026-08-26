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
            /* The choice applies to this page view and is forgotten. */
        }
    }

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

    function apply(light) {
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

    /* Follow the OS while it is still the OS deciding. Once a reader has
       pressed the toggle, their choice outranks a later system switch. */
    if (mql && mql.addEventListener) {
        mql.addEventListener("change", function () {
            if (!stored()) {
                apply(systemPrefersLight());
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
        var target = event.target;
        var button = target && target.closest ? target.closest(".theme-toggle") : null;
        if (!button) {
            return;
        }
        var light = !root.classList.contains(LIGHT_CLASS);
        store(light ? "light" : "dark");
        apply(light);
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
