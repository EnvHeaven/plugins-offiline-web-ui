import { Component, inject, computed, signal, viewChild, ElementRef, effect } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { DomSanitizer, SafeHtml } from "@angular/platform-browser";
import {
  DaemonService,
  ActionDefinition,
  ActionVariant,
  ActionHelper,
  ArtifactMeta,
  PageHeaderOptions,
  RepoRecord,
  VersionPersistedTrack,
  VersionRecord,
} from "../services/daemon.service";
import { NavService } from "../services/nav.service";
import { VersionPanelComponent, TerminalPanelComponent, TerminalExitEvent } from "@jovdk-web";

type DetailTab = "overview" | "versions" | "actions" | "tree" | "logs";
type RunMode = "stream" | "background";
type ActionOrderScope = "actions" | "header";

interface ConsoleDisplayEntry {
  ts: string;
  stream: string;
  text: string;
  level: string;
}

interface ConsoleSourceGroup {
  actionId: string;
  actionLabel: string;
  runs: { id: string; ts: Date; isEnded: boolean }[];
}

interface ArtifactTreeRow {
  repo: RepoRecord;
  depth: number;
  relation: "parent" | "current" | "child";
}

const ICON_PATHS: Record<string, string> = {
  play: "<polygon points='5,3 19,12 5,21'/>",
  build: "<path stroke-linecap='round' stroke-linejoin='round' d='M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z'/>",
  deploy: "<path stroke-linecap='round' stroke-linejoin='round' d='M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12'/>",
  test: "<path stroke-linecap='round' stroke-linejoin='round' d='M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4'/>",
  sync: "<path stroke-linecap='round' stroke-linejoin='round' d='M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15'/>",
  clean: "<path stroke-linecap='round' stroke-linejoin='round' d='M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16'/>",
  package: "<path stroke-linecap='round' stroke-linejoin='round' d='M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4'/>",
  upload: "<path stroke-linecap='round' stroke-linejoin='round' d='M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12'/>",
  download: "<path stroke-linecap='round' stroke-linejoin='round' d='M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4'/>",
  open: "<path stroke-linecap='round' stroke-linejoin='round' d='M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14'/>",
  terminal: "<path stroke-linecap='round' stroke-linejoin='round' d='M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z'/>",
  server: "<path stroke-linecap='round' stroke-linejoin='round' d='M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01'/>",
  git: "<path stroke-linecap='round' stroke-linejoin='round' d='M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4'/>",
  check: "<polyline points='20,6 9,17 4,12'/>",
};

function normalizeRepoPath(value: string): string {
  const normalized = value.replace(/\\/g, "/").replace(/\/+$/g, "");
  return normalized || "/";
}

function pathDepth(value: string): number {
  return normalizeRepoPath(value).split("/").filter(Boolean).length;
}

function isAncestorPath(parentPath: string, childPath: string): boolean {
  const parent = normalizeRepoPath(parentPath);
  const child = normalizeRepoPath(childPath);
  return parent !== child && child.startsWith(`${parent}/`);
}

function nearestKnownParent(repo: RepoRecord, repos: RepoRecord[]): RepoRecord | null {
  const repoPath = normalizeRepoPath(repo.path);
  return repos
    .filter((candidate) => candidate.id !== repo.id && isAncestorPath(normalizeRepoPath(candidate.path), repoPath))
    .sort((a, b) => pathDepth(b.path) - pathDepth(a.path))[0] ?? null;
}

function orderActions(actions: ActionDefinition[], actionIds: string[]): ActionDefinition[] {
  const indexById = new Map(actionIds.map((id, index) => [id, index]));
  return [...actions].sort((a, b) => {
    const aIndex = indexById.get(a.id);
    const bIndex = indexById.get(b.id);
    if (aIndex !== undefined && bIndex !== undefined) return aIndex - bIndex;
    if (aIndex !== undefined) return -1;
    if (bIndex !== undefined) return 1;
    return a.id.localeCompare(b.id);
  });
}

@Component({
  selector: "eh-artifact-detail",
  standalone: true,
  imports: [FormsModule, VersionPanelComponent, TerminalPanelComponent],
  templateUrl: './artifact-detail.component.html',
  styleUrl: './artifact-detail.component.css',
})
export class ArtifactDetailComponent {
  readonly daemon = inject(DaemonService);
  readonly nav = inject(NavService);
  private readonly sanitizer = inject(DomSanitizer);

