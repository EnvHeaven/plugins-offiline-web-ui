import { Component, inject, computed, signal } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { DaemonService, VersionRecord } from "../services/daemon.service";
import { NavService } from "../services/nav.service";
import { VersionPanelComponent } from "@jovdk-web";

type DetailTab = "overview" | "versions" | "actions" | "tree" | "logs";

interface ActionState {
  running: boolean;
  done: boolean;
  error: string | null;
  output: string[];
}

@Component({
  selector: "eh-artifact-detail",
  standalone: true,
  imports: [FormsModule, VersionPanelComponent],
  template: `
    <div class="flex flex-col h-full overflow-hidden animate-[fadeIn_0.2s_ease-out]">

      <!-- Detail header -->
      <div class="px-8 pt-7 pb-0 flex-shrink-0">

        <!-- Back button -->
        <button class="flex items-center gap-1.5 text-xs text-tx-muted hover:text-tx-secondary transition-colors mb-4"
                (click)="nav.goBack()">
          <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M15 19l-7-7 7-7"/>
          </svg>
          All Artifacts
        </button>

        <!-- Artifact title -->
        @if (artifact(); as repo) {
          <div class="flex items-start justify-between gap-4">
            <div class="flex items-center gap-3">
              <div class="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                   [class]="repo.selected ? 'bg-accent-dim border border-accent-border' : 'bg-bg-raised border border-border-default'">
                <svg class="w-5 h-5" [class]="repo.selected ? 'text-accent-light' : 'text-tx-muted'"
                     fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"/>
                </svg>
              </div>
              <div>
                <div class="flex items-center gap-2">
                  <h1 class="text-xl font-semibold text-tx-primary">{{ repo.name }}</h1>
                  @if (repo.selected) {
                    <span class="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-accent-dim text-accent-light border border-accent-border uppercase tracking-wide">Active</span>
                  }
                </div>
                <p class="text-xs text-tx-muted font-mono mt-0.5 max-w-lg truncate">{{ repo.path }}</p>
              </div>
            </div>

            <div class="flex items-center gap-2 flex-shrink-0">
              @if (!repo.selected) {
                <button class="flex items-center gap-1.5 px-3 py-1.5 rounded border border-border-default bg-bg-surface text-tx-secondary text-sm hover:text-tx-primary hover:border-border-strong transition-colors"
                        (click)="useThisRepo()">
                  Use this artifact
                </button>
              }
            </div>
          </div>
        } @else {
          <div class="flex items-center gap-3 mb-2">
            <div class="w-10 h-10 rounded-lg bg-bg-raised border border-border-default"></div>
            <div class="h-6 w-48 bg-bg-raised rounded animate-pulse"></div>
          </div>
        }

        <!-- Tab bar -->
        <div class="flex items-end gap-0 mt-5 border-b border-border-subtle">
          @for (tab of tabs; track tab.id) {
            <button class="relative px-4 py-2.5 text-sm transition-colors"
                    [class]="nav.activeDetailTab() === tab.id
                      ? 'text-tx-primary font-medium tab-active'
                      : 'text-tx-secondary hover:text-tx-primary'"
                    (click)="nav.setDetailTab(tab.id)">
              {{ tab.label }}
              @if (tab.id === 'versions' && daemon.versions().length > 0) {
                <span class="ml-1.5 text-[10px] px-1.5 py-0.5 rounded-full bg-bg-overlay border border-border-subtle text-tx-muted">{{ daemon.versions().length }}</span>
              }
            </button>
          }
        </div>
      </div>

      <!-- Tab content -->
      <div class="flex-1 overflow-y-auto">

        <!-- OVERVIEW TAB -->
        @if (nav.activeDetailTab() === 'overview') {
          <div class="px-8 py-6 animate-[fadeIn_0.15s_ease-out]">
            @if (artifact(); as repo) {
              <div class="grid gap-4 md:grid-cols-2">

                <!-- Metadata card -->
                <div class="rounded-lg border border-border-default bg-bg-surface p-5 space-y-3">
                  <h3 class="text-xs font-semibold text-tx-muted uppercase tracking-wider">Artifact Metadata</h3>
                  <div class="space-y-3">
                    <div class="flex justify-between items-start gap-4">
                      <span class="text-xs text-tx-muted">Repo ID</span>
                      <span class="text-xs font-mono text-tx-secondary text-right max-w-[60%] break-all">{{ repo.id }}</span>
                    </div>
                    <div class="flex justify-between items-start gap-4">
                      <span class="text-xs text-tx-muted">Path</span>
                      <span class="text-xs font-mono text-tx-secondary text-right max-w-[60%] break-all">{{ repo.path }}</span>
                    </div>
                    <div class="flex justify-between items-center gap-4">
                      <span class="text-xs text-tx-muted">Type</span>
                      <span class="text-xs text-tx-secondary">{{ repo.type ?? 'env-repo' }}</span>
                    </div>
                    <div class="flex justify-between items-center gap-4">
                      <span class="text-xs text-tx-muted">Status</span>
                      <div class="flex items-center gap-1.5">
                        <span class="w-1.5 h-1.5 rounded-full" [class]="repo.selected ? 'bg-accent status-pulse' : 'bg-tx-muted'"></span>
                        <span class="text-xs" [class]="repo.selected ? 'text-accent-light' : 'text-tx-muted'">{{ repo.selected ? 'Active (selected)' : 'Known' }}</span>
                      </div>
                    </div>
                  </div>
                </div>

                <!-- Daemon context -->
                <div class="rounded-lg border border-border-default bg-bg-surface p-5 space-y-3">
                  <h3 class="text-xs font-semibold text-tx-muted uppercase tracking-wider">Daemon Context</h3>
                  <div class="space-y-3">
                    <div class="flex justify-between items-center gap-4">
                      <span class="text-xs text-tx-muted">Connection</span>
                      <div class="flex items-center gap-1.5">
                        <span class="w-1.5 h-1.5 rounded-full" [class]="daemon.isConnected() ? 'bg-accent status-pulse' : 'bg-danger'"></span>
                        <span class="text-xs" [class]="daemon.isConnected() ? 'text-accent-light' : 'text-red-400'">
                          {{ daemon.isConnected() ? 'Connected' : 'Unreachable' }}
                        </span>
                      </div>
                    </div>
                    @if (daemon.status()?.daemon?.port) {
                      <div class="flex justify-between items-center gap-4">
                        <span class="text-xs text-tx-muted">Port</span>
                        <span class="text-xs font-mono text-tx-secondary">{{ daemon.status()?.daemon?.port }}</span>
                      </div>
                    }
                    <div class="flex justify-between items-center gap-4">
                      <span class="text-xs text-tx-muted">Versions loaded</span>
                      <span class="text-xs text-tx-secondary">{{ daemon.versions().length }}</span>
                    </div>
                  </div>
                </div>

                <!-- Quick actions -->
                <div class="md:col-span-2 rounded-lg border border-border-default bg-bg-surface p-5">
                  <h3 class="text-xs font-semibold text-tx-muted uppercase tracking-wider mb-4">Quick Actions</h3>
                  <div class="flex flex-wrap gap-2">
                    <button class="flex items-center gap-2 px-3 py-2 rounded-md border border-accent-border bg-accent-dim text-accent-light text-sm hover:bg-accent/20 transition-colors"
                            (click)="nav.setDetailTab('actions')">
                      <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                        <polygon points="5,3 19,12 5,21"/>
                      </svg>
                      Run
                    </button>
                    <button class="flex items-center gap-2 px-3 py-2 rounded-md border border-border-default bg-bg-raised text-tx-secondary text-sm hover:text-tx-primary hover:border-border-strong transition-colors"
                            (click)="nav.setDetailTab('actions')">
                      <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z"/>
                      </svg>
                      Deploy
                    </button>
                    <button class="flex items-center gap-2 px-3 py-2 rounded-md border border-border-default bg-bg-raised text-tx-secondary text-sm hover:text-tx-primary hover:border-border-strong transition-colors"
                            (click)="nav.setDetailTab('versions')">
                      <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A2 2 0 013 12V7a4 4 0 014-4z"/>
                      </svg>
                      Manage Versions
                    </button>
                    <button class="flex items-center gap-2 px-3 py-2 rounded-md border border-border-default bg-bg-raised text-tx-secondary text-sm hover:text-tx-primary hover:border-border-strong transition-colors"
                            (click)="copyPath()">
                      <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                        <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
                        <path stroke-linecap="round" stroke-linejoin="round" d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/>
                      </svg>
                      Copy Path
                    </button>
                  </div>
                </div>
              </div>
            }
          </div>
        }

        <!-- VERSIONS TAB — powered by JovDK-Web VersionPanelComponent -->
        @if (nav.activeDetailTab() === 'versions') {
          <div class="px-8 py-6 animate-[fadeIn_0.15s_ease-out]">
            <div class="flex items-center justify-between mb-5">
              <div>
                <h2 class="text-sm font-semibold text-tx-primary">Artifact Version Registry</h2>
                <p class="text-xs text-tx-muted mt-0.5">Set the next version before publishing. Changes are stored locally by the daemon.</p>
              </div>
              <button class="flex items-center gap-1.5 px-3 py-1.5 rounded border border-border-default bg-bg-surface text-tx-secondary text-xs hover:text-tx-primary hover:border-border-strong transition-colors"
                      (click)="daemon.refreshVersions()">
                <svg class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
                </svg>
                Reload
              </button>
            </div>

            @if (daemon.versions().length === 0) {
              <div class="rounded-lg border border-border-default bg-bg-surface py-12 text-center">
                <p class="text-tx-muted text-sm">No version records found.</p>
                <p class="text-tx-disabled text-xs mt-1">Select this artifact as active to load its registry.</p>
              </div>
            } @else {
              <div class="space-y-3">
                @for (version of daemon.versions(); track version.artifactName) {
                  <jov-version-panel
                    [version]="version"
                    (versionSet)="saveVersionByName($event.artifactName, $event.nextVersion)"
                    (versionIncremented)="incrementVersionByName($event.artifactName)"
                  />
                }
              </div>
            }
          </div>
        }

        <!-- ACTIONS TAB -->
        @if (nav.activeDetailTab() === 'actions') {
          <div class="px-8 py-6 animate-[fadeIn_0.15s_ease-out]">
            <div class="mb-5">
              <h2 class="text-sm font-semibold text-tx-primary">Artifact Actions</h2>
              <p class="text-xs text-tx-muted mt-0.5">Trigger operations on this artifact. Results are shown inline.</p>
            </div>

            <div class="grid gap-4 md:grid-cols-2">
              @for (action of artifactActions; track action.id) {
                <div class="rounded-lg border border-border-default bg-bg-surface p-4">
                  <div class="flex items-center gap-3 mb-3">
                    <div class="w-8 h-8 rounded-md flex items-center justify-center"
                         [class]="action.variant === 'primary' ? 'bg-accent-dim border border-accent-border' : 'bg-bg-raised border border-border-default'">
                      <span [innerHTML]="action.icon" [class]="action.variant === 'primary' ? 'text-accent-light' : 'text-tx-muted'"></span>
                    </div>
                    <div>
                      <div class="text-sm font-medium text-tx-primary">{{ action.label }}</div>
                      <div class="text-xs text-tx-muted">{{ action.description }}</div>
                    </div>
                  </div>

                  @if (actionStates()[action.id]; as state) {
                    @if (state.running) {
                      <div class="mb-3 flex items-center gap-2 text-xs text-tx-secondary">
                        <div class="w-3 h-3 border-2 border-accent border-t-transparent rounded-full animate-spin"></div>
                        Running...
                      </div>
                    }
                    @if (state.done && !state.error) {
                      <div class="mb-3 rounded-md bg-accent-dim border border-accent-border px-3 py-2">
                        <div class="flex items-center gap-1.5 text-xs text-accent-light mb-1">
                          <svg class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><polyline points="20,6 9,17 4,12"/></svg>
                          Completed
                        </div>
                        @if (state.output.length > 0) {
                          <div class="log-output text-tx-secondary mt-1">
                            @for (line of state.output; track $index) {
                              <div>{{ line }}</div>
                            }
                          </div>
                        }
                        @if (action.postActionLink) {
                          <a [href]="action.postActionLink.url" target="_blank"
                             class="inline-flex items-center gap-1 mt-2 text-xs text-accent hover:text-accent-light transition-colors">
                            {{ action.postActionLink.label }}
                            <svg class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                              <path stroke-linecap="round" stroke-linejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"/>
                            </svg>
                          </a>
                        }
                      </div>
                    }
                    @if (state.error) {
                      <div class="mb-3 rounded-md bg-danger-dim border border-danger/30 px-3 py-2 text-xs text-red-300">{{ state.error }}</div>
                    }
                  }

                  <button class="w-full flex items-center justify-center gap-2 py-2 rounded-md text-sm font-medium transition-colors"
                          [class]="action.variant === 'primary'
                            ? 'bg-accent text-tx-inverse hover:bg-accent-light'
                            : 'border border-border-default bg-bg-raised text-tx-secondary hover:text-tx-primary hover:border-border-strong'"
                          [disabled]="actionStates()[action.id]?.running"
                          (click)="runAction(action.id)">
                    @if (!actionStates()[action.id]?.running) {
                      <span [innerHTML]="action.icon"></span>
                    }
                    {{ actionStates()[action.id]?.running ? 'Running...' : action.label }}
                  </button>
                </div>
              }
            </div>
          </div>
        }

        <!-- TREE TAB -->
        @if (nav.activeDetailTab() === 'tree') {
          <div class="px-8 py-6 animate-[fadeIn_0.15s_ease-out]">
            <div class="mb-5">
              <h2 class="text-sm font-semibold text-tx-primary">Artifact Relationship Tree</h2>
              <p class="text-xs text-tx-muted mt-0.5">Parent and child envheaven-artifacts connected to this context.</p>
            </div>

            @if (artifact(); as repo) {
              <div class="rounded-lg border border-border-default bg-bg-surface p-5">

                <!-- Current node -->
                <div class="flex items-center gap-3 p-3 rounded-md border border-accent-border bg-accent-dim mb-1">
                  <svg class="w-4 h-4 text-accent-light flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"/>
                  </svg>
                  <div class="min-w-0 flex-1">
                    <div class="text-sm font-medium text-tx-primary flex items-center gap-2">
                      {{ repo.name }}
                      <span class="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-accent/20 text-accent-light border border-accent-border uppercase">Current</span>
                    </div>
                    <div class="text-xs text-tx-muted font-mono truncate">{{ repo.path }}</div>
                  </div>
                </div>

                <!-- Sibling repos -->
                @if (sibling_repos().length > 0) {
                  <div class="tree-line mt-1 space-y-1">
                    <div class="text-xs text-tx-muted uppercase tracking-wider mb-2 pt-1">Known siblings</div>
                    @for (sibling of sibling_repos(); track sibling.id) {
                      <div class="flex items-center gap-3 p-3 rounded-md border border-border-subtle bg-bg-raised hover:border-border-default hover:bg-bg-overlay transition-colors cursor-pointer"
                           (click)="nav.openArtifactDetail(sibling.id)">
                        <svg class="w-3.5 h-3.5 text-tx-muted flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
                          <path stroke-linecap="round" stroke-linejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"/>
                        </svg>
                        <div class="min-w-0 flex-1">
                          <div class="text-xs font-medium text-tx-secondary">{{ sibling.name }}</div>
                          <div class="text-[11px] text-tx-muted font-mono truncate">{{ sibling.path }}</div>
                        </div>
                        @if (sibling.selected) {
                          <span class="w-1.5 h-1.5 rounded-full bg-accent status-pulse flex-shrink-0"></span>
                        }
                      </div>
                    }
                  </div>
                } @else {
                  <div class="tree-line mt-1">
                    <p class="text-xs text-tx-muted py-3">No other known artifacts in this workspace.</p>
                  </div>
                }
              </div>
            }
          </div>
        }

        <!-- LOGS TAB -->
        @if (nav.activeDetailTab() === 'logs') {
          <div class="px-8 py-6 animate-[fadeIn_0.15s_ease-out] flex flex-col h-full">
            <div class="flex items-center justify-between mb-4">
              <div>
                <h2 class="text-sm font-semibold text-tx-primary">Dev Tools — Console Output</h2>
                <p class="text-xs text-tx-muted mt-0.5">Script and application console output from the daemon.</p>
              </div>
              <div class="flex items-center gap-2">
                <button class="text-xs px-2.5 py-1.5 rounded border border-border-default text-tx-secondary hover:text-tx-primary hover:border-border-strong transition-colors"
                        (click)="clearLogs()">Clear</button>
                <button class="flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded border border-border-default text-tx-secondary hover:text-tx-primary hover:border-border-strong transition-colors"
                        (click)="daemon.refreshAll()">
                  <span class="w-1.5 h-1.5 rounded-full bg-accent status-pulse"></span>
                  Live
                </button>
              </div>
            </div>

            <!-- Log terminal pane -->
            <div class="flex-1 rounded-lg border border-border-default bg-bg-base overflow-y-auto min-h-[300px]">
              <div class="flex items-center gap-2 px-4 py-2 border-b border-border-subtle">
                <div class="flex items-center gap-1.5">
                  <span class="w-3 h-3 rounded-full bg-danger/50"></span>
                  <span class="w-3 h-3 rounded-full bg-warn/50"></span>
                  <span class="w-3 h-3 rounded-full bg-accent/50"></span>
                </div>
                <span class="text-xs text-tx-muted font-mono">daemon output</span>
              </div>
              <div class="p-4 log-output space-y-1">
                @for (entry of logEntries(); track $index) {
                  <div class="flex items-start gap-3 text-xs">
                    <span class="text-tx-disabled flex-shrink-0 font-mono">{{ entry.ts }}</span>
                    <span class="flex-1" [class]="entry.level === 'error' ? 'text-red-400' : entry.level === 'warn' ? 'text-yellow-400' : entry.level === 'success' ? 'text-accent-light' : 'text-tx-secondary'">
                      {{ entry.message }}
                    </span>
                  </div>
                }
                @if (logEntries().length === 0) {
                  <div class="text-xs text-tx-disabled italic">Waiting for output...</div>
                }
              </div>
            </div>
          </div>
        }

      </div>
    </div>
  `,
})
export class ArtifactDetailComponent {
  readonly daemon = inject(DaemonService);
  readonly nav = inject(NavService);

