import { Component, inject, computed, signal, viewChild, ElementRef, effect } from "@angular/core";
import { FormsModule } from "@angular/forms";
import {
  DaemonService,
  ActionDefinition,
  ActionVariant,
  ActionHelper,
  ArtifactMeta,
} from "../services/daemon.service";
import { NavService } from "../services/nav.service";
import { VersionPanelComponent } from "@jovdk-web";

type DetailTab = "overview" | "versions" | "actions" | "tree" | "logs";
type RunMode = "stream" | "background";

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

        <!-- Artifact title row -->
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
                    <span class="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-accent-dim text-accent-light border border-accent-border uppercase tracking-wide cursor-help"
                          title="This is the active EnvHeaven context.">Selected</span>
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
              @if (tab.id === 'actions' && daemon.actions().length > 0) {
                <span class="ml-1.5 text-[10px] px-1.5 py-0.5 rounded-full bg-bg-overlay border border-border-subtle text-tx-muted">{{ daemon.actions().length }}</span>
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

                <!-- Metadata card with inline editor -->
                <div class="rounded-lg border border-border-default bg-bg-surface p-5">
                  <div class="flex items-center justify-between mb-3">
                    <h3 class="text-xs font-semibold text-tx-muted uppercase tracking-wider">Artifact Metadata</h3>
                    @if (!metaEditing()) {
                      <button class="p-1 rounded text-tx-muted hover:text-tx-secondary hover:bg-bg-raised transition-colors"
                              title="Edit metadata" (click)="startMetaEdit()">
                        <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                          <path stroke-linecap="round" stroke-linejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
                        </svg>
                      </button>
                    }
                  </div>

                  @if (!metaEditing()) {
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
                      @if (repo.meta?.internalName) {
                        <div class="flex justify-between items-center gap-4">
                          <span class="text-xs text-tx-muted">Internal name</span>
                          <span class="text-xs text-tx-secondary">{{ repo.meta?.internalName }}</span>
                        </div>
                      }
                      @if (repo.meta?.labelName) {
                        <div class="flex justify-between items-center gap-4">
                          <span class="text-xs text-tx-muted">Label</span>
                          <span class="text-xs text-tx-secondary">{{ repo.meta?.labelName }}</span>
                        </div>
                      }
                      @if (repo.meta?.instanceLabelName) {
                        <div class="flex justify-between items-center gap-4">
                          <span class="text-xs text-tx-muted">Instance label</span>
                          <span class="text-xs text-tx-secondary">{{ repo.meta?.instanceLabelName }}</span>
                        </div>
                      }
                    </div>
                  } @else {
                    <div class="space-y-3">
                      <div>
                        <label class="block text-xs text-tx-muted mb-1">Icon</label>
                        <input class="w-full bg-bg-base border border-border-default rounded px-2 py-1.5 text-xs text-tx-primary focus:border-accent outline-none"
                               [ngModel]="metaDraft().icon ?? ''"
                               (ngModelChange)="metaDraft.update(m => ({ ...m, icon: $event }))"
                               placeholder="e.g. cube, server, code" />
                      </div>
                      <div>
                        <label class="block text-xs text-tx-muted mb-1">Internal name</label>
                        <input class="w-full bg-bg-base border border-border-default rounded px-2 py-1.5 text-xs text-tx-primary focus:border-accent outline-none"
                               [ngModel]="metaDraft().internalName ?? ''"
                               (ngModelChange)="metaDraft.update(m => ({ ...m, internalName: $event }))"
                               placeholder="e.g. my-service" />
                      </div>
                      <div>
                        <label class="block text-xs text-tx-muted mb-1">Label name</label>
                        <input class="w-full bg-bg-base border border-border-default rounded px-2 py-1.5 text-xs text-tx-primary focus:border-accent outline-none"
                               [ngModel]="metaDraft().labelName ?? ''"
                               (ngModelChange)="metaDraft.update(m => ({ ...m, labelName: $event }))"
                               placeholder="e.g. My Service" />
                      </div>
                      <div>
                        <label class="block text-xs text-tx-muted mb-1">Instance label name</label>
                        <input class="w-full bg-bg-base border border-border-default rounded px-2 py-1.5 text-xs text-tx-primary focus:border-accent outline-none"
                               [ngModel]="metaDraft().instanceLabelName ?? ''"
                               (ngModelChange)="metaDraft.update(m => ({ ...m, instanceLabelName: $event }))"
                               placeholder="e.g. Instance" />
                      </div>
                      <div class="flex gap-2 pt-1">
                        <button class="px-3 py-1.5 rounded bg-accent text-tx-inverse text-xs font-medium hover:bg-accent-light transition-colors"
                                (click)="saveMetaEdit()">Save</button>
                        <button class="px-3 py-1.5 rounded border border-border-default bg-bg-raised text-tx-secondary text-xs hover:text-tx-primary transition-colors"
                                (click)="cancelMetaEdit()">Cancel</button>
                      </div>
                    </div>
                  }
                </div>

                <!-- Daemon context card -->
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
                    @if (daemon.daemonVersion()) {
                      <div class="flex justify-between items-center gap-4">
                        <span class="text-xs text-tx-muted">Daemon version</span>
                        <span class="text-xs font-mono text-tx-secondary">v{{ daemon.daemonVersion() }}</span>
                      </div>
                    }
                    <div class="flex justify-between items-center gap-4">
                      <span class="text-xs text-tx-muted">Actions</span>
                      <span class="text-xs text-tx-secondary">{{ daemon.actions().length }}</span>
                    </div>
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
                      Run Actions
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
                    <button class="flex items-center gap-2 px-3 py-2 rounded-md border border-border-default bg-bg-raised text-tx-secondary text-sm hover:text-tx-primary hover:border-border-strong transition-colors"
                            (click)="nav.setDetailTab('logs')">
                      <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/>
                      </svg>
                      Dev Tools
                    </button>
                  </div>
                </div>
              </div>
            }
          </div>
        }

        <!-- VERSIONS TAB -->
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
            <div class="flex items-center justify-between mb-5">
              <div>
                <h2 class="text-sm font-semibold text-tx-primary">Artifact Actions</h2>
                <p class="text-xs text-tx-muted mt-0.5">Trigger operations on this artifact. Results stream inline or launch in background.</p>
              </div>
              <div class="flex items-center gap-2">
                <button class="flex items-center gap-1.5 px-3 py-1.5 rounded border border-border-default bg-bg-surface text-tx-secondary text-xs hover:text-tx-primary hover:border-border-strong transition-colors"
                        (click)="daemon.refreshActions()">
                  <svg class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
                  </svg>
                  Refresh
                </button>
                <button class="flex items-center gap-1.5 px-3 py-1.5 rounded border border-accent-border bg-accent-dim text-accent-light text-xs hover:bg-accent/20 transition-colors"
                        (click)="startAddAction()">
                  <svg class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4"/>
                  </svg>
                  Add action
                </button>
              </div>
            </div>

            @if (daemon.actions().length === 0 && !addingAction()) {
              <div class="rounded-lg border border-border-default bg-bg-surface py-12 text-center">
                <p class="text-tx-muted text-sm">No actions defined yet.</p>
                <p class="text-tx-disabled text-xs mt-1">Click "Add action" or create <code class="font-mono text-[10px] bg-bg-overlay px-1 py-0.5 rounded">.envheaven/actions/*.envheaven.action.json</code> files.</p>
              </div>
            }

            <div class="grid gap-4 md:grid-cols-2">
              @for (action of daemon.actions(); track action.id) {
                <div class="rounded-lg border bg-bg-surface overflow-hidden"
                     [class]="editingActionId() === action.id ? 'border-accent-border' : 'border-border-default'">

                  <!-- Card header -->
                  <div class="flex items-start gap-3 p-4 pb-3">
                    <div class="w-8 h-8 rounded-md flex items-center justify-center flex-shrink-0 bg-bg-raised border border-border-default mt-0.5"
                         [innerHTML]="getIcon(action.icon)">
                    </div>
                    <div class="flex-1 min-w-0">
                      <div class="text-sm font-medium text-tx-primary">{{ action.label }}</div>
                      @if (action.description) {
                        <div class="text-xs text-tx-muted mt-0.5">{{ action.description }}</div>
                      }
                      <div class="text-[10px] font-mono text-tx-disabled mt-1 truncate">{{ action.runCommand }}</div>
                    </div>
                    <button class="p-1.5 rounded text-tx-muted hover:text-tx-secondary hover:bg-bg-raised transition-colors flex-shrink-0"
                            [class]="editingActionId() === action.id ? 'text-accent-light bg-accent-dim' : ''"
                            title="Edit action"
                            (click)="toggleEditAction(action)">
                      <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
                      </svg>
                    </button>
                  </div>

                  <!-- Live run output panels -->
                  @if (latestRunForAction(action.id); as run) {
                    <!-- Running — spinner + streaming log -->
                    @if (run.status === 'running') {
                      <div class="mx-4 mb-3 rounded-md border border-border-subtle bg-bg-base p-3">
                        <div class="flex items-center gap-2 mb-2">
                          <div class="w-3 h-3 border-2 border-accent border-t-transparent rounded-full animate-spin flex-shrink-0"></div>
                          <span class="text-xs text-tx-secondary font-medium">Running…</span>
                          <button class="ml-auto text-[10px] px-2 py-0.5 rounded border border-danger/30 text-red-400 hover:bg-danger/10 transition-colors"
                                  (click)="stopAction(run.runId)">Stop</button>
                        </div>
                        <div class="max-h-36 overflow-y-auto text-xs space-y-0.5 font-mono">
                          @for (line of run.logs.slice(-60); track $index) {
                            <div class="leading-relaxed"
                                 [class]="line.stream === 'stderr' ? 'text-red-400' : 'text-tx-secondary'">
                              {{ line.text }}
                            </div>
                          }
                          @if (run.logs.length === 0) {
                            <div class="text-tx-disabled italic">Waiting for output…</div>
                          }
                        </div>
                      </div>
                    }

                    <!-- Succeeded — process completed OK -->
                    @if (run.status === 'success') {
                      <div class="mx-4 mb-3 rounded-md bg-accent-dim border border-accent-border px-3 py-2">
                        <div class="flex items-center gap-2 text-xs text-accent-light mb-1.5">
                          <svg class="w-3.5 h-3.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
                            <polyline points="20,6 9,17 4,12"/>
                          </svg>
                          Succeeded
                          @if (run.exitCode !== null) {
                            <span class="text-accent/60">(exit {{ run.exitCode }})</span>
                          }
                        </div>
                        @if (run.helpers.length > 0) {
                          <div class="flex flex-wrap gap-1.5 mt-1">
                            @for (helper of run.helpers; track $index) {
                              @if (helper.kind === 'open-url') {
                                <a [href]="helper.value" target="_blank" rel="noopener"
                                   class="inline-flex items-center gap-1 text-[11px] px-2 py-1 rounded border border-accent-border bg-accent/10 text-accent-light hover:bg-accent/20 transition-colors">
                                  <svg class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                                    <path stroke-linecap="round" stroke-linejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"/>
                                  </svg>
                                  {{ helper.label }}
                                </a>
                              }
                              @if (helper.kind === 'copy-text') {
                                <button class="inline-flex items-center gap-1 text-[11px] px-2 py-1 rounded border border-accent-border bg-accent/10 text-accent-light hover:bg-accent/20 transition-colors"
                                        (click)="copyText(helper.value)">
                                  <svg class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                                    <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
                                    <path stroke-linecap="round" stroke-linejoin="round" d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/>
                                  </svg>
                                  {{ helper.label }}
                                </button>
                              }
                            }
                          </div>
                        }
                      </div>
                    }

                    <!-- Error / Stopped -->
                    @if (run.status === 'error' || run.status === 'stopped') {
                      <div class="mx-4 mb-3 rounded-md bg-danger-dim border border-danger/30 px-3 py-2">
                        <div class="flex items-center gap-1.5 text-xs text-red-300 mb-1">
                          <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                            <circle cx="12" cy="12" r="10"/>
                            <line x1="15" y1="9" x2="9" y2="15"/>
                            <line x1="9" y1="9" x2="15" y2="15"/>
                          </svg>
                          {{ run.status === 'stopped' ? 'Stopped' : 'Failed' }}
                          @if (run.exitCode !== null && run.status !== 'stopped') {
                            <span class="text-tx-disabled">(exit {{ run.exitCode }})</span>
                          }
                        </div>
                        @if (run.helpers.length > 0) {
                          <div class="flex flex-wrap gap-1.5 mt-1">
                            @for (helper of run.helpers; track $index) {
                              @if (helper.kind === 'open-url') {
                                <a [href]="helper.value" target="_blank" rel="noopener"
                                   class="inline-flex items-center gap-1 text-[11px] px-2 py-1 rounded border border-danger/30 text-red-300 hover:bg-danger/20 transition-colors">{{ helper.label }}</a>
                              }
                              @if (helper.kind === 'copy-text') {
                                <button class="inline-flex items-center gap-1 text-[11px] px-2 py-1 rounded border border-danger/30 text-red-300 hover:bg-danger/20 transition-colors"
                                        (click)="copyText(helper.value)">Copy {{ helper.label }}</button>
                              }
                            }
                          </div>
                        }
                      </div>
                    }
                  }

                  <!-- Variant selector (if action has variants) -->
                  @if ((action.variants ?? []).length > 0) {
                    <div class="px-4 pb-2">
                      <label class="block text-[10px] text-tx-muted mb-1">Variant</label>
                      <select class="w-full bg-bg-base border border-border-default rounded px-2 py-1.5 text-xs text-tx-primary focus:border-accent outline-none"
                              [ngModel]="getSelectedVariant(action.id)"
                              (ngModelChange)="setSelectedVariant(action.id, $event)">
                        <option value="">(default)</option>
                        @for (variant of action.variants ?? []; track variant.id) {
                          <option [value]="variant.id">{{ variant.label }}</option>
                        }
                      </select>
                    </div>
                  }

                  <!-- Run type selector + Run button row -->
                  <div class="px-4 pb-4">
                    <div class="flex gap-2 items-center">
                      <!-- Run type selector (stream vs background) -->
                      <div class="flex rounded border border-border-default overflow-hidden text-[10px] flex-shrink-0">
                        <button class="px-2 py-1.5 transition-colors"
                                [class]="getRunMode(action.id) === 'stream'
                                  ? 'bg-bg-overlay text-tx-primary font-medium'
                                  : 'text-tx-muted hover:text-tx-secondary hover:bg-bg-hover'"
                                title="Stream output live in this card"
                                (click)="setRunMode(action.id, 'stream')">Stream</button>
                        <span class="border-l border-border-default"></span>
                        <button class="px-2 py-1.5 transition-colors"
                                [class]="getRunMode(action.id) === 'background'
                                  ? 'bg-bg-overlay text-tx-primary font-medium'
                                  : 'text-tx-muted hover:text-tx-secondary hover:bg-bg-hover'"
                                title="Launch non-blocking in the background (no streaming)"
                                (click)="setRunMode(action.id, 'background')">BG</button>
                      </div>

                      <!-- Run button -->
                      <button class="flex-1 flex items-center justify-center gap-2 py-2 rounded-md text-sm font-medium transition-colors border border-border-default bg-bg-raised text-tx-secondary hover:text-tx-primary hover:border-border-strong disabled:opacity-50 disabled:cursor-not-allowed"
                              [disabled]="latestRunForAction(action.id)?.status === 'running'"
                              (click)="runAction(action.id)">
                        @if (latestRunForAction(action.id)?.status === 'running') {
                          <div class="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
                          Running…
                        } @else {
                          <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                            <polygon points="5,3 19,12 5,21"/>
                          </svg>
                          {{ action.runLabel || 'Run' }}
                        }
                      </button>
                    </div>
                  </div>

                  <!-- Inline edit panel -->
                  @if (editingActionId() === action.id && editDraft()) {
                    <div class="border-t border-border-subtle bg-bg-raised p-4 space-y-3">
                      <div class="text-xs font-semibold text-tx-primary mb-2">Edit Action</div>

                      <div class="grid grid-cols-2 gap-3">
                        <div>
                          <label class="block text-[10px] text-tx-muted mb-1">Label</label>
                          <input class="w-full bg-bg-base border border-border-default rounded px-2 py-1.5 text-xs text-tx-primary focus:border-accent outline-none"
                                 [ngModel]="editDraft()?.label ?? ''"
                                 (ngModelChange)="updateDraft('label', $event)" />
                        </div>
                        <div>
                          <label class="block text-[10px] text-tx-muted mb-1">Icon</label>
                          <input class="w-full bg-bg-base border border-border-default rounded px-2 py-1.5 text-xs text-tx-primary focus:border-accent outline-none"
                                 [ngModel]="editDraft()?.icon ?? ''"
                                 (ngModelChange)="updateDraft('icon', $event)"
                                 placeholder="play, build, deploy, test…" />
                        </div>
                      </div>

                      <div>
                        <label class="block text-[10px] text-tx-muted mb-1">Description</label>
                        <input class="w-full bg-bg-base border border-border-default rounded px-2 py-1.5 text-xs text-tx-primary focus:border-accent outline-none"
                               [ngModel]="editDraft()?.description ?? ''"
                               (ngModelChange)="updateDraft('description', $event)" />
                      </div>

                      <div>
                        <label class="block text-[10px] text-tx-muted mb-1">Run command</label>
                        <input class="w-full bg-bg-base border border-border-default rounded px-2 py-1.5 text-xs font-mono text-tx-primary focus:border-accent outline-none"
                               [ngModel]="editDraft()?.runCommand ?? ''"
                               (ngModelChange)="updateDraft('runCommand', $event)"
                               placeholder="e.g. pnpm run dev" />
                      </div>

                      <div>
                        <label class="block text-[10px] text-tx-muted mb-1">Stop command (optional)</label>
                        <input class="w-full bg-bg-base border border-border-default rounded px-2 py-1.5 text-xs font-mono text-tx-primary focus:border-accent outline-none"
                               [ngModel]="editDraft()?.stopCommand ?? ''"
                               (ngModelChange)="updateDraft('stopCommand', $event || null)"
                               placeholder="leave blank to use SIGTERM" />
                      </div>

                      <div class="grid grid-cols-2 gap-3">
                        <div>
                          <label class="block text-[10px] text-tx-muted mb-1">Run label</label>
                          <input class="w-full bg-bg-base border border-border-default rounded px-2 py-1.5 text-xs text-tx-primary focus:border-accent outline-none"
                                 [ngModel]="editDraft()?.runLabel ?? 'Run'"
                                 (ngModelChange)="updateDraft('runLabel', $event)" />
                        </div>
                        <div>
                          <label class="block text-[10px] text-tx-muted mb-1">Stop label</label>
                          <input class="w-full bg-bg-base border border-border-default rounded px-2 py-1.5 text-xs text-tx-primary focus:border-accent outline-none"
                                 [ngModel]="editDraft()?.stopLabel ?? 'Stop'"
                                 (ngModelChange)="updateDraft('stopLabel', $event)" />
                        </div>
                      </div>

                      <!-- Success helpers -->
                      <div>
                        <div class="flex items-center justify-between mb-1.5">
                          <label class="text-[10px] text-tx-muted font-medium">Success helpers</label>
                          <button class="text-[10px] text-accent-light hover:text-accent transition-colors"
                                  (click)="addHelper('success')">+ Add</button>
                        </div>
                        <div class="space-y-1.5">
                          @for (helper of editDraft()?.successHelpers ?? []; track $index; let i = $index) {
                            <div class="flex gap-1.5 items-center">
                              <select class="bg-bg-base border border-border-default rounded px-1.5 py-1 text-[10px] text-tx-secondary focus:border-accent outline-none"
                                      [ngModel]="helper.kind"
                                      (ngModelChange)="updateHelper('success', i, 'kind', $event)">
                                <option value="open-url">Open URL</option>
                                <option value="copy-text">Copy text</option>
                              </select>
                              <input class="flex-1 bg-bg-base border border-border-default rounded px-1.5 py-1 text-[10px] text-tx-primary focus:border-accent outline-none"
                                     [ngModel]="helper.label"
                                     (ngModelChange)="updateHelper('success', i, 'label', $event)"
                                     placeholder="Label" />
                              <input class="flex-1 bg-bg-base border border-border-default rounded px-1.5 py-1 text-[10px] font-mono text-tx-primary focus:border-accent outline-none"
                                     [ngModel]="helper.value"
                                     (ngModelChange)="updateHelper('success', i, 'value', $event)"
                                     placeholder="URL or text" />
                              <button class="text-[10px] text-red-400 hover:text-red-300 px-1 transition-colors"
                                      (click)="removeHelper('success', i)">✕</button>
                            </div>
                          }
                        </div>
                      </div>

                      <!-- Fail helpers -->
                      <div>
                        <div class="flex items-center justify-between mb-1.5">
                          <label class="text-[10px] text-tx-muted font-medium">Fail helpers</label>
                          <button class="text-[10px] text-accent-light hover:text-accent transition-colors"
                                  (click)="addHelper('fail')">+ Add</button>
                        </div>
                        <div class="space-y-1.5">
                          @for (helper of editDraft()?.failHelpers ?? []; track $index; let i = $index) {
                            <div class="flex gap-1.5 items-center">
                              <select class="bg-bg-base border border-border-default rounded px-1.5 py-1 text-[10px] text-tx-secondary focus:border-accent outline-none"
                                      [ngModel]="helper.kind"
                                      (ngModelChange)="updateHelper('fail', i, 'kind', $event)">
                                <option value="open-url">Open URL</option>
                                <option value="copy-text">Copy text</option>
                              </select>
                              <input class="flex-1 bg-bg-base border border-border-default rounded px-1.5 py-1 text-[10px] text-tx-primary focus:border-accent outline-none"
                                     [ngModel]="helper.label"
                                     (ngModelChange)="updateHelper('fail', i, 'label', $event)"
                                     placeholder="Label" />
                              <input class="flex-1 bg-bg-base border border-border-default rounded px-1.5 py-1 text-[10px] font-mono text-tx-primary focus:border-accent outline-none"
                                     [ngModel]="helper.value"
                                     (ngModelChange)="updateHelper('fail', i, 'value', $event)"
                                     placeholder="URL or text" />
                              <button class="text-[10px] text-red-400 hover:text-red-300 px-1 transition-colors"
                                      (click)="removeHelper('fail', i)">✕</button>
                            </div>
                          }
                        </div>
                      </div>

                      <div class="flex gap-2 pt-1">
                        <button class="px-3 py-1.5 rounded bg-accent text-tx-inverse text-xs font-medium hover:bg-accent-light transition-colors"
                                (click)="saveEdit()">Save</button>
                        <button class="px-3 py-1.5 rounded border border-border-default bg-bg-surface text-tx-secondary text-xs hover:text-tx-primary transition-colors"
                                (click)="cancelEdit()">Cancel</button>
                      </div>
                    </div>
                  }
                </div>
              }
            </div>

            <!-- Add new action form -->
            @if (addingAction()) {
              <div class="mt-4 rounded-lg border border-accent-border bg-bg-surface p-4">
                <div class="text-xs font-semibold text-tx-primary mb-3">New Action</div>
                <div class="space-y-3">
                  <div class="grid grid-cols-2 gap-3">
                    <div>
                      <label class="block text-[10px] text-tx-muted mb-1">ID (unique, no spaces)</label>
                      <input class="w-full bg-bg-base border border-border-default rounded px-2 py-1.5 text-xs font-mono text-tx-primary focus:border-accent outline-none"
                             [ngModel]="newActionDraft().id ?? ''"
                             (ngModelChange)="newActionDraft.update(d => ({ ...d, id: $event }))"
                             placeholder="e.g. run-local" />
                    </div>
                    <div>
                      <label class="block text-[10px] text-tx-muted mb-1">Label</label>
                      <input class="w-full bg-bg-base border border-border-default rounded px-2 py-1.5 text-xs text-tx-primary focus:border-accent outline-none"
                             [ngModel]="newActionDraft().label ?? ''"
                             (ngModelChange)="newActionDraft.update(d => ({ ...d, label: $event }))"
                             placeholder="e.g. Run Locally" />
                    </div>
                  </div>
                  <div>
                    <label class="block text-[10px] text-tx-muted mb-1">Description</label>
                    <input class="w-full bg-bg-base border border-border-default rounded px-2 py-1.5 text-xs text-tx-primary focus:border-accent outline-none"
                           [ngModel]="newActionDraft().description ?? ''"
                           (ngModelChange)="newActionDraft.update(d => ({ ...d, description: $event }))" />
                  </div>
                  <div>
                    <label class="block text-[10px] text-tx-muted mb-1">Run command</label>
                    <input class="w-full bg-bg-base border border-border-default rounded px-2 py-1.5 text-xs font-mono text-tx-primary focus:border-accent outline-none"
                           [ngModel]="newActionDraft().runCommand ?? ''"
                           (ngModelChange)="newActionDraft.update(d => ({ ...d, runCommand: $event }))"
                           placeholder="e.g. pnpm run dev" />
                  </div>
                  <div class="flex gap-2 pt-1">
                    <button class="px-3 py-1.5 rounded bg-accent text-tx-inverse text-xs font-medium hover:bg-accent-light transition-colors disabled:opacity-50"
                            [disabled]="!newActionDraft().runCommand"
                            (click)="saveNewAction()">Create</button>
                    <button class="px-3 py-1.5 rounded border border-border-default bg-bg-raised text-tx-secondary text-xs hover:text-tx-primary transition-colors"
                            (click)="cancelAddAction()">Cancel</button>
                  </div>
                </div>
              </div>
            }
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

                @if (sibling_repos().length > 0) {
                  <div class="mt-1 space-y-1">
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
                  <div class="mt-1">
                    <p class="text-xs text-tx-muted py-3">No other known artifacts in this workspace.</p>
                  </div>
                }
              </div>
            }
          </div>
        }

        <!-- DEV TOOLS TAB (id = 'logs', label = 'Dev Tools') -->
        @if (nav.activeDetailTab() === 'logs') {
          <div class="px-8 py-6 animate-[fadeIn_0.15s_ease-out] flex flex-col" style="min-height: 400px">

            <!-- Header -->
            <div class="flex items-center gap-3 mb-4 flex-shrink-0">
              <div>
                <h2 class="text-sm font-semibold text-tx-primary">Dev Tools</h2>
                <p class="text-xs text-tx-muted mt-0.5">Console output per source — daemon events or action run streams.</p>
              </div>
              <div class="flex-1"></div>
              <label class="flex items-center gap-1.5 text-xs text-tx-muted cursor-pointer">
                <input type="checkbox"
                       class="rounded border-border-default accent-accent"
                       [ngModel]="showEndedInstances()"
                       (ngModelChange)="showEndedInstances.set($event)" />
                Show ended runs
              </label>
              <button class="text-xs px-2.5 py-1.5 rounded border border-border-default text-tx-secondary hover:text-tx-primary hover:border-border-strong transition-colors"
                      (click)="clearActiveConsole()">Clear</button>
            </div>

            <!-- Source selector (grouped by action name) -->
            <div class="mb-3 flex-shrink-0">
              <select class="w-full bg-bg-surface border border-border-default rounded px-3 py-2 text-xs text-tx-primary focus:border-accent outline-none"
                      [ngModel]="selectedConsoleSource()"
                      (ngModelChange)="switchConsoleSource($event)">
                <option value="daemon">Daemon — notifications &amp; events</option>
                @for (group of consoleSourceGroups(); track group.actionId) {
                  <optgroup [label]="group.actionLabel + ' (' + group.runs.length + (group.runs.length === 1 ? ' run' : ' runs') + ')'">
                    @for (run of group.runs; track run.id) {
                      <option [value]="run.id">
                        {{ formatTs(run.ts) }} — #{{ run.id.slice(0, 6) }} ({{ run.isEnded ? 'ended' : 'live' }})
                      </option>
                    }
                  </optgroup>
                }
              </select>
            </div>

            <!-- Log terminal pane -->
            <div class="flex-1 rounded-lg border border-border-default bg-bg-base overflow-hidden flex flex-col min-h-[300px]">
              <!-- Terminal chrome -->
              <div class="flex items-center gap-2 px-4 py-2 border-b border-border-subtle flex-shrink-0">
                <div class="flex items-center gap-1.5">
                  <span class="w-3 h-3 rounded-full bg-danger/50"></span>
                  <span class="w-3 h-3 rounded-full bg-warn/50"></span>
                  <span class="w-3 h-3 rounded-full bg-accent/50"></span>
                </div>
                <span class="text-xs text-tx-muted font-mono">{{ activeSourceLabel() }}</span>
                @if (isActiveSourceLive()) {
                  <span class="ml-auto flex items-center gap-1 text-xs text-accent-light">
                    <span class="w-1.5 h-1.5 rounded-full bg-accent status-pulse"></span>
                    Live
                  </span>
                }
              </div>
              <!-- Scrollable log entries -->
              <div class="flex-1 p-4 overflow-y-auto space-y-1" #logPane>
                @for (entry of activeConsoleLogs(); track $index) {
                  <div class="flex items-start gap-3 text-xs">
                    <span class="text-tx-disabled flex-shrink-0 font-mono w-16">{{ entry.ts }}</span>
                    <span class="text-[10px] px-1 py-px rounded flex-shrink-0 font-mono"
                          [class]="entry.stream === 'stderr' ? 'bg-danger/20 text-red-400' : 'bg-bg-overlay text-tx-disabled'">
                      {{ entry.stream }}
                    </span>
                    <span class="flex-1 break-all"
                          [class]="entry.level === 'error' ? 'text-red-400' : entry.level === 'warn' ? 'text-yellow-400' : entry.level === 'success' ? 'text-accent-light' : 'text-tx-secondary'">
                      {{ entry.text }}
                    </span>
                  </div>
                }
                @if (activeConsoleLogs().length === 0) {
                  <div class="text-xs text-tx-disabled italic">No output yet…</div>
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

  readonly logPane = viewChild<ElementRef>("logPane");

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

  readonly sibling_repos = computed(() => {
    const id = this.nav.selectedArtifactId();
    return this.daemon.repos().filter((r) => r.id !== id);
  });

  // Action editing
  readonly editingActionId = signal<string | null>(null);
  readonly editDraft = signal<ActionDefinition | null>(null);

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
  });

  // Run mode per action (stream vs background)
  readonly runModes = signal<Record<string, RunMode>>({});

  // Selected variant per action (empty string = default)
  readonly selectedVariants = signal<Record<string, string>>({});

  // Metadata editing
  readonly metaEditing = signal(false);
  readonly metaDraft = signal<ArtifactMeta>({});

  // Dev Tools console
  readonly selectedConsoleSource = signal<string>("daemon");
  readonly showEndedInstances = signal(false);
  readonly clearedSources = signal<Set<string>>(new Set());

  // Stored scroll positions per console source for independent restoration
  private readonly sourceScrollPositions = new Map<string, number>();

  // Groups action runs by action ID for optgroup dropdown
  readonly consoleSourceGroups = computed((): ConsoleSourceGroup[] => {
    const runs = this.daemon.actionRuns();
    const showEnded = this.showEndedInstances();
    const filtered = runs.filter((r) => showEnded || r.status === "running");

    const map = new Map<string, ConsoleSourceGroup>();
    for (const r of filtered) {
      if (!map.has(r.actionId)) {
        map.set(r.actionId, { actionId: r.actionId, actionLabel: r.actionLabel, runs: [] });
      }
      map.get(r.actionId)!.runs.push({ id: r.runId, ts: r.startedAt, isEnded: r.status !== "running" });
    }
    return Array.from(map.values());
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
    if (source === "daemon") return "daemon — notifications";
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

  // ── Icon helper ──────────────────────────────────────────────────────
  getIcon(name: string): string {
    const paths = ICON_PATHS[name || "play"] ?? ICON_PATHS["play"];
    return `<svg class="w-4 h-4 text-tx-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">${paths}</svg>`;
  }

  // ── Run mode ─────────────────────────────────────────────────────────
  getRunMode(actionId: string): RunMode {
    return this.runModes()[actionId] ?? "stream";
  }

  setRunMode(actionId: string, mode: RunMode): void {
    this.runModes.update((m) => ({ ...m, [actionId]: mode }));
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
    // Save current scroll position for the current source
    const el = this.logPane()?.nativeElement as HTMLElement | undefined;
    if (el) {
      this.sourceScrollPositions.set(this.selectedConsoleSource(), el.scrollTop);
    }
    this.selectedConsoleSource.set(sourceId);
    // Restore or scroll-to-bottom for the incoming source
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

  // ── Repo helpers ─────────────────────────────────────────────────────
  useThisRepo(): void {
    const repo = this.artifact();
    if (repo) void this.daemon.selectRepo(repo);
  }

  copyPath(): void {
    const repo = this.artifact();
    if (repo) void navigator.clipboard.writeText(repo.path);
  }

  copyText(text: string): void {
    void navigator.clipboard.writeText(text);
  }

  // ── Version actions ──────────────────────────────────────────────────
  async saveVersionByName(artifactName: string, nextVersion: string): Promise<void> {
    const ver = this.daemon.versions().find((v) => v.artifactName === artifactName);
    if (!ver) return;
    await this.daemon.saveVersionAndReturn({ ...ver, nextVersion });
  }

  async incrementVersionByName(artifactName: string): Promise<void> {
    await this.daemon.incrementVersionApi(artifactName);
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
    const mode = this.getRunMode(actionId);
    const background = mode === "background";
    const variantId = this.getSelectedVariant(actionId) || undefined;
    const runId = await this.daemon.dispatchAction(actionId, { background, variantId });
    if (runId) {
      if (!background) {
        this.daemon.streamAction(runId, actionId, action.label);
        // Switch to the new run's source, resetting its scroll to bottom
        this.sourceScrollPositions.delete(runId);
        this.selectedConsoleSource.set(runId);
      } else {
        // Register background run in Dev Tools so it appears in the source list
        this.daemon.registerBackgroundRun(runId, actionId, action.label);
        this.daemon.addNotification("info", "Launched in background", `Action '${action.label}' is running in background (non-blocking).`);
      }
    }
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
