"use strict";

const { withProxyGuard } = require("../proxy/proxy.js");

const ALLOWED_METHODS = ["GET", "HEAD", "OPTIONS"];
let cachedApp = null;

function loadApp() {
  if (!cachedApp) {
    // dihasilkan oleh "npm run build" (esbuild) dari musicnode/backend/src
    const mod = require("../backend/dist/server.cjs");
    cachedApp = mod.default || mod;
  }
  return cachedApp;
}

function buildWebRequest(req) {
  const proto = String(req.headers["x-forwarded-proto"] || "http").split(",")[0].trim();
  const host = req.headers.host || "localhost";
  const url = new URL(req.url, `${proto}://${host}`);
  const headers = new Headers();

  for (const [name, value] of Object.entries(req.headers)) {
    if (Array.isArray(value)) {
      value.forEach((item) => headers.append(name, item));
    } else if (value !== undefined) {
      headers.set(name, String(value));
    }
  }

  return new Request(url, { method: req.method, headers });
}

async function mainHandler(req, res) {
  if (!ALLOWED_METHODS.includes(req.method)) {
    res.setHeader("Allow", ALLOWED_METHODS.join(", "));
    res.status(405).json({ success: false, message: "metode tidak didukung" });
    return;
  }

  try {
    const response = await loadApp().fetch(buildWebRequest(req));
    res.statusCode = response.status;
    response.headers.forEach((value, key) => res.setHeader(key, value));
    res.end(Buffer.from(await response.arrayBuffer()));
  } catch (error) {
    console.error("[musicnode] kesalahan backend:", error);
    res.status(500).json({ success: false, message: "terjadi kesalahan pada server" });
  }
}

module.exports = withProxyGuard(mainHandler);
