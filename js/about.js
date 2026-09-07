'use strict';

(function () {

    var container = document.getElementById('map');
    if (!container) {
        return;
    }

    container.classList.add('map-live');

    var CSS_HREF = 'css/leaflet.css';
    var JS_SRC = 'js/leaflet.js';

    var CITIES = [
        { id: 'ostersund', name: 'Östersund', lat: 63.1792, lng: 14.6357, label: 'right' },
        { id: 'uppsala', name: 'Uppsala', lat: 59.8586, lng: 17.6389, label: 'left' },
        { id: 'stockholm', name: 'Stockholm', lat: 59.3293, lng: 18.0686, label: 'right' },
        { id: 'degerfors', name: 'Degerfors', lat: 59.2378, lng: 14.4297, label: 'left' },
        { id: 'kumla', name: 'Kumla', lat: 59.1283, lng: 15.1425, label: 'bottom' },
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

    loadLeaflet(initMap);

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

            container.classList.remove('map-live');
        }

        var css = document.createElement('link');
        css.rel = 'stylesheet';
        css.href = CSS_HREF;
        css.onload = ready;
        css.onerror = fail;

        document.head.insertBefore(css, document.head.firstChild);

        var js = document.createElement('script');
        js.src = JS_SRC;
        js.onload = ready;
        js.onerror = fail;
        document.head.appendChild(js);
    }

    function initMap() {

        var map = L.map(container, {

            scrollWheelZoom: false,

            minZoom: 4,
            maxZoom: 12,

            zoomSnap: 0.25,
            attributionControl: true
        });

        L.tileLayer('https://services.arcgisonline.com/ArcGIS/rest/services/World_Shaded_Relief/MapServer/tile/{z}/{y}/{x}', {
            maxZoom: 12,

            bounds: L.latLngBounds([53.0, 3.0], [70.5, 32.0]),
            attribution: 'Tiles &copy; <a href="https://www.esri.com/">Esri</a> &mdash; Source: Esri'
        }).addTo(map);

        var bounds = L.latLngBounds(CITIES.map(function (city) {
            return [city.lat, city.lng];
        }));

        var FIT_PADDING_TOP_LEFT = L.point(70, 54);
        var FIT_PADDING_BOTTOM_RIGHT = L.point(20, 54);

        function fitAll() {
            map.fitBounds(bounds, {
                paddingTopLeft: FIT_PADDING_TOP_LEFT,
                paddingBottomRight: FIT_PADDING_BOTTOM_RIGHT
            });
        }

        fitAll();

        var homeCenter = map.getCenter();
        var homeZoom = map.getZoom();

        map.setMaxBounds(bounds.pad(0.9));

        if (L.Browser.mobile) {
            map.dragging.disable();
        }

        var markers = {};

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

                className: 'city-dot',
                radius: DOT_RADIUS,
                keyboard: false
            }).addTo(map);

            marker.bindTooltip(city.name, {
                permanent: true,
                direction: city.label,
                className: 'city-label',

                interactive: false,
                offset: labelOffset(city.label)
            });

            marker.on('click', function () {
                toggleCity(city.id);
            });

            markers[city.id] = marker;
        });

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

                    event.preventDefault();
                    toggleCity(id);
                }
            });
        });

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

        function setClass(marker, name, on) {
            var el = marker.getElement();
            if (el) {
                el.classList.toggle(name, on);
            }
        }

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
