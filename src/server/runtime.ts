import { promises as fs } from "node:fs";
import * as http from "node:http";
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

  const server = http.createServer(async (request, response) => {
    try {
      if (!request.url) {
        sendText(response, 400, "Missing request URL.");
        return;
      }

      const url = new URL(request.url, `http://${options.host}`);
      if (url.pathname.startsWith("/api/")) {
        await proxyDaemonRequest(request, response, options.daemonUrl, url);
        return;
      }

      await serveStaticAsset(response, browserDir, url.pathname);
    } catch (error) {
      sendText(response, 500, error instanceof Error ? error.message : "Unknown UI server error.");
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
): Promise<void> {
  const target = new URL(url.pathname + url.search, daemonUrl);
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
