import { Injectable, signal, computed } from "@angular/core";

export type ViewId = "home" | "artifacts" | "detail" | "settings";

export interface NavState {
  view: ViewId;
  artifactId: string | null;
  detailTab: "overview" | "versions" | "actions" | "tree" | "logs";
}

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

  navigate(view: ViewId, artifactId?: string): void {
    this.state.update((s) => ({
      ...s,
      view,
      artifactId: artifactId ?? s.artifactId,
      detailTab: "overview",
    }));
  }

  openArtifactDetail(artifactId: string, tab: NavState["detailTab"] = "overview"): void {
    this.state.set({ view: "detail", artifactId, detailTab: tab });
  }

  setDetailTab(tab: NavState["detailTab"]): void {
    this.state.update((s) => ({ ...s, detailTab: tab }));
  }

  goBack(): void {
    this.state.update((s) => ({ ...s, view: "artifacts", artifactId: null }));
  }
}