  readonly logPane = viewChild<ElementRef>("logPane");

  readonly iconOptions: string[] = Object.keys(ICON_PATHS);
  readonly versionTracks: VersionPersistedTrack[] = ["exp", "canary", "alpha", "beta", "rc", "release"];
  readonly versionTrackSelections = signal<Record<string, VersionPersistedTrack>>({});
  readonly versionTrackLock = signal(false);
  readonly globalVersionTrack = computed((): VersionPersistedTrack | null => {
    const versions = this.daemon.versions();
    if (versions.length === 0) return null;

    const selections = this.versionTrackSelections();
    const firstTrack = selections[this.versionKey(versions[0])] ?? this.defaultVersionTrack(versions[0]);
    return versions.every((version) => (selections[this.versionKey(version)] ?? this.defaultVersionTrack(version)) === firstTrack)
      ? firstTrack
      : null;
  });

  readonly tabs: { id: DetailTab; label: string }[] = [
    { id: "overview", label: "Overview" },
    { id: "versions", label: "Versions" },
    { id: "actions", label: "Actions" },
    { id: "tree", label: "Tree" },
    { id: "logs", label: "Dev Tools" },
  ];

  readonly artifact = computed(() => {
    const id = this.nav.selectedArtifactId();
    return this.daemon.repos().find((r) => r.id === id) ?? null;
  });

  readonly artifactTreeRows = computed(() => {
    const current = this.artifact();
    if (!current) return [];

    const currentPath = normalizeRepoPath(current.path);
    const visibleRepos = this.daemon.repos()
      .filter((repo) => {
        const repoPath = normalizeRepoPath(repo.path);
        return repo.id === current.id || isAncestorPath(repoPath, currentPath) || isAncestorPath(currentPath, repoPath);
      })
      .sort((a, b) => {
        const depthDiff = pathDepth(a.path) - pathDepth(b.path);
        return depthDiff === 0 ? a.path.localeCompare(b.path) : depthDiff;
      });

    const visibleIds = new Set(visibleRepos.map((repo) => repo.id));
    const childrenByParent = new Map<string, RepoRecord[]>();
    const roots: RepoRecord[] = [];

    for (const repo of visibleRepos) {
      const parent = nearestKnownParent(repo, visibleRepos);
      if (parent && visibleIds.has(parent.id)) {
        const children = childrenByParent.get(parent.id) ?? [];
        children.push(repo);
        childrenByParent.set(parent.id, children);
      } else {
        roots.push(repo);
      }
    }

    for (const children of childrenByParent.values()) {
      children.sort((a, b) => a.path.localeCompare(b.path));
    }

    const rows: ArtifactTreeRow[] = [];
    const visit = (repo: RepoRecord, depth: number) => {
      rows.push({
        repo,
        depth,
        relation: repo.id === current.id ? "current" : isAncestorPath(normalizeRepoPath(repo.path), currentPath) ? "parent" : "child",
      });
      for (const child of childrenByParent.get(repo.id) ?? []) {
        visit(child, depth + 1);
      }
    };

    for (const root of roots) {
      visit(root, 0);
    }

    return rows;
  });

  private readonly autoSelectEffect = effect(() => {
    const repo = this.artifact();
    if (repo && this.daemon.activeRepoPath() !== repo.path) {
      this.daemon.setActiveRepo(repo.path);
    }
  });

  private readonly versionTrackSelectionEffect = effect(() => {
    const versions = this.daemon.versions();
    const current = this.versionTrackSelections();
    const next: Record<string, VersionPersistedTrack> = {};
    let changed = Object.keys(current).length !== versions.length;

    for (const version of versions) {
      const key = this.versionKey(version);
      next[key] = current[key] ?? this.defaultVersionTrack(version);
      changed = changed || next[key] !== current[key];
    }

    if (changed) {
      this.versionTrackSelections.set(next);
    }
  });

  // Action editing
  readonly editingActionId = signal<string | null>(null);
  readonly editDraft = signal<ActionDefinition | null>(null);
  readonly confirmDeleteActionId = signal<string | null>(null);
  readonly reorderingActions = signal(false);
  readonly draggedActionId = signal<string | null>(null);
  readonly draggedActionScope = signal<ActionOrderScope | null>(null);
  readonly dragOverActionId = signal<string | null>(null);

