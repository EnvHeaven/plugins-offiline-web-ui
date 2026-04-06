import { Component, Input, Output, EventEmitter, signal, OnChanges, SimpleChanges } from '@angular/core';
import { FormsModule } from '@angular/forms';

export interface VersionRecord {
  artifactName: string;
  packageName: string;
  lastVersion: string | null;
  nextVersion: string | null;
}

@Component({
  selector: 'jov-version-panel',
  standalone: true,
  imports: [FormsModule],
  template: `
    <div class="jov-version-panel rounded-lg border border-[#2a2a3a] bg-[#12121c] p-4 space-y-4">

      <!-- Header row -->
      <div class="flex items-start justify-between gap-3">
        <div class="min-w-0 flex-1">
          <div class="text-sm font-semibold text-[#e2e2f0] truncate">{{ version.artifactName }}</div>
          <div class="text-[11px] text-[#6b6b85] font-mono truncate mt-0.5">{{ version.packageName }}</div>
        </div>
        <span class="flex-shrink-0 text-[10px] font-semibold px-2 py-0.5 rounded border border-[#2e4a72]/60 bg-[#1a2d4a] text-[#7badd6] uppercase tracking-wide">
          Registry
        </span>
      </div>

      <!-- Version info grid -->
      <div class="grid grid-cols-2 gap-3">

        <!-- Last version (read-only) -->
        <div>
          <label class="block text-[10px] font-semibold text-[#6b6b85] uppercase tracking-wider mb-1.5">
            Last Version
          </label>
          <div class="bg-[#0d0d17] border border-[#1e1e2e] rounded-md px-3 py-2 text-sm text-[#6b6b85] font-mono select-all">
            {{ version.lastVersion ?? '—' }}
          </div>
        </div>

        <!-- Next version (editable) -->
        <div>
          <label class="block text-[10px] font-semibold text-[#6b6b85] uppercase tracking-wider mb-1.5">
            Next Version
          </label>
          <input
            class="w-full bg-[#0d0d17] border border-[#2a2a3a] rounded-md px-3 py-2 text-sm text-[#e2e2f0] font-mono placeholder-[#4a4a5e] focus:border-[#6b4fcf]/60 focus:ring-1 focus:ring-[#6b4fcf]/20 focus:outline-none transition-colors"
            placeholder="e.g. 1.0.1"
            [ngModel]="draftVersion()"
            (ngModelChange)="draftVersion.set($event)"
          />
        </div>
      </div>

      <!-- Actions row -->
      <div class="flex items-center gap-2 pt-1">

        <!-- Save button -->
        <button
          class="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-[#6b4fcf] text-white text-xs font-semibold hover:bg-[#7c5fd8] active:scale-95 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
          [disabled]="!draftVersion() || saving()"
          (click)="onSave()">
          @if (saving()) {
            <svg class="w-3 h-3 animate-spin" viewBox="0 0 24 24" fill="none">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
            </svg>
          } @else {
            <svg class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
              <polyline points="20,6 9,17 4,12"/>
            </svg>
          }
          Save
        </button>

        <!-- Increment patch button -->
        <button
          class="flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-[#2a2a3a] text-[#a0a0b8] text-xs hover:text-[#e2e2f0] hover:border-[#3a3a4e] active:scale-95 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
          [disabled]="incrementing()"
          (click)="onIncrement()">
          @if (incrementing()) {
            <svg class="w-3 h-3 animate-spin" viewBox="0 0 24 24" fill="none">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
            </svg>
          } @else {
            <svg class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4"/>
            </svg>
          }
          Increment patch
        </button>
      </div>

      <!-- Feedback message -->
      @if (feedbackMsg()) {
        <div class="rounded-md px-3 py-2 text-xs"
             [class]="feedbackKind() === 'ok'
               ? 'bg-[#1a3a2a] border border-[#2a5a3a] text-[#6bcf9a]'
               : 'bg-[#3a1a1a] border border-[#5a2a2a] text-[#cf6b6b]'">
          {{ feedbackMsg() }}
        </div>
      }
    </div>
  `,
})
export class VersionPanelComponent implements OnChanges {

  @Input({ required: true }) version!: VersionRecord;

  @Output() versionSet = new EventEmitter<{ artifactName: string; nextVersion: string }>();
  @Output() versionIncremented = new EventEmitter<{ artifactName: string }>();

  readonly draftVersion = signal<string>('');
  readonly saving = signal(false);
  readonly incrementing = signal(false);
  readonly feedbackMsg = signal<string | null>(null);
  readonly feedbackKind = signal<'ok' | 'err'>('ok');

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['version']) {
      this.draftVersion.set(this.version.nextVersion ?? '');
    }
  }

  onSave(): void {
    const next = this.draftVersion().trim();
    if (!next) return;
    this.saving.set(true);
    this.clearFeedback();
    this.versionSet.emit({ artifactName: this.version.artifactName, nextVersion: next });
    setTimeout(() => {
      this.saving.set(false);
      this.showFeedback('ok', `Saved → ${next}`);
    }, 300);
  }

  onIncrement(): void {
    this.incrementing.set(true);
    this.clearFeedback();
    this.versionIncremented.emit({ artifactName: this.version.artifactName });
    setTimeout(() => {
      this.incrementing.set(false);
      this.showFeedback('ok', 'Patch incremented');
    }, 300);
  }

  private showFeedback(kind: 'ok' | 'err', msg: string): void {
    this.feedbackKind.set(kind);
    this.feedbackMsg.set(msg);
    setTimeout(() => this.feedbackMsg.set(null), 3000);
  }

  private clearFeedback(): void {
    this.feedbackMsg.set(null);
  }
}
