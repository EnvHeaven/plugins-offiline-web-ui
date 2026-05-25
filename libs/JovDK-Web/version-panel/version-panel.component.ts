import { Component, Input, Output, EventEmitter, signal, OnChanges, SimpleChanges } from '@angular/core';
import { FormsModule } from '@angular/forms';

export type IncrementTrack = 'patch' | 'minor' | 'exp';
export type VersionPersistedTrack = 'exp' | 'canary' | 'alpha' | 'beta' | 'rc' | 'release';

export interface VersionTrackState {
  lastVersion?: string;
  nextVersion?: string;
  updatedAt?: string;
}

export interface VersionRecord {
  artifactName: string;
  packageName: string;
  lastVersion: string | null;
  nextVersion: string | null;
  displayTrack?: VersionPersistedTrack;
  tracks?: Partial<Record<VersionPersistedTrack, VersionTrackState>>;
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
  @Input() selectedTrack?: VersionPersistedTrack;

  @Output() versionSet = new EventEmitter<{ artifactName: string; packageName: string; track: VersionPersistedTrack; nextVersion: string }>();
  @Output() versionIncremented = new EventEmitter<{ artifactName: string; packageName: string; track: IncrementTrack }>();
  @Output() versionTrackSelected = new EventEmitter<{ artifactName: string; packageName: string; track: VersionPersistedTrack }>();

  readonly versionTracks: VersionPersistedTrack[] = ['exp', 'canary', 'alpha', 'beta', 'rc', 'release'];
  readonly draftVersion = signal<string>('');
  readonly activeVersionTrack = signal<VersionPersistedTrack>('release');
  readonly saving = signal(false);
  readonly incrementing = signal(false);
  readonly activeTrack = signal<IncrementTrack | null>(null);
  readonly feedbackMsg = signal<string | null>(null);
  readonly feedbackKind = signal<'ok' | 'err'>('ok');

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['version'] || changes['selectedTrack']) {
      const nextTrack = this.selectedTrack ?? this.version.displayTrack ?? this.preferredTrack();
      this.activeVersionTrack.set(nextTrack);
      this.draftVersion.set(this.trackState(nextTrack).nextVersion ?? '');
    }
  }

  selectTrack(track: VersionPersistedTrack): void {
    this.activeVersionTrack.set(track);
    this.draftVersion.set(this.trackState(track).nextVersion ?? '');
    this.versionTrackSelected.emit({ artifactName: this.version.artifactName, packageName: this.version.packageName, track });
  }

  trackState(track: VersionPersistedTrack): VersionTrackState {
    if (track === 'release') {
      if (this.version.tracks) {
        return this.version.tracks.release ?? {};
      }
      return {
        lastVersion: this.version.lastVersion ?? undefined,
        nextVersion: this.version.nextVersion ?? undefined,
      };
    }
    return this.version.tracks?.[track] ?? {};
  }

  activeTrackLabel(): string {
    const labels: Record<VersionPersistedTrack, string> = {
      exp: 'Experimental',
      canary: 'Canary',
      alpha: 'Alpha',
      beta: 'Beta',
      rc: 'Release Candidate',
      release: 'Release',
    };
    return labels[this.activeVersionTrack()];
  }

  onSave(): void {
    const next = this.draftVersion().trim();
    if (!next) return;
    this.saving.set(true);
    this.clearFeedback();
    this.versionSet.emit({
      artifactName: this.version.artifactName,
      packageName: this.version.packageName,
      track: this.activeVersionTrack(),
      nextVersion: next,
    });
    setTimeout(() => {
      this.saving.set(false);
      this.showFeedback('ok', `Saved → ${next}`);
    }, 300);
  }

  onIncrement(track: IncrementTrack = 'patch'): void {
    this.incrementing.set(true);
    this.activeTrack.set(track);
    this.activeVersionTrack.set(track === 'exp' ? 'exp' : 'release');
    this.clearFeedback();
    this.versionIncremented.emit({ artifactName: this.version.artifactName, packageName: this.version.packageName, track });
    setTimeout(() => {
      this.incrementing.set(false);
      this.activeTrack.set(null);
      const labels: Record<IncrementTrack, string> = { patch: 'Patch', minor: 'Minor', exp: 'Exp' };
      this.showFeedback('ok', `${labels[track]} incremented`);
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

  private preferredTrack(): VersionPersistedTrack {
    if (this.version.tracks?.exp?.nextVersion || this.version.tracks?.exp?.lastVersion) {
      return 'exp';
    }
    for (const track of this.versionTracks) {
      if (this.version.tracks?.[track]?.nextVersion || this.version.tracks?.[track]?.lastVersion) {
        return track;
      }
    }
    return 'release';
  }
}
