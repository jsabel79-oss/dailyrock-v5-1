#!/usr/bin/env node

const { spawn } = require('node:child_process');
const { networkInterfaces } = require('node:os');

function getLanIpAddress() {
  const interfaces = networkInterfaces();

  for (const addresses of Object.values(interfaces)) {
    for (const address of addresses ?? []) {
      if (address.family !== 'IPv4' || address.internal) {
        continue;
      }

      if (/^(10\.|172\.(1[6-9]|2\d|3[0-1])\.|192\.168\.)/.test(address.address)) {
        return address.address;
      }
    }
  }

  for (const addresses of Object.values(interfaces)) {
    for (const address of addresses ?? []) {
      if (address.family === 'IPv4' && !address.internal) {
        return address.address;
      }
    }
  }

  return null;
}

const lanIpAddress = getLanIpAddress();
const expoArgs = ['expo', 'start', '--lan', ...process.argv.slice(2)];
const env = { ...process.env };

delete env.EXPO_PACKAGER_PROXY_URL;

if (lanIpAddress) {
  env.REACT_NATIVE_PACKAGER_HOSTNAME = lanIpAddress;
  console.log(`Starting Expo on LAN host ${lanIpAddress}`);
} else {
  delete env.REACT_NATIVE_PACKAGER_HOSTNAME;
  console.warn('No non-loopback IPv4 address was found; Expo will infer the LAN host.');
}

const child = spawn('npx', expoArgs, {
  stdio: 'inherit',
  shell: process.platform === 'win32',
  env,
});

child.on('exit', (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }

  process.exit(code ?? 0);
});
