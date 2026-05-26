import assert from "node:assert/strict";
import test from "node:test";
import {
  ACTION_BOARD_LABEL,
  actionBoardStandaloneUrl,
  buildActionBoardLegacyRedirect,
  parseDynamicViewScope,
} from "../src/web/app/views/dynamic-view/dynamic-view.constants";

test("builds top-level Action Board standalone URLs", () => {
  assert.equal(ACTION_BOARD_LABEL, "Action Board");
  assert.equal(
    actionBoardStandaloneUrl({ presetId: "preset_01" }),
    "/action-board/standalone?presetId=preset_01",
  );
  assert.equal(
    actionBoardStandaloneUrl({ presetId: "preset_01", artifactId: "artifact one", repoRoot: "/tmp/repo one" }),
    "/action-board/standalone?presetId=preset_01&artifactId=artifact+one&repoRoot=%2Ftmp%2Frepo+one",
  );
});

test("parses optional Action Board scope from query params", () => {
  assert.deepEqual(parseDynamicViewScope("?artifactId=abc&repoRoot=%2Ftmp%2Frepo"), {
    artifactId: "abc",
    repoRoot: "/tmp/repo",
  });
  assert.deepEqual(parseDynamicViewScope(""), {
    artifactId: undefined,
    repoRoot: undefined,
  });
});

test("builds legacy Dynamic View redirects to canonical Action Board routes", () => {
  assert.equal(buildActionBoardLegacyRedirect("/dynamic-view", ""), "/action-board");
  assert.equal(
    buildActionBoardLegacyRedirect("/dynamic-view", "?artifactId=abc&repoRoot=%2Ftmp%2Frepo"),
    "/action-board?artifactId=abc&repoRoot=%2Ftmp%2Frepo",
  );
  assert.equal(
    buildActionBoardLegacyRedirect("/dynamic-view/standalone", "?presetId=preset_01"),
    "/action-board/standalone?presetId=preset_01",
  );
  assert.equal(
    buildActionBoardLegacyRedirect("/artifact/artifact%20one/dynamic-view", "?foo=bar"),
    "/action-board?foo=bar&artifactId=artifact+one",
  );
  assert.equal(
    buildActionBoardLegacyRedirect("/artifact/artifact%20one/dynamic-view/standalone", "?presetId=preset_01"),
    "/action-board/standalone?presetId=preset_01&artifactId=artifact+one",
  );
  assert.equal(buildActionBoardLegacyRedirect("/action-board", ""), null);
});
