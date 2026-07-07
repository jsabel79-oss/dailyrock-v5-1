# Daily Rock V5.1

Daily Rock V5.1 is now a browser-first application for everyday use on Windows. Open it in a Windows browser and keep using the same Today schedule, Ghost template day, Lists, Settings, edit modal, time snapping, drag-to-move, resize, zoom, and dark UI direction while new features are built.

Expo Go and iPhone workflows are intentionally out of scope for this build until the Windows browser experience is complete and working.

## Run the app from a clean checkout

```sh
npm install
npm run web
```

The browser app is dependency-free at runtime and uses the built-in Node server in this repository, so a clean `npm install` does not need Expo web packages before `npm run web` launches the app.

The server listens on all interfaces by default and prints a Windows browser URL, usually <http://localhost:5173>, and automatically opens it. If your browser blocks automatic launch, open that URL in Microsoft Edge, Chrome, Firefox, or another modern browser on Windows.

If you need a different port, start the app with an explicit `PORT` value:

```sh
PORT=5174 npm run web
```

On Windows PowerShell, use:

```powershell
$env:PORT=5174; npm run web
```

## Web configuration

The browser server is configured in `web.config.json`. It binds to `0.0.0.0`, defaults to port `5173`, opens the default browser when launched through `npm run web`, and records that no Expo or React Native Web dependencies or aliases are required for local web delivery. The built-in Node server handles the browser app directly.

## Development target

The primary launch target is the Windows browser over localhost. Optional LAN URLs are printed only for convenience when another browser on the same network needs to reach the running development server. Expo commands are intentionally not part of the active scripts for this browser build.
