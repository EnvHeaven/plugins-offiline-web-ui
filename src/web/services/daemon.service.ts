import { Injectable, signal, computed } from "@angular/core";

export interface DaemonStatus {
  ok?: boolean;
  version?: string;
  daemon?: {
    port?: number;
    repoRoot?: string | null;
  };
  selectedRepo?: {
    repoId: string;
    repoRoot: string;
  } | null;
}

export interface ArtifactMeta {
  icon?: string;
  internalName?: string;
  labelName?: string;
  instanceLabelName?: string;
}

export interface RepoRecord {
  id: string;
  path: string;
  name: string;
  selected: boolean;
  lastSeen?: string;
  type?: string;
  meta?: ArtifactMeta;
}

export interface VersionRecord {
  artifactName: string;
  packageName: string;
  lastVersion: string | null;
  nextVersion: string | null;
}

export interface AppNotification {
  id: string;
  kind: "info" | "success" | "warn" | "error";
  title: string;
  message: string;
  ts: Date;
  read: boolean;
}

export interface ActionHelper {
  kind: "open-url" | "copy-text";
  label: string;
  value: string;
}

export interface ActionVariant {
  id: string;
  label: string;
  env?: Record<string, string>;
}

export interface PageHeaderOptions {
  isFixedOnHeader: boolean;
  hasToReplaceActionText?: boolean;
  actionTextToReplace?: string;
}

export interface ActionDefinition {
  id: string;
  label: string;
  description: string;
  icon: string;
  runCommand: string;
  stopCommand: string | null;
  runLabel: string;
  stopLabel: string;
  successHelpers: ActionHelper[];
  failHelpers: ActionHelper[];
  variants?: ActionVariant[];
  pageHeaderOptions?: PageHeaderOptions;
}

export interface ConsoleLogEntry {
  ts: string;
  stream: "stdout" | "stderr" | "system";
  text: string;
}

export interface ActionRunEntry {
  runId: string;
  actionId: string;
  actionLabel: string;
  status: "running" | "success" | "error" | "stopped";
  exitCode: number | null;
  startedAt: Date;
  helpers: ActionHelper[];
  logs: ConsoleLogEntry[];
}

@Injectable({ providedIn: "root" })
export class DaemonService {
  readonly status = signal<DaemonStatus | null>(null);
  readonly repos = signal<RepoRecord[]>([]);
  readonly versions = signal<VersionRecord[]>([]);
  readonly actions = signal<ActionDefinition[]>([]);
  readonly actionRuns = signal<ActionRunEntry[]>([]);
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly notifications = signal<AppNotification[]>([]);
  readonly lastRefreshed = signal<Date | null>(null);

  readonly isConnected = computed(() => this.status()?.ok === true);
  readonly daemonVersion = computed(() => this.status()?.version ?? null);
  readonly selectedRepo = computed(() =>
    this.repos().find((r) => r.selected) ?? null
  );
  readonly unreadCount = computed(
    () => this.notifications().filter((n) => !n.read).length
  );

