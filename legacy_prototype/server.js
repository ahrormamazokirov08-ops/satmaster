const http = require('http');
const fs = require('fs');
const path = require('path');
const { loadEnv, formatTelegramMessage, sendTelegramMessage } = require('./telegramService');

loadEnv();

const PORT = process.env.PORT || 3000;
const PUBLIC_DIR = path.join(__dirname, 'public');

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.woff': 'font/woff',
  '.ttf': 'font/ttf'
};

function serveStatic(req, res, filePath) {
  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('404 Not Found');
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    res.writeHead(200, {
      'Content-Type': contentType,
      'Cache-Control': 'public, max-age=3600'
    });

    const stream = fs.createReadStream(filePath);
    stream.pipe(res);
  });
}

const server = http.createServer((req, res) => {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  const url = new URL(req.url, `http://${req.headers.host}`);
  const pathname = url.pathname;

  // API: Submit answers
  if (req.method === 'POST' && pathname === '/api/submit') {
    let body = '';
    req.on('data', chunk => {
      body += chunk;
      // Protect against oversized payload (> 1MB)
      if (body.length > 1e6) {
        req.destroy();
      }
    });

    req.on('end', async () => {
      try {
        const payload = JSON.parse(body || '{}');
        const formatted = formatTelegramMessage(payload);
        const result = await sendTelegramMessage(formatted);

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          success: true,
          mock: result.mock || false,
          message: result.message || 'Answers delivered!'
        }));
      } catch (err) {
        console.error('Error processing quiz submission:', err);
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, error: 'Invalid payload' }));
      }
    });
    return;
  }

  // API: Configuration endpoint (returns optional redirect URL to frontend)
  if (req.method === 'GET' && pathname === '/api/config') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      finalRedirectUrl: process.env.FINAL_REDIRECT_URL || ''
    }));
    return;
  }

  // Static File Serving
  if (req.method === 'GET' || req.method === 'HEAD') {
    let safePath = path.normalize(pathname).replace(/^(\.\.[\/\\])+/, '');
    if (safePath === '/' || safePath === '') {
      safePath = '/index.html';
    }

    const filePath = path.join(PUBLIC_DIR, safePath);

    // Security check: ensure path is within PUBLIC_DIR
    if (!filePath.startsWith(PUBLIC_DIR)) {
      res.writeHead(403, { 'Content-Type': 'text/plain' });
      res.end('403 Forbidden');
      return;
    }

    fs.stat(filePath, (err, stats) => {
      if (!err && stats.isFile()) {
        serveStatic(req, res, filePath);
      } else {
        // Fallback to index.html for SPA routing
        serveStatic(req, res, path.join(PUBLIC_DIR, 'index.html'));
      }
    });
    return;
  }

  res.writeHead(405, { 'Content-Type': 'text/plain' });
  res.end('405 Method Not Allowed');
});

server.listen(PORT, () => {
  console.log(`\n🌹 Romantic Questionnaire server is running!`);
  console.log(`✨ Open your browser at: http://localhost:${PORT}`);
  console.log(`💌 Check your .env file to configure Telegram bot delivery.\n`);
});
