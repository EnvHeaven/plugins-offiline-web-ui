import { bootstrapApplication } from "@angular/platform-browser";
import { AppComponent } from "./app.component";
import { provideAppEnvironmentInfo } from "@jovdk-web/core/environment/app-environment.token";

// Splash controller injected by index.html — safe to call even if missing
const splash = (window as unknown as Record<string, unknown>)["__ehSplash"] as {
  progress: (pct: number) => void;
  status:   (msg: string) => void;
  log:      (kind: "info" | "ok" | "err", msg: string) => void;
  complete: () => void;
  error:    (msg: string) => void;
} | undefined;

function splashProgress(pct: number, msg?: string): void {
  splash?.progress(pct);
  if (msg) splash?.status(msg);
}

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
  splash?.log("err", `Uncaught error: ${String(e.error ?? e.message)}`);
});

window.addEventListener("unhandledrejection", (e) => {
  console.error("[EnvHeaven] Unhandled rejection:", e.reason);
  splash?.log("err", `Unhandled rejection: ${String(e.reason)}`);
});

splashProgress(40, "Bootstrapping Angular…");

void bootstrapApplication(AppComponent, {
  providers: [
    provideAppEnvironmentInfo({
      appVersion: "2.0.0",
      environmentName: "offline",
      isProduction: false,
    }),
  ],
}).then(() => {
  splashProgress(90, "Angular ready…");
  splash?.log("ok", "AppComponent mounted");
  splash?.complete();
}).catch((error: unknown) => {
  const msg = error instanceof Error ? error.message : String(error);
  const stack = error instanceof Error ? (error.stack ?? "") : "";
  console.error("[EnvHeaven] Bootstrap failed:", error);
  splash?.error(msg);
  showFatalError(msg, stack);
});