  private pollingTimer: ReturnType<typeof setInterval> | null = null;
  private ws: WebSocket | null = null;
  private wsReconnectTimer: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    void this.refreshAll();
    this.startPolling();
    this.connectWebSocket();
  }

  startPolling(): void {
    if (this.pollingTimer) return;
    this.pollingTimer = setInterval(() => {
      void this.refreshStatus();
    }, 10000);
  }

  stopPolling(): void {
    if (this.pollingTimer) {
      clearInterval(this.pollingTimer);
      this.pollingTimer = null;
    }
    this.disconnectWebSocket();
  }

  connectWebSocket(): void {
    if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
      return;
    }

    const wsProtocol = location.protocol === "https:" ? "wss:" : "ws:";
    const segments = location.pathname.split("/").filter(Boolean);
    const pathBase = segments.length > 0 ? `/${segments[0]}` : "";
    const wsUrl = `${wsProtocol}//${location.host}${pathBase}/ws`;

    try {
      this.ws = new WebSocket(wsUrl);

      this.ws.addEventListener("message", (event) => {
        try {
          const data = JSON.parse(event.data as string) as { type: string; payload: unknown };
          void this.handleWsEvent(data.type, data.payload);
        } catch {
          // ignore malformed messages
        }
      });

      this.ws.addEventListener("close", () => {
        this.ws = null;
        this.scheduleWsReconnect();
      });

      this.ws.addEventListener("error", () => {
        this.ws?.close();
      });
    } catch {
      this.scheduleWsReconnect();
    }
  }

  private scheduleWsReconnect(): void {
    if (this.wsReconnectTimer) return;
    this.wsReconnectTimer = setTimeout(() => {
      this.wsReconnectTimer = null;
      this.connectWebSocket();
    }, 5000);
  }

  private disconnectWebSocket(): void {
    if (this.wsReconnectTimer) {
      clearTimeout(this.wsReconnectTimer);
      this.wsReconnectTimer = null;
    }
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  private async handleWsEvent(type: string, payload: unknown): Promise<void> {
    if (type === "repo:selected") {
      await this.refreshAll();
      this.addNotification("info", "Context changed", "Another tab switched the active repository.");
    } else if (type === "version:set") {
      await this.refreshVersions();
    } else if (type === "version:incremented") {
      await this.refreshVersions();
    } else if (type === "actions:updated") {
      await this.refreshActions();
    } else if (type === "action:complete") {
      const p = payload as { actionId?: string; status?: string } | null;
      if (p?.status === "success") {
        this.addNotification("success", "Action complete", `Action '${p.actionId ?? ""}' finished successfully.`);
      } else if (p?.status === "error") {
        this.addNotification("warn", "Action failed", `Action '${p.actionId ?? ""}' exited with an error.`);
      }
    }
  }

  async refreshAll(): Promise<void> {
    this.loading.set(true);
    await Promise.all([this.refreshStatus(), this.refreshRepos(), this.refreshVersions(), this.refreshActions()]);
    this.loading.set(false);
    this.lastRefreshed.set(new Date());
  }

  async refreshStatus(): Promise<void> {
    try {
      const payload = await readJson<DaemonStatus>("/api/status");
      const wasConnected = this.status()?.ok;
      this.status.set(payload);
      this.error.set(null);

      if (!wasConnected && payload.ok) {
        this.addNotification("success", "Daemon connected", `Connected on port ${payload.daemon?.port ?? "?"}`);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unable to reach the daemon.";
      if (this.status()?.ok !== false) {
        this.addNotification("error", "Daemon unreachable", msg);
      }
      this.status.set(null);
      this.error.set(msg);
    }
  }

  async refreshRepos(): Promise<void> {
    try {
      const payload = await readJson<{
        selectedRepoId?: string | null;
        repos?: Array<{ repoId: string; repoRoot: string; meta?: ArtifactMeta }>;
      }>("/api/repos");

      this.repos.set(
        (payload.repos ?? []).map((repo) => ({
          id: repo.repoId,
          path: repo.repoRoot,
          name: deriveRepoName(repo.repoRoot),
          selected: repo.repoId === (payload.selectedRepoId ?? null),
          lastSeen: "recently",
          type: "env-repo",
          meta: repo.meta,
        }))
      );
    } catch {
      // silently ignore
    }
  }

  async refreshVersions(): Promise<void> {
    try {
      const payload = await readJson<{ versions: VersionRecord[] }>("/api/versions");
      this.versions.set(payload.versions ?? []);
    } catch {
      // silently ignore
    }
  }

  async refreshActions(): Promise<void> {
    try {
      const payload = await readJson<{ actions: ActionDefinition[] }>("/api/actions");
      this.actions.set(payload.actions ?? []);
    } catch {
      // silently ignore
    }
  }

  async selectRepo(repo: RepoRecord): Promise<void> {
    await postJson("/api/repos/select", { repoRoot: repo.path });
    await this.refreshAll();
    this.addNotification("info", "Context switched", `Now using ${repo.name}`);
  }

  async putRepoMeta(meta: ArtifactMeta): Promise<void> {
    await putJson("/api/repos/meta", meta);
    await this.refreshRepos();
  }

  async dispatchAction(
    actionId: string,
    options: { background?: boolean; variantId?: string } = {}
  ): Promise<string | null> {
    try {
      const payload = await postJsonRead<{ runId: string }>("/api/actions/dispatch", {
        actionId,
        background: options.background ?? false,
        ...(options.variantId ? { variantId: options.variantId } : {}),
      });
      return payload.runId;
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to dispatch action.";
      this.addNotification("error", "Action dispatch failed", msg);
      return null;
    }
  }

  streamAction(runId: string, actionId: string, actionLabel: string): void {
    const entry: ActionRunEntry = {
      runId,
      actionId,
      actionLabel,
      status: "running",
      exitCode: null,
      startedAt: new Date(),
      helpers: [],
      logs: [],
    };
    this.actionRuns.update((runs) => [entry, ...runs]);

    const es = new EventSource(`/api/actions/stream/${runId}`);

    es.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data as string) as {
          type: string;
          stream?: string;
          data?: string;
          exitCode?: number;
          status?: string;
          helpers?: ActionHelper[];
        };

        if (data.type === "line" && data.stream && data.data) {
          const logEntry: ConsoleLogEntry = {
            ts: new Date().toISOString(),
            stream: (data.stream as ConsoleLogEntry["stream"]) ?? "system",
            text: data.data,
          };
          this.actionRuns.update((runs) =>
            runs.map((r) =>
              r.runId === runId ? { ...r, logs: [...r.logs, logEntry] } : r
            )
          );
        } else if (data.type === "result") {
          this.actionRuns.update((runs) =>
            runs.map((r) =>
              r.runId === runId
                ? {
                    ...r,
                    status: (data.status as ActionRunEntry["status"]) ?? "error",
                    exitCode: data.exitCode ?? -1,
                    helpers: data.helpers ?? [],
                  }
                : r
            )
          );
          es.close();
        }
      } catch {
        // ignore parse errors
      }
    };

    es.onerror = () => {
      es.close();
      this.actionRuns.update((runs) =>
        runs.map((r) =>
          r.runId === runId && r.status === "running"
            ? { ...r, status: "error" as const, exitCode: -1 }
            : r
        )
      );
    };
  }

  registerBackgroundRun(runId: string, actionId: string, actionLabel: string): void {
    const entry: ActionRunEntry = {
      runId,
      actionId,
      actionLabel,
      status: "running",
      exitCode: null,
      startedAt: new Date(),
      helpers: [],
      logs: [
        {
          ts: new Date().toISOString(),
          stream: "system",
          text: "[background] Process launched in background (non-blocking). Output not streamed.",
        },
      ],
    };
    this.actionRuns.update((runs) => [entry, ...runs]);
  }

  async stopAction(runId: string): Promise<void> {
    try {
      await postJson(`/api/actions/stop/${runId}`, {});
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to stop action.";
      this.addNotification("error", "Stop failed", msg);
    }
  }

  async putActionConfig(action: ActionDefinition): Promise<void> {
    await putJson("/api/actions/config", action);
    await this.refreshActions();
  }

  async saveVersion(version: VersionRecord): Promise<void> {
    await postJson("/api/versions/set", {
      artifactName: version.artifactName,
      nextVersion: version.nextVersion,
    });
    await this.refreshVersions();
  }

  async saveVersionAndReturn(version: VersionRecord): Promise<void> {
    await this.saveVersion(version);
    this.addNotification("success", "Version saved", `${version.artifactName} → ${version.nextVersion ?? "?"}`);
  }

  async incrementVersionApi(artifactName: string): Promise<void> {
    await postJson("/api/versions/increment", { artifactName });
    await this.refreshVersions();
    const updated = this.versions().find(v => v.artifactName === artifactName);
    const newVer = updated?.nextVersion ?? updated?.lastVersion ?? "?";
    this.addNotification("success", "Version incremented", `${artifactName} → ${newVer}`);
  }

  incrementPatch(version: string): string {
    const parsed = version.trim().match(/^(\d+)\.(\d+)\.(\d+)(?:[-+].*)?$/);
    if (!parsed) return version;
    const major = parseInt(parsed[1] ?? "0", 10);
    const minor = parseInt(parsed[2] ?? "0", 10);
    const patch = parseInt(parsed[3] ?? "0", 10);
    return `${major}.${minor}.${patch + 1}`;
  }

  addNotification(kind: AppNotification["kind"], title: string, message: string): void {
    const n: AppNotification = {
      id: crypto.randomUUID(),
      kind,
      title,
      message,
      ts: new Date(),
      read: false,
    };
    this.notifications.update((ns) => [n, ...ns].slice(0, 50));
  }

  markAllRead(): void {
    this.notifications.update((ns) => ns.map((n) => ({ ...n, read: true })));
  }

  clearNotifications(): void {
    this.notifications.set([]);
  }

  formatTimestamp(date: Date | null): string {
    if (!date) return "never";
    const diff = Date.now() - date.getTime();
    if (diff < 60_000) return "just now";
    if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
    return `${Math.floor(diff / 3_600_000)}h ago`;
  }
}

function deriveRepoName(path: string): string {
  const parts = path.replace(/\\/g, "/").split("/").filter(Boolean);
  return parts[parts.length - 1] ?? path;
}

async function readJson<T>(url: string): Promise<T> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`HTTP ${response.status} for ${url}`);
  }
  return (await response.json()) as T;
}

async function postJson(url: string, body: unknown): Promise<void> {
  const response = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    throw new Error(`HTTP ${response.status} for ${url}`);
  }
}

async function postJsonRead<T>(url: string, body: unknown): Promise<T> {
  const response = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    throw new Error(`HTTP ${response.status} for ${url}`);
  }
  return (await response.json()) as T;
}

async function putJson(url: string, body: unknown): Promise<void> {
  const response = await fetch(url, {
    method: "PUT",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    throw new Error(`HTTP ${response.status} for ${url}`);
  }
}
