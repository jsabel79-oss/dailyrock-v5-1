const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));

test('uses the local browser server as the primary start target', () => {
  assert.equal(packageJson.scripts.start, 'node scripts/serve-web.js');
});

test('keeps Expo commands out of the active package scripts', () => {
  assert.equal(Object.values(packageJson.scripts).some((script) => script.includes('expo')), false);
});
