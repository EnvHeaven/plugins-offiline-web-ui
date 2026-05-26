import { CommonModule } from "@angular/common";
import { Component, Input, OnDestroy, OnInit, computed, inject, signal } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { TerminalPanelComponent } from "@jovdk-web";
import {
  countSessionBindings,
  hasDuplicateTerminalBinding,
  isValidExternalUrl,
  layoutFingerprint,
  normalizeSplitSizes,
} from "./dynamic-view-utils";
import {
  ActionDefinition,
  ActionGroupSummary,
  ControlBlock,
  ControlExternalLink,
  ControlLayoutNode,
  ControlPanelPreset,
  DaemonService,
  TerminalSessionSummary,
} from "../../../services/daemon.service";
import { NavService } from "../../../services/nav.service";

type BlockKind = "terminal" | "status" | "externalLinks" | "placeholder" | "notes";

interface LinkDraft {
  label: string;
  url: string;
}

interface TerminalConfigDraft {
  expectedActionId: string;
  expectedRepoRoot: string;
  expectedCommand: string;
  labelIncludes: string;
}

type SessionStatusFilter = "all" | "running" | "ended";

@Component({
  selector: "app-dynamic-view",
  imports: [CommonModule, FormsModule, TerminalPanelComponent],
  templateUrl: "./dynamic-view.html",
  styleUrl: "./dynamic-view.css",
})
export class DynamicView implements OnInit, OnDestroy {
  @Input() standaloneMode = false;

  readonly daemon = inject(DaemonService);
  readonly nav = inject(NavService);

