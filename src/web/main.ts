import { bootstrapApplication } from "@angular/platform-browser";
import { AppComponent } from "./app.component";
import { provideAppEnvironmentInfo } from "@jovdk-web/core/environment/app-environment.token";

void bootstrapApplication(AppComponent, {
  providers: [
    provideAppEnvironmentInfo({
      appVersion: "2.0.0",
      environmentName: "offline",
      isProduction: false,
    }),
  ],
}).catch((error: unknown) => {
  console.error("[EnvHeaven] Bootstrap failed:", error);
});
