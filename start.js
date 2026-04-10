#!/usr/bin/env node
// start.js — Replit-compatible launcher for EnvHeaven Offline Web UI
// Serves the pre-built Angular dist/browser on PORT.
// Handles BASE_PATH prefix for Replit path-based routing.
// Proxies /api/* to ENVHEAVEN_DAEMON_URL (default http://127.0.0.1:43123).

const { createServer } = require("http");
const { promises: fs } = require("fs");
const { extname, join, resolve } = require("path");
const net = require("net");

const PORT = parseInt(process.env.PORT || "5000", 10);
const BASE_PATH = (process.env.BASE_PATH || "/").replace(/\/+$/, "");
const DAEMON_URL =
  process.env.ENVHEAVEN_DAEMON_URL ||
  process.env.EH_DAEMON_URL ||
  "http://127.0.0.1:43123";
const BROWSER_DIR = resolve(__dirname, "dist", "browser");

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js":   "text/javascript; charset=utf-8",
  ".mjs":  "text/javascript; charset=utf-8",
  ".css":  "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg":  "image/svg+xml",
  ".png":  "image/png",
  ".ico":  "image/x-icon",
  ".woff2":"font/woff2",
  ".webmanifest": "application/manifest+json",
};

async function handleRequest(req, res) {
  const url = new URL(req.url || "/", `http://localhost`);
  let pathname = url.pathname;

  // Strip the base path prefix (Replit passes full path to the service)
  if (BASE_PATH && pathname.startsWith(BASE_PATH)) {
    pathname = pathname.slice(BASE_PATH.length) || "/";
  }
  if (!pathname.startsWith("/")) pathname = "/" + pathname;

  // Proxy /api/* → daemon
  const apiPrefix = "/api/";
  if (url.pathname.startsWith(BASE_PATH + "/api/") || url.pathname.startsWith(apiPrefix)) {
    try {
      const apiPath = url.pathname.replace(BASE_PATH, "");
      const target = new URL(apiPath + url.search, DAEMON_URL);
      const chunks = [];
      for await (const chunk of req) chunks.push(Buffer.from(chunk));
      const body = chunks.length ? Buffer.concat(chunks) : undefined;

      const upRes = await fetch(target.toString(), {
        method: req.method || "GET",
        headers: { "content-type": req.headers["content-type"] || "application/json" },
        body: req.method === "GET" || req.method === "HEAD" ? undefined : body,
      });

      res.statusCode = upRes.status;
      upRes.headers.forEach((v, k) => {
        if (k.toLowerCase() !== "transfer-encoding") res.setHeader(k, v);
      });
      res.end(new Uint8Array(await upRes.arrayBuffer()));
    } catch {
      res.statusCode = 503;
      res.setHeader("content-type", "application/json");
      res.end(JSON.stringify({ ok: false, error: "Daemon unreachable" }));
    }
    return;
  }

  // Serve static Angular files (with SPA fallback)
  const filePath = join(BROWSER_DIR, pathname === "/" ? "index.html" : pathname.replace(/^\/+/, ""));
  const normalized = resolve(filePath);

  if (!normalized.startsWith(BROWSER_DIR)) {
    res.statusCode = 403;
    res.end("Forbidden");
    return;
  }

  let targetPath = normalized;
  try {
    const stat = await fs.stat(normalized);
    if (!stat.isFile()) throw new Error("not a file");
  } catch {
    targetPath = join(BROWSER_DIR, "index.html");
  }

  try {
    const content = await fs.readFile(targetPath);
    res.statusCode = 200;
    res.setHeader("content-type", MIME[extname(targetPath)] || "application/octet-stream");
    res.setHeader("cache-control", "no-store");
    res.end(content);
  } catch (err) {
    res.statusCode = 500;
    res.end(err instanceof Error ? err.message : "Internal error");
  }
}

const server = createServer((req, res) => {
  handleRequest(req, res).catch((err) => {
    if (!res.headersSent) {
      res.statusCode = 500;
      res.end(err instanceof Error ? err.message : "Internal error");
    }
  });
});

// WebSocket proxy: forward /ws (or BASE_PATH/ws) upgrades to the daemon
server.on("upgrade", (req, socket, head) => {
  const url = new URL(req.url || "/", "http://localhost");
  let pathname = url.pathname;

  if (BASE_PATH && pathname.startsWith(BASE_PATH)) {
    pathname = pathname.slice(BASE_PATH.length) || "/";
  }
  if (!pathname.startsWith("/")) pathname = "/" + pathname;

  if (pathname === "/ws" || pathname.startsWith("/ws?")) {
    const daemonParsed = new URL(DAEMON_URL);
    const daemonHost = daemonParsed.hostname;
    const daemonPort = parseInt(daemonParsed.port || "80", 10);

    const upstream = net.createConnection(daemonPort, daemonHost);

    upstream.on("connect", () => {
      // Re-emit the WebSocket upgrade handshake to the daemon
      const headers = [
        `GET /ws HTTP/1.1`,
        `Host: ${daemonHost}:${daemonPort}`,
        `Upgrade: websocket`,
        `Connection: Upgrade`,
        `Sec-WebSocket-Key: ${req.headers["sec-websocket-key"] || ""}`,
        `Sec-WebSocket-Version: ${req.headers["sec-websocket-version"] || "13"}`,
      ];
      if (req.headers["sec-websocket-extensions"]) {
        headers.push(`Sec-WebSocket-Extensions: ${req.headers["sec-websocket-extensions"]}`);
      }
      headers.push("", "");
      upstream.write(headers.join("\r\n"));
      if (head && head.length > 0) upstream.write(head);
    });

    upstream.pipe(socket);
    socket.pipe(upstream);

    upstream.on("error", () => { try { socket.destroy(); } catch {} });
    socket.on("error", () => { try { upstream.destroy(); } catch {} });
  } else {
    socket.destroy();
  }
});

process.on("SIGTERM", () => server.close(() => process.exit(0)));
process.on("SIGINT",  () => server.close(() => process.exit(0)));

server.on("error", (err) => {
  console.error(`[start.js] Server error: ${err.message}`);
  process.exit(1);
});

server.listen(PORT, "0.0.0.0", () => {
  console.log(`EnvHeaven Offline Web UI → http://0.0.0.0:${PORT}/`);
  console.log(`Daemon proxy target       → ${DAEMON_URL}`);
  console.log(`Serving Angular build     → ${BROWSER_DIR}`);
  console.log(`[start.js] Listening — ready`);
});
