import { Injectable, signal, computed } from "@angular/core";

export interface DaemonStatus {
  ok?: boolean;
  daemon?: {
    port?: number;
    repoRoot?: string | null;
  };
  selectedRepo?: {
    repoId: string;
    repoRoot: string;
  } | null;
}

export interface RepoRecord {
  id: string;
  path: string;
  name: string;
  selected: boolean;
  lastSeen?: string;
  type?: string;
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

@Injectable({ providedIn: "root" })
export class DaemonService {
  readonly status = signal<DaemonStatus | null>(null);
  readonly repos = signal<RepoRecord[]>([]);
  readonly versions = signal<VersionRecord[]>([]);
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly notifications = signal<AppNotification[]>([]);
  readonly lastRefreshed = signal<Date | null>(null);

  readonly isConnected = computed(() => this.status()?.ok === true);
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
    // Build the WebSocket URL respecting the base path (e.g. /envheaven-ui)
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
    }
  }

  async refreshAll(): Promise<void> {
    this.loading.set(true);
    await Promise.all([this.refreshStatus(), this.refreshRepos(), this.refreshVersions()]);
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
        repos?: Array<{ repoId: string; repoRoot: string }>;
      }>("/api/repos");

      this.repos.set(
        (payload.repos ?? []).map((repo) => ({
          id: repo.repoId,
          path: repo.repoRoot,
          name: deriveRepoName(repo.repoRoot),
          selected: repo.repoId === (payload.selectedRepoId ?? null),
          lastSeen: "recently",
          type: "env-repo",
        }))
      );
    } catch {
      // silently ignore — status covers connectivity
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

  async selectRepo(repo: RepoRecord): Promise<void> {
    await postJson("/api/repos/select", { repoRoot: repo.path });
    await this.refreshAll();
    this.addNotification("info", "Context switched", `Now using ${repo.name}`);
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
    this.notifications.update((ns) => [n, ...ns].slice(0, 20));
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
