const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');

const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
const readme = fs.readFileSync('README.md', 'utf8');
const webConfig = JSON.parse(fs.readFileSync('web.config.json', 'utf8'));
const { browserOpenCommand, localNetworkUrls, printStartupUrls, shouldOpenBrowser } = require('../scripts/serve-web');

test('provides npm run web as the primary Windows browser target', () => {
  assert.equal(packageJson.scripts.web, 'node scripts/serve-web.js --open');
  assert.equal(packageJson.scripts.start, 'npm run web');
  assert.equal(packageJson.scripts.dev, 'node scripts/serve-web.js --open');
});

test('keeps Expo commands out of the active package scripts', () => {
  assert.equal(Object.values(packageJson.scripts).some((script) => script.includes('expo')), false);
});

test('documents Windows browser as the primary target', () => {
  assert.match(readme, /Windows browser/i);
  assert.match(readme, /npm run web/i);
  assert.doesNotMatch(readme, /Verify on a physical iPhone/i);
});

test('configures the web server to bind locally and open the browser', () => {
  assert.equal(webConfig.host, '0.0.0.0');
  assert.equal(webConfig.port, 5173);
  assert.equal(webConfig.open, true);
  assert.deepEqual(webConfig.dependencies, []);
  assert.deepEqual(webConfig.aliases, {});
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

test('uses the native Windows command that opens the default browser', () => {
  assert.deepEqual(browserOpenCommand('http://localhost:5173', 'win32'), {
    command: 'cmd',
    args: ['/c', 'start', '', 'http://localhost:5173'],
    options: { shell: false, stdio: 'ignore' },
  });
});

test('allows browser opening to be disabled for automation', () => {
  assert.equal(shouldOpenBrowser(['node', 'scripts/serve-web.js', '--no-open']), false);
  assert.equal(shouldOpenBrowser(['node', 'scripts/serve-web.js', '--open']), true);
});


test('keeps the browser app dependency-free so npm install works from a fresh clone', () => {
  assert.equal(Object.hasOwn(packageJson, 'dependencies'), false);
});