  // New action form
  readonly addingAction = signal(false);
  readonly newActionDraft = signal<Partial<ActionDefinition & { id: string }>>({
    id: "",
    label: "New Action",
    description: "",
    icon: "play",
    runCommand: "",
    stopCommand: null,
    runLabel: "Run",
    stopLabel: "Stop",
    successHelpers: [],
    failHelpers: [],
    isLocalUser: true,
    terminalMode: "pty",
    runMode: "stream",
  });

  // Selected variant per action (empty string = default)
  readonly selectedVariants = signal<Record<string, string>>({});

  // Metadata editing
  readonly metaEditing = signal(false);
  readonly metaDraft = signal<ArtifactMeta>({});

  // Active PTY terminal run for the Dev Tools tab
  readonly activePtyRunId = signal<string | null>(null);

  readonly activePtyRun = computed(() => {
    const id = this.activePtyRunId();
    return id ? this.daemon.actionRuns().find((r) => r.runId === id) ?? null : null;
  });

  // Dev Tools console
  readonly selectedConsoleSource = signal<string>("daemon");
  readonly showEndedInstances = signal(localStorage.getItem("eh:showEndedRuns") === "true");
  readonly showHiddenSources = signal(false);
  readonly hiddenSources = signal<Set<string>>(
    new Set(JSON.parse(localStorage.getItem("eh:hiddenSources") || "[]")),
  );
  readonly clearedSources = signal<Set<string>>(new Set());

  // Stored scroll positions per console source for independent restoration
  private readonly sourceScrollPositions = new Map<string, number>();

  // Groups action runs by action ID for optgroup dropdown
  readonly consoleSourceGroups = computed((): ConsoleSourceGroup[] => {
    const runs = this.daemon.actionRuns();
    const showEnded = this.showEndedInstances();
    const hidden = this.hiddenSources();
    const showHidden = this.showHiddenSources();
    const filtered = runs.filter((r) => {
      if (!showEnded && r.status !== "running") return false;
      if (!showHidden && hidden.has(r.runId)) return false;
      return true;
    });

    const map = new Map<string, ConsoleSourceGroup>();
    for (const r of filtered) {
      if (!map.has(r.actionId)) {
        map.set(r.actionId, { actionId: r.actionId, actionLabel: r.actionLabel, runs: [] });
      }
      map.get(r.actionId)!.runs.push({ id: r.runId, ts: r.startedAt, isEnded: r.status !== "running" });
    }
    return Array.from(map.values());
  });

  readonly isActiveSourceHidden = computed((): boolean => {
    const source = this.selectedConsoleSource();
    return this.hiddenSources().has(source);
  });

  readonly activeConsoleLogs = computed((): ConsoleDisplayEntry[] => {
    const source = this.selectedConsoleSource();
    const cleared = this.clearedSources();

    if (source === "daemon") {
      if (cleared.has("daemon")) return [];
      return this.daemon.notifications().map((n) => ({
        ts: formatShortTime(n.ts),
        stream: n.kind === "error" ? "stderr" : "system",
        text: `[${n.title}] ${n.message}`,
        level: n.kind,
      }));
    }

    const showEnded = this.showEndedInstances();
    const run = this.daemon.actionRuns().find((r) => r.runId === source);
    if (!run || cleared.has(source)) return [];
    const isEnded = run.status !== "running";
    if (!showEnded && isEnded) return [];
    return run.logs.map((l) => ({
      ts: l.ts.slice(11, 19),
      stream: l.stream,
      text: l.text,
      level: l.stream === "stderr" ? "error" : "info",
    }));
  });

  readonly activeSourceLabel = computed((): string => {
    const source = this.selectedConsoleSource();
    if (source === "daemon") return "service — notifications";
    const run = this.daemon.actionRuns().find((r) => r.runId === source);
    return run ? `${run.actionLabel} #${run.runId.slice(0, 6)}` : source;
  });

  readonly isActiveSourceLive = computed((): boolean => {
    const source = this.selectedConsoleSource();
    if (source === "daemon") return this.daemon.isConnected();
    const run = this.daemon.actionRuns().find((r) => r.runId === source);
    return run?.status === "running";
  });

