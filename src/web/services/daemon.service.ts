import { Injectable, signal, computed } from "@angular/core";

export interface DaemonStatus {
  ok?: boolean;
  version?: string;
  daemon?: {
    port?: number;
    repoRoot?: string | null;
  };
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
  lastSeen?: string;
  type?: string;
  meta?: ArtifactMeta;
}

export interface VersionRecord {
  artifactName: string;
  packageName: string;
  lastVersion: string | null;
  nextVersion: string | null;
  displayTrack?: VersionPersistedTrack;
  tracks?: Partial<Record<VersionPersistedTrack, VersionTrackState>>;
}

export type VersionPersistedTrack = "exp" | "canary" | "alpha" | "beta" | "rc" | "release";

export interface VersionTrackState {
  lastVersion?: string;
  nextVersion?: string;
  updatedAt?: string;
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
  isLocalUser?: boolean;
  buttonColor?: string;
  terminalMode?: "pty" | "pipe";
  runMode?: "stream" | "background";
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
  terminalMode: "pty" | "pipe";
}

export type TerminalSessionKind = "pty" | "pipe" | "log";

export type TerminalSessionStatus =
  | "pending"
  | "running"
  | "completed"
  | "failed"
  | "terminated"
  | "unknown";

export interface TerminalSessionSummary {
  id: string;
  runId: string;
  actionId?: string;
  actionLabel?: string;
  actionRunId?: string;
  actionGroupId?: string;
  artifactId?: string;
  repoRoot?: string;
  command?: string;
  kind: TerminalSessionKind;
  status: TerminalSessionStatus;
  startedAt?: number;
  endedAt?: number;
  exitCode?: number | null;
  hasReplay?: boolean;
  canAttach: boolean;
  canStop: boolean;
  title?: string;
  prelude?: string;
}

export type ActionGroupStatus =
  | "pending"
  | "running"
  | "completed"
  | "failed"
  | "terminated";

export interface ActionGroupSummary {
  id: string;
  rootRunId?: string;
  artifactId?: string;
  repoRoot?: string;
  label?: string;
  status: ActionGroupStatus;
  runIds: string[];
  createdAt: number;
  updatedAt: number;
  endedAt?: number;
}

export interface ActionGroupDispatchTerminalRequest {
  slotId?: string;
  actionId?: string;
  repoRoot?: string;
  runCommand?: string;
  title?: string;
}

export interface ActionGroupDispatchRequest {
  artifactId?: string;
  repoRoot?: string;
  label?: string;
  terminals: ActionGroupDispatchTerminalRequest[];
}

export interface ActionGroupDispatchResult {
  ok: true;
  group: ActionGroupSummary;
  runs: TerminalSessionSummary[];
  slotRunMap: Record<string, string>;
}

export interface ActionGroupFilters {
  artifactId?: string;
  repoRoot?: string;
  status?: ActionGroupStatus;
}

export interface TerminalSessionFilters {
  artifactId?: string;
  repoRoot?: string;
  actionGroupId?: string;
  status?: TerminalSessionStatus;
}

export type ControlBlockKind =
  | "terminal"
  | "status"
  | "externalLinks"
  | "placeholder"
  | "notes"
  | (string & {});

export interface ControlPanelPreset {
  id: string;
  artifactId?: string;
  repoRoot?: string;
  name: string;
  layout: ControlLayoutNode;
  blocks: ControlBlock[];
  createdAt: number;
  updatedAt: number;
}

export type ControlLayoutNode =
  | { type: "split"; direction: "horizontal" | "vertical"; sizes?: number[]; children: ControlLayoutNode[] }
  | { type: "stack"; activeBlockId?: string; blockIds: string[] }
  | { type: "block"; blockId: string };

export interface ControlBlock {
  id: string;
  kind: ControlBlockKind;
  title: string;
  terminal?: ControlTerminalBinding;
  status?: Record<string, unknown>;
  externalLinks?: ControlExternalLink[];
}

export interface ControlTerminalBinding {
  slotId: string;
  runId?: string;
  expectedActionId?: string;
  expectedRepoRoot?: string;
  expectedCommand?: string;
  match?: {
    actionId?: string;
    repoRoot?: string;
    actionGroupId?: string;
    labelIncludes?: string;
  };
}

export interface ControlExternalLink {
  id: string;
  label: string;
  url: string;
}

export interface ActionGroupStopResult {
  ok: boolean;
  actionGroupId: string;
  group?: ActionGroupSummary;
  stoppedSessionIds: string[];
  alreadyCompletedSessionIds: string[];
}

