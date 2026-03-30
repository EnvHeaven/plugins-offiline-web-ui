#!/usr/bin/env node
import { parseOffilineWebUiArgs, startOffilineWebUiServer } from "./server";

async function main(): Promise<void> {
  const options = parseOffilineWebUiArgs(process.argv.slice(2), process.env);
  const started = await startOffilineWebUiServer(options);

  process.stdout.write(
    [
      `EnvHeaven offiline web UI running at ${started.url}`,
      `Proxying daemon API at ${started.daemonUrl}`,
    ].join("\n") + "\n",
  );
}

void main().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.message : "Unknown failure"}\n`);
  process.exitCode = 1;
});
