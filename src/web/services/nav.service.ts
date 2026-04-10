import { Injectable, signal, computed } from "@angular/core";

export type ViewId = "home" | "artifacts" | "detail" | "settings";

export interface NavState {
  view: ViewId;
  artifactId: string | null;
  detailTab: "overview" | "versions" | "actions" | "tree" | "logs";
}

const VALID_TABS: NavState["detailTab"][] = ["overview", "versions", "actions", "tree", "logs"];

@Injectable({ providedIn: "root" })
export class NavService {
  private readonly state = signal<NavState>({
    view: "home",
    artifactId: null,
    detailTab: "overview",
  });

  readonly currentView = computed(() => this.state().view);
  readonly selectedArtifactId = computed(() => this.state().artifactId);
  readonly activeDetailTab = computed(() => this.state().detailTab);

  constructor() {
    this.restoreFromPath();
    window.addEventListener("popstate", () => this.restoreFromPath());
  }

  navigate(view: ViewId, artifactId?: string): void {
    this.state.update((s) => ({
      ...s,
      view,
      artifactId: artifactId ?? s.artifactId,
      detailTab: "overview",
    }));
    this.syncPath();
  }

  openArtifactDetail(artifactId: string, tab: NavState["detailTab"] = "overview"): void {
    this.state.set({ view: "detail", artifactId, detailTab: tab });
    this.syncPath();
  }

  setDetailTab(tab: NavState["detailTab"]): void {
    this.state.update((s) => ({ ...s, detailTab: tab }));
    this.syncPath(true);
  }

  goBack(): void {
    this.state.update((s) => ({ ...s, view: "artifacts", artifactId: null }));
    this.syncPath();
  }

  private syncPath(replace = false): void {
    const s = this.state();
    let path = "/";
    if (s.view === "detail" && s.artifactId) {
      path = `/artifact/${encodeURIComponent(s.artifactId)}/${s.detailTab}`;
    } else if (s.view === "settings") {
      path = "/settings";
    } else if (s.view === "artifacts") {
      path = "/artifacts";
    }
    if (location.pathname !== path) {
      if (replace) {
        history.replaceState(null, "", path);
      } else {
        history.pushState(null, "", path);
      }
    }
  }

  private restoreFromPath(): void {
    const raw = location.pathname.replace(/^\/+/, "");
    if (!raw) return;

    const parts = raw.split("/").filter(Boolean);

    if (parts[0] === "artifact" && parts[1]) {
      const artifactId = decodeURIComponent(parts[1]);
      const tab = (VALID_TABS.includes(parts[2] as NavState["detailTab"])
        ? parts[2]
        : "overview") as NavState["detailTab"];
      this.state.set({ view: "detail", artifactId, detailTab: tab });
    } else if (parts[0] === "settings") {
      this.state.set({ view: "settings", artifactId: null, detailTab: "overview" });
    } else if (parts[0] === "artifacts") {
      this.state.set({ view: "artifacts", artifactId: null, detailTab: "overview" });
    }
  }
}