  constructor() {
    // Auto-scroll to bottom only when the selected source is live (streaming)
    effect(() => {
      const logs = this.activeConsoleLogs();
      if (!this.isActiveSourceLive()) return;
      if (logs.length === 0) return;
      const el = this.logPane()?.nativeElement as HTMLElement | undefined;
      if (el) {
        setTimeout(() => {
          el.scrollTop = el.scrollHeight;
        }, 0);
      }
    });
  }

  // ── Ordered actions ──────────────────────────────────────────────────
  readonly orderedActions = computed(() =>
    orderActions(this.daemon.actions(), this.daemon.actionOrderIds())
  );

  // ── Header actions (pinned to page header bar) ───────────────────────
  readonly headerActions = computed(() =>
    orderActions(
      this.daemon.actions().filter((a) => a.pageHeaderOptions?.isFixedOnHeader === true),
      this.daemon.headerActionOrderIds(),
    )
  );

  getHeaderActionLabel(action: ActionDefinition): string {
    if (action.pageHeaderOptions?.hasToReplaceActionText && action.pageHeaderOptions.actionTextToReplace) {
      return action.pageHeaderOptions.actionTextToReplace;
    }
    return action.label;
  }

  // ── Icon helper ──────────────────────────────────────────────────────
  getIcon(name: string, size = "w-4 h-4", strokeWidth = "1.5"): SafeHtml {
    const paths = ICON_PATHS[name || "play"] ?? ICON_PATHS["play"];
    const svg = `<svg class="${size}" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="${strokeWidth}">${paths}</svg>`;
    return this.sanitizer.bypassSecurityTrustHtml(svg);
  }

  // ── Run mode ─────────────────────────────────────────────────────────
  getRunMode(action: ActionDefinition): RunMode {
    return action.runMode ?? "stream";
  }

  toggleReorderingActions(): void {
    this.reorderingActions.update((value) => !value);
  }

  startActionDrag(scope: ActionOrderScope, actionId: string, event: DragEvent): void {
    if (scope === "actions" && !this.reorderingActions()) return;
    this.draggedActionId.set(actionId);
    this.draggedActionScope.set(scope);
    this.dragOverActionId.set(null);
    event.dataTransfer?.setData("text/plain", actionId);
    if (event.dataTransfer) {
      event.dataTransfer.effectAllowed = "move";
    }
  }

  moveActionDragOver(scope: ActionOrderScope, actionId: string, event: DragEvent): void {
    if (this.draggedActionScope() !== scope || this.draggedActionId() === actionId) return;
    event.preventDefault();
    this.dragOverActionId.set(actionId);
    if (event.dataTransfer) {
      event.dataTransfer.dropEffect = "move";
    }
  }

  async dropAction(scope: ActionOrderScope, targetActionId: string, event: DragEvent): Promise<void> {
    event.preventDefault();
    const sourceActionId = this.draggedActionId();
    if (!sourceActionId || this.draggedActionScope() !== scope || sourceActionId === targetActionId) {
      this.endActionDrag();
      return;
    }

    const actions = scope === "header" ? this.headerActions() : this.orderedActions();
    const ids = actions.map((action) => action.id);
    const sourceIndex = ids.indexOf(sourceActionId);
    const targetIndex = ids.indexOf(targetActionId);
    if (sourceIndex < 0 || targetIndex < 0) {
      this.endActionDrag();
      return;
    }

    ids.splice(sourceIndex, 1);
    ids.splice(targetIndex, 0, sourceActionId);

    try {
      await this.daemon.putActionOrder(ids, scope);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to save action order.";
      this.daemon.addNotification("error", "Reorder failed", msg);
    } finally {
      this.endActionDrag();
    }
  }

  endActionDrag(): void {
    this.draggedActionId.set(null);
    this.draggedActionScope.set(null);
    this.dragOverActionId.set(null);
  }

  // ── Variant selector ─────────────────────────────────────────────────
  getSelectedVariant(actionId: string): string {
    return this.selectedVariants()[actionId] ?? "";
  }

  setSelectedVariant(actionId: string, variantId: string): void {
    this.selectedVariants.update((v) => ({ ...v, [actionId]: variantId }));
  }

