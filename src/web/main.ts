import { bootstrapApplication } from "@angular/platform-browser";
import { provideAppEnvironmentInfo } from "@jovdk-web/core/environment/app-environment.token";
import { AppComponent } from "./app.component";

void bootstrapApplication(AppComponent, {
  providers: [
    provideAppEnvironmentInfo({
      appVersion: "2.0.0",
      environmentName: "offline",
      isProduction: false,
      isLocal: true,
    }),
  ],
}).catch((error) => {
  console.error(error);
});
