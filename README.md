# HW3 — Resilient Event Hub

A responsive, framework-free event landing page with a drift-free countdown and a local registration-form demo. It uses Vanilla HTML, CSS, and JavaScript ES modules; no library or CDN is required.

## Run locally

Install Python 3, open a terminal in this project folder, and start a local HTTP server:

```powershell
py -m http.server 8003
```

Open <http://localhost:8003>. HW3 uses port **8003** so it can run beside HW1 (8001) and HW2 (8002). The browser must load the ES modules over HTTP; do not open `index.html` with `file://`. Stop the server with `Ctrl+C`.

## Features

- The countdown accepts an ISO 8601 UTC target ending in `Z`. It recalculates from the current timestamp on each tick, displays days through seconds, and disposes its timer when stopped or expired.
- The registration flow uses the `Idle → Submitting → Success/Error` state machine. It validates and trims input, prevents duplicate submits, and writes user-provided text safely.
- Registration is a browser-only demonstration. It simulates a result and does not send form data to a server.

## Change the demo countdown date

Edit `COUNTDOWN_TARGET_UTC` in `countdown-config.js`. Use a valid UTC timestamp with the `Z` suffix, for example `2026-12-31T23:59:59Z`. The countdown rejects timestamps without an explicit UTC timezone.

## Run the checks

Install Node.js, then run the countdown, state-machine, and safe-output tests from the project folder:

```powershell
node --test tests/countdown.test.mjs tests/registration.test.mjs tests/registration-output.test.mjs
```

## Project files

- `index.html` and `styles.css` define the event page, countdown display, registration controls, and responsive focus styles.
- `countdown-config.js` holds the editable demo target; `countdown.js` validates UTC timestamps and owns the countdown timer.
- `registration.js` contains validation, the legal state transitions, the injectable local submit simulator, and the form controller.
- `app.js` connects those independent modules to the page.
- `tests/` covers countdown parsing/calculation, form-state transitions, failure/retry, and safe output.
- `AI_FAILURE_AUDIT.md` records three actual AI-introduced defects found and corrected during review, with commit evidence.