  readonly artifact = computed(() => {
    const id = this.nav.selectedArtifactId();
    return this.daemon.repos().find((r) => r.id === id) ?? null;
  });

  readonly sibling_repos = computed(() => {
    const id = this.nav.selectedArtifactId();
    return this.daemon.repos().filter((r) => r.id !== id);
  });

  readonly actionStates = signal<Record<string, ActionState>>({});

  readonly logEntries = computed(() => {
    const notifs = this.daemon.notifications();
    return notifs.map((n) => ({
      ts: formatTime(n.ts),
      level: n.kind === "error" ? "error" : n.kind === "warn" ? "warn" : n.kind === "success" ? "success" : "info",
      message: `[${n.title}] ${n.message}`,
    }));
  });

  readonly tabs: { id: string; label: string }[] = [
    { id: "overview", label: "Overview" },
    { id: "versions", label: "Versions" },
    { id: "actions", label: "Actions" },
    { id: "tree", label: "Tree" },
    { id: "logs", label: "Dev Tools" },
  ];

  readonly artifactActions = [
    {
      id: "run",
      label: "Run",
      description: "Start the artifact environment locally.",
      variant: "primary" as const,
      icon: `<svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><polygon points="5,3 19,12 5,21"/></svg>`,
      postActionLink: null as { label: string; url: string } | null,
    },
    {
      id: "deploy",
      label: "Deploy",
      description: "Publish the artifact to production.",
      variant: "secondary" as const,
      icon: `<svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"/></svg>`,
      postActionLink: { label: "Open deployed URL", url: "#" },
    },
    {
      id: "build",
      label: "Build",
      description: "Compile and bundle the artifact.",
      variant: "secondary" as const,
      icon: `<svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/><circle cx="12" cy="12" r="3"/></svg>`,
      postActionLink: null,
    },
    {
      id: "status-check",
      label: "Status Check",
      description: "Refresh daemon state and health.",
      variant: "secondary" as const,
      icon: `<svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>`,
      postActionLink: null,
    },
  ];

