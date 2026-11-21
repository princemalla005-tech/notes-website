#!/usr/bin/env node
'use strict';

/*
 * Tiny zero-dependency static server for previewing dist/ locally.
 * Usage: npm run preview   (or: node scripts/serve-static.js)
 */

const fs = require('node:fs');
const http = require('node:http');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..', 'dist');
const HOST = process.env.HOST || '127.0.0.1';
const PORT = Number(process.env.PORT) || 4174;

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.txt': 'text/plain; charset=utf-8'
};

function send(res, status, body, headers) {
  res.writeHead(status, Object.assign({
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'Referrer-Policy': 'no-referrer'
  }, headers || {}));
  res.end(body);
}

if (!fs.existsSync(path.join(ROOT, 'index.html'))) {
  console.error('dist/index.html not found. Run "npm run build:static" first.');
  process.exit(1);
}

const server = http.createServer((req, res) => {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    send(res, 405, 'Method Not Allowed', { 'Content-Type': 'text/plain; charset=utf-8' });
    return;
  }

  let pathname;
  try {
    pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
  } catch {
    send(res, 400, 'Bad Request', { 'Content-Type': 'text/plain; charset=utf-8' });
    return;
  }

  if (pathname === '/') pathname = '/index.html';
  const file = path.resolve(ROOT, '.' + pathname);

  if (file !== ROOT && !file.startsWith(ROOT + path.sep)) {
    send(res, 403, 'Forbidden', { 'Content-Type': 'text/plain; charset=utf-8' });
    return;
  }

  fs.stat(file, (statError, stat) => {
    if (statError || !stat.isFile()) {
      send(res, 404, 'Not Found', { 'Content-Type': 'text/plain; charset=utf-8' });
      return;
    }

    const ext = path.extname(file).toLowerCase();
    const headers = {
      'Content-Type': MIME[ext] || 'application/octet-stream',
      'Content-Length': stat.size,
      'Cache-Control': ext === '.html' ? 'no-cache' : 'public, max-age=3600'
    };

    if (req.method === 'HEAD') {
      res.writeHead(200, headers);
      res.end();
      return;
    }

    const stream = fs.createReadStream(file);
    stream.on('error', () => {
      if (!res.headersSent) send(res, 500, 'Internal Server Error', { 'Content-Type': 'text/plain; charset=utf-8' });
      else res.destroy();
    });
    res.writeHead(200, headers);
    stream.pipe(res);
  });
});

server.listen(PORT, HOST, () => {
  console.log('Previewing ' + ROOT);
  console.log('Open http://' + HOST + ':' + PORT);
});
