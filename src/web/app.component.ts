import { CommonModule } from "@angular/common";
import { Component, OnInit, signal } from "@angular/core";
import { FormsModule } from "@angular/forms";

interface DaemonStatus {
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

interface RepoRecord {
  id: string;
  path: string;
  selected?: boolean;
}

interface VersionRecord {
  artifactName: string;
  packageName: string;
  lastVersion: string | null;
  nextVersion: string | null;
}

@Component({
  selector: "app-root",
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <main class="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(110,231,183,0.20),_transparent_34%),linear-gradient(180deg,_#050816_0%,_#09111f_55%,_#0b1324_100%)] text-sand-100">
      <section class="mx-auto flex min-h-screen w-full max-w-7xl flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8">
        <header class="rounded-[2rem] border border-white/10 bg-white/5 p-6 shadow-glow backdrop-blur">
          <div class="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p class="text-xs uppercase tracking-[0.35em] text-moss-300/80">EnvHeaven</p>
              <h1 class="mt-2 text-3xl font-semibold tracking-tight text-white sm:text-4xl">Offiline Web UI</h1>
              <p class="mt-3 max-w-2xl text-sm leading-6 text-sand-200">
                Review daemon state, choose a repo, and edit artifact versions without leaving the local machine.
              </p>
            </div>
            <div class="rounded-2xl border border-moss-400/20 bg-ink-950/70 px-4 py-3 text-sm text-sand-200">
              <div class="font-medium text-white">Daemon</div>
              <div>{{ statusError() ?? statusMessage() }}</div>
            </div>
          </div>
        </header>

        <div class="grid gap-6 xl:grid-cols-[1.1fr_1.4fr]">
          <section class="space-y-6">
            <article class="rounded-[1.75rem] border border-white/10 bg-ink-950/70 p-5 shadow-glow">
              <div class="flex items-center justify-between gap-3">
                <h2 class="text-lg font-semibold text-white">Known repos</h2>
                <button class="rounded-full border border-moss-400/30 px-3 py-1 text-xs uppercase tracking-[0.25em] text-moss-300 transition hover:bg-moss-400/10" (click)="refreshAll()">
                  Refresh
                </button>
              </div>
              <div class="mt-4 space-y-3">
                <button
                  *ngFor="let repo of repos()"
                  class="w-full rounded-2xl border px-4 py-3 text-left transition"
                  [class.border-moss-400/60]="repo.selected"
                  [class.bg-moss-400/10]="repo.selected"
                  [class.border-white/10]="!repo.selected"
                  [class.bg-white/5]="!repo.selected"
                  (click)="selectRepo(repo)"
                >
                  <div class="flex items-center justify-between gap-4">
                    <div class="min-w-0">
                      <div class="truncate text-sm font-medium text-white">{{ repo.path }}</div>
                      <div class="text-xs text-sand-200">{{ repo.id }}</div>
                    </div>
                    <span class="rounded-full px-2 py-1 text-[11px] uppercase tracking-[0.2em]" [class.bg-moss-400]="repo.selected" [class.text-ink-950]="repo.selected" [class.bg-white/10]="!repo.selected">
                      {{ repo.selected ? "Selected" : "Use" }}
                    </span>
                  </div>
                </button>
                <p *ngIf="repos().length === 0" class="text-sm text-sand-200">No repos have been selected yet.</p>
              </div>
            </article>

            <article class="rounded-[1.75rem] border border-white/10 bg-ink-950/70 p-5 shadow-glow">
              <h2 class="text-lg font-semibold text-white">Capabilities</h2>
              <div class="mt-4 grid gap-3 sm:grid-cols-2">
                <div *ngFor="let item of capabilities" class="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <div class="text-sm font-medium text-white">{{ item.title }}</div>
                  <div class="mt-1 text-sm text-sand-200">{{ item.description }}</div>
                </div>
              </div>
            </article>
          </section>

          <section class="space-y-6">
            <article class="rounded-[1.75rem] border border-white/10 bg-ink-950/70 p-5 shadow-glow">
              <div class="flex items-center justify-between gap-3">
                <h2 class="text-lg font-semibold text-white">Artifact versions</h2>
                <button class="rounded-full border border-moss-400/30 px-3 py-1 text-xs uppercase tracking-[0.25em] text-moss-300 transition hover:bg-moss-400/10" (click)="refreshVersions()">
                  Reload
                </button>
              </div>

              <div class="mt-4 space-y-4">
                <div
                  *ngFor="let version of versions()"
                  class="rounded-2xl border border-white/10 bg-white/5 p-4"
                >
                  <div class="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                      <div class="text-sm font-medium text-white">{{ version.artifactName }}</div>
                      <div class="text-xs text-sand-200">{{ version.packageName }}</div>
                    </div>
                    <div class="text-xs uppercase tracking-[0.2em] text-moss-300">Registry</div>
                  </div>

                  <div class="mt-4 grid gap-3 md:grid-cols-2">
                    <label class="space-y-2">
                      <span class="text-xs uppercase tracking-[0.25em] text-sand-200">Last version</span>
                      <input
                        class="w-full rounded-xl border border-white/10 bg-ink-900 px-3 py-2 text-sm text-white outline-none transition focus:border-moss-400/50"
                        [value]="version.lastVersion ?? ''"
                        disabled
                      />
                    </label>
                    <label class="space-y-2">
                      <span class="text-xs uppercase tracking-[0.25em] text-sand-200">Next version</span>
                      <input
                        class="w-full rounded-xl border border-white/10 bg-ink-900 px-3 py-2 text-sm text-white outline-none transition focus:border-moss-400/50"
                        [(ngModel)]="version.nextVersion"
                        placeholder="1.0.1"
                      />
                    </label>
                  </div>

                  <div class="mt-4 flex flex-wrap gap-3">
                    <button class="rounded-full bg-moss-400 px-4 py-2 text-sm font-medium text-ink-950 transition hover:bg-moss-300" (click)="saveVersion(version)">
                      Save next version
                    </button>
                    <button class="rounded-full border border-white/15 px-4 py-2 text-sm font-medium text-white transition hover:bg-white/10" (click)="incrementVersion(version)">
                      Increment patch
                    </button>
                  </div>
                </div>

                <p *ngIf="versions().length === 0" class="text-sm text-sand-200">
                  Select a repo to load its artifact registry.
                </p>
              </div>
            </article>
          </section>
        </div>
      </section>
    </main>
  `,
})
export class AppComponent implements OnInit {
  readonly status = signal<DaemonStatus | null>(null);
  readonly statusMessage = signal("Daemon connecting...");
  readonly statusError = signal<string | null>(null);
  readonly repos = signal<RepoRecord[]>([]);
  readonly versions = signal<VersionRecord[]>([]);
  readonly capabilities = [
    { title: "Repo discovery", description: "Lists known env-repos and remembers the active one." },
    { title: "Version registry", description: "Edits next versions locally without touching package.json." },
    { title: "Deploy support", description: "Feeds the daemon before local or production publishing." },
    { title: "Offline persistence", description: "Uses daemon-backed disk storage for state restoration." },
  ];

  async ngOnInit(): Promise<void> {
    await this.refreshAll();
  }

  async refreshAll(): Promise<void> {
    await Promise.all([this.refreshStatus(), this.refreshRepos(), this.refreshVersions()]);
  }

  async refreshStatus(): Promise<void> {
    try {
      const payload = await readJson<DaemonStatus>("/api/status");
      this.status.set(payload);
      this.statusError.set(null);

      const port = payload.daemon?.port;
      const repoRoot = payload.selectedRepo?.repoRoot ?? payload.daemon?.repoRoot ?? null;
      const summaryParts = [
        payload.ok ? `Connected on 127.0.0.1:${String(port ?? "unknown")}` : "Daemon unavailable",
        repoRoot ? `Repo: ${repoRoot}` : null,
      ].filter((value): value is string => Boolean(value));

      this.statusMessage.set(summaryParts.join(" • "));
    } catch (error) {
      this.status.set(null);
      this.statusMessage.set("Daemon connecting...");
      this.statusError.set(error instanceof Error ? error.message : "Unable to reach the daemon.");
    }
  }

  async refreshRepos(): Promise<void> {
    const payload = await readJson<{
      selectedRepoId?: string | null;
      repos?: Array<{ repoId: string; repoRoot: string }>;
    }>("/api/repos");

    this.repos.set(
      (payload.repos ?? []).map((repo) => ({
        id: repo.repoId,
        path: repo.repoRoot,
        selected: repo.repoId === (payload.selectedRepoId ?? null),
      })),
    );
  }

  async refreshVersions(): Promise<void> {
    const payload = await readJson<{ versions: VersionRecord[] }>("/api/versions");
    this.versions.set(payload.versions ?? []);
  }

  async selectRepo(repo: RepoRecord): Promise<void> {
    await postJson("/api/repos/select", { repoRoot: repo.path });
    await this.refreshAll();
  }

  async saveVersion(version: VersionRecord): Promise<void> {
    await postJson("/api/versions/set", {
      artifactName: version.artifactName,
      nextVersion: version.nextVersion,
    });
    await this.refreshVersions();
  }

  async incrementVersion(version: VersionRecord): Promise<void> {
    const nextVersion = incrementPatch(version.nextVersion ?? version.lastVersion ?? "0.1.0");
    version.nextVersion = nextVersion;
    await this.saveVersion(version);
  }
}

async function readJson<T>(url: string): Promise<T> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Request failed for ${url}: ${response.status}`);
  }

  return (await response.json()) as T;
}

async function postJson(url: string, body: unknown): Promise<void> {
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    throw new Error(`Request failed for ${url}: ${response.status}`);
  }
}

function incrementPatch(version: string): string {
  const parsed = version.trim().match(/^(\d+)\.(\d+)\.(\d+)(?:[-+].*)?$/);
  if (!parsed) {
    return version;
  }

  const major = Number.parseInt(parsed[1] ?? "0", 10);
  const minor = Number.parseInt(parsed[2] ?? "0", 10);
  const patch = Number.parseInt(parsed[3] ?? "0", 10);
  return `${major}.${minor}.${patch + 1}`;
}
