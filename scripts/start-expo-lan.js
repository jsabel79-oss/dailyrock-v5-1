#!/usr/bin/env node

const { spawn } = require('node:child_process');
const { networkInterfaces } = require('node:os');

const CONFIGURED_LAN_IP = '192.168.1.233';
const HOST_ENV_KEYS = ['EXPO_LAN_IP', 'DAILYROCK_EXPO_HOST', 'REACT_NATIVE_PACKAGER_HOSTNAME'];

function isIPv4Address(value) {
  return /^(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}$/.test(value);
}

function isPrivateIPv4Address(value) {
  return /^(10\.|172\.(1[6-9]|2\d|3[0-1])\.|192\.168\.)/.test(value);
}

function isLikelyVirtualAddress(value) {
  return /^(172\.(1[6-9]|2\d|3[0-1])\.|169\.254\.)/.test(value);
}

function getConfiguredHost(env = process.env) {
  for (const key of HOST_ENV_KEYS) {
    const value = env[key]?.trim();

    if (!value) {
      continue;
    }

    if (!isIPv4Address(value) || value.startsWith('127.')) {
      throw new Error(`${key} must be a non-loopback IPv4 address. Received: ${value}`);
    }

    return { address: value, source: key };
  }

  return null;
}

function getLanIpAddress(interfaces = networkInterfaces(), env = process.env) {
  const configuredHost = getConfiguredHost(env);

  if (configuredHost) {
    return configuredHost;
  }

  const candidates = [];

  for (const addresses of Object.values(interfaces)) {
    for (const address of addresses ?? []) {
      if (address.family !== 'IPv4' || address.internal || !isPrivateIPv4Address(address.address)) {
        continue;
      }

      candidates.push(address.address);
    }
  }

  const configuredCandidate = candidates.find((address) => address === CONFIGURED_LAN_IP);
  if (configuredCandidate) {
    return { address: configuredCandidate, source: 'network interface' };
  }

  const physicalLanCandidate = candidates.find((address) => !isLikelyVirtualAddress(address));
  if (physicalLanCandidate) {
    return { address: physicalLanCandidate, source: 'network interface' };
  }

  if (isIPv4Address(CONFIGURED_LAN_IP)) {
    return { address: CONFIGURED_LAN_IP, source: 'project LAN configuration' };
  }

  const privateCandidate = candidates[0];
  if (privateCandidate) {
    return { address: privateCandidate, source: 'network interface' };
  }

  for (const addresses of Object.values(interfaces)) {
    for (const address of addresses ?? []) {
      if (address.family === 'IPv4' && !address.internal) {
        return { address: address.address, source: 'network interface' };
      }
    }
  }

  return null;
}

function startExpo() {
  const lanHost = getLanIpAddress();
  const expoArgs = ['expo', 'start', '--lan', ...process.argv.slice(2)];
  const env = { ...process.env };

  delete env.EXPO_PACKAGER_PROXY_URL;

  if (lanHost) {
    env.REACT_NATIVE_PACKAGER_HOSTNAME = lanHost.address;
    console.log(`Starting Expo on LAN host ${lanHost.address} (${lanHost.source})`);
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
}

if (require.main === module) {
  startExpo();
}

module.exports = {
  CONFIGURED_LAN_IP,
  getLanIpAddress,
  isIPv4Address,
};
