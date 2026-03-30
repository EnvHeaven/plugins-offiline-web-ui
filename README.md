# @envheaven/plugins-offiline-web-ui

This package provides the local web UI server for EnvHeaven.

It serves a built Angular + Tailwind app from static files and proxies `/api/*` requests to the EnvHeaven daemon.

## Build

```bash
npm install
npm run build
```

## Run

```bash
envheaven-offiline-web-ui --daemon-url http://127.0.0.1:43123 --port 0
```

You can also use the package programmatically:

```ts
import { startOffilineWebUiServer } from "@envheaven/plugins-offiline-web-ui";

const server = await startOffilineWebUiServer({
  daemonUrl: "http://127.0.0.1:43123",
});
```

The server accepts these options:

- `daemonUrl`
- `port`
- `host`
- `open`

The UI talks to these daemon endpoints through the proxy:

- `GET /api/status`
- `GET /api/repos`
- `POST /api/repos/select`
- `GET /api/versions`
- `POST /api/versions/set`
- `POST /api/versions/increment`