  // ── Dev Tools: switch console source with per-source scroll restore ──
  switchConsoleSource(sourceId: string): void {
    const el = this.logPane()?.nativeElement as HTMLElement | undefined;
    if (el) {
      this.sourceScrollPositions.set(this.selectedConsoleSource(), el.scrollTop);
    }
    this.selectedConsoleSource.set(sourceId);

    const run = this.daemon.actionRuns().find((r) => r.runId === sourceId);
    if (run?.terminalMode === "pty") {
      this.activePtyRunId.set(sourceId);
    } else {
      this.activePtyRunId.set(null);
      setTimeout(() => {
        const newEl = this.logPane()?.nativeElement as HTMLElement | undefined;
        if (!newEl) return;
        const saved = this.sourceScrollPositions.get(sourceId);
        if (saved !== undefined) {
          newEl.scrollTop = saved;
        } else {
          newEl.scrollTop = newEl.scrollHeight;
        }
      }, 0);
    }
  }

  // ── Repo helpers ─────────────────────────────────────────────────────
  copyPath(): void {
    const repo = this.artifact();
    if (repo) void navigator.clipboard.writeText(repo.path);
  }

  copyText(text: string): void {
    void navigator.clipboard.writeText(text);
  }

  // ── Version actions ──────────────────────────────────────────────────
  versionKey(version: VersionRecord): string {
    return `${version.artifactName}::${version.packageName}`;
  }

  selectedTrackForVersion(version: VersionRecord): VersionPersistedTrack {
    return this.versionTrackSelections()[this.versionKey(version)] ?? this.defaultVersionTrack(version);
  }

  setAllVersionTracks(track: VersionPersistedTrack): void {
    const next = Object.fromEntries(this.daemon.versions().map((version) => [this.versionKey(version), track]));
    this.versionTrackSelections.set(next);
  }

  selectVersionTrack(version: VersionRecord, track: VersionPersistedTrack): void {
    if (this.versionTrackLock()) {
      this.setAllVersionTracks(track);
      return;
    }
    this.versionTrackSelections.update((current) => ({ ...current, [this.versionKey(version)]: track }));
  }

  toggleVersionTrackLock(): void {
    this.versionTrackLock.update((value) => !value);
  }

  private defaultVersionTrack(version: VersionRecord): VersionPersistedTrack {
    if (version.displayTrack) return version.displayTrack;
    for (const track of this.versionTracks) {
      const state = version.tracks?.[track];
      if (state?.nextVersion || state?.lastVersion) return track;
    }
    return "release";
  }

  async saveVersionByName(
    artifactName: string,
    packageName: string,
    track: 'exp' | 'canary' | 'alpha' | 'beta' | 'rc' | 'release',
    nextVersion: string,
  ): Promise<void> {
    const ver = this.daemon.versions().find((v) => v.artifactName === artifactName && v.packageName === packageName);
    if (!ver) return;
    await this.daemon.saveVersionAndReturn({ ...ver, displayTrack: track, nextVersion });
  }

  async incrementVersionByName(artifactName: string, packageName: string, track: 'patch' | 'minor' | 'exp' = 'patch'): Promise<void> {
    await this.daemon.incrementVersionApi(artifactName, packageName, track);
  }

  // ── Metadata edit ─────────────────────────────────────────────────────
  startMetaEdit(): void {
    const repo = this.artifact();
    if (!repo) return;
    this.metaDraft.set({
      icon: repo.meta?.icon ?? "",
      internalName: repo.meta?.internalName ?? "",
      labelName: repo.meta?.labelName ?? "",
      instanceLabelName: repo.meta?.instanceLabelName ?? "",
    });
    this.metaEditing.set(true);
  }

  async saveMetaEdit(): Promise<void> {
    try {
      await this.daemon.putRepoMeta(this.metaDraft());
      this.metaEditing.set(false);
      this.daemon.addNotification("success", "Metadata saved", "Artifact metadata updated.");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to save metadata.";
      this.daemon.addNotification("error", "Save failed", msg);
    }
  }

  cancelMetaEdit(): void {
    this.metaEditing.set(false);
  }

