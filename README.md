# Magnolia RV Resort guest guide (static demo)

The five guide tabs (`index.html`, `stay.html`, `nearby.html`, `sponsors.html`, `contact.html`) were exported from LocalGuide on 2026-11-05 with:

    python backend/manage.py export_static_guide magnolia-rv-resort

and flattened into this folder, with assets under `assets/`. Matt's Search and Plan My Day showcase (`search.html`, `plan.html`, `assets/pages/js/showcase.js`) runs in the browser and keeps its own stylesheet, `assets/css/showcase.css`.

- **Park details** come from magnoliarvresort.com. Wi-Fi, check-in and check-out times, quiet hours and the rules are sample values.
- **Sponsors** are the 19 Waco businesses the client picked. Their photos are free Unsplash stock photos, not the businesses' own.
- **Search** covers the Nearby places and all sponsors. Distances and drive times are estimates from map coordinates.
- **Plan My Day** still uses the original sample places.

This is a snapshot: re-export after content changes and publish the new files.

## Publish on GitHub Pages

In this repository: Settings > Pages > Deploy from a branch, and pick `showcase-preview` and `/ (root)`.
