# Offline Web UI package rename

> **Do not run these commands without review.** This note documents the package-name migration only.

The Offline Web UI package is being renamed from the legacy typo package name:

```txt
@envheaven/plugins-offiline-web-ui
```

to the corrected package name:

```txt
@envheaven/plugins-offline-web-ui
```

## Current state

- The corrected package metadata now uses `@envheaven/plugins-offline-web-ui`.
- The physical Git folder and remote still use `offiline`.
- The corrected package was not verified as published on NPM during PRM #2.3.
- The old typo package was verified as published on NPM.
- A temporary legacy binary alias, `envheaven-offiline-web-ui`, is retained for compatibility.

## After corrected package publication

After `@envheaven/plugins-offline-web-ui` is published and verified, deprecate the old typo package:

```sh
npm deprecate @envheaven/plugins-offiline-web-ui "Package renamed to @envheaven/plugins-offline-web-ui. Please install the corrected package name."
```

Do not run the deprecation command before the corrected package is available on NPM.
