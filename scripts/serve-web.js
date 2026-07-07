#!/usr/bin/env node
const http = require('node:http');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawn } = require('node:child_process');

const root = path.resolve(__dirname, '..');
const webConfig = require('../web.config.json');
const port = Number(process.env.PORT || webConfig.port || 5173);
const host = process.env.HOST || webConfig.host || '0.0.0.0';
const types = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.ico': 'image/x-icon',
};

function localNetworkUrls(boundPort = port) {
  return Object.values(os.networkInterfaces())
    .flat()
    .filter((networkInterface) => networkInterface && networkInterface.family === 'IPv4' && !networkInterface.internal)
    .map((networkInterface) => `http://${networkInterface.address}:${boundPort}`);
}

function printStartupUrls(boundPort = port) {
  console.log(`Daily Rock Windows browser app running at http://localhost:${boundPort}`);
  const urls = localNetworkUrls(boundPort);
  if (urls.length === 0) {
    console.log('No LAN IPv4 address found. The Windows browser can still use the localhost URL above.');
    return;
  }
  console.log('Optional LAN URLs for another browser on your network:');
  urls.forEach((url) => console.log(`  ${url}`));
}

function browserOpenCommand(url, platform = process.platform) {
  if (platform === 'win32') {
    return { command: 'cmd', args: ['/c', 'start', '', url], options: { shell: false, stdio: 'ignore' } };
  }

  if (platform === 'darwin') {
    return { command: 'open', args: [url], options: { stdio: 'ignore' } };
  }

  return { command: 'xdg-open', args: [url], options: { stdio: 'ignore' } };
}

function openBrowser(url) {
  const { command, args, options } = browserOpenCommand(url);
  const child = spawn(command, args, options);
  child.on('error', (error) => {
    console.warn(`Unable to open the browser automatically: ${error.message}`);
  });
  child.unref();
}

function shouldOpenBrowser(argv = process.argv) {
  if (argv.includes('--no-open')) return false;
  if (argv.includes('--open')) return true;
  return Boolean(webConfig.open);
}

const server = http.createServer((request, response) => {
  const url = new URL(request.url || '/', `http://${request.headers.host || 'localhost'}`);
  const pathname = decodeURIComponent(url.pathname === '/' ? '/index.html' : url.pathname);
  const filePath = path.normalize(path.join(root, pathname));

  if (!filePath.startsWith(root)) {
    response.writeHead(403).end('Forbidden');
    return;
  }

  fs.readFile(filePath, (error, content) => {
    if (error) {
      response.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' }).end('Not found');
      return;
    }

    response.writeHead(200, { 'content-type': types[path.extname(filePath)] || 'application/octet-stream' });
    response.end(content);
  });
});

if (require.main === module) {
  server.listen(port, host, () => {
    const boundPort = server.address().port;
    const localUrl = `http://localhost:${boundPort}`;
    printStartupUrls(boundPort);
    if (shouldOpenBrowser()) {
      openBrowser(localUrl);
    }
  });
}

module.exports = { browserOpenCommand, localNetworkUrls, openBrowser, printStartupUrls, server, shouldOpenBrowser };
