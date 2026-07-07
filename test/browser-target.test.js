const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');

const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
const readme = fs.readFileSync('README.md', 'utf8');
const { localNetworkUrls, printStartupUrls } = require('../scripts/serve-web');

test('uses the local browser server as the primary start target', () => {
  assert.equal(packageJson.scripts.start, 'node scripts/serve-web.js');
  assert.equal(packageJson.scripts.dev, 'node scripts/serve-web.js');
});

test('keeps Expo commands out of the active package scripts', () => {
  assert.equal(Object.values(packageJson.scripts).some((script) => script.includes('expo')), false);
});

test('documents Windows browser as the primary target', () => {
  assert.match(readme, /Windows browser/i);
  assert.match(readme, /primary/i);
  assert.doesNotMatch(readme, /Verify on a physical iPhone/i);
});

test('prints reachable LAN URLs for Windows browser access from another device when needed', () => {
  const originalNetworkInterfaces = os.networkInterfaces;
  os.networkInterfaces = () => ({
    lo: [{ family: 'IPv4', internal: true, address: '127.0.0.1' }],
    ethernet: [{ family: 'IPv4', internal: false, address: '192.168.1.20' }],
  });

  try {
    assert.deepEqual(localNetworkUrls(5173), ['http://192.168.1.20:5173']);
  } finally {
    os.networkInterfaces = originalNetworkInterfaces;
  }
});

test('startup copy points users to localhost in a Windows browser, not iPhone setup', () => {
  const logs = [];
  const originalLog = console.log;
  const originalNetworkInterfaces = os.networkInterfaces;
  os.networkInterfaces = () => ({
    ethernet: [{ family: 'IPv4', internal: false, address: '192.168.1.20' }],
  });
  console.log = (message) => logs.push(message);

  try {
    printStartupUrls(5173);
  } finally {
    console.log = originalLog;
    os.networkInterfaces = originalNetworkInterfaces;
  }

  assert.match(logs.join('\n'), /Windows browser/i);
  assert.doesNotMatch(logs.join('\n'), /iPhone/i);
});
