#!/usr/bin/env node
const { existsSync } = require("node:fs");
const { spawnSync } = require("node:child_process");
const path = require("node:path");

const distEntryPath = path.join(__dirname, "dist", "server", "bin.js");

if (!existsSync(distEntryPath)) {
  const buildResult = spawnSync("pnpm", ["run", "build"], {
    cwd: __dirname,
    stdio: "inherit",
    shell: process.platform === "win32",
    env: process.env,
  });

  if ((buildResult.status ?? 1) !== 0) {
    process.exit(buildResult.status ?? 1);
  }
}

require(distEntryPath);
