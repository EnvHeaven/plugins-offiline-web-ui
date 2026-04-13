import { promises as fs } from "node:fs";
import * as http from "node:http";
import * as net from "node:net";
import * as path from "node:path";
import type { OffilineWebUiCliOptions } from "./args";

export interface OffilineWebUiServerHandle {
  server: http.Server;
  url: string;
  daemonUrl: string;
}

export async function startOffilineWebUiServer(options: OffilineWebUiCliOptions): Promise<OffilineWebUiServerHandle> {
  const browserDir = resolveBrowserDirectory();
  await assertBrowserBuildExists(browserDir);

  const basePath = await readBaseHref(browserDir);
  const daemonParsed = new URL(options.daemonUrl);

  const server = http.createServer(async (request, response) => {
    try {
      if (!request.url) {
        sendText(response, 400, "Missing request URL.");
        return;
      }

      const url = new URL(request.url, `http://${options.host}`);
      const strippedPathname = stripBasePath(url.pathname, basePath);

      if (strippedPathname.startsWith("/api/")) {
        if (strippedPathname.startsWith("/api/actions/stream/")) {
          proxyDaemonStream(request, response, daemonParsed, strippedPathname, url.search);
        } else {
          await proxyDaemonRequest(request, response, options.daemonUrl, url, strippedPathname);
        }
        return;
      }

      await serveStaticAsset(response, browserDir, strippedPathname);
    } catch (error) {
      sendText(response, 500, error instanceof Error ? error.message : "Unknown UI server error.");
    }
  });

  server.on("upgrade", (request, socket, head) => {
    const urlPath = request.url ?? "/";
    const strippedPath = stripBasePath(urlPath, basePath);

    if (strippedPath === "/ws" || strippedPath.startsWith("/ws?") || strippedPath.startsWith("/api/actions/terminal/")) {
      proxyWebSocketUpgrade(request, socket as net.Socket, head, daemonParsed, strippedPath);
    } else {
      socket.destroy();
    }
  });

  await new Promise<void>((resolve) => {
    server.listen(options.port, options.host, () => resolve());
  });

  const address = server.address();
  if (typeof address !== "object" || !address) {
    throw new Error("Unable to determine UI server address.");
  }

  return {
    server,
    url: `http://localhost:${String(address.port)}`,
    daemonUrl: options.daemonUrl,
  };
}

async function readBaseHref(browserDir: string): Promise<string> {
  try {
    const indexHtml = await fs.readFile(path.join(browserDir, "index.html"), "utf8");
    const match = /<base\s+href="([^"]+)"/i.exec(indexHtml);
    if (!match) return "";
    const href = match[1];
    if (!href || href === "/") return "";
    return href.replace(/\/+$/, "");
  } catch {
    return "";
  }
}

function stripBasePath(pathname: string, basePath: string): string {
  if (!basePath) return pathname;
  if (pathname === basePath || pathname === basePath + "/") return "/";
  if (pathname.startsWith(basePath + "/")) return pathname.slice(basePath.length);
  return pathname;
}

async function serveStaticAsset(response: http.ServerResponse, browserDir: string, pathname: string): Promise<void> {
  const relativePath = pathname === "/" ? "index.html" : pathname.replace(/^\/+/, "");
  const assetPath = path.join(browserDir, relativePath);
  const normalizedBrowserDir = path.resolve(browserDir);
  const normalizedAssetPath = path.resolve(assetPath);

  if (!normalizedAssetPath.startsWith(normalizedBrowserDir)) {
    sendText(response, 403, "Forbidden.");
    return;
  }

  try {
    const stat = await fs.stat(normalizedAssetPath);
    if (!stat.isFile()) {
      throw new Error("Not a file");
    }

    const contents = await fs.readFile(normalizedAssetPath);
    response.statusCode = 200;
    response.setHeader("content-type", getContentType(normalizedAssetPath));
    response.end(contents);
    return;
  } catch {
    const indexPath = path.join(browserDir, "index.html");
    const contents = await fs.readFile(indexPath);
    response.statusCode = 200;
    response.setHeader("content-type", "text/html; charset=utf-8");
    response.end(contents);
  }
}

