// Guest guide: copy buttons, category filters and the sponsor carousel.
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
})();
