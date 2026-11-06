// Guest guide: copy buttons, category filters, the sponsor carousel and the add to home screen card.
// Every page works without this script; it only adds conveniences.
(function () {
    const toast = document.getElementById('guide-toast');
    let toastTimer = null;

    function showToast(message) {
        if (!toast) return;
        toast.querySelector('[data-toast-message]').textContent = message;
        toast.classList.replace('opacity-0', 'opacity-100');
        clearTimeout(toastTimer);
        toastTimer = setTimeout(() => toast.classList.replace('opacity-100', 'opacity-0'), 2200);
    }

    // Copy buttons: <button data-copy="text" data-copy-message="Copied!">
    document.querySelectorAll('[data-copy]').forEach((button) => {
        button.addEventListener('click', () => {
            if (!navigator.clipboard) {
                showToast(button.dataset.copy);
                return;
            }
            navigator.clipboard.writeText(button.dataset.copy)
                .then(() => showToast(button.dataset.copyMessage || 'Copied!'))
                .catch(() => showToast(button.dataset.copy));
        });
    });

    // Filter chips: show only the [data-category] cards matching the pressed chip
    document.querySelectorAll('[data-filter-chips]').forEach((group) => {
        const list = document.getElementById(group.dataset.filterChips);
        if (!list) return;
        const chips = group.querySelectorAll('[data-filter]');

        chips.forEach((chip) => {
            chip.addEventListener('click', () => {
                const filter = chip.dataset.filter;
                chips.forEach((other) => other.setAttribute('aria-pressed', String(other === chip)));
                list.querySelectorAll('[data-category]').forEach((card) => {
                    card.hidden = filter !== 'all' && card.dataset.category !== filter;
                });
            });
        });
    });

    // Carousel: a horizontal scroll-snap track that auto-rotates, plus arrows and dots
    document.querySelectorAll('[data-carousel]').forEach((carousel) => {
        const track = carousel.querySelector('[data-carousel-track]');
        const slides = Array.from(track.children);
        const dots = carousel.querySelectorAll('[data-carousel-dot]');
        if (slides.length < 2) return;

        let index = 0;
        const markDot = (active) => {
            index = active;
            dots.forEach((dot, i) => dot.setAttribute('aria-current', String(i === active)));
        };
        const goTo = (target) => {
            const next = (target + slides.length) % slides.length;
            markDot(next);
            track.scrollTo({ left: next * track.clientWidth });
        };
        // Keep the dots in sync when guests swipe
        let scrollTimer = null;
        const onScroll = () => {
            clearTimeout(scrollTimer);
            scrollTimer = setTimeout(() => markDot(Math.round(track.scrollLeft / track.clientWidth)), 100);
        };

        carousel.querySelector('[data-carousel-prev]').addEventListener('click', () => goTo(index - 1));
        carousel.querySelector('[data-carousel-next]').addEventListener('click', () => goTo(index + 1));
        dots.forEach((dot) => dot.addEventListener('click', () => goTo(Number(dot.dataset.carouselDot))));
        track.addEventListener('scroll', onScroll, { passive: true });

        // Rotate every few seconds; pause while guests hover, touch or focus the carousel
        let paused = false;
        const pause = () => { paused = true; };
        const resume = () => { paused = false; };
        carousel.addEventListener('mouseenter', pause);
        carousel.addEventListener('mouseleave', resume);
        carousel.addEventListener('focusin', pause);
        carousel.addEventListener('focusout', resume);
        track.addEventListener('touchstart', pause, { passive: true });
        track.addEventListener('touchend', () => setTimeout(resume, 4000), { passive: true });
        setInterval(() => {
            if (!paused && !document.hidden) goTo(index + 1);
        }, 3000);

        markDot(0);
        carousel.setAttribute('data-carousel-ready', '');
    });

    // Add to home screen: the Home card and the Contact tab link ([data-install]).
    // A real install where the browser offers one (Chrome, Edge, Samsung Internet), otherwise
    // step-by-step instructions on iPhone, iPad and Android; hidden on other desktops.
    const installBlocks = document.querySelectorAll('[data-install]');
    if (installBlocks.length) {
        const SNOOZE_MS = 24 * 60 * 60 * 1000; // ✕ hides the Home card for a day
        // Opened from the home screen: the installed app's own window. Not 'fullscreen', which
        // also matches a regular browser tab while the browser is in full screen.
        let installed = ['standalone', 'minimal-ui', 'window-controls-overlay']
            .some((mode) => window.matchMedia(`(display-mode: ${mode})`).matches)
            || navigator.standalone === true;
        // iPadOS reports itself as a Mac, so also check for a touch screen
        const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent)
            || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
        const isAndroid = /android/i.test(navigator.userAgent);
        const snoozeKey = (block) => `guide-install-snoozed:${block.dataset.install}`;
        const snoozed = (block) => {
            if (!block.querySelector('[data-install-dismiss]')) return false;
            try {
                return Date.now() - Number(localStorage.getItem(snoozeKey(block))) < SNOOZE_MS;
            } catch (error) {
                return false; // storage blocked (private browsing)
            }
        };
        let installPrompt = null;
        const show = () => {
            if (installed) return;
            installBlocks.forEach((block) => {
                if (!snoozed(block)) block.hidden = false;
            });
        };
        const hide = () => installBlocks.forEach((block) => {
            block.hidden = true;
        });

        window.addEventListener('beforeinstallprompt', (event) => {
            // Skip the browser's own install bar; our buttons show the prompt instead
            event.preventDefault();
            installPrompt = event;
            show();
        });
        window.addEventListener('appinstalled', hide);
        // Chrome doesn't always offer its prompt (just after an uninstall, after a cancel, or
        // without HTTPS), so phones always get the card, with steps when there's no prompt
        if (isIOS || isAndroid) show();
        // Chrome on Android: a browser tab can ask whether the guide is already installed
        if (!installed && navigator.getInstalledRelatedApps) {
            navigator.getInstalledRelatedApps().then((apps) => {
                if (!apps.length) return;
                installed = true;
                hide();
            }).catch(() => {});
        }

        installBlocks.forEach((block) => {
            block.querySelector('[data-install-button]').addEventListener('click', async () => {
                if (installPrompt) {
                    installPrompt.prompt();
                    const { outcome } = await installPrompt.userChoice;
                    installPrompt = null; // each prompt can only be shown once
                    if (outcome === 'accepted') hide();
                } else if (isIOS || isAndroid) {
                    block.querySelector(`[data-install-steps="${isIOS ? 'ios' : 'android'}"]`).hidden = false;
                } else {
                    hide();
                }
            });
            const dismiss = block.querySelector('[data-install-dismiss]');
            if (!dismiss) return;
            dismiss.addEventListener('click', () => {
                block.hidden = true;
                try {
                    localStorage.setItem(snoozeKey(block), String(Date.now()));
                } catch (error) {
                    // Storage blocked: hidden for this visit only
                }
            });
        });
    }
})();