  // ── Action run ────────────────────────────────────────────────────────
  async runAction(actionId: string): Promise<void> {
    const action = this.daemon.actions().find((a) => a.id === actionId);
    if (!action) return;
    const mode = this.getRunMode(action);
    const background = mode === "background";
    const variantId = this.getSelectedVariant(actionId) || undefined;
    const result = await this.daemon.dispatchAction(actionId, { background, variantId });
    if (result) {
      const { runId, terminalMode } = result;
      const isPty = terminalMode === "pty";
      if (isPty) {
        this.daemon.registerPtyRun(runId, actionId, action.label);
        this.activePtyRunId.set(runId);
        this.selectedConsoleSource.set(runId);
      } else if (!background) {
        this.daemon.streamAction(runId, actionId, action.label);
        this.sourceScrollPositions.delete(runId);
        this.selectedConsoleSource.set(runId);
      } else {
        this.daemon.registerBackgroundRun(runId, actionId, action.label);
        this.daemon.addNotification("info", "Launched in background", `Action '${action.label}' is running in background (non-blocking).`);
      }
    }
  }

  onTerminalExited(event: TerminalExitEvent): void {
    this.daemon.actionRuns.update((runs) =>
      runs.map((r) =>
        r.runId === event.runId
          ? { ...r, status: event.status as "success" | "error" | "stopped", exitCode: event.exitCode }
          : r
      )
    );
  }

  openTerminalForRun(runId: string): void {
    this.activePtyRunId.set(runId);
    this.selectedConsoleSource.set(runId);
  }

  closePtyTerminal(): void {
    this.activePtyRunId.set(null);
  }

  async stopAction(runId: string): Promise<void> {
    await this.daemon.stopAction(runId);
  }

  latestRunForAction(actionId: string) {
    return this.daemon.actionRuns().find((r) => r.actionId === actionId) ?? null;
  }

  // ── Action editing ────────────────────────────────────────────────────
  toggleEditAction(action: ActionDefinition): void {
    if (this.editingActionId() === action.id) {
      this.cancelEdit();
    } else {
      this.editDraft.set({ ...action });
      this.editingActionId.set(action.id);
      this.addingAction.set(false);
    }
  }

  cancelEdit(): void {
    this.editingActionId.set(null);
    this.editDraft.set(null);
    this.confirmDeleteActionId.set(null);
  }

