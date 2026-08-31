"use strict";

/* TEMPORARY — Tegel palette A/B preview toggle.

   Design review aid only, not a shipping feature. Lets Daniel flip between
   Version A ("Tegel & Bärnsten", amber --section-subtitle) and Version B
   ("Tegel & Stålblå", steel blue) live, on top of whichever light/dark theme
   js/theme.js has already resolved. Once a version is picked, delete this
   file, the .palette-b CSS blocks in css/colors.css and css/light.css (each
   marked TEMPORARY), and the <script src="js/palette-preview.js"> line on
   every page.

   No markup to maintain: the button is created here and inserted next to
   each existing .theme-toggle button, the same way theme.js's toggle already
   appears twice per page (wide nav + mobile nav). */
(function () {
    var STORAGE_KEY = "td-palette-preview";
    var VARIANT_CLASS = "palette-b";
    var root = document.documentElement;

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
            /* Preview-only; losing the choice on reload is not worth guarding. */
        }
    }

    function apply(isB) {
        if (isB) {
            root.classList.add(VARIANT_CLASS);
        } else {
            root.classList.remove(VARIANT_CLASS);
        }
        syncButtons(isB);
    }

    function syncButtons(isB) {
        var buttons = document.querySelectorAll(".palette-preview-toggle");
        for (var i = 0; i < buttons.length; i++) {
            buttons[i].textContent = isB ? "Palette: B" : "Palette: A";
        }
    }

    function makeButton() {
        var button = document.createElement("button");
        button.type = "button";
        button.className = "palette-preview-toggle";
        button.setAttribute("aria-label", "Toggle Tegel palette A/B preview");
        button.title = "Toggle Tegel palette A/B preview";
        button.style.cssText =
            "font-size:11px;padding:2px 8px;margin-left:6px;border:1px solid currentColor;" +
            "border-radius:3px;background:transparent;color:inherit;cursor:pointer;";
        button.addEventListener("click", function () {
            var isB = !root.classList.contains(VARIANT_CLASS);
            store(isB ? "b" : "a");
            apply(isB);
        });
        return button;
    }

    function insertButtons() {
        var toggles = document.querySelectorAll(".theme-toggle");
        for (var i = 0; i < toggles.length; i++) {
            var toggle = toggles[i];
            if (toggle.nextElementSibling && toggle.nextElementSibling.classList.contains("palette-preview-toggle")) {
                continue;
            }
            toggle.insertAdjacentElement("afterend", makeButton());
        }
        syncButtons(root.classList.contains(VARIANT_CLASS));
    }

    apply(stored() === "b");

    document.addEventListener("DOMContentLoaded", insertButtons);
    window.addEventListener("load", insertButtons);
})();
