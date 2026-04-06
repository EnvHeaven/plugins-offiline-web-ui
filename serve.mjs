/**
 * Simple Replit-compatible serve script for the EnvHeaven Offline Web UI.
 * Serves the pre-built Angular app from dist/browser and proxies /api/* to the daemon.
 */
import { createServer } from "node:http";
import { createReadStream, promises as fs } from "node:fs";
import { extname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { dirname } from "node:path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const PORT = parseInt(process.env.PORT ?? "3000", 10);
const HOST = "0.0.0.0";
const DAEMON_URL = process.env.ENVHEAVEN_DAEMON_URL ?? process.env.EH_DAEMON_URL ?? "http://127.0.0.1:43123";
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

const server = createServer(async (req, res) => {
  try {
    const url = new URL(req.url ?? "/", `http://${HOST}`);

    // Proxy /api/* to the EnvHeaven daemon
    if (url.pathname.startsWith("/api/")) {
      try {
        const target = new URL(url.pathname + url.search, DAEMON_URL);
        const chunks = [];
        for await (const chunk of req) chunks.push(chunk);
        const body = chunks.length ? Buffer.concat(chunks) : undefined;

        const upRes = await fetch(target.toString(), {
          method: req.method ?? "GET",
          headers: { "content-type": req.headers["content-type"] ?? "application/json" },
          body: req.method === "GET" || req.method === "HEAD" ? undefined : body,
        });

        res.statusCode = upRes.status;
        upRes.headers.forEach((v, k) => {
          if (k.toLowerCase() !== "transfer-encoding") res.setHeader(k, v);
        });
        const bytes = new Uint8Array(await upRes.arrayBuffer());
        res.end(bytes);
      } catch {
        // Daemon not reachable — return a minimal error so UI can display it
        res.statusCode = 503;
        res.setHeader("content-type", "application/json");
        res.end(JSON.stringify({ ok: false, error: "Daemon unreachable" }));
      }
      return;
    }

    // Serve static Angular build
    const pathname = url.pathname === "/" ? "/index.html" : url.pathname;
    const filePath = join(BROWSER_DIR, pathname.replace(/^\/+/, ""));
    const normalized = resolve(filePath);

    if (!normalized.startsWith(BROWSER_DIR)) {
      res.statusCode = 403;
      res.end("Forbidden");
      return;
    }

    try {
      await fs.access(normalized);
      const stat = await fs.stat(normalized);
      if (!stat.isFile()) throw new Error("Not a file");

      const ext = extname(normalized);
      res.statusCode = 200;
      res.setHeader("content-type", MIME[ext] ?? "application/octet-stream");
      // No-cache headers so Angular's hashed files serve fresh during dev
      res.setHeader("cache-control", "no-store");
      createReadStream(normalized).pipe(res);
    } catch {
      // SPA fallback — serve index.html for any unknown path
      const indexPath = join(BROWSER_DIR, "index.html");
      const content = await fs.readFile(indexPath);
      res.statusCode = 200;
      res.setHeader("content-type", "text/html; charset=utf-8");
      res.setHeader("cache-control", "no-store");
      res.end(content);
    }
  } catch (err) {
    res.statusCode = 500;
    res.end(err instanceof Error ? err.message : "Internal server error");
  }
});

server.listen(PORT, HOST, () => {
  console.log(`EnvHeaven Offline Web UI → http://${HOST}:${PORT}`);
  console.log(`Daemon proxy target      → ${DAEMON_URL}`);
  console.log(`Serving from             → ${BROWSER_DIR}`);
});
