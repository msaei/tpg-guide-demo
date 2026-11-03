// DEMO ONLY: client-side fake Search and fake Plan My Day.
//
// This mirrors pages/demo.py exactly, so the showcase works identically
// with the Django server running AND as plain static files with no server
// at all (the export_showcase command writes static HTML that loads this
// file). Data comes from window.SHOWCASE_PLACES, embedded by the templates
// from the same hardcoded dataset the server uses.
(function () {
    'use strict';

    var places = window.SHOWCASE_PLACES || [];

    function esc(text) {
        return String(text)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;');
    }

    function wordsOf(text) {
        return String(text).toLowerCase().match(/[a-z0-9]+/g) || [];
    }

    // Whole-word match, forgiving about plurals; short tokens like 'rv'
    // only count as whole words. Mirrors _word_hit in pages/demo.py.
    function wordHit(token, text) {
        var words = wordsOf(text);
        for (var i = 0; i < words.length; i++) {
            var word = words[i];
            if (word === token) return true;
            if (token.length >= 3 && (word.indexOf(token) === 0 || token.indexOf(word) === 0)) return true;
        }
        return false;
    }

    function placeCard(place, match) {
        return {
            name: place.name,
            category_label: place.category_label,
            distance: place.distance_mi + ' mi away',
            drive_min: place.drive_min,
            visit_min: place.visit_min,
            blurb: place.blurb,
            match: (match === undefined ? null : match),
            rating: place.rating,
            reviews: place.reviews,
            price: place.price || '',
            hours: place.hours || '',
            phone: place.phone || '',
            address: place.address || '',
            image: place.image || '',
            x: place.x,
            y: place.y,
            lat: place.lat,
            lng: place.lng
        };
    }

    function fakeSearch(query) {
        var tokens = wordsOf(query || '');
        if (!tokens.length) {
            return places.slice()
                .sort(function (a, b) { return a.distance_mi - b.distance_mi; })
                .map(function (place) { return placeCard(place); });
        }
        var scored = [];
        places.forEach(function (place) {
            var score = 0;
            tokens.forEach(function (token) {
                if (wordHit(token, place.name)) score += 40;
                if (wordHit(token, place.category_label)) score += 25;
                if (wordHit(token, place.keywords)) score += 20;
                if (token.length >= 3 && place.blurb.toLowerCase().indexOf(token) !== -1) score += 8;
            });
            if (score >= 15) {
                var match = Math.min(98, score);
                scored.push({ match: match, distance: place.distance_mi, card: placeCard(place, match) });
            }
        });
        scored.sort(function (a, b) { return (b.match - a.match) || (a.distance - b.distance); });
        return scored.map(function (row) { return row.card; });
    }

    function legMinutes(previousDrive, nextDrive) {
        return Math.max(5, Math.abs(nextDrive - previousDrive) + 4);
    }

    function formatMinutes(minutes) {
        var hours = Math.floor(minutes / 60);
        var mins = minutes % 60;
        if (hours && mins) return hours + ' hr ' + mins + ' min';
        if (hours) return hours + ' hr';
        return mins + ' min';
    }

    function fakePlan(hours) {
        var budget = Math.round(hours * 60);
        var candidates = places
            .filter(function (place) { return place.plan; })
            .slice()
            .sort(function (a, b) { return a.priority - b.priority; });
        var stops = [];
        var total = 0;
        var travel = 0;
        var previousDrive = null;
        candidates.forEach(function (place) {
            var leg = (previousDrive === null) ? place.drive_min : legMinutes(previousDrive, place.drive_min);
            var cost = leg + place.visit_min;
            if (total + cost > budget) return;
            var card = placeCard(place);
            card.leg_min = leg;
            stops.push(card);
            total += cost;
            travel += leg;
            previousDrive = place.drive_min;
        });
        if (!stops.length && candidates.length) {
            var cheapest = candidates.slice().sort(function (a, b) {
                return (a.drive_min + a.visit_min) - (b.drive_min + b.visit_min);
            })[0];
            var only = placeCard(cheapest);
            only.leg_min = cheapest.drive_min;
            stops.push(only);
            total = cheapest.drive_min + cheapest.visit_min;
            travel = cheapest.drive_min;
        }
        return { stops: stops, total_min: total, travel_min: travel, budget_min: budget };
    }

    // ---- Search page ----

    function searchCardHtml(place) {
        var badge = '';
        if (place.match) {
            badge = '<span class="flex shrink-0 flex-col items-center rounded-xl bg-primary-fixed/60 px-2.5 py-1.5 text-primary">'
                + '<span class="text-sm leading-none font-bold">' + place.match + '%</span>'
                + '<span class="mt-0.5 text-[10px] font-bold tracking-wider uppercase">Match</span></span>';
        }
        var photo = '';
        if (place.image) {
            var imgSrc = place.image.indexOf('http') === 0 ? place.image : (window.SHOWCASE_ASSET_BASE || '/static/') + place.image;
            photo = '<img src="' + imgSrc + '" alt="" class="mb-3 h-32 w-full rounded-xl object-cover">';
        }
        var rating = '';
        if (place.rating) {
            rating = '<p class="mt-2 flex items-center gap-1.5 text-sm"><span class="text-amber-500" aria-hidden="true">★</span>'
                + '<span class="font-bold">' + place.rating.toFixed(1) + '</span>'
                + '<span class="text-on-surface-variant">(' + place.reviews + ' reviews)</span>'
                + (place.price ? '<span class="text-on-surface-variant">• ' + esc(place.price) + '</span>' : '') + '</p>';
        }
        var details = '';
        if (place.hours) details += '<p class="flex items-center gap-1.5"><span class="material-symbols-outlined text-[15px] text-primary" aria-hidden="true">schedule</span>' + esc(place.hours) + '</p>';
        if (place.address) details += '<p class="flex items-center gap-1.5"><span class="material-symbols-outlined text-[15px] text-primary" aria-hidden="true">location_on</span>' + esc(place.address) + '</p>';
        if (place.phone) details += '<p class="flex items-center gap-1.5"><span class="material-symbols-outlined text-[15px] text-primary" aria-hidden="true">call</span>' + esc(place.phone) + '</p>';
        if (details) details = '<div class="mt-2 space-y-1 text-xs font-semibold text-on-surface-variant">' + details + '</div>';
        return '<article class="overflow-hidden rounded-2xl border border-outline-variant/30 bg-surface-container-low p-4 shadow-xs">'
            + photo
            + '<div class="flex items-start justify-between gap-3"><div class="min-w-0">'
            + '<p class="flex flex-wrap items-center gap-2">'
            + '<span class="rounded-full bg-surface-container px-2 py-0.5 text-xs font-bold text-primary">' + esc(place.distance) + '</span>'
            + '<span class="text-xs font-semibold text-secondary">' + esc(place.category_label) + '</span></p>'
            + '<h2 class="mt-1 font-headline text-lg leading-snug font-bold">' + esc(place.name) + '</h2></div>'
            + badge + '</div>'
            + '<p class="mt-2 text-sm leading-relaxed text-on-surface-variant">' + esc(place.blurb) + '</p>'
            + rating + details
            + '<p class="mt-2.5 flex items-center gap-1.5 text-xs font-semibold text-on-surface-variant">'
            + '<span class="material-symbols-outlined text-[15px] text-primary" aria-hidden="true">directions_car</span> '
            + place.drive_min + ' min drive <span aria-hidden="true">•</span> '
            + '<span class="material-symbols-outlined text-[15px] text-primary" aria-hidden="true">schedule</span> '
            + 'About ' + place.visit_min + ' min here</p></article>';
    }

    function initSearch() {
        var resultsBox = document.getElementById('search-results');
        var form = document.getElementById('search-form');
        if (!resultsBox || !form) return;
        var input = document.getElementById('search-q');
        var summary = document.getElementById('search-summary');

        function render(query) {
            var results = fakeSearch(query);
            if (summary) {
                summary.textContent = query
                    ? results.length + (results.length === 1 ? ' result' : ' results') + ' for \u201C' + query + '\u201D'
                    : 'All spots near the park';
            }
            if (results.length) {
                resultsBox.innerHTML = results.map(searchCardHtml).join('');
            } else {
                resultsBox.innerHTML = '<div class="rounded-2xl border border-outline-variant/40 bg-surface-container p-4">'
                    + '<p class="text-sm font-bold">Nothing near the park matches \u201C' + esc(query) + '\u201D yet.</p>'
                    + '<p class="mt-1 text-sm leading-relaxed text-on-surface-variant">Try a single word \u2014 \u201Cfood\u201D, \u201Cbeach\u201D, \u201Ckayak\u201D, \u201Cpropane\u201D, or \u201Claundry\u201D all turn up something good around here.</p></div>';
            }
        }

        form.addEventListener('submit', function (event) {
            event.preventDefault();
            render(input.value.trim());
        });

        var fromUrl = new URLSearchParams(window.location.search).get('q');
        if (fromUrl) {
            input.value = fromUrl;
            render(fromUrl.trim());
        }
    }

    // ---- Plan My Day page ----

    function stopHtml(stop, index) {
        return '<div class="flex items-center gap-2 pl-5 text-xs font-bold text-secondary" aria-label="Drive to next stop">'
            + '<span class="material-symbols-outlined text-[16px]" aria-hidden="true">directions_car</span> '
            + stop.leg_min + ' min drive</div>'
            + '<article class="rounded-2xl border border-outline-variant/30 bg-surface-container-low p-4 shadow-xs">'
            + '<p class="flex flex-wrap items-center gap-2">'
            + '<span class="rounded-full bg-primary px-2.5 py-0.5 text-xs font-bold text-on-primary">Stop ' + (index + 1) + '</span>'
            + '<span class="text-xs font-semibold text-secondary">' + esc(stop.category_label) + '</span>'
            + '<span class="text-xs font-semibold text-on-surface-variant">' + esc(stop.distance) + '</span></p>'
            + '<h2 class="mt-1.5 font-headline text-lg leading-snug font-bold">' + esc(stop.name) + '</h2>'
            + '<p class="mt-1 text-sm leading-relaxed text-on-surface-variant">' + esc(stop.blurb) + '</p>'
            + '<p class="mt-2.5 flex items-center gap-1.5 text-xs font-semibold text-on-surface-variant">'
            + '<span class="material-symbols-outlined text-[15px] text-primary" aria-hidden="true">schedule</span> '
            + 'About ' + stop.visit_min + ' min here</p></article>';
    }

    // The plan page's map is a saved image per plan length (baked from
    // real OpenStreetMap tiles by `manage.py build_plan_maps`): swapping
    // the picture is all the page has to do when the hours change.
    function updatePlanMap(hours) {
        var img = document.getElementById('plan-map');
        if (!img) return;
        var maps = window.SHOWCASE_PLAN_MAPS || {};
        var key = String(hours);
        if (!maps[key]) {
            var best = null;
            Object.keys(maps).forEach(function (candidate) {
                var value = parseFloat(candidate);
                if (best === null || Math.abs(value - hours) < Math.abs(best - hours)) best = value;
            });
            if (best === null) return;
            key = String(best);
        }
        var src = maps[key];
        if (!src) return;
        var full = src.indexOf('http') === 0 ? src : (window.SHOWCASE_ASSET_BASE || '/static/') + src;
        if (img.getAttribute('src') !== full) img.src = full;
    }

    function routeSummaryHtml(stops) {
        return stops.map(function (stop, index) {
            return '<p class="flex items-center gap-2 text-xs font-semibold text-on-surface-variant">'
                + '<span class="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#c05621] text-[11px] font-bold text-white">' + (index + 1) + '</span>'
                + '<span class="min-w-0 flex-1 truncate text-on-surface">' + esc(stop.name) + '</span>'
                + '<span class="shrink-0">' + stop.leg_min + ' min drive · ' + esc(stop.distance) + '</span></p>';
        }).join('');
    }

    function initPlan() {
        var stopsBox = document.getElementById('plan-stops');
        var form = document.getElementById('plan-form');
        if (!stopsBox || !form) return;
        var input = document.getElementById('plan-hours');
        var totalLine = document.getElementById('plan-total');
        var metaLine = document.getElementById('plan-meta');
        var chips = document.querySelectorAll('[data-hours-chip]');

        function render(hours) {
            var plan = fakePlan(hours);
            stopsBox.innerHTML = plan.stops.map(stopHtml).join('');
            updatePlanMap(hours);
            var summaryBox = document.getElementById('plan-route-summary');
            if (summaryBox) summaryBox.innerHTML = routeSummaryHtml(plan.stops);
            if (totalLine) {
                totalLine.innerHTML = 'Total: ' + formatMinutes(plan.total_min)
                    + ' <span class="font-semibold text-on-surface-variant">of your ' + formatMinutes(plan.budget_min) + '</span>';
            }
            if (metaLine) {
                metaLine.textContent = plan.stops.length + (plan.stops.length === 1 ? ' stop' : ' stops')
                    + ' • ' + formatMinutes(plan.travel_min) + ' of driving • Times are sample data for this demo guide.';
            }
            chips.forEach(function (chip) {
                var active = parseFloat(chip.getAttribute('data-hours-chip')) === hours;
                chip.setAttribute('aria-current', active ? 'true' : 'false');
                chip.className = 'rounded-full px-3.5 py-1.5 text-xs font-bold shadow-xs transition-all active:scale-95 '
                    + (active ? 'bg-primary text-on-primary' : 'bg-surface-container text-on-surface-variant hover:bg-surface-container-high');
            });
        }

        form.addEventListener('submit', function (event) {
            event.preventDefault();
            var hours = parseFloat(input.value);
            if (!isFinite(hours) || hours < 1 || hours > 12) hours = 4;
            input.value = (hours === Math.floor(hours)) ? String(Math.floor(hours)) : String(hours);
            render(hours);
        });

        chips.forEach(function (chip) {
            chip.addEventListener('click', function (event) {
                event.preventDefault();
                var hours = parseFloat(chip.getAttribute('data-hours-chip'));
                input.value = String(Math.floor(hours));
                render(hours);
            });
        });

        var fromUrl = parseFloat(new URLSearchParams(window.location.search).get('hours'));
        var initial = (isFinite(fromUrl) && fromUrl >= 1 && fromUrl <= 12) ? fromUrl : parseFloat(input.value);
        if (!isFinite(initial) || initial < 1 || initial > 12) initial = 4;
        input.value = (initial === Math.floor(initial)) ? String(Math.floor(initial)) : String(initial);
        render(initial);
    }

    document.addEventListener('DOMContentLoaded', function () {
        initSearch();
        initPlan();
    });
})();
