import { NgIf } from "@angular/common";
import { Component, inject } from "@angular/core";
import { APP_ENVIRONMENT_INFO } from "@jovdk-web/core/environment/app-environment.token";

@Component({
  selector: "app-version-panel",
  standalone: true,
  imports: [NgIf],
  template: `
    <div class="pointer-events-none fixed bottom-2 right-3 flex flex-col overflow-hidden text-center">
      <span *ngIf="!isProduction" class="text-xs uppercase tracking-[0.22em] text-red-300/65">
        {{ environmentName }}
      </span>
      <span class="text-xs text-white/35">
        v{{ appVersion }}
      </span>
    </div>
  `,
})
export class AppVersionPanelComponent {
  private readonly environmentInfo = inject(APP_ENVIRONMENT_INFO, { optional: true }) ?? {
    appVersion: "0.0.0",
    environmentName: "unknown",
    isProduction: false,
  };

  readonly appVersion = this.environmentInfo.appVersion;
  readonly environmentName = this.environmentInfo.environmentName;
  readonly isProduction = this.environmentInfo.isProduction ?? false;
}
