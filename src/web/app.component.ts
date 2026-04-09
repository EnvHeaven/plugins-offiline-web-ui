import { Component, inject, signal, computed, OnInit, OnDestroy } from "@angular/core";
import { environment } from "./environments/environment";
import { DaemonService } from "./services/daemon.service";
import { NavService, ViewId } from "./services/nav.service";
import { HomeComponent } from "./views/home.component";
import { ArtifactsListComponent } from "./views/artifacts-list.component";
import { ArtifactDetailComponent } from "./views/artifact-detail.component";
import { SettingsComponent } from "./views/settings.component";

@Component({
  selector: "app-root",
  standalone: true,
  imports: [
    HomeComponent,
    ArtifactsListComponent,
    ArtifactDetailComponent,
    SettingsComponent,
  ],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css',
})
export class AppComponent implements OnInit, OnDestroy {
  readonly daemon = inject(DaemonService);
  readonly nav = inject(NavService);

  readonly uiVersion = environment.uiVersion;

  readonly showContextDropdown = signal(false);
  readonly showNotifications = signal(false);

  readonly contextLabel = computed(() => {
    const selected = this.daemon.selectedRepo();
    if (selected) return selected.name;
    const repos = this.daemon.repos();
    if (repos.length > 0) return `${repos.length} artifact${repos.length > 1 ? "s" : ""}`;
    return "No context";
  });

  readonly breadcrumb = computed<string>(() => {
    const view = this.nav.currentView();
    if (view === "artifacts") return "All Artifacts";
    if (view === "settings") return "Settings";
    if (view === "detail") {
      const id = this.nav.selectedArtifactId();
      const repo = this.daemon.repos().find((r) => r.id === id);
      return repo?.name ?? "Artifact";
    }
    return "";
  });

  readonly recentRepos = computed(() => this.daemon.repos().slice(0, 5));

  readonly navItems: { id: ViewId; label: string; icon: string }[] = [
    {
      id: "home",
      label: "Home",
      icon: `<svg fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5" class="w-4 h-4"><path stroke-linecap="round" stroke-linejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"/></svg>`,
    },
    {
      id: "artifacts",
      label: "All Artifacts",
      icon: `<svg fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5" class="w-4 h-4"><path stroke-linecap="round" stroke-linejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"/></svg>`,
    },
    {
      id: "settings",
      label: "Settings",
      icon: `<svg fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5" class="w-4 h-4"><path stroke-linecap="round" stroke-linejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/><circle cx="12" cy="12" r="3"/></svg>`,
    },
  ];

  ngOnInit(): void {
    // polling is started in DaemonService constructor
  }

  ngOnDestroy(): void {
    this.daemon.stopPolling();
  }

  navigate(view: ViewId): void {
    this.nav.navigate(view);
  }

  openArtifact(id: string): void {
    this.nav.openArtifactDetail(id);
  }

  switchContext(id: string): void {
    this.showContextDropdown.set(false);
    const repo = this.daemon.repos().find((r) => r.id === id);
    if (repo && this.daemon.activeRepoPath() !== repo.path) {
      this.daemon.setActiveRepo(repo.path);
      this.daemon.addNotification("info", "Context switched", `Now using ${repo.name}`);
    }
    this.nav.openArtifactDetail(id);
  }

  formatNotifTime(d: Date): string {
    const diff = Date.now() - d.getTime();
    if (diff < 60_000) return "just now";
    if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
    return d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
  }
}
