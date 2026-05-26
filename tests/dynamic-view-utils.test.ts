import assert from "node:assert/strict";
import test from "node:test";
import {
  countSessionBindings,
  hasDuplicateTerminalBinding,
  isValidExternalUrl,
  normalizeSplitSizes,
} from "../src/web/app/views/dynamic-view/dynamic-view-utils";
import type { ControlBlock } from "../src/web/services/daemon.service";

test("validates external links conservatively", () => {
  assert.equal(isValidExternalUrl("https://example.com/path"), true);
  assert.equal(isValidExternalUrl("http://localhost:4200"), true);
  assert.equal(isValidExternalUrl("javascript:alert(1)"), false);
  assert.equal(isValidExternalUrl("not-a-url"), false);
});

test("normalizes split sizes while preserving total", () => {
  assert.deepEqual(normalizeSplitSizes([50, 50], 0, 70), [70, 30]);
  assert.deepEqual(normalizeSplitSizes([40, 30, 30], 1, 60), [22.86, 60, 17.14]);
  assert.deepEqual(normalizeSplitSizes([100], 0, 20), [100]);
});

test("detects duplicate terminal session bindings", () => {
  const blocks: ControlBlock[] = [
    { id: "one", kind: "terminal", title: "One", terminal: { slotId: "one", runId: "run-1" } },
    { id: "two", kind: "terminal", title: "Two", terminal: { slotId: "two", runId: "run-1" } },
    { id: "three", kind: "terminal", title: "Three", terminal: { slotId: "three", runId: "run-2" } },
  ];

  assert.equal(countSessionBindings(blocks, "run-1"), 2);
  assert.equal(hasDuplicateTerminalBinding(blocks, "run-1"), true);
  assert.equal(hasDuplicateTerminalBinding(blocks, "run-2"), false);
});

