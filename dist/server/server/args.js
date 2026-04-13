"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseOffilineWebUiArgs = parseOffilineWebUiArgs;
function parseOffilineWebUiArgs(argv, env) {
    const options = {
        daemonUrl: env.ENVHEAVEN_DAEMON_URL ?? env.EH_DAEMON_URL ?? "http://127.0.0.1:43123",
        port: parseOptionalPort(env.ENVHEAVEN_UI_PORT ?? env.EH_UI_PORT),
        host: env.ENVHEAVEN_UI_HOST ?? env.EH_UI_HOST ?? "0.0.0.0",
        open: readBoolean(env.ENVHEAVEN_UI_OPEN ?? env.EH_UI_OPEN),
    };
    const tokens = [...argv];
    if (tokens.length > 0 && !tokens[0].startsWith("-")) {
        options.daemonUrl = tokens.shift() ?? options.daemonUrl;
    }
    while (tokens.length > 0) {
        const token = tokens.shift();
        switch (token) {
            case "--daemon-url":
                options.daemonUrl = requireValue(tokens, token);
                break;
            case "--daemon-port":
                options.daemonUrl = `http://127.0.0.1:${requirePort(tokens, token)}`;
                break;
            case "--port":
            case "--ui-port":
                options.port = requirePort(tokens, token);
                break;
            case "--host":
                options.host = requireValue(tokens, token);
                break;
            case "--open":
                options.open = true;
                break;
            case "--no-open":
                options.open = false;
                break;
            default:
                throw new Error(`Unknown option "${token}".`);
        }
    }
    if (!Number.isFinite(options.port) || options.port < 0) {
        options.port = 0;
    }
    return options;
}
function requireValue(tokens, optionName) {
    const value = tokens.shift();
    if (!value) {
        throw new Error(`Missing value for ${optionName}.`);
    }
    return value;
}
function requirePort(tokens, optionName) {
    const value = requireValue(tokens, optionName);
    const parsed = Number.parseInt(value, 10);
    if (!Number.isFinite(parsed) || parsed < 0) {
        throw new Error(`Invalid port for ${optionName}: "${value}".`);
    }
    return parsed;
}
function parseOptionalPort(value) {
    if (!value) {
        return 0;
    }
    const parsed = Number.parseInt(value, 10);
    return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
}
function readBoolean(value) {
    return value === "1" || value === "true" || value === "yes";
}
