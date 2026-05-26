<br />

<p align="center">
  <a href="https://envheaven.com">
    <img src="./docs/readme/logo/envheaven-logo.svg" alt="EnvHeaven" width="96" />
  </a>

  <h1 align="center">EnvHeaven Offline Web UI Plugin</h1>

  <p align="center">
    Environment hell, inverted.
  </p>

  <p align="center">
    <a href="#install">Install</a>
    ·
    <a href="#usage">Usage</a>
    ·
    <a href="#release-channels">Release Channels</a>
  </p>
</p>

<div align="center">

[![npm](https://img.shields.io/npm/v/@envheaven/plugins-offline-web-ui)](https://www.npmjs.com/package/@envheaven/plugins-offline-web-ui)
[![license](https://img.shields.io/npm/l/@envheaven/plugins-offline-web-ui)](#license)
[![plugin](https://img.shields.io/badge/envheaven-plugin-blue)](#usage)
[![UI](https://img.shields.io/badge/ui-offline%20web%20ui-blue)](#usage)
[![status](https://img.shields.io/badge/status-experimental%200.x-orange)](#experimental-0x)

</div>

> **Experimental 0.x:** EnvHeaven is currently in experimental `0.x` development. APIs, CLI commands, plugin contracts, package names, and release behavior may change before `1.0.0`. Pin versions and read release notes before using it in production workflows.

## Install

| Channel | Install | Purpose |
|---|---|---|
| `release` | `npm install @envheaven/plugins-offline-web-ui@release` | recommended 0.x release track after publication |
| `latest` | `npm install @envheaven/plugins-offline-web-ui` | npm default alias for the release track after publication |
| `exp` | `npm install @envheaven/plugins-offline-web-ui@exp` | experimental builds with newer changes after publication |

Install compatible `envheaven` host package in the same workflow.

## Usage

Serve local Offline Web UI for EnvHeaven daemon workflows.

```jsonc
{
  "pluginPackage": "@envheaven/plugins-offline-web-ui",
  "Execution": {
    "cwd": "."
  }
}
```

## What it does

- local Angular UI for daemon state.
- action terminals and PTY sessions.
- artifact version registry management.
- Dynamic View / Action Board workflows.

## Requirements

Node.js `>=20`, EnvHeaven daemon, and browser access to the local UI server.

## Release Channels

| Channel | Install | Purpose |
|---|---|---|
| `release` | `npm install @envheaven/plugins-offline-web-ui@release` | recommended 0.x release track after publication |
| `latest` | `npm install @envheaven/plugins-offline-web-ui` | npm default alias for the release track after publication |
| `exp` | `npm install @envheaven/plugins-offline-web-ui@exp` | experimental builds with newer changes after publication |

`release` is the recommended 0.x track, not a stable API promise.
The legacy typo package `@envheaven/plugins-offiline-web-ui` remains only for migration/deprecation history. Active commands should use `offline`.

This package is prepared for publication, but current registry verification did not find it on NPM.


## Status

Experimental. Plugin contracts may change before EnvHeaven `1.0.0`.

## License

MIT, as declared in `package.json`.
