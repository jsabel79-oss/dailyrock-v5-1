const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');

const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
const { localNetworkUrls } = require('../scripts/serve-web');

test('uses the local browser server as the primary start target', () => {
  assert.equal(packageJson.scripts.start, 'node scripts/serve-web.js');
});

test('keeps Expo commands out of the active package scripts', () => {
  assert.equal(Object.values(packageJson.scripts).some((script) => script.includes('expo')), false);
});

test('prints reachable LAN URLs for physical iPhone testing', () => {
  const originalNetworkInterfaces = os.networkInterfaces;
  os.networkInterfaces = () => ({
    lo: [{ family: 'IPv4', internal: true, address: '127.0.0.1' }],
    en0: [{ family: 'IPv4', internal: false, address: '192.168.1.20' }],
  });

  try {
    assert.deepEqual(localNetworkUrls(5173), ['http://192.168.1.20:5173']);
  } finally {
    os.networkInterfaces = originalNetworkInterfaces;
  }
});
