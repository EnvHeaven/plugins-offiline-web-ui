"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.startOffilineWebUiServer = startOffilineWebUiServer;
const node_fs_1 = require("node:fs");
const http = require("node:http");
const path = require("node:path");
async function startOffilineWebUiServer(options) {
    const browserDir = resolveBrowserDirectory();
    await assertBrowserBuildExists(browserDir);
    const basePath = await readBaseHref(browserDir);
    const server = http.createServer(async (request, response) => {
        try {
            if (!request.url) {
                sendText(response, 400, "Missing request URL.");
                return;
            }
            const url = new URL(request.url, `http://${options.host}`);
            const strippedPathname = stripBasePath(url.pathname, basePath);
            if (strippedPathname.startsWith("/api/")) {
                await proxyDaemonRequest(request, response, options.daemonUrl, url, strippedPathname);
                return;
            }
            await serveStaticAsset(response, browserDir, strippedPathname);
        }
        catch (error) {
            sendText(response, 500, error instanceof Error ? error.message : "Unknown UI server error.");
        }
    });
    await new Promise((resolve) => {
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
/**
 * Read <base href="..."> from index.html.
 * Returns a normalised prefix WITHOUT trailing slash, e.g. "/envheaven-ui".
 * Returns "" when base href is "/" or absent.
 */
async function readBaseHref(browserDir) {
    try {
        const indexHtml = await node_fs_1.promises.readFile(path.join(browserDir, "index.html"), "utf8");
        const match = /<base\s+href="([^"]+)"/i.exec(indexHtml);
        if (!match)
            return "";
        const href = match[1];
        if (!href || href === "/")
            return "";
        return href.replace(/\/+$/, "");
    }
    catch {
        return "";
    }
}
/**
 * Strip the basePath prefix from a pathname so the server can resolve
 * files relative to dist/browser root regardless of <base href>.
 *
 * e.g. basePath="/envheaven-ui", pathname="/envheaven-ui/main.js" → "/main.js"
 *      basePath="/envheaven-ui", pathname="/"                     → "/"
 */
function stripBasePath(pathname, basePath) {
    if (!basePath)
        return pathname;
    if (pathname === basePath || pathname === basePath + "/")
        return "/";
    if (pathname.startsWith(basePath + "/"))
        return pathname.slice(basePath.length);
    return pathname;
}
async function serveStaticAsset(response, browserDir, pathname) {
    const relativePath = pathname === "/" ? "index.html" : pathname.replace(/^\/+/, "");
    const assetPath = path.join(browserDir, relativePath);
    const normalizedBrowserDir = path.resolve(browserDir);
    const normalizedAssetPath = path.resolve(assetPath);
    if (!normalizedAssetPath.startsWith(normalizedBrowserDir)) {
        sendText(response, 403, "Forbidden.");
        return;
    }
    try {
        const stat = await node_fs_1.promises.stat(normalizedAssetPath);
        if (!stat.isFile()) {
            throw new Error("Not a file");
        }
        const contents = await node_fs_1.promises.readFile(normalizedAssetPath);
        response.statusCode = 200;
        response.setHeader("content-type", getContentType(normalizedAssetPath));
        response.end(contents);
        return;
    }
    catch {
        const indexPath = path.join(browserDir, "index.html");
        const contents = await node_fs_1.promises.readFile(indexPath);
        response.statusCode = 200;
        response.setHeader("content-type", "text/html; charset=utf-8");
        response.end(contents);
    }
}
async function proxyDaemonRequest(request, response, daemonUrl, url, strippedPathname) {
    const target = new URL(strippedPathname + url.search, daemonUrl);
    const body = request.method === "GET" || request.method === "HEAD" ? undefined : await readRequestBody(request);
    const proxiedResponse = await fetch(target, {
        method: request.method ?? "GET",
        headers: filterRequestHeaders(request.headers),
        body: body,
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
function filterRequestHeaders(headers) {
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
async function readRequestBody(request) {
    const chunks = [];
    for await (const chunk of request) {
        chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    }
    return chunks.length > 0 ? Buffer.concat(chunks) : undefined;
}
function resolveBrowserDirectory() {
    return path.resolve(__dirname, "..", "..", "browser");
}
async function assertBrowserBuildExists(browserDir) {
    const indexPath = path.join(browserDir, "index.html");
    await node_fs_1.promises.access(indexPath);
}
function sendText(response, statusCode, message) {
    response.statusCode = statusCode;
    response.setHeader("content-type", "text/plain; charset=utf-8");
    response.end(message);
}
function getContentType(filePath) {
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
