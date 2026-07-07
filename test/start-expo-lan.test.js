const test = require('node:test');
const assert = require('node:assert/strict');

const {
  buildExpoArgs,
  buildExpoEnv,
  getLanIpAddress,
  isIPv4Address,
} = require('../scripts/start-expo-lan');

test('selects a physical private LAN address from network interfaces', () => {
  const result = getLanIpAddress({
    lo: [{ family: 'IPv4', internal: true, address: '127.0.0.1' }],
    docker0: [{ family: 'IPv4', internal: false, address: '172.17.0.1' }],
    en0: [{ family: 'IPv4', internal: false, address: '192.168.1.42' }],
  }, {});

  assert.deepEqual(result, { address: '192.168.1.42', source: 'network interface' });
});

test('does not fall back to localhost or a hard-coded LAN address', () => {
  const result = getLanIpAddress({
    lo: [{ family: 'IPv4', internal: true, address: '127.0.0.1' }],
  }, {});

  assert.equal(result, null);
});

test('honors an explicit non-loopback host override', () => {
  const result = getLanIpAddress({}, { EXPO_LAN_IP: '10.0.0.25' });

  assert.deepEqual(result, { address: '10.0.0.25', source: 'EXPO_LAN_IP' });
});

test('rejects localhost host overrides', () => {
  assert.throws(
    () => getLanIpAddress({}, { REACT_NATIVE_PACKAGER_HOSTNAME: '127.0.0.1' }),
    /must be a non-loopback IPv4 address/
  );
});

test('builds an Expo LAN environment that cannot advertise localhost', () => {
  const env = buildExpoEnv({
    EXPO_PACKAGER_PROXY_URL: 'http://127.0.0.1:8081',
    REACT_NATIVE_PACKAGER_HOSTNAME: '127.0.0.1',
  }, { address: '192.168.1.42', source: 'network interface' });

  assert.equal(env.REACT_NATIVE_PACKAGER_HOSTNAME, '192.168.1.42');
  assert.equal(env.EXPO_PACKAGER_PROXY_URL, undefined);
});

test('passes Expo an explicit LAN host mode', () => {
  assert.deepEqual(buildExpoArgs(['--go']), ['expo', 'start', '--host', 'lan', '--go']);
});

test('validates IPv4 strings', () => {
  assert.equal(isIPv4Address('192.168.1.42'), true);
  assert.equal(isIPv4Address('127.0.0.1'), true);
  assert.equal(isIPv4Address('localhost'), false);
});
