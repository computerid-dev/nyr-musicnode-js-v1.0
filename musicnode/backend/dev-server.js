"use strict";

const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");

const PUBLIC_DIR = path.resolve(__dirname, "..", "..", "public");
const PORT = Number(process.env.PORT) || 3000;
const HOST = "127.0.0.1";

const MIME_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".ico": "image/x-icon"
};

function addVercelHelpers(res) {
  res.status = (code) => {
    res.statusCode = code;
    return res;
  };
  res.json = (body) => {
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    res.end(JSON.stringify(body));
  };
}

function sendText(res, code, message) {
  res.statusCode = code;
  res.setHeader("Content-Type", "text/plain; charset=utf-8");
  res.end(message);
}

function serveStatic(req, res) {
  let pathname;
  try {
    pathname = decodeURIComponent(new URL(req.url, "http://localhost").pathname);
  } catch {
    sendText(res, 400, "permintaan tidak valid");
    return;
  }

  let filePath = path.normalize(path.join(PUBLIC_DIR, pathname));
  if (filePath !== PUBLIC_DIR && !filePath.startsWith(PUBLIC_DIR + path.sep)) {
    sendText(res, 403, "dilarang");
    return;
  }

  fs.stat(filePath, (statError, stats) => {
    if (!statError && stats.isDirectory()) filePath = path.join(filePath, "index.html");

    fs.readFile(filePath, (readError, data) => {
      if (readError) {
        sendText(res, 404, "tidak ditemukan (sudah menjalankan: npm run build ?)");
        return;
      }
      res.statusCode = 200;
      res.setHeader("Content-Type", MIME_TYPES[path.extname(filePath)] || "application/octet-stream");
      res.end(data);
    });
  });
}

const handler = require("../api/handler.js");

const server = http.createServer((req, res) => {
  addVercelHelpers(res);
  if (req.url.startsWith("/api/") || req.url === "/api") {
    handler(req, res);
    return;
  }
  serveStatic(req, res);
});

server.listen(PORT, HOST, () => {
  console.log(`NYR Music Node jalan di http://localhost:${PORT}`);
});
