import { Component, inject, signal, computed } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { DaemonService, RepoRecord } from "../services/daemon.service";
import { NavService } from "../services/nav.service";

type SortKey = "name" | "path" | "status";

@Component({
  selector: "eh-artifacts-list",
  standalone: true,
  imports: [FormsModule],
  templateUrl: './artifacts-list.component.html',
  styleUrl: './artifacts-list.component.css',
})
export class ArtifactsListComponent {
  readonly daemon = inject(DaemonService);
  readonly nav = inject(NavService);

  searchQuery = "";
  readonly sortKey = signal<SortKey>("name");

  readonly sortOptions: { key: SortKey; label: string }[] = [
    { key: "name", label: "Name" },
    { key: "path", label: "Path" },
    { key: "status", label: "Status" },
  ];

  readonly filteredRepos = computed(() => {
    const q = this.searchQuery.toLowerCase();
    const repos = this.daemon.repos();
    let filtered = q
      ? repos.filter(
          (r) =>
            r.name.toLowerCase().includes(q) ||
            r.path.toLowerCase().includes(q) ||
            r.id.toLowerCase().includes(q)
        )
      : repos;

    const key = this.sortKey();
    return [...filtered].sort((a, b) => {
      if (key === "name") return a.name.localeCompare(b.name);
      if (key === "path") return a.path.localeCompare(b.path);
      if (key === "status") {
        const activePath = this.daemon.activeRepoPath();
        return (activePath === b.path ? 1 : 0) - (activePath === a.path ? 1 : 0);
      }
      return 0;
    });
  });

  openDetail(repo: RepoRecord): void {
    this.nav.openArtifactDetail(repo.id);
  }

  useRepo(repo: RepoRecord): void {
    this.daemon.setActiveRepo(repo.path);
    this.daemon.addNotification("info", "Context switched", `Now using ${repo.name}`);
  }

  copyPath(repo: RepoRecord): void {
    void navigator.clipboard.writeText(repo.path);
  }
}