async function proxyDaemonRequest(
  request: http.IncomingMessage,
  response: http.ServerResponse,
  daemonUrl: string,
  url: URL,
  strippedPathname: string,
): Promise<void> {
  const target = new URL(strippedPathname + url.search, daemonUrl);
  const body = request.method === "GET" || request.method === "HEAD" ? undefined : await readRequestBody(request);
  const proxiedResponse = await fetch(target, {
    method: request.method ?? "GET",
    headers: filterRequestHeaders(request.headers),
    body: body as BodyInit | undefined,
  });

  response.statusCode = proxiedResponse.status;
  proxiedResponse.headers.forEach((value, key) => {
    if (key.toLowerCase() !== "transfer-encoding") {
      response.setHeader(key, value);
    }
  });

  const bytes = new Uint8Array(await proxiedResponse.arrayBuffer());
  response.end(bytes);
}

function proxyDaemonStream(
  request: http.IncomingMessage,
  response: http.ServerResponse,
  daemon: URL,
  pathname: string,
  search: string,
): void {
  const targetPath = pathname + search;
  const proxyReq = http.request(
    {
      hostname: daemon.hostname,
      port: daemon.port,
      path: targetPath,
      method: request.method ?? "GET",
      headers: {
        ...filterRequestHeadersPlain(request.headers),
        host: `${daemon.hostname}:${daemon.port}`,
      },
    },
    (proxyRes) => {
      response.writeHead(proxyRes.statusCode ?? 200, proxyRes.headers);
      proxyRes.pipe(response);
    },
  );

  proxyReq.on("error", () => {
    if (!response.headersSent) {
      sendText(response, 502, "Daemon stream unavailable.");
    }
  });

  request.on("close", () => {
    proxyReq.destroy();
  });

  proxyReq.end();
}

function proxyWebSocketUpgrade(
  request: http.IncomingMessage,
  socket: net.Socket,
  head: Buffer,
  daemon: URL,
  targetPath: string,
): void {
  const port = Number(daemon.port) || 80;
  const proxySocket = net.connect({ host: daemon.hostname, port }, () => {
    const reqLine = `GET ${targetPath} HTTP/1.1\r\n`;
    const headers = Object.entries(request.headers)
      .filter(([, v]) => v !== undefined)
      .map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(", ") : v}`)
      .join("\r\n");
    proxySocket.write(reqLine + headers + "\r\n\r\n");
    if (head.length > 0) {
      proxySocket.write(head);
    }
    proxySocket.pipe(socket);
    socket.pipe(proxySocket);
  });

  proxySocket.on("error", () => {
    socket.destroy();
  });

  socket.on("error", () => {
    proxySocket.destroy();
  });

  socket.on("close", () => {
    proxySocket.destroy();
  });

  proxySocket.on("close", () => {
    socket.destroy();
  });
}

function filterRequestHeaders(headers: http.IncomingHttpHeaders): Headers {
  const forwarded = new Headers();
  for (const [key, value] of Object.entries(headers)) {
    if (typeof value === "undefined") {
      continue;
    }

    if (Array.isArray(value)) {
      forwarded.set(key, value.join(", "));
      continue;
    }

    if (value) {
      forwarded.set(key, value);
    }
  }

  return forwarded;
}

function filterRequestHeadersPlain(headers: http.IncomingHttpHeaders): Record<string, string> {
  const result: Record<string, string> = {};
  for (const [key, value] of Object.entries(headers)) {
    if (typeof value === "undefined") continue;
    result[key] = Array.isArray(value) ? value.join(", ") : value;
  }
  return result;
}

async function readRequestBody(request: http.IncomingMessage): Promise<Buffer | undefined> {
  const chunks: Buffer[] = [];
  for await (const chunk of request) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }

  return chunks.length > 0 ? Buffer.concat(chunks) : undefined;
}

function resolveBrowserDirectory(): string {
  return path.resolve(__dirname, "..", "..", "browser");
}

async function assertBrowserBuildExists(browserDir: string): Promise<void> {
  const indexPath = path.join(browserDir, "index.html");
  await fs.access(indexPath);
}

function sendText(response: http.ServerResponse, statusCode: number, message: string): void {
  response.statusCode = statusCode;
  response.setHeader("content-type", "text/plain; charset=utf-8");
  response.end(message);
}

function getContentType(filePath: string): string {
  switch (path.extname(filePath)) {
    case ".css":
      return "text/css; charset=utf-8";
    case ".html":
      return "text/html; charset=utf-8";
    case ".js":
      return "text/javascript; charset=utf-8";
    case ".mjs":
      return "text/javascript; charset=utf-8";
    case ".json":
      return "application/json; charset=utf-8";
    case ".webmanifest":
      return "application/manifest+json";
    case ".svg":
      return "image/svg+xml";
    case ".png":
      return "image/png";
    case ".ico":
      return "image/x-icon";
    case ".woff2":
      return "font/woff2";
    default:
      return "application/octet-stream";
  }
}
