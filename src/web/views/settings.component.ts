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
  templateUrl: './settings.component.html',
  styleUrl: './settings.component.css',
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
