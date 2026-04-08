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
  templateUrl: './version-panel.component.html',
  styleUrl: './version-panel.component.css',
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