  async confirmDeleteAction(actionId: string): Promise<void> {
    try {
      await this.daemon.deleteActionConfig(actionId);
      this.confirmDeleteActionId.set(null);
      this.editingActionId.set(null);
      this.editDraft.set(null);
      this.daemon.addNotification("success", "Action deleted", `Action '${actionId}' removed.`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to delete action.";
      this.daemon.addNotification("error", "Delete failed", msg);
    }
  }

  async saveEdit(): Promise<void> {
    const draft = this.editDraft();
    if (!draft) return;
    try {
      await this.daemon.putActionConfig(draft);
      this.editingActionId.set(null);
      this.editDraft.set(null);
      this.daemon.addNotification("success", "Action saved", `Action '${draft.label}' updated.`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to save action.";
      this.daemon.addNotification("error", "Save failed", msg);
    }
  }

  updateDraft(field: keyof ActionDefinition, value: unknown): void {
    this.editDraft.update((d) => (d ? { ...d, [field]: value } : d));
  }

  updateDraftPageHeaderOptions(field: keyof PageHeaderOptions, value: unknown): void {
    this.editDraft.update((d) => {
      if (!d) return d;
      const current = d.pageHeaderOptions ?? { isFixedOnHeader: false };
      const updated = { ...current, [field]: value };
      return { ...d, pageHeaderOptions: updated.isFixedOnHeader ? updated : undefined };
    });
  }

  addHelper(list: "success" | "fail"): void {
    const key = list === "success" ? "successHelpers" : "failHelpers";
    const blank: ActionHelper = { kind: "open-url", label: "", value: "" };
    this.editDraft.update((d) => (d ? { ...d, [key]: [...(d[key] ?? []), blank] } : d));
  }

  removeHelper(list: "success" | "fail", index: number): void {
    const key = list === "success" ? "successHelpers" : "failHelpers";
    this.editDraft.update((d) => {
      if (!d) return d;
      const arr = [...(d[key] ?? [])];
      arr.splice(index, 1);
      return { ...d, [key]: arr };
    });
  }

  updateHelper(list: "success" | "fail", index: number, field: keyof ActionHelper, value: string): void {
    const key = list === "success" ? "successHelpers" : "failHelpers";
    this.editDraft.update((d) => {
      if (!d) return d;
      const arr = [...(d[key] ?? [])] as ActionHelper[];
      arr[index] = { ...(arr[index] ?? { kind: "open-url", label: "", value: "" }), [field]: value };
      return { ...d, [key]: arr };
    });
  }

  // ── New action form ───────────────────────────────────────────────────
  startAddAction(): void {
    this.addingAction.set(true);
    this.editingActionId.set(null);
    this.editDraft.set(null);
    this.newActionDraft.set({
      id: "",
      label: "New Action",
      description: "",
      icon: "play",
      runCommand: "",
      stopCommand: null,
      runLabel: "Run",
      stopLabel: "Stop",
      successHelpers: [],
      failHelpers: [],
      isLocalUser: true,
      terminalMode: "pty",
      runMode: "stream",
    });
  }

  async saveNewAction(): Promise<void> {
    const draft = this.newActionDraft();
    if (!draft.id || !draft.runCommand) return;
    try {
      await this.daemon.putActionConfig({
        id: draft.id,
        label: draft.label ?? draft.id,
        description: draft.description ?? "",
        icon: draft.icon ?? "play",
        runCommand: draft.runCommand,
        stopCommand: draft.stopCommand ?? null,
        runLabel: draft.runLabel ?? "Run",
        stopLabel: draft.stopLabel ?? "Stop",
        successHelpers: draft.successHelpers ?? [],
        failHelpers: draft.failHelpers ?? [],
        isLocalUser: draft.isLocalUser ?? true,
        buttonColor: draft.buttonColor,
        terminalMode: draft.terminalMode,
        runMode: draft.runMode,
      });
      this.addingAction.set(false);
      this.daemon.addNotification("success", "Action created", `Action '${draft.label ?? draft.id}' created.`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to create action.";
      this.daemon.addNotification("error", "Create failed", msg);
    }
  }

  cancelAddAction(): void {
    this.addingAction.set(false);
  }

  toggleShowEndedInstances(value: boolean): void {
    this.showEndedInstances.set(value);
    localStorage.setItem("eh:showEndedRuns", String(value));
  }

  toggleShowHiddenSources(value: boolean): void {
    this.showHiddenSources.set(value);
  }

  hideActiveSource(): void {
    const source = this.selectedConsoleSource();
    if (source === "daemon") return;
    this.hiddenSources.update((s) => {
      const next = new Set(s);
      next.add(source);
      return next;
    });
    this.persistHiddenSources();
    this.selectedConsoleSource.set("daemon");
  }

  unhideActiveSource(): void {
    const source = this.selectedConsoleSource();
    this.hiddenSources.update((s) => {
      const next = new Set(s);
      next.delete(source);
      return next;
    });
    this.persistHiddenSources();
  }

  private persistHiddenSources(): void {
    localStorage.setItem("eh:hiddenSources", JSON.stringify([...this.hiddenSources()]));
  }

  async moveAction(actionId: string, toLocalUser: boolean): Promise<void> {
    try {
      await this.daemon.moveActionConfig(actionId, toLocalUser);
      this.daemon.addNotification(
        "success",
        "Action moved",
        `Action '${actionId}' moved to ${toLocalUser ? "local-user" : "base repo"}.`
      );
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to move action.";
      this.daemon.addNotification("error", "Move failed", msg);
    }
  }

  // ── Dev Tools ─────────────────────────────────────────────────────────
  clearActiveConsole(): void {
    const source = this.selectedConsoleSource();
    if (source === "daemon") {
      this.daemon.clearNotifications();
    } else {
      this.clearedSources.update((s) => {
        const next = new Set(s);
        next.add(source);
        return next;
      });
    }
  }

  formatTs(d: Date): string {
    return d.toLocaleTimeString("en-US", { hour12: false, hour: "2-digit", minute: "2-digit", second: "2-digit" });
  }
}

function formatShortTime(d: Date): string {
  return d.toLocaleTimeString("en-US", { hour12: false, hour: "2-digit", minute: "2-digit", second: "2-digit" });
}
