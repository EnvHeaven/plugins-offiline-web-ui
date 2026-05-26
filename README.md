<p align="center">
  <a href="https://envheaven.com">
    <img src="./docs/readme/logo/envheaven-logo.svg" alt="EnvHeaven" width="96" />
  </a>
</p>

# @envheaven/plugins-offline-web-ui

> Local Offline Web UI for EnvHeaven daemon state, actions, terminal sessions, and version registry workflows.

> **Experimental 0.x:** EnvHeaven is currently in experimental `0.x` development. APIs, CLI commands, plugin contracts, package names, and release behavior may change before `1.0.0`. Pin versions and read release notes before using it in production workflows.

## Package rename

The corrected package name is:

```txt
@envheaven/plugins-offline-web-ui
```

The old typo package `@envheaven/plugins-offiline-web-ui` was verified on NPM and is kept only as migration/deprecation history. The corrected package was prepared here but public NPM publication was not verified yet.

## What it does

This package provides a local Angular UI and server wrapper for the EnvHeaven daemon.

It supports:

- listing known EnvHeaven repos and artifacts.
- viewing daemon status and local state.
- managing artifact version registry values.
- running and viewing action terminals.
- opening PTY terminal sessions backed by the daemon.
- using Action Board presets and terminal slots in the local UI.

It is not a hosted cloud dashboard.

## Install

```sh
# release track, after corrected package publication
npm install @envheaven/plugins-offline-web-ui@release

# npm default alias for the release track, after publication
npm install @envheaven/plugins-offline-web-ui

# experimental track, after publication
npm install @envheaven/plugins-offline-web-ui@exp
```

Install the EnvHeaven host package too:

```sh
npm install envheaven
```

## Run

From an EnvHeaven workflow, the core CLI can launch the UI package when available:

```sh
envheaven offline-web-ui
```

The package also exposes a binary:

```sh
envheaven-offline-web-ui --daemon-url http://127.0.0.1:42990 --port 0
```

A temporary legacy binary alias, `envheaven-offiline-web-ui`, is retained in package metadata for compatibility during the rename.

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
