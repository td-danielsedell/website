"use strict";

(function () {
    var STORAGE_KEY = "td-theme";
    var LIGHT_CLASS = "theme-light";
    var root = document.documentElement;

    var mql = window.matchMedia ? window.matchMedia("(prefers-color-scheme: light)") : null;

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

        }
    }

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

    var ANIMATION_CLASS = "theme-animating";
    var ANIMATION_MS = 380;
    var animationTimer = null;

    function crossfade() {
        root.classList.add(ANIMATION_CLASS);

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

        if (light) {
            root.classList.add(LIGHT_CLASS);
        } else {
            root.classList.remove(LIGHT_CLASS);
        }
        syncControls(light);
    }

    apply(resolve());

    if (!persists) {
        root.classList.add("no-theme-choice");
    }

    if (mql && mql.addEventListener) {
        mql.addEventListener("change", function () {
            if (!stored()) {
                apply(systemPrefersLight(), true);
            }
        });
    }

    document.addEventListener("click", function (event) {

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

    document.addEventListener("DOMContentLoaded", function () {
        syncControls(root.classList.contains(LIGHT_CLASS));
    });

    window.addEventListener("load", function () {
        syncControls(root.classList.contains(LIGHT_CLASS));
    });
})();
