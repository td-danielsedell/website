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

   The tiles come from services.arcgisonline.com, a third party (item 23 in the
   revision document), though that tile server sets no cookies — unlike the
   ESRI embed once planned for this slot, which is a different thing entirely:
   this is a plain raster tile request, not their JS API. To drop the third
   party entirely the map would have to be drawn as GeoJSON polygons instead of
   tiles. See the tileLayer call below for why this basemap. */

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

    /* The order mirrors the list in about.html: the Swedish towns north to
       south, then Åland last — its latitude would put it second, but it is the
       one entry outside Sweden and reads better as the tail of the list. The dot
       sits on Mariehamn.

       `label` is the side the name is placed on, and two things decide it:
       neighbours, and the frame. Degerfors/Kumla and Alingsås/Göteborg sit close
       enough that same-side labels overwrite each other at national zoom, so
       each pair is split. Kumla goes above its dot instead of beside it:
       Katrineholm sits down and to the right, close enough that a right-hand
       label put "Kumla" in the gap between the two dots and Katrineholm's own
       label closed it. Åland points left, back inland, because it is the
       easternmost dot and its name would otherwise hang off the edge of the box;
       it clears Stockholm's label, which points the other way, on latitude. */
    var CITIES = [
        { id: 'ostersund', name: 'Östersund', lat: 63.1792, lng: 14.6357, label: 'right' },
        { id: 'uppsala', name: 'Uppsala', lat: 59.8586, lng: 17.6389, label: 'left' },
        { id: 'stockholm', name: 'Stockholm', lat: 59.3293, lng: 18.0686, label: 'right' },
        { id: 'degerfors', name: 'Degerfors', lat: 59.2378, lng: 14.4297, label: 'left' },
        { id: 'kumla', name: 'Kumla', lat: 59.1283, lng: 15.1425, label: 'top' },
        { id: 'katrineholm', name: 'Katrineholm', lat: 58.9959, lng: 16.2065, label: 'right' },
        { id: 'lidkoping', name: 'Lidköping', lat: 58.5052, lng: 13.1577, label: 'left' },
        { id: 'linkoping', name: 'Linköping', lat: 58.4109, lng: 15.6216, label: 'right' },
        { id: 'alingsas', name: 'Alingsås', lat: 57.9300, lng: 12.5333, label: 'right' },
        { id: 'goteborg', name: 'Göteborg', lat: 57.7089, lng: 11.9746, label: 'left' },
        { id: 'varberg', name: 'Varberg', lat: 57.1057, lng: 12.2502, label: 'left' },
        { id: 'bastad', name: 'Båstad', lat: 56.4258, lng: 12.8517, label: 'left' },
        { id: 'aland', name: 'Åland', lat: 60.0971, lng: 19.9348, label: 'left' }
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

        /* Esri's World Shaded Relief rather than OSM's standard tiles. Three
           reasons: it carries no place names at all, so the thirteen labels we
           draw are the only text on the map; it is terrain rather than streets,
           which suits an illustration; and at ~14kB a tile it is a third of
           OSM's ~48kB. It needs no API key — which matters, because this site
           has no build step and no backend, so a key would have to be committed
           to the repo in the clear and would stay in its history.

           Note the path order: Esri serves {z}/{y}/{x}, not {z}/{x}/{y}.

           maxZoom stays at the map's own 12 even though the service goes to 13;
           the picture never needs closer. */
        L.tileLayer('https://services.arcgisonline.com/ArcGIS/rest/services/World_Shaded_Relief/MapServer/tile/{z}/{y}/{x}', {
            maxZoom: 12,
            /* The Nordics are enough. Without this, tiles for half of Europe
               load as soon as someone drags sideways. */
            bounds: L.latLngBounds([53.0, 3.0], [70.5, 32.0]),
            attribution: 'Tiles &copy; <a href="https://www.esri.com/">Esri</a> &mdash; Source: Esri'
        }).addTo(map);

        var bounds = L.latLngBounds(CITIES.map(function (city) {
            return [city.lat, city.lng];
        }));

        /* The labels stick out past their dots, so the frame needs air — most of
           it sideways, where the city names sit, and now unevenly: every label
           near an edge of the box points left (Göteborg is the westernmost dot,
           Åland the easternmost and it points back inland), so the west side has
           to fit a whole city name and the east side only a dot. Symmetric
           padding wide enough for the west would throw away zoom on the east.

           The box is taller than Sweden is wide, so fitBounds picks its zoom off
           the height: horizontal padding alone only slides the frame sideways,
           it never zooms out far enough to fit Göteborg's label and Åland's dot
           in the same 480px. The vertical padding is what buys that room — it
           forces the fit down one quarter-step, and the dots close up 16% in
           both directions. */
        var FIT_PADDING_TOP_LEFT = L.point(70, 54);
        var FIT_PADDING_BOTTOM_RIGHT = L.point(20, 54);

        function fitAll() {
            map.fitBounds(bounds, {
                paddingTopLeft: FIT_PADDING_TOP_LEFT,
                paddingBottomRight: FIT_PADDING_BOTTOM_RIGHT
            });
        }

        fitAll();

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

        /* Leaflet anchors a tooltip on the marker's point and knows nothing
           about a circleMarker's radius, so every direction has to clear it by
           hand — and clear the *active* radius, or the label ends up underneath
           its own dot as soon as the city is picked. Leaflet has already moved
           the box to the right side of the anchor by the time this offset
           applies, so each one is just the gap. */
        function labelOffset(direction) {
            if (direction === 'top') {
                return [0, -(DOT_RADIUS_ACTIVE + 1)];
            }
            if (direction === 'bottom') {
                return [0, DOT_RADIUS_ACTIVE + 1];
            }
            if (direction === 'left') {
                return [-(DOT_RADIUS_ACTIVE + 1), 0];
            }
            return [DOT_RADIUS_ACTIVE + 1, 0];
        }

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
                offset: labelOffset(city.label)
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
                    fitAll();
                    homeCenter = map.getCenter();
                    homeZoom = map.getZoom();
                }
            }, 200);
        });
    }

}());
