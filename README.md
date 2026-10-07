# HW3 Event Hub

## Run locally

From this folder, start a local HTTP server:

```powershell
py -m http.server 8000
```

Open <http://localhost:8000> in a browser. The page uses an ES module, so serve it over HTTP rather than opening `index.html` with `file://`.

## Files

- `index.html` contains the neutral event overview, countdown placeholders, registration form, and idle status region.
- `styles.css` contains the responsive layout and focus styles.
- `countdown-config.js` contains the demo target `COUNTDOWN_TARGET_UTC`; change it to another ISO 8601 UTC timestamp ending in `Z` to use a different date.
- `countdown.js` validates UTC timestamps, calculates remaining time from the current clock, and owns one disposable timer.
- `app.js` connects the countdown module to its display. Form behavior is not implemented yet.

## Check the countdown

Run the independent countdown checks with `node --test tests/countdown.test.mjs`.
