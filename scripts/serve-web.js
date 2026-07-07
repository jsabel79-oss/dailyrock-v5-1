#!/usr/bin/env node
const http = require('node:http');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const port = Number(process.env.PORT || 5173);
const host = process.env.HOST || '0.0.0.0';
const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8' };

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
    printStartupUrls(server.address().port);
  });
}

module.exports = { localNetworkUrls, printStartupUrls, server };
