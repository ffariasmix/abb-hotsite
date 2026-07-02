# ABB Hotsite

Static, self-contained implementation of the **ABB Hotsite** (Banco do Brasil
beta-tester presentation + feedback portal), recreated from the Claude Design
export in `../project/ABB Hotsite.dc.html`.

No build step and no backend. Just static files.

## Structure

```
site/
├── index.html     # page markup (nav, hero, 7 experiences, capabilities, feedback, footer)
├── styles.css     # design system: BB navy #002D4B/#001e38, accent yellow #FADf00
├── app.js         # feedback form (type/rating/attachments), smooth scroll
└── assets/        # BB logo, hero, and the 7 experience images
```

## Run locally

```bash
cd site
python3 -m http.server 8000
# open http://localhost:8000
```

## Feedback routing

The form saves each entry to `localStorage` (key `abb_feedback`) and then:

1. **If `APPS_SCRIPT_URL` is set** (top of `app.js`): POSTs the feedback —
   including attachments as base64 — to a **Google Apps Script** web app in
   your own Google account, which saves attachments to Drive, logs a row in a
   Google Sheet, and emails the team. Setup:
   [`integrations/google-apps-script/README.md`](integrations/google-apps-script/README.md).
   This is the configured production path.
2. **If `APPS_SCRIPT_URL` is empty** (default): falls back to opening the
   visitor's mail client (`mailto:`) addressed to the list in `FEEDBACK_TO`.

**Before go-live:** set `APPS_SCRIPT_URL` (and/or confirm `FEEDBACK_TO`).

## Deploy — GitHub Pages

Automated via `../.github/workflows/deploy.yml`: every push to `main`
publishes `site/` to Pages. To turn it on:

1. Create a GitHub repo and push this project.
2. Repo **Settings → Pages → Build and deployment → Source: GitHub Actions**.
3. Push to `main`; the workflow builds and the site goes live at
   `https://<user>.github.io/<repo>/` (or your custom domain).

## Notes

- Hero and the "Conversacional" image ship as optimized WebP (~42 KB / ~79 KB,
  down from ~1.4 MB / ~1.9 MB PNG).
- The page is `noindex,nofollow` (internal beta). Remove that meta tag if the
  site should be publicly discoverable.
