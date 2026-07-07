# Daily Rock V5.1

A freshly scaffolded Expo SDK 54 project containing the migrated Daily Rock V5 application.

## Why SDK 54?

Expo's current create-expo-app documentation notes that during the SDK 57 transition period, physical-device Expo Go projects should use SDK 54. This project therefore uses the current recommended Expo Go-compatible SDK and a clean Expo entry point instead of the previous repaired configuration.

## Run on a physical iPhone with Expo Go

```sh
npm install
npx expo start --host lan --go
```

The project `npm start` script runs `scripts/start-expo-lan.js`, which selects a non-loopback LAN IPv4 address and sets `REACT_NATIVE_PACKAGER_HOSTNAME` before launching Expo in LAN mode.
