# Daily Rock V5.1

Daily Rock is a browser application that can be opened from a desktop browser or from Safari on a physical iPhone connected to the same network as the development machine. The app keeps the same schedule, Ghost template, Lists, Settings, edit modal, time snapping, drag-to-move, resize, and dark UI direction.

## Run the app from a clean checkout

```sh
npm ci
npm start
```

The server listens on all interfaces by default and prints both:

- a local desktop URL, usually <http://localhost:5173>
- one or more LAN URLs, such as `http://192.168.1.20:5173`

## Verify on a physical iPhone

1. Connect the iPhone to the same Wi-Fi network as the computer running `npm start`.
2. Open the printed LAN URL in Safari on the iPhone. Do not use `localhost` on the iPhone, because that points back to the phone itself rather than the development machine.
3. If the LAN URL does not load, confirm that the computer firewall allows inbound connections to the printed port, then restart with an explicit port if needed:

```sh
PORT=5173 npm start
```

## Development target

The primary launch target is the browser over localhost or LAN. Expo commands are intentionally not part of the active scripts for this browser build.
