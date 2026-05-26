import { Injectable, signal, computed } from "@angular/core";
import {
  ACTION_BOARD_ROUTE,
  ACTION_BOARD_STANDALONE_ROUTE,
  buildActionBoardLegacyRedirect,
} from "../app/views/dynamic-view/dynamic-view.constants";

export type ViewId = "home" | "artifacts" | "dynamic-view" | "detail" | "settings";

export type DetailTab = "overview" | "versions" | "actions" | "tree" | "logs";

export interface NavState {
  view: ViewId;
  artifactId: string | null;
  detailTab: DetailTab;
  dynamicViewStandalone: boolean;
}

const VALID_TABS: DetailTab[] = ["overview", "versions", "actions", "tree", "logs"];

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
      artifactId: view === "dynamic-view" ? artifactId ?? null : artifactId ?? s.artifactId,
      detailTab: "overview",
      dynamicViewStandalone: false,
    }));
    this.syncPath();
  }

  openArtifactDetail(artifactId: string, tab: DetailTab = "overview"): void {
    this.state.set({ view: "detail", artifactId, detailTab: tab, dynamicViewStandalone: false });
    this.syncPath();
  }

  openDynamicView(options: { artifactId?: string | null; standalone?: boolean; replace?: boolean } = {}): void {
    this.state.set({
      view: "dynamic-view",
      artifactId: options.artifactId ?? null,
      detailTab: "overview",
      dynamicViewStandalone: options.standalone ?? false,
    });
    this.syncPath(options.replace ?? false);
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
    } else if (s.view === "dynamic-view") {
      path = s.dynamicViewStandalone ? ACTION_BOARD_STANDALONE_ROUTE : ACTION_BOARD_ROUTE;
      if (s.artifactId) {
        path += `?artifactId=${encodeURIComponent(s.artifactId)}`;
      }
    } else if (s.view === "settings") {
      path = "/settings";
    } else if (s.view === "artifacts") {
      path = "/artifacts";
    }
    const current = `${location.pathname}${location.search}`;
    if (current !== path) {
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
    const legacyRedirect = buildActionBoardLegacyRedirect(location.pathname, location.search);

    if (legacyRedirect) {
      const params = new URLSearchParams(legacyRedirect.split("?")[1] ?? "");
      const targetParts = legacyRedirect.split("?")[0]?.replace(/^\/+/, "").split("/").filter(Boolean) ?? [];
      history.replaceState(null, "", legacyRedirect);
      this.state.set({
        view: "dynamic-view",
        artifactId: params.get("artifactId"),
        detailTab: "overview",
        dynamicViewStandalone: targetParts[1] === "standalone",
      });
    } else if (parts[0] === "action-board") {
      const scope = new URLSearchParams(location.search);
      this.state.set({
        view: "dynamic-view",
        artifactId: scope.get("artifactId"),
        detailTab: "overview",
        dynamicViewStandalone: parts[1] === "standalone",
      });
    } else if (parts[0] === "artifact" && parts[1]) {
      const artifactId = decodeURIComponent(parts[1]);
      const tab = (VALID_TABS.includes(parts[2] as DetailTab)
        ? parts[2]
        : "overview") as DetailTab;
      this.state.set({
        view: "detail",
        artifactId,
        detailTab: tab,
        dynamicViewStandalone: false,
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
