import { bootstrapApplication } from "@angular/platform-browser";
import { AppComponent } from "./app.component";
import { provideAppEnvironmentInfo } from "@jovdk-web/core/environment/app-environment.token";

function showFatalError(message: string, detail: string): void {
  const div = document.createElement("div");
  div.style.cssText = [
    "position:fixed", "inset:0", "z-index:9999",
    "background:#0f0f14", "color:#f5f5f5", "font-family:monospace",
    "padding:2rem", "overflow:auto", "white-space:pre-wrap",
  ].join(";");
  div.innerHTML = `<b style="color:#f87171;font-size:1.1rem">EnvHeaven — Bootstrap Error</b>\n\n${message}\n\n<span style="color:#94a3b8">${detail}</span>`;
  document.body.appendChild(div);
}

window.addEventListener("error", (e) => {
  console.error("[EnvHeaven] Uncaught error:", e.error ?? e.message);
});

window.addEventListener("unhandledrejection", (e) => {
  console.error("[EnvHeaven] Unhandled rejection:", e.reason);
});

void bootstrapApplication(AppComponent, {
  providers: [
    provideAppEnvironmentInfo({
      appVersion: "2.0.0",
      environmentName: "offline",
      isProduction: false,
    }),
  ],
}).catch((error: unknown) => {
  const msg = error instanceof Error ? error.message : String(error);
  const stack = error instanceof Error ? (error.stack ?? "") : "";
  console.error("[EnvHeaven] Bootstrap failed:", error);
  showFatalError(msg, stack);
});
