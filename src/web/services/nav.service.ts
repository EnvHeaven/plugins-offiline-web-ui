import { Injectable, signal, computed } from "@angular/core";

export type ViewId = "home" | "artifacts" | "detail" | "settings";

export type DetailTab = "overview" | "versions" | "actions" | "tree" | "logs" | "dynamic-view";

export interface NavState {
  view: ViewId;
  artifactId: string | null;
  detailTab: DetailTab;
  dynamicViewStandalone: boolean;
}

const VALID_TABS: DetailTab[] = ["overview", "versions", "actions", "tree", "logs", "dynamic-view"];

@Injectable({ providedIn: "root" })
export class NavService {
  private readonly state = signal<NavState>({
    view: "home",
    artifactId: null,
    detailTab: "overview",
    dynamicViewStandalone: false,
  });

  readonly currentView = computed(() => this.state().view);
  readonly selectedArtifactId = computed(() => this.state().artifactId);
  readonly activeDetailTab = computed(() => this.state().detailTab);
  readonly isDynamicViewStandalone = computed(() => this.state().dynamicViewStandalone);

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
      dynamicViewStandalone: false,
    }));
    this.syncPath();
  }

  openArtifactDetail(artifactId: string, tab: DetailTab = "overview", standalone = false): void {
    this.state.set({ view: "detail", artifactId, detailTab: tab, dynamicViewStandalone: standalone && tab === "dynamic-view" });
    this.syncPath();
  }

  setDetailTab(tab: DetailTab): void {
    this.state.update((s) => ({ ...s, detailTab: tab, dynamicViewStandalone: false }));
    this.syncPath(true);
  }

  setActiveDetailTab(tab: DetailTab): void {
    this.setDetailTab(tab);
  }

  goBack(): void {
    this.state.update((s) => ({ ...s, view: "artifacts", artifactId: null, dynamicViewStandalone: false }));
    this.syncPath();
  }

  private syncPath(replace = false): void {
    const s = this.state();
    let path = "/";
    if (s.view === "detail" && s.artifactId) {
      path = `/artifact/${encodeURIComponent(s.artifactId)}/${s.detailTab}`;
      if (s.detailTab === "dynamic-view" && s.dynamicViewStandalone) {
        path += "/standalone";
      }
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
    const parts = raw.split("/").filter(Boolean);

    if (parts[0] === "artifact" && parts[1]) {
      const artifactId = decodeURIComponent(parts[1]);
      const tab = (VALID_TABS.includes(parts[2] as DetailTab)
        ? parts[2]
        : "overview") as DetailTab;
      this.state.set({
        view: "detail",
        artifactId,
        detailTab: tab,
        dynamicViewStandalone: tab === "dynamic-view" && parts[3] === "standalone",
      });
    } else if (parts[0] === "settings") {
      this.state.set({ view: "settings", artifactId: null, detailTab: "overview", dynamicViewStandalone: false });
    } else if (parts[0] === "artifacts") {
      this.state.set({ view: "artifacts", artifactId: null, detailTab: "overview", dynamicViewStandalone: false });
    } else {
      this.state.set({ view: "home", artifactId: null, detailTab: "overview", dynamicViewStandalone: false });
    }
  }
}
