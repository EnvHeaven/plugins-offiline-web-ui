#!/usr/bin/env node
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const server_1 = require("./server");
async function main() {
    const options = (0, server_1.parseOffilineWebUiArgs)(process.argv.slice(2), process.env);
    const started = await (0, server_1.startOffilineWebUiServer)(options);
    process.stdout.write([
        `EnvHeaven offiline web UI running at ${started.url}`,
        `Proxying daemon API at ${started.daemonUrl}`,
    ].join("\n") + "\n");
}
void main().catch((error) => {
    process.stderr.write(`${error instanceof Error ? error.message : "Unknown failure"}\n`);
    process.exitCode = 1;
});
