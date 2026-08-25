'use strict';

/* The map in "Var vi finns". It replaces the static td-office-map.webp, which
   stays behind in a <noscript> for visitors without JavaScript.

   The map is an illustration, not a tool: it shows the spread across the
   country, it does not navigate. So it sits still by default — the wheel does
   not zoom (the page would stop scrolling whenever the pointer crossed the
   map) and dragging is off on touch for the same reason. The list beside it
   is what drives it: hover or tab a city to bring its dot forward, click to
   zoom there. That list is also the accessible version of the same content —
   the map adds nothing that is not already written out in text.

   Leaflet is injected from here rather than linked from the page. It is still
   fetched on every visit — the point is only to keep it off the critical
   path. A <link> in <head> holds the first paint while 14kB of stylesheet for
   a section far below the fold arrives, and that is the one cost worth
   avoiding; whether the bytes are fetched at all is not worth the complexity
   of a scroll trigger.

   The tiles come from tile.openstreetmap.org, a third party (item 23 in the
   revision document), though that tile server sets no cookies — unlike the
   ESRI embed once planned for this slot. To drop the third party entirely the
   map would have to be drawn as GeoJSON polygons instead of tiles. */

(function () {

    var container = document.getElementById('map');
    if (!container) {
        return;
    }

    /* The box is reserved now, not when Leaflet finishes, or the page jumps
       when the map appears. Without JavaScript the class is never set and
       #map stays hidden — then the <noscript> image is what shows. */
    container.classList.add('map-live');

    var CSS_HREF = 'css/leaflet.css';
    var JS_SRC = 'js/leaflet.js';

    /* The order mirrors the list in about.html: north to south. `label` is the
       side the name is placed on. Degerfors/Kumla and Uppsala/Stockholm sit
       close enough that their labels overwrite each other at national zoom, so
       each pair is split to opposite sides. */
    var CITIES = [
        { id: 'ostersund', name: 'Östersund', lat: 63.1792, lng: 14.6357, label: 'right' },
        { id: 'uppsala', name: 'Uppsala', lat: 59.8586, lng: 17.6389, label: 'left' },
        { id: 'stockholm', name: 'Stockholm', lat: 59.3293, lng: 18.0686, label: 'right' },
        { id: 'degerfors', name: 'Degerfors', lat: 59.2378, lng: 14.4297, label: 'left' },
        { id: 'kumla', name: 'Kumla', lat: 59.1283, lng: 15.1425, label: 'right' },
        { id: 'lidkoping', name: 'Lidköping', lat: 58.5052, lng: 13.1577, label: 'right' },
        { id: 'alingsas', name: 'Alingsås', lat: 57.9300, lng: 12.5333, label: 'left' },
        { id: 'varberg', name: 'Varberg', lat: 57.1057, lng: 12.2502, label: 'left' },
        { id: 'bastad', name: 'Båstad', lat: 56.4258, lng: 12.8517, label: 'left' },
        { id: 'malmo', name: 'Malmö', lat: 55.6050, lng: 13.0038, label: 'left' }
    ];

    var DOT_RADIUS = 6;
    var DOT_RADIUS_ACTIVE = 10;
    var CITY_ZOOM = 8;

    var reduceMotion = window.matchMedia &&
        window.matchMedia('(prefers-reduced-motion: reduce)').matches;


    /* ---------- Loading ---------- */

    loadLeaflet(initMap);

    /* Both the stylesheet and the script have to be in place before the map is
       drawn: Leaflet positions tiles and labels from its own rules, so a map
       initialised ahead of its CSS lays out wrong. */
    function loadLeaflet(done) {
        if (window.L) {
            done();
            return;
        }

        var pending = 2;
        var failed = false;

        function ready() {
            pending -= 1;
            if (pending === 0 && !failed) {
                done();
            }
        }

        function fail() {
            failed = true;
            /* Hide the box again so it does not sit there as an empty panel.
               The text and the city list carry the content regardless. */
            container.classList.remove('map-live');
        }

        var css = document.createElement('link');
        css.rel = 'stylesheet';
        css.href = CSS_HREF;
        css.onload = ready;
        css.onerror = fail;
        /* First in <head>, not appended last. A vendor sheet belongs before
           ours in the cascade: appended, leaflet.css would win every tie
           against about.css, and the map's own styling here — the tooltip
           that has its callout box removed, the dot colours — is written on
           the assumption that it can override Leaflet's defaults. */
        document.head.insertBefore(css, document.head.firstChild);

        var js = document.createElement('script');
        js.src = JS_SRC;
        js.onload = ready;
        js.onerror = fail;
        document.head.appendChild(js);
    }


    /* ---------- The map ---------- */

    function initMap() {

        var map = L.map(container, {
            /* The wheel belongs to the page, not to the map. */
            scrollWheelZoom: false,
            /* National zoom is the floor: without this you can zoom out to the
               whole globe and lose Sweden. */
            minZoom: 4,
            maxZoom: 12,
            /* Quarter steps. Zoom levels double in scale, so whole steps are
               too coarse to frame a country: fitBounds lands on 5 and leaves
               the bottom third of the box sitting on Poland. */
            zoomSnap: 0.25,
            attributionControl: true
        });

        L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
            maxZoom: 12,
            /* The Nordics are enough. Without this, tiles for half of Europe
               load as soon as someone drags sideways. */
            bounds: L.latLngBounds([53.0, 3.0], [70.5, 32.0]),
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        }).addTo(map);

        var bounds = L.latLngBounds(CITIES.map(function (city) {
            return [city.lat, city.lng];
        }));

        /* The labels stick out past their dots, so the frame needs air — most
           of it sideways, where the city names sit. */
        var FIT_PADDING = L.point(48, 24);

        map.fitBounds(bounds, { padding: FIT_PADDING });

        /* The view the map can always fall back to. Read after fitBounds,
           because the zoom level depends on how wide the box turned out. */
        var homeCenter = map.getCenter();
        var homeZoom = map.getZoom();

        /* Panning is free, but not unbounded: a map picture you can lose
           Sweden inside of is broken. */
        map.setMaxBounds(bounds.pad(0.9));

        /* A one-finger drag on a phone is the page scrolling, not the map. */
        if (L.Browser.mobile) {
            map.dragging.disable();
        }

        var markers = {};

        CITIES.forEach(function (city) {
            var marker = L.circleMarker([city.lat, city.lng], {
                /* Colour and stroke width are set in about.css so the dots
                   follow --primary from colors.css instead of hardcoding the
                   orange here. */
                className: 'city-dot',
                radius: DOT_RADIUS,
                keyboard: false
            }).addTo(map);

            marker.bindTooltip(city.name, {
                permanent: true,
                direction: city.label,
                className: 'city-label',
                /* The label must not catch the pointer; the dot underneath it
                   is the hit target. */
                interactive: false,
                /* Leaflet anchors a tooltip on the marker's point and knows
                   nothing about a circleMarker's radius, so the offset has to
                   clear it by hand — and clear the *active* radius, or the
                   label ends up underneath its own dot as soon as the city is
                   picked. */
                offset: city.label === 'left'
                    ? [-(DOT_RADIUS_ACTIVE + 4), 0]
                    : [DOT_RADIUS_ACTIVE + 4, 0]
            });

            marker.on('click', function () {
                toggleCity(city.id);
            });

            markers[city.id] = marker;
        });

        /* ---- The link to the city list ---- */

        /* The list is plain text in the HTML so that it works without
           JavaScript. It only takes on its clickable role here, once we know
           there is a map for it to point at. */
        var items = {};
        var listItems = document.querySelectorAll('.location-list li[data-city]');
        var activeId = null;

        Array.prototype.forEach.call(listItems, function (item) {
            var id = item.getAttribute('data-city');
            if (!markers[id]) {
                return;
            }

            items[id] = item;
            item.setAttribute('role', 'button');
            item.setAttribute('tabindex', '0');
            item.setAttribute('aria-pressed', 'false');
            item.classList.add('is-linked');

            item.addEventListener('mouseenter', function () { highlight(id, true); });
            item.addEventListener('mouseleave', function () { highlight(id, false); });
            item.addEventListener('focus', function () { highlight(id, true); });
            item.addEventListener('blur', function () { highlight(id, false); });
            item.addEventListener('click', function () { toggleCity(id); });
            item.addEventListener('keydown', function (event) {
                if (event.key === 'Enter' || event.key === ' ' || event.key === 'Spacebar') {
                    /* Space scrolls the page unless we stop it. */
                    event.preventDefault();
                    toggleCity(id);
                }
            });
        });

        /* Emphasis on hover/focus. Distinct from "selected city" below: this
           one disappears the moment the pointer does. */
        function highlight(id, on) {
            var marker = markers[id];
            if (!marker || id === activeId) {
                return;
            }
            marker.setRadius(on ? DOT_RADIUS_ACTIVE : DOT_RADIUS);
            setClass(marker, 'is-hovered', on);
            if (items[id]) {
                items[id].classList.toggle('is-hovered', on);
            }
        }

        /* A click zooms in on the city. A second click on the same city zooms
           back out to the whole country — without it, anyone who zoomed in
           would be stuck there. */
        function toggleCity(id) {
            if (activeId === id) {
                select(null);
                fly(homeCenter, homeZoom);
                return;
            }
            select(id);
            fly(markers[id].getLatLng(), CITY_ZOOM);
        }

        function select(id) {
            if (activeId && markers[activeId]) {
                markers[activeId].setRadius(DOT_RADIUS);
                setClass(markers[activeId], 'is-active', false);
                if (items[activeId]) {
                    items[activeId].classList.remove('is-active');
                    items[activeId].setAttribute('aria-pressed', 'false');
                }
            }

            activeId = id;

            if (id && markers[id]) {
                markers[id].setRadius(DOT_RADIUS_ACTIVE);
                setClass(markers[id], 'is-active', true);
                if (items[id]) {
                    items[id].classList.add('is-active');
                    items[id].setAttribute('aria-pressed', 'true');
                }
            }
        }

        function fly(latlng, zoom) {
            if (reduceMotion) {
                map.setView(latlng, zoom);
            } else {
                map.flyTo(latlng, zoom, { duration: 0.6 });
            }
        }

        /* A circleMarker is drawn as an SVG element; the class goes on that,
           not on the Leaflet object. */
        function setClass(marker, name, on) {
            var el = marker.getElement();
            if (el) {
                el.classList.toggle(name, on);
            }
        }

        /* The map sits in a column whose width changes with the window.
           Leaflet measures the box once at startup, so it has to be measured
           again when that width changes — otherwise half the map goes grey. */
        var resizeTimer = null;
        window.addEventListener('resize', function () {
            window.clearTimeout(resizeTimer);
            resizeTimer = window.setTimeout(function () {
                map.invalidateSize();
                if (activeId === null) {
                    map.fitBounds(bounds, { padding: FIT_PADDING });
                    homeCenter = map.getCenter();
                    homeZoom = map.getZoom();
                }
            }, 200);
        });
    }

}());
