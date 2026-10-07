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
- `app.js` is the ES module entry point for later milestones; feature behavior is not implemented yet.
