<p align="center">
  <a href="https://envheaven.com">
    <img src="./docs/readme/logo/envheaven-logo.png" alt="EnvHeaven" width="96" />
  </a>
</p>

# @envheaven/plugins-offiline-web-ui

> Local Offline Web UI for EnvHeaven daemon state, actions, terminal sessions, and version registry workflows.

[![npm version](https://img.shields.io/npm/v/@envheaven/plugins-offiline-web-ui)](https://www.npmjs.com/package/@envheaven/plugins-offiline-web-ui)
[![license](https://img.shields.io/npm/l/@envheaven/plugins-offiline-web-ui)](https://www.npmjs.com/package/@envheaven/plugins-offiline-web-ui)

> **Experimental 0.x:** EnvHeaven is currently in experimental `0.x` development. APIs, CLI commands, plugin contracts, package names, and release behavior may change before `1.0.0`. Pin versions and read release notes before using it in production workflows.

## Package spelling

The package name currently uses `offiline`:

```txt
@envheaven/plugins-offiline-web-ui
```

Keep that spelling in install commands, imports, and binaries.

## What it does

This package provides a local Angular UI and server wrapper for the EnvHeaven daemon.

It supports:

- listing known EnvHeaven repos and artifacts.
- viewing daemon status and local state.
- managing artifact version registry values.
- running and viewing action terminals.
- opening PTY terminal sessions backed by the daemon.
- using Dynamic View presets and terminal slots in the local UI.

It is not a hosted cloud dashboard.

## Install

```sh
npm install @envheaven/plugins-offiline-web-ui
```

Install the EnvHeaven host package too:

```sh
npm install envheaven
```

## Run

From an EnvHeaven workflow, the core CLI can launch the UI package when available:

```sh
envheaven offiline-web-ui
```

The package also exposes a binary:

```sh
envheaven-offiline-web-ui --daemon-url http://127.0.0.1:42990 --port 0
```

## Requirements

- Node.js `>=20`.
- EnvHeaven daemon available locally.
- Browser access to the local UI server.

## Current limitations

- The UI is local/offline-first and depends on daemon APIs.
- It does not provide a hosted account system.
- Terminal/session behavior is tied to the running daemon process.
- UI contracts may change before EnvHeaven `1.0.0`.

## Related

- [`envheaven`](https://www.npmjs.com/package/envheaven)
- [`@envheaven/plugins-nodejs-pnpm`](https://www.npmjs.com/package/@envheaven/plugins-nodejs-pnpm)
- [`@envheaven/plugins-firebase-hosting-deploy`](https://www.npmjs.com/package/@envheaven/plugins-firebase-hosting-deploy)

## License

MIT, as declared in `package.json`.
