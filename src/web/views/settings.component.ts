import { Component, inject, signal } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { DaemonService } from "../services/daemon.service";

type SettingsSection = "repo" | "org" | "team" | "user";

interface MetaField {
  key: string;
  label: string;
  placeholder: string;
  value: string;
  hint?: string;
}

@Component({
  selector: "eh-settings",
  standalone: true,
  imports: [FormsModule],
  template: `
    <div class="flex flex-col h-full overflow-hidden animate-[fadeIn_0.2s_ease-out]">

      <!-- Header -->
      <div class="px-8 pt-8 pb-6 flex-shrink-0">
        <h1 class="text-2xl font-semibold text-tx-primary tracking-tight">Settings</h1>
        <p class="text-tx-secondary text-sm mt-1">Configure metadata layers for your workspace, organization, team, and account.</p>
      </div>

      <!-- Section tabs -->
      <div class="px-8 flex-shrink-0 border-b border-border-subtle">
        <div class="flex items-end gap-0">
          @for (section of sections; track section.id) {
            <button class="relative px-4 py-2.5 text-sm transition-colors"
                    [class]="activeSection() === section.id
                      ? 'text-tx-primary font-medium tab-active'
                      : 'text-tx-secondary hover:text-tx-primary'"
                    (click)="activeSection.set(section.id)">
              {{ section.label }}
            </button>
          }
        </div>
      </div>

      <!-- Section content -->
      <div class="flex-1 overflow-y-auto px-8 py-6">

        <!-- REPO METADATA -->
        @if (activeSection() === 'repo') {
          <div class="animate-[fadeIn_0.15s_ease-out] space-y-6">
            <div class="flex items-center justify-between">
              <div>
                <h2 class="text-sm font-semibold text-tx-primary">Repo Metadata Layer</h2>
                <p class="text-xs text-tx-muted mt-0.5">Fields tied to the current env-repo. Stored on disk by the daemon.</p>
              </div>
              <div class="flex items-center gap-1.5 text-xs text-tx-muted">
                <span class="w-1.5 h-1.5 rounded-full"
                      [class]="daemon.selectedRepo() ? 'bg-accent status-pulse' : 'bg-tx-muted'"></span>
                {{ daemon.selectedRepo()?.name ?? 'No repo selected' }}
              </div>
            </div>
            <div class="rounded-lg border border-border-default bg-bg-surface overflow-hidden">
              <div class="divide-y divide-border-subtle">
                @for (field of repoFields; track field.key) {
                  <div class="px-5 py-4 grid grid-cols-[1fr_2fr] gap-6 items-start">
                    <div>
                      <label class="text-sm font-medium text-tx-primary block mb-0.5">{{ field.label }}</label>
                      @if (field.hint) {
                        <p class="text-xs text-tx-muted leading-relaxed">{{ field.hint }}</p>
                      }
                    </div>
                    <input class="w-full bg-bg-base border border-border-default rounded-md px-3 py-2 text-sm text-tx-primary placeholder-tx-muted focus:border-accent-border focus:ring-1 focus:ring-accent/20 transition-colors"
                           [placeholder]="field.placeholder" [(ngModel)]="field.value" />
                  </div>
                }
              </div>
              <div class="px-5 py-4 border-t border-border-subtle bg-bg-raised flex items-center justify-between">
                <p class="text-xs text-tx-muted">Changes take effect on next daemon restart.</p>
                <div class="flex gap-2">
                  <button class="px-3 py-1.5 rounded border border-border-default text-tx-secondary text-xs hover:text-tx-primary transition-colors" (click)="resetSection(repoFields)">Reset</button>
                  <button class="px-3 py-1.5 rounded bg-accent text-tx-inverse text-xs font-semibold hover:bg-accent-light transition-colors" (click)="saveSection('repo')">Save changes</button>
                </div>
              </div>
            </div>
          </div>
        }

        <!-- ORG METADATA -->
        @if (activeSection() === 'org') {
          <div class="animate-[fadeIn_0.15s_ease-out] space-y-6">
            <div>
              <h2 class="text-sm font-semibold text-tx-primary">Organization Metadata Layer</h2>
              <p class="text-xs text-tx-muted mt-0.5">Shared configuration scoped to your organization. Applies across all repos.</p>
            </div>
            <div class="rounded-lg border border-border-default bg-bg-surface overflow-hidden">
              <div class="divide-y divide-border-subtle">
                @for (field of orgFields; track field.key) {
                  <div class="px-5 py-4 grid grid-cols-[1fr_2fr] gap-6 items-start">
                    <div>
                      <label class="text-sm font-medium text-tx-primary block mb-0.5">{{ field.label }}</label>
                      @if (field.hint) {
                        <p class="text-xs text-tx-muted leading-relaxed">{{ field.hint }}</p>
                      }
                    </div>
                    <input class="w-full bg-bg-base border border-border-default rounded-md px-3 py-2 text-sm text-tx-primary placeholder-tx-muted focus:border-accent-border focus:ring-1 focus:ring-accent/20 transition-colors"
                           [placeholder]="field.placeholder" [(ngModel)]="field.value" />
                  </div>
                }
              </div>
              <div class="px-5 py-4 border-t border-border-subtle bg-bg-raised flex items-center justify-between">
                <p class="text-xs text-tx-muted">Organization-wide settings apply to all repos and teams.</p>
                <div class="flex gap-2">
                  <button class="px-3 py-1.5 rounded border border-border-default text-tx-secondary text-xs hover:text-tx-primary transition-colors" (click)="resetSection(orgFields)">Reset</button>
                  <button class="px-3 py-1.5 rounded bg-accent text-tx-inverse text-xs font-semibold hover:bg-accent-light transition-colors" (click)="saveSection('org')">Save changes</button>
                </div>
              </div>
            </div>
          </div>
        }

        <!-- TEAM METADATA -->
        @if (activeSection() === 'team') {
          <div class="animate-[fadeIn_0.15s_ease-out] space-y-6">
            <div>
              <h2 class="text-sm font-semibold text-tx-primary">Team Metadata Layer</h2>
              <p class="text-xs text-tx-muted mt-0.5">Settings scoped to your team. Overrides org defaults where set.</p>
            </div>
            <div class="rounded-lg border border-border-default bg-bg-surface overflow-hidden">
              <div class="divide-y divide-border-subtle">
                @for (field of teamFields; track field.key) {
                  <div class="px-5 py-4 grid grid-cols-[1fr_2fr] gap-6 items-start">
                    <div>
                      <label class="text-sm font-medium text-tx-primary block mb-0.5">{{ field.label }}</label>
                      @if (field.hint) {
                        <p class="text-xs text-tx-muted leading-relaxed">{{ field.hint }}</p>
                      }
                    </div>
                    <input class="w-full bg-bg-base border border-border-default rounded-md px-3 py-2 text-sm text-tx-primary placeholder-tx-muted focus:border-accent-border focus:ring-1 focus:ring-accent/20 transition-colors"
                           [placeholder]="field.placeholder" [(ngModel)]="field.value" />
                  </div>
                }
              </div>
              <div class="px-5 py-4 border-t border-border-subtle bg-bg-raised flex items-center justify-between">
                <p class="text-xs text-tx-muted">Team settings override org defaults when both are set.</p>
                <div class="flex gap-2">
                  <button class="px-3 py-1.5 rounded border border-border-default text-tx-secondary text-xs hover:text-tx-primary transition-colors" (click)="resetSection(teamFields)">Reset</button>
                  <button class="px-3 py-1.5 rounded bg-accent text-tx-inverse text-xs font-semibold hover:bg-accent-light transition-colors" (click)="saveSection('team')">Save changes</button>
                </div>
              </div>
            </div>
          </div>
        }

        <!-- USER METADATA -->
        @if (activeSection() === 'user') {
          <div class="animate-[fadeIn_0.15s_ease-out] space-y-6">
            <div>
              <h2 class="text-sm font-semibold text-tx-primary">User Metadata Layer</h2>
              <p class="text-xs text-tx-muted mt-0.5">Personal preferences and secrets. Never shared with team or org.</p>
            </div>
            <div class="rounded-lg border border-border-default bg-bg-surface overflow-hidden">
              <div class="divide-y divide-border-subtle">
                @for (field of userFields; track field.key) {
                  <div class="px-5 py-4 grid grid-cols-[1fr_2fr] gap-6 items-start">
                    <div>
                      <label class="text-sm font-medium text-tx-primary block mb-0.5">{{ field.label }}</label>
                      @if (field.hint) {
                        <p class="text-xs text-tx-muted leading-relaxed">{{ field.hint }}</p>
                      }
                    </div>
                    <input class="w-full bg-bg-base border border-border-default rounded-md px-3 py-2 text-sm text-tx-primary placeholder-tx-muted focus:border-accent-border focus:ring-1 focus:ring-accent/20 transition-colors"
                           [placeholder]="field.placeholder" [(ngModel)]="field.value" />
                  </div>
                }
              </div>
              <div class="px-5 py-4 border-t border-border-subtle bg-bg-raised flex items-center justify-between">
                <p class="text-xs text-tx-muted">User secrets are stored locally only and never shared.</p>
                <div class="flex gap-2">
                  <button class="px-3 py-1.5 rounded border border-border-default text-tx-secondary text-xs hover:text-tx-primary transition-colors" (click)="resetSection(userFields)">Reset</button>
                  <button class="px-3 py-1.5 rounded bg-accent text-tx-inverse text-xs font-semibold hover:bg-accent-light transition-colors" (click)="saveSection('user')">Save changes</button>
                </div>
              </div>
            </div>
          </div>
        }

      </div>
    </div>
  `,
})
export class SettingsComponent {
  readonly daemon = inject(DaemonService);
  readonly activeSection = signal<SettingsSection>("repo");

