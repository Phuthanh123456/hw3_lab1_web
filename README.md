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
- `registration.js` contains the form state machine, input validation, and a local submit simulator with selectable success/error outcomes for tests.
- `app.js` connects the countdown and registration modules to the page.

The registration form trims outer whitespace, accepts names up to 100 characters, and accepts email addresses up to 254 characters. Submitted names are displayed as text.

Registration is a demo: it simulates success in the browser and does not send form data to a server.

## Run the checks

Run the countdown, registration, and safe-output checks with `node --test tests/countdown.test.mjs tests/registration.test.mjs tests/registration-output.test.mjs`.