  async saveVersion(version: VersionRecord): Promise<void> {
    await this.daemon.saveVersionAndReturn(version);
  }

  async incrementVersion(version: VersionRecord): Promise<void> {
    const next = this.daemon.incrementPatch(version.nextVersion ?? version.lastVersion ?? "0.1.0");
    version.nextVersion = next;
    await this.saveVersion(version);
  }

  async saveVersionByName(artifactName: string, nextVersion: string): Promise<void> {
    const version = this.daemon.versions().find(v => v.artifactName === artifactName);
    if (version) {
      version.nextVersion = nextVersion;
      await this.daemon.saveVersionAndReturn(version);
    }
  }

  async incrementVersionByName(artifactName: string): Promise<void> {
    await this.daemon.incrementVersionApi(artifactName);
  }

  async useThisRepo(): Promise<void> {
    const repo = this.artifact();
    if (repo) await this.daemon.selectRepo(repo);
  }

  copyPath(): void {
    const repo = this.artifact();
    if (repo) void navigator.clipboard.writeText(repo.path);
  }

  async runAction(actionId: string): Promise<void> {
    this.actionStates.update((s) => ({
      ...s,
      [actionId]: { running: true, done: false, error: null, output: [] },
    }));

    await simulateAction(1500);

    if (actionId === "status-check") {
      await this.daemon.refreshAll();
      this.actionStates.update((s) => ({
        ...s,
        [actionId]: {
          running: false,
          done: true,
          error: null,
          output: [`Daemon: ${this.daemon.isConnected() ? "connected" : "unreachable"}`, `Repos: ${this.daemon.repos().length}`, `Versions: ${this.daemon.versions().length}`],
        },
      }));
    } else {
      this.actionStates.update((s) => ({
        ...s,
        [actionId]: {
          running: false,
          done: true,
          error: null,
          output: [`Action '${actionId}' dispatched to daemon. Awaiting orchestration endpoint.`],
        },
      }));
    }
  }

  clearLogs(): void {
    this.daemon.clearNotifications();
  }
}

function simulateAction(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function formatTime(d: Date): string {
  return d.toLocaleTimeString("en-US", { hour12: false, hour: "2-digit", minute: "2-digit", second: "2-digit" });
}