  readonly sections: { id: SettingsSection; label: string }[] = [
    { id: "repo", label: "Repo" },
    { id: "org", label: "Organization" },
    { id: "team", label: "Team" },
    { id: "user", label: "User" },
  ];

  readonly repoFields: MetaField[] = [
    { key: "display-name", label: "Display Name", placeholder: "my-env-repo", value: "", hint: "Human-readable name for this repo in the UI." },
    { key: "description", label: "Description", placeholder: "Short description of this environment", value: "", hint: "What is this repo used for?" },
    { key: "tags", label: "Tags", placeholder: "production, infra, v2", value: "", hint: "Comma-separated labels for filtering." },
    { key: "default-env", label: "Default Environment", placeholder: "development", value: "", hint: "Default env name when running locally." },
    { key: "url", label: "Project URL", placeholder: "https://myapp.example.com", value: "", hint: "Used in post-deploy action links." },
  ];

  readonly orgFields: MetaField[] = [
    { key: "org-name", label: "Organization Name", placeholder: "Acme Corp", value: "", hint: "Used in audit logs and reports." },
    { key: "org-id", label: "Organization ID", placeholder: "acme-corp-01", value: "" },
    { key: "org-registry", label: "Package Registry URL", placeholder: "https://registry.acme.com", value: "", hint: "Private registry for publishing packages." },
    { key: "org-contact", label: "DevOps Contact", placeholder: "devops@acme.com", value: "" },
  ];

  readonly teamFields: MetaField[] = [
    { key: "team-name", label: "Team Name", placeholder: "Platform Team", value: "" },
    { key: "team-id", label: "Team ID", placeholder: "platform-01", value: "" },
    { key: "team-channel", label: "Notification Channel", placeholder: "#deployments", value: "", hint: "Slack/Teams channel for deploy notifications." },
    { key: "team-lead", label: "Team Lead", placeholder: "john.doe", value: "" },
  ];

  readonly userFields: MetaField[] = [
    { key: "user-alias", label: "Username", placeholder: "johndoe", value: "" },
    { key: "user-email", label: "Email", placeholder: "john@example.com", value: "" },
    { key: "user-token", label: "Personal Access Token", placeholder: "••••••••••••", value: "", hint: "Stored locally only. Never sent to the daemon." },
    { key: "user-prefs", label: "Preferences", placeholder: "theme=dark,compact=true", value: "", hint: "Key=value preferences string." },
  ];

  saveSection(section: string): void {
    this.daemon.addNotification("success", "Settings saved", `${capitalize(section)} metadata updated.`);
  }

  resetSection(fields: MetaField[]): void {
    for (const f of fields) f.value = "";
  }
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