  readonly presets = signal<ControlPanelPreset[]>([]);
  readonly selectedPresetId = signal<string | null>(null);
  readonly terminalSessions = signal<TerminalSessionSummary[]>([]);
  readonly actionGroups = signal<ActionGroupSummary[]>([]);
  readonly sessionPickerBlockId = signal<string | null>(null);
  readonly sessionSearch = signal("");
  readonly sessionStatusFilter = signal<SessionStatusFilter>("all");
  readonly configuringBlockId = signal<string | null>(null);
  readonly terminalConfigDraft = signal<TerminalConfigDraft>({
    expectedActionId: "",
    expectedRepoRoot: "",
    expectedCommand: "",
    labelIncludes: "",
  });
  readonly linkDrafts = signal<Record<string, LinkDraft>>({});
  readonly linkErrors = signal<Record<string, string>>({});
  readonly missingPresetId = signal<string | null>(null);
  readonly saving = signal(false);
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);

  private refreshTimer: ReturnType<typeof setInterval> | null = null;

  readonly artifact = computed(() => {
    const id = this.nav.selectedArtifactId();
    return this.daemon.repos().find((repo) => repo.id === id) ?? null;
  });

  readonly selectedPreset = computed(() => {
    const id = this.selectedPresetId();
    return this.presets().find((preset) => preset.id === id) ?? this.presets()[0] ?? null;
  });

  readonly runningSessionCount = computed(() =>
    this.terminalSessions().filter((session) => session.status === "running").length,
  );

  readonly completedSessionCount = computed(() =>
    this.terminalSessions().filter((session) => session.status === "completed").length,
  );

  readonly stoppedSessionCount = computed(() =>
    this.terminalSessions().filter((session) => session.status === "terminated" || session.status === "failed").length,
  );

  readonly selectedActionGroup = computed(() => {
    const groupId = this.currentActionGroupId();
    return groupId ? this.actionGroups().find((group) => group.id === groupId) ?? null : null;
  });

  readonly filteredTerminalSessions = computed(() => {
    const search = this.sessionSearch().trim().toLowerCase();
    const status = this.sessionStatusFilter();
    return this.terminalSessions().filter((session) => {
      if (status === "running" && session.status !== "running") return false;
      if (status === "ended" && session.status === "running") return false;
      if (!search) return true;
      return [
        session.title,
        session.actionId,
        session.actionLabel,
        session.repoRoot,
        session.command,
        session.runId,
        session.actionGroupId,
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(search));
    });
  });

  readonly runnableTerminalBlocks = computed(() =>
    this.selectedPreset()?.blocks.filter((block) => this.isRunnableTerminalBlock(block)) ?? [],
  );

  readonly hasDraftChanges = computed(() =>
    Boolean(this.configuringBlockId()) ||
    Object.values(this.linkDrafts()).some((draft) => draft.label.trim() || draft.url.trim()),
  );

  async ngOnInit(): Promise<void> {
    await Promise.all([this.refreshPresets(), this.refreshTerminalSessions(), this.refreshActionGroups()]);
    this.selectInitialPreset();
    this.refreshTimer = setInterval(() => {
      void this.refreshTerminalSessions();
      void this.refreshActionGroups();
    }, 4000);
  }

  ngOnDestroy(): void {
    if (this.refreshTimer) {
      clearInterval(this.refreshTimer);
      this.refreshTimer = null;
    }
  }

  async refreshPresets(): Promise<void> {
    const repo = this.artifact();
    if (!repo) return;
    this.loading.set(true);
    try {
      const presets = await this.daemon.listControlPanelPresets({ repoRoot: repo.path, artifactId: repo.id });
      this.presets.set(presets);
      this.ensureSelectedPresetExists(presets);
      this.error.set(null);
    } catch (err) {
      this.error.set(err instanceof Error ? err.message : "Could not load Dynamic View presets.");
    } finally {
      this.loading.set(false);
    }
  }

  async refreshTerminalSessions(): Promise<void> {
    const repo = this.artifact();
    if (!repo) return;
    try {
      const sessions = await this.daemon.listTerminalSessions({ repoRoot: repo.path });
      this.terminalSessions.set(sessions);
      await this.autoWireSessions(sessions);
    } catch {
      // Session refresh is opportunistic; preset editing must remain usable offline.
    }
  }

  async refreshActionGroups(): Promise<void> {
    const repo = this.artifact();
    if (!repo) return;
    try {
      const groups = await this.daemon.listActionGroups({ repoRoot: repo.path });
      this.actionGroups.set(groups);
    } catch {
      // Group refresh is opportunistic.
    }
  }

  selectPreset(id: string): void {
    this.selectedPresetId.set(id);
    this.missingPresetId.set(null);
    this.syncPresetQueryParam(id);
  }

  async createPreset(): Promise<void> {
    const repo = this.artifact();
    if (!repo) return;
    const blockId = this.newId("status");
    const preset: ControlPanelPreset = {
      id: this.newId("preset"),
      artifactId: repo.id,
      repoRoot: repo.path,
      name: `Dynamic View ${this.presets().length + 1}`,
      layout: { type: "block", blockId },
      blocks: [{ id: blockId, kind: "status", title: "Status" }],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    const saved = await this.daemon.createControlPanelPreset(preset);
    this.presets.update((presets) => [...presets, saved]);
    this.selectPreset(saved.id);
  }

  async renamePreset(): Promise<void> {
    const preset = this.selectedPreset();
    if (!preset) return;
    const name = window.prompt("Preset name", preset.name)?.trim();
    if (!name) return;
    await this.updatePreset({ ...preset, name });
  }

  async duplicatePreset(): Promise<void> {
    const preset = this.selectedPreset();
    if (!preset) return;
    const saved = await this.daemon.duplicateControlPanelPreset(preset, `${preset.name} copy`);
    this.presets.update((presets) => [...presets, saved]);
    this.selectPreset(saved.id);
  }

  async deletePreset(): Promise<void> {
    const preset = this.selectedPreset();
    if (!preset || !window.confirm(`Delete preset "${preset.name}"? Terminal sessions keep running.`)) return;
    await this.daemon.deleteControlPanelPreset(preset.id, preset.repoRoot);
    this.presets.update((presets) => presets.filter((entry) => entry.id !== preset.id));
    this.selectedPresetId.set(this.presets()[0]?.id ?? null);
  }

  async savePreset(): Promise<void> {
    const preset = this.selectedPreset();
    if (preset) {
      await this.updatePreset(preset);
    }
  }

  async addBlock(kind: BlockKind): Promise<void> {
    const preset = this.selectedPreset();
    if (!preset) return;
    const block = this.createBlock(kind);
    const next = this.clonePreset(preset);
    next.blocks.push(block);
    next.layout = this.appendBlockToLayout(next.layout, block.id);
    await this.updatePreset(next);
  }

  async removeBlock(blockId: string): Promise<void> {
    const preset = this.selectedPreset();
    if (!preset || preset.blocks.length <= 1) return;
    if (!window.confirm("Remove this block from the layout? Any terminal session keeps running.")) return;
    const next = this.clonePreset(preset);
    next.blocks = next.blocks.filter((block) => block.id !== blockId);
    next.layout = this.removeBlockFromLayout(next.layout, blockId) ?? { type: "block", blockId: next.blocks[0]!.id };
    await this.updatePreset(next);
  }

  async duplicateBlock(blockId: string): Promise<void> {
    const preset = this.selectedPreset();
    const block = preset?.blocks.find((entry) => entry.id === blockId);
    if (!preset || !block) return;
    const duplicateId = this.newId(block.kind === "externalLinks" ? "links" : block.kind);
    const duplicate: ControlBlock = {
      ...this.cloneBlock(block),
      id: duplicateId,
      title: `${block.title} copy`,
      terminal: block.terminal ? { ...block.terminal, slotId: duplicateId, runId: undefined } : undefined,
    };
    const next = this.clonePreset(preset);
    next.blocks.push(duplicate);
    next.layout = this.appendBlockToLayout(next.layout, duplicate.id);
    await this.updatePreset(next);
  }

  async renameBlock(blockId: string): Promise<void> {
    const preset = this.selectedPreset();
    const block = preset?.blocks.find((entry) => entry.id === blockId);
    if (!preset || !block) return;
    const title = window.prompt("Block title", block.title)?.trim();
    if (!title) return;
    const next = this.clonePreset(preset);
    next.blocks = next.blocks.map((entry) => entry.id === blockId ? { ...entry, title } : entry);
    await this.updatePreset(next);
  }

  async splitBlock(blockId: string, direction: "horizontal" | "vertical"): Promise<void> {
    const preset = this.selectedPreset();
    if (!preset) return;
    const block = this.createBlock("placeholder");
    const next = this.clonePreset(preset);
    next.blocks.push(block);
    next.layout = this.replaceBlockInLayout(next.layout, blockId, {
      type: "split",
      direction,
      sizes: [50, 50],
      children: [{ type: "block", blockId }, { type: "block", blockId: block.id }],
    });
    await this.updatePreset(next);
  }

  async moveBlockToStack(blockId: string): Promise<void> {
    const preset = this.selectedPreset();
    if (!preset) return;
    const next = this.clonePreset(preset);
    next.layout = this.replaceBlockInLayout(next.layout, blockId, {
      type: "stack",
      activeBlockId: blockId,
      blockIds: [blockId],
    });
    await this.updatePreset(next);
  }

  async setStackActive(stack: ControlLayoutNode, blockId: string): Promise<void> {
    const preset = this.selectedPreset();
    if (!preset || stack.type !== "stack") return;
    const next = this.clonePreset(preset);
    next.layout = this.updateStackActive(next.layout, stack.blockIds, blockId);
    await this.updatePreset(next);
  }

  async setSplitSize(split: ControlLayoutNode, index: number, rawValue: string | number): Promise<void> {
    const preset = this.selectedPreset();
    if (!preset || split.type !== "split") return;
    const value = typeof rawValue === "number" ? rawValue : Number(rawValue);
    const currentSizes = split.sizes?.length === split.children.length
      ? split.sizes
      : split.children.map(() => 100 / split.children.length);
    const nextSizes = normalizeSplitSizes(currentSizes, index, value);
    const targetFingerprint = layoutFingerprint(split);
    const next = this.clonePreset(preset);
    next.layout = this.updateSplitSizes(next.layout, targetFingerprint, nextSizes);
    await this.updatePreset(next);
  }

  openSessionPicker(blockId: string): void {
    this.sessionPickerBlockId.set(blockId);
    void this.refreshTerminalSessions();
  }

  closeSessionPicker(): void {
    this.sessionPickerBlockId.set(null);
  }

  async attachSession(blockId: string, session: TerminalSessionSummary): Promise<void> {
    const preset = this.selectedPreset();
    if (!preset) return;
    if (this.isSessionBoundElsewhere(session.runId, blockId)) {
      const confirmed = window.confirm("This terminal is already attached to another slot. Attach it here too? Input will be shared.");
      if (!confirmed) return;
    }
    const next = this.clonePreset(preset);
    next.blocks = next.blocks.map((block) =>
      block.id === blockId
        ? {
            ...block,
            kind: "terminal",
            title: block.title || session.title || "Terminal",
            terminal: {
              ...(block.terminal ?? { slotId: blockId }),
              slotId: block.terminal?.slotId ?? blockId,
              runId: session.runId,
              expectedActionId: session.actionId,
              expectedRepoRoot: session.repoRoot,
              expectedCommand: session.command,
              match: {
                ...(block.terminal?.match ?? {}),
                actionId: session.actionId,
                repoRoot: session.repoRoot,
                actionGroupId: session.actionGroupId,
              },
            },
          }
        : block,
    );
    await this.updatePreset(next);
    this.closeSessionPicker();
  }

  async stopTerminal(block: ControlBlock): Promise<void> {
    const runId = block.terminal?.runId;
    if (!runId) return;
    try {
      await this.daemon.stopTerminalSession(runId);
      await Promise.all([this.refreshTerminalSessions(), this.refreshActionGroups()]);
      this.error.set(null);
    } catch (err) {
      this.error.set(err instanceof Error ? err.message : "Could not stop terminal session.");
    }
  }

  async detachSession(blockId: string): Promise<void> {
    const preset = this.selectedPreset();
    if (!preset) return;
    const next = this.clonePreset(preset);
    next.blocks = next.blocks.map((block) =>
      block.id === blockId && block.terminal
        ? { ...block, terminal: { ...block.terminal, runId: undefined } }
        : block,
    );
    await this.updatePreset(next);
  }

  async runLayout(): Promise<void> {
    const preset = this.selectedPreset();
    const repo = this.artifact();
    if (!preset || !repo) return;
    const terminals = this.runnableTerminalBlocks().map((block) => ({
      slotId: block.id,
      actionId: block.terminal?.expectedActionId,
      repoRoot: block.terminal?.expectedRepoRoot ?? repo.path,
      title: block.title,
    }));

    if (terminals.length === 0) {
      this.error.set("No runnable terminal slots. Configure at least one slot with an action.");
      return;
    }

    this.saving.set(true);
    try {
      const result = await this.daemon.dispatchActionGroup({
        artifactId: repo.id,
        repoRoot: repo.path,
        label: preset.name,
        terminals,
      });
      const next = this.clonePreset(preset);
      next.blocks = next.blocks.map((block) => {
        const runId = result.slotRunMap[block.id];
        if (!runId || !block.terminal) return block;
        return {
          ...block,
          terminal: {
            ...block.terminal,
            runId,
            match: {
              ...(block.terminal.match ?? {}),
              actionId: block.terminal.expectedActionId,
              repoRoot: block.terminal.expectedRepoRoot,
              actionGroupId: result.group.id,
            },
          },
        };
      });
      await this.updatePreset(next);
      this.actionGroups.update((groups) => [result.group, ...groups.filter((group) => group.id !== result.group.id)]);
      this.terminalSessions.set(this.mergeSessions(result.runs, this.terminalSessions()));
      this.error.set(null);
    } catch (err) {
      this.error.set(err instanceof Error ? err.message : "Could not run Dynamic View layout.");
    } finally {
      this.saving.set(false);
    }
  }

  async runTerminalBlock(block: ControlBlock): Promise<void> {
    const preset = this.selectedPreset();
    const repo = this.artifact();
    if (!preset || !repo || !this.isRunnableTerminalBlock(block)) {
      this.error.set("Configure this terminal slot with an action before running it.");
      return;
    }

    this.saving.set(true);
    try {
      const result = await this.daemon.dispatchActionGroup({
        artifactId: repo.id,
        repoRoot: repo.path,
        label: `${preset.name}: ${block.title}`,
        terminals: [{
          slotId: block.id,
          actionId: block.terminal?.expectedActionId,
          repoRoot: block.terminal?.expectedRepoRoot ?? repo.path,
          title: block.title,
        }],
      });
      const runId = result.slotRunMap[block.id] ?? result.runs[0]?.runId;
      if (runId) {
        const next = this.clonePreset(preset);
        next.blocks = next.blocks.map((entry) =>
          entry.id === block.id && entry.terminal
            ? {
                ...entry,
                terminal: {
                  ...entry.terminal,
                  runId,
                  match: {
                    ...(entry.terminal.match ?? {}),
                    actionId: entry.terminal.expectedActionId,
                    repoRoot: entry.terminal.expectedRepoRoot,
                    actionGroupId: result.group.id,
                  },
                },
              }
            : entry,
        );
        await this.updatePreset(next);
      }
      this.actionGroups.update((groups) => [result.group, ...groups.filter((group) => group.id !== result.group.id)]);
      this.terminalSessions.set(this.mergeSessions(result.runs, this.terminalSessions()));
      this.error.set(null);
    } catch (err) {
      this.error.set(err instanceof Error ? err.message : "Could not run terminal slot.");
    } finally {
      this.saving.set(false);
    }
  }

  async stopCurrentGroup(): Promise<void> {
    const groupId = this.currentActionGroupId();
    if (!groupId) return;
    const runningCount = this.currentGroupRunningSessionCount();
    if (runningCount > 1 && !window.confirm(`Stop ${runningCount} running terminal sessions in this group?`)) return;
    try {
      await this.daemon.stopActionGroup(groupId);
      await Promise.all([this.refreshTerminalSessions(), this.refreshActionGroups()]);
      this.error.set(null);
    } catch (err) {
      this.error.set(err instanceof Error ? err.message : "Could not stop action group.");
    }
  }

  async stopAllPresetTerminals(): Promise<void> {
    const preset = this.selectedPreset();
    if (!preset) return;
    const runningRunIds = preset.blocks
      .map((block) => block.terminal?.runId)
      .filter((runId): runId is string => Boolean(runId))
      .filter((runId) => this.terminalSessions().find((session) => session.runId === runId)?.canStop);
    if (runningRunIds.length > 1 && !window.confirm(`Stop ${runningRunIds.length} running terminal sessions in this preset?`)) return;
    try {
      await Promise.all(runningRunIds.map((runId) => this.daemon.stopTerminalSession(runId)));
      await Promise.all([this.refreshTerminalSessions(), this.refreshActionGroups()]);
      this.error.set(null);
    } catch (err) {
      this.error.set(err instanceof Error ? err.message : "Could not stop preset terminals.");
    }
  }

  async clearEndedBindings(): Promise<void> {
    const preset = this.selectedPreset();
    if (!preset) return;
    const next = this.clonePreset(preset);
    let changed = false;
    next.blocks = next.blocks.map((block) => {
      const binding = block.terminal;
      const runId = binding?.runId;
      if (!binding || !runId) return block;
      const session = this.terminalSessions().find((entry) => entry.runId === runId);
      if (!session || session.status === "running") return block;
      changed = true;
      return { ...block, terminal: { ...binding, runId: undefined } };
    });
    if (changed) {
      await this.updatePreset(next);
    }
  }

  configureTerminalBlock(block: ControlBlock): void {
    this.configuringBlockId.set(block.id);
    this.terminalConfigDraft.set({
      expectedActionId: block.terminal?.expectedActionId ?? "",
      expectedRepoRoot: block.terminal?.expectedRepoRoot ?? this.artifact()?.path ?? "",
      expectedCommand: block.terminal?.expectedCommand ?? "",
      labelIncludes: block.terminal?.match?.labelIncludes ?? "",
    });
  }

  closeTerminalConfig(): void {
    this.configuringBlockId.set(null);
  }

  updateTerminalConfigDraft(patch: Partial<TerminalConfigDraft>): void {
    this.terminalConfigDraft.update((draft) => ({ ...draft, ...patch }));
  }

  setSessionStatusFilter(value: string): void {
    this.sessionStatusFilter.set(value === "running" || value === "ended" ? value : "all");
  }

  async saveTerminalConfig(blockId: string): Promise<void> {
    const preset = this.selectedPreset();
    if (!preset) return;
    const draft = this.terminalConfigDraft();
    const expectedActionId = draft.expectedActionId.trim();
    const expectedRepoRoot = draft.expectedRepoRoot.trim() || this.artifact()?.path;
    const expectedCommand = draft.expectedCommand.trim();
    const labelIncludes = draft.labelIncludes.trim();
    const next = this.clonePreset(preset);
    next.blocks = next.blocks.map((block) => {
      if (block.id !== blockId) return block;
      return {
        ...block,
        kind: "terminal",
        terminal: {
          ...(block.terminal ?? { slotId: blockId }),
          slotId: block.terminal?.slotId ?? blockId,
          expectedActionId: expectedActionId || undefined,
          expectedRepoRoot: expectedRepoRoot || undefined,
          expectedCommand: expectedCommand || undefined,
          match: {
            ...(block.terminal?.match ?? {}),
            actionId: expectedActionId || undefined,
            repoRoot: expectedRepoRoot || undefined,
            labelIncludes: labelIncludes || undefined,
          },
        },
      };
    });
    await this.updatePreset(next);
    this.closeTerminalConfig();
  }

  updateLinkDraft(blockId: string, patch: Partial<LinkDraft>): void {
    this.linkDrafts.update((drafts) => ({
      ...drafts,
      [blockId]: { ...(drafts[blockId] ?? { label: "", url: "" }), ...patch },
    }));
    this.linkErrors.update((errors) => ({ ...errors, [blockId]: "" }));
  }

  async addExternalLink(blockId: string): Promise<void> {
    const draft = this.linkDrafts()[blockId];
    if (!draft?.label.trim()) {
      this.linkErrors.update((errors) => ({ ...errors, [blockId]: "Link label is required." }));
      return;
    }
    if (!isValidExternalUrl(draft.url)) {
      this.linkErrors.update((errors) => ({ ...errors, [blockId]: "Enter a valid http or https URL." }));
      return;
    }
    const preset = this.selectedPreset();
    if (!preset) return;
    const link: ControlExternalLink = {
      id: this.newId("link"),
      label: draft.label.trim(),
      url: draft.url.trim(),
    };
    const next = this.clonePreset(preset);
    next.blocks = next.blocks.map((block) =>
      block.id === blockId ? { ...block, externalLinks: [...(block.externalLinks ?? []), link] } : block,
    );
    await this.updatePreset(next);
    this.linkDrafts.update((drafts) => ({ ...drafts, [blockId]: { label: "", url: "" } }));
    this.linkErrors.update((errors) => ({ ...errors, [blockId]: "" }));
  }

  async removeExternalLink(blockId: string, linkId: string): Promise<void> {
    const preset = this.selectedPreset();
    if (!preset) return;
    const next = this.clonePreset(preset);
    next.blocks = next.blocks.map((block) =>
      block.id === blockId
        ? { ...block, externalLinks: (block.externalLinks ?? []).filter((link) => link.id !== linkId) }
        : block,
    );
    await this.updatePreset(next);
  }

  async editExternalLink(blockId: string, link: ControlExternalLink): Promise<void> {
    const label = window.prompt("Link label", link.label)?.trim();
    if (!label) return;
    const url = window.prompt("Link URL", link.url)?.trim();
    if (!url || !isValidExternalUrl(url)) {
      this.linkErrors.update((errors) => ({ ...errors, [blockId]: "Enter a valid http or https URL." }));
      return;
    }
    const preset = this.selectedPreset();
    if (!preset) return;
    const next = this.clonePreset(preset);
    next.blocks = next.blocks.map((block) =>
      block.id === blockId
        ? {
            ...block,
            externalLinks: (block.externalLinks ?? []).map((entry) =>
              entry.id === link.id ? { ...entry, label, url } : entry,
            ),
          }
        : block,
    );
    await this.updatePreset(next);
  }

  openStandalone(): void {
    const artifactId = this.artifact()?.id;
    if (!artifactId) return;
    const presetId = this.selectedPresetId();
    const qs = presetId ? `?presetId=${encodeURIComponent(presetId)}` : "";
    window.open(`/artifact/${encodeURIComponent(artifactId)}/dynamic-view/standalone${qs}`, "_blank", "noopener,noreferrer");
  }

  blockFor(id: string): ControlBlock | null {
    return this.selectedPreset()?.blocks.find((block) => block.id === id) ?? null;
  }

  terminalSessionFor(block: ControlBlock): TerminalSessionSummary | null {
    const runId = block.terminal?.runId;
    if (!runId) return null;
    return this.terminalSessions().find((session) => session.runId === runId) ?? null;
  }

  terminalState(block: ControlBlock): string {
    const runId = block.terminal?.runId;
    if (!runId) return "empty slot";
    const session = this.terminalSessionFor(block);
    if (!session) return "missing session";
    if (session.status === "running") return "running session attached";
    if (session.status === "completed" && session.hasReplay) return "completed session replayable";
    if (session.status === "terminated") return "stopped";
    return session.status;
  }

  isTerminalAttachable(block: ControlBlock): boolean {
    const session = this.terminalSessionFor(block);
    return Boolean(session?.canAttach);
  }

  isTerminalWaiting(block: ControlBlock): boolean {
    return block.kind === "terminal" && Boolean(block.terminal?.expectedActionId && !block.terminal?.runId);
  }

  isTerminalMissing(block: ControlBlock): boolean {
    return block.kind === "terminal" && Boolean(block.terminal?.runId && !this.terminalSessionFor(block));
  }

  isSessionShared(block: ControlBlock): boolean {
    const preset = this.selectedPreset();
    const runId = block.terminal?.runId;
    return Boolean(preset && runId && hasDuplicateTerminalBinding(preset.blocks, runId));
  }

  sharedSessionCount(block: ControlBlock): number {
    const preset = this.selectedPreset();
    const runId = block.terminal?.runId;
    return preset && runId ? countSessionBindings(preset.blocks, runId) : 0;
  }

  currentGroupRunningSessionCount(): number {
    const groupId = this.currentActionGroupId();
    if (!groupId) return 0;
    return this.terminalSessions().filter((session) => session.actionGroupId === groupId && session.status === "running").length;
  }

  presetRunningSessionCount(): number {
    const preset = this.selectedPreset();
    if (!preset) return 0;
    const runIds = new Set(
      preset.blocks
        .map((block) => block.terminal?.runId)
        .filter((runId): runId is string => Boolean(runId)),
    );
    return this.terminalSessions().filter((session) => runIds.has(session.runId) && session.status === "running").length;
  }

  linkDraft(blockId: string): LinkDraft {
    return this.linkDrafts()[blockId] ?? { label: "", url: "" };
  }

  linkError(blockId: string): string {
    return this.linkErrors()[blockId] ?? "";
  }

  discardDraftChanges(): void {
    this.configuringBlockId.set(null);
    this.linkDrafts.set({});
    this.linkErrors.set({});
  }

  availableActions(): ActionDefinition[] {
    return this.daemon.actions();
  }

  terminalConfig(block: ControlBlock): TerminalConfigDraft {
    return {
      expectedActionId: block.terminal?.expectedActionId ?? "",
      expectedRepoRoot: block.terminal?.expectedRepoRoot ?? this.artifact()?.path ?? "",
      expectedCommand: block.terminal?.expectedCommand ?? "",
      labelIncludes: block.terminal?.match?.labelIncludes ?? "",
    };
  }

  isRunnableTerminalBlock(block: ControlBlock): boolean {
    return block.kind === "terminal" && Boolean(block.terminal?.expectedActionId && (block.terminal?.expectedRepoRoot || this.artifact()?.path));
  }

  isSessionBoundElsewhere(runId: string, blockId: string): boolean {
    return Boolean(this.selectedPreset()?.blocks.some((block) => block.id !== blockId && block.terminal?.runId === runId));
  }

  currentActionGroupId(): string | null {
    const preset = this.selectedPreset();
    if (!preset) return null;
    const groupIds = preset.blocks
      .map((block) => block.terminal?.match?.actionGroupId ?? this.terminalSessionFor(block)?.actionGroupId)
      .filter((groupId): groupId is string => Boolean(groupId));
    return groupIds[0] ?? null;
  }

  trackById(_: number, item: { id: string }): string {
    return item.id;
  }

  private async autoWireSessions(sessions: TerminalSessionSummary[]): Promise<void> {
    const preset = this.selectedPreset();
    if (!preset) return;
    const next = this.clonePreset(preset);
    let changed = false;
    const bound = new Set(
      next.blocks
        .map((block) => block.terminal?.runId)
        .filter((runId): runId is string => Boolean(runId)),
    );

    next.blocks = next.blocks.map((block) => {
      if (block.kind !== "terminal" || !block.terminal || block.terminal.runId) {
        return block;
      }
      const match = this.findMatchingSession(block, sessions, bound);
      if (!match) return block;
      bound.add(match.runId);
      changed = true;
      return {
        ...block,
        terminal: {
          ...block.terminal,
          runId: match.runId,
          expectedActionId: block.terminal.expectedActionId ?? match.actionId,
          expectedRepoRoot: block.terminal.expectedRepoRoot ?? match.repoRoot,
          expectedCommand: block.terminal.expectedCommand ?? match.command,
          match: {
            ...(block.terminal.match ?? {}),
            actionId: block.terminal.match?.actionId ?? block.terminal.expectedActionId ?? match.actionId,
            repoRoot: block.terminal.match?.repoRoot ?? block.terminal.expectedRepoRoot ?? match.repoRoot,
            actionGroupId: block.terminal.match?.actionGroupId ?? match.actionGroupId,
          },
        },
      };
    });

    if (changed) {
      await this.updatePreset(next);
    }
  }

  private findMatchingSession(block: ControlBlock, sessions: TerminalSessionSummary[], alreadyBound: Set<string>): TerminalSessionSummary | null {
    const binding = block.terminal;
    if (!binding) return null;
    const expectedActionId = binding.match?.actionId ?? binding.expectedActionId;
    const expectedRepoRoot = binding.match?.repoRoot ?? binding.expectedRepoRoot;
    const expectedGroupId = binding.match?.actionGroupId;
    const labelIncludes = binding.match?.labelIncludes?.toLowerCase();
    const candidates = sessions.filter((session) => {
      if (alreadyBound.has(session.runId)) return false;
      if (expectedActionId && session.actionId !== expectedActionId) return false;
      if (expectedRepoRoot && session.repoRoot !== expectedRepoRoot) return false;
      if (expectedGroupId && session.actionGroupId !== expectedGroupId) return false;
      if (labelIncludes) {
        const text = `${session.title ?? ""} ${session.actionLabel ?? ""} ${session.command ?? ""}`.toLowerCase();
        if (!text.includes(labelIncludes)) return false;
      }
      return Boolean(expectedActionId || expectedRepoRoot || expectedGroupId || labelIncludes);
    });
    return candidates.length === 1 ? candidates[0]! : null;
  }

  private mergeSessions(incoming: TerminalSessionSummary[], existing: TerminalSessionSummary[]): TerminalSessionSummary[] {
    const byId = new Map(existing.map((session) => [session.runId, session]));
    for (const session of incoming) {
      byId.set(session.runId, session);
    }
    return Array.from(byId.values()).sort((left, right) => (right.startedAt ?? 0) - (left.startedAt ?? 0));
  }

  private selectInitialPreset(): void {
    const fromQuery = new URLSearchParams(location.search).get("presetId");
    const queryExists = Boolean(fromQuery);
    const queryMatches = fromQuery && this.presets().some((preset) => preset.id === fromQuery);
    const nextId = queryMatches ? fromQuery : this.presets()[0]?.id ?? null;
    this.missingPresetId.set(queryExists && !queryMatches ? fromQuery : null);
    this.selectedPresetId.set(nextId);
    if (nextId) {
      this.syncPresetQueryParam(nextId);
    }
  }

  private async updatePreset(preset: ControlPanelPreset): Promise<void> {
    this.saving.set(true);
    try {
      const saved = await this.daemon.updateControlPanelPreset(preset.id, {
        ...preset,
        updatedAt: Date.now(),
      });
      this.presets.update((presets) => presets.map((entry) => entry.id === saved.id ? saved : entry));
      this.error.set(null);
    } catch (err) {
      this.error.set(err instanceof Error ? err.message : "Could not save Dynamic View preset.");
    } finally {
      this.saving.set(false);
    }
  }

  private createBlock(kind: BlockKind): ControlBlock {
    const id = this.newId(kind === "externalLinks" ? "links" : kind);
    if (kind === "terminal") {
      return { id, kind, title: "Terminal slot", terminal: { slotId: id } };
    }
    if (kind === "externalLinks") {
      return { id, kind, title: "External links", externalLinks: [] };
    }
    if (kind === "status") {
      return { id, kind, title: "Status" };
    }
    return { id, kind, title: "Reserved slot" };
  }

  private appendBlockToLayout(layout: ControlLayoutNode, blockId: string): ControlLayoutNode {
    if (layout.type === "stack") {
      return { ...layout, blockIds: [...layout.blockIds, blockId], activeBlockId: blockId };
    }
    return {
      type: "split",
      direction: "horizontal",
      sizes: [70, 30],
      children: [layout, { type: "block", blockId }],
    };
  }

  private replaceBlockInLayout(layout: ControlLayoutNode, blockId: string, replacement: ControlLayoutNode): ControlLayoutNode {
    if (layout.type === "block") {
      return layout.blockId === blockId ? replacement : layout;
    }
    if (layout.type === "stack") {
      return layout.blockIds.includes(blockId) ? replacement : layout;
    }
    return {
      ...layout,
      children: layout.children.map((child) => this.replaceBlockInLayout(child, blockId, replacement)),
    };
  }

  private removeBlockFromLayout(layout: ControlLayoutNode, blockId: string): ControlLayoutNode | null {
    if (layout.type === "block") {
      return layout.blockId === blockId ? null : layout;
    }
    if (layout.type === "stack") {
      const blockIds = layout.blockIds.filter((id) => id !== blockId);
      if (blockIds.length === 0) return null;
      return { ...layout, blockIds, activeBlockId: blockIds.includes(layout.activeBlockId ?? "") ? layout.activeBlockId : blockIds[0] };
    }
    const children = layout.children
      .map((child) => this.removeBlockFromLayout(child, blockId))
      .filter((child): child is ControlLayoutNode => Boolean(child));
    if (children.length === 0) return null;
    if (children.length === 1) return children[0]!;
    return { ...layout, children };
  }

  private updateStackActive(layout: ControlLayoutNode, blockIds: string[], activeBlockId: string): ControlLayoutNode {
    if (layout.type === "stack" && layout.blockIds.join("|") === blockIds.join("|")) {
      return { ...layout, activeBlockId };
    }
    if (layout.type === "split") {
      return { ...layout, children: layout.children.map((child) => this.updateStackActive(child, blockIds, activeBlockId)) };
    }
    return layout;
  }

  private clonePreset(preset: ControlPanelPreset): ControlPanelPreset {
    return JSON.parse(JSON.stringify(preset)) as ControlPanelPreset;
  }

  private syncPresetQueryParam(presetId: string): void {
    if (!this.standaloneMode) return;
    const url = new URL(location.href);
    url.searchParams.set("presetId", presetId);
    history.replaceState(null, "", url);
  }

  private ensureSelectedPresetExists(presets: ControlPanelPreset[]): void {
    const selectedId = this.selectedPresetId();
    if (!selectedId || presets.some((preset) => preset.id === selectedId)) return;
    this.missingPresetId.set(selectedId);
    this.selectedPresetId.set(presets[0]?.id ?? null);
  }

  private updateSplitSizes(layout: ControlLayoutNode, targetFingerprint: string, sizes: number[]): ControlLayoutNode {
    if (layout.type === "split") {
      if (layoutFingerprint(layout) === targetFingerprint) {
        return { ...layout, sizes };
      }
      return { ...layout, children: layout.children.map((child) => this.updateSplitSizes(child, targetFingerprint, sizes)) };
    }
    return layout;
  }

  private cloneBlock(block: ControlBlock): ControlBlock {
    return JSON.parse(JSON.stringify(block)) as ControlBlock;
  }

  private newId(prefix: string): string {
    return `${prefix}_${crypto.randomUUID().slice(0, 8)}`;
  }
}
