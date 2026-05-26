export const ACTION_BOARD_LABEL = "Action Board";
export const ACTION_BOARD_ROUTE = "/action-board";
export const ACTION_BOARD_STANDALONE_ROUTE = "/action-board/standalone";
export const LEGACY_DYNAMIC_VIEW_ROUTE = "/dynamic-view";
export const LEGACY_DYNAMIC_VIEW_STANDALONE_ROUTE = "/dynamic-view/standalone";

export interface DynamicViewScope {
  artifactId?: string;
  repoRoot?: string;
}

export function actionBoardStandaloneUrl(options: {
  presetId?: string | null;
  artifactId?: string | null;
  repoRoot?: string | null;
} = {}): string {
  const params = new URLSearchParams();
  if (options.presetId) params.set("presetId", options.presetId);
  if (options.artifactId) params.set("artifactId", options.artifactId);
  if (options.repoRoot) params.set("repoRoot", options.repoRoot);
  const query = params.toString();
  return `${ACTION_BOARD_STANDALONE_ROUTE}${query ? `?${query}` : ""}`;
}

export function parseDynamicViewScope(search: string): DynamicViewScope {
  const params = new URLSearchParams(search);
  return {
    artifactId: params.get("artifactId") ?? undefined,
    repoRoot: params.get("repoRoot") ?? undefined,
  };
}

export function buildActionBoardLegacyRedirect(pathname: string, search: string): string | null {
  const raw = pathname.replace(/^\/+/, "");
  const parts = raw.split("/").filter(Boolean);
  const params = new URLSearchParams(search);

  if (parts[0] === "dynamic-view") {
    const target = parts[1] === "standalone" ? ACTION_BOARD_STANDALONE_ROUTE : ACTION_BOARD_ROUTE;
    const query = params.toString();
    return `${target}${query ? `?${query}` : ""}`;
  }

  if (parts[0] === "artifact" && parts[1] && parts[2] === "dynamic-view") {
    params.set("artifactId", decodeURIComponent(parts[1]));
    const target = parts[3] === "standalone" ? ACTION_BOARD_STANDALONE_ROUTE : ACTION_BOARD_ROUTE;
    return `${target}?${params.toString()}`;
  }

  return null;
}