export interface ActionOrderPreferences {
  actionIds: string[];
  headerActionIds: string[];
}

@Injectable({ providedIn: "root" })
export class DaemonService {
  readonly status = signal<DaemonStatus | null>(null);
  readonly repos = signal<RepoRecord[]>([]);
  readonly pinnedArtifactIds = signal<string[]>([]);
  readonly versions = signal<VersionRecord[]>([]);
  readonly actions = signal<ActionDefinition[]>([]);
  readonly actionOrderIds = signal<string[]>([]);
  readonly headerActionOrderIds = signal<string[]>([]);
  readonly actionRuns = signal<ActionRunEntry[]>([]);
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly notifications = signal<AppNotification[]>([]);
  readonly lastRefreshed = signal<Date | null>(null);
  readonly activeRepoPath = signal<string | null>(null);

  readonly isConnected = computed(() => this.status()?.ok === true);
  readonly daemonVersion = computed(() => this.status()?.version ?? null);
  readonly selectedRepo = computed(() =>
    this.repos().find((r) => r.path === this.activeRepoPath()) ?? null
  );
  readonly unreadCount = computed(
    () => this.notifications().filter((n) => !n.read).length
  );

  private pollingTimer: ReturnType<typeof setInterval> | null = null;
  private ws: WebSocket | null = null;
  private wsReconnectTimer: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    void this.refreshAll().then(() => this.restoreRunsFromDaemon());
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
    const basePath = (document.querySelector("base")?.getAttribute("href") ?? "/").replace(/\/+$/, "");
    const wsUrl = `${wsProtocol}//${location.host}${basePath}/ws`;

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
    if (type === "version:set") {
      await this.refreshVersions();
    } else if (type === "version:incremented") {
      await this.refreshVersions();
    } else if (type === "actions:updated") {
      await this.refreshActions();
    } else if (type === "action-group:created" || type === "action-group:updated") {
      await this.restoreRunsFromDaemon();
    } else if (type === "repos:pinned-updated") {
      await this.refreshPinnedArtifacts();
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
    await Promise.all([this.refreshStatus(), this.refreshRepos(), this.refreshPinnedArtifacts(), this.refreshVersions(), this.refreshActions()]);
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

      if (!this.activeRepoPath() && payload.daemon?.repoRoot) {
        this.activeRepoPath.set(payload.daemon.repoRoot);
        void Promise.all([this.refreshRepos(), this.refreshVersions(), this.refreshActions()]);
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
        repos?: Array<{ repoId: string; repoRoot: string; meta?: ArtifactMeta }>;
      }>("/api/repos");

      this.repos.set(
        (payload.repos ?? []).map((repo) => ({
          id: repo.repoId,
          path: repo.repoRoot,
          name: deriveRepoName(repo.repoRoot),
          lastSeen: "recently",
          type: "env-repo",
          meta: repo.meta,
        }))
      );
    } catch {
      // silently ignore
    }
  }

  async refreshPinnedArtifacts(): Promise<void> {
    try {
      const payload = await readJson<{ artifactIds?: string[] }>("/api/repos/pinned");
      this.pinnedArtifactIds.set(payload.artifactIds ?? []);
    } catch {
      // silently ignore
    }
  }

  async putPinnedArtifactIds(artifactIds: string[]): Promise<void> {
    await putJson("/api/repos/pinned", { artifactIds });
    this.pinnedArtifactIds.set([...new Set(artifactIds)]);
  }

  async refreshVersions(): Promise<void> {
    const repoRoot = this.activeRepoPath();
    if (!repoRoot) return;
    try {
      const payload = await readJson<{ versions: VersionRecord[] }>(`/api/versions?repoRoot=${encodeURIComponent(repoRoot)}`);
      this.versions.set(payload.versions ?? []);
    } catch {
      // silently ignore
    }
  }

  async refreshActions(): Promise<void> {
    const repoRoot = this.activeRepoPath();
    if (!repoRoot) return;
    try {
      const payload = await readJson<{ actions: ActionDefinition[]; actionOrder?: ActionOrderPreferences }>(`/api/actions?repoRoot=${encodeURIComponent(repoRoot)}`);
      this.actions.set(payload.actions ?? []);
      this.actionOrderIds.set(payload.actionOrder?.actionIds ?? []);
      this.headerActionOrderIds.set(payload.actionOrder?.headerActionIds ?? []);
    } catch {
      // silently ignore
    }
  }

  setActiveRepo(repoPath: string): void {
    this.activeRepoPath.set(repoPath);
    void this.refreshAll();
  }

  async putRepoMeta(meta: ArtifactMeta): Promise<void> {
    const repoRoot = this.activeRepoPath();
    await putJson("/api/repos/meta", { ...meta, repoRoot });
    await this.refreshRepos();
  }

  async dispatchAction(
    actionId: string,
    options: { background?: boolean; variantId?: string } = {}
  ): Promise<{ runId: string; terminalMode: "pty" | "pipe" } | null> {
    try {
      const payload = await postJsonRead<{ runId: string; terminalMode?: "pty" | "pipe"; ptyUnavailable?: boolean }>("/api/actions/dispatch", {
        actionId,
        repoRoot: this.activeRepoPath(),
        background: options.background ?? false,
        ...(options.variantId ? { variantId: options.variantId } : {}),
      });
      if (payload.ptyUnavailable) {
        this.addNotification("info", "PTY unavailable", "node-pty native bindings are missing — action running in pipe mode. Run `pnpm approve-builds` in the EnvHeaven workspace to enable PTY support.");
      }
      return { runId: payload.runId, terminalMode: payload.terminalMode ?? "pty" };
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to dispatch action.";
      this.addNotification("error", "Action dispatch failed", msg);
      return null;
    }
  }

  registerPtyRun(runId: string, actionId: string, actionLabel: string): void {
    const entry: ActionRunEntry = {
      runId,
      actionId,
      actionLabel,
      status: "running",
      exitCode: null,
      startedAt: new Date(),
      helpers: [],
      logs: [],
      terminalMode: "pty",
    };
    this.actionRuns.update((runs) => [entry, ...runs]);
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
      terminalMode: "pipe",
    };
    this.actionRuns.update((runs) => [entry, ...runs]);

    const es = new EventSource(apiUrl(`/api/actions/stream/${runId}`));

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
      terminalMode: "pipe",
    };
    this.actionRuns.update((runs) => [entry, ...runs]);
  }

  async stopAction(runId: string): Promise<void> {
    try {
      await this.stopActionRun(runId);
      this.actionRuns.update((runs) =>
        runs.map((r) =>
          r.runId === runId && r.status === "running"
            ? { ...r, status: "stopped" as const, exitCode: -1 }
            : r
        )
      );
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to stop action.";
      this.addNotification("error", "Stop failed", msg);
    }
  }

  async listTerminalSessions(filters: TerminalSessionFilters = {}): Promise<TerminalSessionSummary[]> {
    const params = new URLSearchParams();
    const repoRoot = filters.repoRoot ?? this.activeRepoPath() ?? undefined;
    if (filters.artifactId) params.set("artifactId", filters.artifactId);
    if (repoRoot) params.set("repoRoot", repoRoot);
    if (filters.actionGroupId) params.set("actionGroupId", filters.actionGroupId);
    if (filters.status) params.set("status", filters.status);
    const qs = params.toString() ? `?${params.toString()}` : "";
    const payload = await readJson<{ sessions?: TerminalSessionSummary[] }>(`/api/terminal-sessions${qs}`);
    return payload.sessions ?? [];
  }

  async stopTerminalSession(runId: string): Promise<void> {
    await this.stopActionRun(runId);
  }

  async stopActionRun(runId: string): Promise<void> {
    await postJson(`/api/actions/stop/${encodeURIComponent(runId)}`, {});
  }

  async stopActionGroup(actionGroupId: string): Promise<ActionGroupStopResult> {
    return await postJsonRead<ActionGroupStopResult>(
      `/api/action-groups/${encodeURIComponent(actionGroupId)}/stop`,
      {},
    );
  }

  async listActionGroups(filters: ActionGroupFilters = {}): Promise<ActionGroupSummary[]> {
    const params = new URLSearchParams();
    const repoRoot = filters.repoRoot ?? this.activeRepoPath() ?? undefined;
    if (filters.artifactId) params.set("artifactId", filters.artifactId);
    if (repoRoot) params.set("repoRoot", repoRoot);
    if (filters.status) params.set("status", filters.status);
    const qs = params.toString() ? `?${params.toString()}` : "";
    const payload = await readJson<{ groups?: ActionGroupSummary[] }>(`/api/action-groups${qs}`);
    return payload.groups ?? [];
  }

  async dispatchActionGroup(request: ActionGroupDispatchRequest): Promise<ActionGroupDispatchResult> {
    const repoRoot = request.repoRoot ?? this.activeRepoPath() ?? undefined;
    return await postJsonRead<ActionGroupDispatchResult>("/api/action-groups/dispatch", {
      ...request,
      repoRoot,
    });
  }

  async listControlPanelPresets(filters: { artifactId?: string; repoRoot?: string } = {}): Promise<ControlPanelPreset[]> {
    const params = new URLSearchParams();
    const repoRoot = filters.repoRoot ?? this.activeRepoPath() ?? undefined;
    if (filters.artifactId) params.set("artifactId", filters.artifactId);
    if (repoRoot) params.set("repoRoot", repoRoot);
    const qs = params.toString() ? `?${params.toString()}` : "";
    const payload = await readJson<{ presets?: ControlPanelPreset[] }>(`/api/control-panel/presets${qs}`);
    return payload.presets ?? [];
  }

  async createControlPanelPreset(preset: ControlPanelPreset): Promise<ControlPanelPreset> {
    const repoRoot = preset.repoRoot ?? this.activeRepoPath();
    const payload = await postJsonRead<{ preset: ControlPanelPreset }>("/api/control-panel/presets", {
      ...preset,
      repoRoot,
    });
    return payload.preset;
  }

  async updateControlPanelPreset(presetId: string, preset: ControlPanelPreset): Promise<ControlPanelPreset> {
    const repoRoot = preset.repoRoot ?? this.activeRepoPath();
    const payload = await putJsonRead<{ preset: ControlPanelPreset }>(
      `/api/control-panel/presets/${encodeURIComponent(presetId)}`,
      { ...preset, id: presetId, repoRoot },
    );
    return payload.preset;
  }

  async deleteControlPanelPreset(presetId: string, repoRoot = this.activeRepoPath()): Promise<void> {
    const qs = repoRoot ? `?repoRoot=${encodeURIComponent(repoRoot)}` : "";
    await deleteReq(`/api/control-panel/presets/${encodeURIComponent(presetId)}${qs}`);
  }

  async duplicateControlPanelPreset(preset: ControlPanelPreset, name = `${preset.name} copy`): Promise<ControlPanelPreset> {
    const duplicate: ControlPanelPreset = {
      ...preset,
      id: crypto.randomUUID(),
      name,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    return await this.createControlPanelPreset(duplicate);
  }

  async putActionConfig(action: ActionDefinition): Promise<void> {
    await putJson("/api/actions/config", { ...action, repoRoot: this.activeRepoPath() });
    await this.refreshActions();
  }

  async deleteActionConfig(actionId: string): Promise<void> {
    const repoRoot = this.activeRepoPath();
    const qs = repoRoot ? `?repoRoot=${encodeURIComponent(repoRoot)}` : "";
    await deleteReq(`/api/actions/config/${encodeURIComponent(actionId)}${qs}`);
    await this.refreshActions();
  }

  async moveActionConfig(actionId: string, toLocalUser: boolean): Promise<void> {
    await postJson("/api/actions/move", {
      actionId,
      repoRoot: this.activeRepoPath(),
      toLocalUser,
    });
    await this.refreshActions();
  }

  async putActionOrder(actionIds: string[], scope: "actions" | "header" = "actions"): Promise<void> {
    await putJson("/api/actions/order", {
      repoRoot: this.activeRepoPath(),
      actionIds,
      scope,
    });
    await this.refreshActions();
  }

  async restoreRunsFromDaemon(): Promise<void> {
    try {
      const payload = await readJson<{
        runs: Array<{
          runId: string;
          actionId: string;
          status: string;
          exitCode: number | null;
          startedAt: string;
          helpers: ActionHelper[];
          lines: Array<{ stream: string; data: string; ts: string }>;
          terminalMode?: "pty" | "pipe";
        }>;
      }>("/api/actions/runs/logs");

      const existing = new Set(this.actionRuns().map((r) => r.runId));
      const actions = this.actions();

      for (const run of payload.runs ?? []) {
        if (existing.has(run.runId)) continue;
        const actionDef = actions.find((a) => a.id === run.actionId);
        const entry: ActionRunEntry = {
          runId: run.runId,
          actionId: run.actionId,
          actionLabel: actionDef?.label ?? run.actionId,
          status: run.status as ActionRunEntry["status"],
          exitCode: run.exitCode,
          startedAt: new Date(run.startedAt),
          helpers: run.helpers ?? [],
          logs: run.lines.map((l) => ({
            ts: l.ts,
            stream: l.stream as ConsoleLogEntry["stream"],
            text: l.data,
          })),
          terminalMode: run.terminalMode ?? "pipe",
        };
        this.actionRuns.update((runs) => [...runs, entry]);
      }
    } catch {
      // silently ignore — daemon may not support this endpoint yet
    }
  }

  async saveVersion(version: VersionRecord): Promise<void> {
    await postJson("/api/versions/set", {
      repoRoot: this.activeRepoPath(),
      artifactName: version.artifactName,
      packageName: version.packageName,
      track: version.displayTrack ?? "release",
      nextVersion: version.nextVersion,
    });
    await this.refreshVersions();
  }

  async saveVersionAndReturn(version: VersionRecord): Promise<void> {
    await this.saveVersion(version);
    this.addNotification("success", "Version saved", `${version.artifactName} → ${version.nextVersion ?? "?"}`);
  }

  async incrementVersionApi(artifactName: string, packageName: string, track: 'patch' | 'minor' | 'exp' = 'patch'): Promise<void> {
    const endpoints: Record<string, string> = {
      patch: "/api/versions/increment",
      minor: "/api/versions/increment-minor",
      exp: "/api/versions/increment-exp",
    };
    const endpoint = endpoints[track] ?? endpoints["patch"]!;
    await postJson(endpoint, { repoRoot: this.activeRepoPath(), artifactName, packageName });
    await this.refreshVersions();
    const updated = this.versions().find(v => v.artifactName === artifactName && v.packageName === packageName);
    const newVer = updated?.nextVersion ?? updated?.lastVersion ?? "?";
    const labels: Record<string, string> = { patch: "Patch", minor: "Minor", exp: "Exp" };
    this.addNotification("success", `${labels[track] ?? "Version"} incremented`, `${artifactName} → ${newVer}`);
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

/**
 * Resolve an absolute API path to a URL that is correctly routed in all
 * hosting environments, including Replit's path-based proxy.
 *
 * In Replit, each artifact is served under a path prefix (e.g. /envheaven-ui/).
 * Requests with a root-relative path like /api/status are intercepted by the
 * proxy and routed to whichever artifact owns /api — NOT to this service.
 * Prepending the document's <base href> ensures requests go through this
 * service's server (start.js) where /api/* is proxied to the local daemon.
 *
 * Outside Replit (or when BASE_PATH is "/"), base is "/" and the path is
 * unchanged, preserving normal local-dev behaviour.
 */
function apiUrl(path: string): string {
  const base = (document.querySelector("base")?.getAttribute("href") ?? "/").replace(/\/+$/, "");
  const safePath = path.startsWith("/") ? path : `/${path}`;
  return base ? `${base}${safePath}` : safePath;
}

async function readJson<T>(url: string): Promise<T> {
  const resolved = apiUrl(url);
  const response = await fetch(resolved);
  if (!response.ok) {
    throw new Error(`HTTP ${response.status} for ${resolved}`);
  }
  return (await response.json()) as T;
}

async function postJson(url: string, body: unknown): Promise<void> {
  const resolved = apiUrl(url);
  const response = await fetch(resolved, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    throw new Error(await extractErrorMessage(response, resolved));
  }
}

async function postJsonRead<T>(url: string, body: unknown): Promise<T> {
  const resolved = apiUrl(url);
  const response = await fetch(resolved, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    throw new Error(await extractErrorMessage(response, resolved));
  }
  return (await response.json()) as T;
}

async function putJson(url: string, body: unknown): Promise<void> {
  const resolved = apiUrl(url);
  const response = await fetch(resolved, {
    method: "PUT",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    throw new Error(await extractErrorMessage(response, resolved));
  }
}

async function putJsonRead<T>(url: string, body: unknown): Promise<T> {
  const resolved = apiUrl(url);
  const response = await fetch(resolved, {
    method: "PUT",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    throw new Error(await extractErrorMessage(response, resolved));
  }
  return (await response.json()) as T;
}

async function deleteReq(url: string): Promise<void> {
  const resolved = apiUrl(url);
  const response = await fetch(resolved, { method: "DELETE" });
  if (!response.ok) {
    throw new Error(await extractErrorMessage(response, resolved));
  }
}

async function extractErrorMessage(response: Response, url: string): Promise<string> {
  try {
    const j = await response.json() as { error?: string };
    if (typeof j.error === "string" && j.error) return j.error;
  } catch { /* ignore */ }
  return `HTTP ${response.status} for ${url}`;
}
