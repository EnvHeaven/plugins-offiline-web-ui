import assert from "node:assert/strict";
import test from "node:test";
import { parseOffilineWebUiArgs } from "../src/server";

test("parses daemon url and port options", () => {
  const options = parseOffilineWebUiArgs(["--daemon-url", "http://127.0.0.1:4444", "--port", "5555"], {});
  assert.equal(options.daemonUrl, "http://127.0.0.1:4444");
  assert.equal(options.port, 5555);
});

test("parses positional daemon url", () => {
  const options = parseOffilineWebUiArgs(["http://127.0.0.1:1234"], {});
  assert.equal(options.daemonUrl, "http://127.0.0.1:1234");
});

test("defaults to a public host binding for replit and wsl workflows", () => {
  const options = parseOffilineWebUiArgs([], {});
  assert.equal(options.host, "0.0.0.0");
});
